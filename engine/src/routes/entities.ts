import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { entityListSchema, entityResolveSchema, entityBatchSchema, ValidationError } from '@gambit/common';
import type { ServiceContainer } from '../services/container';
import type { EntityService } from '../services/entity.service';
import type { SearchService } from '../services/search.service';

const edgeQuerySchema = z.object({
  relation: z.string().optional(),
  direction: z.enum(['outgoing', 'incoming', 'both']).default('both'),
  limit: z.coerce.number().min(1).max(500).default(100),
});

export function entityRoutes(container: ServiceContainer) {
  const app = new Hono();

  // GET / — list with cursor pagination
  app.get('/', async (c) => {
    const entityService = container.entityService as EntityService;
    const searchService = container.searchService as SearchService | null;

    const raw = {
      q: c.req.query('q'),
      type: c.req.query('type'),
      status: c.req.query('status'),
      risk: c.req.query('risk'),
      sector: c.req.query('sector'),
      domain: c.req.query('domain'),
      tag: c.req.query('tag'),
      sortBy: c.req.query('sortBy'),
      sortDir: c.req.query('sortDir'),
      limit: c.req.query('limit'),
      cursor: c.req.query('cursor'),
    };

    const parseResult = entityListSchema.safeParse(raw);
    if (!parseResult.success) {
      throw new ValidationError('Invalid query parameters', {
        issues: parseResult.error.issues,
      });
    }
    const params = parseResult.data;

    // If there's a search query and Typesense is available, use search
    if (params.q && searchService?.available) {
      const searchResult = await searchService.search(params.q, {
        types: params.type ? [params.type] : undefined,
        status: params.status,
        risk: params.risk,
        sector: params.sector,
        domain: params.domain,
        tag: params.tag,
        limit: params.limit,
        sortBy: params.sortBy === 'updated_at' ? 'updated_at' : params.sortBy === 'reality_score' ? 'reality_score' : '_text_match',
        sortDir: params.sortDir,
      });

      // Fetch full entities from PostgreSQL for the search results
      const ids = searchResult.results.map((r) => r.id);
      const fullEntities = ids.length > 0
        ? await entityService.findByIds(ids)
        : [];

      // Preserve search result order
      const entityMap = new Map(fullEntities.map((e) => [e.id, e]));
      const orderedData = ids
        .map((id) => entityMap.get(id))
        .filter((e): e is NonNullable<typeof e> => e !== undefined);

      return c.json({
        data: orderedData,
        meta: {
          total: searchResult.found,
          limit: params.limit,
          hasMore: searchResult.found > params.limit,
          searchTimeMs: searchResult.searchTimeMs,
        },
      });
    }

    // PostgreSQL-based listing with cursor pagination
    const result = await entityService.list(params);

    return c.json({
      data: result.data,
      meta: {
        limit: params.limit,
        cursor: result.cursor,
        hasMore: result.hasMore,
      },
    });
  });

  // GET /:id — entity detail
  app.get('/:id', async (c) => {
    const entityService = container.entityService as EntityService;
    const id = c.req.param('id');
    const includeParam = c.req.query('include');

    const entity = await entityService.findById(id);

    let edges: any[] | undefined;
    if (includeParam?.includes('edges')) {
      edges = await entityService.getEdges(id);
    }

    return c.json({
      data: {
        ...entity,
        ...(edges !== undefined ? { edges } : {}),
      },
      meta: {},
    });
  });

  // POST /resolve — entity resolution
  app.post(
    '/resolve',
    zValidator('json', entityResolveSchema),
    async (c) => {
      const entityService = container.entityService as EntityService;
      const body = c.req.valid('json');

      const result = await entityService.resolve(body.query, body.type);

      if (!result) {
        return c.json({
          data: null,
          meta: { matched: false },
        });
      }

      return c.json({
        data: result.entity,
        meta: {
          matched: true,
          confidence: result.confidence,
          matchedOn: result.matchedOn,
        },
      });
    },
  );

  // POST /batch — bulk fetch by IDs
  app.post(
    '/batch',
    zValidator('json', entityBatchSchema),
    async (c) => {
      const entityService = container.entityService as EntityService;
      const body = c.req.valid('json');

      const results = await entityService.findByIds(body.ids);

      // Return in requested order with nulls for missing IDs
      const entityMap = new Map(results.map((e) => [e.id, e]));
      const ordered = body.ids.map((id) => entityMap.get(id) ?? null);

      return c.json({
        data: ordered,
        meta: {
          requested: body.ids.length,
          found: results.length,
        },
      });
    },
  );

  // GET /:id/edges — relationships
  app.get('/:id/edges', async (c) => {
    const entityService = container.entityService as EntityService;
    const id = c.req.param('id');

    const raw = {
      relation: c.req.query('relation'),
      direction: c.req.query('direction'),
      limit: c.req.query('limit'),
    };

    const parseResult = edgeQuerySchema.safeParse(raw);
    if (!parseResult.success) {
      throw new ValidationError('Invalid query parameters', {
        issues: parseResult.error.issues,
      });
    }
    const params = parseResult.data;

    const edges = await entityService.getEdges(id, {
      relation: params.relation,
      direction: params.direction,
      limit: params.limit,
    });

    return c.json({
      data: edges,
      meta: {
        entityId: id,
        total: edges.length,
      },
    });
  });

  // GET /:id/signals — Phase 2 stub
  app.get('/:id/signals', async (c) => {
    return c.json(
      {
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Signal endpoints are planned for Phase 2',
        },
      },
      501 as any,
    );
  });

  // GET /:id/scores — Phase 3 stub
  app.get('/:id/scores', async (c) => {
    return c.json(
      {
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Score endpoints are planned for Phase 3',
        },
      },
      501 as any,
    );
  });

  // GET /:id/alerts — Phase 3 stub
  app.get('/:id/alerts', async (c) => {
    return c.json(
      {
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Alert endpoints are planned for Phase 3',
        },
      },
      501 as any,
    );
  });

  // GET /:id/history — Phase 3 stub
  app.get('/:id/history', async (c) => {
    return c.json(
      {
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'History endpoints are planned for Phase 3',
        },
      },
      501 as any,
    );
  });

  return app;
}
