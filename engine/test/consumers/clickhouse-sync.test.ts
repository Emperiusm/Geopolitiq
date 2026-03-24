/**
 * ClickHouseSyncConsumer tests
 *
 * All tests use mocked dependencies — no live NATS or ClickHouse required.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createLogger } from '@gambit/common';
import { ClickHouseSyncConsumer } from '../../src/consumers/clickhouse-sync';
import type { ConsumerConfig } from '../../src/consumers/base-consumer';
import { NoopEventBus, buildEvent } from '../../src/infrastructure/event-bus';
import { STREAMS, EVENT_TYPES } from '../../src/infrastructure/event-schemas';
import type { DomainEvent } from '../../src/infrastructure/event-schemas';

const logger = createLogger('test');

// ── Mock helpers ──────────────────────────────────────────────────────

function makeMockNats(): any {
  return {
    nc: {},
    js: { pullSubscribe: vi.fn() },
    jsm: {
      consumers: {
        info: vi.fn().mockResolvedValue({}),
        add: vi.fn().mockResolvedValue({}),
      },
    },
  };
}

function makeConfig(): ConsumerConfig {
  return ClickHouseSyncConsumer.defaultConfig({
    nats: makeMockNats(),
    bus: new NoopEventBus(),
    logger,
    maxRetries: 3,
  });
}

function makeSignalIngestedEvent(overrides: Partial<{
  signalId: string;
  entityId: string;
  sourceId: string;
  polarity: string;
  category: string;
  title: string;
}> = {}): DomainEvent {
  return buildEvent(
    EVENT_TYPES.SIGNAL_INGESTED,
    'test-pipeline',
    {
      signalId: 'sig-001',
      entityId: 'entity-001',
      sourceId: 'source-001',
      polarity: 'behavioral',
      category: 'geopolitics',
      title: 'Test signal title',
      ...overrides,
    },
    { traceId: 'trace-test-001' },
  );
}

function makeClickhouseMock() {
  return {
    insert: vi.fn().mockResolvedValue(undefined),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('ClickHouseSyncConsumer', () => {
  describe('defaultConfig', () => {
    it('sets the correct stream, consumerName, and filterSubject', () => {
      const config = makeConfig();
      expect(config.stream).toBe(STREAMS.SIGNALS);
      expect(config.consumerName).toBe('clickhouse-sync');
      expect(config.filterSubject).toBe('signals.>');
    });

    it('uses large batch settings suitable for ClickHouse', () => {
      const config = makeConfig();
      expect(config.batchSize).toBe(500);
      expect(config.batchWindowMs).toBe(500);
    });
  });

  describe('handleBatch', () => {
    it('inserts signal.ingested events into ClickHouse', async () => {
      const ch = makeClickhouseMock();
      const consumer = new ClickHouseSyncConsumer(makeConfig(), ch as any);
      const event = makeSignalIngestedEvent();

      await consumer.handleBatch([event]);

      expect(ch.insert).toHaveBeenCalledOnce();
      const call = ch.insert.mock.calls[0][0];
      expect(call.table).toBe('signals');
      expect(call.format).toBe('JSONEachRow');
      expect(call.values).toHaveLength(1);
      expect(call.values[0].signal_id).toBe('sig-001');
      expect(call.values[0].entity_id).toBe('entity-001');
    });

    it('maps all expected fields to the row', async () => {
      const ch = makeClickhouseMock();
      const consumer = new ClickHouseSyncConsumer(makeConfig(), ch as any);
      const event = makeSignalIngestedEvent({
        signalId: 'sig-xyz',
        entityId: 'ent-xyz',
        sourceId: 'src-xyz',
        polarity: 'regulatory',
        category: 'sanctions',
        title: 'Sanction applied',
      });

      await consumer.handleBatch([event]);

      const row = ch.insert.mock.calls[0][0].values[0];
      expect(row.signal_id).toBe('sig-xyz');
      expect(row.entity_id).toBe('ent-xyz');
      expect(row.source_id).toBe('src-xyz');
      expect(row.polarity).toBe('regulatory');
      expect(row.category).toBe('sanctions');
      expect(row.title).toBe('Sanction applied');
      expect(row.trace_id).toBe('trace-test-001');
      expect(typeof row.ingested_at).toBe('string');
    });

    it('batches multiple events in a single insert call', async () => {
      const ch = makeClickhouseMock();
      const consumer = new ClickHouseSyncConsumer(makeConfig(), ch as any);
      const events = [
        makeSignalIngestedEvent({ signalId: 'sig-a', entityId: 'ent-a' }),
        makeSignalIngestedEvent({ signalId: 'sig-b', entityId: 'ent-b' }),
        makeSignalIngestedEvent({ signalId: 'sig-c', entityId: 'ent-c' }),
      ];

      await consumer.handleBatch(events);

      expect(ch.insert).toHaveBeenCalledOnce();
      expect(ch.insert.mock.calls[0][0].values).toHaveLength(3);
    });

    it('filters out non-signal.ingested events', async () => {
      const ch = makeClickhouseMock();
      const consumer = new ClickHouseSyncConsumer(makeConfig(), ch as any);

      const signalEvent = makeSignalIngestedEvent();
      const otherEvent = buildEvent(
        EVENT_TYPES.ENTITY_UPDATED,
        'test-pipeline',
        { id: 'ent-001' },
        { traceId: 'trace-002' },
      );

      await consumer.handleBatch([signalEvent, otherEvent]);

      // Only the signal.ingested event should be inserted
      expect(ch.insert).toHaveBeenCalledOnce();
      expect(ch.insert.mock.calls[0][0].values).toHaveLength(1);
    });

    it('skips insert when batch contains only non-signal.ingested events', async () => {
      const ch = makeClickhouseMock();
      const consumer = new ClickHouseSyncConsumer(makeConfig(), ch as any);

      const otherEvent = buildEvent(
        EVENT_TYPES.ENTITY_CREATED,
        'test',
        { id: 'ent-001' },
        { traceId: 'trace-003' },
      );

      await consumer.handleBatch([otherEvent]);

      expect(ch.insert).not.toHaveBeenCalled();
    });

    it('skips gracefully when ClickHouse client is null', async () => {
      const consumer = new ClickHouseSyncConsumer(makeConfig(), null);
      const event = makeSignalIngestedEvent();

      // Should not throw
      await expect(consumer.handleBatch([event])).resolves.toBeUndefined();
    });

    it('skips gracefully on an empty batch', async () => {
      const ch = makeClickhouseMock();
      const consumer = new ClickHouseSyncConsumer(makeConfig(), ch as any);

      await consumer.handleBatch([]);

      expect(ch.insert).not.toHaveBeenCalled();
    });

    it('propagates ClickHouse insert errors (so BaseConsumer can handle retry)', async () => {
      const ch = makeClickhouseMock();
      ch.insert.mockRejectedValue(new Error('ClickHouse unavailable'));
      const consumer = new ClickHouseSyncConsumer(makeConfig(), ch as any);

      await expect(consumer.handleBatch([makeSignalIngestedEvent()])).rejects.toThrow('ClickHouse unavailable');
    });
  });
});
