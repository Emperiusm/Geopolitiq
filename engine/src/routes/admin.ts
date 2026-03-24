import { Hono } from 'hono';
import { ForbiddenError } from '@gambit/common';
import type { PlatformRole } from '@gambit/common';
import type { ServiceContainer } from '../services/container';
import type { SearchService } from '../services/search.service';

function requirePlatformAdmin(c: any): void {
  const platformRole = c.get('platformRole') as PlatformRole | undefined;
  if (platformRole !== 'admin') {
    throw new ForbiddenError('Platform admin role required');
  }
}

export function adminRoutes(container: ServiceContainer) {
  const app = new Hono();

  // POST /seed — trigger re-seed from MongoDB
  app.post('/seed', async (c) => {
    requirePlatformAdmin(c);

    // Dynamic import of seed function to avoid loading MongoDB driver on every request
    try {
      const { execSync } = await import('child_process');
      // Run seed script in background
      container.logger.info('Manual seed triggered by admin');
      // We spawn the seed script as a subprocess rather than blocking the request
      const child = Bun.spawn(['bun', 'src/seed/seed-from-mongo.ts'], {
        cwd: import.meta.dir + '/../..',
        stdout: 'ignore',
        stderr: 'ignore',
      });

      return c.json({
        data: {
          message: 'Seed process started',
          pid: child.pid,
        },
        meta: { triggeredAt: new Date().toISOString() },
      });
    } catch (err: any) {
      container.logger.error({ err }, 'Failed to trigger seed');
      return c.json(
        {
          error: {
            code: 'SEED_FAILED',
            message: err.message ?? 'Failed to trigger seed process',
          },
        },
        500 as any,
      );
    }
  });

  // POST /rebuild-index — rebuild Typesense from PostgreSQL
  app.post('/rebuild-index', async (c) => {
    requirePlatformAdmin(c);

    const searchService = container.searchService as SearchService | null;
    if (!searchService?.available) {
      return c.json(
        {
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Typesense is not configured or unavailable',
          },
        },
        503 as any,
      );
    }

    container.logger.info('Manual index rebuild triggered by admin');

    const result = await searchService.rebuildIndex(container.db);

    return c.json({
      data: {
        indexed: result.indexed,
        failed: result.failed,
        durationMs: result.durationMs,
      },
      meta: { completedAt: new Date().toISOString() },
    });
  });

  // POST /verify-sync — run sync consistency check
  app.post('/verify-sync', async (c) => {
    requirePlatformAdmin(c);

    if (!container.sync || typeof container.sync.verify !== 'function') {
      return c.json(
        {
          error: {
            code: 'NOT_AVAILABLE',
            message: 'Sync service is not configured',
          },
        },
        503 as any,
      );
    }

    const result = await container.sync.verify();

    return c.json({
      data: result,
      meta: { verifiedAt: new Date().toISOString() },
    });
  });

  // GET /sync-dlq — view sync dead letter queue
  app.get('/sync-dlq', async (c) => {
    requirePlatformAdmin(c);

    if (!container.sync || typeof container.sync.getDlq !== 'function') {
      return c.json(
        {
          error: {
            code: 'NOT_AVAILABLE',
            message: 'Sync service is not configured',
          },
        },
        503 as any,
      );
    }

    const items = await container.sync.getDlq();

    return c.json({
      data: items,
      meta: { total: items.length },
    });
  });

  // POST /sync-dlq/:id/retry — retry a DLQ item
  app.post('/sync-dlq/:id/retry', async (c) => {
    requirePlatformAdmin(c);

    if (!container.sync || typeof container.sync.retryDlqItem !== 'function') {
      return c.json(
        {
          error: {
            code: 'NOT_AVAILABLE',
            message: 'Sync service is not configured',
          },
        },
        503 as any,
      );
    }

    const dlqId = c.req.param('id');
    const result = await container.sync.retryDlqItem(dlqId);

    return c.json({
      data: result,
      meta: { retriedAt: new Date().toISOString() },
    });
  });

  return app;
}
