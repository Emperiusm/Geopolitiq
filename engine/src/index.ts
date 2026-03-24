import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { loadConfig, createLogger } from '@gambit/common';
import { connectPostgres, closePgPool, getReadDb } from './infrastructure/postgres';
import { connectTypesense, configureSynonyms } from './infrastructure/typesense';
import { connectClickhouse } from './infrastructure/clickhouse';
import { connectMinio, ensureBuckets } from './infrastructure/minio';
import { connectTemporal } from './infrastructure/temporal';
import { connectRedis } from './infrastructure/redis';
import { connectNats, drainNats } from './infrastructure/nats';
import { createEventBus } from './infrastructure/event-bus';
import { createFeatureFlags } from './infrastructure/nats-kv';
import { runDatabaseInit } from './db/init';
import { initClickhouse } from './db/init/clickhouse';
import { createServiceContainer } from './services/container';
import { createCacheStack } from './infrastructure/cache-layers';
import { PostgresAuthProvider } from './auth/postgres-auth-provider';
import { EntityService } from './services/entity.service';
import { SearchService } from './services/search.service';
import { healthRoutes } from './routes/health';
import { entityRoutes } from './routes/entities';
import { adminRoutes } from './routes/admin';
import { errorHandler } from './middleware/error-handler';
import { authenticate } from './middleware/authenticate';
import { dbContext } from './middleware/db-context';
import { rateLimit } from './middleware/rate-limit';
import { requestId } from './middleware/request-id';
import { requestLogger } from './middleware/request-logger';
import { apiVersion } from './middleware/api-version';
import { etag } from './middleware/etag';
import { registry, httpRequestDuration, httpRequestsTotal } from './infrastructure/metrics';

// ── Bootstrap ────────────────────────────────────────────────────────

const logger = createLogger('gambit-engine');

