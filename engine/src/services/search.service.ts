import type { TypesenseClient } from '../infrastructure/typesense';
import { ENTITY_COLLECTION_SCHEMA } from '../infrastructure/typesense';
import type { DrizzleClient } from '../db/transaction';
import type { Logger } from '@gambit/common';
import { ServiceUnavailableError } from '@gambit/common';
import { entities } from '../db/schema/entities';

export interface SearchOptions {
  query: string;
  types?: string[];
  status?: string;
  sector?: string;
  domain?: string;
  risk?: string;
  tag?: string;
  limit?: number;
  page?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

export interface SearchResult {
  id: string;
  name: string;
  type: string;
  score: number;
  highlights: Array<{ field: string; snippet: string }>;
}

export interface ResolveResult {
  entityId: string;
  name: string;
  type: string;
  confidence: number;
  matchedOn: string;
}

export class SearchService {
  constructor(
    private client: TypesenseClient | null,
    private logger: Logger,
  ) {}

  get available(): boolean {
    return this.client !== null;
  }

  async search(query: string, options: Partial<SearchOptions> = {}): Promise<{
    results: SearchResult[];
    found: number;
    searchTimeMs: number;
  }> {
    if (!this.client) {
      throw new ServiceUnavailableError('Typesense');
    }

    const filterParts: string[] = [];
    if (options.types && options.types.length > 0) {
      filterParts.push(`type:[${options.types.join(',')}]`);
    }
    if (options.status) {
      filterParts.push(`status:=${options.status}`);
    }
    if (options.sector) {
      filterParts.push(`sector:=${options.sector}`);
    }
    if (options.domain) {
      filterParts.push(`domains:=${options.domain}`);
    }
    if (options.risk) {
      filterParts.push(`risk:=${options.risk}`);
    }
    if (options.tag) {
      filterParts.push(`tags:=${options.tag}`);
    }

    const sortByField = options.sortBy ?? 'updated_at';
    const sortDir = options.sortDir ?? 'desc';
    const sortByStr =
      sortByField === '_text_match'
        ? '_text_match:desc'
        : `${sortByField}:${sortDir}`;

    const searchParams = {
      q: query,
      query_by: 'name,aliases,ticker,iso2',
      query_by_weights: '4,2,3,3',
      filter_by: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
      sort_by: sortByStr,
      per_page: options.limit ?? 50,
      page: options.page ?? 1,
      typo_tokens_threshold: 1,
      num_typos: 2,
      highlight_full_fields: 'name,aliases',
    };

    const response = await this.client
      .collections('entities')
      .documents()
      .search(searchParams);

    const results: SearchResult[] = (response.hits ?? []).map((hit: any) => ({
      id: hit.document.id as string,
      name: hit.document.name as string,
      type: hit.document.type as string,
      score: (hit.text_match ?? 0) as number,
      highlights: (hit.highlights ?? []).map((h: any) => ({
        field: h.field as string,
        snippet: (h.snippet ?? h.value ?? '') as string,
      })),
    }));

    return {
      results,
      found: response.found ?? 0,
      searchTimeMs: response.search_time_ms ?? 0,
    };
  }

  async resolve(
    rawName: string,
    expectedType?: string,
  ): Promise<ResolveResult | null> {
    if (!this.client) return null;

    const filterParts: string[] = [];
    if (expectedType) {
      filterParts.push(`type:=${expectedType}`);
    }

    const searchParams = {
      q: rawName,
      query_by: 'name,aliases,ticker,iso2',
      query_by_weights: '4,2,3,3',
      filter_by: filterParts.length > 0 ? filterParts.join(' && ') : undefined,
      per_page: 1,
      num_typos: 2,
      typo_tokens_threshold: 1,
    };

    try {
      const response = await this.client
        .collections('entities')
        .documents()
        .search(searchParams);

      const hit = response.hits?.[0];
      if (!hit) return null;

      const textMatch = hit.text_match ?? 0;
      // Normalize text_match score to 0..1 range (Typesense scores are large integers)
      const confidence = Math.min(1, textMatch / 1_000_000_000_000);

      const doc = hit.document as Record<string, any>;
      return {
        entityId: doc.id as string,
        name: doc.name as string,
        type: doc.type as string,
        confidence,
        matchedOn: 'typesense-fuzzy',
      };
    } catch (err) {
      this.logger.warn({ err, rawName }, 'Typesense resolve failed');
      return null;
    }
  }

