import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { entityListSchema } from '@gambit/common';
import type { ServiceContainer } from '../services/container';
import type { EntityService } from '../services/entity.service';

// ── Zod Schemas ──────────────────────────────────────────────────────

const batchOperationSchema = z.object({
  id: z.string().min(1),
  method: z.literal('GET'),
  path: z.string().min(1),
  params: z.record(z.string()).optional(),
});

const batchRequestSchema = z.object({
  operations: z
    .array(batchOperationSchema)
    .min(1, 'At least one operation is required')
    .max(100, 'Maximum 100 operations per batch'),
});

type BatchOperation = z.infer<typeof batchOperationSchema>;

// ── Result shape ─────────────────────────────────────────────────────

interface OperationResult {
  id: string;
  status: number;
  data: unknown;
}

// ── Path Router ──────────────────────────────────────────────────────

/**
 * Route a single batch operation to the appropriate service method.
 * Extend this as more endpoint families are added.
 */
async function routeOperation(
  op: BatchOperation,
  container: ServiceContainer,
): Promise<OperationResult> {
  const { id, path, params } = op;

  try {
    // Entity by ID: GET /entities/:id or /engine/v1/entities/:id
    const entityByIdMatch = path.match(
      /(?:^|\/)entities\/([^/?]+)(?:\?.*)?$/,
    );
    if (entityByIdMatch) {
      const entityId = entityByIdMatch[1];
      const entityService = container.entityService as EntityService;
      const entity = await entityService.findById(entityId);
      return { id, status: 200, data: entity };
    }

    // Entity list: GET /entities or /engine/v1/entities
    const entityListMatch = path.match(/(?:^|\/)entities(?:\/)?(?:\?.*)?$/);
    if (entityListMatch) {
      const entityService = container.entityService as EntityService;
      // Build EntityListParams from operation params or empty
      // Parse through the canonical schema so defaults are applied correctly
      const rawListParams = {
        limit: params?.limit,
        cursor: params?.cursor,
        q: params?.q,
        type: params?.type,
        status: params?.status,
        risk: params?.risk,
        sector: params?.sector,
        domain: params?.domain,
        tag: params?.tag,
        sortBy: params?.sortBy,
        sortDir: params?.sortDir,
      };
      const parsedList = entityListSchema.safeParse(rawListParams);
      if (!parsedList.success) {
        return {
          id,
          status: 400,
          data: { error: { code: 'VALIDATION_ERROR', message: 'Invalid list params' } },
        };
      }
      const result = await entityService.list(parsedList.data);
      return { id, status: 200, data: result };
    }

    // Unrecognised path
    return {
      id,
      status: 404,
      data: { error: { code: 'NOT_FOUND', message: `No route for path: ${path}` } },
    };
  } catch (err: any) {
    // Map known error codes to HTTP status
    const code: string = err?.code ?? err?.constructor?.name ?? 'INTERNAL_ERROR';

    if (code === 'ENTITY_NOT_FOUND' || err?.message?.includes('not found')) {
      return {
        id,
        status: 404,
        data: { error: { code: 'NOT_FOUND', message: err.message } },
      };
    }

    if (code === 'VALIDATION_ERROR') {
      return {
        id,
        status: 400,
        data: { error: { code: 'VALIDATION_ERROR', message: err.message } },
      };
    }

    return {
      id,
      status: 500,
      data: { error: { code: 'INTERNAL_ERROR', message: err.message ?? 'Unexpected error' } },
    };
  }
}

// ── Route factory ────────────────────────────────────────────────────

export function batchRoutes(container: ServiceContainer) {
  const app = new Hono();

  /**
   * POST /engine/v1/batch
   *
   * Execute up to 100 read operations in parallel and return all results.
   * Returns HTTP 200 if all succeed, HTTP 207 Multi-Status if results are mixed.
   */
  app.post(
    '/',
    zValidator('json', batchRequestSchema),
    async (c) => {
      const { operations } = c.req.valid('json');

      // Execute all operations concurrently
      const results: OperationResult[] = await Promise.all(
        operations.map((op) => routeOperation(op, container)),
      );

      // 207 if any operation returned a non-2xx status
      const hasMixed = results.some((r) => r.status < 200 || r.status >= 300);
      const httpStatus = hasMixed ? 207 : 200;

      return c.json(
        {
          results,
          meta: {
            total: results.length,
            succeeded: results.filter((r) => r.status >= 200 && r.status < 300).length,
            failed: results.filter((r) => r.status < 200 || r.status >= 300).length,
          },
        },
        httpStatus as any,
      );
    },
  );

  return app;
}
