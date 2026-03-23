# Phase 1.5: Scale Infrastructure — Architecture Design Spec

> **Purpose:** Introduce the infrastructure layer that enables Gambit Engine to serve tens of thousands of concurrent dashboard users and API integrators with sub-second latency, zero-downtime deployments, and defense-in-depth tenant isolation. This phase lands between the completed Phase 1 (Engine Foundation) and Phase 2 (Ingestion Framework) retrofitting, and must be in place before Phase 3a (Gap Analysis) begins.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Event Bus Architecture (NATS JetStream)](#2-event-bus-architecture-nats-jetstream)
3. [PostgreSQL Read Replica + Connection Pooling + Partitioning](#3-postgresql-read-replica--connection-pooling--partitioning)
4. [SSE Gateway + CDN + API Response Optimization](#4-sse-gateway--cdn--api-response-optimization)
5. [Graceful Degradation + Observability](#5-graceful-degradation--observability)
6. [Security Hardening + Multi-Tenancy at Scale](#6-security-hardening--multi-tenancy-at-scale)
7. [Phase Plan Changes](#7-phase-plan-changes)
8. [Hyper-Optimization Registry](#8-hyper-optimization-registry)
9. [Migration Strategy](#9-migration-strategy)

---

## 1. Architecture Overview

### Design Principles

- **Build it right** — invest in infrastructure now rather than retrofitting under load
- **Hybrid deployment** — Docker Compose for dev/staging, K8s for production
- **Both paths equally** — optimize for both real-time dashboard users (SSE, CDN) and API integrators (batch, rate limiting, compression)
- **Event-driven decoupling** — NATS JetStream as the event bus between write path and all consumers
- **Defense in depth** — 4-layer tenant isolation, multi-layer rate limiting, circuit breakers at every boundary

### Updated Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  GAMBIT SIGNAL (React + Tailwind dashboard)                         │
│  Connects to SSE Gateway for real-time, API for data                │
├─────────────────────────────────────────────────────────────────────┤
│  CDN EDGE (Cloudflare/Fastly)                                       │
│  Caches: leaderboard (120s), entity list (60s), entity detail (30s) │
│  Purged via NATS consumer on data changes                           │
├───────────────────────┬─────────────────────────────────────────────┤
│  SSE GATEWAY          │  PUBLIC ENGINE API /engine/v1/              │
│  Dedicated pods       │  Hono pods (autoscale on CPU/req rate)      │
│  Autoscale on         │  Versioned, OpenAPI, Zod-validated          │
│  connection count     │  REST + GraphQL + Batch                     │
│  NATS → client fan-out│  3-tier cache: L1 LRU → L2 Redis → L3 DB  │
├───────────────────────┴─────────────────────────────────────────────┤
│  PgCat (connection pooling + read/write routing)                    │
│  Fast read pool │ Slow read pool │ Write pool                       │
│  Lag-aware replica routing │ Graceful drain on shutdown              │
├─────────────────────────────────────────────────────────────────────┤
│  NATS JETSTREAM (event bus)                                         │
│  Streams: SIGNALS, ENTITIES, GAP_SCORES, ALERTS, SYSTEM            │
│  Consumer groups: clickhouse-sync, neo4j-sync, typesense-sync,     │
│    cache-invalidator, cdn-purge, sse-fanout, alert-evaluator,      │
│    webhook-dispatcher, precompute                                   │
├─────────────────────────────────────────────────────────────────────┤
│  TEMPORAL (workflow orchestration)                                   │
│  Ingestion workflows → PG write → NATS publish                     │
│  Gap scoring workflows → PG write → NATS publish                   │
│  Data lifecycle, FOIA lifecycle                                     │
├─────────────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                         │
│  PostgreSQL Primary + 2 Read Replicas (CloudNativePG)               │
│    signals: monthly partitioned (pg_partman)                        │
│    RLS forced on tenant-scoped tables                               │
│    Separate DB roles: gambit_api, gambit_ingest, gambit_migrate     │
│  ClickHouse (analytics, gap score history, leaderboard MVs)         │
│  Neo4j (graph relationships, claims, traversal)                     │
│  Typesense (fuzzy search, entity resolution)                        │
│  Upstash Redis (cache, rate limits, session, precomputed responses) │
│  MinIO (FOIA documents, raw payloads, exports, archived partitions) │
├─────────────────────────────────────────────────────────────────────┤
│  OBSERVABILITY                                                      │
│  Prometheus (metrics, recording rules, SLO burn rates)              │
│  Grafana (dashboards, alerting P1-P4 tiers)                        │
│  Tempo (distributed traces, adaptive sampling)                      │
│  Loki (structured logs, adaptive log level)                         │
│  Pyroscope (continuous profiling)                                   │
│  Synthetic probes (3+ regions)                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### New Infrastructure Services

| Service | Purpose | Docker Compose | K8s |
|---------|---------|---------------|-----|
| NATS JetStream | Event bus | `nats:2.10-alpine` | 3-node StatefulSet |
| PgCat | Connection pooling + read/write routing | `ghcr.io/postgresml/pgcat` | 2-replica Deployment |
| SSE Gateway | Dedicated SSE service | Same image, different entrypoint | 2-10 HPA Deployment |
| NATS Consumers (5+) | ClickHouse, Neo4j, Typesense, cache, CDN purge | Worker containers | 1 Deployment each |
| Prometheus | Metrics aggregation | `prom/prometheus` | Prometheus Operator |
| Loki + Promtail | Log aggregation | `grafana/loki` | Loki Helm chart |
| Pyroscope | Continuous profiling | `grafana/pyroscope` | Single Deployment |

### Scale Targets

| Metric | Target | Mechanism |
|--------|--------|-----------|
| Concurrent dashboard users | 50K+ | SSE gateway (10 pods × 5K), CDN caching |
| API requests/second | 50K+ | 20 API pods × 2.5K req/s, read replicas |
| Signal ingestion rate | 100K/day | NATS decoupled pipeline, COPY bulk writes |
| Event delivery latency | < 2 seconds | NATS → SSE gateway direct |
| Failover time | < 15 seconds | CloudNativePG + PgCat health checks |
| Data freshness | < 5 minutes | Signal-driven gap recompute via NATS |
| Multi-region | Config change only | NATS superclusters + SSE leaf nodes |

---

## 2. Event Bus Architecture (NATS JetStream)

### What It Replaces

The current Temporal activities that directly write to ClickHouse, Neo4j, Typesense, SSE, and cache inline after PostgreSQL writes. These are tightly coupled — one slow consumer blocks the pipeline, and adding new consumers requires modifying workflows.

### Data Flow

```
Temporal Workflow (ingestion)
    │
    ├──▶ PostgreSQL (source of truth write — synchronous)
    │
    └──▶ NATS JetStream publish (async, after PG commit)
            │
            ├── Stream: SIGNALS
            │     ├── Consumer: clickhouse-sync (batch, 500ms window)
            │     ├── Consumer: typesense-sync (real-time)
            │     ├── Consumer: neo4j-sync (batch, 1s window)
            │     ├── Consumer: cache-invalidator (real-time)
            │     └── Consumer: sse-fanout (real-time)
            │
            ├── Stream: ENTITIES
            │     ├── Consumer: typesense-sync
            │     ├── Consumer: neo4j-sync
            │     └── Consumer: cache-invalidator
            │
            ├── Stream: GAP_SCORES
            │     ├── Consumer: clickhouse-sync
            │     ├── Consumer: sse-fanout
            │     └── Consumer: alert-evaluator
            │
            ├── Stream: ALERTS
            │     ├── Consumer: sse-fanout
            │     ├── Consumer: webhook-dispatcher
            │     └── Consumer: email-dispatcher
            │
            ├── Stream: DLQ
            │     └── Consumer: dlq-monitor (alerting)
            │
            └── Stream: SYSTEM
                  ├── Consumer: health-monitor
                  └── Consumer: usage-aggregator
```

### Stream & Subject Topology

Streams are domain-bounded — one stream per aggregate root. Subjects use dot-delimited hierarchy for filtering:

```
signals.ingested.{source_id}
signals.updated.{signal_id}
entities.updated.{entity_type}.{entity_id}
entities.created.{entity_type}
gaps.recomputed.{entity_id}
gaps.alert_triggered.{entity_id}
alerts.fired.{severity}.{team_id}
alerts.acknowledged.{alert_id}
dlq.{source_stream}.{consumer_group}
system.degradation.override
system.cache.invalidate
```

### Ordering Guarantees

Signals for the same entity must be processed in order by gap scoring and Neo4j sync. NATS JetStream guarantees ordering within a subject. Publishing to `signals.ingested.{entity_id}` ensures per-entity ordering.

### Event Schema

```typescript
interface DomainEvent<T = unknown> {
  id: string;              // ULID
  type: string;            // "signal.ingested", "entity.updated"
  version: number;         // schema version (1, 2, 3...)
  source: string;          // producing service
  timestamp: Date;
  data: T;
  metadata: {
    traceId: string;       // OpenTelemetry propagation
    teamId?: string;       // for tenant-scoped events
    causationId?: string;  // what triggered this event
  };
}

interface EventBus {
  publish(stream: string, event: DomainEvent): Promise<string>;
  publishBatch(stream: string, events: DomainEvent[]): Promise<string[]>;
  subscribe(stream: string, group: string, opts: SubscribeOpts): Promise<Subscription>;
}

interface SubscribeOpts {
  batchSize?: number;      // pull-based batch (default: 1)
  batchWindow?: number;    // ms to accumulate (default: 0)
  maxRetries?: number;     // before DLQ (default: 5)
  startFrom?: 'new' | 'first' | 'sequence' | 'time';
}
```

### Schema Evolution

Version in event type. Consumers declare which versions they handle. EventBus validates against a Zod schema registry. Unknown versions route to DLQ for investigation.

### Retention Policy

7 days / 10GB per stream (whichever comes first). New consumers bootstrap from PostgreSQL/ClickHouse (source of truth), then subscribe to NATS from "now" forward. The event bus is for real-time propagation, not historical replay.

### Dead Letter Queue

Unified `DLQ` stream with subjects mirroring the source: `dlq.signals.clickhouse-sync`. Includes original event + error + attempt count + consumer group. Grafana alert on DLQ depth > 0.

### Consumer Prefetch Tuning

| Consumer | Prefetch | Batch Window | Rationale |
|----------|----------|-------------|-----------|
| sse-fanout | 1 | 0ms | Lowest latency |
| cache-invalidator | 10 | 0ms | Fast, can batch deletes |
| typesense-sync | 25 | 100ms | Typesense batch import |
| neo4j-sync | 50 | 1,000ms | Neo4j batch Cypher 10x faster |
| clickhouse-sync | 500 | 500ms | ClickHouse thrives on large batches |
| webhook-dispatcher | 10 | 0ms | Fan-out per team |
| alert-evaluator | 25 | 200ms | Debounce rapid-fire score updates |

### Backpressure & Monitoring

Per-consumer lag monitoring via NATS HTTP endpoint (`/jsz`) → Prometheus → Grafana. Thresholds: warn at 10K pending, critical at 50K. Backfill events published with `Gambit-Priority: bulk` header so consumers can deprioritize.

### Poison Message Isolation

Consumer-side circuit breaker: after 2 consecutive failures on the same message, NAK with exponential delay. NATS redelivers later while consumer continues processing subsequent messages. After `MaxDeliver` exhausted → DLQ.

### Cross-Stream Atomicity

Gap recompute produces both `gaps.recomputed` and potentially `gaps.alert_triggered`. Both published to the `GAP_SCORES` stream as a single subject hierarchy. Alert-evaluator subscribes to `gaps.>`. Single stream = atomic publish.

### Payload Optimization

Events carry entity ID + changed fields only (not full objects). ~200 bytes vs ~2KB. Routing metadata in NATS headers (entity type, source, priority, trace ID) for filtering without deserialization. Zstd compression for bulk events (70% size reduction).

### Tiered Stream Storage

```
SIGNALS stream:
  R1 replica (memory, 1h retention) → SSE fanout, cache invalidator
  R0 source (file-backed, 7d retention) → ClickHouse sync, Neo4j sync
```

Real-time consumers read from memory replica (sub-millisecond). Batch consumers read from file-backed source.

### Consumer Circuit Breakers

Each consumer wraps its handler in the existing circuit breaker from `engine/src/health/circuit-breaker.ts`. When circuit opens (e.g., ClickHouse down), consumer stops pulling. NATS buffers messages. When circuit closes, consumer resumes and drains backlog. No messages lost, no retry storms.

```typescript
async function consumeWithCircuitBreaker(
  sub: JetStreamPullSubscription,
  breaker: CircuitBreaker,
  handler: (msg: JsMsg) => Promise<void>
) {
  while (true) {
    if (breaker.state === 'open') {
      await sleep(breaker.nextRetryMs);
      continue;
    }
    const msgs = await sub.fetch({ batch: prefetch, expires: 5000 });
    for await (const msg of msgs) {
      try {
        await handler(msg);
        msg.ack();
        breaker.recordSuccess();
      } catch (err) {
        breaker.recordFailure();
        if (msg.info.redeliveryCount >= MAX_DELIVER) {
          await publishToDlq(msg, err);
          msg.term();
        } else {
          msg.nak(backoff(msg.info.redeliveryCount));
        }
      }
    }
  }
}
```

### Dedup Window

Set to 10 minutes (2x Temporal's default 5-minute activity retry timeout). Uses NATS `Nats-Msg-Id` header.

### Multi-Region (Future)

NATS gateway connections between clusters replicate streams with sub-second latency. No application code changes — NATS cluster config only.

### Docker Compose

```yaml
nats:
  image: nats:2.10-alpine
  command: ["--jetstream", "--store_dir=/data", "-m", "8222"]
  ports: ["4222:4222", "8222:8222"]
  volumes: ["nats_data:/data"]
  profiles: ["engine", "all"]
```

---

## 3. PostgreSQL Read Replica + Connection Pooling + Partitioning

### Read/Write Separation

```
                    ┌─────────────────────────────┐
                    │         PgCat Proxy          │
                    │   (connection pooling +       │
                    │    read/write routing)        │
                    └──────────┬──────────────────┘
                               │
                ┌──────────────┼──────────────────┐
                │              │                   │
                ▼              ▼                   ▼
        ┌──────────┐   ┌──────────┐       ┌──────────┐
        │ Primary  │──▶│ Replica 1│       │ Replica 2│
        │ (writes) │   │ (dashboard│       │ (API     │
        │          │   │  reads)   │       │  reads)  │
        └──────────┘   └──────────┘       └──────────┘
```

### Why PgCat Over PgBouncer

| Feature | PgBouncer | PgCat |
|---------|-----------|-------|
| Read/write splitting | No | Built-in |
| Prepared statements | Broken in transaction mode | Full support |
| Multiple upstreams | One per pool | Load-balanced |
| Health checks | Basic | Active with failover |
| Sharding | No | Built-in (future-proofs) |

### Connection Budget (Little's Law)

```
Dashboard pod: 500 req/s × 5ms avg = 2.5 → 5 connections
API pod: 200 req/s × 15ms avg = 3 → 5 connections
Worker pod: 50 writes/s × 10ms avg = 0.5 → 2 connections
NATS consumer pod: 100 batch/s × 20ms avg = 2 → 3 connections

Total: (20 × 5) + (5 × 2) + (3 × 3) = 119 client connections
→ multiplexed to 110 PostgreSQL connections across primary + replicas
```

### Three-Tier Pool Separation

```toml
[pools.gambit_fast_read]    # entity by ID, signal by ID, gap score
pool_size = 30
statement_timeout = 5000

[pools.gambit_slow_read]    # leaderboard, comparison, export
pool_size = 15
statement_timeout = 30000

[pools.gambit_write]        # all mutations
pool_size = 20
statement_timeout = 10000
```

Guarantees that leaderboard aggregations can't starve entity-by-ID lookups.

### Application-Level Routing

```typescript
export function getWriteDb(): DrizzleInstance { /* PgCat → primary */ }
export function getReadDb(): DrizzleInstance { /* PgCat → replica */ }
export function getReadDbConsistent(): DrizzleInstance { /* PgCat → primary for after-write reads */ }
```

### Replication Lag Handling

Three strategies layered:

1. **Causal reads** — return entity from write response directly (no read needed)
2. **Sticky primary window** — after mutation, route user's reads to primary for 2s via Redis flag
3. **LSN tracking** — for critical paths, PgCat waits for replica to reach write LSN

PgCat lag-aware routing: stop sending reads to replica if lag > 2s.

### Signal Table Partitioning

Monthly range partitioning on `published_at` via `pg_partman`:

- At 10K signals/day → ~300K/month — fast index scans, minimal partition count
- Gap scoring `WHERE published_at > NOW() - INTERVAL '6 months'` prunes to exactly 6 partitions
- 3 months pre-created ahead, auto-managed by pg_partman background worker

Index strategy per partition:

```sql
-- B-tree for point lookups
CREATE INDEX idx_signals_entity_polarity ON signals(entity_id, polarity, published_at DESC);
CREATE INDEX idx_signals_source ON signals(source_id, ingested_at DESC);

-- BRIN for time-range scans (tiny, ~1KB per 128 pages)
CREATE INDEX idx_signals_published_brin ON signals USING BRIN (published_at);

-- Partial index for 90% query pattern (excludes expired signals)
CREATE INDEX idx_signals_active ON signals(entity_id, published_at DESC)
  WHERE expires_at IS NULL OR expires_at > NOW();
```

### Cold Storage

Partitions older than 6 months converted to columnar storage (8:1 compression, faster analytical scans). Partitions older than 2 years archived to MinIO as Parquet, detached from PostgreSQL.

### Write Buffering for Backfills

NATS-mediated write batching: backfill events tagged with `Gambit-Priority: bulk` header. Signal-writer consumer switches to PostgreSQL `COPY` mode (50x faster than individual INSERTs, minimal WAL pressure, replica lag < 1s).

### Vacuum Tuning

Per-table autovacuum settings based on churn pattern:

- **entities**: `scale_factor = 0.02`, `cost_delay = 2`, `fillfactor = 80` (frequent counter updates → HOT-optimized)
- **gap_scores**: `scale_factor = 0.01`, `cost_delay = 0`, `fillfactor = 70` (bulk rewrite every 6h)
- **signals**: `scale_factor = 0.05` (append-mostly, rarely updated)

### Database Roles (Least Privilege)

```sql
-- API requests: RLS-scoped, limited permissions
CREATE ROLE gambit_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_scoped_tables TO gambit_api;
GRANT SELECT ON shared_global_tables TO gambit_api;

-- Ingestion workers: shared tables only, no tenant access
CREATE ROLE gambit_ingest;
GRANT SELECT, INSERT, UPDATE ON entities, signals, sources, pipeline_runs TO gambit_ingest;

-- Migrations: elevated, deploy-time only
CREATE ROLE gambit_migrate;
GRANT ALL ON ALL TABLES IN SCHEMA public TO gambit_migrate;
```

### Query Optimization

- **Prepared statements**: top 20 hot queries pre-prepared at connection init
- **Covering indexes**: leaderboard and entity detail return from index without heap fetch
- **Adaptive work_mem**: `SET LOCAL work_mem = '256MB'` for gap scoring transactions only
- **Async commit**: `SET LOCAL synchronous_commit = 'off'` for usage records, search analytics
- **UNLOGGED tables**: pipeline_runs, sync_dlq, search_analytics (2-5x faster writes)
- **pg_stat_statements + auto_explain**: query profiling with alert on p99 > 50ms
- **pg_hint_plan**: force optimal plans on 3-5 hottest queries where planner errs

### Failover Strategy

CloudNativePG auto-promotes replica within 5-10 seconds. PgCat health checks detect failure within 2 seconds. Total failover window: ~12 seconds. During failover: writes return 503 (Temporal retries), reads continue on surviving replica, NATS consumers NAK and NATS buffers.

### Graceful Shutdown

```typescript
process.on('SIGTERM', async () => {
  server.close();                     // stop accepting
  await pool.drain({ timeout: 25_000 }); // drain in-flight
  await pool.end();                   // close connections
  await natsConnection.drain();       // flush NATS buffer
  process.exit(0);
});
```

K8s `terminationGracePeriodSeconds: 30`.

### Advisory Locks (PgCat-Safe)

Transaction-scoped only: `pg_try_advisory_xact_lock()`. Released on commit. Safe with PgCat transaction pooling (session-level locks are NOT safe).

### Connection Warmup

Pre-open `min_connections` and pre-prepare hot queries during startup, before K8s readiness probe passes.

### Connection Leak Detection

Track every connection acquisition with call stack. Alert if held > 30 seconds. Force release to prevent pool exhaustion.

### Production K8s

CloudNativePG operator: 3 instances (1 primary + 2 replicas), gp3 IOPS-optimized storage, WAL archiving to S3, daily scheduled backups.

### Docker Compose

```yaml
pgcat:
  image: ghcr.io/postgresml/pgcat:latest
  ports: ["6432:6432"]
  volumes: ["./docker/pgcat/pgcat.toml:/etc/pgcat/pgcat.toml"]
  depends_on: [postgres]
  profiles: ["engine", "all"]
```

---

## 4. SSE Gateway + CDN + API Response Optimization

### Dedicated SSE Gateway Service

The current SSE manager lives inside the Hono API process. A single Bun process handles ~10K SSE connections before event loop degradation. At 50K concurrent dashboard users, SSE must scale independently.

```
Dashboard Users (SSE)          API Integrators (REST/GraphQL)
        │                               │
        ▼                               ▼
┌──────────────────┐          ┌──────────────────┐
│   SSE Gateway    │          │   API Service    │
│  2-10 pods,      │          │  5-20 pods,      │
│  autoscale on    │          │  autoscale on    │
│  connection count│          │  CPU/request rate│
└────────┬─────────┘          └──────────────────┘
         │ Subscribes to
         ▼
    NATS JetStream
```

### SSE Multiplexing

One NATS consumer per gateway pod (not per connection). In-process fan-out via Map lookup: `entityId → Set<SSEConnection>`. Reduces NATS consumer count from 5K per pod to 3 per pod (one per stream).

### Connection Management

- **Per-team caps**: Pro 25 connections, Enterprise 200. Enforced via Redis counter.
- **Slow consumer eviction**: 64KB send buffer limit. Clients that can't drain get a `reconnect` event with `Last-Event-ID` for resume.
- **Auth refresh**: Re-validate JWT/team access every 15 minutes on long-lived connections.
- **Event rate coalescing**: Per-entity 2-second coalesce window. 500 rapid signals → 1 event with `coalescedCount: 500`.
- **`Last-Event-ID` resume**: NATS sequence number as event ID. On reconnect, replay from that sequence.
- **Watchlist-scoped filtering**: Only deliver events for entities on the team's watchlist.
- **Heartbeat**: `:keepalive\n\n` every 15 seconds.

### Graceful Deploy

Jittered reconnect: on SIGTERM, send `retry: {random 1-10s}\n\n` to each client, wait 2 seconds, close all connections. Spreads reconnections over 10 seconds instead of simultaneous spike.

### Adaptive SSE Quality

Estimate connection RTT. High-latency clients (>500ms) get minimal payloads (entity ID + score only). Low-latency clients get full events. 80% smaller payloads for mobile users.

### SSE Delta Compression

Track last-sent state per entity per connection. Send only changed fields on subsequent events. 60-80% bandwidth reduction during active ingestion periods.

### Geographic Routing

NATS leaf nodes in EU and APAC mirror relevant streams from hub cluster. SSE gateway pods deployed per region. Sub-10ms delivery globally. Deployment change only — zero application code changes.

### Kernel Tuning for SSE Pods

```
fs.file-max = 65535
net.core.somaxconn = 4096
net.ipv4.tcp_keepalive_time = 60
net.ipv4.tcp_keepalive_intvl = 10
net.ipv4.tcp_tw_reuse = 1
net.core.wmem_max = 2097152
```

### CDN Strategy

| Endpoint | Cache TTL | Invalidation |
|----------|-----------|-------------|
| `GET /entities` (list) | 60s | NATS `entities.>` → purge |
| `GET /entities/:id` | 30s | NATS `entities.updated.{id}` → purge |
| `GET /gaps/leaderboard` | 120s | NATS `gaps.>` → purge (debounced 60s) |
| `GET /signals` (feed) | 15s | Short TTL, no active invalidation |
| `GET /domains` | 3600s | Manual purge (rarely changes) |
| Tenant-scoped endpoints | Never at CDN | Redis cache only |

Cache-Control headers with `stale-while-revalidate`. Vary by `Authorization, Accept-Encoding`.

CDN purge via NATS consumer with 10-second debounce (100 signals for same entity → 1 purge).

### Three-Tier Query Result Cache

```
Request → L1 (LRU in-process, 1K entries, 10s TTL, ~0.1ms)
        → L2 (Redis, 100K entries, 30-300s TTL, ~1-3ms)
        → L3 (PostgreSQL/ClickHouse, ~5-200ms)
```

Explicit cache strategies per endpoint with `invalidateOn` NATS event types. Stale-while-revalidate at application layer. NATS consumer handles L2 invalidation + L1 broadcast to all pods.

### Stampede Prevention

- **Request coalescing**: 500 concurrent leaderboard requests → 1 DB query, 499 share the Promise
- **Probabilistic early expiration (PER)**: as TTL approaches 0, one request probabilistically refreshes early
- **Cache warming on startup**: pre-populate top 100 entities + all domain leaderboards before K8s readiness probe passes

### Precomputed API Responses

Leaderboard and top entity responses precomputed by NATS consumer after gap scoring. Pre-serialized + pre-compressed (Brotli, gzip). Served from Redis as raw bytes — zero compute, zero DB, zero compression per request.

### Entity Hot-Tier

Top 1,000 entities (by signal count) materialized in Redis with complete API response shape (entity + gap score + recent signals). Updated by NATS events. 80% of entity detail requests served from single Redis GET.

### Response Compression

Brotli (preferred) + gzip via Hono middleware. 8x bandwidth reduction on typical JSON payloads. Pre-compressed responses for hot paths skip per-request compression overhead.

| Response | Uncompressed | Brotli |
|----------|-------------|--------|
| Entity list (50) | 45KB | 6KB |
| Signal feed (100) | 120KB | 13KB |
| Leaderboard (50) | 25KB | 3.5KB |

### ETag + 304 Responses

Content-hash-based ETags. 30-50% of dashboard requests return 304 (zero body transfer). xxhash32 for fast fingerprinting.

### Streaming JSON

Large responses (signal feeds, exports) streamed via ReadableStream with cursor-based DB fetching (100 rows at a time). Constant ~100KB memory regardless of result size.

### Batch API

`POST /engine/v1/batch` — up to 100 operations per request. Internal routing (reuse service layer, no self-HTTP). Query coalescing: 50 entity lookups → single `IN` query. Per-operation timeout (5s) with HTTP 207 Multi-Status for partial success. Counts as N requests against rate limit quota.

### Binary Protocol Option

`Accept: application/msgpack` for Enterprise API integrators. 30-40% smaller, 5-10x faster parsing.

### HTTP/2 Preload Hints

Entity detail page: `Link: <signals>; rel=preload` header triggers parallel fetch of related resources. 4 sequential requests → 1 round-trip perceived.

### Envelope Stripping

Dashboard requests with `X-Gambit-Client: signal-dashboard` get meta moved to response headers. Data array returned directly — no envelope overhead.

### Encrypted Cursors

AES-256-GCM encrypted cursor state. Prevents enumeration attacks and cursor manipulation. Daily key rotation.

---

## 5. Graceful Degradation + Observability

### Degradation Matrix

| Service Down | Fallback | User Impact |
|---|---|---|
| **ClickHouse** | Leaderboard from Redis cache (stale). Gap scoring reads from PostgreSQL. | Leaderboard up to 2h stale. Banner: "Analytics delayed" |
| **Neo4j** | Graph queries return empty. Acquisition detector disabled. | No graph tab. Entity resolution slightly less accurate. |
| **Typesense** | PostgreSQL `pg_trgm` trigram similarity. | Search slower (~200ms vs 20ms), less typo tolerance. Transparent. |
| **NATS** | Temporal falls back to direct writes. SSE disconnects → polling. | Real-time stops. Banner: "Live updates paused" |
| **Redis** | L1 LRU still works. Rate limits per-pod (approximate). | Slightly higher latency. Transparent. |
| **Temporal** | Ingestion stops. Existing data queryable. | No new signals. Banner: "Data ingestion paused" |
| **MinIO** | Signal data available. Document downloads fail. | Download buttons disabled. |
| **PG Primary** | PgCat → replicas. Writes fail → Temporal retries. 12s failover. | Reads work. Momentary write errors. |
| **PG Replicas** | PgCat → all to primary. Higher load. | Increased latency. Transparent. |

### Cascading Failure Prevention

Admission controller with concurrency budgets on fallback paths. When ClickHouse falls back to PostgreSQL, max 20 concurrent leaderboard queries to PostgreSQL. Excess requests get 503 → CDN serves stale.

### DegradationRegistry

```typescript
class DegradationRegistry {
  // Check manual override (Redis) → then circuit breaker state
  async getStatus(service: ServiceName): Promise<'healthy' | 'degraded' | 'down'>;
  getDegradedServices(): ServiceName[];
}
```

API responses include `X-Gambit-Degraded` header and `meta.degraded` array. Dashboard shows contextual banners.

### Manual Degradation Override

Admin endpoint sets Redis flag to force a service into degraded/down state. Propagated to all pods via NATS. Used for planned maintenance windows.

### Chaos Testing

Admin endpoint for controlled fault injection. Scheduled monthly in staging. Verifies every fallback path returns valid data.

### Dependency-Aware Recovery

K8s init containers + application boot sequence: wait for PostgreSQL → wait for NATS → wait for target service → start consuming.

### Health Check Tiers

```
Tier 1: Liveness — event loop responsive (K8s restarts if fails)
Tier 2: Readiness — PostgreSQL reachable, cache warm (K8s removes from Service)
Tier 3: Dependency — all 8 services checked individually (monitoring dashboard)
```

### Observability Stack

```
Services → OpenTelemetry Collector → Prometheus (metrics)
                                   → Tempo (traces)
                                   → Loki (logs)
                                   → Pyroscope (profiles)
                                   → Grafana (dashboards + alerting)
```

### 20 Critical Metrics

**API:** request duration (by route), request count (by status), active connections, degraded services count

**Database:** query duration (by name), pool active connections, replication lag, dead tuple ratio

**Ingestion:** signals written (by source), pipeline duration, DLQ depth, cost per signal

**NATS:** consumer lag (by stream/consumer), publish errors, stream bytes

**SSE:** active connections (by pod/tier), events delivered, slow consumers

**Gap Scoring:** recompute duration, queue depth

### Distributed Tracing

Trace context propagated via NATS headers (`traceparent`). Single traceId follows a signal from API request through NATS to every consumer and out the SSE gateway.

### Sampling Strategy

- **Errors**: 100% traced (always)
- **Slow requests** (> 1s): 100% traced
- **DLQ events**: 100% traced
- **Normal traffic**: 5% sampled
- **Adaptive**: increases to 25% when error rate elevated, 100% when critical

### Log Strategy

Structured pino JSON → Loki. Adaptive log level: `warn` in normal operation (1% info sample), full `debug` when error rate > 5%. PII redacted via pino `redact` configuration.

### Metric Cardinality Control

Labels capped at bounded values (route: ~30, status: 4, method: 4). Per-entity/per-team metrics go to ClickHouse or Loki, NOT Prometheus. Recording rules pre-aggregate expensive PromQL queries.

### Exemplars

Metrics carry traceId as exemplar. Click latency spike on Grafana chart → opens exact trace in Tempo.

### SLO Framework

| SLO | Target | Window |
|-----|--------|--------|
| API availability | 99.9% | 30 days |
| API p99 latency | < 500ms | 30 days |
| Ingestion freshness | < 5 min (p99) | 30 days |
| SSE delivery latency | < 2s (p99.5) | 30 days |

Grafana SLO dashboard with burn rate. P2 alert when burning budget > 2x.

### Alert Tiers

```
P1 PAGE: PG primary down, all replicas down, 5xx > 5%, ingestion stopped, NATS unhealthy
P2 URGENT: single service degraded, lag > 5s, DLQ > 100, SSE at 80%, gap backlog > 5K
P3 INFORM: p99 > 500ms, dead tuples > 10%, consumer lag > 10K, cache hit < 80%
P4 LOG: individual errors, cache evictions, pool churn
```

Each P1/P2 alert links to a pre-built investigation dashboard.

### Synthetic Monitoring

Lightweight probes from 3+ regions (Lambda/CloudFlare Workers) every 60 seconds. Check API health, leaderboard, entity detail, SSE handshake. Alert if any region can't reach API for 3 consecutive checks.

### Entity-Scoped Correlation

Every log line touching an entity includes `entityId`. Grafana dashboard: enter entity ID → see all signals, recomputes, alerts, DLQ entries, SSE events.

### Per-Tenant Cost Attribution

Middleware tracks compute_ms, db_queries, bytes_out per team. Grafana dashboard: "Top 10 teams by resource consumption." Alert if single team > 20% of total.

### Client-Side RUM

Dashboard sends Performance API beacons to `/engine/v1/telemetry/rum` → ClickHouse. Grafana: TTFB by region, FCP distribution, CDN hit rates.

### Docker Compose Additions

```yaml
loki:
  image: grafana/loki:latest
  ports: ["3100:3100"]
  profiles: ["observability"]

prometheus:
  image: prom/prometheus:latest
  ports: ["9090:9090"]
  profiles: ["observability"]

pyroscope:
  image: grafana/pyroscope:latest
  ports: ["4040:4040"]
  profiles: ["observability"]
```

---

## 6. Security Hardening + Multi-Tenancy at Scale

### 4-Layer Tenant Isolation

**Layer 1: PostgreSQL RLS (forced)**

```sql
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists FORCE ROW LEVEL SECURITY;
CREATE POLICY watchlists_team_isolation ON watchlists
  USING (team_id = current_setting('app.current_team_id'));
```

Applied to: watchlists, alerts, webhook_endpoints, webhook_deliveries, usage_records, foia_requests, api_keys.

**Layer 2: Separate DB roles** — gambit_api (RLS-scoped), gambit_ingest (shared tables only), gambit_migrate (deploy-time only). Ingestion workers physically cannot access tenant-scoped tables.

**Layer 3: Application-level ownership assertion** — `TenantScopedService` base class verifies `record.teamId === this.teamId` on every access. If RLS somehow bypasses, this catches it and fires a P1 security alert.

**Layer 4: CI-enforced RLS audit** — test suite verifies every table with a `team_id` column has RLS enabled and forced. Runs on every migration. Build fails on missing RLS.

### Tenant Resource Governance

Per-tier concurrency limits (concurrent queries), query cost budgets (weighted per endpoint), and bandwidth caps. Prevents a single Enterprise tenant from starving others.

### Column-Level Encryption

Per-team data encryption keys (DEK) encrypted by master key (KEK) in Vault. Applied to: webhook secrets, webhook URLs, FOIA requester info. AES-256-GCM with per-value IV. Enables cryptographic erasure for GDPR — delete DEK and all encrypted tenant data becomes unrecoverable.

### API Key Security

- **Format**: `gbt_{tier}_{random}` (prefix for fast lookup without hash)
- **Storage**: Argon2id hash (19MB memory cost, 2 iterations) — offline brute-force impractical
- **Lookup**: prefix-based DB query → Argon2id verify → Redis verification cache (5 min TTL)
- **Bloom filter pre-check**: 1μs rejection of invalid keys without any I/O (100K keys, 0.01% false positive)
- **Rotation**: new key created, old key gets 24h grace period. Zero-downtime rotation.

### JWT Hardening

- **Algorithm**: ES256 (ECDSA P-256) — asymmetric, no shared secret across pods
- **Access token**: 15-minute TTL (limits theft blast radius)
- **Refresh token**: 7 days, httpOnly secure cookie, hash stored in Redis for server-side revocation
- **Key rotation**: 90-day cycle, previous key valid for 24h grace period
- **Revocation**: generation counter in Redis — O(1) check, no blocklist DB call
- **Verification cache**: LRU cache of verified token hash → payload. Eliminates crypto on repeat tokens.

### Scope Guards

Every route annotated with `scopeGuard('global' | 'tenant' | 'mixed')`. CI test verifies no route is missing a scope guard. Prevents IDOR on endpoints that mix global and tenant data.

### Rate Limiting (4 Layers)

1. **Global**: 50K req/s across all teams (infrastructure protection)
2. **Per-IP on auth endpoints**: 100 req/min (credential stuffing prevention)
3. **Per-team daily quota**: Free 100, Pro 10K, Enterprise unlimited
4. **Per-endpoint**: batch 10/min, export 5/min, GraphQL 60/min

### Account Takeover Detection

- **Impossible travel**: request from US then Germany within 30 minutes → block + notify admin
- **New IP**: first-seen IP for team → log (transparent)
- **Excessive sensitive access**: >20 admin/export/batch requests in 5 min → throttle
- **Key sharing**: API key used from >10 IPs in 5-minute window → notify admin
- **Request fingerprinting**: HyperLogLog cardinality tracking per team (12KB memory). >100 distinct fingerprints → alert.

### Webhook SSRF Prevention

- HTTPS only, hostname only (no IP addresses)
- DNS resolution check against denied CIDRs (private, loopback, link-local, CGNAT)
- Re-validate at delivery time (DNS may change)
- Disable redirects (`redirect: 'error'`)
- HMAC signature (`X-Gambit-Signature`) for receiver verification

### GraphQL Security

- Max depth: 5 levels
- Cost analysis per tier (Free 500, Pro 5000, Enterprise 50000)
- Per-field cost weights (relatedSignals: 5x, basic lookups: 1x)
- 10-second query timeout

### Internal Service Authentication

K8s ServiceAccount-projected JWT tokens for service-to-service calls. NetworkPolicy restricts which pods can reach internal endpoints.

### Audit Log

Append-only table with tamper-evident hash chain. No application role has UPDATE or DELETE. Tracks: API key lifecycle, webhook changes, watchlist changes, auth events, exports, admin actions, FOIA filings. 7-year retention for compliance.

### PII Redaction

Pino `redact` paths for: authorization headers, cookies, API keys, passwords, secrets, tokens, email. Error serializer redacts any field matching `/key|secret|token|password|auth|credential/i`.

### Security Headers

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### CORS

Allowlist: production dashboard, staging. Development: localhost. Credentials enabled. 24h preflight cache.

### Supply Chain Security

Frozen lockfiles (`--frozen-lockfile`). Weekly vulnerability audit. License check (no GPL/AGPL in SaaS). `preinstall` script enforces bun.

### Timing-Safe Comparisons

All security-critical string comparisons use `crypto.timingSafeEqual`. Applied to: webhook signatures, API key prefixes, service tokens, CSRF tokens.

### Secret Management

`SecretManager` with provider abstraction: `env:` prefix for development, `vault:` prefix for production. 5-minute in-memory cache. Vault rotation notifications clear cache automatically.

---

## 7. Phase Plan Changes

### Updated Phase Sequence

```
Phase 1   ✅ Engine Foundation (complete)
Phase 1.5 🆕 Scale Infrastructure (this spec)
Phase 2   ✅ Ingestion Framework (complete — retrofit NATS publishing)
Phase 3a     Gap Analysis + Detectors (+ NATS consumers, degradation)
Phase 3b     Alerts + Watchlists (+ webhook security, tenant encryption)
Phase 4      Signal Dashboard (+ SSE client, RUM, degradation banners)
Phase 5      Advanced Capabilities (+ GraphQL security, batch API, export)
```

### Phase 1.5 Task Groups

| Group | Tasks | Depends On |
|-------|-------|------------|
| 1.5.1 NATS JetStream | Docker Compose, EventBus abstraction, streams, DLQ, schema registry, consumer framework | — |
| 1.5.2 PgCat + Read Replicas | Replace PgBouncer, pool config, connection budget, drain, CloudNativePG | — |
| 1.5.3 Signal Partitioning | Partitioned table, pg_partman, BRIN + partial + covering indexes | 1.5.2 |
| 1.5.4 Retrofit Phase 2 → NATS | Refactor Temporal workflows, deploy consumer services | 1.5.1 |
| 1.5.5 SSE Gateway | Separate service, NATS fan-out, connection management, geo routing | 1.5.1 |
| 1.5.6 Cache Strategy | 3-tier cache, per-endpoint strategies, invalidation consumer, PER, warming | 1.5.1 |
| 1.5.7 CDN Integration | Cache-Control headers, purge consumer, ETag, compression | 1.5.6 |
| 1.5.8 Observability | Prometheus, Loki, adaptive sampling, recording rules, dashboards, synthetic | 1.5.1 |
| 1.5.9 Graceful Degradation | DegradationRegistry, fallbacks, admission control, overrides, chaos | 1.5.8 |
| 1.5.10 Security Hardening | DB roles, RLS audit, Argon2id keys, ES256 JWT, SSRF, audit log, CORS | 1.5.2 |
| 1.5.11 Rate Limiting + Abuse | 4-layer rate limiting, resource governor, anomaly detection, fingerprinting | 1.5.10 |

### Critical Path

1.5.1 (NATS) and 1.5.2 (PgCat) are independent — build in parallel. Everything else flows from those two.

### Impact on Existing Phases

**Phase 3a:** Gap scoring reads from read replica. Recompute triggered via NATS events. ClickHouse sync via NATS consumer. Advisory locks use `pg_try_advisory_xact_lock()`.

**Phase 3b:** Alert delivery via NATS consumers (SSE, webhook, email independent). Webhook secrets encrypted. Audit log for watchlist/alert changes.

**Phase 4:** Dashboard connects to SSE gateway. Reads `X-Gambit-Degraded` header. RUM beacons. `X-Gambit-Client` header for envelope stripping.

**Phase 5:** GraphQL with depth/cost limits. Batch API with internal routing. Export via slow read pool.

---

## 8. Hyper-Optimization Registry

| ID | Name | Section | Impact |
|----|------|---------|--------|
| H1 | Payload minimization (IDs + diff) | Event Bus | 90% NATS storage reduction |
| H2 | Header-based routing without deserialization | Event Bus | Filter without parsing |
| H3 | Tiered stream storage (memory + file-backed) | Event Bus | Sub-ms SSE delivery |
| H4 | Consumer prefetch tuning per service | Event Bus | Optimal batch sizes |
| H5 | Zstd compression for bulk events | Event Bus | 70% size reduction on backfills |
| H6 | Dedup window = 2x Temporal retry window | Event Bus | Prevents duplicate events |
| H7 | Consumer-side circuit breakers | Event Bus | No retry storms |
| H8 | NATS superclusters for multi-region | Event Bus | Sub-10ms global delivery |
| H9 | Prepared statement caching (top 20) | PostgreSQL | Eliminates parse/plan overhead |
| H10 | Covering indexes for hot queries | PostgreSQL | Index-only scans |
| H11 | pg_stat_statements + auto_explain | PostgreSQL | Query regression detection |
| H12 | Connection warmup on pod startup | PostgreSQL | Zero cold-start latency |
| H13 | Adaptive work_mem per transaction | PostgreSQL | Gap scoring in-memory |
| H14 | HOT updates with tuned fillfactor | PostgreSQL | Counter updates skip index maintenance |
| H15 | UNLOGGED tables for ephemeral data | PostgreSQL | 2-5x faster writes |
| H16 | Async commit for non-critical writes | PostgreSQL | Eliminates fsync for usage |
| H17 | 3-tier connection pools | PostgreSQL | Slow queries can't starve fast reads |
| H18 | Columnar storage for cold partitions | PostgreSQL | 8:1 compression |
| H19 | Partial indexes for 90% query pattern | PostgreSQL | 40-60% smaller indexes |
| H20 | pg_hint_plan for critical paths | PostgreSQL | Force optimal plans |
| H21 | ETag content-hash for 304 responses | API | 30-50% zero-transfer |
| H22 | Streaming JSON for large responses | API | Constant memory |
| H23 | Request coalescing for thundering herd | API | 10K users = 1 DB query |
| H24 | HTTP/2 preload hints | API | 4 requests → 1 round-trip |
| H25 | SSE delta compression | SSE | 60-80% bandwidth reduction |
| H26 | SSE multiplexing (1 consumer per pod) | SSE | 1,666x NATS overhead reduction |
| H27 | MessagePack binary protocol | API | 30-40% smaller, 10x faster parse |
| H28 | Encrypted cursors | API | Prevents enumeration |
| H29 | Envelope stripping for first-party | API | 200 bytes/response savings |
| H30 | Adaptive SSE quality by connection health | SSE | 80% smaller for mobile |
| H31 | Adaptive trace sampling during incidents | Observability | 100% visibility when needed |
| H32 | Metric cardinality control | Observability | Prevents Prometheus OOM |
| H33 | Exemplars (metrics → traces) | Observability | One-click drill-down |
| H34 | Synthetic monitoring from 3+ regions | Observability | External reachability |
| H35 | Log sampling with error-rate escalation | Observability | 100x volume reduction |
| H36 | Pre-built incident dashboards | Observability | Sub-2-min diagnosis |
| H37 | JWT verification caching | Security | Near-zero CPU for repeat tokens |
| H38 | RLS context via connection variable | Security | Eliminates 1 round-trip/request |
| H39 | Bloom filter for API key pre-check | Security | 1μs invalid key rejection |
| H40 | Request fingerprinting (HyperLogLog) | Security | 12KB abuse detection |
| H41 | Timing-safe comparisons | Security | Prevents timing attacks |
| H42 | Cryptographic erasure for GDPR | Security | No backup purge needed |
| H43 | Security headers hardening | Security | Defense in depth |
| H44 | Precomputed API responses | API | Zero-compute leaderboard |
| H45 | PostgreSQL pipeline mode for batch | PostgreSQL | 94% batch latency reduction |
| H46 | Kernel tuning for SSE pods | SSE | 50K+ connections per pod |
| H47 | Entity hot-tier in Redis | API | 80% of traffic from Redis GET |
| H48 | Compile-time route validation | API | Catches errors before production |

---

## 9. Migration Strategy

### Zero-Downtime Migration Playbook

Each Phase 1.5 component has a sequenced, non-destructive migration path with explicit rollback steps.

**Signal Table Partitioning:**
1. Create `signals_partitioned` alongside existing `signals`
2. Dual-write trigger: new INSERTs go to both tables
3. Backfill historical data in batches (1000/s, off-peak)
4. Verify row counts match
5. Swap: rename tables
6. Monitor 48h → drop legacy table
7. **Rollback**: rename tables back

**PgBouncer → PgCat:**
1. Deploy PgCat on new port (6433) alongside PgBouncer (6432)
2. Route 5% → 25% → 50% → 100% traffic over 48h
3. Monitor latency, errors, connections at each step
4. Decommission PgBouncer
5. **Rollback**: route back to PgBouncer

**NATS Retrofit:**
1. Deploy NATS + all consumers (streams empty)
2. Temporal workflows: publish to NATS AND continue direct writes (shadow mode)
3. Verify consumers process correctly
4. Remove direct writes (NATS authoritative)
5. Monitor 48h
6. **Rollback**: feature flag `nats.publish.enabled = false` → instant revert to direct writes

**SSE Gateway:**
1. Deploy gateway pods alongside existing inline SSE
2. Route dashboard SSE to gateway (Caddy/Ingress)
3. Monitor connection counts, event delivery latency
4. Remove inline SSE from API pods
5. **Rollback**: route SSE back to API pods

### Feature Flags

Every new infrastructure path controlled by Redis-backed feature flag. Rollback is a key change, not a deploy:

```
flag:nats.publish.enabled
flag:nats.consumers.clickhouse
flag:nats.consumers.neo4j
flag:nats.consumers.typesense
flag:nats.consumers.sse
flag:pgcat.enabled
flag:sse.gateway.enabled
flag:cache.l2.enabled
flag:cdn.purge.enabled
```

### Load Testing

k6 scenarios verifying scale targets before production:
- 50K concurrent dashboard users (SSE + page loads)
- 10K API req/s (integrator simulation)
- 50K signal ingestion storm (backfill)

Success criteria: p99 < 500ms, zero 5xx, replication lag < 2s, consumer lag < 10K.

### Deployment Strategy

Canary deployments via Argo Rollouts: 5% → 25% → 50% → 100% with automated error-rate analysis. Auto-rollback if 5xx rate > 1% at any step.

### API Versioning

URL-based: `/engine/v1/` and `/engine/v2/`. 12-month sunset policy. `Sunset` and `Deprecation` headers on v1 responses.

### Data Lifecycle

| Data | Hot | Warm | Cold | Archive | Delete |
|------|-----|------|------|---------|--------|
| Signals (PG) | 0-6mo (B-tree) | 6-24mo (columnar) | 2-5yr (MinIO Parquet) | — | >5yr |
| Gap history (CH) | — | — | — | — | >3yr (TTL) |
| Pipeline runs | — | — | — | — | >90d |
| DLQ entries | — | — | — | — | >30d |
| Audit log | — | — | — | — | >7yr (compliance) |
| NATS streams | — | — | — | — | >7d |
| MinIO exports | — | — | — | — | >7d |

### Disaster Recovery

| Tier | Mechanism | RPO | RTO |
|------|-----------|-----|-----|
| Continuous WAL → S3 | Point-in-time recovery | ~0 | 15-30min |
| Daily pg_basebackup → S3 | Full snapshot | 24h | 30-60min |
| Cross-region streaming | DR replica promotion | <1h | 5-15min |

Monthly restore test to staging.

### Backup Testing

Monthly: restore daily backup to staging, verify data integrity, run smoke tests against restored database. Automated via Temporal scheduled workflow.
