import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq, and, isNull, inArray, isNotNull } from 'drizzle-orm';
import type { ServiceContainer } from '../services/container';
import { signalDlq } from '../db';
import { recordId } from '@gambit/common';

const retrySchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
});

const discardSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
  reason: z.string().min(1),
});

const listQuerySchema = z.object({
  source_id: z.string().optional(),
  resolved: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export function dlqRoutes(container: ServiceContainer) {
  const app = new Hono();

  // GET / — list DLQ entries, filterable by source_id and resolved status
  app.get('/', async (c) => {
    const raw = {
      source_id: c.req.query('source_id'),
      resolved: c.req.query('resolved') as 'true' | 'false' | undefined,
      limit: c.req.query('limit'),
      offset: c.req.query('offset'),
    };

    const parseResult = listQuerySchema.safeParse(raw);
    if (!parseResult.success) {
      return c.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', issues: parseResult.error.issues } },
        400 as any,
      );
    }

    const { source_id, resolved, limit, offset } = parseResult.data;

    const conditions = [];
    if (source_id) {
      conditions.push(eq(signalDlq.sourceId, source_id));
    }
    if (resolved === 'true') {
      conditions.push(isNotNull(signalDlq.resolvedAt));
    } else if (resolved === 'false') {
      conditions.push(isNull(signalDlq.resolvedAt));
    }

    const query = (container.db as any)
      .select()
      .from(signalDlq)
      .limit(limit)
      .offset(offset)
      .orderBy(signalDlq.createdAt);

    const data = conditions.length > 0 ? await query.where(and(...conditions)) : await query;

    return c.json({ data, meta: { count: data.length, limit, offset } });
  });

  // POST /retry — bulk retry by IDs (re-queues via Temporal)
  app.post('/retry', zValidator('json', retrySchema), async (c) => {
    const { ids } = c.req.valid('json');

    // Fetch the DLQ entries
    const entries = await (container.db as any)
      .select()
      .from(signalDlq)
      .where(inArray(signalDlq.id, ids));

    if (entries.length === 0) {
      return c.json({ data: { retried: 0, notFound: ids.length } });
    }

    let retried = 0;

    if (container.temporal) {
      for (const entry of entries) {
        try {
          await container.temporal.workflow.start('sourceIngestionWorkflow', {
            args: [entry.sourceId ?? '', { dlqRetry: true, dlqId: entry.id }],
            taskQueue: 'fetch',
            workflowId: `dlq-retry-${entry.id}-${Date.now()}`,
            workflowExecutionTimeout: '30 minutes',
          });
          retried++;
        } catch {
          // Individual retry failure — log and continue
          container.logger.warn({ dlqId: entry.id }, 'DLQ retry: failed to start workflow');
        }
      }
    }

    // Update attempt count
    await (container.db as any)
      .update(signalDlq)
      .set({
        attemptCount: (signalDlq as any).attemptCount + 1,
        lastAttemptAt: new Date(),
      })
      .where(inArray(signalDlq.id, ids));

    return c.json({
      data: {
        retried,
        requested: ids.length,
        notFound: ids.length - entries.length,
      },
    });
  });

  // POST /discard — bulk discard with reason
  app.post('/discard', zValidator('json', discardSchema), async (c) => {
    const { ids, reason } = c.req.valid('json');

    const result = await (container.db as any)
      .update(signalDlq)
      .set({
        resolvedAt: new Date(),
        resolution: `discarded: ${reason}`,
      })
      .where(
        and(
          inArray(signalDlq.id, ids),
          isNull(signalDlq.resolvedAt),
        ),
      )
      .returning({ id: signalDlq.id });

    return c.json({
      data: {
        discarded: result.length,
        requested: ids.length,
        reason,
      },
    });
  });

  return app;
}
