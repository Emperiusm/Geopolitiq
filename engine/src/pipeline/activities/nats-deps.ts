/**
 * Lazy singleton NATS dependencies for Temporal activity workers.
 *
 * NATS connection is established ONCE per worker process on first call,
 * then reused for all subsequent activity invocations. If NATS is
 * unavailable the functions return null values and callers fall back to
 * the legacy SSE / ClickHouse-direct path.
 */
import type { EventBus } from '../../infrastructure/event-bus';
import type { NatsFeatureFlags } from '../../infrastructure/nats-kv';

let _eventBus: EventBus | null = null;
let _featureFlags: NatsFeatureFlags | null = null;
let _initialized = false;

export async function getNatsDeps(): Promise<{
  eventBus: EventBus | null;
  featureFlags: NatsFeatureFlags | null;
}> {
  if (_initialized) return { eventBus: _eventBus, featureFlags: _featureFlags };
  _initialized = true;

  try {
    const { connectNats } = await import('../../infrastructure/nats');
    const { NatsEventBus } = await import('../../infrastructure/event-bus');
    const { NatsFeatureFlags: FF } = await import('../../infrastructure/nats-kv');
    const { createLogger } = await import('@gambit/common');
    const logger = createLogger('activity-nats');

    const nats = await connectNats(
      { nats: { url: process.env.NATS_URL ?? 'nats://localhost:4222' } },
      logger,
    );

    if (nats) {
      const bus = new NatsEventBus(nats, logger);
      await bus.ensureStreams();
      _eventBus = bus;

      const flags = new FF(nats, logger);
      await flags.init();
      _featureFlags = flags;
    }
  } catch {
    // NATS unavailable — callers will use the legacy fallback path
  }

  return { eventBus: _eventBus, featureFlags: _featureFlags };
}
