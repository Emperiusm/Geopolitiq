import { eq, and, inArray, sql, desc, asc, gt, lt, type SQL } from 'drizzle-orm';
import type { DrizzleClient } from '../db/transaction';
import type { Logger } from '@gambit/common';
import { EntityNotFoundError } from '@gambit/common';
import type { EntityListParams } from '@gambit/common';
import { entities, entityEdges, resolutionAliases } from '../db/schema/entities';
import { entityById, entityByTicker, entityByIso2, aliasesByNormalized } from '../db/prepared';
import { coalesce } from '../infrastructure/coalesce';
import type { createCacheStack } from '../infrastructure/cache-layers';
import type { SearchService } from './search.service';

type EntityRow = typeof entities.$inferSelect;
type EdgeRow = typeof entityEdges.$inferSelect;

export interface EntityWithEdges extends EntityRow {
  edges?: Array<EdgeRow & { connectedEntity?: EntityRow }>;
}

export interface EntityListResult {
  data: EntityRow[];
  cursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface EdgeListOptions {
  relation?: string;
  direction?: 'outgoing' | 'incoming' | 'both';
  limit?: number;
}

export interface ResolveResult {
  entity: EntityRow;
  confidence: number;
  matchedOn: string;
}

export class EntityService {
  constructor(
    private db: DrizzleClient,
    private cache: ReturnType<typeof createCacheStack>,
    private searchService: SearchService | null,
    private logger: Logger,
  ) {}

  async findById(id: string): Promise<EntityRow> {
    const row = await coalesce(`entity:${id}`, async () => {
      const rows = await entityById(this.db, id);
      return rows[0] ?? null;
    });

    if (!row) {
      throw new EntityNotFoundError(id);
    }

    return row;
  }

  async findByIds(ids: string[]): Promise<EntityRow[]> {
    if (ids.length === 0) return [];

    const rows = await this.db
      .select()
      .from(entities)
      .where(inArray(entities.id, ids));

    return rows;
  }

