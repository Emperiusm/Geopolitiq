import { MongoClient, type ChangeStreamDocument, type ChangeStream } from 'mongodb';
import { eq, sql, and } from 'drizzle-orm';
import { recordId, edgeId, EDGE_MAPPINGS, type Logger } from '@gambit/common';
import { entities, entityEdges } from '../db/schema/entities';
import { syncDlq } from '../db/schema/operations';
import type { DrizzleClient } from '../db/transaction';
import { ENTITY_MAPPINGS, type MongoEntityMapping } from '../seed/transformers';
import { buildResolverContext, TARGET_RESOLVERS, type ResolverContext } from '../seed/resolvers';
import { validateEntity } from '../seed/validator';

/* ───────── Types ───────── */

interface SyncHealth {
  status: 'healthy' | 'lagging' | 'stalled' | 'disconnected';
  lastSyncAt: Date | null;
  lagSeconds: number;
  entitiesSynced24h: number;
  errors24h: number;
  activeWatchers: number;
  totalWatchers: number;
}

interface PendingBatch {
  changes: ChangeStreamDocument[];
  timer: ReturnType<typeof setTimeout> | null;
}

/* ───────── Mongo-owned fields (never overwrite pg-owned columns) ───────── */

const MONGO_OWNED_SET = {
  name: sql`excluded.name`,
  aliases: sql`excluded.aliases`,
  lat: sql`excluded.lat`,
  lng: sql`excluded.lng`,
  risk: sql`excluded.risk`,
  iso2: sql`excluded.iso2`,
  tags: sql`excluded.tags`,
  meta: sql`excluded.meta`,
  updatedAt: sql`now()`,
} as const;

/* ───────── Helper ───────── */

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  const keysA = Object.keys(aObj);
  const keysB = Object.keys(bObj);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(bObj, key)) return false;
    if (!deepEqual(aObj[key], bObj[key])) return false;
  }
  return true;
}

/* ───────── Main class ───────── */

export class ChangeStreamSync {
  private watchers = new Map<string, ChangeStream>();
  private batches = new Map<string, PendingBatch>();
  private resolverCtx: ResolverContext | null = null;
  private health: SyncHealth;
  private healthInterval: ReturnType<typeof setInterval> | null = null;
  private syncCount24h = 0;
  private errorCount24h = 0;
  private counterResetTimer: ReturnType<typeof setInterval> | null = null;
  private stopping = false;

  private readonly COLLECTIONS = [
    'countries', 'conflicts', 'bases', 'chokepoints',
    'nonStateActors', 'elections', 'tradeRoutes', 'ports',
  ];

  private readonly DEBOUNCE_MS = 1000;
  private readonly RETRY_DELAY_MS = 5000;
  private readonly RESUME_KEY_PREFIX = 'gambit:sync:resume:';

  constructor(
    private mongoClient: MongoClient,
    private pgDb: DrizzleClient,
    private redis: { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<unknown> } | null,
    private logger: Logger,
  ) {
    this.health = {
      status: 'disconnected',
      lastSyncAt: null,
      lagSeconds: 0,
      entitiesSynced24h: 0,
      errors24h: 0,
      activeWatchers: 0,
      totalWatchers: this.COLLECTIONS.length,
    };
  }

  /* ───────── Lifecycle ───────── */

  async start(): Promise<void> {
    this.stopping = false;
    this.logger.info('Building resolver context from PostgreSQL');
    const rows = await this.pgDb
      .select({ id: entities.id, type: entities.type, iso2: entities.iso2, name: entities.name })
      .from(entities);
    this.resolverCtx = buildResolverContext(rows);
    this.logger.info(
      { countriesByIso2: this.resolverCtx.countriesByIso2.size, countriesByName: this.resolverCtx.countriesByName.size },
      'Resolver context ready',
    );

    // Start one watcher per collection
    for (const collection of this.COLLECTIONS) {
      this.startWatcher(collection).catch((err) => {
        this.logger.error({ err, collection }, 'Failed to start watcher');
      });
    }

    // Health reporting every 30s
    this.healthInterval = setInterval(() => {
      this.updateHealthStatus();
      this.logger.info({ syncHealth: this.getHealth() }, 'Sync health');
    }, 30_000);

    // Reset 24h counters every hour (sliding window approximation)
    this.counterResetTimer = setInterval(() => {
      // Decay by 1/24 each hour to approximate a 24h sliding window
      this.syncCount24h = Math.max(0, Math.floor(this.syncCount24h * (23 / 24)));
      this.errorCount24h = Math.max(0, Math.floor(this.errorCount24h * (23 / 24)));
    }, 3_600_000);

    this.updateHealthStatus();
    this.logger.info('Change stream sync started');
  }

  /* ───────── Watcher ───────── */

