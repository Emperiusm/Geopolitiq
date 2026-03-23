import { createLogger, recordId } from '@gambit/common';
import type { SSEEvent, SSEEventType } from './event-types';
import { SSE_CHANNELS } from './event-types';
import type { ResolvedSignal, SourceConfig } from '../pipeline/types';

const logger = createLogger('sse-manager');

export class SSEManager {
  private publisher: any;
  private subscriber: any;

  constructor(redis: any) {
    // Duplicate connections: one for publishing, one for subscribing
    this.publisher = redis.duplicate();
    this.subscriber = redis.duplicate();
  }

  /**
   * Publishes an SSEEvent to one or more Redis channels.
   */
  async publish(event: SSEEvent, channels: string[]): Promise<void> {
    const payload = JSON.stringify(event);
    await Promise.all(channels.map((ch) => this.publisher.publish(ch, payload)));
  }

  /**
   * Builds and publishes a signal-ingested event.
   * Suppresses backfill signals (isBackfill flag on the signal meta).
   */
  async publishSignalIngested(signal: ResolvedSignal, source: SourceConfig): Promise<void> {
    // Suppress backfill signals from SSE
    if ((signal as any).isBackfill === true) return;

    const event: SSEEvent = {
      id: recordId('sse', crypto.randomUUID()),
      type: 'signal-ingested' as SSEEventType,
      timestamp: new Date().toISOString(),
      data: {
        entityId: signal.entityId,
        entityName: signal.resolvedEntity.entityName,
        headline: signal.headline,
        category: signal.category,
        intensity: signal.intensity,
        confidence: signal.confidence,
        domains: signal.domains,
        sourceId: source.id,
        sourceName: source.name,
        publishedAt: signal.publishedAt,
        contentHash: signal.contentHash,
      },
    };

    const channels = [
      SSE_CHANNELS.global,
      SSE_CHANNELS.entity(signal.entityId),
      SSE_CHANNELS.source(source.id),
    ];

    try {
      await this.publish(event, channels);
    } catch (err) {
      logger.error({ err, entityId: signal.entityId }, 'SSE publish failed');
    }
  }

  /**
   * Gracefully closes both Redis connections.
   */
  async shutdown(): Promise<void> {
    await Promise.all([this.publisher.quit(), this.subscriber.quit()]);
  }

  /**
   * Exposes the subscriber connection for route handlers that need
   * to subscribe to channels.
   */
  getSubscriber(): any {
    return this.subscriber;
  }

  /**
   * Exposes the publisher connection for direct use.
   */
  getPublisher(): any {
    return this.publisher;
  }
}
