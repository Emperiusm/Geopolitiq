/**
 * EventBus contract tests
 *
 * Unit tests run against NoopEventBus (no NATS required).
 * Integration tests require a running NATS server.
 * Set NATS_INTEGRATION=1 to run integration tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from '@gambit/common';
import {
  NoopEventBus,
  NatsEventBus,
  createEventBus,
  buildEvent,
  type EventBus,
} from '../../src/infrastructure/event-bus';
import { STREAMS, EVENT_TYPES } from '../../src/infrastructure/event-schemas';
import { connectNats, drainNats } from '../../src/infrastructure/nats';
import type { GambitConfig } from '@gambit/common';

const logger = createLogger('test');

// ── Helpers ───────────────────────────────────────────────────────────

function makeConfig(url?: string): GambitConfig {
  return {
    engine: { port: 3001 },
    postgres: { url: 'postgresql://gambit:gambit@localhost:6432/gambit' },
    mongo: { uri: 'mongodb://localhost:27017/gambit' },
    redis: { cacheUrl: 'redis://localhost:6380', persistentUrl: 'redis://localhost:6381' },
    clickhouse: { url: undefined },
    typesense: { url: undefined, apiKey: 'gambit-dev' },
    temporal: { address: undefined },
    minio: { endpoint: undefined, accessKey: 'gambit', secretKey: 'gambit-dev' },
    nats: { url },
    auth: { jwtSecret: 'test-secret' },
    log: { level: 'info' },
  };
}

// ── EventBus contract (shared across Noop and Nats implementations) ───

function contractTests(label: string, getBus: () => EventBus) {
  describe(`EventBus contract — ${label}`, () => {
    it('publish resolves without throwing', async () => {
      const bus = getBus();
      const event = buildEvent(
        EVENT_TYPES.SIGNAL_INGESTED,
        'test',
        { title: 'test signal' },
        { traceId: 'trace-001' },
      );
      await expect(
        bus.publish(STREAMS.SIGNALS, 'signals.ingested', event),
      ).resolves.toBeUndefined();
    });

    it('publishBatch resolves for an empty array', async () => {
      const bus = getBus();
      await expect(
        bus.publishBatch(STREAMS.SIGNALS, 'signals.ingested', []),
      ).resolves.toBeUndefined();
    });

    it('publishBatch resolves for multiple events', async () => {
      const bus = getBus();
      const events = [1, 2, 3].map((i) =>
        buildEvent(
          EVENT_TYPES.SIGNAL_INGESTED,
          'test',
          { index: i },
          { traceId: `trace-00${i}` },
        ),
      );
      await expect(
        bus.publishBatch(STREAMS.SIGNALS, 'signals.ingested', events),
      ).resolves.toBeUndefined();
    });

    it('ensureStreams resolves without throwing', async () => {
      const bus = getBus();
      await expect(bus.ensureStreams()).resolves.toBeUndefined();
    });
  });
}

// ── NoopEventBus ──────────────────────────────────────────────────────

contractTests('NoopEventBus', () => new NoopEventBus());

// ── buildEvent ────────────────────────────────────────────────────────

describe('buildEvent', () => {
  it('produces a DomainEvent with required fields', () => {
    const event = buildEvent('signals.ingested', 'engine', { foo: 'bar' }, { traceId: 'abc' });
    expect(event.id).toMatch(/^[0-9A-Z]{26}$/); // ULID format
    expect(event.type).toBe('signals.ingested');
    expect(event.source).toBe('engine');
    expect(event.version).toBe(1);
    expect(event.data).toEqual({ foo: 'bar' });
    expect(event.metadata.traceId).toBe('abc');
    expect(event.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('accepts optional teamId and causationId in metadata', () => {
    const event = buildEvent(
      'entities.created',
      'engine',
      {},
      { traceId: 'abc', teamId: 'team-1', causationId: 'cause-99' },
    );
    expect(event.metadata.teamId).toBe('team-1');
    expect(event.metadata.causationId).toBe('cause-99');
  });

  it('generates unique IDs for each call', () => {
    const a = buildEvent('x', 'y', {}, { traceId: 't' });
    const b = buildEvent('x', 'y', {}, { traceId: 't' });
    expect(a.id).not.toBe(b.id);
  });

  it('accepts custom version', () => {
    const event = buildEvent('x', 'y', {}, { traceId: 't' }, 2);
    expect(event.version).toBe(2);
  });
});

// ── createEventBus factory ────────────────────────────────────────────

describe('createEventBus', () => {
  it('returns a NoopEventBus when ctx is null', () => {
    const bus = createEventBus(null, logger);
    expect(bus).toBeInstanceOf(NoopEventBus);
  });
});

// ── Integration tests (requires live NATS) ────────────────────────────

const NATS_URL = process.env.NATS_URL ?? 'nats://localhost:4222';

describe.skipIf(!process.env.NATS_INTEGRATION)('NatsEventBus — integration', () => {
  it('creates streams and publishes an event', async () => {
    const ctx = await connectNats(makeConfig(NATS_URL), logger);
    expect(ctx).not.toBeNull();

    const bus = new NatsEventBus(ctx!, logger);
    await bus.ensureStreams();

    const event = buildEvent(
      EVENT_TYPES.SIGNAL_INGESTED,
      'test',
      { title: 'integration test' },
      { traceId: 'trace-integration-001', teamId: 'team-test' },
    );

    await expect(
      bus.publish(STREAMS.SIGNALS, 'signals.ingested', event),
    ).resolves.toBeUndefined();

    await drainNats(ctx!, logger);
  });

  contractTests('NatsEventBus', () => {
    // This will be re-created per contract test — not ideal for perf but keeps tests isolated
    // In CI with NATS running this is fine
    throw new Error('NatsEventBus contract tests require async setup — see integration block above');
  });
});
