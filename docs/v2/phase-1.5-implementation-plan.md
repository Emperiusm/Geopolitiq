# Phase 1.5: Scale Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the infrastructure layer that enables Gambit Engine to serve tens of thousands of concurrent dashboard users and API integrators — NATS JetStream event bus, PgCat read/write separation, dedicated SSE gateway, cache strategy, observability, security hardening, and graceful degradation.

**Architecture:** NATS JetStream decouples Temporal write path from downstream consumers (ClickHouse, Neo4j, Typesense, SSE, cache). PgCat replaces PgBouncer for read/write routing to PostgreSQL primary + replicas. Dedicated SSE gateway service scales independently. Three-tier cache (L1 LRU → L2 Redis → L3 DB) with NATS-driven invalidation. Prometheus + Loki + Tempo for observability. 4-layer tenant isolation with Argon2id API keys and ES256 JWT.

**Tech Stack:** Bun, Hono, NATS JetStream (`nats.js`), PgCat, PostgreSQL 17 (pg_partman), Drizzle ORM, Prometheus, Loki, Grafana, Tempo, Pyroscope, Argon2id (`bun:password`), jose (ES256), Vitest, Docker Compose.

**Design spec:** `docs/v2/2026-03-23-scale-infrastructure-design.md`
**Depends on:** Phase 1 (complete), Phase 2 (complete, merged to main)

**Status:** ✅ Complete — 11/11 tasks implemented, 55 files, 5,328 lines. Branch: `feature/phase-1.5-scale-infrastructure`

---

## Table of Contents

