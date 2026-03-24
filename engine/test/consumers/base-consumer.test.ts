/**
 * BaseConsumer tests
 *
 * Unit tests use mock NATS objects — no live server required.
 * Integration tests require NATS: set NATS_INTEGRATION=1 to run.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from '@gambit/common';
import { BaseConsumer } from '../../src/consumers/base-consumer';
import type { ConsumerConfig } from '../../src/consumers/base-consumer';
import type { DomainEvent } from '../../src/infrastructure/event-schemas';
import { STREAMS, EVENT_TYPES } from '../../src/infrastructure/event-schemas';
import { NoopEventBus, buildEvent } from '../../src/infrastructure/event-bus';
import { connectNats, drainNats } from '../../src/infrastructure/nats';
import type { GambitConfig } from '@gambit/common';

const logger = createLogger('test');

// ── TestConsumer ──────────────────────────────────────────────────────

/**
 * Minimal concrete subclass used in all tests.
 * Captures handled batches, or throws if `shouldFail` is set.
 */
class TestConsumer extends BaseConsumer {
  public handled: DomainEvent[][] = [];
  public shouldFail = false;
  public failError: Error = new Error('handleBatch test error');

  async handleBatch(events: DomainEvent[]): Promise<void> {
    if (this.shouldFail) {
      throw this.failError;
    }
    this.handled.push(events);
  }
}

// ── Mock NATS helpers ─────────────────────────────────────────────────

function makeMsg(data: unknown): any {
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  return {
    data: encoded,
    subject: 'signals.ingested',
    info: { redeliveryCount: 0 },
    headers: { get: () => null },
    ack: vi.fn(),
    term: vi.fn(),
    nak: vi.fn(),
  };
}

function makeBrokenMsg(): any {
  return {
    data: new TextEncoder().encode('{{not-json{{'),
    subject: 'signals.ingested',
    info: { redeliveryCount: 0 },
    headers: { get: () => null },
    ack: vi.fn(),
    term: vi.fn(),
    nak: vi.fn(),
  };
}

/** Creates a mock JetStream pull subscription that yields one batch of messages, then empty batches */
function makeMockSub(messages: any[]): any {
  let fetchCount = 0;
  return {
    async *[Symbol.asyncIterator]() {
      // Not used directly — fetch() is used
    },
    fetch: vi.fn().mockImplementation(async () => {
      if (fetchCount === 0) {
        fetchCount++;
        // Return an async iterable
        return (async function* () {
          for (const msg of messages) {
            yield msg;
          }
        })();
      }
      // Subsequent fetches: return empty
      return (async function* () {})();
    }),
    unsubscribe: vi.fn(),
  };
}

/** Creates a minimal mock NatsContext */
function makeMockNats(sub: any): any {
  return {
    nc: {},
    js: {
      pullSubscribe: vi.fn().mockResolvedValue(sub),
    },
    jsm: {
      consumers: {
        info: vi.fn().mockResolvedValue({}), // consumer already exists
        add: vi.fn().mockResolvedValue({}),
      },
    },
  };
}

function makeConfig(overrides: Partial<ConsumerConfig> = {}): ConsumerConfig {
  const sub = makeMockSub([]);
  const nats = makeMockNats(sub);
  return {
    nats,
    bus: new NoopEventBus(),
    logger,
    stream: STREAMS.SIGNALS,
    consumerName: 'test-consumer',
    filterSubject: 'signals.ingested',
    batchSize: 10,
    batchWindowMs: 100,
    maxRetries: 3,
    ...overrides,
  };
}

// ── Unit tests ────────────────────────────────────────────────────────

