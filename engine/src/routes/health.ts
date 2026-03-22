import { Hono } from 'hono';
import type { ServiceContainer } from '../services/container';
import { checkPostgres, checkTypesense, checkClickhouse, checkMinio, checkRedis } from '../infrastructure/health';

const startedAt = Date.now();

export function healthRoutes(container: ServiceContainer) {
  const app = new Hono();

  app.get('/health', async (c) => {
    const checks: Record<string, string> = {};

    // Run health checks in parallel
    const [pgStatus, tsStatus, chStatus, minioStatus, redisCacheStatus, redisPersistentStatus] =
      await Promise.all([
        checkPostgres(container.db),
        container.typesense
          ? checkTypesense(container.typesense)
          : Promise.resolve('not_configured'),
        container.clickhouse
          ? checkClickhouse(container.clickhouse)
          : Promise.resolve('not_configured'),
        container.minio
          ? checkMinio(container.minio)
          : Promise.resolve('not_configured'),
        container.redisCache
          ? checkRedis(container.redisCache)
          : Promise.resolve('not_configured'),
        container.redisPersistent
          ? checkRedis(container.redisPersistent)
          : Promise.resolve('not_configured'),
      ]);

    checks.postgres = pgStatus;
    checks.typesense = tsStatus;
    checks.clickhouse = chStatus;
    checks.minio = minioStatus;
    checks.redis_cache = redisCacheStatus;
    checks.redis_persistent = redisPersistentStatus;

    // Sync health (if sync service is attached)
    if (container.sync) {
      try {
        const syncHealth = typeof container.sync.health === 'function'
          ? await container.sync.health()
          : 'not_available';
        checks.sync = syncHealth;
      } catch {
        checks.sync = 'error';
      }
    }

    // Determine overall status
    // "down" if postgres is down (required), "degraded" if any optional service is down
    let status: 'ok' | 'degraded' | 'down' = 'ok';

    if (pgStatus === 'down') {
      status = 'down';
    } else {
      const optionalStatuses = [tsStatus, chStatus, minioStatus, redisCacheStatus, redisPersistentStatus];
      const hasDownOptional = optionalStatuses.some((s) => s === 'down');
      if (hasDownOptional) {
        status = 'degraded';
      }
    }

    const uptimeMs = Date.now() - startedAt;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);

    const responseBody = {
      status,
      version: process.env.ENGINE_VERSION ?? '0.1.0',
      uptime: `${uptimeSeconds}s`,
      services: checks,
      timestamp: new Date().toISOString(),
    };

    const httpStatus = status === 'down' ? 503 : 200;

    return c.json(responseBody, httpStatus as any);
  });

  return app;
}
