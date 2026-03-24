import { eq, sql } from 'drizzle-orm';
import { createLogger } from '@gambit/common';
import { recordId } from '@gambit/common';
import { signals, entities } from '../../db';
import type { ResolvedSignal, SourceConfig } from '../types';
import type { DrizzleClient } from '../../db/transaction';
import type { NatsFeatureFlags } from '../../infrastructure/nats-kv';

const logger = createLogger('signal-writer');

export interface WriteResult {
  written: boolean;
  deduplicated: boolean;
  signalId?: string;
}

interface ClickHouseRow {
  id: string;
  entity_id: string;
  source_id: string;
  category: string;
  polarity: string;
  intensity: number;
  confidence: number;
  published_at: string;
  created_at: string;
  domains: string[];
  tags: string[];
}

const CLICKHOUSE_FLUSH_SIZE = 500;
const CLICKHOUSE_FLUSH_INTERVAL_MS = 5_000;

export class SignalWriter {
  private clickhouseBuffer: ClickHouseRow[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private db: DrizzleClient,
    private clickhouse: any | null,
    private featureFlags?: NatsFeatureFlags | null,
  ) {}

  async writeSignal(signal: ResolvedSignal, source: SourceConfig): Promise<WriteResult> {
    const id = recordId('signal', crypto.randomUUID());
    const polarity = source.polarity ?? 'behavioral';

    // Insert into PostgreSQL with unique content_hash constraint
    const rows = await (this.db as any)
      .insert(signals)
      .values({
        id,
        entityId: signal.entityId,
        sourceId: source.id,
        polarity,
        category: signal.category,
        headline: signal.headline,
        body: signal.body ?? null,
        url: signal.url ?? null,
        intensity: String(signal.intensity),
        confidence: String(signal.confidence),
        domains: signal.domains,
        tags: signal.tags ?? [],
        contentHash: signal.contentHash,
        simhash: signal.simhash ?? null,
        eventFingerprint: signal.eventFingerprint ?? null,
        secondaryEntities: signal.secondaryEntities.map((e) => e.entityId),
        extractedClaims: signal.claims as any[],
        financialWeight: signal.financialWeight ?? null,
        rawPayload: signal.rawPayload ?? null,
        meta: signal.meta ?? {},
        publishedAt: new Date(signal.publishedAt),
        isBackfill: false,
      })
      .onConflictDoNothing()
      .returning();

    // Empty result = content_hash conflict → deduplicated
    if (!rows || rows.length === 0) {
      return { written: false, deduplicated: true };
    }

    const writtenId: string = rows[0].id;

    // Update entity signal count based on polarity
    if (polarity === 'declarative') {
      await (this.db as any)
        .update(entities)
        .set({ signalCountDeclarative: sql`${entities.signalCountDeclarative} + 1` })
        .where(eq(entities.id, signal.entityId));
    } else {
      await (this.db as any)
        .update(entities)
        .set({ signalCountBehavioral: sql`${entities.signalCountBehavioral} + 1` })
        .where(eq(entities.id, signal.entityId));
    }

    // When nats.consumers.clickhouse is enabled the NATS consumer handles the
    // ClickHouse write — skip the inline buffer to avoid double-writes.
    const natsClickhouse = this.featureFlags?.isEnabled('nats.consumers.clickhouse', true) ?? false;

    if (!natsClickhouse) {
      // Queue ClickHouse row (legacy inline path)
      const chRow: ClickHouseRow = {
        id: writtenId,
        entity_id: signal.entityId,
        source_id: source.id,
        category: signal.category,
        polarity,
        intensity: signal.intensity,
        confidence: signal.confidence,
        published_at: signal.publishedAt,
        created_at: new Date().toISOString(),
        domains: signal.domains,
        tags: signal.tags ?? [],
      };

      this.clickhouseBuffer.push(chRow);

      if (this.clickhouseBuffer.length >= CLICKHOUSE_FLUSH_SIZE) {
        await this.flushClickHouse();
      } else {
        this.scheduleFlush();
      }
    }

    return { written: true, deduplicated: false, signalId: writtenId };
  }

  async flushClickHouse(): Promise<void> {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.clickhouseBuffer.length === 0) return;
    if (!this.clickhouse) {
      this.clickhouseBuffer = [];
      return;
    }

    const rows = this.clickhouseBuffer.splice(0);

    try {
      await this.clickhouse.insert({
        table: 'signals',
        values: rows,
        format: 'JSONEachRow',
      });
    } catch (err) {
      logger.error({ err, count: rows.length }, 'ClickHouse flush failed — rows will be reconciled later');
      // Do not rethrow; reconciliation workflow handles recovery
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(async () => {
      this.flushTimer = null;
      await this.flushClickHouse().catch((err) => {
        logger.error({ err }, 'Scheduled ClickHouse flush error');
      });
    }, CLICKHOUSE_FLUSH_INTERVAL_MS);
  }
}
