# Phase 2: Ingestion Framework — Design Spec

> **Goal:** Build the generic ingestion pipeline that turns raw external data into classified, entity-resolved signals stored in PostgreSQL, synced to ClickHouse and Neo4j, and delivered in real-time via SSE/webhooks. Migrate the existing RSS pipeline as the first source, add 9 behavioral sources, and implement the self-learning promotion loop from day one.

**Parent spec:** `docs/v2/2026-03-22-gambit-engine-signal-design.md` (Section 5)
**Depends on:** Phase 1 — Engine Foundation (complete)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Scheduler Architecture](#2-scheduler-architecture)
3. [Pipeline Workflow — Parent + Child Fan-out](#3-pipeline-workflow--parent--child-fan-out)
4. [Fetcher Strategies](#4-fetcher-strategies)
5. [Parser Architecture](#5-parser-architecture)
6. [Entity Resolution](#6-entity-resolution)
7. [Content Deduplication](#7-content-deduplication)
8. [Signal Writer & ClickHouse Sync](#8-signal-writer--clickhouse-sync)
9. [Graph Updater — Claims to Neo4j](#9-graph-updater--claims-to-neo4j)
10. [Event Publisher — SSE & Webhooks](#10-event-publisher--sse--webhooks)
11. [Self-Learning Promotion Loop](#11-self-learning-promotion-loop)
12. [Backfill Strategy](#12-backfill-strategy)
13. [Source Health & Circuit Breakers](#13-source-health--circuit-breakers)
14. [RSS Migration — Cutover Strategy](#14-rss-migration--cutover-strategy)
15. [Source Catalog](#15-source-catalog)
16. [Operational Architecture — Workers, Observability, Testing](#16-operational-architecture--workers-observability-testing)
17. [Hyper-Optimizations](#17-hyper-optimizations)
18. [Schema Additions](#18-schema-additions)

---

## 1. Architecture Overview

### Pipeline Flow

```
SourceRegistry → Temporal Schedules → Fetcher → Parser/Agent → Classifier →
EntityResolver → SignalWriter → GraphUpdater → EventPublisher
```

### Workflow Model — Parent + Child Fan-out

```
SourceIngestionWorkflow (parent)
  │
  ├── FetchActivity (HTTP call, pagination, prefetch buffer)
  ├── ParseActivity (structured / agent / hybrid routing)
  │
  └── Fan-out: SignalBatchWorkflow[] (child, 25 signals per batch)
        ├── ClassifyActivity
        ├── EntityResolveActivity (batch-collect-then-resolve)
        ├── SignalWriteActivity (PostgreSQL + ClickHouse dual-write)
        ├── GraphUpdateActivity (Neo4j claims + aggregate edges)
        └── EventPublishActivity (Redis Pub/Sub → SSE + webhook enqueue)
```

The parent handles fetch + parse (sequential I/O), then fans out to child workflows for parallel processing. Each child processes a batch of ~25 signals through classify → resolve → write → graph → publish. Partial success — if 3/100 signals fail, the other 97 land. Failed signals go to DLQ with full provenance.

### Data Flow

```
External Sources (10 source types, 160+ configs)
    │
    ▼
Temporal Workers (task queues: fetch, parse-structured, parse-agent, resolve, write, system)
    │
    ├──▶ PostgreSQL (source of truth: signals, entities, sources, pipeline runs)
    │       ├──▶ ClickHouse (denormalized analytics projection, batch buffered)
    │       ├──▶ Typesense (entity search index, real-time)
    │       └──▶ Neo4j (claim graph, aggregate edges, concept nodes)
    │
    ├──▶ MinIO (bulk download files, raw documents)
    │
    ├──▶ Redis (resolution cache, SSE pub/sub, rate limiting, intent log)
    │
    └──▶ SSE + Webhooks (real-time delivery)
```

---

## 2. Scheduler Architecture

**Mechanism: Temporal Schedules API.** Each source gets a first-class Temporal Schedule that triggers `SourceIngestionWorkflow`. The Schedules API supports pause, backfill, overlap policies, and jitter natively.

### ScheduleManager Service

A `ScheduleManager` service syncs source configs to Temporal schedules:

- **On engine startup:** iterates all `enabled = true` sources, creates or updates Temporal Schedules to match their `fetcher_schedule` cron expression. Schedules for disabled sources are paused.
- **On source mutation:** API endpoints for source create/update/delete call `ScheduleManager.sync(sourceId)` to keep schedules in sync.
- **Overlap policy:** `SKIP` — if a previous run is still executing, skip this trigger. Prevents pile-up on slow sources.
- **Jitter:** 30-second random jitter per schedule to prevent all sources polling at exactly :00.

### Dependency-Aware Scheduling

Sources with `dependencies[]` are enforced at schedule trigger time:

| Requirement | Behavior |
|-------------|----------|
| `healthy` | Dependent source must have `health_circuit_state = 'closed'`. If not, skip run. |
| `completed-recently` | Dependent source must have a successful pipeline run within its schedule interval. |
| `provides-input` | Dependent source's latest pipeline run output is passed as input to this source's fetch activity. |

When the `ScheduleManager` creates a schedule for a source with `provides-input` dependencies, it uses Temporal's signal mechanism: the parent source's workflow signals the dependent source's workflow upon completion with its output payload.

### Adaptive Scheduling

After 2 weeks of ingestion, a weekly `ScheduleOptimizationWorkflow` adjusts poll frequencies:

- >80% of fetches return zero new items → double the cron interval (floor: weekly)
- >50% of fetches hit the max-items cap → halve the interval (ceiling: 15 minutes)
- Sources with active SSE subscribers get poll frequency priority
- Optimized schedule stored as `fetcher_schedule_optimized`; original preserved for reference

---

## 3. Pipeline Workflow — Parent + Child Fan-out

### Parent: SourceIngestionWorkflow

```typescript
// Pseudocode
async function sourceIngestionWorkflow(sourceId: string, input?: any) {
  const source = await getSourceConfig(sourceId);
  const run = await createPipelineRun(sourceId);

  // Stage 1: Fetch (with prefetch pipelining)
  const fetchResults = await fetchActivity(source, input);

  // Stage 2: Parse (routes by parser_mode)
  const parsedSignals = await parseActivity(source, fetchResults);

  // Stage 3: Content-hash dedup before fan-out
  const newSignals = await dedupActivity(parsedSignals);

  // Stage 4: Fan-out to child workflows (batches of 25)
  const batches = chunk(newSignals, 25);
  const results = await Promise.allSettled(
    batches.map(batch =>
      executeChildWorkflow(signalBatchWorkflow, { source, batch })
    )
  );

  // Stage 5: Aggregate results, update source health
  await updatePipelineRun(run, results);
  await updateSourceHealth(source, results);
}
```

### Child: SignalBatchWorkflow

Each child processes a batch through classify → resolve → write → graph → publish. Activities execute sequentially within the child (each stage depends on the previous), but multiple children execute concurrently.

Failed signals within a batch are DLQ'd individually — the batch continues processing remaining signals.

### Pipeline Run Tracking

Every workflow execution creates a `pipeline_runs` record tracking per-stage counts:

```
fetched → parsed → deduplicated → classified → resolved → written → graphed → published → failed → dlqd
```

Duration, errors, and cost metrics are recorded on completion.

---

## 4. Fetcher Strategies

Generic HTTP layer with strategy per `fetcher_type`. All strategies handle auth, rate limiting, retries, and incremental state tracking.

### Fetcher Types

| Type | Behavior | Used By |
|------|----------|---------|
| `rss` | Parse RSS/Atom XML, extract articles. Conditional fetch via ETag/If-Modified-Since. | RSS feeds (150+) |
| `api` | JSON REST API with configurable pagination (offset, cursor, date-range). | USPTO, SEC EDGAR, USASpending, Job Postings, Semantic Scholar, FCC, Federal Register |
| `bulk-download` | Download large files (ZIP/XML/CSV) from URL, store in MinIO, stream-decompress and yield records. | Lobbying disclosures (LDA) |
| `scrape` | Headless browser fetch with CSS/XPath extraction. (Reserved for Phase 5.) | — |
| `foia` | FOIA request lifecycle. (Reserved for Phase 5.) | — |

### Pagination Strategies

| Strategy | State Tracking |
|----------|---------------|
| `offset` | `fetch_state.lastOffset` |
| `cursor` | `fetch_state.lastCursor` |
| `date-range` | `fetch_state.lastDate` — fetches records since last successful date |
| `none` | Full fetch each run (for feeds/endpoints with no pagination) |

### Shared Rate Limiter

Rate limits are enforced via **Redis token bucket keyed per source**. Both `SourceIngestionWorkflow` and `SourceBackfillWorkflow` acquire tokens from the same bucket. Backfill workflows get lower priority — when the bucket is contested, live ingestion wins.

Sources in the same `upstream_group` share an additional group-level rate limiter to avoid hammering the same upstream API from multiple source configs.

### Conditional Fetch

For sources supporting HTTP caching headers:
- Store `fetch_state.lastETag` and `fetch_state.lastModified` after each successful fetch
- Send `If-None-Match` / `If-Modified-Since` on subsequent requests
- HTTP 304 → short-circuit the entire pipeline run (zero parsing, zero cost)

### Streaming for Bulk Downloads

Bulk download files are stream-decompressed via async iterators. The parser processes records as they stream — never holding the full file in memory. Combined with the ClickHouse batch writer buffer, bulk download → parse → write operates in constant memory regardless of file size.

---

## 5. Parser Architecture

### Parser Modes

```
parser_mode = 'structured'  →  deterministic TypeScript module (fast, free, testable)
parser_mode = 'agent'        →  LLM extraction with prompt + schema (flexible, costs tokens)
parser_mode = 'hybrid'       →  try structured, fall back to agent on failure
```

### Structured Parsers as Code

Each structured parser implements a `Parser` interface:

```typescript
interface Parser {
  sourceId: string;
  parse(raw: FetchResult): ParsedSignal[];
  validate?(signal: ParsedSignal): ValidationResult;
}
```

Registered in a `ParserRegistry` map keyed by `source.parser_ref`. Located in `engine/src/parsers/`. Unit-tested with fixture data from `engine/test/fixtures/`.

### Agent Prompts as Database-Managed Templates

- `parser_prompt`: Mustache-style template with variables (`{{raw_text}}`, `{{source_category}}`, `{{entity_domains}}`)
- `parser_response_schema`: JSON Schema that agent output must validate against
- Prompt iteration doesn't require deployment — update the source row

### Prompt Versioning

When `parser_prompt` or `parser_response_schema` is updated, the old values are written to `parser_prompt_versions`:

```sql
CREATE TABLE parser_prompt_versions (
  id SERIAL PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  version INT NOT NULL,
  prompt TEXT NOT NULL,
  response_schema JSONB NOT NULL,
  accuracy_at_rotation NUMERIC,
  dlq_rate_at_rotation NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, version)
);
```

Rollback: `UPDATE sources SET parser_prompt = (SELECT prompt FROM parser_prompt_versions WHERE source_id = $1 AND version = $2)`.

### Prompt Security — Sandboxed Architecture

Raw external content is isolated in a clearly delimited block:

```
<system>You are extracting structured signals. Output ONLY valid JSON matching the schema.</system>
<schema>{{parser_response_schema}}</schema>
<document>{{raw_text}}</document>
```

Pre-sanitization: strip XML/HTML processing instructions, truncate to `parser_max_input_tokens` (default 4,000). The response schema validation acts as a structural firewall — regardless of LLM output, it must validate against the JSON Schema or it's DLQ'd.

### Multi-Model Routing

`parser_model TEXT` on the sources table (e.g., `'claude-haiku-4-5'`, `'claude-sonnet-4-6'`). The agent activity routes to the configured model. Default: cheapest capable model. Cost tracking (`cost_per_signal`) makes model upgrade ROI visible.

### Hybrid Mode Flow

1. Run structured parser
2. If it throws or returns zero signals from non-empty input → fall back to agent
3. Fallback logged to `extraction_samples` with `source = 'hybrid-fallback'`
4. High fallback rates indicate structured parser degradation

### Batch LLM Prompts

Instead of one LLM call per signal, pack multiple items into a single prompt: "Extract structured data from each of the following N articles. Return a JSON array." Batch size tuned per source based on average item size vs model context window. Per-item response schema validation — one bad extraction doesn't reject the batch. Cuts agent costs 30-40%.

### Token Budget Tracking

Every agent call logs input/output token counts to the source's `cost_total_tokens_in/out` counters. `cost_per_signal` computed as rolling average. A per-source `cost_budget_usd` field (nullable) sets a monthly ceiling — exceeded budget switches source to structured-only with admin alert.

### Parse Result Caching

RSS feeds re-serve the same items across polls. Content hash is computed immediately after fetch and checked against PostgreSQL's unique index before parsing. Items that already exist skip the entire pipeline from parse onward.

---

## 6. Entity Resolution

### Tiered Resolution Strategy

Resolution follows a strict priority order:

1. **Resolution cache** — Redis lookup on normalized entity name → entity ID. TTL 1 hour. Sub-millisecond.
2. **Exact match on `external_ids`** — ticker, CIK, DUNS, FRN, LEI. Deterministic.
3. **Exact match on `aliases`** — `resolution_aliases` table.
4. **Fuzzy match via Typesense** — confidence threshold >0.85 with domain-weighted boosting.
5. **Create unverified entity** — `status = 'unverified'`, `meta.created_by = 'resolver'`.

### Domain-Weighted Resolution

Source config carries `category` and `domains[]`. Typesense query boosts entities whose `domains[]` overlap with the source's domains. "Mercury" in a defense-domain source ranks Mercury Systems above all others. For fuzzy matches between 0.85 and 0.90, domain overlap is a hard gate — no overlap, no match, goes to unverified.

### Source-Weighted Confidence

Government/filing sources get `sourceConfidenceBoost = +0.15`, news gets `+0.0`. A 0.78 Typesense score from a patent source effectively becomes 0.93, clearing the 0.85 threshold.

### Batch Resolution

The entity resolution child workflow collects all unique entity names from its signal batch, deduplicates, resolves the unique set, then maps results back to individual signals. For a batch of 25 signals with 100 entity mentions, only ~40 unique resolutions are needed.

### Resolution Session Cache

A per-worker resolution session cache persists across batches within the same pipeline run. Entity "NVIDIA CORPORATION" is resolved once for the entire run, not once per batch.

### Resolution Cache Warming

On engine startup, pre-populate Redis resolution cache with the top 1,000 entities by signal count. These follow a power law distribution and account for the majority of resolutions.

### Bloom Filter for Unknown Entities

In-memory Bloom filter containing all known entity names and aliases. If the Bloom filter says "definitely not present," skip directly to unverified entity creation — no network round trip. Rebuilt hourly from PostgreSQL. 1% false positive rate.

### Feedback Loop

When a user confirms or rejects a resolution:
1. Writes to `resolution_feedback` table (Phase 1 schema)
2. Confirmed: inserts high-confidence `resolution_alias` for future exact-match
3. Rejected: adds negative example, evicts bad mapping from Redis cache
4. Daily aggregation workflow adjusts `resolution_aliases` confidence scores

### Entity Merge Workflow

`EntityMergeWorkflow` handles discovered duplicates (e.g., "Alphabet Inc" and "Google LLC"):
1. Reassign all signals from loser to winner entity
2. Transfer aliases, redirect edges
3. Update resolution cache
4. Create `resolution_alias` for loser's name → winner's ID
5. Tombstone loser: `status = 'merged'`, `meta.merged_into = winnerId`
6. Recompute signal counts atomically
7. Neo4j: `MATCH (n {id: $loserId}) DETACH DELETE n` after reassigning relationships
8. ClickHouse: re-denormalize all rows with `entity_id = loserId`

### Unverified Entity Triage

Unverified entities are surfaced via a filtered query on `status = 'unverified'` sorted by signal count descending. High signal-count unverified entities get reviewed first — natural priority.

---

## 7. Content Deduplication

### Layer 1: Exact Dedup via Content Hash

Hash: `SHA-256(normalized_title + source_url + published_date)`. Title normalization: lowercase, strip punctuation, collapse whitespace. The `UNIQUE` constraint on `content_hash` handles dedup at the database level. Insert conflicts counted as `deduplicated` in pipeline runs.

Content hash is computed immediately after fetch, before parsing — exact dupes never burn LLM tokens.

### Layer 2: Near-Duplicate Detection via SimHash

SimHash (locality-sensitive hash) computed on normalized title + first 500 chars of content. Stored as `simhash BIGINT` on signals. Before writing, query for signals with Hamming distance ≤ 3 from the same entity within a 48-hour window. Matches get linked via `related_signals` with relation `'corroborates'` rather than being discarded.

### Layer 3: Event-Level Dedup

After entity resolution, compute an event fingerprint: `SHA-256(entity_id + signal_category + date_bucket)` where `date_bucket` is `published_at` rounded to nearest 12 hours. Signals sharing an event fingerprint are candidates for clustering. Within a cluster, the LLM classifier confirms whether they describe the same event. Confirmed matches linked as `'corroborates'`.

Catches semantically identical coverage across different publications: "Nvidia Reports Record Q4 Revenue" and "NVDA Beats Street Estimates in Fourth Quarter."

### Cross-Language Dedup

For sources with `meta.language !== 'en'`, the agent parser extracts a canonical English title as part of its extraction output. This normalized title feeds into the event fingerprint. Marginal cost — already running the agent for non-English parsing.

### Corroboration Boost

When a new signal joins an event cluster, recompute confidence for all signals in the cluster: `base_confidence + (0.03 × corroboration_count)`, capped at 0.99. The cluster's primary signal (first ingested from highest-tier source) stores `corroboration_count` directly for queryable gap analysis.

### Cross-Entity Dedup

A single article referencing multiple entities: the primary entity gets the signal, secondary entities are recorded in `secondary_entities[]`. Related signals back-reference the primary. Avoids N duplicate records for an article mentioning N entities.

---

## 8. Signal Writer & ClickHouse Sync

### PostgreSQL — Source of Truth

The `SignalWriterActivity` inserts signals into PostgreSQL, updates `entity.signal_count_declarative` / `signal_count_behavioral` counters, and handles dedup via `content_hash` unique constraint.

For batch sizes >25, uses `COPY FROM STDIN` with binary format (5-10x faster than individual inserts). Content hash dedup handled by pre-check query rather than unique constraint exception path.

### ClickHouse — Denormalized Analytics Projection

**Dual-write, not replication.** The `SignalWriterActivity` writes a denormalized analytics row to ClickHouse after the PostgreSQL write succeeds. The ClickHouse row is a flattened projection — signal fields joined with entity name, type, sector, source name, and domains at write time. No JOINs needed in ClickHouse.

### ClickHouse Table Design

```sql
CREATE TABLE signals_analytics (
  signal_id String,
  entity_id String,
  entity_name String,
  entity_type String,
  entity_sector String,
  entity_version UInt32,
  source_id String,
  source_name String,
  polarity String,
  category String,
  tier UInt8,
  domains Array(String),
  intensity Float64,
  confidence Float64,
  is_backfill UInt8,
  corroboration_count UInt16,
  published_at DateTime,
  ingested_at DateTime,
  updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(published_at)
ORDER BY (entity_id, polarity, published_at);
```

### Buffered Batch Writer

ClickHouse writes go through an in-memory buffer per Temporal worker. Flushes every 5 seconds or 500 rows, whichever comes first. Backfill workflows increase threshold to 2,000 rows. Matches ClickHouse's optimal batch insert pattern.

### Failure Isolation

If ClickHouse is down, the PostgreSQL write still succeeds. ClickHouse failures log to `clickhouse_sync_dlq` table. An hourly `ClickHouseReconciliationWorkflow` queries PostgreSQL for signals with `ingested_at` in the last 2 hours, compares against ClickHouse, and backfills gaps.

### Entity Version Tracking

`entity_version INT` on the ClickHouse row matches a version counter on PostgreSQL entities. Entity updates/merges trigger async re-denormalization: `ALTER TABLE signals_analytics UPDATE entity_name = ..., sector = ... WHERE entity_id = $1`. The reconciliation workflow also checks version drift.

### Materialized Views for Gap Analysis (Phase 3 Ready)

Pre-aggregate signal counts per entity per domain per rolling window (7d, 30d, 90d). Defined in Phase 2 so data accumulates — Phase 3 has warm data from day one. MVs use `published_at` as the anchor, never `now()`, so backfilled data lands in correct buckets.

After backfill completion, a cache invalidation event keyed by `(entity_id, min(published_at), max(published_at))` evicts cached gap scores covering that range.

---

## 9. Graph Updater — Claims to Neo4j

### Claim-to-Edge Mapping

Each `Claim` from parser output becomes a Neo4j relationship:

```
(subject:Entity {id}) -[PREDICATE {confidence, signalId, sourceId, publishedAt, validFrom, validUntil, status}]-> (object:Entity|Concept {id})
```

Claims where subject or object failed entity resolution are stored in signal's `extracted_claims` JSONB but skipped for Neo4j. Predicates normalized to uppercase: `filed-patent` → `FILED_PATENT`.

### Temporal Edges

Every relationship carries temporal properties:
- `valid_from`: signal's `published_at`
- `valid_until`: nullable (open-ended by default)
- `status`: `active`, `superseded`, `retracted`

When a signal with relation `'supersedes'` arrives, the Graph Updater sets `valid_until` and `status = 'superseded'` on the old edge. Graph queries default to `WHERE r.status = 'active' AND (r.valid_until IS NULL OR r.valid_until > $now)`.

Historical queries: `WHERE r.valid_from <= $asOf AND (r.valid_until IS NULL OR r.valid_until > $asOf)`.

### Concept Nodes

When the Entity Resolver can't match a claim's object to any entity and the predicate indicates the object is a concept (per predicate registry), create or merge a `Concept` node:

```
(:Concept {name, normalized_name, domain, mention_count})
```

Predicate registry: `predicate → {subject_type: 'entity', object_type: 'entity' | 'concept'}`.

High-mention concepts surface organically — "solid-state-battery" appearing in 200 claims across 15 entities reveals a technology trend through the graph.

### Aggregate Edges

After writing claim edges, the Graph Updater maintains materialized `AGGREGATE` relationships:

```cypher
MATCH (a)-[r]->(b)
WHERE a.id = $entityA AND b.id = $entityB AND type(r) <> 'AGGREGATE'
WITH a, b, count(r) as edge_count, avg(r.confidence) as avg_confidence,
     max(r.published_at) as latest, collect(distinct type(r)) as relation_types
MERGE (a)-[agg:AGGREGATE]->(b)
SET agg.edge_count = edge_count, agg.avg_confidence = avg_confidence,
    agg.latest_signal_at = latest, agg.relation_types = relation_types,
    agg.updated_at = datetime()
```

Summary layer for fast relationship strength lookups. Detail layer (individual claim edges) for provenance deep-dive.

### Batch Cypher Operations

Claims grouped by relationship type, executed as batched `UNWIND ... MERGE` Cypher queries. For a batch of 25 signals with 80 claims across 6 relationship types → 6 Cypher calls instead of 80.

### Claim Deduplication Before Network Call

Local set of `(subject, predicate, object)` triples written in this pipeline run. Skip claims already in the set — eliminates redundant MERGE calls from corroborating signals.

### Idempotent Writes

Neo4j `MERGE` on key `(subject_id, predicate, object_id, signal_id)`. Same signal creates same relationship only once. Different signals independently establish the same relationship (corroboration). Confidence updated to max of existing and new values.

### Consistency Model

Neo4j is a read-optimized projection, not source of truth. PostgreSQL `extracted_claims` is authoritative.

Weekly `GraphReconciliationWorkflow`: samples 1,000 random signals, verifies claims exist as Neo4j edges, reports discrepancy rate. If >1%, triggers full reconciliation for last 30 days.

---

## 10. Event Publisher — SSE & Webhooks

### Event Schema

```typescript
interface SSEEvent {
  id: string;          // signal ID or pipeline run ID
  type: string;        // event type
  timestamp: string;   // ISO 8601
  data: {
    entityId: string;
    entityName: string;
    sourceId: string;
    sourceName: string;
    // type-specific payload
  };
}
```

### Event Types

| Type | Trigger |
|------|---------|
| `signal-ingested` | New signal written (entity, category, polarity, title) |
| `signal-corroborated` | Signal joined an event cluster (cluster size, confidence boost) |
| `entity-created` | New unverified entity from resolver |
| `source-health-changed` | Circuit breaker state transition |
| `pipeline-run-completed` | Ingestion run finished (counts, duration) |

Backfill signals (`is_backfill = true`) are suppressed from SSE to prevent notification floods.

### SSE Channel Architecture via Redis Pub/Sub

| Channel | Scope |
|---------|-------|
| `sse:global` | All events (admin/ops dashboards) |
| `sse:entity:{entityId}` | Events for a specific entity |
| `sse:source:{sourceId}` | Events for a specific source |
| `sse:team:{teamId}` | Events matching a team's watchlist |

Events publish to all applicable channels. The Hono SSE endpoint subscribes to the appropriate channel based on client query parameters and auth context.

### Multi-Instance Connection Management

Each SSE connection registers in Redis: `HSET sse:connections:{connId} instanceId, entityId, teamId, connectedAt` with 60-second TTL refreshed by heartbeats.

Benefits:
- Ops visibility: `SCAN sse:connections:*` for active connection count
- Graceful shutdown: instance draining publishes `reconnect` event before dying
- Schedule optimization: sources with active SSE subscribers get poll priority

### Client Reconnection

Heartbeat pings every 30 seconds. `Last-Event-ID` header on reconnect — server replays missed events from PostgreSQL for the gap window.

### Backpressure

Write buffer exceeds 1,000 events → drop connection with retry hint. Client reconnects and catches up via `Last-Event-ID` replay.

### Event Deduplication

Per-connection ring buffer (last 500 event IDs). Before writing an event, check buffer — skip if already sent. Prevents duplicates when a signal matches multiple subscribed channels.

### Subscription Filters

```
/engine/v1/stream?channel=team&filter=polarity:behavioral,category:patent-filing
```

Filters parsed at connection time, applied in-memory before fan-out. Field:value pairs with comma-separated AND logic.

### Webhook Delivery

Webhook subscriptions in `webhook_endpoints` table:

```sql
CREATE TABLE webhook_endpoints (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  event_types TEXT[] NOT NULL,
  active BOOLEAN DEFAULT true,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Delivery via `WebhookDeliveryWorkflow`:
- HMAC-SHA256 signature using endpoint's secret
- 3 retries: exponential backoff (1s, 10s, 60s)
- Logged to `webhook_deliveries` table
- Endpoints with >50% failure rate over 24h → auto-disabled with alert

---

## 11. Self-Learning Promotion Loop

### Core Principle

Self-learning infrastructure is built into the pipeline from day one. Every agent extraction logs training data. Promotion automation consumes this data to reduce LLM costs over time.

### Extraction Sample Logging

Every agent-mode extraction writes to `extraction_samples`:
- `input_text`: raw content sent to agent
- `expected_output`: structured output (when ground truth exists)
- `actual_output`: agent's extraction result
- `is_correct`: validation pass/fail
- Source, parser mode, model used

### Accuracy Measurement — Two Signals

1. **DLQ rate** — signals that failed validation after agent extraction. Rolling 7-day rate per source. DLQ rate >5% blocks promotion.
2. **Cross-validation accuracy** — for sources with structured ground truth (USPTO XML, SEC XBRL), run both agent and structured in parallel, compare field-by-field. For sources without ground truth, accuracy estimated from validation pass rate + entity resolution success rate.

### Promotion Check Workflow

Daily `PromotionCheckWorkflow` iterates sources where `parser_mode = 'agent'` and `learning_extraction_count >= 500`:

1. Query `extraction_samples` for the retained sample set (see retention policy)
2. Compute field-level accuracy against expected output or validation pass rate
3. If accuracy ≥ 95% and DLQ rate ≤ 2%: generate parser draft
4. Create review record with comparisons, stats, and generated parser config
5. Notify admins via webhook

### Parser Generation — Template-Based Config, Not Code

The promotion workflow analyzes extraction samples to identify stable field paths in the source's raw payload. It produces a **parser config document** — a declarative JSON mapping:

```json
{
  "mappings": [
    { "source": "response.patentRecord.assignee.name", "target": "entityName", "transform": "cleanCompanyName" },
    { "source": "response.patentRecord.filingDate", "target": "publishedAt", "transform": "parseDate" }
  ]
}
```

Transform functions selected from a built-in library (date normalization, name cleaning, currency parsing, array flattening). Sources with complex extraction logic that can't be captured declaratively are flagged as `promotion_blocked: 'complex-extraction'`.

### Phased Promotion — Gradual Rollout

Promotion goes through three stages after human approval:

| Stage | Traffic Split | Duration | Exit Criteria |
|-------|--------------|----------|---------------|
| `shadow` | Structured runs on 100%, results discarded. Agent authoritative. | 7 days or 200 signals | Accuracy ≥ 95% |
| `canary` | Structured handles 20%, agent 80%. Both write real signals. | 7 days | No divergence in resolution rates or confidence |
| `promoted` | Structured is primary, agent fallback + 5% shadow validation. | Ongoing | — |

Each stage auto-advances if metrics hold, auto-demotes if they degrade. Tracked as `learning_promotion_stage` on the source.

### Post-Promotion Regression Detection — Shadow Validation

After promotion, continue running the agent on a configurable sample rate (default 5%, stored as `learning_shadow_sample_rate`). Compare outputs field-by-field. If divergence exceeds 10% over a 7-day window:
- Auto-demote to `parser_mode = 'agent'`
- Fire alert with divergence samples
- Log for prompt/config review

### Human Review Gate

Promotion is never automatic. Review record includes:
- 10 sample side-by-side comparisons (agent vs proposed structured)
- Accuracy metrics
- Cost savings estimate (current token spend → $0)
- One-click approve/reject via admin API

### Stratified Sample Retention

Extraction samples bucketed by output shape (which fields present, which entity types resolved):
- All samples from last 30 days (recent performance)
- Up to 50 samples per distinct output-shape bucket (covers edge cases)
- All samples marked incorrect via feedback (permanent)
- Maximum 2,000 samples per source total

Promotion check draws from full retained set, weights accuracy by bucket frequency.

### Cost-Aware Promotion Priority

Sources running on expensive models have higher promotion priority since structured parsing eliminates LLM cost entirely. Promotion priority score: `accuracy × extraction_count × cost_per_signal`.

---

## 12. Backfill Strategy

### Separate Workflow

`SourceBackfillWorkflow` — distinct from `SourceIngestionWorkflow`. Same pipeline stages, different fetch behavior: iterates date range or paginated history in reverse chronological order with configurable batch size and rate limiting.

### Backfill State Machine

```typescript
interface BackfillState {
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  startDate: string;
  endDate: string;
  batchSize: number;
  rateLimitMs: number;
  progress: {
    currentDate: string;
    itemsProcessed: number;
    itemsFailed: number;
    lastCheckpoint: string;
  };
}
```

Durable via Temporal — crashes resume from `lastCheckpoint`. Pause/resume via Temporal signal.

### Shared Rate Limits

Both live and backfill workflows acquire tokens from the same Redis-backed rate limiter per source. Backfill gets lower priority — live ingestion wins when contested.

### Backfill Signal Marker

`is_backfill BOOLEAN DEFAULT false` on the signals table. Effects:
- Gap analysis/alert detectors exclude from spike/anomaly detection
- Still included in cumulative scoring and historical baselines
- SSE publisher suppresses `signal-ingested` events
- ClickHouse materialized views include but dashboards can filter

### Cost Estimation Before Commit

Before starting, a dry-run estimation activity: fetch first batch, count total items from pagination headers or date-range estimates, multiply by `cost_per_signal` average. Backfills above a configurable cost threshold (default $50) require explicit admin confirmation via Temporal signal.

### Trigger Mechanisms

| Trigger | Behavior |
|---------|----------|
| On source creation | Auto-trigger after first successful live fetch (validates source works first) |
| Manual | `POST /engine/v1/admin/sources/:id/backfill` |
| Gap detection | Scheduler notices source disabled for >24h → auto-backfill missed window |

### Overlap Handling

Backfilled signals hit the same dedup layers as live signals. Content hash conflicts resolve silently.

---

## 13. Source Health & Circuit Breakers

### Circuit Breaker State Machine

```
closed (healthy) ←──── success ──── half-open (probing)
    │                                    ↑
    │ consecutive_failures >= 5          backoff timer expires
    ▼                                    │
  open (tripped) ──── timer ────────────→┘
    ↑
    │ half-open probe fails
    └─────────────────────────────────────┘
```

| State | Behavior |
|-------|----------|
| `closed` | Normal operation. Failures increment counter. |
| `open` | Source disabled. Temporal Schedule paused. Exponential backoff: 15m → 30m → 1h → ... → 24h max. |
| `half-open` | Single probe fetch. Success → closed. Failure → open (double backoff). |

### Failure Classification

| Class | Examples | Action |
|-------|----------|--------|
| Transient | HTTP 429, 502, 503, timeout | Retry 3x with exponential backoff within current run. Count failure on exhaustion. |
| Permanent | HTTP 401, 403, 404, DNS failure | Trip circuit immediately, alert admins. |
| Partial | Fetch OK but >50% parse/resolve failures | Don't trip circuit. Fire alert. Trigger prompt review. |

### Upstream Health Groups

Sources sharing the same upstream API declare `upstream_group` (e.g., `'sec-edgar'`, `'google-news'`). When 3+ sources in the same group trip within 5 minutes:
- Group-level circuit breaker activates, gates all member sources
- Half-open probes sent from one canary source only
- Alerts consolidate: "SEC EDGAR upstream is down (affecting 15 sources)"

### Cost Anomaly Detection

`SourceHealthAggregationWorkflow` computes `cost_zscore` — current cost-per-signal vs 30-day rolling mean/stddev. Z-score >3:
- Immediate alert with cost comparison
- Sustained 3 consecutive runs → auto-pause with `health_circuit_state = 'cost-hold'`
- Admin must explicitly resume

### Source Health Metrics (ClickHouse)

Hourly `SourceHealthAggregationWorkflow` writes per-source metrics:
- Uptime percentage (30-day rolling)
- Average signal yield per fetch
- DLQ rate trend
- Cost efficiency (cost per signal, 7-day rolling)
- Circuit breaker trip history

### Alerting Channels

| Trigger | Channel |
|---------|---------|
| Circuit breaker trip | Immediate webhook |
| DLQ rate >5% for 1 hour | Webhook + email digest |
| Source uptime <90% over 7 days | Daily digest |
| Cost anomaly (z-score >3) | Immediate webhook |
| Upstream group outage | Immediate webhook (consolidated) |

---

## 14. RSS Migration — Cutover Strategy

### Three-Phase Cutover

**Phase A: Shadow mode (1-2 weeks)**
Both pipelines run simultaneously. New Temporal pipeline ingests RSS feeds into PostgreSQL. Old pipeline continues writing to MongoDB. Daily comparison worker validates parity.

**Phase B: New pipeline primary**
Old MongoDB writes stop. PostgreSQL becomes source of truth. Existing `api/v1/` routes get a thin adapter to read from PostgreSQL (or Change Stream sync writes backwards — PostgreSQL → MongoDB — so old routes see new data).

**Phase C: Decommission**
Remove `feed-registry.ts`, `rss-parser.ts`, `enrichment.ts`, `news-aggregator.ts` from `api/`. MongoDB news collections become read-only archives.

### Feed Registry Migration

150+ feeds from `feed-registry.ts` → rows in `sources` table via one-time seed script:

| Feed Tier | Schedule |
|-----------|----------|
| fast | `*/60 * * * *` (hourly) |
| standard | `0 */6 * * *` (every 6h) |
| slow | `0 0 * * 1` (weekly) |

All RSS sources: `parser_mode = 'structured'`, `parser_ref = 'rss'`, `polarity = 'classify'`.

### Per-Feed Validation in Shadow Mode

Per-source parity matrix comparing old and new pipelines:

| Metric | Pass Threshold |
|--------|---------------|
| Per-source count divergence | <20% |
| Overall entity match rate | >90% |
| Zero sources with >20% divergence | Required |

Cutover to Phase B gated on all thresholds passing.

### Historical News Backfill

Before decommissioning old pipeline, `NewsBackfillWorkflow` reads last 6 months of MongoDB news documents, transforms through new pipeline stages, writes to PostgreSQL with `is_backfill = true`. Content hash dedup prevents overlap with shadow mode signals.

### Enrichment Migration

Existing keyword-based entity extraction becomes part of RSS structured parser output. Entity Resolver adds Typesense fuzzy matching on top — strictly better than current approach.

### Adaptive Poll Frequency

After 2 weeks, `ScheduleOptimizationWorkflow` adjusts per-feed polling frequency based on actual signal volume patterns (see Section 2).

---

## 15. Source Catalog

### Phase 2 Sources

| # | Source | Fetcher | Parser | Resolution | Signal Categories |
|---|--------|---------|--------|------------|-------------------|
| 1 | **RSS Feeds** (150+) | rss | structured | fuzzy + classify | news-article, press-release |
| 2 | **USPTO Patents** | api | hybrid | external_ids + fuzzy | patent-filing, patent-prosecution, patent-abandonment, patent-transfer |
| 3 | **USPTO Trademarks** | api | structured | external_ids + fuzzy | trademark-registration |
| 4 | **SEC EDGAR** | api + dependency | routed hybrid | CIK exact | financial-filing, material-event, insider-trading |
| 5 | **USASpending** | api | structured | DUNS exact | government-contract |
| 6 | **Job Postings** | api | hybrid | fuzzy + domain | job-posting |
| 7 | **Lobbying (Senate LDA)** | bulk-download | structured | fuzzy | lobbying-disclosure |
| 8 | **Federal Register** | api | hybrid | sector multi-entity | policy-statement |
| 9 | **Semantic Scholar** | api | structured | affiliation fuzzy | academic-publication |
| 10 | **FCC Authorizations** | api | structured | FRN exact | fcc-authorization |

### Source Details

#### 1. RSS Feeds

Migrated from existing `feed-registry.ts`. 150+ feeds across geopolitical, finance, defense, energy, cyber, think-tank, government, science categories. Multi-language support (de, es, fr, ja, pt, vi).

#### 2. USPTO Patents

- **Fetcher:** USPTO Open Data Portal bulk XML. `pagination = 'date-range'`, 1 req/s rate limit.
- **Parser:** Hybrid. Structured extraction from XML paths (assignee, title, abstract, filing date, CPC codes). Agent fallback for subsidiary name resolution, non-standard formats, continuation chain detection.
- **Resolution:** Assignees via `external_ids.cik` or company name. Individual inventors only when appearing across 3+ patents.
- **Special:** Patent citation extraction from `<us-references-cited>`. Citations create `CITES_PATENT` claim edges. Cross-assignee citations create `BUILDS_ON_IP_OF` entity edges. CPC codes become Concept nodes.
- **Backfill:** Enabled, from 2020-01-01, batch size 1,000.

#### 3. USPTO Trademarks

- Same API infrastructure as patents, different endpoint. Structured XML.
- Trademark filings reveal product/brand plans before launch.
- Incremental from USPTO patent implementation.

#### 4. SEC EDGAR

- **Fetcher:** EDGAR full-text search API + XBRL companion API. 10 req/s with User-Agent header.
- **Architecture:** Filing type router — single source config with `parser_routing` map:

```json
{
  "10-K": { "mode": "hybrid", "parser_ref": "sec-10k", "model": "claude-sonnet-4-6" },
  "8-K": { "mode": "agent", "model": "claude-sonnet-4-6" },
  "4": { "mode": "structured", "parser_ref": "sec-form4" },
  "13F-HR": { "mode": "structured", "parser_ref": "sec-13f" },
  "_default": { "mode": "agent", "model": "claude-haiku-4-5" }
}
```

- **Resolution:** CIK exact match. Nearly 100% deterministic.
- **Special:** Filing delay analysis on Form 4 — `meta.filing_delay_days`. Delays >2 days generate secondary `insider-trading-delay` signal.
- **Financial weight:** `{amount, currency, magnitude}` extracted from filings.

#### 5. USASpending (Government Contracts)

- **Fetcher:** Free REST API, cursor pagination, daily schedule. No auth required.
- **Parser:** `structured` — clean JSON with award amount, recipient, agency, NAICS codes.
- **Resolution:** DUNS/UEI → `external_ids.duns`. Nearly 100% deterministic.
- **Signal value:** Contract awards reveal government investment priorities — strongest behavioral signal for defense/tech entities.

#### 6. Job Postings

- **Fetcher:** Aggregator API (Theirstack or similar), cursor pagination, 6-hour schedule.
- **Parser:** Hybrid — structured for standard fields, agent for skill/seniority classification.
- **Resolution:** Company name fuzzy match boosted by domain context.
- **Special:** Mutable signals. Re-fetched periodically to update lifecycle metadata (`lastSeenAt`, `removedAt`, `durationDays`, `fillSpeed`). `SignalWriter` uses upsert path keyed on `content_hash`.
- **Phase 3 Ready:** Ghost listing detection uses `JobPostingMeta` lifecycle data.

#### 7. Lobbying Disclosures (Senate LDA)

- **Fetcher:** `bulk-download`. Quarterly XML ZIP from `lda.senate.gov`. Raw file stored in MinIO. Stream-decompressed.
- **Parser:** `structured` — stable XML schema.
- **Resolution:** Registrant and client names via fuzzy match. Lobbying firms → `organization` entities.
- **Special:** Referenced bills become Concept nodes (e.g., "H.R. 3684"). Enables queries: "which companies lobbied on infrastructure legislation?"

#### 8. Federal Register

- **Fetcher:** Free JSON API (`federalregister.gov/api/v1`), daily, cursor pagination.
- **Parser:** Hybrid — structured for metadata (agency, docket, CFR citations), agent for regulatory impact identification.
- **Resolution:** Unique pattern — maps affected industries/sectors to entities via `sector` and `domains[]` matching. `secondary_entities` can contain dozens of entity IDs.
- **Special:** Rule lifecycle stages (proposed → comment → final → effective). Each stage is a separate signal with `'follows'` relation. `relevance_window.relevantUntil` maps to effective date.

#### 9. Semantic Scholar

- **Fetcher:** Free API, 100 req/s, structured JSON.
- **Parser:** `structured` — clean API response.
- **Resolution:** Author affiliation parsing — fuzzy match on organization names in affiliation strings. New resolution pattern.
- **Signal value:** R&D direction 12-18 months before product announcements.

#### 10. FCC Authorizations

- **Fetcher:** Free API, structured JSON.
- **Parser:** `structured`.
- **Resolution:** FCC Registration Number (FRN) → `external_ids.frn`. Deterministic.
- **Signal value:** Equipment authorizations reveal hardware plans before announcements (devices, satellites, ground stations).

### Framework Coverage

| Dimension | Coverage |
|-----------|----------|
| Fetcher types | rss, api, bulk-download (3 of 5) |
| Parser modes | structured, agent, hybrid, routed hybrid (all) |
| Resolution strategies | exact (CIK, DUNS, FRN), fuzzy, domain-weighted, affiliation, sector-based (5 patterns) |
| Signal patterns | write-once, mutable (job postings), lifecycle (patents, rules), multi-entity (regulations) |
| Special features | citation graphs, filing routing, cost estimation, concept nodes, streaming decompression |

---

## 16. Operational Architecture — Workers, Observability, Testing

### Temporal Worker Topology

| Task Queue | Activities | Concurrency | Scaling Profile |
|------------|-----------|-------------|-----------------|
| `fetch` | All fetcher types | 50 | I/O bound |
| `parse-structured` | Structured parser, classifier | 100 | CPU bound, fast |
| `parse-agent` | Agent parser, agent classifier | 10 | LLM API bound, cost-controlled |
| `resolve` | Entity resolution, graph update | 25 | Typesense/Neo4j bound |
| `write` | Signal writer, ClickHouse sync, SSE publish | 25 | DB write bound |
| `system` | Promotion check, reconciliation, health, schedule optimization, DLQ triage | 1 per workflow type | Low priority |

Each task queue runs as a separate Temporal worker process in Docker Compose with independent replica scaling. The `parse-agent` queue uses Temporal's `MaxConcurrentActivityExecutionSize` as the cost control lever.

### OpenTelemetry Instrumentation

Every pipeline stage emits a span:

```
SourceIngestionWorkflow (root span)
  ├── fetch (source_id, fetcher_type, items_fetched, duration_ms)
  ├── parse (parser_mode, items_parsed, fallback_count, tokens_used)
  └── SignalBatchWorkflow (child span per batch)
        ├── classify (items_classified, agent_calls)
        ├── resolve (cache_hits, exact_matches, fuzzy_matches, new_entities)
        ├── write-pg (items_written, deduped, dlq_count)
        ├── write-ch (batch_size, flush_time_ms)
        ├── graph-update (claims_processed, edges_created, concepts_created)
        └── publish (events_published, channels)
```

Traces → Grafana Tempo via OpenTelemetry Collector.

### Prometheus Metrics

| Metric | Type | Labels |
|--------|------|--------|
| `gambit_signals_ingested_total` | counter | source_id, polarity, parser_mode |
| `gambit_pipeline_duration_seconds` | histogram | source_id, stage |
| `gambit_agent_tokens_total` | counter | source_id, direction (in/out) |
| `gambit_entity_resolution_method` | counter | cache/exact/fuzzy/new |
| `gambit_dlq_items_total` | counter | source_id, stage |
| `gambit_cost_per_signal_usd` | gauge | source_id |
| `gambit_circuit_breaker_state` | gauge | source_id, upstream_group |

### Grafana Dashboards (Pre-Built)

- Pipeline throughput (signals/minute by source)
- Cost per source (token spend, cost per signal trend)
- Entity resolution hit rates (cache/exact/fuzzy/new distribution)
- DLQ trends (items by source and stage)
- Source health matrix (uptime, circuit state, last success)

### DLQ Processing Workflow

`DLQTriageWorkflow` runs every 6 hours per source:

1. Group DLQ items by stage and error signature
2. Canary retry on oldest item per error group
3. Canary succeeds → bulk retry group, mark `'retried'`
4. Canary fails → leave in DLQ, increment `attempt_count`
5. Items with `attempt_count >= 5` → mark `'needs-review'`, include in admin digest

Admin API: `GET /admin/dlq`, `POST /admin/dlq/retry`, `POST /admin/dlq/discard`.

### Source Configuration Version Control

Canonical source definitions as YAML files in `engine/src/sources/`:

```yaml
# engine/src/sources/uspto-patents.yaml
id: "source:uspto-patents"
name: "USPTO Patents"
category: "patent-filing"
polarity: "behavioral"
tier: 1
fetcher:
  type: api
  url: "https://developer.uspto.gov/..."
  schedule: "0 2 * * *"
  pagination: date-range
  rateLimitMs: 1000
parser:
  mode: hybrid
  ref: "uspto"
  model: "claude-haiku-4-5"
  maxInputTokens: 4000
```

`source:sync` CLI command upserts YAML → database, preserving runtime-only fields. Database overrides tracked in `source_config_audit` table. YAML is canonical for deployments; database allows runtime changes.

### Secrets Resolution

`fetcher_auth.keyRef` → environment variable name. Resolved via `process.env[keyRef]` at activity execution time. Secrets never touch the database. Engine startup validates all enabled sources' `keyRef` values resolve to non-empty env vars.

### Testing Strategy

**Layer 1: Unit tests per parser.**
Fixture-based tests: feed known XML/JSON, assert signal output. Located in `engine/test/parsers/`. Run in CI without external dependencies.

**Layer 2: Integration tests per pipeline stage.**
Each activity tested against real infrastructure (Typesense, PostgreSQL, Neo4j). Docker Compose test profile spins up dependencies.

**Layer 3: End-to-end pipeline test.**
`test:pipeline` runs a complete `SourceIngestionWorkflow` against a test source with mocked HTTP responses (msw). Verifies: signals in PostgreSQL, ClickHouse rows, Neo4j edges, SSE events, pipeline_run accurate, DLQ empty.

**Fixture management.**
Raw API responses stored in `engine/test/fixtures/`. `capture-fixtures` script fetches live responses for test data. Ensures realistic data without external API calls in CI.

---

## 17. Hyper-Optimizations

### Fetch Stage

| Optimization | Mechanism | Impact |
|-------------|-----------|--------|
| Pipeline parallelism | Prefetch batch N+1 while processing batch N (3-batch buffer) | ~40% wall-clock reduction for paginated sources |
| Conditional fetch | ETag/If-Modified-Since → 304 short-circuit | Eliminates majority of no-op RSS polls |
| Streaming decompression | Async iterator over ZIP/XML without full file in memory | Constant memory for bulk downloads |

### Parse Stage

| Optimization | Mechanism | Impact |
|-------------|-----------|--------|
| Batch LLM prompts | Pack N items per prompt, per-item validation | 30-40% agent cost reduction |
| Speculative parallel | Run structured + agent concurrently in hybrid mode (on shadow samples) | Eliminate sequential fallback latency |
| Parse result caching | Content hash check before parsing | Skip 80%+ of re-fetched RSS items |

### Resolution Stage

| Optimization | Mechanism | Impact |
|-------------|-----------|--------|
| Cache warming | Pre-populate top 1,000 entities on startup | Warm cache from first pipeline run |
| Bloom filter | In-memory filter for unknown entities | Skip fuzzy search for truly unknown names |
| Session cache | Per-worker cache persists across batches within a run | Resolve entity once per run, not per batch |
| Batch collect | Deduplicate names within batch before resolving | ~60% fewer resolution calls per batch |

### Write Stage

| Optimization | Mechanism | Impact |
|-------------|-----------|--------|
| PostgreSQL COPY | Binary COPY for batches >25 signals | 5-10x faster than individual inserts |
| ClickHouse buffering | In-memory buffer, flush at 500 rows or 5s | Match CH optimal batch pattern |
| Claim dedup | Local triple set before Neo4j MERGE | Eliminate redundant Cypher calls |
| Write-ahead intent log | Redis stream of parsed results before PG write | Crash recovery without re-parsing agent calls |

---

## 18. Schema Additions

New tables and columns beyond Phase 1's existing schema:

### New Tables

```sql
-- Prompt version history
CREATE TABLE parser_prompt_versions (
  id SERIAL PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  version INT NOT NULL,
  prompt TEXT NOT NULL,
  response_schema JSONB NOT NULL,
  accuracy_at_rotation NUMERIC,
  dlq_rate_at_rotation NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_id, version)
);

-- Source config change audit
CREATE TABLE source_config_audit (
  id SERIAL PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  changed_by TEXT NOT NULL,
  field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ClickHouse sync failures
CREATE TABLE clickhouse_sync_dlq (
  id TEXT PRIMARY KEY,
  signal_id TEXT NOT NULL,
  error TEXT NOT NULL,
  attempt_count INT DEFAULT 1,
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook endpoint subscriptions
CREATE TABLE webhook_endpoints (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  event_types TEXT[] NOT NULL,
  active BOOLEAN DEFAULT true,
  failure_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### New Columns on Existing Tables

```sql
-- sources table additions
ALTER TABLE sources ADD COLUMN upstream_group TEXT;
ALTER TABLE sources ADD COLUMN health_circuit_state TEXT DEFAULT 'closed';
ALTER TABLE sources ADD COLUMN health_circuit_backoff_ms INT DEFAULT 900000;
ALTER TABLE sources ADD COLUMN fetcher_schedule_optimized TEXT;
ALTER TABLE sources ADD COLUMN parser_model TEXT;
ALTER TABLE sources ADD COLUMN parser_max_input_tokens INT DEFAULT 4000;
ALTER TABLE sources ADD COLUMN parser_routing JSONB;
ALTER TABLE sources ADD COLUMN cost_budget_usd NUMERIC;
ALTER TABLE sources ADD COLUMN learning_promotion_stage TEXT DEFAULT 'none';
ALTER TABLE sources ADD COLUMN learning_shadow_sample_rate NUMERIC DEFAULT 0.05;

-- signals table additions
ALTER TABLE signals ADD COLUMN is_backfill BOOLEAN DEFAULT false;
ALTER TABLE signals ADD COLUMN simhash BIGINT;
ALTER TABLE signals ADD COLUMN event_fingerprint TEXT;
ALTER TABLE signals ADD COLUMN corroboration_count INT DEFAULT 0;

-- entities table additions
ALTER TABLE entities ADD COLUMN version INT DEFAULT 1;
```

### ClickHouse Tables

```sql
-- Analytics projection (see Section 8)
CREATE TABLE signals_analytics (...);

-- Materialized views for gap analysis
CREATE MATERIALIZED VIEW mv_signal_counts_7d ...;
CREATE MATERIALIZED VIEW mv_signal_counts_30d ...;
CREATE MATERIALIZED VIEW mv_signal_counts_90d ...;

-- Source health metrics
CREATE TABLE source_health_metrics (
  source_id String,
  timestamp DateTime,
  uptime_pct Float64,
  avg_yield Float64,
  dlq_rate Float64,
  cost_per_signal Float64,
  circuit_state String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (source_id, timestamp);
```

### Neo4j Schema

```cypher
// Entity nodes (synced from PostgreSQL)
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;

// Concept nodes (emergent from claims)
CREATE CONSTRAINT concept_name IF NOT EXISTS FOR (c:Concept) REQUIRE c.normalized_name IS UNIQUE;

// Relationship properties: confidence, signalId, sourceId, publishedAt, validFrom, validUntil, status
// Aggregate relationship: edge_count, avg_confidence, latest_signal_at, relation_types, updated_at
```
