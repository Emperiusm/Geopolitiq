// clickhouse-sync.ts — NATS consumer: persists signal.ingested events to ClickHouse

import { BaseConsumer } from './base-consumer';
import type { ConsumerConfig } from './base-consumer';
import type { DomainEvent } from '../infrastructure/event-schemas';
import { STREAMS, EVENT_TYPES } from '../infrastructure/event-schemas';
import type { ClickhouseClient } from '../infrastructure/clickhouse';

// ── SignalIngestedData (mirrors publish.ts) ───────────────────────────

interface SignalIngestedData {
  signalId: string;
  entityId: string;
  sourceId: string;
  polarity: string;
  category: string;
  title: string;
}

// ── ClickHouseSyncConsumer ────────────────────────────────────────────

export class ClickHouseSyncConsumer extends BaseConsumer {
  constructor(
    config: ConsumerConfig,
    private readonly clickhouse: ClickhouseClient | null,
  ) {
    super(config);
  }

  static defaultConfig(
    base: Omit<ConsumerConfig, 'stream' | 'consumerName' | 'filterSubject' | 'batchSize' | 'batchWindowMs'>,
  ): ConsumerConfig {
    return {
      ...base,
      stream: STREAMS.SIGNALS,
      consumerName: 'clickhouse-sync',
      filterSubject: 'signals.>',
      batchSize: 500,
      batchWindowMs: 500,
    };
  }

  async handleBatch(events: DomainEvent[]): Promise<void> {
    if (!this.clickhouse) {
      this.logger.debug('ClickHouse client not available — skipping batch');
      return;
    }

    // Filter to signal.ingested events only
    const ingested = events.filter(
      (e): e is DomainEvent<SignalIngestedData> => e.type === EVENT_TYPES.SIGNAL_INGESTED,
    );

    if (ingested.length === 0) {
      return;
    }

    const rows = ingested.map((e) => ({
      signal_id: e.data.signalId,
      entity_id: e.data.entityId,
      source_id: e.data.sourceId,
      polarity: e.data.polarity,
      category: e.data.category,
      title: e.data.title,
      ingested_at: e.timestamp,
      trace_id: e.metadata.traceId,
    }));

    await this.clickhouse.insert({
      table: 'signals',
      values: rows,
      format: 'JSONEachRow',
    });

    this.logger.info({ count: rows.length }, 'ClickHouse: signals inserted');
  }
}
