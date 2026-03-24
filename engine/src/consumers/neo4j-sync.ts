// neo4j-sync.ts — NATS consumer: creates Entity→Signal edges in Neo4j

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

// ── Cypher query ──────────────────────────────────────────────────────

const UPSERT_SIGNAL_EDGES_CYPHER = `
  UNWIND $signals AS s
  MERGE (e:Entity { id: s.entityId })
  MERGE (sig:Signal { id: s.signalId })
    ON CREATE SET
      sig.sourceId  = s.sourceId,
      sig.category  = s.category,
      sig.polarity  = s.polarity,
      sig.title     = s.title,
      sig.createdAt = s.ingestedAt
  MERGE (e)-[r:HAS_SIGNAL]->(sig)
    ON CREATE SET r.createdAt = s.ingestedAt
`.trim();

// ── Neo4jSyncConsumer ─────────────────────────────────────────────────

export class Neo4jSyncConsumer extends BaseConsumer {
  constructor(
    config: ConsumerConfig,
    private readonly neo4jDriver: any | null,
  ) {
    super(config);
  }

  static defaultConfig(
    base: Omit<ConsumerConfig, 'stream' | 'consumerName' | 'filterSubject' | 'batchSize' | 'batchWindowMs'>,
  ): ConsumerConfig {
    return {
      ...base,
      stream: STREAMS.SIGNALS,
      consumerName: 'neo4j-sync',
      filterSubject: 'signals.>',
      batchSize: 50,
      batchWindowMs: 1_000,
    };
  }

  async handleBatch(events: DomainEvent[]): Promise<void> {
    if (!this.neo4jDriver) {
      this.logger.debug('Neo4j driver not available — skipping batch');
      return;
    }

    // Filter to signal.ingested events only
    const ingested = events.filter(
      (e): e is DomainEvent<SignalIngestedData> => e.type === EVENT_TYPES.SIGNAL_INGESTED,
    );

    if (ingested.length === 0) {
      return;
    }

    const signals = ingested.map((e) => ({
      signalId: e.data.signalId,
      entityId: e.data.entityId,
      sourceId: e.data.sourceId,
      category: e.data.category,
      polarity: e.data.polarity,
      title: e.data.title,
      ingestedAt: e.timestamp,
    }));

    const session = this.neo4jDriver.session();
    try {
      await session.executeWrite((tx: any) =>
        tx.run(UPSERT_SIGNAL_EDGES_CYPHER, { signals }),
      );
      this.logger.info({ count: signals.length }, 'Neo4j: Entity→Signal edges upserted');
    } finally {
      await session.close();
    }
  }
}
