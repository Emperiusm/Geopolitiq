// start-consumers.ts — Standalone entry point that runs all NATS consumers
// Usage: bun run src/consumers/start-consumers.ts

import { loadConfig, createLogger } from '@gambit/common';
import { connectNats } from '../infrastructure/nats';
import { createEventBus } from '../infrastructure/event-bus';
import { connectClickhouse } from '../infrastructure/clickhouse';
import { connectRedis } from '../infrastructure/redis';
import { connectTypesense } from '../infrastructure/typesense';
import { ClickHouseSyncConsumer } from './clickhouse-sync';
import { Neo4jSyncConsumer } from './neo4j-sync';
import { TypesenseSyncConsumer } from './typesense-sync';
import { CacheInvalidatorConsumer } from './cache-invalidator';

// ── Bootstrap ─────────────────────────────────────────────────────────

const logger = createLogger('consumers');

async function main(): Promise<void> {
  const config = loadConfig();
  logger.info('Starting Gambit consumers…');

  // ── NATS (required) ───────────────────────────────────────────────
  const nats = await connectNats(config, logger);
  if (!nats) {
    logger.error('NATS not available — cannot start consumers');
    process.exit(1);
  }

  const bus = createEventBus(nats, logger);
  await bus.ensureStreams();

  // ── Optional dependencies ─────────────────────────────────────────
  const [clickhouse, redisCache, typesense, neo4jDriver] = await Promise.all([
    connectClickhouse(config, logger),
    connectRedis(config.redis.cacheUrl, logger, 'cache'),
    connectTypesense(config, logger),
    connectNeo4j(logger),
  ]);

  // ── Build consumers ───────────────────────────────────────────────
  const baseConfig = {
    nats,
    bus,
    logger,
    maxRetries: 3,
  } as const;

  const clickhouseConsumer = new ClickHouseSyncConsumer(
    ClickHouseSyncConsumer.defaultConfig(baseConfig),
    clickhouse,
  );

  const neo4jConsumer = new Neo4jSyncConsumer(
    Neo4jSyncConsumer.defaultConfig(baseConfig),
    neo4jDriver,
  );

  const typesenseConsumer = new TypesenseSyncConsumer(
    TypesenseSyncConsumer.defaultConfig(baseConfig),
    typesense,
  );

  // Three cache invalidators — one per stream (signals, entities, gap scores)
  const cacheSignalsConsumer = new CacheInvalidatorConsumer(
    CacheInvalidatorConsumer.signalsConfig(baseConfig),
    redisCache,
  );

  const cacheEntitiesConsumer = new CacheInvalidatorConsumer(
    CacheInvalidatorConsumer.entitiesConfig(baseConfig),
    redisCache,
  );

  const cacheGapsConsumer = new CacheInvalidatorConsumer(
    CacheInvalidatorConsumer.gapsConfig(baseConfig),
    redisCache,
  );

  const consumers = [
    clickhouseConsumer,
    neo4jConsumer,
    typesenseConsumer,
    cacheSignalsConsumer,
    cacheEntitiesConsumer,
    cacheGapsConsumer,
  ];

  // ── Graceful shutdown ─────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received — stopping consumers');
    for (const c of consumers) {
      c.stop();
    }

    // Allow the running pull loops to drain
    await new Promise<void>((resolve) => setTimeout(resolve, 2_000));

    // Drain NATS connection
    try {
      await nats.nc.drain();
    } catch {
      // Ignore drain errors
    }

    if (neo4jDriver) {
      await neo4jDriver.close().catch(() => {});
    }

    logger.info('All consumers stopped');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // ── Start all consumers concurrently ──────────────────────────────
  logger.info(`Starting ${consumers.length} consumers`);
  await Promise.all(consumers.map((c) => c.start()));
}

// ── Neo4j helper (config not in GambitConfig — use env vars directly) ─

async function connectNeo4j(logger: ReturnType<typeof createLogger>): Promise<any | null> {
  const url = process.env.NEO4J_URL;
  if (!url) {
    logger.warn('NEO4J_URL not set — Neo4j consumer disabled');
    return null;
  }

  try {
    const { default: neo4j } = await import('neo4j-driver');
    const user = process.env.NEO4J_USER ?? 'neo4j';
    const password = process.env.NEO4J_PASSWORD ?? 'neo4j';
    const driver = neo4j.driver(url, neo4j.auth.basic(user, password));
    await driver.verifyConnectivity();
    logger.info({ url }, 'Neo4j connected');
    return driver;
  } catch (err) {
    logger.warn({ err }, 'Neo4j not available — graph consumer disabled');
    return null;
  }
}

// ── Run ───────────────────────────────────────────────────────────────

main().catch((err) => {
  logger.error({ err }, 'Fatal error starting consumers');
  process.exit(1);
});