describe('BaseConsumer — unit', () => {
  it('exposes a circuit breaker starting in closed state', () => {
    const consumer = new TestConsumer(makeConfig());
    expect(consumer.getCircuitBreaker().getState()).toBe('closed');
  });

  it('stop() sets running to false (safe to call before start)', () => {
    const consumer = new TestConsumer(makeConfig());
    // Should not throw
    consumer.stop();
    expect(consumer.getCircuitBreaker().getState()).toBe('closed');
  });

  describe('pull loop — success path', () => {
    it('calls handleBatch with parsed DomainEvents', async () => {
      const event = buildEvent(EVENT_TYPES.SIGNAL_INGESTED, 'test', { foo: 1 }, { traceId: 'trace-1' });
      const msg = makeMsg(event);
      const sub = makeMockSub([msg]);
      const nats = makeMockNats(sub);

      const consumer = new TestConsumer(makeConfig({ nats }));

      // Stop after first iteration completes
      const originalHandleBatch = consumer.handleBatch.bind(consumer);
      consumer.handleBatch = async (events) => {
        await originalHandleBatch(events);
        consumer.stop();
      };

      await consumer.start();

      expect(consumer.handled).toHaveLength(1);
      expect(consumer.handled[0]).toHaveLength(1);
      expect(consumer.handled[0][0].id).toBe(event.id);
      expect(consumer.handled[0][0].type).toBe(EVENT_TYPES.SIGNAL_INGESTED);
    });

    it('ACKs all messages on successful handleBatch', async () => {
      const event = buildEvent(EVENT_TYPES.SIGNAL_INGESTED, 'test', {}, { traceId: 't1' });
      const msg1 = makeMsg(event);
      const msg2 = makeMsg({ ...event, id: 'other-id' });
      const sub = makeMockSub([msg1, msg2]);
      const nats = makeMockNats(sub);

      const consumer = new TestConsumer(makeConfig({ nats }));
      consumer.handleBatch = async () => {
        consumer.stop();
      };

      await consumer.start();

      expect(msg1.ack).toHaveBeenCalledOnce();
      expect(msg2.ack).toHaveBeenCalledOnce();
    });

    it('records circuit breaker success after successful batch', async () => {
      const event = buildEvent(EVENT_TYPES.SIGNAL_INGESTED, 'test', {}, { traceId: 't1' });
      const msg = makeMsg(event);
      const sub = makeMockSub([msg]);
      const nats = makeMockNats(sub);

      const consumer = new TestConsumer(makeConfig({ nats }));
      consumer.handleBatch = async () => {
        consumer.stop();
      };

      // Trip the circuit first so we can see it reset
      consumer.getCircuitBreaker().setState('half-open');
      await consumer.start();

      expect(consumer.getCircuitBreaker().getState()).toBe('closed');
    });
  });

  describe('pull loop — parse error path', () => {
    it('term-acks malformed messages without calling handleBatch', async () => {
      const brokenMsg = makeBrokenMsg();
      const sub = makeMockSub([brokenMsg]);
      const nats = makeMockNats(sub);

      let handleBatchCalled = false;
      const consumer = new TestConsumer(makeConfig({ nats }));
      const origHandle = consumer.handleBatch.bind(consumer);
      consumer.handleBatch = async (events) => {
        handleBatchCalled = true;
        return origHandle(events);
      };

      // The consumer will fetch the broken msg, term it, get empty on next fetch, loop.
      // We need a way to stop it after processing — override sub.fetch to stop after 2 calls.
      let fetchCalls = 0;
      sub.fetch = vi.fn().mockImplementation(async () => {
        fetchCalls++;
        if (fetchCalls === 1) {
          return (async function* () { yield brokenMsg; })();
        }
        consumer.stop();
        return (async function* () {})();
      });

      await consumer.start();

      expect(brokenMsg.term).toHaveBeenCalledOnce();
      expect(brokenMsg.ack).not.toHaveBeenCalled();
      expect(handleBatchCalled).toBe(false);
    });

    it('publishes to DLQ on parse error', async () => {
      const publishSpy = vi.fn().mockResolvedValue(undefined);
      const bus = new NoopEventBus();
      bus.publish = publishSpy;

      const brokenMsg = makeBrokenMsg();
      const sub = makeMockSub([brokenMsg]);
      const nats = makeMockNats(sub);

      const consumer = new TestConsumer(makeConfig({ nats, bus }));

      let fetchCalls = 0;
      sub.fetch = vi.fn().mockImplementation(async () => {
        fetchCalls++;
        if (fetchCalls === 1) {
          return (async function* () { yield brokenMsg; })();
        }
        consumer.stop();
        return (async function* () {})();
      });

      await consumer.start();

      expect(publishSpy).toHaveBeenCalledOnce();
      const [streamArg, subjectArg] = publishSpy.mock.calls[0];
      expect(streamArg).toBe(STREAMS.DLQ);
      expect(subjectArg).toBe(`dlq.${STREAMS.SIGNALS}.test-consumer`);
    });
  });

  describe('pull loop — handleBatch error path', () => {
    it('records a circuit breaker failure when handleBatch throws', async () => {
      const event = buildEvent(EVENT_TYPES.SIGNAL_INGESTED, 'test', {}, { traceId: 't1' });
      const msg = makeMsg(event);
      const sub = makeMockSub([msg]);
      const nats = makeMockNats(sub);

      const consumer = new TestConsumer(makeConfig({ nats }));
      consumer.shouldFail = true;

      let fetchCalls = 0;
      sub.fetch = vi.fn().mockImplementation(async () => {
        fetchCalls++;
        if (fetchCalls === 1) {
          return (async function* () { yield msg; })();
        }
        consumer.stop();
        return (async function* () {})();
      });

      await consumer.start();

      expect(consumer.getCircuitBreaker().getConsecutiveFailures()).toBe(1);
    });

    it('does not ACK messages when handleBatch throws', async () => {
      const event = buildEvent(EVENT_TYPES.SIGNAL_INGESTED, 'test', {}, { traceId: 't1' });
      const msg = makeMsg(event);
      const sub = makeMockSub([msg]);
      const nats = makeMockNats(sub);

      const consumer = new TestConsumer(makeConfig({ nats }));
      consumer.shouldFail = true;

      let fetchCalls = 0;
      sub.fetch = vi.fn().mockImplementation(async () => {
        fetchCalls++;
        if (fetchCalls === 1) {
          return (async function* () { yield msg; })();
        }
        consumer.stop();
        return (async function* () {})();
      });

      await consumer.start();

      expect(msg.ack).not.toHaveBeenCalled();
    });

    it('trips the circuit after 5 consecutive handleBatch failures', async () => {
      const consumer = new TestConsumer(makeConfig());
      consumer.shouldFail = true;

      // Manually drive circuit breaker failures
      for (let i = 0; i < 4; i++) {
        consumer.getCircuitBreaker().recordFailure('transient');
        expect(consumer.getCircuitBreaker().getState()).toBe('closed');
      }
      consumer.getCircuitBreaker().recordFailure('transient');
      expect(consumer.getCircuitBreaker().getState()).toBe('open');
    });
  });

  describe('consumer creation', () => {
    it('skips creation when consumer already exists', async () => {
      const sub = makeMockSub([]);
      const nats = makeMockNats(sub);

      // consumer.info resolves → consumer exists
      nats.jsm.consumers.info = vi.fn().mockResolvedValue({});

      const consumer = new TestConsumer(makeConfig({ nats }));

      // Stop via the fetch mock after the creation check has run
      sub.fetch = vi.fn().mockImplementation(async () => {
        consumer.stop();
        return (async function* () {})();
      });

      await consumer.start();

      expect(nats.jsm.consumers.add).not.toHaveBeenCalled();
    });

    it('creates durable consumer when it does not exist', async () => {
      const sub = makeMockSub([]);
      const nats = makeMockNats(sub);

      // Simulate 404 — consumer not found
      nats.jsm.consumers.info = vi.fn().mockRejectedValue(
        Object.assign(new Error('consumer not found'), { code: '404' }),
      );
      nats.jsm.consumers.add = vi.fn().mockResolvedValue({});

      const consumer = new TestConsumer(makeConfig({ nats }));

      // Stop via the fetch mock after the creation check has run
      sub.fetch = vi.fn().mockImplementation(async () => {
        consumer.stop();
        return (async function* () {})();
      });

      await consumer.start();

      expect(nats.jsm.consumers.add).toHaveBeenCalledOnce();
      const [stream, config] = nats.jsm.consumers.add.mock.calls[0];
      expect(stream).toBe(STREAMS.SIGNALS);
      expect(config.durable_name).toBe('test-consumer');
    });
  });
});