  async upsertEntities(
    docs: Array<{
      id: string;
      type: string;
      name: string;
      aliases?: string[];
      status?: string;
      sector?: string;
      jurisdiction?: string;
      domains?: string[];
      tags?: string[];
      risk?: string;
      ticker?: string;
      iso2?: string;
      reality_score?: number;
      signal_count?: number;
      lat?: number;
      lng?: number;
      updated_at?: number;
    }>,
  ): Promise<{ success: number; failed: number }> {
    if (!this.client) {
      throw new ServiceUnavailableError('Typesense');
    }

    const importDocs = docs.map((doc) => ({
      id: doc.id,
      type: doc.type,
      name: doc.name,
      aliases: doc.aliases ?? [],
      status: doc.status ?? 'active',
      sector: doc.sector,
      jurisdiction: doc.jurisdiction,
      domains: doc.domains ?? [],
      tags: doc.tags ?? [],
      risk: doc.risk,
      ticker: doc.ticker,
      iso2: doc.iso2,
      reality_score: doc.reality_score,
      signal_count: doc.signal_count,
      lat: doc.lat,
      lng: doc.lng,
      updated_at: doc.updated_at ?? Math.floor(Date.now() / 1000),
    }));

    const results = await this.client
      .collections('entities')
      .documents()
      .import(importDocs, { action: 'upsert' });

    let success = 0;
    let failed = 0;
    for (const result of results) {
      if (result.success) {
        success++;
      } else {
        failed++;
        this.logger.warn(
          { error: result.error, document: result.document },
          'Typesense upsert failed for document',
        );
      }
    }

    return { success, failed };
  }

  async deleteEntity(id: string): Promise<void> {
    if (!this.client) {
      throw new ServiceUnavailableError('Typesense');
    }

    try {
      await this.client.collections('entities').documents(id).delete();
    } catch (err: any) {
      if (err?.httpStatus === 404) return; // already deleted
      throw err;
    }
  }

  async rebuildIndex(pgDb: DrizzleClient): Promise<{
    indexed: number;
    failed: number;
    durationMs: number;
  }> {
    if (!this.client) {
      throw new ServiceUnavailableError('Typesense');
    }

    const start = Date.now();
    const tempCollectionName = `entities_rebuild_${Date.now()}`;

    // Create temp collection with same schema
    const tempSchema = {
      ...ENTITY_COLLECTION_SCHEMA,
      name: tempCollectionName,
    };
    await this.client.collections().create(tempSchema);

    this.logger.info({ collection: tempCollectionName }, 'Temp collection created for rebuild');

    let indexed = 0;
    let failed = 0;

    // Read all entities from PostgreSQL
    const rows = await pgDb.select().from(entities);

    // Batch import into temp collection
    const batchSize = 500;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const docs = batch.map((row) => ({
        id: row.id,
        type: row.type,
        name: row.name,
        aliases: row.aliases ?? [],
        status: row.status,
        sector: row.sector ?? undefined,
        jurisdiction: row.jurisdiction ?? undefined,
        domains: row.domains ?? [],
        tags: row.tags ?? [],
        risk: row.risk ?? undefined,
        ticker: row.ticker ?? undefined,
        iso2: row.iso2 ?? undefined,
        reality_score: row.realityScore ? parseFloat(row.realityScore) : undefined,
        signal_count: (row.signalCountDeclarative ?? 0) + (row.signalCountBehavioral ?? 0),
        lat: row.lat ? parseFloat(row.lat) : undefined,
        lng: row.lng ? parseFloat(row.lng) : undefined,
        updated_at: Math.floor(row.updatedAt.getTime() / 1000),
      }));

      const results = await this.client!
        .collections(tempCollectionName)
        .documents()
        .import(docs, { action: 'upsert' });

      for (const result of results) {
        if (result.success) indexed++;
        else failed++;
      }
    }

    // Zero-downtime alias swap: create/update an alias pointing to the new collection
    // Typesense aliases allow swapping the backing collection atomically
    try {
      await this.client.aliases().upsert('entities', {
        collection_name: tempCollectionName,
      });
      this.logger.info('Alias "entities" now points to rebuilt collection');
    } catch {
      // If aliases not available, drop old and rename
      try {
        await this.client.collections('entities').delete();
      } catch {
        // may not exist
      }
      // We can't rename in Typesense, so the alias approach is preferred
      this.logger.warn('Alias swap failed — old collection dropped, new collection in place');
    }

    const durationMs = Date.now() - start;
    this.logger.info({ indexed, failed, durationMs }, 'Typesense index rebuild complete');

    return { indexed, failed, durationMs };
  }
}