  private async startWatcher(collection: string): Promise<void> {
    if (this.stopping) return;

    try {
      const db = this.mongoClient.db();
      const coll = db.collection(collection);

      // Retrieve resume token from Redis
      let resumeAfter: Record<string, unknown> | undefined;
      if (this.redis) {
        const tokenStr = await this.redis.get(`${this.RESUME_KEY_PREFIX}${collection}`);
        if (tokenStr) {
          try {
            resumeAfter = JSON.parse(tokenStr) as Record<string, unknown>;
            this.logger.info({ collection }, 'Resuming from saved token');
          } catch {
            this.logger.warn({ collection }, 'Corrupt resume token, starting from latest');
          }
        }
      }

      const options: Record<string, unknown> = { fullDocument: 'updateLookup' };
      if (resumeAfter) {
        options.resumeAfter = resumeAfter;
      }

      const changeStream = coll.watch([], options as any);
      this.watchers.set(collection, changeStream);
      this.batches.set(collection, { changes: [], timer: null });
      this.health.activeWatchers = this.watchers.size;

      this.logger.info({ collection }, 'Change stream watcher started');

      changeStream.on('change', (change: ChangeStreamDocument) => {
        this.enqueueChange(collection, change);
      });

      changeStream.on('error', (err: Error) => {
        this.logger.error({ err, collection }, 'Change stream error');
        this.errorCount24h++;
        this.watchers.delete(collection);
        const batch = this.batches.get(collection);
        if (batch?.timer) clearTimeout(batch.timer);
        this.batches.delete(collection);
        this.health.activeWatchers = this.watchers.size;

        // Retry after delay
        if (!this.stopping) {
          setTimeout(() => {
            this.logger.info({ collection }, 'Retrying watcher');
            this.startWatcher(collection).catch((retryErr) => {
              this.logger.error({ err: retryErr, collection }, 'Retry failed');
            });
          }, this.RETRY_DELAY_MS);
        }
      });

      changeStream.on('close', () => {
        this.watchers.delete(collection);
        this.health.activeWatchers = this.watchers.size;
        if (!this.stopping) {
          this.logger.warn({ collection }, 'Change stream closed unexpectedly');
        }
      });
    } catch (err) {
      this.logger.error({ err, collection }, 'Error opening change stream');
      this.errorCount24h++;
      // Retry after delay
      if (!this.stopping) {
        setTimeout(() => {
          this.startWatcher(collection).catch(() => {});
        }, this.RETRY_DELAY_MS);
      }
    }
  }

  /* ───────── Debounced batching ───────── */

  private enqueueChange(collection: string, change: ChangeStreamDocument): void {
    const batch = this.batches.get(collection);
    if (!batch) return;

    batch.changes.push(change);

    // Reset debounce timer
    if (batch.timer) clearTimeout(batch.timer);
    batch.timer = setTimeout(() => {
      const toProcess = [...batch.changes];
      batch.changes = [];
      batch.timer = null;
      this.processBatch(collection, toProcess).catch((err) => {
        this.logger.error({ err, collection, count: toProcess.length }, 'Batch processing failed');
      });
    }, this.DEBOUNCE_MS);
  }

  /* ───────── Batch processing ───────── */

  private async processBatch(collection: string, changes: ChangeStreamDocument[]): Promise<void> {
    const mapping = ENTITY_MAPPINGS.find((m) => m.collection === collection);
    if (!mapping) {
      this.logger.warn({ collection }, 'No entity mapping for collection');
      return;
    }

    let lastResumeToken: unknown = null;

    for (const change of changes) {
      try {
        const opType = change.operationType;
        lastResumeToken = change._id;

        if (opType === 'delete') {
          const mongoId = String((change as any).documentKey?._id ?? '');
          if (mongoId) {
            await this.handleDelete(mapping.entityType, mongoId);
            this.syncCount24h++;
          }
        } else if (opType === 'insert' || opType === 'update' || opType === 'replace') {
          const doc = (change as any).fullDocument;
          if (doc) {
            await this.handleUpsert(mapping, doc);
            this.syncCount24h++;
          } else {
            this.logger.warn({ collection, opType }, 'No fullDocument in change event');
          }
        }

        this.health.lastSyncAt = new Date();
      } catch (err) {
        this.errorCount24h++;
        const docId = String(
          (change as any).fullDocument?._id ??
          (change as any).documentKey?._id ??
          'unknown',
        );
        const errorMsg = err instanceof Error ? err.message : String(err);
        this.logger.error({ err, collection, docId }, 'Error processing change');

        await this.writeToDlq(
          collection,
          docId,
          change.operationType,
          errorMsg,
          (change as any).fullDocument ?? (change as any).documentKey ?? null,
        );
      }
    }

    // Save resume token after processing the batch
    if (lastResumeToken && this.redis) {
      try {
        await this.redis.set(
          `${this.RESUME_KEY_PREFIX}${collection}`,
          JSON.stringify(lastResumeToken),
        );
      } catch (err) {
        this.logger.error({ err, collection }, 'Failed to save resume token');
      }
    }

    // Update lag estimate (cluster time from the last change)
    const lastChange = changes[changes.length - 1];
    if (lastChange && (lastChange as any).clusterTime) {
      const clusterTimestamp = (lastChange as any).clusterTime as { getHighBits(): number };
      if (typeof clusterTimestamp.getHighBits === 'function') {
        const changeEpochSec = clusterTimestamp.getHighBits();
        this.health.lagSeconds = Math.max(0, Math.floor(Date.now() / 1000) - changeEpochSec);
      }
    }
  }

