// cache-invalidator.ts — NATS consumer: invalidates Redis cache on signal/entity/gap events

import { BaseConsumer } from './base-consumer';
import type { ConsumerConfig } from './base-consumer';
import type { DomainEvent } from '../infrastructure/event-schemas';
import { STREAMS, EVENT_TYPES } from '../infrastructure/event-schemas';

// ── Payload shapes (loosely typed — only entityId is required) ────────

interface SignalIngestedData {
  signalId: string;
  entityId: string;
  sourceId: string;
  polarity: string;
  category: string;
  title: string;
}

interface EntityEventData {
  entityId: string;
  [key: string]: unknown;
}

interface GapEventData {
  entityId: string;
  [key: string]: unknown;
}

// ── CacheInvalidatorConsumer ──────────────────────────────────────────

export class CacheInvalidatorConsumer extends BaseConsumer {
  constructor(
    config: ConsumerConfig,
    private readonly redis: any | null,
  ) {
    super(config);
  }

  /**
   * Default config for the SIGNALS stream.
   * Use signalsConfig / entitiesConfig / gapsConfig for the three-instance setup.
   */
  static defaultConfig(
    base: Omit<ConsumerConfig, 'stream' | 'consumerName' | 'filterSubject' | 'batchSize' | 'batchWindowMs'>,
  ): ConsumerConfig {
    return CacheInvalidatorConsumer.signalsConfig(base);
  }

  static signalsConfig(
    base: Omit<ConsumerConfig, 'stream' | 'consumerName' | 'filterSubject' | 'batchSize' | 'batchWindowMs'>,
  ): ConsumerConfig {
    return {
      ...base,
      stream: STREAMS.SIGNALS,
      consumerName: 'cache-invalidator-signals',
      filterSubject: 'signals.>',
      batchSize: 10,
      batchWindowMs: 0,
    };
  }

  static entitiesConfig(
    base: Omit<ConsumerConfig, 'stream' | 'consumerName' | 'filterSubject' | 'batchSize' | 'batchWindowMs'>,
  ): ConsumerConfig {
    return {
      ...base,
      stream: STREAMS.ENTITIES,
      consumerName: 'cache-invalidator-entities',
      filterSubject: 'entities.>',
      batchSize: 10,
      batchWindowMs: 0,
    };
  }

  static gapsConfig(
    base: Omit<ConsumerConfig, 'stream' | 'consumerName' | 'filterSubject' | 'batchSize' | 'batchWindowMs'>,
  ): ConsumerConfig {
    return {
      ...base,
      stream: STREAMS.GAP_SCORES,
      consumerName: 'cache-invalidator-gaps',
      filterSubject: 'gaps.>',
      batchSize: 10,
      batchWindowMs: 0,
    };
  }

  async handleBatch(events: DomainEvent[]): Promise<void> {
    if (!this.redis) {
      this.logger.debug('Redis client not available — skipping cache invalidation');
      return;
    }

    // Extract entity IDs from all relevant event types across all three streams
    const entityIds = new Set<string>();

    for (const event of events) {
      switch (event.type) {
        // Signals stream
        case EVENT_TYPES.SIGNAL_INGESTED:
        case EVENT_TYPES.SIGNAL_ENRICHED:
        case EVENT_TYPES.SIGNAL_PARSED: {
          const data = event.data as SignalIngestedData;
          if (data?.entityId) entityIds.add(data.entityId);
          break;
        }

        // Entities stream — invalidate entityById and signal caches
        case EVENT_TYPES.ENTITY_CREATED:
        case EVENT_TYPES.ENTITY_UPDATED:
        case EVENT_TYPES.ENTITY_MERGED:
        case EVENT_TYPES.ENTITY_RESOLVED: {
          const data = event.data as EntityEventData;
          if (data?.entityId) entityIds.add(data.entityId);
          break;
        }

        // Gap scores stream — invalidate leaderboard and gapScoreByEntity caches
        case EVENT_TYPES.GAP_SCORE_COMPUTED:
        case EVENT_TYPES.GAP_SCORE_DEGRADED: {
          const data = event.data as GapEventData;
          if (data?.entityId) entityIds.add(data.entityId);
          break;
        }

        default:
          break;
      }
    }

    if (entityIds.size === 0) {
      return;
    }

    // Build cache keys for each affected entity
    const keys = [...entityIds].flatMap((entityId) => [
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

    this.logger.info({ entityCount: entityIds.size, keyCount: keys.length }, 'Cache: keys invalidated');
  }
}