// ── Integration tests (require live NATS) ─────────────────────────────

function makeGambitConfig(url?: string): GambitConfig {
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

const NATS_URL = process.env.NATS_URL ?? 'nats://localhost:4222';

describe.skipIf(!process.env.NATS_INTEGRATION)('BaseConsumer — integration', () => {
  it('processes events published to a NATS stream', async () => {
    const { connectNats: conn, drainNats: drain } = await import('../../src/infrastructure/nats');
    const { NatsEventBus } = await import('../../src/infrastructure/event-bus');

    const ctx = await conn(makeGambitConfig(NATS_URL), logger);
    expect(ctx).not.toBeNull();

    const bus = new NatsEventBus(ctx!, logger);
    await bus.ensureStreams();

    const handled: DomainEvent[][] = [];
    const testConsumerName = `test-base-consumer-${Date.now()}`;

    class IntegrationConsumer extends BaseConsumer {
      async handleBatch(events: DomainEvent[]): Promise<void> {
        handled.push(events);
        this.stop();
      }
    }

    const consumer = new IntegrationConsumer({
      nats: ctx!,
      bus,
      logger,
      stream: STREAMS.SIGNALS,
      consumerName: testConsumerName,
      filterSubject: 'signals.ingested',
      batchSize: 10,
      batchWindowMs: 2_000,
      maxRetries: 3,
    });

    // Publish an event before starting (DeliverPolicy.New means we need to start first,
    // but for integration testing we start consumer and then publish)
    const startPromise = consumer.start();

    // Give the consumer a moment to subscribe, then publish
    await new Promise((r) => setTimeout(r, 500));
    const event = buildEvent(
      EVENT_TYPES.SIGNAL_INGESTED,
      'test',
      { title: 'integration test event' },
      { traceId: 'trace-integration-base-consumer', teamId: 'team-test' },
    );
    await bus.publish(STREAMS.SIGNALS, 'signals.ingested', event);

    // Consumer will call stop() after first handled batch
    await Promise.race([
      startPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10_000)),
    ]);

    expect(handled.length).toBeGreaterThan(0);
    expect(handled[0].length).toBeGreaterThan(0);

    await drain(ctx!, logger);
  }, 15_000);

  it('records circuit breaker failure on handleBatch error', async () => {
    const { connectNats: conn, drainNats: drain } = await import('../../src/infrastructure/nats');
    const { NatsEventBus } = await import('../../src/infrastructure/event-bus');

    const ctx = await conn(makeGambitConfig(NATS_URL), logger);
    expect(ctx).not.toBeNull();

    const bus = new NatsEventBus(ctx!, logger);
    await bus.ensureStreams();

    const testConsumerName = `test-base-consumer-fail-${Date.now()}`;
    let callCount = 0;

    class FailingConsumer extends BaseConsumer {
      async handleBatch(_events: DomainEvent[]): Promise<void> {
        callCount++;
        this.stop();
        throw new Error('intentional handleBatch failure');
      }
    }

    const consumer = new FailingConsumer({
      nats: ctx!,
      bus,
      logger,
      stream: STREAMS.SIGNALS,
      consumerName: testConsumerName,
      filterSubject: 'signals.ingested',
      batchSize: 10,
      batchWindowMs: 2_000,
      maxRetries: 3,
    });

    const startPromise = consumer.start();

    await new Promise((r) => setTimeout(r, 500));
    const event = buildEvent(
      EVENT_TYPES.SIGNAL_INGESTED,
      'test',
      { title: 'failure test' },
      { traceId: 'trace-fail-test' },
    );
    await bus.publish(STREAMS.SIGNALS, 'signals.ingested', event);

    await Promise.race([
      startPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10_000)),
    ]);

    expect(callCount).toBeGreaterThan(0);
    expect(consumer.getCircuitBreaker().getConsecutiveFailures()).toBeGreaterThan(0);

    await drain(ctx!, logger);
  }, 15_000);
});
