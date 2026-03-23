import { recordId } from '@gambit/common';
import type { ResolutionCache } from './cache';
import type { BloomFilter } from './bloom';
import type { ResolvedEntity } from '../pipeline/types';

export interface ResolutionContext {
  domains: string[];
  externalIds?: Record<string, string>;
  sourceConfidenceBoost?: number;
}

// Typesense client interface (duck-typed for testability)
interface TypesenseClient {
  collections: (name: string) => {
    documents: () => {
      search: (params: Record<string, any>) => Promise<{
        hits?: Array<{
          document: { id: string; name: string; domains?: string[] };
          text_match_info?: { score: number };
          hybrid_search_info?: { rank_fusion_score: number };
        }>;
      }>;
    };
  };
}

// Database interface (duck-typed for testability)
interface DbLike {
  query: {
    entities: { findFirst: (opts: any) => Promise<any> };
    resolutionAliases: { findFirst: (opts: any) => Promise<any> };
  };
  insert: (table: any) => { values: (data: any) => { onConflictDoNothing: () => Promise<any> } };
  schema: { entities: any };
}

const FUZZY_THRESHOLD = 0.85;
const DOMAIN_REQUIRED_THRESHOLD = 0.90;
const COLLECTION = 'entities';

function normalizeForCache(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function domainOverlap(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false;
  return a.some(d => b.includes(d));
}

export class EntityResolver {
  constructor(
    private cache: ResolutionCache,
    private db: DbLike,
    private typesense: TypesenseClient | null,
    private bloom: BloomFilter,
  ) {}

  /**
   * Resolve a single entity name using the tiered strategy:
   * 1. Resolution cache (Redis)
   * 2. Bloom filter — if definitely not present, create unverified entity
   * 3. Exact match on external_ids
   * 4. Exact match on resolution_aliases
   * 5. Fuzzy match via Typesense (threshold 0.85, domain-weighted)
   * 6. Create unverified entity
   */
  async resolve(name: string, context: ResolutionContext): Promise<ResolvedEntity> {
    const normalized = normalizeForCache(name);

    // Tier 1: Cache
    const cached = await this.cache.get(name);
    if (cached) {
      return {
        entityId: cached.entityId,
        entityName: name,
        method: 'cache',
        confidence: cached.confidence,
      };
    }

    // Tier 2: Bloom filter — if definitely not present, skip DB lookups
    if (!this.bloom.mightContain(normalized)) {
      return this._createUnverified(name, context);
    }

    // Tier 3: Exact match on external_ids
    if (context.externalIds && Object.keys(context.externalIds).length > 0) {
      const externalMatch = await this._matchExternalIds(context.externalIds);
      if (externalMatch) {
        await this.cache.set(name, externalMatch.id, 1.0);
        return {
          entityId: externalMatch.id,
          entityName: externalMatch.name,
          method: 'external-id',
          confidence: 1.0,
        };
      }
    }

    // Tier 4: Exact match on resolution_aliases
    const aliasMatch = await this._matchAlias(normalized);
    if (aliasMatch) {
      const confidence = parseFloat(aliasMatch.confidence ?? '0.95');
      await this.cache.set(name, aliasMatch.entityId, confidence);
      return {
        entityId: aliasMatch.entityId,
        entityName: name,
        method: 'alias',
        confidence,
      };
    }

    // Tier 5: Fuzzy match via Typesense
    if (this.typesense) {
      const fuzzyResult = await this._fuzzyMatch(name, context);
      if (fuzzyResult) {
        await this.cache.set(name, fuzzyResult.entityId, fuzzyResult.confidence);
        return fuzzyResult;
      }
    }

    // Tier 6: Create unverified entity
    return this._createUnverified(name, context);
  }

  /**
   * Resolve a batch of names, deduplicating by normalized form before resolution.
   * Returns a Map from original name to ResolvedEntity.
   */
  async resolveBatch(names: string[], context: ResolutionContext): Promise<Map<string, ResolvedEntity>> {
    const results = new Map<string, ResolvedEntity>();

    // Deduplicate by normalized name, track canonical -> original mappings
    const normalizedToOriginal = new Map<string, string>();
    for (const name of names) {
      const normalized = normalizeForCache(name);
      if (!normalizedToOriginal.has(normalized)) {
        normalizedToOriginal.set(normalized, name);
      }
    }

    // Resolve each unique normalized name
    const resolutionMap = new Map<string, ResolvedEntity>();
    for (const [, original] of normalizedToOriginal) {
      const resolved = await this.resolve(original, context);
      resolutionMap.set(normalizeForCache(original), resolved);
    }

    // Map all original names to their resolved entity
    for (const name of names) {
      const normalized = normalizeForCache(name);
      const resolved = resolutionMap.get(normalized);
      if (resolved) {
        results.set(name, resolved);
      }
    }

    return results;
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async _matchExternalIds(externalIds: Record<string, string>): Promise<{ id: string; name: string } | null> {
    // Try each external ID field as a potential match
    for (const [key, value] of Object.entries(externalIds)) {
      try {
        const entity = await this.db.query.entities.findFirst({
          where: (e: any, { eq, sql }: any) =>
            sql`${e.externalIds}->>${key} = ${value}`,
        });
        if (entity) return { id: entity.id, name: entity.name };
      } catch {
        // Fallback: try ticker field directly
        if (key === 'ticker') {
          const entity = await this.db.query.entities.findFirst({
            where: (e: any, { eq }: any) => eq(e.ticker, value),
          });
          if (entity) return { id: entity.id, name: entity.name };
        }
      }
    }
    return null;
  }

  private async _matchAlias(normalizedName: string): Promise<{ entityId: string; confidence: string } | null> {
    return this.db.query.resolutionAliases.findFirst({
      where: (a: any, { eq }: any) => eq(a.alias, normalizedName),
    });
  }

  private async _fuzzyMatch(name: string, context: ResolutionContext): Promise<ResolvedEntity | null> {
    const boost = context.sourceConfidenceBoost ?? 0;
    const effectiveThreshold = Math.max(0, FUZZY_THRESHOLD - boost);

    try {
      const result = await this.typesense!
        .collections(COLLECTION)
        .documents()
        .search({
          q: name,
          query_by: 'name,aliases',
          per_page: 5,
          prioritize_exact_match: true,
        });

      const hits = result.hits ?? [];
      for (const hit of hits) {
        // Compute a normalized score (0-1) from Typesense's rank fusion or text match
        const rawScore =
          hit.hybrid_search_info?.rank_fusion_score ??
          (hit.text_match_info?.score ? hit.text_match_info.score / 1_000_000 : 0);

        const score = Math.min(1, rawScore);

        if (score < effectiveThreshold) continue;

        // For borderline matches (threshold <= score < DOMAIN_REQUIRED_THRESHOLD),
        // require domain overlap to avoid false positives.
        if (score < DOMAIN_REQUIRED_THRESHOLD) {
          const entityDomains: string[] = hit.document.domains ?? [];
          if (!domainOverlap(context.domains, entityDomains)) continue;
        }

        return {
          entityId: hit.document.id,
          entityName: hit.document.name,
          method: 'fuzzy',
          confidence: score,
        };
      }
    } catch {
      // Typesense unavailable — fall through to create unverified
    }

    return null;
  }

  private async _createUnverified(name: string, _context: ResolutionContext): Promise<ResolvedEntity> {
    const { createHash } = await import('crypto');
    const slug = createHash('sha256').update(name.toLowerCase().trim()).digest('hex').slice(0, 16);
    const id = recordId('entity', slug);

    try {
      await this.db
        .insert(this.db.schema.entities)
        .values({
          id,
          name,
          type: 'organization',
          status: 'unverified',
          domains: [],
          aliases: [],
          externalIds: {},
          tags: [],
          meta: { created_by: 'resolver' },
        })
        .onConflictDoNothing();
    } catch {
      // Entity may already exist with this slug — that's fine
    }

    this.bloom.add(name);

    return {
      entityId: id,
      entityName: name,
      method: 'new',
      confidence: 0.0,
    };
  }
}