  /* ───────── Upsert ───────── */

  private async handleUpsert(mapping: MongoEntityMapping, doc: any): Promise<void> {
    // 1. Transform using same ENTITY_MAPPINGS as seed
    const transformed = mapping.transform(doc);
    const entityType = mapping.entityType;

    // 2. Validate
    const validation = validateEntity({ ...transformed, type: entityType });
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    const entityId = transformed.id;

    // 3. No-op detection: compare with existing PostgreSQL row
    const existing = await this.pgDb
      .select({
        name: entities.name,
        aliases: entities.aliases,
        lat: entities.lat,
        lng: entities.lng,
        risk: entities.risk,
        iso2: entities.iso2,
        tags: entities.tags,
        meta: entities.meta,
      })
      .from(entities)
      .where(eq(entities.id, entityId))
      .limit(1);

    if (existing.length > 0) {
      const row = existing[0];
      const noChange =
        row.name === transformed.name &&
        deepEqual(row.aliases, transformed.aliases) &&
        row.lat === (transformed.lat ?? null) &&
        row.lng === (transformed.lng ?? null) &&
        row.risk === (transformed.risk ?? null) &&
        row.iso2 === (transformed.iso2 ?? null) &&
        deepEqual(row.tags, transformed.tags) &&
        deepEqual(row.meta, transformed.meta);

      if (noChange) {
        this.logger.debug({ entityId }, 'No-op: entity data unchanged');
        return;
      }
    }

    // 4. Upsert to entities (ONLY mongo-owned fields)
    await this.pgDb
      .insert(entities)
      .values({
        id: entityId,
        type: entityType as any,
        name: transformed.name,
        aliases: transformed.aliases,
        lat: transformed.lat ?? null,
        lng: transformed.lng ?? null,
        risk: transformed.risk ?? null,
        iso2: transformed.iso2 ?? null,
        tags: transformed.tags,
        meta: transformed.meta,
      })
      .onConflictDoUpdate({
        target: entities.id,
        set: MONGO_OWNED_SET,
      });

    // 5. Refresh edges for this entity
    await this.refreshEdgesForEntity(mapping, doc, entityId);

    // 6. Update resolver context if it's a country
    if (entityType === 'country' && this.resolverCtx) {
      if (transformed.iso2) {
        this.resolverCtx.countriesByIso2.set(transformed.iso2.toUpperCase(), entityId);
      }
      this.resolverCtx.countriesByName.set(transformed.name.toLowerCase(), entityId);
    }

    this.logger.debug({ entityId, type: entityType }, 'Entity upserted via sync');
  }

  /* ───────── Edge refresh ───────── */

