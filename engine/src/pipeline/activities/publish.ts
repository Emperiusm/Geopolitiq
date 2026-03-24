import { buildEvent } from '../../infrastructure/event-bus';
import { STREAMS, EVENT_TYPES } from '../../infrastructure/event-schemas';
import type { EventBus } from '../../infrastructure/event-bus';
import type { NatsFeatureFlags } from '../../infrastructure/nats-kv';
import type { ResolvedSignal, SourceConfig } from '../types';

// ── Signal ingested event payload ─────────────────────────────────────

interface SignalIngestedData {
  signalId: string;
  entityId: string;
  sourceId: string;
  polarity: string;
  category: string;
  title: string;
}

/**
 * Publish activity — publishes a signal-ingested event.
 *
 * When nats.publish.enabled flag is on: publishes to NATS JetStream (SIGNALS stream).
 * When flag is off (or featureFlags is null): falls back to SSEManager via Redis.
 *
 * Non-critical — errors are caught and logged; pipeline continues.
 */
export async function publishActivity(
  signal: ResolvedSignal,
  source: SourceConfig,
  eventBus?: EventBus,
  featureFlags?: NatsFeatureFlags | null,
): Promise<void> {
  // ── NATS path ──────────────────────────────────────────────────────
  if (eventBus && featureFlags && featureFlags.isEnabled('nats.publish.enabled', true)) {
    const polarity = source.polarity ?? 'behavioral';

    const data: SignalIngestedData = {
      signalId: signal.contentHash,
      entityId: signal.entityId,
      sourceId: source.id,
      polarity,
      category: signal.category,
      title: signal.headline,
    };

    const event = buildEvent<SignalIngestedData>(
      EVENT_TYPES.SIGNAL_INGESTED,
      `pipeline:${source.id}`,
      data,
      {
        traceId: crypto.randomUUID(),
        causationId: source.id,
      },
    );

    try {
      // Publish per-entity subject for ordering guarantees
      await eventBus.publish(STREAMS.SIGNALS, `signals.ingested.${signal.entityId}`, event);
    } catch {
      // Non-critical — NATS publish failure does not block the pipeline
    }

    return;
  }

  // ── SSEManager fallback ────────────────────────────────────────────
  const { SSEManager } = await import('../../events/sse-manager');

  let redis: any = null;

  try {
    const Redis = (await import('ioredis')).default;
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  } catch {
    // Redis unavailable — SSE publish will fail silently (non-critical)
    return;
  }

  const sseManager = new SSEManager(redis);

  try {
    await sseManager.publishSignalIngested(signal, source);
  } finally {
    await sseManager.shutdown().catch(() => {});
  }
}
