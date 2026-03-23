import { createLogger, recordId } from '@gambit/common';
import type { Logger } from '@gambit/common';
import type { DrizzleClient } from '../db/transaction';
import { sources, sourceConfigAudit } from '../db';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { ScheduleManager } from './schedule-manager';

const logger: Logger = createLogger('source-service');

export interface SourceCreateInput {
  name: string;
  sourceType: string;
  fetcherType: string;
  fetcherUrl?: string;
  fetcherSchedule?: string;
  fetcherPagination?: string;
  fetcherAuth?: { type: string; keyRef?: string };
  fetcherRateLimitMs?: number;
  parserMode?: string;
  parserRef?: string;
  parserPrompt?: string;
  parserModel?: string;
  parserMaxInputTokens?: number;
  polarity?: string;
  category?: string;
  domains?: string[];
  dependencies?: Array<{ sourceId: string; requirement: string }>;
  upstreamGroup?: string;
  enabled?: boolean;
  tier?: number;
  meta?: Record<string, any>;
}

export interface SourceUpdateInput extends Partial<SourceCreateInput> {}

export interface SourceListFilters {
  enabled?: boolean;
  sourceType?: string;
  tier?: number;
  upstreamGroup?: string;
  limit?: number;
  offset?: number;
}

export type SourceRow = typeof sources.$inferSelect;

export class SourceService {
  constructor(
    private db: DrizzleClient,
    private scheduleManager: ScheduleManager,
    private logger: Logger = createLogger('source-service'),
  ) {}

  async create(data: SourceCreateInput): Promise<SourceRow> {
    const id = recordId('src', crypto.randomUUID());

    await (this.db as any).insert(sources).values({
      id,
      name: data.name,
      sourceType: data.sourceType,
      fetcherType: data.fetcherType,
      fetcherUrl: data.fetcherUrl ?? null,
      fetcherSchedule: data.fetcherSchedule ?? null,
      fetcherPagination: data.fetcherPagination ?? 'none',
      fetcherAuth: data.fetcherAuth ?? null,
      fetcherRateLimitMs: data.fetcherRateLimitMs ?? 1000,
      parserMode: (data.parserMode ?? 'structured') as any,
      parserRef: data.parserRef ?? null,
      parserPrompt: data.parserPrompt ?? null,
      parserModel: data.parserModel ?? null,
      parserMaxInputTokens: data.parserMaxInputTokens ?? 4000,
      polarity: (data.polarity ?? null) as any,
      category: data.category ?? null,
      domains: data.domains ?? [],
      dependencies: data.dependencies ?? [],
      upstreamGroup: data.upstreamGroup ?? null,
      enabled: data.enabled ?? true,
      tier: data.tier ?? 3,
      meta: data.meta ?? {},
    });

    const created = await this.get(id);
    if (!created) throw new Error(`Failed to create source: ${id}`);

    // Sync Temporal schedule if enabled
    if (created.enabled) {
      await this.scheduleManager.sync(id).catch((err) => {
        this.logger.warn({ err, id }, 'SourceService.create: schedule sync failed (non-fatal)');
      });
    }

    return created;
  }

  async update(
    id: string,
    data: SourceUpdateInput,
    changedBy: string,
  ): Promise<SourceRow> {
    // Read current values for audit trail
    const current = await this.get(id);
    if (!current) throw new Error(`Source not found: ${id}`);

    // Build audit records for changed fields
    const auditRecords: Array<{
      id: string;
      sourceId: string;
      changedBy: string;
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }> = [];

    const auditableFields = [
      'name', 'fetcherUrl', 'fetcherSchedule', 'fetcherPagination',
      'fetcherRateLimitMs', 'parserMode', 'parserRef', 'parserPrompt',
      'parserModel', 'polarity', 'category', 'domains', 'enabled', 'tier',
    ] as const;

    for (const field of auditableFields) {
      if (field in data) {
        const oldVal = (current as any)[field];
        const newVal = (data as any)[field];
        const oldStr = oldVal != null ? JSON.stringify(oldVal) : null;
        const newStr = newVal != null ? JSON.stringify(newVal) : null;
        if (oldStr !== newStr) {
          auditRecords.push({
            id: recordId('audit', crypto.randomUUID()),
            sourceId: id,
            changedBy,
            field,
            oldValue: oldStr,
            newValue: newStr,
          });
        }
      }
    }

    // Insert audit records
    if (auditRecords.length > 0) {
      await (this.db as any).insert(sourceConfigAudit).values(auditRecords);
    }

    // Build update set (only defined fields)
    const updateSet: Record<string, any> = { updatedAt: new Date() };
    const fieldMap: Record<string, string> = {
      name: 'name',
      sourceType: 'sourceType',
      fetcherType: 'fetcherType',
      fetcherUrl: 'fetcherUrl',
      fetcherSchedule: 'fetcherSchedule',
      fetcherPagination: 'fetcherPagination',
      fetcherAuth: 'fetcherAuth',
      fetcherRateLimitMs: 'fetcherRateLimitMs',
      parserMode: 'parserMode',
      parserRef: 'parserRef',
      parserPrompt: 'parserPrompt',
      parserModel: 'parserModel',
      parserMaxInputTokens: 'parserMaxInputTokens',
      polarity: 'polarity',
      category: 'category',
      domains: 'domains',
      dependencies: 'dependencies',
      upstreamGroup: 'upstreamGroup',
      enabled: 'enabled',
      tier: 'tier',
      meta: 'meta',
    };

    for (const [inputKey, dbKey] of Object.entries(fieldMap)) {
      if (inputKey in data) {
        updateSet[dbKey] = (data as any)[inputKey];
      }
    }

    await (this.db as any)
      .update(sources)
      .set(updateSet)
      .where(eq(sources.id, id));

    const updated = await this.get(id);
    if (!updated) throw new Error(`Source not found after update: ${id}`);

    // Sync schedule (handles both enable and schedule changes)
    await this.scheduleManager.sync(id).catch((err) => {
      this.logger.warn({ err, id }, 'SourceService.update: schedule sync failed (non-fatal)');
    });

    return updated;
  }

  async get(id: string): Promise<SourceRow | null> {
    const rows = await (this.db as any)
      .select()
      .from(sources)
      .where(eq(sources.id, id));
    return rows[0] ?? null;
  }

  async list(filters: SourceListFilters = {}): Promise<SourceRow[]> {
    const conditions = [];

    if (filters.enabled !== undefined) {
      conditions.push(eq(sources.enabled, filters.enabled));
    }
    if (filters.sourceType !== undefined) {
      conditions.push(eq(sources.sourceType, filters.sourceType));
    }
    if (filters.tier !== undefined) {
      conditions.push(eq(sources.tier, filters.tier));
    }
    if (filters.upstreamGroup !== undefined) {
      conditions.push(eq(sources.upstreamGroup, filters.upstreamGroup));
    }

    const query = (this.db as any)
      .select()
      .from(sources)
      .orderBy(desc(sources.createdAt))
      .limit(filters.limit ?? 100)
      .offset(filters.offset ?? 0);

    if (conditions.length > 0) {
      return query.where(and(...conditions));
    }

    return query;
  }
}