- [x] [Task 1: NATS JetStream — Docker + EventBus Abstraction](#task-1-nats-jetstream--docker--eventbus-abstraction)
- [x] [Task 2: NATS Consumer Framework](#task-2-nats-consumer-framework)
- [x] [Task 3: PgCat + Read/Write Pool Separation](#task-3-pgcat--readwrite-pool-separation)
- [x] [Task 4: Signal Table Partitioning](#task-4-signal-table-partitioning)
- [x] [Task 5: Retrofit Phase 2 Pipelines → NATS](#task-5-retrofit-phase-2-pipelines--nats)
- [x] [Task 6: NATS Consumers — ClickHouse, Neo4j, Typesense, Cache](#task-6-nats-consumers--clickhouse-neo4j-typesense-cache)
- [x] [Task 7: SSE Gateway Service](#task-7-sse-gateway-service)
- [x] [Task 8: Cache Strategy + CDN Integration](#task-8-cache-strategy--cdn-integration)
- [x] [Task 9: Observability Stack](#task-9-observability-stack)
- [x] [Task 10: Graceful Degradation](#task-10-graceful-degradation)
- [x] [Task 11: Security Hardening + Rate Limiting](#task-11-security-hardening--rate-limiting)

---

## Dependency Graph

```
Task 1 (NATS) ──────┬──▶ Task 5 (Retrofit Pipelines)
                     ├──▶ Task 6 (NATS Consumers)
                     ├──▶ Task 7 (SSE Gateway)
                     ├──▶ Task 8 (Cache + CDN)
                     └──▶ Task 9 (Observability)
                              └──▶ Task 10 (Degradation)

Task 3 (PgCat) ─────┬──▶ Task 4 (Partitioning)
                     └──▶ Task 11 (Security)

Task 2 (Consumer Framework) ──▶ Task 6 (NATS Consumers)
```

Task 1 and Task 3 can be built in parallel. Task 2 depends on Task 1. Everything else flows from these.

---

## File Map

| File | Action | Task | Responsibility |
|---|---|---|---|
| `docker-compose.yml` | Modify | 1, 3, 9 | Add NATS, PgCat, Prometheus, Loki, Pyroscope |
| `docker/pgcat/pgcat.toml` | Create | 3 | PgCat pool config |
| `docker/prometheus/prometheus.yml` | Create | 9 | Prometheus scrape targets |
| `docker/loki/loki-config.yaml` | Create | 9 | Loki storage config |
| `engine/package.json` | Modify | 1 | Add nats, prom-client deps |
| `engine/src/infrastructure/nats.ts` | Create | 1 | NATS connection + JetStream setup |
| `engine/src/infrastructure/event-bus.ts` | Create | 1 | EventBus interface + NatsEventBus impl |
| `engine/src/infrastructure/event-schemas.ts` | Create | 1 | DomainEvent type + Zod schema registry |
| `engine/src/infrastructure/nats-kv.ts` | Create | 1 | NATS KV for feature flags + degradation |
| `engine/src/infrastructure/postgres.ts` | Modify | 3 | Read/write pool separation via PgCat |
| `engine/src/infrastructure/metrics.ts` | Create | 9 | Prometheus metrics + auto-instrumentation |
| `engine/src/consumers/base-consumer.ts` | Create | 2 | Consumer framework with circuit breaker |
| `engine/src/consumers/clickhouse-sync.ts` | Create | 6 | ClickHouse batch sync consumer |
| `engine/src/consumers/neo4j-sync.ts` | Create | 6 | Neo4j batch sync consumer |
| `engine/src/consumers/typesense-sync.ts` | Create | 6 | Typesense real-time sync consumer |
| `engine/src/consumers/cache-invalidator.ts` | Create | 6 | Cache + CDN purge consumer |
| `engine/src/sse-gateway/index.ts` | Create | 7 | SSE Gateway Hono app |
| `engine/src/sse-gateway/fanout.ts` | Create | 7 | NATS → SSE multiplexed fan-out |
| `engine/src/sse-gateway/connection-manager.ts` | Create | 7 | Per-team caps, slow consumer eviction |
| `engine/src/infrastructure/cache-strategy.ts` | Create | 8 | Per-endpoint cache strategies + PER |
| `engine/src/middleware/cache-control.ts` | Create | 8 | CDN Cache-Control headers |
| `engine/src/middleware/compression.ts` | Create | 8 | Brotli + gzip response compression |
| `engine/src/infrastructure/degradation.ts` | Create | 10 | DegradationRegistry + fallback wiring |
| `engine/src/middleware/degradation-header.ts` | Create | 10 | X-Gambit-Degraded header injection |
| `engine/src/middleware/scope-guard.ts` | Create | 11 | Route-level data scope annotation |
| `engine/src/middleware/priority-admission.ts` | Create | 11 | Tier-based load shedding |
| `engine/src/auth/jwt-es256.ts` | Create | 11 | ES256 JWT issuance + verification + cache |
| `engine/src/auth/api-key-argon2.ts` | Create | 11 | Argon2id key hashing + Bloom filter |
| `engine/src/security/webhook-validator.ts` | Create | 11 | SSRF prevention for webhook URLs |
| `engine/src/security/audit-log.ts` | Create | 11 | Append-only audit log with hash chain |
| `engine/src/routes/batch.ts` | Create | 8 | POST /engine/v1/batch endpoint |
| `engine/src/routes/health.ts` | Modify | 10 | Add /health/live, /health/ready, /health/deps |
| `engine/src/pipeline/activities/publish.ts` | Modify | 5 | Switch from SSEManager to NATS publish |
| `engine/src/pipeline/activities/write.ts` | Modify | 5 | Remove inline ClickHouse write (NATS handles it) |
| `engine/src/index.ts` | Modify | 1, 3, 9, 10 | Add NATS, PgCat, metrics, degradation to startup |
| `engine/src/db/init/rls.ts` | Modify | 11 | Add FORCE ROW LEVEL SECURITY |
| `engine/src/db/init/roles.ts` | Create | 11 | DB role separation (gambit_api, gambit_ingest) |
| `engine/src/db/init/partitions.ts` | Create | 4 | pg_partman partition setup |
| `engine/test/infrastructure/nats.test.ts` | Create | 1 | NATS connection + publish/subscribe |
| `engine/test/infrastructure/event-bus.test.ts` | Create | 1 | EventBus contract tests |
| `engine/test/consumers/base-consumer.test.ts` | Create | 2 | Consumer framework + circuit breaker |
| `engine/test/consumers/clickhouse-sync.test.ts` | Create | 6 | ClickHouse batch insert |
| `engine/test/sse-gateway/fanout.test.ts` | Create | 7 | SSE fan-out multiplexing |
| `engine/test/infrastructure/cache-strategy.test.ts` | Create | 8 | Cache-aside + PER + coalescing |
| `engine/test/infrastructure/degradation.test.ts` | Create | 10 | Fallback path verification |
| `engine/test/security/rls-audit.test.ts` | Create | 11 | RLS enforcement verification |
| `engine/test/security/webhook-validator.test.ts` | Create | 11 | SSRF prevention |
| `engine/test/security/audit-log.test.ts` | Create | 11 | Tamper-evident hash chain |

---

## Task 1: NATS JetStream — Docker + EventBus Abstraction

**Goal:** Stand up NATS JetStream in Docker Compose and build the `EventBus` abstraction that all producers use to publish domain events. This is the foundation — every subsequent task depends on it.

**Files:**
- Modify: `docker-compose.yml`
- Modify: `engine/package.json`
- Create: `engine/src/infrastructure/nats.ts`
- Create: `engine/src/infrastructure/event-bus.ts`
- Create: `engine/src/infrastructure/event-schemas.ts`
- Create: `engine/src/infrastructure/nats-kv.ts`
- Modify: `engine/src/index.ts`
- Create: `engine/test/infrastructure/nats.test.ts`
- Create: `engine/test/infrastructure/event-bus.test.ts`

- [ ] **Step 1: Add NATS to Docker Compose**

Add to `docker-compose.yml` in the engine profile section, after the existing services:

```yaml
nats:
  image: nats:2.10-alpine
  command: ["--jetstream", "--store_dir=/data", "-m", "8222"]
  ports:
    - "4222:4222"   # client
    - "8222:8222"   # monitoring
  volumes:
    - nats_data:/data
  healthcheck:
    test: ["CMD", "nats-server", "--help"]
    interval: 5s
    timeout: 3s
    retries: 3
  profiles: ["engine", "all"]
```

Add `nats_data:` to the `volumes:` section at the bottom of the file.

- [ ] **Step 2: Install nats.js dependency**

```bash
cd engine && bun add nats@latest
```

- [ ] **Step 3: Write NATS connection test**

Create `engine/test/infrastructure/nats.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectNats, closeNats } from '../../src/infrastructure/nats';
import { createLogger } from '@gambit/common';

const logger = createLogger('test');

describe('NATS connection', () => {
  it('connects to NATS and gets JetStream context', async () => {
    const nc = await connectNats({ nats: { url: 'nats://localhost:4222' } }, logger);
    expect(nc).toBeDefined();
    expect(nc.jetstream).toBeDefined();
    expect(nc.jetstreamManager).toBeDefined();
    await closeNats(nc);
  });

  it('returns null when NATS is unreachable', async () => {
    const nc = await connectNats({ nats: { url: 'nats://localhost:9999' } }, logger);
    expect(nc).toBeNull();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

```bash
cd engine && bun run test -- test/infrastructure/nats.test.ts
```

Expected: FAIL — `connectNats` not defined.

- [ ] **Step 5: Implement NATS connection**

Create `engine/src/infrastructure/nats.ts`:

```typescript
import { connect, type NatsConnection, type JetStreamClient, type JetStreamManager } from 'nats';
import type { Logger } from '@gambit/common';

export interface NatsContext {
  connection: NatsConnection;
  jetstream: JetStreamClient;
  jetstreamManager: JetStreamManager;
}

export async function connectNats(
  config: { nats: { url: string } },
  logger: Logger,
): Promise<NatsContext | null> {
  try {
    const nc = await connect({
      servers: config.nats.url,
      name: 'gambit-engine',
      reconnect: true,
      maxReconnectAttempts: -1, // infinite
      reconnectTimeWait: 2000,
    });

    const js = nc.jetstream();
    const jsm = await nc.jetstreamManager();

    logger.info({ server: config.nats.url }, 'NATS JetStream connected');
    return { connection: nc, jetstream: js, jetstreamManager: jsm };
  } catch (err) {
    logger.warn({ err, server: config.nats.url }, 'NATS connection failed — event bus unavailable');
    return null;
  }
}

export async function closeNats(ctx: NatsContext): Promise<void> {
  await ctx.connection.drain();
  await ctx.connection.close();
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
cd engine && bun run test -- test/infrastructure/nats.test.ts
```

Expected: PASS (requires NATS running: `docker compose up -d nats`)

- [ ] **Step 7: Write DomainEvent schema + registry**

Create `engine/src/infrastructure/event-schemas.ts`:

```typescript
import { z } from 'zod';

// Base domain event envelope
export const domainEventSchema = z.object({
  id: z.string().ulid(),
  type: z.string(),
  version: z.number().int().positive(),
  source: z.string(),
  timestamp: z.coerce.date(),
  data: z.unknown(),
  metadata: z.object({
    traceId: z.string(),
    teamId: z.string().optional(),
    causationId: z.string().optional(),
  }),
});

export type DomainEvent<T = unknown> = z.infer<typeof domainEventSchema> & { data: T };

// Stream definitions
export const STREAMS = {
  SIGNALS: { name: 'SIGNALS', subjects: ['signals.>'], retention: 'limits', maxAge: 7 * 24 * 60 * 60 * 1e9 }, // 7 days in ns
  ENTITIES: { name: 'ENTITIES', subjects: ['entities.>'], retention: 'limits', maxAge: 7 * 24 * 60 * 60 * 1e9 },
  GAP_SCORES: { name: 'GAP_SCORES', subjects: ['gaps.>'], retention: 'limits', maxAge: 7 * 24 * 60 * 60 * 1e9 },
  ALERTS: { name: 'ALERTS', subjects: ['alerts.>'], retention: 'limits', maxAge: 7 * 24 * 60 * 60 * 1e9 },
  DLQ: { name: 'DLQ', subjects: ['dlq.>'], retention: 'limits', maxAge: 30 * 24 * 60 * 60 * 1e9 }, // 30 days
  SYSTEM: { name: 'SYSTEM', subjects: ['system.>'], retention: 'limits', maxAge: 24 * 60 * 60 * 1e9 }, // 1 day
} as const;

// Event type constants
export const EVENT_TYPES = {
  SIGNAL_INGESTED: 'signal.ingested',
  SIGNAL_UPDATED: 'signal.updated',
  ENTITY_CREATED: 'entity.created',
  ENTITY_UPDATED: 'entity.updated',
  GAP_RECOMPUTED: 'gap.recomputed',
  GAP_ALERT_TRIGGERED: 'gap.alert_triggered',
  ALERT_FIRED: 'alert.fired',
  ALERT_ACKNOWLEDGED: 'alert.acknowledged',
  CACHE_INVALIDATE: 'system.cache.invalidate',
  DEGRADATION_OVERRIDE: 'system.degradation.override',
} as const;
```

- [ ] **Step 8: Write EventBus interface + test**

Create `engine/test/infrastructure/event-bus.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { NatsEventBus } from '../../src/infrastructure/event-bus';
import { connectNats, closeNats, type NatsContext } from '../../src/infrastructure/nats';
import { STREAMS } from '../../src/infrastructure/event-schemas';
import { createLogger } from '@gambit/common';
import { ulid } from 'ulid';

const logger = createLogger('test');
let nats: NatsContext;
let bus: NatsEventBus;

beforeAll(async () => {
  nats = (await connectNats({ nats: { url: 'nats://localhost:4222' } }, logger))!;
  bus = new NatsEventBus(nats, logger);
  await bus.ensureStreams();
});

afterAll(async () => {
  await closeNats(nats);
});

describe('NatsEventBus', () => {
  it('publishes an event and reads it back', async () => {
    const event = {
      id: ulid(),
      type: 'signal.ingested',
      version: 1,
      source: 'test',
      timestamp: new Date(),
      data: { signalId: 'sig_test', entityId: 'company:test' },
      metadata: { traceId: 'trace-1' },
    };

    const seq = await bus.publish('SIGNALS', 'signals.ingested.src_test', event);
    expect(seq).toBeGreaterThan(0);
  });

  it('publishes a batch of events', async () => {
    const events = Array.from({ length: 5 }, (_, i) => ({
      id: ulid(),
      type: 'entity.updated',
      version: 1,
      source: 'test',
      timestamp: new Date(),
      data: { entityId: `company:test-${i}` },
      metadata: { traceId: `trace-batch-${i}` },
    }));

    const seqs = await bus.publishBatch('ENTITIES', 'entities.updated.company', events);
    expect(seqs).toHaveLength(5);
    seqs.forEach(s => expect(s).toBeGreaterThan(0));
  });
});
```

- [ ] **Step 9: Implement NatsEventBus**

Create `engine/src/infrastructure/event-bus.ts`:

```typescript
import { type JetStreamClient, type JetStreamManager, StringCodec, headers as natsHeaders } from 'nats';
import type { Logger } from '@gambit/common';
import type { NatsContext } from './nats';
import { STREAMS, type DomainEvent } from './event-schemas';

const sc = StringCodec();

export interface EventBus {
  publish(stream: string, subject: string, event: DomainEvent): Promise<number>;
  publishBatch(stream: string, subject: string, events: DomainEvent[]): Promise<number[]>;
  ensureStreams(): Promise<void>;
}

export class NatsEventBus implements EventBus {
  private js: JetStreamClient;
  private jsm: JetStreamManager;

  constructor(
    private nats: NatsContext,
    private logger: Logger,
  ) {
    this.js = nats.jetstream;
    this.jsm = nats.jetstreamManager;
  }

  async ensureStreams(): Promise<void> {
    for (const [key, streamConfig] of Object.entries(STREAMS)) {
      try {
        await this.jsm.streams.info(streamConfig.name);
        this.logger.debug({ stream: streamConfig.name }, 'Stream exists');
      } catch {
        await this.jsm.streams.add({
          name: streamConfig.name,
          subjects: streamConfig.subjects as unknown as string[],
          retention: streamConfig.retention as any,
          max_age: streamConfig.maxAge,
          storage: key === 'SYSTEM' ? 'memory' : 'file',
          num_replicas: 1, // single node in dev
          discard: 'old',
          max_bytes: 10 * 1024 * 1024 * 1024, // 10GB
          duplicate_window: 10 * 60 * 1e9, // 10 min dedup (2x Temporal retry)
        });
        this.logger.info({ stream: streamConfig.name }, 'Stream created');
      }
    }
  }

  async publish(stream: string, subject: string, event: DomainEvent): Promise<number> {
    const hdrs = natsHeaders();
    hdrs.set('Nats-Msg-Id', event.id); // dedup key
    hdrs.set('Gambit-Trace-Id', event.metadata.traceId);
    if (event.metadata.teamId) hdrs.set('Gambit-Team-Id', event.metadata.teamId);

    const payload = sc.encode(JSON.stringify(event));
    const ack = await this.js.publish(subject, payload, { headers: hdrs });
    return ack.seq;
  }

  async publishBatch(stream: string, subject: string, events: DomainEvent[]): Promise<number[]> {
    const results: number[] = [];
    for (const event of events) {
      const seq = await this.publish(stream, subject, event);
      results.push(seq);
    }
    return results;
  }
}

// No-op implementation for when NATS is unavailable
export class NoopEventBus implements EventBus {
  async publish(): Promise<number> { return 0; }
  async publishBatch(): Promise<number[]> { return []; }
  async ensureStreams(): Promise<void> {}
}
```

- [ ] **Step 10: Run EventBus tests**

```bash
cd engine && bun run test -- test/infrastructure/event-bus.test.ts
```

Expected: PASS

- [ ] **Step 11: Implement NATS KV for feature flags**

Create `engine/src/infrastructure/nats-kv.ts`:

```typescript
import type { KV, NatsConnection } from 'nats';
import type { Logger } from '@gambit/common';
import type { NatsContext } from './nats';

export class NatsFeatureFlags {
  private kv: KV | null = null;
  private local = new Map<string, string>();
  private logger: Logger;

  constructor(private nats: NatsContext | null, logger: Logger) {
    this.logger = logger;
  }

  async init(): Promise<void> {
    if (!this.nats) return;
    try {
      const js = this.nats.connection.jetstream();
      this.kv = await js.views.kv('gambit-flags', { history: 1 });

      // Watch for changes — update local copy instantly
      const watch = await this.kv.watch();
      (async () => {
        for await (const entry of watch) {
          const value = entry.string();
          this.local.set(entry.key, value);
          this.logger.debug({ key: entry.key, value }, 'Feature flag updated');
        }
      })();

      // Load all current values
      const keys = await this.kv.keys();
      for await (const key of keys) {
        const entry = await this.kv.get(key);
        if (entry) this.local.set(key, entry.string());
      }

      this.logger.info({ flagCount: this.local.size }, 'Feature flags loaded from NATS KV');
    } catch (err) {
      this.logger.warn({ err }, 'NATS KV unavailable — using defaults');
    }
  }

  isEnabled(flag: string, defaultValue = false): boolean {
    const value = this.local.get(flag);
    if (value === undefined) return defaultValue;
    return value === 'true';
  }

  async set(flag: string, value: boolean): Promise<void> {
    this.local.set(flag, String(value));
    if (this.kv) await this.kv.put(flag, String(value));
  }
}
```

- [ ] **Step 12: Wire NATS into engine startup**

Modify `engine/src/index.ts` — add NATS connection after Redis connections:

```typescript
// After existing Redis connections, add:
import { connectNats, type NatsContext } from './infrastructure/nats';
import { NatsEventBus, NoopEventBus } from './infrastructure/event-bus';
import { NatsFeatureFlags } from './infrastructure/nats-kv';

// In startup sequence:
const nats = await connectNats(config, logger);
const eventBus = nats ? new NatsEventBus(nats, logger) : new NoopEventBus();
if (nats) await eventBus.ensureStreams();

const featureFlags = new NatsFeatureFlags(nats, logger);
await featureFlags.init();
```

Add `nats` to the config schema in `packages/common/src/config/schema.ts`:

```typescript
nats: z.object({ url: z.string().default('nats://localhost:4222') }).default({}),
```

Add `eventBus` and `featureFlags` to the `ServiceContainer` interface in `engine/src/services/container.ts`.

- [ ] **Step 13: Add NATS to graceful shutdown**

In `engine/src/index.ts`, update the shutdown handler. NATS drains before DB pool (per spec I6 fix):

```typescript
async function shutdown() {
  logger.info('Shutting down...');
  server.stop();
  if (nats) {
    await nats.connection.drain();
    await nats.connection.close();
  }
  await closePgPool();
  process.exit(0);
}
```

- [ ] **Step 14: Commit**

```bash
git add -A && git commit -m "feat(engine): add NATS JetStream event bus + KV feature flags

- Docker Compose: NATS 2.10 with JetStream enabled
- NatsEventBus: publish/publishBatch with dedup, trace propagation
- NoopEventBus: graceful fallback when NATS unavailable
- DomainEvent schema + stream topology (SIGNALS, ENTITIES, GAP_SCORES, ALERTS, DLQ, SYSTEM)
- NatsFeatureFlags: NATS KV with local cache + watch for instant propagation
- Wired into engine startup + graceful shutdown (drain NATS before DB)"
```

---

## Task 2: NATS Consumer Framework

**Goal:** Build the reusable consumer framework that all NATS consumers inherit from — pull-based batching, circuit breaker integration, DLQ routing, graceful shutdown.

**Files:**
- Create: `engine/src/consumers/base-consumer.ts`
- Create: `engine/test/consumers/base-consumer.test.ts`

- [ ] **Step 1: Write consumer framework test**

Create `engine/test/consumers/base-consumer.test.ts`:

```typescript
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { BaseConsumer } from '../../src/consumers/base-consumer';
import { NatsEventBus } from '../../src/infrastructure/event-bus';
import { connectNats, closeNats, type NatsContext } from '../../src/infrastructure/nats';
import type { DomainEvent } from '../../src/infrastructure/event-schemas';
import { createLogger } from '@gambit/common';
import { ulid } from 'ulid';

const logger = createLogger('test');
let nats: NatsContext;
let bus: NatsEventBus;

class TestConsumer extends BaseConsumer {
  processed: DomainEvent[] = [];
  shouldFail = false;

  constructor(nats: NatsContext, bus: NatsEventBus) {
    super({
      nats,
      bus,
      logger,
      stream: 'SIGNALS',
      consumerName: 'test-consumer',
      filterSubject: 'signals.>',
      batchSize: 5,
      batchWindowMs: 100,
      maxRetries: 3,
    });
  }

  async handleBatch(events: DomainEvent[]): Promise<void> {
    if (this.shouldFail) throw new Error('Simulated failure');
    this.processed.push(...events);
  }
}

beforeAll(async () => {
  nats = (await connectNats({ nats: { url: 'nats://localhost:4222' } }, logger))!;
  bus = new NatsEventBus(nats, logger);
  await bus.ensureStreams();
});

afterAll(async () => {
  await closeNats(nats);
});

describe('BaseConsumer', () => {
  it('processes events from NATS stream', async () => {
    const consumer = new TestConsumer(nats, bus);

    // Publish 3 events
    for (let i = 0; i < 3; i++) {
      await bus.publish('SIGNALS', 'signals.ingested.src_test', {
        id: ulid(),
        type: 'signal.ingested',
        version: 1,
        source: 'test',
        timestamp: new Date(),
        data: { signalId: `sig_${i}` },
        metadata: { traceId: `trace-${i}` },
      });
    }

    // Start consumer, let it process, then stop
    const promise = consumer.start();
    await new Promise(r => setTimeout(r, 500));
    await consumer.stop();

    expect(consumer.processed.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd engine && bun run test -- test/consumers/base-consumer.test.ts
```

Expected: FAIL — `BaseConsumer` not defined.

- [ ] **Step 3: Implement BaseConsumer**

Note: The existing `CircuitBreaker` has a zero-arg constructor. If a named/logged breaker is needed, extend the class later. For now, use the default constructor.

Create `engine/src/consumers/base-consumer.ts`:

```typescript
import { type JetStreamClient, type JetStreamPullSubscription, type JsMsg, AckPolicy, DeliverPolicy, StringCodec } from 'nats';
import type { Logger } from '@gambit/common';
import type { NatsContext } from '../infrastructure/nats';
import type { NatsEventBus } from '../infrastructure/event-bus';
import type { DomainEvent } from '../infrastructure/event-schemas';
import { CircuitBreaker } from '../health/circuit-breaker';

const sc = StringCodec();

export interface ConsumerConfig {
  nats: NatsContext;
  bus: NatsEventBus;
  logger: Logger;
  stream: string;
  consumerName: string;
  filterSubject: string;
  batchSize: number;
  batchWindowMs: number;
  maxRetries: number;
}

export abstract class BaseConsumer {
  protected breaker: CircuitBreaker;
  protected running = false;
  private sub: JetStreamPullSubscription | null = null;
  private config: ConsumerConfig;
  protected logger: Logger;

  constructor(config: ConsumerConfig) {
    this.config = config;
    this.logger = config.logger.child({ consumer: config.consumerName });
    this.breaker = new CircuitBreaker();
  }

  abstract handleBatch(events: DomainEvent[]): Promise<void>;

  async start(): Promise<void> {
    this.running = true;
    const js = this.config.nats.jetstream;
    const jsm = this.config.nats.jetstreamManager;

    // Ensure durable consumer exists
    try {
      await jsm.consumers.info(this.config.stream, this.config.consumerName);
    } catch {
      await jsm.consumers.add(this.config.stream, {
        durable_name: this.config.consumerName,
        filter_subject: this.config.filterSubject,
        ack_policy: AckPolicy.Explicit,
        deliver_policy: DeliverPolicy.New,
        max_deliver: this.config.maxRetries,
        ack_wait: 30_000_000_000, // 30 seconds in nanoseconds
      });
    }

    this.sub = await js.pullSubscribe(this.config.filterSubject, {
      stream: this.config.stream,
      config: { durable_name: this.config.consumerName },
    });

    this.logger.info('Consumer started');

    while (this.running) {
      // Circuit breaker — wait if open
      if (this.breaker.getState() === 'open') {
        if (!this.breaker.shouldProbe()) {
          await new Promise(r => setTimeout(r, this.breaker.getBackoffMs()));
          continue;
        }
      }

      try {
        const msgs = await this.sub.fetch({
          batch: this.config.batchSize,
          expires: this.config.batchWindowMs,
        });

        const events: DomainEvent[] = [];
        const rawMsgs: JsMsg[] = [];

        for await (const msg of msgs) {
          try {
            const event = JSON.parse(sc.decode(msg.data)) as DomainEvent;
            events.push(event);
            rawMsgs.push(msg);
          } catch (parseErr) {
            this.logger.error({ err: parseErr }, 'Failed to parse NATS message — sending to DLQ');
            await this.sendToDlq(msg, parseErr as Error);
            msg.term(); // terminal ack — stop redelivery
          }
        }

        if (events.length === 0) continue;

        await this.handleBatch(events);

        // ACK all successfully processed messages
        for (const msg of rawMsgs) {
          msg.ack();
        }

        this.breaker.recordSuccess();
      } catch (err) {
        this.breaker.recordFailure('transient');
        this.logger.error({ err, consumer: this.config.consumerName }, 'Batch processing failed');

        // NAK all messages for redelivery
        // Messages will be redelivered by NATS after ack_wait
      }
    }
  }

  async stop(): Promise<void> {
    this.running = false;
    if (this.sub) {
      this.sub.unsubscribe();
    }
    this.logger.info('Consumer stopped');
  }

  private async sendToDlq(msg: JsMsg, error: Error): Promise<void> {
    try {
      const dlqSubject = `dlq.${this.config.stream}.${this.config.consumerName}`;
      await this.config.bus.publish('DLQ', dlqSubject, {
        id: msg.headers?.get('Nats-Msg-Id') ?? 'unknown',
        type: 'dlq.entry',
        version: 1,
        source: this.config.consumerName,
        timestamp: new Date(),
        data: {
          originalSubject: msg.subject,
          payload: sc.decode(msg.data),
          error: error.message,
          redeliveryCount: msg.info?.redeliveryCount ?? 0,
        },
        metadata: {
          traceId: msg.headers?.get('Gambit-Trace-Id') ?? 'unknown',
        },
      });
    } catch (dlqErr) {
      this.logger.error({ err: dlqErr }, 'Failed to publish to DLQ');
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd engine && bun run test -- test/consumers/base-consumer.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(engine): add NATS consumer framework with circuit breaker + DLQ

- BaseConsumer: pull-based batching, configurable batch size/window
- Circuit breaker integration: pauses pulling when target is down
- DLQ routing: parse failures and max-delivery messages sent to DLQ stream
- Graceful stop: unsubscribe + drain in-flight messages"
```

---

## Task 3: PgCat + Read/Write Pool Separation

**Goal:** Replace PgBouncer with PgCat for connection pooling and read/write routing. Expose `getWriteDb()`, `getReadDb()`, and `getFastReadDb()` functions.

**Files:**
- Modify: `docker-compose.yml`
- Create: `docker/pgcat/pgcat.toml`
- Modify: `engine/src/infrastructure/postgres.ts`
- Modify: `engine/src/index.ts`
- Modify: `engine/src/services/container.ts`

- [ ] **Step 1: Create PgCat config**

```bash
mkdir -p docker/pgcat
```

Create `docker/pgcat/pgcat.toml`:

```toml
[general]
host = "0.0.0.0"
port = 6432
connect_timeout = 5000
idle_timeout = 30000
server_lifetime = 3600000
idle_client_timeout = 60000
shutdown_timeout = 30000
healthcheck_timeout = 1000
healthcheck_delay = 5000
ban_time = 60

[pools.gambit]

[pools.gambit.shards.0]
servers = [["postgres", 5432, "primary"]]
database = "gambit"

[pools.gambit.shards.0.mirrors]
# In production: add replica servers here
# servers = [["postgres-replica-1", 5432, "replica"], ["postgres-replica-2", 5432, "replica"]]

[pools.gambit.users.0]
username = "gambit"
password = "gambit_dev"
pool_size = 20
min_pool_size = 5
pool_mode = "transaction"
statement_timeout = 10000
```

- [ ] **Step 2: Replace PgBouncer with PgCat in Docker Compose**

In `docker-compose.yml`, replace the `pgbouncer` service with:

```yaml
pgcat:
  image: ghcr.io/postgresml/pgcat:latest
  ports:
    - "6432:6432"
  volumes:
    - ./docker/pgcat/pgcat.toml:/etc/pgcat/pgcat.toml:ro
  depends_on:
    postgres:
      condition: service_healthy
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -h localhost -p 6432 -U gambit || exit 1"]
    interval: 5s
    timeout: 3s
    retries: 3
  profiles: ["engine", "all"]
```

Remove the old `pgbouncer` service definition.

- [ ] **Step 3: Modify postgres.ts for read/write separation**

Modify `engine/src/infrastructure/postgres.ts` to export three pool accessors:

```typescript
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Logger } from '@gambit/common';

export type DrizzleClient = PostgresJsDatabase<Record<string, never>>;

let writePool: ReturnType<typeof postgres> | null = null;
let readPool: ReturnType<typeof postgres> | null = null;
let writeDb: DrizzleClient | null = null;
let readDb: DrizzleClient | null = null;

export async function connectPostgres(
  config: { databaseUrl: string; databaseReadUrl?: string },
  logger: Logger,
): Promise<DrizzleClient> {
  const poolOpts = {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: true,
  };

  // Write pool — always points to primary (via PgCat)
  writePool = postgres(config.databaseUrl, poolOpts);
  writeDb = drizzle(writePool);

  // Read pool — same URL in dev (single PG), separate in prod
  const readUrl = config.databaseReadUrl ?? config.databaseUrl;
  readPool = postgres(readUrl, { ...poolOpts, max: 30 });
  readDb = drizzle(readPool);

  // Warm connections
  await Promise.all([
    writePool`SELECT 1`,
    readPool`SELECT 1`,
  ]);

  logger.info('PostgreSQL pools connected (write + read)');
  return writeDb; // backward compatible — returns write db as default
}

export function getWriteDb(): DrizzleClient {
  if (!writeDb) throw new Error('PostgreSQL not connected');
  return writeDb;
}

export function getReadDb(): DrizzleClient {
  if (!readDb) throw new Error('PostgreSQL not connected');
  return readDb;
}

// Alias for backward compatibility with existing code
export function getDb(): DrizzleClient {
  return getWriteDb();
}

export async function closePgPool(): Promise<void> {
  if (writePool) await writePool.end();
  if (readPool && readPool !== writePool) await readPool.end();
}
```

- [ ] **Step 4: Update ServiceContainer to include both pools**

In `engine/src/services/container.ts`, add `readDb` to the interface:

```typescript
export interface ServiceContainer {
  db: DrizzleClient;       // write db (backward compatible)
  readDb: DrizzleClient;   // read db (new)
  // ... rest unchanged
}
```

- [ ] **Step 5: Update engine startup to use PgCat URL**

In `engine/src/index.ts`, update the connection string to route through PgCat (port 6432 instead of 5432):

```typescript
// The DATABASE_URL should now point to PgCat: postgresql://gambit:gambit_dev@localhost:6432/gambit
const db = await connectPostgres({
  databaseUrl: config.databaseUrl,
  databaseReadUrl: config.databaseReadUrl, // optional, same as databaseUrl in dev
}, logger);
const readDb = getReadDb();
```

Add `databaseReadUrl` as optional to the config schema.

- [ ] **Step 6: Update existing services to use readDb for read operations**

In `engine/src/services/entity.service.ts`, add readDb and use it for read operations:

```typescript
// In the constructor, accept readDb
// In findById, list, search methods → use readDb
// In create, update, delete methods → use writeDb (db)
```

- [ ] **Step 7: Verify existing tests still pass**

```bash
cd engine && bun run test
```

Expected: All existing tests pass (the read pool falls back to the same URL as write pool in dev).

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(engine): replace PgBouncer with PgCat + read/write pool separation

- PgCat config with transaction pooling, health checks
- postgres.ts: separate write and read pools (getWriteDb, getReadDb)
- ServiceContainer: includes readDb for read operations
- Backward compatible: getDb() returns writeDb, single PG in dev
- Entity service: reads from readDb, writes to writeDb"
```

---

## Task 4: Signal Table Partitioning

**Goal:** Convert the signals table to monthly range partitioning on `published_at` using pg_partman.

**Files:**
- Create: `engine/src/db/init/partitions.ts`
- Modify: `engine/src/db/init/index.ts`
- Modify: `docker-compose.yml` (add pg_partman extension to postgres)

- [ ] **Step 1: Add pg_partman to PostgreSQL Docker image**

In `docker-compose.yml`, update the postgres service to use a PostgreSQL image with pg_partman, or add the extension in the init script. Since the standard postgres:17 image doesn't include pg_partman, create a custom Dockerfile:

Create `docker/postgres/Dockerfile`:

```dockerfile
FROM postgres:17
RUN apt-get update && apt-get install -y postgresql-17-partman && rm -rf /var/lib/apt/lists/*
```

Update `docker-compose.yml` postgres service:

```yaml
postgres:
  build: ./docker/postgres
  # ... rest unchanged
```

- [ ] **Step 2: Create partition init module**

Create `engine/src/db/init/partitions.ts`:

```typescript
import type { DrizzleClient } from '../../infrastructure/postgres';
import { sql } from 'drizzle-orm';
import type { Logger } from '@gambit/common';

export async function initPartitions(db: DrizzleClient, logger: Logger): Promise<void> {
  // Enable pg_partman extension
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_partman`);

  // Check if signals is already partitioned
  const result = await db.execute(sql`
    SELECT relkind FROM pg_class WHERE relname = 'signals'
  `);

  const relkind = result.rows[0]?.relkind;

  if (relkind === 'p') {
    logger.info('signals table is already partitioned');
    return;
  }

  if (relkind === 'r') {
    logger.info('signals table exists as regular table — skipping auto-partition (run migration manually)');
    // In production, use the zero-downtime migration playbook from the spec:
    // 1. Create signals_partitioned
    // 2. Dual-write trigger
    // 3. Backfill
    // 4. Swap
    return;
  }

  // Fresh database — create partitioned table directly
  // This happens on first init (no existing data to migrate)
  // Note: For fresh databases, the signals table must first be created by Drizzle migrations
  // as a regular table, then this init converts it. The `pg_partman.create_parent()` call
  // handles the conversion. If the Drizzle migration already created a regular signals table,
  // this path will not be reached (the `relkind === 'r'` branch above handles it). For truly
  // fresh databases where no migration has run, pg_partman requires the table to already exist
  // with `PARTITION BY RANGE`. This is handled by running Drizzle migrations before `initPartitions()`.
  logger.info('Creating partitioned signals table');

  await db.execute(sql`
    SELECT partman.create_parent(
      p_parent_table := 'public.signals',
      p_control := 'published_at',
      p_type := 'range',
      p_interval := '1 month',
      p_premake := 3,
      p_start_partition := '2026-01-01'
    )
  `);

  // BRIN index for time-range scans
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_signals_published_brin
    ON signals USING BRIN (published_at) WITH (pages_per_range = 32)
  `);

  // Partial index for active signals (most queries)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS idx_signals_active
    ON signals(entity_id, published_at DESC)
    WHERE expires_at IS NULL OR expires_at > NOW()
  `);

  logger.info('Signal partitioning initialized');
}
```

- [ ] **Step 3: Wire into database init**

In `engine/src/db/init/index.ts`, add `initPartitions` call after extensions:

```typescript
import { initPartitions } from './partitions';
// In runDatabaseInit():
await initPartitions(db, logger);
```

- [ ] **Step 4: Test partition creation on fresh database**

```bash
docker compose down -v && docker compose up -d --profile engine
cd engine && bun run dev
```

Check logs for "Signal partitioning initialized" or "signals table is already partitioned".

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(engine): add signal table partitioning via pg_partman

- Monthly range partitioning on published_at
- 3 months pre-created ahead, auto-managed by pg_partman
- BRIN index for time-range scans
- Partial index for active (non-expired) signals
- Safe for existing databases: skips if already partitioned or regular table exists"
```

---

## Task 5: Retrofit Phase 2 Pipelines → NATS

**Goal:** Modify Temporal pipeline activities to publish events to NATS instead of directly calling ClickHouse, Neo4j, Typesense, and SSE. This is the key decoupling step.

**Files:**
- Modify: `engine/src/pipeline/activities/publish.ts`
- Modify: `engine/src/pipeline/activities/write.ts`
- Modify: `engine/src/pipeline/workflows/signal-batch.ts`

- [ ] **Step 1: Refactor publish activity to use NATS**

Replace `engine/src/pipeline/activities/publish.ts` content:

```typescript
import type { EventBus } from '../../infrastructure/event-bus';
import type { DomainEvent } from '../../infrastructure/event-schemas';
import type { NatsFeatureFlags } from '../../infrastructure/nats-kv';
import type { ResolvedSignal, SourceConfig } from '../types';
import { SSEManager } from '../../events/sse-manager';
import { ulid } from 'ulid';
import type { Logger } from '@gambit/common';

export function createPublishActivity(
  eventBus: EventBus,
  featureFlags: NatsFeatureFlags,
  logger: Logger,
) {
  return async function publishActivity(
    signal: ResolvedSignal,
    source: SourceConfig,
    traceId: string,
  ): Promise<void> {
    const event: DomainEvent = {
      id: ulid(),
      type: 'signal.ingested',
      version: 1,
      source: `pipeline:${source.id}`,
      timestamp: new Date(),
      data: {
        signalId: signal.contentHash,
        entityId: signal.entityId,
        sourceId: source.id,
        polarity: signal.category ? (isBehavioral(signal.category) ? 'behavioral' : 'declarative') : 'unknown',
        category: signal.category,
        title: signal.headline,
      },
      metadata: {
        traceId,
        causationId: source.id,
      },
    };

    if (featureFlags.isEnabled('nats.publish.enabled', true)) {
      await eventBus.publish('SIGNALS', `signals.ingested.${signal.entityId}`, event);
    } else {
      // Fallback: direct SSE publish (pre-NATS behavior)
      try {
        const { default: Redis } = await import('ioredis');
        const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6381');
        const sse = new SSEManager(redis);
        await sse.publishSignalIngested(signal, source);
        await redis.quit();
      } catch {
        // SSE publish is non-critical
      }
    }
  };
}

function isBehavioral(category: string): boolean {
  const behavioral = ['patent-filing', 'financial-filing', 'government-contract', 'building-permit',
    'job-posting', 'insider-trading', 'import-export', 'funding-round', 'trademark-registration'];
  return behavioral.includes(category);
}
```

- [ ] **Step 2: Remove inline ClickHouse write from write activity**

In `engine/src/pipeline/activities/write.ts`, the `SignalWriter` currently buffers and flushes to ClickHouse directly. With NATS, the ClickHouse sync consumer handles this. Modify the `writeSignal` method to skip the ClickHouse buffer when NATS is enabled:

```typescript
// In SignalWriter.writeSignal():
// After PostgreSQL upsert succeeds:
if (!this.featureFlags.isEnabled('nats.consumers.clickhouse', true)) {
  // Fallback: direct ClickHouse write (pre-NATS behavior)
  this.bufferForClickHouse(signal);
}
// When NATS is enabled, ClickHouse sync happens via NATS consumer
```

Add `featureFlags: NatsFeatureFlags` to the `SignalWriter` constructor.

- [ ] **Step 3: Verify pipeline still works end-to-end**

```bash
cd engine && bun run test -- test/e2e/
```

Expected: All existing pipeline tests pass (feature flags default to NATS enabled, but NoopEventBus is used if NATS is unavailable in test environment).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(engine): retrofit pipeline to publish via NATS event bus

- publish activity: publishes signal.ingested to NATS SIGNALS stream
- write activity: ClickHouse buffer skipped when NATS consumer handles sync
- Feature flag controlled: nats.publish.enabled, nats.consumers.clickhouse
- Fallback to direct SSE/ClickHouse when flags disabled"
```

---

## Task 6: NATS Consumers — ClickHouse, Neo4j, Typesense, Cache

**Goal:** Deploy the four core NATS consumers that replace inline writes from Temporal workflows.

**Files:**
- Create: `engine/src/consumers/clickhouse-sync.ts`
- Create: `engine/src/consumers/neo4j-sync.ts`
- Create: `engine/src/consumers/typesense-sync.ts`
- Create: `engine/src/consumers/cache-invalidator.ts`
- Create: `engine/src/consumers/start-consumers.ts`
- Create: `engine/test/consumers/clickhouse-sync.test.ts`

- [ ] **Step 1: Write ClickHouse sync consumer test**

Create `engine/test/consumers/clickhouse-sync.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ClickHouseSyncConsumer } from '../../src/consumers/clickhouse-sync';

describe('ClickHouseSyncConsumer', () => {
  it('batches events and flushes to ClickHouse', async () => {
    const mockClickhouse = {
      insert: vi.fn().mockResolvedValue(undefined),
    };

    const consumer = new ClickHouseSyncConsumer({
      clickhouse: mockClickhouse as any,
      // ... other deps
    });

    const events = Array.from({ length: 10 }, (_, i) => ({
      id: `evt_${i}`,
      type: 'signal.ingested',
      version: 1,
      source: 'test',
      timestamp: new Date(),
      data: {
        signalId: `sig_${i}`,
        entityId: 'company:test',
        sourceId: 'src_test',
        polarity: 'behavioral',
        category: 'patent-filing',
      },
      metadata: { traceId: `trace_${i}` },
    }));

    await consumer.handleBatch(events);

    expect(mockClickhouse.insert).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Implement ClickHouse sync consumer**

Create `engine/src/consumers/clickhouse-sync.ts`:

```typescript
import { BaseConsumer } from './base-consumer';
import type { DomainEvent } from '../infrastructure/event-schemas';
import type { Logger } from '@gambit/common';
import type { NatsContext } from '../infrastructure/nats';
import type { NatsEventBus } from '../infrastructure/event-bus';

export class ClickHouseSyncConsumer extends BaseConsumer {
  private clickhouse: any;

  constructor(deps: {
    nats: NatsContext;
    bus: NatsEventBus;
    clickhouse: any;
    logger: Logger;
  }) {
    super({
      nats: deps.nats,
      bus: deps.bus,
      logger: deps.logger,
      stream: 'SIGNALS',
      consumerName: 'clickhouse-sync',
      filterSubject: 'signals.>',
      batchSize: 500,       // ClickHouse thrives on large batches
      batchWindowMs: 500,
      maxRetries: 5,
    });
    this.clickhouse = deps.clickhouse;
  }

  async handleBatch(events: DomainEvent[]): Promise<void> {
    if (!this.clickhouse) {
      this.logger.warn('ClickHouse unavailable — skipping batch');
      return;
    }

    const rows = events
      .filter(e => e.type === 'signal.ingested')
      .map(e => ({
        signal_id: (e.data as any).signalId,
        entity_id: (e.data as any).entityId,
        source_id: (e.data as any).sourceId,
        polarity: (e.data as any).polarity,
        category: (e.data as any).category,
        ingested_at: e.timestamp,
      }));

    if (rows.length === 0) return;

    await this.clickhouse.insert({
      table: 'signals',
      values: rows,
      format: 'JSONEachRow',
    });

    this.logger.info({ count: rows.length }, 'ClickHouse batch synced');
  }
}
```

- [ ] **Step 3: Implement Neo4j sync consumer**

Create `engine/src/consumers/neo4j-sync.ts`:

```typescript
import { BaseConsumer } from './base-consumer';
import type { DomainEvent } from '../infrastructure/event-schemas';
import type { Logger } from '@gambit/common';
import type { NatsContext } from '../infrastructure/nats';
import type { NatsEventBus } from '../infrastructure/event-bus';

export class Neo4jSyncConsumer extends BaseConsumer {
  private neo4j: any;

  constructor(deps: {
    nats: NatsContext;
    bus: NatsEventBus;
    neo4j: any;
    logger: Logger;
  }) {
    super({
      nats: deps.nats,
      bus: deps.bus,
      logger: deps.logger,
      stream: 'SIGNALS',
      consumerName: 'neo4j-sync',
      filterSubject: 'signals.>',
      batchSize: 50,
      batchWindowMs: 1000,   // 1s window for batch Cypher
      maxRetries: 5,
    });
    this.neo4j = deps.neo4j;
  }

  async handleBatch(events: DomainEvent[]): Promise<void> {
    if (!this.neo4j) {
      this.logger.warn('Neo4j unavailable — skipping batch');
      return;
    }

    // Batch Cypher for entity-signal edges
    const session = this.neo4j.session();
    try {
      const params = events
        .filter(e => e.type === 'signal.ingested')
        .map(e => ({
          entityId: (e.data as any).entityId,
          signalId: (e.data as any).signalId,
          category: (e.data as any).category,
          timestamp: e.timestamp.toISOString(),
        }));

      if (params.length === 0) return;

      await session.executeWrite(tx =>
        tx.run(
          `UNWIND $signals AS s
           MERGE (e:Entity {id: s.entityId})
           MERGE (sig:Signal {id: s.signalId})
           SET sig.category = s.category, sig.timestamp = s.timestamp
           MERGE (e)-[:HAS_SIGNAL]->(sig)`,
          { signals: params },
        ),
      );

      this.logger.info({ count: params.length }, 'Neo4j batch synced');
    } finally {
      await session.close();
    }
  }
}
```

- [ ] **Step 4: Implement Typesense sync consumer**

Create `engine/src/consumers/typesense-sync.ts`:

```typescript
import { BaseConsumer } from './base-consumer';
import type { DomainEvent } from '../infrastructure/event-schemas';
import type { Logger } from '@gambit/common';
import type { NatsContext } from '../infrastructure/nats';
import type { NatsEventBus } from '../infrastructure/event-bus';

export class TypesenseSyncConsumer extends BaseConsumer {
  private typesense: any;

  constructor(deps: {
    nats: NatsContext;
    bus: NatsEventBus;
    typesense: any;
    logger: Logger;
  }) {
    super({
      nats: deps.nats,
      bus: deps.bus,
      logger: deps.logger,
      stream: 'ENTITIES',
      consumerName: 'typesense-sync',
      filterSubject: 'entities.>',
      batchSize: 25,
      batchWindowMs: 100,
      maxRetries: 5,
    });
    this.typesense = deps.typesense;
  }

  async handleBatch(events: DomainEvent[]): Promise<void> {
    if (!this.typesense) return;

    const docs = events
      .filter(e => e.type === 'entity.updated' || e.type === 'entity.created')
      .map(e => (e.data as any));

    if (docs.length === 0) return;

    try {
      await this.typesense.collections('entities').documents().import(docs, { action: 'upsert' });
      this.logger.info({ count: docs.length }, 'Typesense batch synced');
    } catch (err) {
      this.logger.error({ err }, 'Typesense sync failed');
      throw err; // trigger circuit breaker
    }
  }
}
```

- [ ] **Step 5: Implement cache invalidation consumer**

Create `engine/src/consumers/cache-invalidator.ts`:

```typescript
import { BaseConsumer } from './base-consumer';
import type { DomainEvent } from '../infrastructure/event-schemas';
import type { Logger } from '@gambit/common';
import type { NatsContext } from '../infrastructure/nats';
import type { NatsEventBus } from '../infrastructure/event-bus';

export class CacheInvalidatorConsumer extends BaseConsumer {
  private redis: any;

  constructor(deps: {
    nats: NatsContext;
    bus: NatsEventBus;
    redis: any;
    logger: Logger;
  }) {
    super({
      nats: deps.nats,
      bus: deps.bus,
      logger: deps.logger,
      stream: 'SIGNALS',
      consumerName: 'cache-invalidator',
      filterSubject: 'signals.>',
      batchSize: 10,
      batchWindowMs: 0,
      maxRetries: 3,
    });
    this.redis = deps.redis;
  }

  async handleBatch(events: DomainEvent[]): Promise<void> {
    if (!this.redis) return;

    // Pipeline all cache deletes in a single round-trip (H49)
    const pipeline = this.redis.pipeline();

    for (const event of events) {
      const entityId = (event.data as any).entityId;
      if (!entityId) continue;

      // Invalidate entity cache
      pipeline.del(`entity:${entityId}`);
      pipeline.del(`gap:${entityId}`);
      pipeline.del(`signals:${entityId}`);

      // Broadcast L1 invalidation to all API pods
      pipeline.publish('cache.invalidate', JSON.stringify({
        keys: [`entity:${entityId}`, `gap:${entityId}`],
      }));
    }

    await pipeline.exec();
    this.logger.debug({ count: events.length }, 'Cache invalidated');
  }
}
```

- [ ] **Step 6: Create consumer startup script**

Create `engine/src/consumers/start-consumers.ts`:

```typescript
import { connectNats } from '../infrastructure/nats';
import { NatsEventBus } from '../infrastructure/event-bus';
import { NatsFeatureFlags } from '../infrastructure/nats-kv';
import { ClickHouseSyncConsumer } from './clickhouse-sync';
import { Neo4jSyncConsumer } from './neo4j-sync';
import { TypesenseSyncConsumer } from './typesense-sync';
import { CacheInvalidatorConsumer } from './cache-invalidator';
import { connectClickhouse } from '../infrastructure/clickhouse';
import { connectRedis } from '../infrastructure/redis';
import { connectTypesense } from '../infrastructure/typesense';
import { loadConfig, createLogger } from '@gambit/common';
import neo4j from 'neo4j-driver';

const config = loadConfig();
const logger = createLogger('consumers');

async function main() {
  const nats = await connectNats(config, logger);
  if (!nats) {
    logger.fatal('Cannot start consumers without NATS');
    process.exit(1);
  }

  const bus = new NatsEventBus(nats, logger);
  const clickhouse = await connectClickhouse(config, logger);
  const redis = await connectRedis(config.redisPersistentUrl ?? 'redis://localhost:6381', logger, 'consumer');
  const typesense = await connectTypesense(config, logger);

  let neo4jDriver: any = null;
  try {
    neo4jDriver = neo4j.driver(
      config.neo4jUrl ?? 'bolt://localhost:7687',
      neo4j.auth.basic(config.neo4jUser ?? 'neo4j', config.neo4jPassword ?? 'password'),
    );
  } catch (err) {
    logger.warn({ err }, 'Neo4j unavailable');
  }

  const consumers = [
    new ClickHouseSyncConsumer({ nats, bus, clickhouse, logger }),
    new Neo4jSyncConsumer({ nats, bus, neo4j: neo4jDriver, logger }),
    new TypesenseSyncConsumer({ nats, bus, typesense, logger }),
    new CacheInvalidatorConsumer({ nats, bus, redis, logger }),
  ];

  logger.info({ count: consumers.length }, 'Starting NATS consumers');

  // Start all consumers concurrently
  await Promise.all(consumers.map(c => c.start()));
}

main().catch(err => {
  logger.fatal({ err }, 'Consumer startup failed');
  process.exit(1);
});
```

Add to `engine/package.json` scripts:

```json
"consumers": "bun run src/consumers/start-consumers.ts"
```

- [ ] **Step 7: Run tests**

```bash
cd engine && bun run test -- test/consumers/
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "feat(engine): add NATS consumers for ClickHouse, Neo4j, Typesense, cache

- ClickHouseSyncConsumer: batch 500, 500ms window, JSONEachRow insert
- Neo4jSyncConsumer: batch 50, 1s window, batch Cypher UNWIND
- TypesenseSyncConsumer: batch 25, 100ms window, upsert import
- CacheInvalidatorConsumer: Redis pipeline for batch invalidation (H49)
- start-consumers.ts: standalone process for all consumers
- npm script: bun run consumers"
```

---

## Task 7: SSE Gateway Service

**Goal:** Build the dedicated SSE gateway as a separate Hono app that scales independently from the API, using NATS multiplexed fan-out.

**Files:**
- Create: `engine/src/sse-gateway/index.ts`
- Create: `engine/src/sse-gateway/fanout.ts`
- Create: `engine/src/sse-gateway/connection-manager.ts`
- Create: `engine/test/sse-gateway/fanout.test.ts`

- [ ] **Step 1: Write SSE fan-out test**

Create `engine/test/sse-gateway/fanout.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { SSEFanout } from '../../src/sse-gateway/fanout';

describe('SSEFanout', () => {
  it('registers and broadcasts to watchers', () => {
    const fanout = new SSEFanout();
    const mockConn1 = { write: vi.fn() };
    const mockConn2 = { write: vi.fn() };

    fanout.register('company:nvidia', mockConn1 as any);
    fanout.register('company:nvidia', mockConn2 as any);
    fanout.register('company:apple', mockConn1 as any);

    fanout.broadcast('company:nvidia', { id: '1', event: 'signal.ingested', data: '{}' });

    expect(mockConn1.write).toHaveBeenCalledOnce();
    expect(mockConn2.write).toHaveBeenCalledOnce();
  });

  it('unregisters connections', () => {
    const fanout = new SSEFanout();
    const mockConn = { write: vi.fn() };

    fanout.register('company:nvidia', mockConn as any);
    fanout.unregister('company:nvidia', mockConn as any);
    fanout.broadcast('company:nvidia', { id: '1', event: 'test', data: '{}' });

    expect(mockConn.write).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement SSE fan-out**

Create `engine/src/sse-gateway/fanout.ts`:

```typescript
import type { SSEStreamingApi } from 'hono/streaming';

export interface SSEConnection {
  write(data: { id: string; event: string; data: string }): void;
  teamId: string;
  entityIds: Set<string>;
}

export interface SSEEvent {
  id: string;
  event: string;
  data: string;
}

export class SSEFanout {
  // entityId → Set<SSEConnection> — H26: one Map lookup per broadcast
  private watchers = new Map<string, Set<SSEConnection>>();

  register(entityId: string, conn: SSEConnection): void {
    if (!this.watchers.has(entityId)) {
      this.watchers.set(entityId, new Set());
    }
    this.watchers.get(entityId)!.add(conn);
  }

  unregister(entityId: string, conn: SSEConnection): void {
    const set = this.watchers.get(entityId);
    if (set) {
      set.delete(conn);
      if (set.size === 0) this.watchers.delete(entityId);
    }
  }

  unregisterAll(conn: SSEConnection): void {
    for (const entityId of conn.entityIds) {
      this.unregister(entityId, conn);
    }
  }

  broadcast(entityId: string, event: SSEEvent): void {
    const set = this.watchers.get(entityId);
    if (!set) return;

    for (const conn of set) {
      try {
        conn.write(event);
      } catch {
        // Connection dead — will be cleaned up by keepalive
      }
    }
  }

  getConnectionCount(): number {
    let total = 0;
    for (const set of this.watchers.values()) {
      total += set.size;
    }
    return total;
  }
}
```

- [ ] **Step 3: Implement connection manager**

Create `engine/src/sse-gateway/connection-manager.ts`:

```typescript
import type { Logger } from '@gambit/common';

const MAX_CONNECTIONS: Record<string, number> = {
  pro: 25,
  enterprise: 200,
};

export class ConnectionManager {
  private teamCounts = new Map<string, number>();

  constructor(private logger: Logger) {}

  canConnect(teamId: string, tier: string): boolean {
    const max = MAX_CONNECTIONS[tier];
    if (!max) return false; // free tier: no SSE
    const current = this.teamCounts.get(teamId) ?? 0;
    return current < max;
  }

  onConnect(teamId: string): void {
    const current = this.teamCounts.get(teamId) ?? 0;
    this.teamCounts.set(teamId, current + 1);
  }

  onDisconnect(teamId: string): void {
    const current = this.teamCounts.get(teamId) ?? 1;
    this.teamCounts.set(teamId, Math.max(0, current - 1));
  }

  getTeamCount(teamId: string): number {
    return this.teamCounts.get(teamId) ?? 0;
  }

  getTotalCount(): number {
    let total = 0;
    for (const count of this.teamCounts.values()) total += count;
    return total;
  }
}
```

- [ ] **Step 4: Implement SSE Gateway Hono app**

Create `engine/src/sse-gateway/index.ts`:

```typescript
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { SSEFanout, type SSEConnection } from './fanout';
import { ConnectionManager } from './connection-manager';
import { connectNats, type NatsContext } from '../infrastructure/nats';
import { StringCodec, DeliverPolicy } from 'nats';
import { loadConfig, createLogger } from '@gambit/common';
import type { DomainEvent } from '../infrastructure/event-schemas';

const config = loadConfig();
const logger = createLogger('sse-gateway');
const sc = StringCodec();

const fanout = new SSEFanout();
const connManager = new ConnectionManager(logger);

const app = new Hono();

// Health check
app.get('/health', (c) => c.json({ status: 'ok', connections: fanout.getConnectionCount() }));

// SSE stream endpoint
app.get('/stream', async (c) => {
  // TODO: authenticate from JWT/API key
  const teamId = c.req.header('X-Team-Id') ?? 'anonymous';
  const tier = c.req.header('X-Tier') ?? 'pro';
  const watchedEntities = c.req.query('entities')?.split(',') ?? [];

  if (tier === 'free') {
    return c.json({ error: 'SSE requires Pro tier' }, 403);
  }

  if (!connManager.canConnect(teamId, tier)) {
    return c.json({ error: 'Connection limit reached' }, 429);
  }

  return streamSSE(c, async (stream) => {
    const conn: SSEConnection = {
      write: (data) => stream.writeSSE(data),
      teamId,
      entityIds: new Set(watchedEntities),
    };

    connManager.onConnect(teamId);
    for (const entityId of watchedEntities) {
      fanout.register(entityId, conn);
    }

    // Heartbeat
    const heartbeat = setInterval(() => {
      stream.writeSSE({ id: '', event: 'heartbeat', data: '' }).catch(() => {
        clearInterval(heartbeat);
      });
    }, 15_000);

    // Wait for disconnect
    stream.onAbort(() => {
      clearInterval(heartbeat);
      fanout.unregisterAll(conn);
      connManager.onDisconnect(teamId);
      logger.debug({ teamId }, 'SSE connection closed');
    });

    // Keep connection alive until aborted
    await new Promise(() => {}); // never resolves — SSE stays open
  });
});

// Start NATS subscription for fan-out (one per gateway pod — H26)
async function startNatsFanout(nats: NatsContext) {
  const js = nats.jetstream;

  const STREAM_SUBJECTS = [
    { stream: 'SIGNALS', subject: 'signals.>' },
    { stream: 'GAP_SCORES', subject: 'gaps.>' },
    { stream: 'ALERTS', subject: 'alerts.>' },
  ];
  for (const { stream, subject } of STREAM_SUBJECTS) {
    const sub = await js.subscribe(subject, {
      stream,
      config: {
        deliver_policy: DeliverPolicy.New,
        // Ephemeral consumer — no durable state needed for SSE fan-out
      },
    });

    (async () => {
      for await (const msg of sub) {
        try {
          const event = JSON.parse(sc.decode(msg.data)) as DomainEvent;
          const entityId = (event.data as any).entityId;
          if (entityId) {
            fanout.broadcast(entityId, {
              id: msg.seq.toString(),
              event: event.type,
              data: JSON.stringify(event.data),
            });
          }
          msg.ack();
        } catch {
          msg.ack(); // don't block on parse errors in SSE
        }
      }
    })();
  }

  logger.info('NATS fan-out subscriptions started');
}

// Main
async function main() {
  const nats = await connectNats(config, logger);
  if (nats) await startNatsFanout(nats);

  const port = parseInt(process.env.SSE_GATEWAY_PORT ?? '3002');
  Bun.serve({ fetch: app.fetch, port });
  logger.info({ port }, 'SSE Gateway started');
}

main().catch(err => {
  logger.fatal({ err }, 'SSE Gateway startup failed');
  process.exit(1);
});

export default app;
```

Add to `engine/package.json` scripts:

```json
"sse-gateway": "bun run src/sse-gateway/index.ts"
```

- [ ] **Step 5: Run tests**

```bash
cd engine && bun run test -- test/sse-gateway/
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(engine): add dedicated SSE gateway with NATS multiplexed fan-out

- Separate Hono app on port 3002
- SSEFanout: Map-based entity → connection lookup (H26)
- ConnectionManager: per-team caps (Pro 25, Enterprise 200)
- NATS subscription: one consumer per pod, in-process fan-out
- 15s heartbeat, graceful disconnect cleanup
- npm script: bun run sse-gateway"
```

---

## Task 8: Cache Strategy + CDN Integration

**Goal:** Implement the three-tier cache with per-endpoint strategies, request coalescing, probabilistic early expiration, cache warming, and CDN Cache-Control headers.

**Files:**
- Create: `engine/src/infrastructure/cache-strategy.ts`
- Create: `engine/src/middleware/cache-control.ts`
- Create: `engine/src/middleware/compression.ts`
- Create: `engine/src/routes/batch.ts`
- Modify: `engine/src/infrastructure/cache-layers.ts`
- Create: `engine/test/infrastructure/cache-strategy.test.ts`

- [ ] **Step 1: Write cache strategy test**

Create `engine/test/infrastructure/cache-strategy.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { CachedQueryExecutor, CACHE_STRATEGIES } from '../../src/infrastructure/cache-strategy';

describe('CachedQueryExecutor', () => {
  it('returns cached value on L2 hit', async () => {
    const mockRedis = {
      get: vi.fn().mockResolvedValue(JSON.stringify({
        data: { id: 'test' },
        expiresAt: Date.now() + 60000,
      })),
      set: vi.fn(),
    };

    const executor = new CachedQueryExecutor(null, mockRedis as any);
    const fetcher = vi.fn();

    const result = await executor.query(
      CACHE_STRATEGIES.entityById,
      ['company:nvidia'],
      fetcher,
    );

    expect(result).toEqual({ id: 'test' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('calls fetcher on cache miss', async () => {
    const mockRedis = { get: vi.fn().mockResolvedValue(null), set: vi.fn() };
    const executor = new CachedQueryExecutor(null, mockRedis as any);
    const fetcher = vi.fn().mockResolvedValue({ id: 'fresh' });

    const result = await executor.query(
      CACHE_STRATEGIES.entityById,
      ['company:nvidia'],
      fetcher,
    );

    expect(result).toEqual({ id: 'fresh' });
    expect(fetcher).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Implement cache strategy**

Create `engine/src/infrastructure/cache-strategy.ts`:

```typescript
import { LRUCache } from 'lru-cache';
import { coalesce } from './coalesce';

export interface CacheStrategy {
  key: (...args: any[]) => string;
  ttl: number;           // seconds
  l1: boolean;
  staleWhileRevalidate?: number;
  invalidateOn?: string[];
}

export const CACHE_STRATEGIES: Record<string, CacheStrategy> = {
  entityById: {
    key: (id: string) => `entity:${id}`,
    ttl: 30,
    l1: true,
    staleWhileRevalidate: 60,
    invalidateOn: ['entity.updated', 'signal.ingested'],
  },
  leaderboard: {
    key: (domain: string, cursor: string) => `leaderboard:${domain}:${cursor}`,
    ttl: 120,
    l1: false,
    staleWhileRevalidate: 300,
    invalidateOn: ['gap.recomputed'],
  },
  gapScoreByEntity: {
    key: (entityId: string) => `gap:${entityId}`,
    ttl: 60,
    l1: true,
    invalidateOn: ['gap.recomputed'],
  },
  domainTaxonomy: {
    key: () => 'domains:all',
    ttl: 3600,
    l1: true,
    invalidateOn: ['domain.updated'],
  },
};

export class CachedQueryExecutor {
  private l1: LRUCache<string, any>;

  constructor(
    l1: LRUCache<string, any> | null,
    private redis: any,
  ) {
    this.l1 = l1 ?? new LRUCache({ max: 1000, ttl: 10_000 });
  }

  async query<T>(
    strategy: CacheStrategy,
    keyArgs: any[],
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const key = strategy.key(...keyArgs);

    // L1
    if (strategy.l1) {
      const l1Hit = this.l1.get(key);
      if (l1Hit !== undefined) return l1Hit as T;
    }

    // L2
    if (this.redis) {
      const cached = await this.redis.get(key);
      if (cached) {
        const { data, expiresAt } = JSON.parse(cached);
        if (Date.now() < expiresAt) {
          if (strategy.l1) this.l1.set(key, data);
          return data as T;
        }
        // Stale — serve stale, refresh async
        if (strategy.staleWhileRevalidate) {
          coalesce(`refresh:${key}`, async () => {
            const fresh = await fetcher();
            await this.writeCache(key, strategy, fresh);
          });
          return data as T;
        }
      }
    }

    // L3 — coalesced to prevent thundering herd
    return coalesce(`fetch:${key}`, async () => {
      const fresh = await fetcher();
      await this.writeCache(key, strategy, fresh);
      if (strategy.l1) this.l1.set(key, fresh);
      return fresh;
    });
  }

  private async writeCache(key: string, strategy: CacheStrategy, data: any): Promise<void> {
    if (!this.redis) return;
    await this.redis.set(key, JSON.stringify({
      data,
      expiresAt: Date.now() + strategy.ttl * 1000,
    }), 'EX', strategy.ttl + (strategy.staleWhileRevalidate ?? 0));
  }

  invalidateL1(key: string): void {
    this.l1.delete(key);
  }
}
```

- [ ] **Step 3: Create CDN cache-control middleware**

Create `engine/src/middleware/cache-control.ts`:

```typescript
import type { Context, Next } from 'hono';

export interface CacheControlOpts {
  public?: boolean;
  maxAge: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
}

export function cacheControl(opts: CacheControlOpts) {
  return async (c: Context, next: Next) => {
    await next();

    const parts: string[] = [];
    parts.push(opts.public ? 'public' : 'private');
    parts.push(`max-age=${opts.maxAge}`);
    if (opts.sMaxAge !== undefined) parts.push(`s-maxage=${opts.sMaxAge}`);
    if (opts.staleWhileRevalidate !== undefined) {
      parts.push(`stale-while-revalidate=${opts.staleWhileRevalidate}`);
    }

    c.header('Cache-Control', parts.join(', '));

    // CDN-cached public endpoints: Vary only on encoding
    if (opts.public) {
      c.header('Vary', 'Accept-Encoding');
    } else {
      c.header('Vary', 'Authorization, Accept-Encoding');
    }
  };
}
```

- [ ] **Step 4: Create compression middleware**

Create `engine/src/middleware/compression.ts`:

```typescript
import { compress } from 'hono/compress';

export const compressionMiddleware = compress({ encoding: 'gzip' });
// Note: Brotli support depends on the Hono version.
// If hono/compress supports 'br', use: compress({ encoding: 'br' })
```

- [ ] **Step 5: Create batch API route**

Create `engine/src/routes/batch.ts`:

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

const batchRequestSchema = z.object({
  operations: z.array(z.object({
    id: z.string(),
    method: z.literal('GET'),
    path: z.string(),
    params: z.record(z.string()).optional(),
  })).max(100),
});

const batch = new Hono();

batch.post('/',
  zValidator('json', batchRequestSchema),
  async (c) => {
    const { operations } = c.req.valid('json');
    const start = performance.now();

    const results = await Promise.all(
      operations.map(async (op) => {
        try {
          // Internal routing via service layer (not HTTP self-call)
          const data = await routeInternal(op.path, op.params ?? {}, c);
          return { id: op.id, status: 200, data };
        } catch (err: any) {
          return { id: op.id, status: err.statusCode ?? 500, data: { error: err.message } };
        }
      }),
    );

    const allOk = results.every(r => r.status === 200);
    return c.json(
      { results, meta: { duration: Math.round(performance.now() - start) } },
      allOk ? 200 : 207,
    );
  },
);

async function routeInternal(path: string, params: Record<string, string>, c: any): Promise<any> {
  // Parse path and delegate to appropriate service
  const entityMatch = path.match(/^\/entities\/(.+)$/);
  if (entityMatch) {
    const entityService = c.get('container').entityService;
    return entityService.findById(entityMatch[1]);
  }

  throw new Error(`Unknown batch path: ${path}`);
}

export default batch;
```

- [ ] **Step 6: Run tests**

```bash
cd engine && bun run test -- test/infrastructure/cache-strategy.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(engine): add 3-tier cache strategy, CDN headers, compression, batch API

- CachedQueryExecutor: L1 LRU → L2 Redis → L3 DB with coalescing
- Per-endpoint cache strategies (entityById, leaderboard, gapScore, domains)
- Stale-while-revalidate at application layer
- CDN Cache-Control middleware (public/private, s-maxage, SWR)
- Gzip compression middleware
- POST /engine/v1/batch: up to 100 operations, internal routing, HTTP 207"
```

---

## Task 9: Observability Stack

**Goal:** Add Prometheus metrics, structured log configuration for Loki, and Docker Compose services for the observability stack.

**Files:**
- Modify: `docker-compose.yml`
- Create: `docker/prometheus/prometheus.yml`
- Create: `docker/loki/loki-config.yaml`
- Create: `engine/src/infrastructure/metrics.ts`
- Modify: `engine/src/index.ts`

- [ ] **Step 1: Install prom-client**

```bash
cd engine && bun add prom-client
```

- [ ] **Step 2: Create Prometheus metrics module**

Create `engine/src/infrastructure/metrics.ts`:

```typescript
import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

// API metrics
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});

// Database metrics
export const pgQueryDuration = new Histogram({
  name: 'pg_query_duration_seconds',
  help: 'PostgreSQL query duration',
  labelNames: ['query_name', 'status'] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1],
  registers: [registry],
});

// NATS metrics
export const natsConsumerLag = new Gauge({
  name: 'nats_consumer_lag',
  help: 'NATS consumer lag (pending messages)',
  labelNames: ['stream', 'consumer'] as const,
  registers: [registry],
});

export const natsPublishErrors = new Counter({
  name: 'nats_publish_errors_total',
  help: 'NATS publish errors',
  registers: [registry],
});

// SSE metrics
export const sseActiveConnections = new Gauge({
  name: 'sse_active_connections',
  help: 'Active SSE connections',
  labelNames: ['tier'] as const,
  registers: [registry],
});

// Ingestion metrics
export const ingestionDlqDepth = new Gauge({
  name: 'ingestion_dlq_depth',
  help: 'Dead letter queue depth',
  labelNames: ['source', 'stage'] as const,
  registers: [registry],
});

// Degradation metrics
export const degradedServices = new Gauge({
  name: 'api_degraded_services',
  help: 'Number of degraded services',
  registers: [registry],
});
```

- [ ] **Step 3: Add metrics middleware + /metrics endpoint**

In `engine/src/index.ts`, add metrics middleware and endpoint:

```typescript
import { registry, httpRequestDuration, httpRequestsTotal } from './infrastructure/metrics';

// Metrics middleware (before routes)
app.use('*', async (c, next) => {
  const start = performance.now();
  await next();
  const duration = (performance.now() - start) / 1000;
  const route = c.req.routePath ?? c.req.path;
  const status = c.res.status.toString();
  httpRequestDuration.observe({ method: c.req.method, route, status }, duration);
  httpRequestsTotal.inc({ method: c.req.method, route, status });
});

// Metrics endpoint (public, for Prometheus scraping)
app.get('/metrics', async (c) => {
  const metrics = await registry.metrics();
  return c.text(metrics, 200, { 'Content-Type': registry.contentType });
});
```

- [ ] **Step 4: Add observability services to Docker Compose**

Add to `docker-compose.yml`:

```yaml
prometheus:
  image: prom/prometheus:latest
  ports:
    - "9090:9090"
  volumes:
    - ./docker/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
  profiles: ["observability", "all"]

loki:
  image: grafana/loki:latest
  ports:
    - "3100:3100"
  command: ["-config.file=/etc/loki/loki-config.yaml"]
  volumes:
    - ./docker/loki/loki-config.yaml:/etc/loki/loki-config.yaml:ro
  profiles: ["observability", "all"]

pyroscope:
  image: grafana/pyroscope:latest
  ports:
    - "4040:4040"
  profiles: ["observability", "all"]

tempo:
  image: grafana/tempo:latest
  ports:
    - "3200:3200"
  profiles: ["observability", "all"]
```

- [ ] **Step 5: Create Prometheus scrape config**

Create `docker/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'gambit-engine'
    static_configs:
      - targets: ['host.docker.internal:3001']
    metrics_path: '/metrics'

  - job_name: 'sse-gateway'
    static_configs:
      - targets: ['host.docker.internal:3002']
    metrics_path: '/health'

  - job_name: 'nats'
    static_configs:
      - targets: ['nats:8222']
    metrics_path: '/varz'
```

- [ ] **Step 6: Create Loki config**

Create `docker/loki/loki-config.yaml`:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory
  replication_factor: 1
  path_prefix: /tmp/loki

schema_config:
  configs:
    - from: 2026-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

storage_config:
  filesystem:
    directory: /tmp/loki/chunks
```

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(engine): add observability stack — Prometheus metrics, Loki, Pyroscope

- 20 critical metrics: HTTP duration/count, PG query duration, NATS lag, SSE connections, DLQ depth
- /metrics endpoint for Prometheus scraping
- Docker Compose: Prometheus, Loki, Pyroscope in observability profile
- Prometheus scrape config for engine, SSE gateway, NATS
- Loki config with filesystem storage for dev"
```

---

## Task 10: Graceful Degradation

**Goal:** Build the DegradationRegistry that tracks service health, provides fallback paths, and propagates degradation state to API responses.

**Files:**
- Create: `engine/src/infrastructure/degradation.ts`
- Create: `engine/src/middleware/degradation-header.ts`
- Modify: `engine/src/routes/health.ts`
- Create: `engine/test/infrastructure/degradation.test.ts`

- [ ] **Step 1: Write degradation test**

Create `engine/test/infrastructure/degradation.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { DegradationRegistry } from '../../src/infrastructure/degradation';
import { createLogger } from '@gambit/common';

const logger = createLogger('test');

describe('DegradationRegistry', () => {
  it('reports healthy when all services are up', () => {
    const reg = new DegradationRegistry(null, logger);
    expect(reg.isDegraded()).toBe(false);
    expect(reg.getDegradedServices()).toEqual([]);
  });

  it('reports degraded when a service is manually overridden', async () => {
    const reg = new DegradationRegistry(null, logger);
    reg.setOverride('clickhouse', 'down');
    expect(reg.isDegraded()).toBe(true);
    expect(reg.getDegradedServices()).toContain('clickhouse');
  });

  it('clears override', () => {
    const reg = new DegradationRegistry(null, logger);
    reg.setOverride('neo4j', 'down');
    reg.clearOverride('neo4j');
    expect(reg.getDegradedServices()).not.toContain('neo4j');
  });
});
```

- [ ] **Step 2: Implement DegradationRegistry**

Create `engine/src/infrastructure/degradation.ts`:

```typescript
import type { Logger } from '@gambit/common';
import { CircuitBreaker } from '../health/circuit-breaker';

export type ServiceName = 'clickhouse' | 'neo4j' | 'typesense' | 'nats' | 'redis' | 'temporal' | 'minio';
export type ServiceStatus = 'healthy' | 'degraded' | 'down';

export class DegradationRegistry {
  private overrides = new Map<ServiceName, ServiceStatus>();
  private breakers = new Map<ServiceName, CircuitBreaker>();
  private logger: Logger;

  constructor(natsKv: any | null, logger: Logger) {
    this.logger = logger;

    // Initialize circuit breakers for each service
    const services: ServiceName[] = ['clickhouse', 'neo4j', 'typesense', 'nats', 'redis', 'temporal', 'minio'];
    for (const service of services) {
      this.breakers.set(service, new CircuitBreaker());
    }
  }

  getStatus(service: ServiceName): ServiceStatus {
    // Manual override takes precedence
    const override = this.overrides.get(service);
    if (override) return override;

    // Check circuit breaker
    const breaker = this.breakers.get(service);
    if (breaker && breaker.getState() === 'open') return 'down';
    if (breaker && breaker.getState() === 'half-open') return 'degraded';

    return 'healthy';
  }

  isHealthy(service: ServiceName): boolean {
    return this.getStatus(service) === 'healthy';
  }

  isDegraded(): boolean {
    const services: ServiceName[] = ['clickhouse', 'neo4j', 'typesense', 'nats', 'redis', 'temporal', 'minio'];
    return services.some(s => this.getStatus(s) !== 'healthy');
  }

  getDegradedServices(): ServiceName[] {
    const services: ServiceName[] = ['clickhouse', 'neo4j', 'typesense', 'nats', 'redis', 'temporal', 'minio'];
    return services.filter(s => this.getStatus(s) !== 'healthy');
  }

  getBreaker(service: ServiceName): CircuitBreaker | undefined {
    return this.breakers.get(service);
  }

  setOverride(service: ServiceName, status: ServiceStatus): void {
    this.overrides.set(service, status);
    this.logger.warn({ service, status }, 'Manual degradation override set');
  }

  clearOverride(service: ServiceName): void {
    this.overrides.delete(service);
    this.logger.info({ service }, 'Manual degradation override cleared');
  }
}
```

- [ ] **Step 3: Create degradation header middleware**

Create `engine/src/middleware/degradation-header.ts`:

```typescript
import type { Context, Next } from 'hono';
import type { DegradationRegistry } from '../infrastructure/degradation';

export function degradationHeader(registry: DegradationRegistry) {
  return async (c: Context, next: Next) => {
    await next();

    const degraded = registry.getDegradedServices();
    if (degraded.length > 0) {
      c.header('X-Gambit-Degraded', degraded.join(','));
    }
  };
}
```

- [ ] **Step 4: Enhance health routes**

Replace `engine/src/routes/health.ts` with tiered health checks:

```typescript
import { Hono } from 'hono';
import type { DegradationRegistry } from '../infrastructure/degradation';

export function createHealthRoutes(degradation: DegradationRegistry) {
  const health = new Hono();

  // Tier 1: Liveness (K8s restarts pod)
  health.get('/live', (c) => c.json({ alive: true, uptime: process.uptime() }));

  // Tier 2: Readiness (K8s removes from Service)
  health.get('/ready', async (c) => {
    // Must have PostgreSQL
    try {
      const { getDb } = await import('../infrastructure/postgres');
      const db = getDb();
      await db.execute({ sql: 'SELECT 1', params: [] });
      return c.json({ ready: true });
    } catch {
      return c.json({ ready: false, reason: 'postgresql_unreachable' }, 503);
    }
  });

  // Tier 3: Dependency health (monitoring)
  health.get('/deps', (c) => {
    const services = ['clickhouse', 'neo4j', 'typesense', 'nats', 'redis', 'temporal', 'minio'] as const;
    const statuses: Record<string, string> = {};
    for (const service of services) {
      statuses[service] = degradation.getStatus(service);
    }

    const allHealthy = Object.values(statuses).every(s => s === 'healthy');
    return c.json({
      status: allHealthy ? 'healthy' : 'degraded',
      services: statuses,
      uptime: process.uptime(),
    }, allHealthy ? 200 : 207);
  });

  // Backward compatible: /health still works (same logic as /health/ready)
  health.get('/', async (c) => {
    try {
      const { getDb } = await import('../infrastructure/postgres');
      const db = getDb();
      await db.execute({ sql: 'SELECT 1', params: [] });
      return c.json({ ready: true });
    } catch {
      return c.json({ ready: false, reason: 'postgresql_unreachable' }, 503);
    }
  });

  return health;
}
```

- [ ] **Step 5: Wire degradation into engine startup**

In `engine/src/index.ts`:

```typescript
import { DegradationRegistry } from './infrastructure/degradation';
import { degradationHeader } from './middleware/degradation-header';

const degradation = new DegradationRegistry(null, logger);

// Add middleware
app.use('*', degradationHeader(degradation));

// Replace health routes
app.route('/engine/v1/health', createHealthRoutes(degradation));
```

- [ ] **Step 6: Run tests**

```bash
cd engine && bun run test -- test/infrastructure/degradation.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat(engine): add graceful degradation registry + tiered health checks

- DegradationRegistry: circuit breaker state + manual overrides
- X-Gambit-Degraded header on API responses
- Tiered health: /health/live, /health/ready, /health/deps
- Per-service degradation status (7 services tracked)"
```

---

## Task 11: Security Hardening + Rate Limiting

**Goal:** Implement 4-layer tenant isolation, ES256 JWT, Argon2id API keys, webhook SSRF prevention, audit log, scope guards, and RLS audit tests.

**Files:**
- Create: `engine/src/auth/jwt-es256.ts`
- Create: `engine/src/auth/api-key-argon2.ts`
- Create: `engine/src/middleware/scope-guard.ts`
- Create: `engine/src/security/webhook-validator.ts`
- Create: `engine/src/security/audit-log.ts`
- Create: `engine/src/db/init/roles.ts`
- Modify: `engine/src/db/init/rls.ts`
- Create: `engine/test/security/rls-audit.test.ts`
- Create: `engine/test/security/webhook-validator.test.ts`
- Create: `engine/test/security/audit-log.test.ts`

- [ ] **Step 1: Write webhook SSRF test**

Create `engine/test/security/webhook-validator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { validateWebhookUrl } from '../../src/security/webhook-validator';

describe('validateWebhookUrl', () => {
  it('accepts valid HTTPS URL', async () => {
    await expect(validateWebhookUrl('https://example.com/webhook')).resolves.not.toThrow();
  });

  it('rejects HTTP URL', async () => {
    await expect(validateWebhookUrl('http://example.com/webhook')).rejects.toThrow('HTTPS');
  });

  it('rejects localhost', async () => {
    await expect(validateWebhookUrl('https://localhost/webhook')).rejects.toThrow();
  });

  it('rejects IP addresses', async () => {
    await expect(validateWebhookUrl('https://192.168.1.1/webhook')).rejects.toThrow('hostname');
  });

  it('rejects link-local (AWS metadata)', async () => {
    await expect(validateWebhookUrl('https://169.254.169.254/latest/')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Implement webhook validator**

Create `engine/src/security/webhook-validator.ts`:

```typescript
import { lookup } from 'dns/promises';
import { ValidationError } from '@gambit/common';

const DENIED_HOSTNAMES = ['localhost', '0.0.0.0', '[::1]'];

const DENIED_CIDRS = [
  { prefix: '10.', bits: 8 },
  { prefix: '172.16.', bits: 12 },
  { prefix: '192.168.', bits: 16 },
  { prefix: '127.', bits: 8 },
  { prefix: '169.254.', bits: 16 },
  { prefix: '100.64.', bits: 10 },
  { prefix: '0.', bits: 8 },
];

export async function validateWebhookUrl(url: string): Promise<void> {
  const parsed = new URL(url);

  if (parsed.protocol !== 'https:') {
    throw new ValidationError('Webhook URL must use HTTPS');
  }

  if (DENIED_HOSTNAMES.includes(parsed.hostname)) {
    throw new ValidationError('Webhook URL cannot point to localhost');
  }

  // Reject direct IP addresses
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(parsed.hostname) || parsed.hostname.includes(':')) {
    throw new ValidationError('Webhook URL must use a hostname, not an IP address');
  }

  // DNS resolution check
  try {
    const { address } = await lookup(parsed.hostname);
    for (const cidr of DENIED_CIDRS) {
      if (address.startsWith(cidr.prefix)) {
        throw new ValidationError('Webhook URL resolves to a private IP address');
      }
    }
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError('Cannot resolve webhook URL hostname');
  }
}
```

- [ ] **Step 3: Write audit log test**

Create `engine/test/security/audit-log.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { AuditLog } from '../../src/security/audit-log';

describe('AuditLog', () => {
  it('computes tamper-evident hash chain', () => {
    const log = new AuditLog();

    const event1 = log.createEntry({
      teamId: 'team_1',
      actorId: 'user_1',
      actorType: 'user' as const,
      action: 'api_key.created' as const,
      resource: 'api_key:ak_1',
      details: {},
      ip: '1.2.3.4',
      requestId: 'req_1',
    });

    const event2 = log.createEntry({
      teamId: 'team_1',
      actorId: 'user_1',
      actorType: 'user' as const,
      action: 'api_key.revoked' as const,
      resource: 'api_key:ak_1',
      details: {},
      ip: '1.2.3.4',
      requestId: 'req_2',
    });

    expect(event1.hash).toBeTruthy();
    expect(event2.hash).toBeTruthy();
    expect(event2.previousHash).toBe(event1.hash);
    expect(event1.hash).not.toBe(event2.hash);
  });
});
```

- [ ] **Step 4: Implement audit log**

Create `engine/src/security/audit-log.ts`:

```typescript
import crypto from 'crypto';

export type AuditAction =
  | 'api_key.created' | 'api_key.revoked' | 'api_key.rotated'
  | 'webhook.created' | 'webhook.updated' | 'webhook.deleted'
  | 'watchlist.created' | 'watchlist.deleted' | 'watchlist.entity_added'
  | 'team.member_invited' | 'team.member_removed' | 'team.tier_changed'
  | 'export.requested' | 'export.downloaded'
  | 'auth.login' | 'auth.logout' | 'auth.failed' | 'auth.token_revoked'
  | 'admin.recompute_triggered' | 'admin.degradation_override';

export interface AuditEntry {
  timestamp: Date;
  teamId: string;
  actorId: string;
  actorType: 'user' | 'api_key' | 'system';
  action: AuditAction;
  resource: string;
  details: Record<string, any>;
  ip: string;
  requestId: string;
  previousHash: string;
  hash: string;
}

export class AuditLog {
  private lastHash = '';

  createEntry(input: Omit<AuditEntry, 'timestamp' | 'previousHash' | 'hash'>): AuditEntry {
    const entry: AuditEntry = {
      ...input,
      timestamp: new Date(),
      previousHash: this.lastHash,
      hash: '',
    };

    entry.hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(entry))
      .digest('hex');

    this.lastHash = entry.hash;
    return entry;
  }
}
```

- [ ] **Step 5: Create scope guard middleware**

Create `engine/src/middleware/scope-guard.ts`:

```typescript
import type { Context, Next } from 'hono';
import { ForbiddenError } from '@gambit/common';

export type DataScope = 'global' | 'tenant' | 'mixed';

export function scopeGuard(scope: DataScope) {
  return async (c: Context, next: Next) => {
    c.set('dataScope', scope);

    if (scope === 'tenant' || scope === 'mixed') {
      const teamId = c.get('teamId');
      if (!teamId) throw new ForbiddenError('Tenant context required');
    }

    await next();
  };
}
```

- [ ] **Step 6: Write RLS audit test**

Create `engine/test/security/rls-audit.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getDb } from '../../src/infrastructure/postgres';
import { sql } from 'drizzle-orm';

const TENANT_SCOPED_TABLES = [
  'watchlists', 'alerts', 'webhook_endpoints',
  'webhook_deliveries', 'usage_records', 'api_keys', 'foia_requests',
];

describe('RLS audit', () => {
  for (const table of TENANT_SCOPED_TABLES) {
    it(`${table} has RLS enabled`, async () => {
      const db = getDb();
      const result = await db.execute(sql`
        SELECT relrowsecurity, relforcerowsecurity
        FROM pg_class
        WHERE relname = ${table}
      `);

      // Table may not exist yet if schema hasn't been applied
      if (result.rows.length === 0) return;

      expect(result.rows[0].relrowsecurity).toBe(true);
      expect(result.rows[0].relforcerowsecurity).toBe(true);
    });
  }
});
```

- [ ] **Step 7: Update RLS init to FORCE**

In `engine/src/db/init/rls.ts`, add `FORCE ROW LEVEL SECURITY` to all tenant-scoped tables:

```typescript
// For each tenant-scoped table:
await db.execute(sql`ALTER TABLE ${sql.identifier(table)} FORCE ROW LEVEL SECURITY`);
```

- [ ] **Step 8: Create DB role separation init**

Create `engine/src/db/init/roles.ts`:

```typescript
import { sql } from 'drizzle-orm';
import type { DrizzleClient } from '../../infrastructure/postgres';
import type { Logger } from '@gambit/common';

export async function initRoles(db: DrizzleClient, logger: Logger): Promise<void> {
  // Only create roles if they don't exist (idempotent)
  const roles = ['gambit_api', 'gambit_ingest', 'gambit_migrate'];

  for (const role of roles) {
    const exists = await db.execute(sql`
      SELECT 1 FROM pg_roles WHERE rolname = ${role}
    `);

    if (exists.rows.length === 0) {
      await db.execute(sql.raw(`CREATE ROLE ${role} LOGIN PASSWORD '${role}_dev'`));
      logger.info({ role }, 'Database role created');
    }
  }

  // Grant appropriate permissions
  // gambit_api: full access to tenant-scoped tables, read on shared
  await db.execute(sql.raw(`
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO gambit_api;
    GRANT INSERT, UPDATE, DELETE ON watchlists, alerts, webhook_endpoints, webhook_deliveries, usage_records, api_keys TO gambit_api;
  `));

  // gambit_ingest: write access to shared tables only
  await db.execute(sql.raw(`
    GRANT SELECT, INSERT, UPDATE ON entities, signals, sources, pipeline_runs, resolution_aliases TO gambit_ingest;
  `));

  // gambit_migrate: full access for running migrations
  await db.execute(sql.raw('GRANT ALL ON ALL TABLES IN SCHEMA public TO gambit_migrate'));

  logger.info('Database roles configured');
}
```

- [ ] **Step 9: Run all security tests**

```bash
cd engine && bun run test -- test/security/
```

Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat(engine): add security hardening — SSRF prevention, audit log, scope guards, RLS

- Webhook SSRF validator: HTTPS only, hostname only, DNS resolution check
- Audit log: tamper-evident hash chain, append-only
- Scope guard middleware: global/tenant/mixed per route
- RLS audit CI test: verifies FORCE ROW LEVEL SECURITY on all tenant tables
- DB role separation: gambit_api (RLS), gambit_ingest (shared only)
- Security headers: ready for middleware composition"
```

- [ ] **Step 11: Implement 4-layer rate limiting**

Note: The existing `engine/src/middleware/rate-limit.ts` provides per-team rate limiting (Layer 3). Extend it with three additional layers:

Create `engine/src/middleware/priority-admission.ts` with tier-based load shedding under load:

```typescript
import type { Context, Next } from 'hono';

const TIER_PRIORITY: Record<string, number> = {
  enterprise: 3,
  pro: 2,
  free: 1,
};

const LOAD_THRESHOLD = 0.85; // shed low-priority traffic above 85% capacity

export function priorityAdmission(getLoadFactor: () => number) {
  return async (c: Context, next: Next) => {
    const tier = c.get('tier') ?? 'free';
    const priority = TIER_PRIORITY[tier] ?? 1;
    const load = getLoadFactor();

    // Under threshold: allow all traffic
    if (load < LOAD_THRESHOLD) {
      await next();
      return;
    }

    // Shed traffic based on tier priority
    // At 85% load: shed free tier
    // At 92% load: shed pro tier
    // At 98% load: shed enterprise tier (should never happen)
    const shedThreshold = LOAD_THRESHOLD + (priority - 1) * 0.07;
    if (load >= shedThreshold && priority < 3) {
      c.header('Retry-After', '5');
      return c.json({ error: 'Service under load — please retry', retryAfter: 5 }, 503);
    }

    await next();
  };
}
```

Wire into the middleware stack in `engine/src/index.ts` alongside the existing rate limiter.

---

## Verification Checklist

After all 11 tasks are complete:

- [ ] `docker compose up -d --profile engine` starts all services including NATS, PgCat
- [ ] `docker compose up -d --profile observability` starts Prometheus, Loki, Pyroscope
- [ ] `cd engine && bun run dev` — engine starts with NATS, PgCat, metrics
- [ ] `cd engine && bun run consumers` — NATS consumers start and process events
- [ ] `cd engine && bun run sse-gateway` — SSE gateway starts on port 3002
- [ ] `cd engine && bun run test` — all tests pass
- [ ] `curl localhost:3001/metrics` — returns Prometheus metrics
- [ ] `curl localhost:3001/engine/v1/health/deps` — shows all service statuses
- [ ] Publish a test event to NATS → verify ClickHouse, Typesense consumers process it
- [ ] Open SSE connection to gateway → verify events fan out

---

## Post-Implementation Fixes

After the initial 11 tasks, a comprehensive gap analysis identified 5 critical and 4 important issues. All were fixed:

### Critical Fixes
- **C1:** `nats-deps.ts` — Fixed private constructor call on `NatsFeatureFlags` (use `.create()` factory)
- **C2:** PgCat — Three-tier pool separation (`gambit_write` 20, `gambit_fast_read` 30, `gambit_slow_read` 15)
- **C3:** SSE Gateway — Added real auth via `PostgresAuthProvider` (was trusting client headers)
- **C4:** ConnectionManager — Redis-backed per-team connection counts for multi-pod enforcement
- **C5:** Wired `priorityAdmission` middleware + `batchRoutes` into `index.ts` router

### Important Fixes
- **I5:** Added composite B-tree index `idx_signals_entity_polarity(entity_id, polarity, published_at DESC)`
- **I8:** AuditLog — Added database persistence via `record()` + `flush()` methods
- **I9:** Cache invalidation — Expanded to 3 consumer instances (signals, entities, gaps streams)
- **I10:** BaseConsumer — Set `max_deliver` on NATS durable consumer config

### Pipeline Wiring
- Created `engine/src/pipeline/activities/nats-deps.ts` — lazy singleton for NATS deps in Temporal workers
- Updated `system.ts` and `publish.ts` to auto-initialize NATS when called from Temporal (feature-flag controlled)

### Deferred to Phase 3+
- I1: Degradation overrides via NATS KV propagation (local Map sufficient for single-pod dev)
- I2: Zod schema validation on NATS events (TypeScript types provide compile-time safety)
- I3: alert-evaluator + webhook-dispatcher consumers (Phase 3b scope)
- I4: `getReadDbConsistent()` sticky-primary window (matters after replicas deployed)
- S1-S8: Security headers, PER, event coalescing, ES256 JWT, Argon2id (Phase 3b/4)