  private async refreshEdgesForEntity(mapping: MongoEntityMapping, doc: any, entityId: string): Promise<void> {
    if (!this.resolverCtx) return;

    // 1. Delete existing edges FROM this entity where source = 'sync'
    await this.pgDb
      .delete(entityEdges)
      .where(and(eq(entityEdges.fromId, entityId), eq(entityEdges.source, 'sync')));

    // 2. Delete reverse edges TO this entity where source = 'sync'
    await this.pgDb
      .delete(entityEdges)
      .where(and(eq(entityEdges.toId, entityId), eq(entityEdges.source, 'sync')));

    // 3. Re-extract edges using EDGE_MAPPINGS for this collection
    const edgeMapping = EDGE_MAPPINGS.find((em) => em.sourceCollection === mapping.collection);
    if (!edgeMapping) return;

    const newEdges: {
      id: string;
      fromId: string;
      toId: string;
      relation: string;
      weight: string;
      source: string;
    }[] = [];

    const sourceEntityId = recordId(edgeMapping.sourceType, String(doc._id));

    for (const edgeDef of edgeMapping.edges) {
      const rawValues: string[] =
        edgeDef.fieldType === 'array'
          ? (doc[edgeDef.field] ?? [])
          : doc[edgeDef.field]
            ? [doc[edgeDef.field]]
            : [];

      for (const rawValue of rawValues) {
        const resolver = edgeDef.targetResolver
          ? TARGET_RESOLVERS[edgeDef.targetResolver]
          : null;
        const targetId = resolver
          ? resolver(rawValue, this.resolverCtx)
          : recordId(edgeDef.targetType, rawValue);

        if (!targetId) {
          this.logger.debug(
            { source: sourceEntityId, field: edgeDef.field, value: rawValue },
            'Unresolvable edge target in sync',
          );
          continue;
        }

        newEdges.push({
          id: edgeId(sourceEntityId, edgeDef.relation, targetId),
          fromId: sourceEntityId,
          toId: targetId,
          relation: edgeDef.relation,
          weight: (edgeDef.weight ?? 1.0).toString(),
          source: 'sync',
        });

        if (edgeDef.bidirectional && edgeDef.reverseRelation) {
          newEdges.push({
            id: edgeId(targetId, edgeDef.reverseRelation, sourceEntityId),
            fromId: targetId,
            toId: sourceEntityId,
            relation: edgeDef.reverseRelation,
            weight: (edgeDef.weight ?? 1.0).toString(),
            source: 'sync',
          });
        }
      }
    }

    // 4. Batch insert new edges with onConflictDoNothing
    if (newEdges.length > 0) {
      for (const batch of chunk(newEdges, 500)) {
        await this.pgDb.insert(entityEdges).values(batch).onConflictDoNothing();
      }
      this.logger.debug({ entityId, edgeCount: newEdges.length }, 'Edges refreshed via sync');
    }
  }

  /* ───────── Soft delete ───────── */

  private async handleDelete(entityType: string, mongoId: string): Promise<void> {
    const entityId = recordId(entityType, mongoId);

    // Soft delete: mark status = 'inactive'
    // Do NOT hard delete — entity may have signals referencing it
    const result = await this.pgDb
      .update(entities)
      .set({
        status: 'inactive' as any,
        statusDetail: 'Deleted from MongoDB via change stream sync',
        statusAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(entities.id, entityId));

    this.logger.info({ entityId, entityType }, 'Entity soft-deleted via sync');
  }

  /* ───────── DLQ ───────── */

  private async writeToDlq(
    collection: string,
    docId: string,
    opType: string,
    error: string,
    doc: any,
  ): Promise<void> {
    try {
      const dlqId = `dlq-sync-${collection}-${docId}-${Date.now()}`;
      await this.pgDb.insert(syncDlq).values({
        id: dlqId,
        collection,
        documentId: docId,
        operationType: opType,
        error,
        document: doc ? JSON.parse(JSON.stringify(doc)) : null,
        attemptCount: 1,
        lastAttemptAt: new Date(),
      });
      this.logger.warn({ dlqId, collection, docId, opType }, 'Wrote failed sync op to DLQ');
    } catch (dlqErr) {
      this.logger.error({ err: dlqErr, collection, docId }, 'Failed to write to sync DLQ');
    }
  }

  /* ───────── Health ───────── */

  private updateHealthStatus(): void {
    this.health.entitiesSynced24h = this.syncCount24h;
    this.health.errors24h = this.errorCount24h;
    this.health.activeWatchers = this.watchers.size;

    if (this.watchers.size === 0) {
      this.health.status = 'disconnected';
    } else if (this.health.lagSeconds > 60) {
      this.health.status = 'lagging';
    } else if (
      this.health.lastSyncAt &&
      Date.now() - this.health.lastSyncAt.getTime() > 5 * 60 * 1000
    ) {
      // Last sync was > 5 minutes ago — could be stalled or just no changes
      this.health.status = 'stalled';
    } else {
      this.health.status = 'healthy';
    }
  }

  getHealth(): SyncHealth {
    this.updateHealthStatus();
    return { ...this.health };
  }

  /* ───────── Shutdown ───────── */

  async stop(): Promise<void> {
    this.stopping = true;
    this.logger.info('Stopping change stream sync');

    // Clear health interval
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }

    // Clear counter reset timer
    if (this.counterResetTimer) {
      clearInterval(this.counterResetTimer);
      this.counterResetTimer = null;
    }

    // Clear any pending debounce timers
    for (const [, batch] of this.batches) {
      if (batch.timer) clearTimeout(batch.timer);
    }
    this.batches.clear();

    // Close all change stream watchers
    const closePromises: Promise<void>[] = [];
    for (const [collection, watcher] of this.watchers) {
      this.logger.info({ collection }, 'Closing change stream watcher');
      closePromises.push(watcher.close());
    }
    await Promise.allSettled(closePromises);
    this.watchers.clear();

    // Update health to disconnected
    this.health.status = 'disconnected';
    this.health.activeWatchers = 0;

    this.logger.info('Change stream sync stopped');
  }
}
