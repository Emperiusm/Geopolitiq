import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { ServiceContainer } from '../services/container';
import { SourceService } from '../services/source.service';
import { ScheduleManager } from '../services/schedule-manager';

const sourceCreateSchema = z.object({
  name: z.string().min(1),
  sourceType: z.string().min(1),
  fetcherType: z.string().min(1),
  fetcherUrl: z.string().url().optional(),
  fetcherSchedule: z.string().optional(),
  fetcherPagination: z.enum(['none', 'offset', 'cursor', 'date-range']).optional(),
  fetcherAuth: z.object({ type: z.string(), keyRef: z.string().optional() }).optional(),
  fetcherRateLimitMs: z.number().int().min(0).optional(),
  parserMode: z.enum(['structured', 'agent', 'hybrid']).optional(),
  parserRef: z.string().optional(),
  parserPrompt: z.string().optional(),
  parserModel: z.string().optional(),
  parserMaxInputTokens: z.number().int().min(1).optional(),
  polarity: z.enum(['behavioral', 'declarative', 'classify']).optional(),
  category: z.string().optional(),
  domains: z.array(z.string()).optional(),
  dependencies: z.array(z.object({ sourceId: z.string(), requirement: z.string() })).optional(),
  upstreamGroup: z.string().optional(),
  enabled: z.boolean().optional(),
  tier: z.number().int().min(1).max(5).optional(),
  meta: z.record(z.unknown()).optional(),
});

const sourceUpdateSchema = sourceCreateSchema.partial();

const backfillSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  maxItems: z.number().int().min(1).optional(),
});

export function sourceRoutes(container: ServiceContainer) {
  const app = new Hono();

  function getService(): SourceService {
    const scheduleManager = new ScheduleManager(container.temporal);
    return new SourceService(container.db, scheduleManager, container.logger);
  }

  // GET / — list sources
  app.get('/', async (c) => {
    const service = getService();

    const filters = {
      enabled: c.req.query('enabled') !== undefined
        ? c.req.query('enabled') === 'true'
        : undefined,
      sourceType: c.req.query('sourceType'),
      tier: c.req.query('tier') ? parseInt(c.req.query('tier')!) : undefined,
      upstreamGroup: c.req.query('upstreamGroup'),
      limit: c.req.query('limit') ? parseInt(c.req.query('limit')!) : 100,
      offset: c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0,
    };

    const data = await service.list(filters);
    return c.json({ data, meta: { count: data.length } });
  });

  // GET /:id — get a single source
  app.get('/:id', async (c) => {
    const service = getService();
    const source = await service.get(c.req.param('id'));

    if (!source) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Source not found' } }, 404 as any);
    }

    return c.json({ data: source });
  });

  // POST / — create source
  app.post('/', zValidator('json', sourceCreateSchema), async (c) => {
    const service = getService();
    const body = c.req.valid('json');
    const created = await service.create(body as any);
    return c.json({ data: created }, 201 as any);
  });

  // PATCH /:id — update source
  app.patch('/:id', zValidator('json', sourceUpdateSchema), async (c) => {
    const service = getService();
    const id = c.req.param('id');
    const body = c.req.valid('json');

    const changedBy = ((c as any).get('userId') as string | undefined) ?? 'system';
    const updated = await service.update(id, body as any, changedBy);
    return c.json({ data: updated });
  });

  // POST /:id/backfill — trigger a backfill run
  app.post('/:id/backfill', zValidator('json', backfillSchema), async (c) => {
    const id = c.req.param('id');
    const body = c.req.valid('json');

    if (!container.temporal) {
      return c.json(
        { error: { code: 'TEMPORAL_UNAVAILABLE', message: 'Temporal client not available' } },
        503 as any,
      );
    }

    const service = getService();
    const source = await service.get(id);
    if (!source) {
      return c.json({ error: { code: 'NOT_FOUND', message: 'Source not found' } }, 404 as any);
    }

    const workflowId = `backfill-${id}-${Date.now()}`;
    const handle = await container.temporal.workflow.start('sourceIngestionWorkflow', {
      args: [id, { backfill: true, ...body }],
      taskQueue: 'fetch',
      workflowId,
      workflowExecutionTimeout: '2 hours',
    });

    return c.json({
      data: {
        workflowId,
        runId: handle.firstExecutionRunId,
        sourceId: id,
        startedAt: new Date().toISOString(),
      },
    }, 202 as any);
  });

  return app;
}