  async list(params: EntityListParams): Promise<EntityListResult> {
    const cacheKey = `entity-list:${JSON.stringify(params)}`;

    return this.cache.get(cacheKey, async () => {
      const conditions: SQL[] = [];

      if (params.type) {
        conditions.push(eq(entities.type, params.type as any));
      }
      if (params.status) {
        conditions.push(eq(entities.status, params.status as any));
      }
      if (params.risk) {
        conditions.push(eq(entities.risk, params.risk));
      }
      if (params.sector) {
        conditions.push(eq(entities.sector, params.sector));
      }
      if (params.domain) {
        conditions.push(sql`${params.domain} = ANY(${entities.domains})`);
      }
      if (params.tag) {
        conditions.push(sql`${params.tag} = ANY(${entities.tags})`);
      }

      // Cursor-based pagination
      if (params.cursor) {
        const decoded = decodeCursor(params.cursor);
        if (decoded) {
          if (params.sortBy === 'name') {
            if (params.sortDir === 'asc') {
              conditions.push(
                sql`(${entities.name}, ${entities.id}) > (${decoded.value}, ${decoded.id})`,
              );
            } else {
              conditions.push(
                sql`(${entities.name}, ${entities.id}) < (${decoded.value}, ${decoded.id})`,
              );
            }
          } else if (params.sortBy === 'reality_score') {
            if (params.sortDir === 'asc') {
              conditions.push(
                sql`(COALESCE(${entities.realityScore}, '0'), ${entities.id}) > (${decoded.value}, ${decoded.id})`,
              );
            } else {
              conditions.push(
                sql`(COALESCE(${entities.realityScore}, '0'), ${entities.id}) < (${decoded.value}, ${decoded.id})`,
              );
            }
          } else {
            // updated_at (default)
            if (params.sortDir === 'asc') {
              conditions.push(
                sql`(${entities.updatedAt}, ${entities.id}) > (${decoded.value}::timestamptz, ${decoded.id})`,
              );
            } else {
              conditions.push(
                sql`(${entities.updatedAt}, ${entities.id}) < (${decoded.value}::timestamptz, ${decoded.id})`,
              );
            }
          }
        }
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      let orderByClause: SQL;
      if (params.sortBy === 'name') {
        orderByClause =
          params.sortDir === 'asc'
            ? sql`${entities.name} ASC, ${entities.id} ASC`
            : sql`${entities.name} DESC, ${entities.id} DESC`;
      } else if (params.sortBy === 'reality_score') {
        orderByClause =
          params.sortDir === 'asc'
            ? sql`COALESCE(${entities.realityScore}, '0') ASC, ${entities.id} ASC`
            : sql`COALESCE(${entities.realityScore}, '0') DESC, ${entities.id} DESC`;
      } else {
        orderByClause =
          params.sortDir === 'asc'
            ? sql`${entities.updatedAt} ASC, ${entities.id} ASC`
            : sql`${entities.updatedAt} DESC, ${entities.id} DESC`;
      }

      // Fetch one extra row to determine hasMore
      const fetchLimit = params.limit + 1;

      const rows = await this.db
        .select()
        .from(entities)
        .where(where)
        .orderBy(orderByClause)
        .limit(fetchLimit);

      const hasMore = rows.length > params.limit;
      const data = hasMore ? rows.slice(0, params.limit) : rows;

      let cursor: string | null = null;
      if (hasMore && data.length > 0) {
        const last = data[data.length - 1];
        if (params.sortBy === 'name') {
          cursor = encodeCursor(last.id, last.name);
        } else if (params.sortBy === 'reality_score') {
          cursor = encodeCursor(last.id, last.realityScore ?? '0');
        } else {
          cursor = encodeCursor(last.id, last.updatedAt.toISOString());
        }
      }

      return { data, cursor, hasMore };
    }, 30); // cache for 30 seconds
  }

  async getEdges(
    entityId: string,
    options: EdgeListOptions = {},
  ): Promise<Array<EdgeRow & { connectedEntity?: EntityRow }>> {
    const { relation, direction = 'both', limit = 100 } = options;

    // Verify entity exists
    await this.findById(entityId);

    const conditions: SQL[] = [];

    if (direction === 'outgoing') {
      conditions.push(eq(entityEdges.fromId, entityId));
    } else if (direction === 'incoming') {
      conditions.push(eq(entityEdges.toId, entityId));
    } else {
      conditions.push(
        sql`(${entityEdges.fromId} = ${entityId} OR ${entityEdges.toId} = ${entityId})`,
      );
    }

    if (relation) {
      conditions.push(eq(entityEdges.relation, relation));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const edges = await this.db
      .select()
      .from(entityEdges)
      .where(where)
      .limit(limit);

    // Fetch connected entities
    const connectedIds = new Set<string>();
    for (const edge of edges) {
      if (edge.fromId !== entityId) connectedIds.add(edge.fromId);
      if (edge.toId !== entityId) connectedIds.add(edge.toId);
    }

    let connectedMap = new Map<string, EntityRow>();
    if (connectedIds.size > 0) {
      const connectedRows = await this.db
        .select()
        .from(entities)
        .where(inArray(entities.id, [...connectedIds]));

      for (const row of connectedRows) {
        connectedMap.set(row.id, row);
      }
    }

    return edges.map((edge) => {
      const connectedId =
        edge.fromId === entityId ? edge.toId : edge.fromId;
      return {
        ...edge,
        connectedEntity: connectedMap.get(connectedId),
      };
    });
  }

  async resolve(
    query: string,
    expectedType?: string,
  ): Promise<ResolveResult | null> {
    const normalized = query.trim();
    if (!normalized) return null;

    // 1. Exact match on ticker (case-insensitive)
    const tickerRows = await entityByTicker(this.db, normalized.toUpperCase());
    if (tickerRows.length > 0) {
      const row = tickerRows[0];
      if (!expectedType || row.type === expectedType) {
        return { entity: row, confidence: 1.0, matchedOn: 'ticker' };
      }
    }

    // 2. Exact match on iso2 (case-insensitive)
    if (normalized.length === 2) {
      const iso2Rows = await entityByIso2(this.db, normalized);
      if (iso2Rows.length > 0) {
        const row = iso2Rows[0];
        if (!expectedType || row.type === expectedType) {
          return { entity: row, confidence: 1.0, matchedOn: 'iso2' };
        }
      }
    }

    // 3. PostgreSQL resolution alias lookup
    const aliasRows = await aliasesByNormalized(this.db, normalized);
    if (aliasRows.length > 0) {
      // If expectedType specified, try to match
      for (const alias of aliasRows) {
        const entityRows = await entityById(this.db, alias.entityId);
        if (entityRows.length > 0) {
          const entity = entityRows[0];
          if (!expectedType || entity.type === expectedType) {
            return {
              entity,
              confidence: parseFloat(alias.confidence ?? '0.5'),
              matchedOn: `alias:${alias.source}`,
            };
          }
        }
      }
    }

    // 4. Typesense fuzzy fallback
    if (this.searchService?.available) {
      const tsResult = await this.searchService.resolve(normalized, expectedType);
      if (tsResult && tsResult.confidence > 0.3) {
        const entityRows = await entityById(this.db, tsResult.entityId);
        if (entityRows.length > 0) {
          return {
            entity: entityRows[0],
            confidence: tsResult.confidence,
            matchedOn: tsResult.matchedOn,
          };
        }
      }
    }

    return null;
  }
}

// ── Cursor helpers ──────────────────────────────────────────────────

function encodeCursor(id: string, value: string): string {
  return Buffer.from(JSON.stringify({ id, value })).toString('base64url');
}

function decodeCursor(cursor: string): { id: string; value: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (typeof parsed.id === 'string' && typeof parsed.value === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