async function boot() {
  // 1. Load config (Zod-validated)
  const config = loadConfig();
  logger.info({ port: config.engine.port }, 'Config loaded');

  // 2. Connect PostgreSQL (fatal on failure) — initialises both write + read pools
  const db = await connectPostgres(config, logger);
  const readDb = getReadDb();

  // 3. Run database init (extensions, triggers, RLS, materialized views)
  await runDatabaseInit(db, logger);

  // 4. Connect optional services in parallel
  const [typesense, clickhouse, minio, temporal, redisCache, redisPersistent, nats] =
    await Promise.all([
      connectTypesense(config, logger),
      connectClickhouse(config, logger),
      connectMinio(config, logger),
      connectTemporal(config, logger),
      connectRedis(config.redis.cacheUrl, logger, 'cache'),
      connectRedis(config.redis.persistentUrl, logger, 'persistent'),
      connectNats(config, logger),
    ]);

  // 5. Initialise NATS EventBus + feature flags (non-fatal)
  const eventBus = createEventBus(nats, logger);
  await eventBus.ensureStreams().catch((err) => {
    logger.warn({ err }, 'Failed to ensure NATS streams');
  });

  const featureFlags = await createFeatureFlags(nats, logger);

  // 7. Configure Typesense synonyms (non-fatal)
  if (typesense) {
    await configureSynonyms(typesense, logger).catch((err) => {
      logger.warn({ err }, 'Failed to configure Typesense synonyms');
    });
  }

  // 8. Create MinIO buckets (non-fatal)
  if (minio) {
    await ensureBuckets(minio, logger).catch((err) => {
      logger.warn({ err }, 'Failed to create MinIO buckets');
    });
  }

  // 9. Init ClickHouse tables (non-fatal)
  await initClickhouse(clickhouse, logger);

  // 10. Build service container
  const authProvider = new PostgresAuthProvider(db);
  const cache = createCacheStack(redisCache, logger);

  const searchService = new SearchService(typesense, logger);
  const entityService = new EntityService(db, cache, searchService, logger);

  const container = createServiceContainer({
    db,
    readDb,
    typesense,
    clickhouse,
    minio,
    temporal,
    redisCache,
    redisPersistent,
    config,
    logger,
    authProvider,
    cache,
  });

  // Wire services into container
  container.entityService = entityService;
  container.searchService = searchService;

  // Change Stream sync — wired in Task 9
  // const sync = new ChangeStreamSync(...);
  // await sync.start();
  // container.sync = sync;

  // ── Build Hono app ───────────────────────────────────────────────

  const app = new Hono();
  const basePath = '/engine/v1';

  // Global middleware stack
  app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
  app.use('*', requestId());
  app.use('*', requestLogger(logger));
  app.use('*', apiVersion());
  app.use('*', etag());
  app.use('*', compress());
  app.use('*', errorHandler(logger));

  // Metrics middleware — records every request
  app.use('*', async (c, next) => {
    const start = performance.now();
    await next();
    const duration = (performance.now() - start) / 1000;
    const route = c.req.routePath ?? c.req.path;
    const status = c.res.status.toString();
    httpRequestDuration.observe({ method: c.req.method, route, status }, duration);
    httpRequestsTotal.inc({ method: c.req.method, route, status });
  });

  // Public routes (no auth required)
  app.route(basePath, healthRoutes(container));

  // Prometheus metrics endpoint — public, before authenticate middleware
  app.get('/metrics', async (c) => {
    const metrics = await registry.metrics();
    return c.text(metrics, 200, { 'Content-Type': registry.contentType });
  });

  // Authenticated routes
  app.use(`${basePath}/*`, authenticate(authProvider));
  app.use(`${basePath}/*`, dbContext(db));
  app.use(`${basePath}/*`, rateLimit(redisCache));

  app.route(`${basePath}/entities`, entityRoutes(container));
  app.route(`${basePath}/admin`, adminRoutes(container));

  // Phase 2+ stubs — return 501 Not Implemented
  const phase2Stubs = ['/signals', '/scores', '/alerts', '/workflows', '/foia'];
  for (const stub of phase2Stubs) {
    app.all(`${basePath}${stub}/*`, (c) =>
      c.json(
        {
          error: {
            code: 'NOT_IMPLEMENTED',
            message: `${stub.slice(1)} endpoints are planned for a future phase`,
          },
        },
        501 as any,
      ),
    );
    app.all(`${basePath}${stub}`, (c) =>
      c.json(
        {
          error: {
            code: 'NOT_IMPLEMENTED',
            message: `${stub.slice(1)} endpoints are planned for a future phase`,
          },
        },
        501 as any,
      ),
    );
  }

  // ── Graceful shutdown ──────────────────────────────────────────────

  let shuttingDown = false;

  async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down...');

    // Close services in reverse order of startup
    // 1. Stop sync (Task 9)
    if (container.sync && typeof container.sync.stop === 'function') {
      try {
        await container.sync.stop();
        logger.info('Sync stopped');
      } catch (err) {
        logger.warn({ err }, 'Error stopping sync');
      }
    }

    // 2. Stop feature flag watcher before draining NATS
    if (featureFlags) {
      try {
        await featureFlags.stop();
        logger.info('Feature flags stopped');
      } catch (err) {
        logger.warn({ err }, 'Error stopping feature flags');
      }
    }

    // 3. Drain NATS (before DB pool — lets in-flight publishes complete)
    if (nats) {
      await drainNats(nats, logger);
    }

    // 4. Close Redis connections
    if (redisCache) {
      try {
        await redisCache.quit();
        logger.info('Redis cache disconnected');
      } catch (err) {
        logger.warn({ err }, 'Error closing Redis cache');
      }
    }
    if (redisPersistent) {
      try {
        await redisPersistent.quit();
        logger.info('Redis persistent disconnected');
      } catch (err) {
        logger.warn({ err }, 'Error closing Redis persistent');
      }
    }

    // 5. Close ClickHouse
    if (clickhouse) {
      try {
        await clickhouse.close();
        logger.info('ClickHouse disconnected');
      } catch (err) {
        logger.warn({ err }, 'Error closing ClickHouse');
      }
    }

    // 6. Close PostgreSQL (last — most critical)
    try {
      await closePgPool();
      logger.info('PostgreSQL disconnected');
    } catch (err) {
      logger.warn({ err }, 'Error closing PostgreSQL');
    }

    logger.info('Shutdown complete');
    process.exit(0);
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // 9. Start HTTP server
  logger.info(
    { port: config.engine.port },
    `Gambit Engine listening on :${config.engine.port}`,
  );

  return { app, config };
}

// ── Entry point ──────────────────────────────────────────────────────

const { app, config } = await boot();

export default {
  port: config.engine.port,
  fetch: app.fetch,
};
