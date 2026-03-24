// typesense-sync.ts — NATS consumer: upserts entity documents into Typesense

import { BaseConsumer } from './base-consumer';
import type { ConsumerConfig } from './base-consumer';
import type { DomainEvent } from '../infrastructure/event-schemas';
import { STREAMS, EVENT_TYPES } from '../infrastructure/event-schemas';
import type { TypesenseClient } from '../infrastructure/typesense';

// ── EntityEventData ───────────────────────────────────────────────────

interface EntityEventData {
  id: string;
  type?: string;
  name?: string;
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
}

// ── TypesenseSyncConsumer ─────────────────────────────────────────────

export class TypesenseSyncConsumer extends BaseConsumer {
  constructor(
    config: ConsumerConfig,
    private readonly typesense: TypesenseClient | null,
  ) {
    super(config);
  }

  static defaultConfig(
    base: Omit<ConsumerConfig, 'stream' | 'consumerName' | 'filterSubject' | 'batchSize' | 'batchWindowMs'>,
  ): ConsumerConfig {
    return {
      ...base,
      stream: STREAMS.ENTITIES,
      consumerName: 'typesense-sync',
      filterSubject: 'entities.>',
      batchSize: 25,
      batchWindowMs: 100,
    };
  }

  async handleBatch(events: DomainEvent[]): Promise<void> {
    if (!this.typesense) {
      this.logger.debug('Typesense client not available — skipping batch');
      return;
    }

    // Filter to entity.created and entity.updated events
    const entityEvents = events.filter(
      (e): e is DomainEvent<EntityEventData> =>
        e.type === EVENT_TYPES.ENTITY_CREATED || e.type === EVENT_TYPES.ENTITY_UPDATED,
    );

    if (entityEvents.length === 0) {
      return;
    }

    const docs = entityEvents.map((e) => ({
      id: e.data.id,
      type: e.data.type ?? 'unknown',
      name: e.data.name ?? '',
      aliases: e.data.aliases ?? [],
      status: e.data.status ?? 'active',
      sector: e.data.sector,
      jurisdiction: e.data.jurisdiction,
      domains: e.data.domains ?? [],
      tags: e.data.tags ?? [],
      risk: e.data.risk,
      ticker: e.data.ticker,
      iso2: e.data.iso2,
      reality_score: e.data.reality_score,
      signal_count: e.data.signal_count,
      lat: e.data.lat,
      lng: e.data.lng,
      updated_at: e.data.updated_at ?? Math.floor(Date.now() / 1000),
    }));

    await this.typesense.collections('entities').documents().import(docs, { action: 'upsert' });

    this.logger.info({ count: docs.length }, 'Typesense: entity documents upserted');
  }
}
