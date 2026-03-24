// cache-invalidator.ts — NATS consumer: invalidates Redis cache on signal ingestion

import { BaseConsumer } from './base-consumer';
import type { ConsumerConfig } from './base-consumer';
import type { DomainEvent } from '../infrastructure/event-schemas';
import { STREAMS, EVENT_TYPES } from '../infrastructure/event-schemas';

// ── SignalIngestedData (mirrors publish.ts) ───────────────────────────

interface SignalIngestedData {
  signalId: string;
  entityId: string;
  sourceId: string;
  polarity: string;
  category: string;
  title: string;
}

// ── CacheInvalidatorConsumer ──────────────────────────────────────────

export class CacheInvalidatorConsumer extends BaseConsumer {
  constructor(
    config: ConsumerConfig,
    private readonly redis: any | null,
  ) {
    super(config);
  }

  static defaultConfig(
    base: Omit<ConsumerConfig, 'stream' | 'consumerName' | 'filterSubject' | 'batchSize' | 'batchWindowMs'>,
  ): ConsumerConfig {
    return {
      ...base,
      stream: STREAMS.SIGNALS,
      consumerName: 'cache-invalidator',
      filterSubject: 'signals.>',
      batchSize: 10,
      batchWindowMs: 0,
    };
  }

  async handleBatch(events: DomainEvent[]): Promise<void> {
    if (!this.redis) {
      this.logger.debug('Redis client not available — skipping cache invalidation');
      return;
    }

    // Filter to signal.ingested events only
    const ingested = events.filter(
      (e): e is DomainEvent<SignalIngestedData> => e.type === EVENT_TYPES.SIGNAL_INGESTED,
    );

    if (ingested.length === 0) {
      return;
    }

    // Collect unique entity IDs and their cache keys
    const entityIds = [...new Set(ingested.map((e) => e.data.entityId))];

    const keys = entityIds.flatMap((entityId) => [
      `entity:${entityId}`,
      `gap:${entityId}`,
      `signals:${entityId}`,
    ]);

    // Use a Redis pipeline for batch DEL efficiency (H49)
    const pipeline = this.redis.pipeline();
    for (const key of keys) {
      pipeline.del(key);
    }
    await pipeline.exec();

    // Broadcast L1 invalidation so in-process caches can evict
    await this.redis.publish('cache.invalidate', JSON.stringify({ keys }));

    this.logger.info({ entityCount: entityIds.length, keyCount: keys.length }, 'Cache: keys invalidated');
  }
}
