# Gambit Engine & Signal Dashboard — Architecture Design Spec

> **Gambit** is a 2-layer SaaS platform: the **Gambit Engine** (SDK/API for behavioral intelligence) and **Gambit Signal** (the primary dashboard product). The engine ingests 50+ data sources, resolves entities, classifies signals as declarative or behavioral, computes gap analysis scores, detects patterns, and fires alerts. Signal is the first-party dashboard that consumes the engine API. The existing globe becomes "Spatial View" — one feature within Signal.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Unified Entity Model](#3-unified-entity-model)
4. [Signal Schema](#4-signal-schema)
5. [Ingestion Framework](#5-ingestion-framework)
6. [Gap Analysis Engine](#6-gap-analysis-engine)
7. [Public Engine API](#7-public-engine-api)
8. [Signal Dashboard UI](#8-signal-dashboard-ui)
9. [Domain Registry](#9-domain-registry)
10. [Intelligence Patterns](#10-intelligence-patterns)
11. [FOIA Intelligence System](#11-foia-intelligence-system)
12. [Migration Path](#12-migration-path)
13. [Tiering & Packaging](#13-tiering--packaging)
14. [Multi-Tenancy & Security](#14-multi-tenancy--security)
15. [Reality Score Normalization](#15-reality-score-normalization)
16. [Migration Synchronization Strategy](#16-migration-synchronization-strategy)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  GAMBIT SIGNAL (React + Tailwind dashboard)                 │
│  Leaderboard │ Entity Detail │ Comparison │ Alerts          │
│  Source Health │ FOIA Tracker │ Spatial View (Globe)         │
├─────────────────────────────────────────────────────────────┤
│  PUBLIC ENGINE API  /engine/v1/                             │
│  Versioned, OpenAPI, Zod-validated, tiered access           │
│  REST + GraphQL + SSE + Webhooks                            │
├─────────────────────────────────────────────────────────────┤
│  SERVICE LAYER                                              │
│  EntityService │ SignalService │ GapService │ AlertService  │
│  SourceService │ WatchlistService │ FOIAService             │
│  DomainService │ GraphService │ StreamService               │
├─────────────────────────────────────────────────────────────┤
│  INGESTION FRAMEWORK (Temporal workflows)                   │
│  SourceRegistry → Fetcher → Parser/Agent → Classifier →    │
│  EntityResolver → SignalWriter → GraphUpdater → SSE         │
│  Self-learning: Agent → Structured Parser promotion         │
├─────────────────────────────────────────────────────────────┤
│  COMPUTATION ENGINE                                         │
│  Gap Analysis │ Pattern Detection │ Scoring │ Alert Rules   │
├─────────────────────────────────────────────────────────────┤
│  DATA LAYER                                                 │
│  PostgreSQL + Drizzle (entities, signals, alerts, config)   │
│  ClickHouse (analytics, gap scoring, time-series)           │
│  Neo4j (graph relationships, claims, traversal)             │
│  Typesense (fuzzy search, entity resolution)                │
│  Upstash Redis (cache, rate limits, usage counters)         │
│  MinIO (FOIA documents, raw payloads, exports)              │
│  Temporal (workflow orchestration)                           │
│  OpenTelemetry → Grafana Tempo (observability)              │
└─────────────────────────────────────────────────────────────┘
```

**Data flow:**

```
External Sources (50+)
    │
    ▼
Temporal Workflows (fetch → parse → classify → resolve → write)
    │
    ├──▶ PostgreSQL (source of truth: entities, signals, alerts, sources, watchlists, FOIA)
    │       │
    │       ├──▶ Logical replication ──▶ ClickHouse (analytics sync)
    │       ├──▶ NOTIFY/trigger ──▶ Typesense (search index sync)
    │       └──▶ Sync worker ──▶ Neo4j (graph index sync)
    │
    ├──▶ MinIO (raw documents, FOIA responses, exports)
    │
    ├──▶ Upstash Redis (cache invalidation, rate limits)
    │
    └──▶ SSE / Webhooks (real-time delivery)

Hono API (/engine/v1/)
    │
    ├── reads ──▶ PostgreSQL (entities, signals, alerts)
    ├── reads ──▶ ClickHouse (aggregations, gap scores, leaderboards)
    ├── reads ──▶ Typesense (search, entity resolution)
    ├── reads ──▶ Neo4j (graph queries, path finding)
    ├── reads ──▶ MinIO (document downloads)
    └── reads ──▶ Upstash Redis (cache, session, rate limits)
```

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Runtime | Bun | TypeScript runtime, fast startup |
| API Framework | Hono + RPC | Lightweight HTTP, typed client generation |
| API Validation | Zod + @hono/zod-validator | Runtime request/response validation |
| Data Validation | TypeBox | JSON Schema validation at service boundary |
| Primary DB | PostgreSQL + Drizzle ORM | Source of truth, relational integrity |
| Analytics DB | ClickHouse | Signal aggregation, gap scoring, time-series |
| Graph DB | Neo4j | Entity graph, path finding, relationship discovery |
| Search | Typesense | Fuzzy entity resolution, typo-tolerant search |
| Cache | Upstash Redis | HTTP-based, serverless-compatible caching |
| Pub/Sub | Upstash Redis | SSE event distribution |
| Workflow Engine | Temporal | Durable multi-stage pipelines, FOIA lifecycle |
| Object Storage | MinIO (S3-compatible) | FOIA docs, raw payloads, exports |
| Observability | OpenTelemetry → Grafana Tempo | Distributed tracing |
| Dashboard | React + Tailwind | Signal dashboard frontend |
| Globe/Spatial | Deck.GL (within React) | Spatial view component |
| API Docs | OpenAPI (auto-generated from Zod) | Public API contract |
| Client SDK | Hono RPC (TypeScript) | Typed client for dashboard + customers |
| Query API | REST + GraphQL (Yoga) | Simple + complex queries |

**Docker Compose additions:**

```yaml
temporal:
  image: temporalio/auto-setup:latest
  ports: ["7233:7233"]

temporal-ui:
  image: temporalio/ui:latest
  ports: ["8080:8080"]

clickhouse:
  image: clickhouse/clickhouse-server:latest
  ports: ["8123:8123", "9100:9000"]

typesense:
  image: typesense/typesense:27.1
  ports: ["8108:8108"]

minio:
  image: minio/minio:latest
  ports: ["9000:9000", "9001:9001"]
  command: server /data --console-address ":9001"

grafana:
  image: grafana/grafana:latest
  ports: ["3000:3000"]

tempo:
  image: grafana/tempo:latest
  ports: ["3200:3200"]

postgres:
  image: postgres:17
  ports: ["5432:5432"]
```

---

## 3. Unified Entity Model

Every entity in the system — company, country, government, organization, person, conflict, chokepoint, base — gets a normalized representation. This is the spine that everything connects to.

### PostgreSQL Schema

```sql
CREATE TABLE entities (
  id TEXT PRIMARY KEY,                    -- "company:nvidia", "country:united-states"
  type TEXT NOT NULL,                     -- EntityType enum
  name TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  parent_id TEXT REFERENCES entities(id),
  -- child_ids derived via: SELECT id FROM entities WHERE parent_id = $1
  status TEXT DEFAULT 'active',           -- active, acquired, dissolved, merged, inactive
  status_detail TEXT,
  status_at TIMESTAMPTZ,
  sector TEXT,
  jurisdiction TEXT,                      -- ISO2
  domains TEXT[] DEFAULT '{}',            -- technology/sector domains
  location GEOGRAPHY(POINT, 4326),        -- PostGIS
  lat NUMERIC,
  lng NUMERIC,
  external_ids JSONB DEFAULT '{}',        -- ticker, cik, lei, wikidata, iso2, etc.
  tags TEXT[] DEFAULT '{}',
  risk TEXT,                              -- promoted queryable field
  ticker TEXT,                            -- promoted queryable field
  iso2 TEXT,                              -- promoted queryable field
  meta JSONB DEFAULT '{}',               -- type-specific overflow
  signal_count_declarative INT DEFAULT 0,
  signal_count_behavioral INT DEFAULT 0,
  reality_score NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE resolution_aliases (
  id SERIAL PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES entities(id),
  alias TEXT NOT NULL,
  source TEXT NOT NULL,                   -- which source provided this alias
  confidence NUMERIC DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_resolution_aliases_alias ON resolution_aliases(alias);
CREATE INDEX idx_resolution_aliases_entity ON resolution_aliases(entity_id);

CREATE TABLE resolution_feedback (
  id SERIAL PRIMARY KEY,
  raw_name TEXT NOT NULL,
  resolved_to TEXT NOT NULL REFERENCES entities(id),
  correct BOOLEAN NOT NULL,
  corrected_to TEXT REFERENCES entities(id),
  source TEXT NOT NULL,                   -- human, cross-reference, high-confidence-match
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Entity Types

```typescript
type EntityType =
  | 'company' | 'country' | 'government' | 'organization' | 'person'
  | 'conflict' | 'chokepoint' | 'base' | 'trade-route' | 'port'
  | 'nsa' | 'election';
```

### Key Design Decisions

- **Composite `_id`** (`type:slug`) — avoids collisions, readable in logs and URLs
- **`meta` bag** for type-specific fields with promoted queryable fields (`risk`, `ticker`, `iso2`) indexed at the top level
- **`aliases` + `resolution_aliases`** — aliases for display, resolution_aliases with source + confidence for entity resolution
- **`parent_id` / `child_ids`** — company subsidiaries, government agencies, organization chapters. Signals roll up to parents
- **`status` lifecycle** — prevents scoring dead entities. Acquired companies don't get flagged as "stealth" because their signals stopped
- **`domains`** — populated by ingestion. Patent in CPC H01M → entity gains "batteries" domain
- **`external_ids`** — deterministic lookups against data sources (ticker for SEC, CIK for EDGAR, LEI for global entity matching)
- **`signal_count`** — denormalized counters updated by ingestion for fast dashboard sorting

### Normalization

```typescript
interface EntityNormalization {
  entityScale: 'mega-cap' | 'large' | 'mid' | 'small' | 'micro';
  peerGroup: string[];
  signalDensity: number;      // signals per month
}
```

Stored in `meta` — used by gap analysis to normalize scores across entities of different sizes. A Reality Score of 85 means different things for NVIDIA (thousands of signals) vs. a Series B startup (dozens).

---

## 4. Signal Schema

Every data point ingested — a patent filing, a press release, a job posting, an SEC filing — becomes a Signal. This is the atomic unit the gap analysis computes on.

### PostgreSQL Schema

```sql
CREATE TABLE signals (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES entities(id),
  source_id TEXT NOT NULL REFERENCES sources(id),

  -- Classification
  polarity TEXT NOT NULL CHECK (polarity IN ('declarative', 'behavioral')),
  category TEXT NOT NULL,                -- SignalCategory enum
  tier SMALLINT NOT NULL CHECK (tier IN (1, 2, 3)),
  domains TEXT[] DEFAULT '{}',

  -- Content
  title TEXT NOT NULL,
  raw_payload JSONB,
  raw_document_ref TEXT,                 -- MinIO S3 key for large documents
  extracted_claims JSONB DEFAULT '[]',

  -- Multi-entity
  secondary_entities JSONB DEFAULT '[]', -- [{entityId, role}]

  -- Strength
  intensity NUMERIC DEFAULT 0.5,
  intensity_factors TEXT[] DEFAULT '{}',
  financial_weight JSONB,                -- {amount, currency, magnitude}

  -- Geography
  geography JSONB,                       -- {jurisdictions[], coordinates, region}

  -- Provenance
  source_url TEXT,
  published_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ DEFAULT NOW(),
  relevance_window JSONB,                -- {signalDate, publishDelay, relevantUntil}

  -- Quality
  confidence NUMERIC DEFAULT 0.5,
  extraction_method TEXT DEFAULT 'agent', -- structured, agent, hybrid
  parser_id TEXT,
  verification TEXT DEFAULT 'unverified', -- verified, unverified, disputed, retracted
  verified_at TIMESTAMPTZ,
  verified_by TEXT,

  -- Relationships
  related_signals JSONB DEFAULT '[]',    -- [{signalId, relation}]

  -- Dedup & Lifecycle
  content_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_signals_entity_polarity ON signals(entity_id, polarity, created_at DESC);
CREATE INDEX idx_signals_entity_domain ON signals(entity_id, polarity) INCLUDE (domains);
CREATE INDEX idx_signals_source ON signals(source_id, ingested_at DESC);
CREATE INDEX idx_signals_category ON signals(category, created_at DESC);
CREATE INDEX idx_signals_expires ON signals(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_signals_published ON signals(published_at DESC);
```

### Signal Categories

```typescript
type SignalCategory =
  // Behavioral
  | 'patent-filing' | 'patent-prosecution' | 'patent-abandonment' | 'patent-transfer'
  | 'financial-filing' | 'material-event' | 'insider-trading'
  | 'government-contract' | 'building-permit' | 'trademark-registration'
  | 'import-export' | 'funding-round' | 'job-posting' | 'visa-application'
  | 'academic-publication' | 'conference-talk' | 'domain-registration'
  | 'construction-permit' | 'utility-application'
  // Declarative
  | 'press-release' | 'earnings-call' | 'marketing' | 'strategy-presentation'
  | 'esg-report' | 'executive-interview' | 'partnership-announcement'
  | 'policy-statement' | 'conference-keynote'
  // Content-classified
  | 'news-article'
  // Advanced sources
  | 'foia-response' | 'court-filing' | 'lobbying-disclosure' | 'satellite-imagery'
  | 'ship-ais' | 'flight-tracking' | 'fcc-authorization' | 'environmental-filing'
  | 'waste-manifest' | 'property-record' | 'grid-interconnection'
  | 'insurance-filing' | 'standards-body' | 'app-registry';
```

### Claim Structure

```typescript
interface Claim {
  subject: string;        // entity ID or free text
  predicate: string;      // "filed-patent", "announced-partnership", "hired-for"
  object: string;         // "solid-state-battery-electrolyte", "Samsung", "ML engineer"
  confidence: number;
  evidence: string;       // excerpt from source
}
```

### Signal Relationship Types

```typescript
type SignalRelation = 'supersedes' | 'responds-to' | 'corroborates' | 'contradicts' | 'follows';
```

### Category-Specific Decay Rates

Different signal categories decay at different rates for gap analysis scoring:

```typescript
const DECAY_RATES: Record<string, number> = {
  'patent-filing': 0.002,          // half-life ~347 days
  'patent-abandonment': 0.001,     // half-life ~693 days
  'building-permit': 0.001,        // half-life ~693 days
  'financial-filing': 0.004,       // half-life ~173 days
  'government-contract': 0.003,    // half-life ~231 days
  'job-posting': 0.03,             // half-life ~23 days
  'press-release': 0.015,          // half-life ~46 days
  'earnings-call': 0.015,          // half-life ~46 days
  'news-article': 0.02,            // half-life ~35 days
  'foia-response': 0.002,          // half-life ~347 days
};
```

### Job Posting Lifecycle Enrichment

Job postings carry additional lifecycle metadata for behavioral analysis:

```typescript
interface JobPostingMeta {
  firstSeenAt: Date;
  lastSeenAt: Date;
  removedAt?: Date;
  durationDays: number;
  repostedCount: number;
  fillSpeed: 'fast' | 'normal' | 'slow' | 'stale';
  // fast: <14 days, normal: 14-45, slow: 45-90, stale: >90
}
```

Stored in `raw_payload` for job-posting signals. Ghost listing detection uses this metadata — see Section 10.

---

## 5. Ingestion Framework

Generic pipeline that turns raw external data into classified signals. The existing RSS news pipeline becomes the first source migrated into it.

### Pipeline Architecture

```
SourceRegistry → Scheduler → Fetcher → Parser/Agent → Classifier → EntityResolver → SignalWriter → GraphUpdater → SSE
```

### Source Configuration

```sql
CREATE TABLE sources (
  id TEXT PRIMARY KEY,                    -- "source:uspto-patents"
  name TEXT NOT NULL,
  category TEXT NOT NULL,                 -- maps to SignalCategory
  polarity TEXT NOT NULL,                 -- declarative, behavioral, classify
  tier SMALLINT NOT NULL,

  -- Fetcher
  fetcher_type TEXT NOT NULL,             -- api, rss, scrape, bulk-download, foia
  fetcher_url TEXT NOT NULL,
  fetcher_auth JSONB,                     -- {type, keyRef}
  fetcher_schedule TEXT NOT NULL,         -- cron expression
  fetcher_rate_limit_ms INT,
  fetcher_timeout_ms INT,
  fetcher_pagination TEXT,                -- offset, cursor, date-range, none

  -- Incremental fetch state
  fetch_state JSONB DEFAULT '{}',         -- {lastCursor, lastDate, lastOffset, lastETag, checkpoint}

  -- Backfill
  backfill JSONB,                         -- {enabled, startDate, endDate, batchSize, rateLimitMs, status, progress}

  -- Parser
  parser_mode TEXT NOT NULL,              -- structured, agent, hybrid
  parser_ref TEXT,                        -- parser module reference
  parser_prompt TEXT,                     -- LLM extraction prompt template
  parser_response_schema JSONB,
  parser_validation JSONB,                -- {requiredFields, minConfidence, maxClaimsPerSignal, sampleValidation}

  -- Dependencies
  dependencies JSONB DEFAULT '[]',        -- [{sourceId, requirement}]

  -- Self-learning
  learning_extraction_count INT DEFAULT 0,
  learning_confirmation_count INT DEFAULT 0,
  learning_accuracy NUMERIC DEFAULT 0,
  learning_last_promotion_check TIMESTAMPTZ,
  learning_promoted BOOLEAN DEFAULT false,

  -- Health
  health_last_fetch_at TIMESTAMPTZ,
  health_last_success_at TIMESTAMPTZ,
  health_last_error_at TIMESTAMPTZ,
  health_last_error TEXT,
  health_consecutive_failures INT DEFAULT 0,
  health_total_fetches INT DEFAULT 0,
  health_total_signals INT DEFAULT 0,

  -- Costs
  cost_total_api_calls INT DEFAULT 0,
  cost_total_tokens_in BIGINT DEFAULT 0,
  cost_total_tokens_out BIGINT DEFAULT 0,
  cost_estimated_usd NUMERIC DEFAULT 0,
  cost_per_signal NUMERIC DEFAULT 0,

  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Pipeline Run Tracking

```sql
CREATE TABLE pipeline_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL,                   -- running, completed, failed, partial
  fetched INT DEFAULT 0,
  parsed INT DEFAULT 0,
  classified INT DEFAULT 0,
  resolved INT DEFAULT 0,
  written INT DEFAULT 0,
  deduplicated INT DEFAULT 0,
  failed INT DEFAULT 0,
  dlqd INT DEFAULT 0,
  duration_ms INT,
  errors TEXT[] DEFAULT '{}'
);
```

### Dead Letter Queue

```sql
CREATE TABLE signal_dlq (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES sources(id),
  stage TEXT NOT NULL,                    -- fetch, parse, classify, resolve, write, graph
  error TEXT NOT NULL,
  raw_payload JSONB NOT NULL,
  attempt_count INT DEFAULT 1,
  last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  resolution TEXT,                        -- retried, discarded, manual-fix
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

High DLQ rates for a source trigger alerts and feed the self-learning loop — indicating the agent's extraction prompt needs tuning or the source's format has changed.

### Pipeline Stages

**1. Scheduler** — reads `sources` table, creates Temporal workflow executions per source on their cron schedule. Respects `enabled` flag, backs off exponentially on consecutive failures (2x delay after 3 failures, max 24h). Respects source dependencies.

**2. Fetcher** — generic HTTP layer with strategy per type (api, rss, scrape, bulk-download, foia). Handles pagination, auth, rate limiting, retries. Tracks incremental fetch state. The existing `rss-parser.ts` becomes the `rss` strategy.

**3. Parser / Agent** — the self-learning core:

```
parser.mode = structured  →  deterministic parser module (fast, free)
parser.mode = agent       →  LLM extraction with prompt + schema (flexible, costs tokens)
parser.mode = hybrid      →  try structured, fall back to agent on failure
```

**Self-learning promotion loop:**
1. Track every agent extraction with its output
2. Periodically (daily or after N extractions) run a promotion check
3. Sample recent agent extractions, compare against structured data where available
4. If accuracy > 95% over 500+ extractions → generate a structured parser
5. Flag for human review before promotion
6. Once approved → `parser_mode = 'structured'`, `learning_promoted = true`
7. Agent becomes the fallback for edge cases (`parser_mode = 'hybrid'`)

DLQ rate is a negative signal in this loop — high DLQ rates reset the promotion threshold and trigger prompt review.

**4. Classifier** — determines polarity if `source.polarity = 'classify'`. Most sources have known polarity. News articles need content-based classification using keyword patterns first, LLM fallback for ambiguous cases.

**5. Entity Resolver** — matches extracted entity names to `entities` table:
- Exact match on `external_ids` (ticker, CIK, LEI)
- Exact match on `aliases`
- Fuzzy match via Typesense with confidence threshold (>0.85)
- If no match → create candidate entity (`status = 'unverified'`)
- If multiple matches → flag for review, pick highest confidence
- Resolution feedback loop: confirmed correct resolutions become high-confidence aliases, incorrect ones become negative examples

**6. Signal Writer** — creates signal records, updates `entity.signal_count` counters, handles dedup via `content_hash`.

**7. Graph Updater** — creates Neo4j edges from `extracted_claims`. Each claim becomes a graph relationship with confidence and provenance.

**8. SSE Publisher** — publishes `signal-ingested` event for real-time dashboard updates.

### Temporal Workflow Definitions

```
Source Ingestion Workflow (per source, per schedule)
  → Fetch Activity (HTTP call, pagination)
  → Parse Activity (structured or agent)
  → For each parsed signal:
      → Child Workflow: Entity Resolution
      → Child Workflow: Signal Classification
  → Batch Write Activity (signals to PostgreSQL)
  → Graph Update Activity (Neo4j edges)
  → SSE Publish Activity
  → Update Source Health Activity

FOIA Lifecycle Workflow (per request, spans months)
  → File Request Activity
  → Wait for Signal: "response-received" (blocks indefinitely)
  → Parse Response Activity (agent-driven PDF extraction)
  → Entity Resolution Child Workflow
  → Signal Writer Activity
  → Cascade: Trigger new FOIA requests based on findings

Gap Analysis Workflow (periodic or triggered)
  → Query Signals Activity (from ClickHouse)
  → Compute Scores Activity
  → Run Detectors Activity
  → Generate Alerts Activity
  → Deliver Alerts (webhook, SSE, email) Activities
```

### RSS Migration

The existing pipeline maps to the new framework:

| Current | New Framework |
|---|---|
| `feed-registry.ts` | `sources` table (50+ entries, `fetcher_type = 'rss'`) |
| `rss-parser.ts` | Fetcher `rss` strategy |
| `enrichment.ts` (NLP) | Entity Resolver + Classifier |
| `news-aggregator.ts` | Scheduler + Temporal workflow |
| `agents/news-rss/worker.ts` | Parser `agent` mode |
| Direct MongoDB writes | Signal Writer |
| Direct graph edge writes | Graph Updater |

---

## 6. Gap Analysis Engine

The core computation that turns raw signals into intelligence. Reads signals, computes alignment scores per entity-domain pair, detects patterns, generates alerts.

### Gap Score Schema

```sql
CREATE TABLE gap_scores (
  id TEXT PRIMARY KEY,                    -- "company:nvidia::ai-inference"
  entity_id TEXT NOT NULL REFERENCES entities(id),
  domain TEXT NOT NULL,

  -- Raw counts
  behavioral_count INT DEFAULT 0,
  behavioral_weighted NUMERIC DEFAULT 0,
  behavioral_top_signals JSONB DEFAULT '[]',
  declarative_count INT DEFAULT 0,
  declarative_weighted NUMERIC DEFAULT 0,
  declarative_top_signals JSONB DEFAULT '[]',

  -- Computed
  alignment NUMERIC,
  reality_score NUMERIC,                  -- 0-100
  category TEXT,                          -- confirmed, stealth, vaporware, pivot, insufficient-data
  trend TEXT,                             -- improving, stable, declining

  -- Confidence
  confidence_level NUMERIC,
  confidence_interval JSONB,              -- [low, high]
  confidence_factors TEXT[] DEFAULT '{}',

  -- Normalization
  normalization JSONB,                    -- {entityScale, peerGroup, percentileAlignment, signalDensity}

  -- History tracking
  previous_alignment NUMERIC,
  previous_category TEXT,
  category_changed_at TIMESTAMPTZ,

  -- Window
  signal_window_from TIMESTAMPTZ,
  signal_window_to TIMESTAMPTZ,
  computed_at TIMESTAMPTZ,
  next_compute_at TIMESTAMPTZ,

  -- Audit
  audit JSONB,                            -- {signalIds, weights, excludedSignals, algorithmVersion}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(entity_id, domain)
);

CREATE TABLE gap_score_history (
  id SERIAL PRIMARY KEY,
  entity_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  alignment NUMERIC,
  reality_score NUMERIC,
  category TEXT,
  behavioral_count INT,
  behavioral_weighted NUMERIC,
  declarative_count INT,
  declarative_weighted NUMERIC,
  computed_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_gap_history ON gap_score_history(entity_id, domain, computed_at DESC);
```

### Scoring Algorithm

```
For each signal in the entity-domain pair:

  tier_weight     = { 1: 1.0, 2: 0.7, 3: 0.4 }[signal.tier]
  recency_decay   = e^(-λ × days_since_signal)      // λ from DECAY_RATES per category
  financial_mult  = { trivial: 0.5, minor: 0.8, significant: 1.0,
                      major: 1.5, transformative: 2.0 }[magnitude] ?? 1.0
  signal_weight   = intensity × tier_weight × recency_decay × financial_mult

Behavioral weighted  = Σ signal_weight for behavioral signals
Declarative weighted = Σ signal_weight for declarative signals

Alignment = behavioral / declarative  (if declarative = 0 → ∞ → stealth)

Reality Score = normalize(alignment, signal_count, verification_ratio) → 0-100
```

### Category Classification

```
if total_signals < 5:                          → 'insufficient-data'
if 0.8 ≤ alignment ≤ 1.2:                     → 'confirmed'
if alignment > 1.5 AND declarative_count < 3:  → 'stealth'
if alignment < 0.5 AND behavioral_count < 3:   → 'vaporware'
if behavioral domains ≠ declarative domains:    → 'pivot'
```

### Scheduling

- Full recompute for watched entities: every 6 hours
- Triggered recompute: when a new signal is written for a watched entity-domain pair (debounced 5 min)
- Pattern detection: runs after each scoring batch
- Alerts: published immediately via SSE, queued for webhook/email delivery

---

## 7. Public Engine API

Versioned API surface consumed by the Signal dashboard, the globe, and external customers.

### Endpoint Map

```
/engine/v1/
├── /entities
│   ├── GET    /                    # list/search (paginated, filterable)
│   ├── GET    /:id                 # single entity with current scores
│   ├── GET    /:id/signals         # signals for entity
│   ├── GET    /:id/scores          # gap scores across all domains
│   ├── GET    /:id/scores/:domain  # gap score for specific domain
│   ├── GET    /:id/history         # score history over time
│   ├── GET    /:id/alerts          # alerts for entity
│   ├── GET    /:id/graph           # graph connections
│   ├── POST   /resolve             # name/alias → entity ID
│   └── POST   /batch               # multiple entities in one request
│
├── /signals
│   ├── GET    /                    # global signal feed
│   ├── GET    /:id                 # single signal with full payload
│   ├── GET    /feed                # real-time SSE
│   ├── GET    /stats               # volume by source, category, polarity
│   └── POST   /batch               # signals for multiple entities
│
├── /sources
│   ├── GET    /                    # all sources with health
│   ├── GET    /:id                 # source detail + health + costs
│   ├── GET    /:id/runs            # pipeline run history
│   └── POST   /:id/trigger         # manual fetch trigger (admin)
│
├── /gaps
│   ├── GET    /                    # all gap scores (filterable)
│   ├── GET    /leaderboard         # ranked entities by score/category
│   ├── GET    /movers              # biggest score changes in N days
│   ├── GET    /domain/:domain      # entities in a specific domain
│   └── POST   /batch               # multiple entity-domain pairs
│
├── /compare
│   └── GET    /?entities=a,b&domain=x  # side-by-side comparison
│
├── /alerts
│   ├── GET    /                    # all alerts (filterable)
│   ├── PATCH  /:id                 # update status
│   └── GET    /feed                # real-time SSE
│
├── /watchlists
│   ├── GET    /                    # team's watchlists
│   ├── POST   /                    # create
│   ├── PATCH  /:id                 # update
│   ├── DELETE /:id                 # delete
│   └── POST   /:id/entities        # add entities
│
├── /foia
│   ├── GET    /requests            # all requests
│   ├── POST   /requests            # file new request
│   ├── GET    /requests/:id        # request detail + response
│   ├── GET    /corpus              # search scraped FOIA corpus
│   └── GET    /agencies            # agency registry
│
├── /domains
│   ├── GET    /                    # domain taxonomy
│   └── GET    /:id                 # domain detail
│
├── /export
│   └── POST   /                    # async export job
│
├── /stream
│   └── GET    /                    # unified SSE stream
│
├── /graphql
│   └── POST   /                    # GraphQL endpoint
│
└── /admin
    ├── POST   /recompute           # trigger gap analysis
    ├── GET    /pipeline/health      # pipeline dashboard
    ├── GET    /dlq                  # dead letter queue
    └── POST   /dlq/:id/retry       # retry DLQ entry
```

### Service Layer

```
api/src/services/
├── EntityService.ts
├── SignalService.ts
├── SourceService.ts
├── GapService.ts
├── AlertService.ts
├── WatchlistService.ts
├── FOIAService.ts
├── DomainService.ts
├── GraphService.ts
├── StreamService.ts
├── ExportService.ts
└── UsageService.ts
```

### Authentication & Scoping

```typescript
interface APIScope {
  tier: 'free' | 'pro' | 'enterprise';
  limits: {
    requestsPerDay: number;           // free: 100, pro: 10,000, enterprise: unlimited
    signalHistoryDays: number;        // free: 30, pro: 365, enterprise: unlimited
    maxWatchlistEntities: number;     // free: 5, pro: 100, enterprise: unlimited
    maxFOIARequestsPerMonth: number;  // free: 0, pro: 10, enterprise: 100
    sseAccess: boolean;               // free: false, pro: true, enterprise: true
    webhookAccess: boolean;           // free: false, pro: false, enterprise: true
    rawPayloadAccess: boolean;        // free: false, pro: false, enterprise: true
  };
}
```

### Usage Metering

```sql
CREATE TABLE usage_records (
  id SERIAL PRIMARY KEY,
  team_id TEXT NOT NULL,
  date DATE NOT NULL,
  requests INT DEFAULT 0,
  signals_queried INT DEFAULT 0,
  entities_queried INT DEFAULT 0,
  foia_requests_filed INT DEFAULT 0,
  sse_connection_minutes INT DEFAULT 0,
  webhook_deliveries INT DEFAULT 0,
  UNIQUE(team_id, date)
);
```

### Webhook Delivery

```sql
CREATE TABLE webhook_deliveries (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  watchlist_id TEXT,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',          -- pending, delivered, failed, exhausted
  attempts JSONB DEFAULT '[]',
  max_attempts INT DEFAULT 5,
  next_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Response Format

All endpoints return:

```json
{
  "data": {},
  "meta": {
    "total": 1234,
    "limit": 50,
    "cursor": "...",
    "hasMore": true,
    "computedAt": "2026-03-22T00:00:00Z",
    "tier": "pro",
    "usage": { "requestsToday": 847, "limit": 10000 }
  }
}
```

### Rate Limit Headers

```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9153
X-RateLimit-Reset: 1711152000
X-Usage-Tier: pro
```

### Pagination

All `/engine/v1/` endpoints use cursor-based pagination. Legacy `/api/v1/` keeps offset-based for backwards compatibility.

---

## 8. Signal Dashboard UI

Gambit Signal is a React + Tailwind dashboard — the primary product surface. The existing globe is embedded as "Spatial View," one feature within the dashboard.

### Product URLs

```
gambit.io/signal    → Signal dashboard  → /engine/v1/
gambit.io/globe     → Globe (legacy, redirects to Signal spatial view)
api.gambit.io       → Public API        → /engine/v1/
```

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Header: Logo │ Search │ Watchlist Selector │ User           │
├────────────┬─────────────────────────────────────────────────┤
│            │                                                 │
│  Sidebar   │  Main Content Area                              │
│            │                                                 │
│  Navigation│  Active View (swaps based on selection):        │
│  • Leaders │  • Leaderboard (default)                        │
│  • Alerts  │  • Entity Detail                                │
│  • Compare │  • Comparison                                   │
│  • Sources │  • Alert Feed                                   │
│  • FOIA    │  • Source Health                                 │
│  • Spatial │  • FOIA Tracker                                 │
│            │  • Spatial View (Globe)                          │
│  ───────── │                                                 │
│  Filters   │  ┌─────────────────────────────────────────┐    │
│  • Domain  │  │  Bottom Bar: Signal Feed (real-time)     │    │
│  • Type    │  │  streaming via SSE                       │    │
│  • Score   │  └─────────────────────────────────────────┘    │
│  • Category│                                                 │
│            │                                                 │
│  ───────── │                                                 │
│  Watchlist │                                                 │
│  (quick    │                                                 │
│   access)  │                                                 │
│            │                                                 │
├────────────┴─────────────────────────────────────────────────┤
│  Status: Pipeline Health │ Signal Count │ Last Ingestion     │
└──────────────────────────────────────────────────────────────┘
```

### Views

**1. Leaderboard** — Default landing. Ranked table of entities sorted by intelligence value. Tabs: All, Stealth, Vaporware, Acquisition Targets, Movers. Sortable by Reality Score, signal count, trend. Click row → Entity Detail.

**2. Entity Detail** — Deep dive into one entity. Stat cards (Reality Score, behavioral count, declarative count, active alerts). Domain scores table with per-domain alignment bars and sparklines. Score history chart (12 months). Signal timeline (filterable by polarity, category, domain). Active alerts with action buttons (acknowledge, investigate, dismiss). "Add to Watchlist" action.

**3. Comparison** — Side-by-side entity analysis. Accessed via multi-select from leaderboard or search. Domain-by-domain score comparison, divergence timeline (overlaid score histories), signal count ratios.

**4. Alert Feed** — Real-time stream of intelligence alerts across all watched entities. Filterable by type (stealth, vaporware, acquisition, contradiction, trend reversal), severity, date range. Action buttons per alert. Clicking "Investigate" opens Entity Detail.

**5. Source Health** — Operations dashboard. Table of all sources with status, last run, signal count, cost per signal. Pipeline metrics (24h: fetched, parsed, resolved, written, deduped, DLQ'd). DLQ viewer with retry capability.

**6. FOIA Tracker** — Active and historical FOIA request management. File new requests. Track status per agency. View responses with extracted signals. See cascading request chains.

**7. Spatial View** — The globe, embedded as a React component. Deck.GL layers for all entity types. Color-coded by intelligence signals (Reality Score heatmap, stealth/vaporware markers, disruption indicators). Click entity on globe → Entity Detail. All existing layers (conflicts, bases, chokepoints, trade routes, elections, NSA zones) preserved.

### Component Architecture

```
signal/src/
├── app.tsx
├── layout/
│   ├── header.tsx
│   ├── sidebar.tsx
│   ├── status-bar.tsx
│   └── signal-feed-bar.tsx
├── views/
│   ├── leaderboard.tsx
│   ├── entity-detail.tsx
│   ├── comparison.tsx
│   ├── alert-feed.tsx
│   ├── source-health.tsx
│   ├── foia-tracker.tsx
│   └── spatial-view.tsx
├── components/
│   ├── score-bar.tsx
│   ├── domain-row.tsx
│   ├── signal-card.tsx
│   ├── alert-card.tsx
│   ├── score-chart.tsx
│   ├── polarity-badge.tsx
│   ├── entity-search.tsx
│   └── watchlist-picker.tsx
├── hooks/
│   ├── use-entity.ts
│   ├── use-signals.ts
│   ├── use-alerts.ts
│   ├── use-gap-scores.ts
│   ├── use-sse-stream.ts
│   └── use-leaderboard.ts
└── api/
    └── engine-client.ts          # Hono RPC typed client
```

### Globe Integration

- Spatial View is one navigation item in the sidebar
- Entity popups on the globe show Reality Score badges
- Globe layers can be colored by gap analysis data (risk heatmap based on signal intelligence)
- Click entity on globe → navigate to Entity Detail view
- Alert indicators pulse on the globe at entity locations
- Trade route disruptions highlighted based on behavioral signal analysis

---

## 9. Domain Registry

The engine is entity-agnostic and domain-agnostic. Intelligence domains define the vocabulary for signal classification and gap analysis. Each domain is a potential product module.

### Domain Taxonomy Schema

```sql
CREATE TABLE domain_taxonomy (
  id TEXT PRIMARY KEY,                    -- "ai-inference"
  name TEXT NOT NULL,                     -- "AI Inference"
  aliases TEXT[] DEFAULT '{}',            -- ["ml-inference", "model-serving"]
  parent_domain TEXT REFERENCES domain_taxonomy(id),
  cpc_codes TEXT[] DEFAULT '{}',          -- patent classification codes
  naics_codes TEXT[] DEFAULT '{}',        -- industry codes
  keywords TEXT[] DEFAULT '{}',           -- for classifier matching
  decay_rate NUMERIC,                     -- override default decay if needed
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Product Domains

**Geopolitical Intelligence** (existing capabilities, reframed)
- Conflict monitoring — status, casualties, timeline, predictions
- Chokepoint / trade route disruption tracking
- Military posture — bases, deployments, exercises
- Non-state actor activity
- Election tracking and impact analysis
- Country risk scoring
- 220+ news feeds with NLP enrichment

**Corporate Intelligence** (new Signal capabilities)
- Reality Score / gap analysis
- Stealth project detection
- Vaporware detection
- Acquisition target scoring
- Patent / IP analytics
- SEC filing analysis
- Hiring signal analysis
- Supply chain behavioral tracking

**FOIA Intelligence** (unique differentiator)
- Automated FOIA filing
- Response corpus search
- Cross-agency entity profiling
- Cascading request chains

**Financial Intelligence**
- Central bank policy signal tracking
- Sovereign debt issuance patterns
- Currency intervention detection
- Sanctions evasion detection
- Cryptocurrency wallet clustering
- Commodity futures vs. physical delivery
- Insurance market pricing

**Cyber Intelligence**
- CVE disclosure timing analysis
- Dark web marketplace monitoring
- BGP routing anomalies
- Certificate transparency analysis
- Malware sample attribution
- Source code repository analysis

**Energy & Climate Intelligence**
- Grid interconnection queues
- Carbon credit trading vs. actual emissions
- Renewable energy permits vs. fossil fuel investment
- Pipeline capacity booking
- LNG tanker routing and charter rates
- Mining permits for critical minerals

**Health & Biotech Intelligence**
- Clinical trial registry analysis
- FDA meeting calendars and advisory committees
- Drug patent expiration cliffs vs. pipeline activity
- WHO outbreak signals vs. government reporting
- Medical device clearance patterns

**Supply Chain Intelligence**
- Semiconductor foundry utilization
- Rare earth processing capacity
- Container shipping rate anomalies
- Warehouse construction permits
- Agricultural commodity flow analysis
- Automotive parts import ratios (EV vs. ICE)

**Space & Aerospace Intelligence**
- Launch manifest analysis
- Satellite registration filings
- Ground station construction
- Export license applications (ITAR)
- Space debris tracking

**Maritime Intelligence**
- Ship ownership network analysis
- Flag state changes
- Ship-to-ship transfer patterns
- Port infrastructure investment
- Naval vessel movement patterns
- Fishing fleet positioning
- Submarine cable construction

**Labor & Talent Intelligence**
- University enrollment shifts by discipline
- H-1B/visa patterns by company
- Executive movement networks
- Salary data shifts
- Ghost listing detection

**Legal & Regulatory Intelligence**
- Antitrust investigation signals
- Regulatory comment period analysis
- Standards body voting patterns
- Trade remedy petitions
- Export control classification changes

**Real Estate & Infrastructure Intelligence**
- Commercial real estate lease filings
- Data center construction permits
- Telecommunications tower permits
- Special economic zone utilization

**Media & Information Intelligence**
- State media narrative analysis vs. policy actions
- Propaganda campaign detection
- Think tank funding patterns
- Conference sponsorship patterns

Each domain is a `domain_taxonomy` entry. Adding a new domain means adding taxonomy entries and configuring sources that feed it. The engine, API, and dashboard all work automatically with new domains.

---

## 10. Intelligence Patterns

Beyond the standard gap analysis, the engine implements specialized detection patterns.

### Core Detectors

**1. Stealth Project Detector**
- Patent filing velocity in domain increases >50% QoQ
- Job postings appear requiring domain-specific skills
- Import records show related material procurement
- Earnings call mentions of domain flat or declining
- No press releases in domain
- → Alert: `STEALTH_PROJECT_DETECTED`

**2. Vaporware Detector**
- Press releases heavily promote a technology
- Patent filings in domain declining or static
- R&D spend flat
- No building permits, import records, manufacturing signals
- Job postings lack specific technical skills
- → Alert: `VAPORWARE_RISK`

**3. Acquisition Target Scorer**
- Competitor co-investment: +25
- Foundational patents with high citation rate: +15
- Approaching commercialization: +15
- Key talent concentration: +10
- Clean structure (fabless): +10
- Recent precedent: +5
- Capital intensity: +5
- Score > 80 → Alert: `ACQUISITION_TARGET`

**4. Contradiction Detector**
- Related signals with `contradicts` relationship
- Declarative signal in domain X + behavioral signal opposing domain X within 90 days
- → Alert: `STRATEGIC_CONTRADICTION`

**5. Trend Reversal Detector**
- Category changes from previous computation
- Alignment shifts by >0.5
- → Alert: `TREND_REVERSAL`

### Advanced Detectors

**6. Ghost Listing Detector** (sub-pattern of vaporware)
- Entity has >20 open postings in domain X for >90 days
- No corresponding hires visible (LinkedIn, H-1B data)
- No corroborating behavioral signals
- → Downweight job posting signals by 0.3x
- → Alert: `SUSPECTED_GHOST_LISTINGS`

**7. Patent Examiner Behavior Analysis**
- Examiner with high rejection rate grants entity's patent → genuinely novel technology
- Multiple examiners cite entity's patents as prior art → foundational IP
- Patent assigned to specialized/classified art unit → government interest

**8. Domain Registration Timing Analysis**
- Bulk registration (10+ domains in a week) → product naming phase, 12+ months out
- Defensive registration (typo variants) → launch imminent
- Registration + SSL provisioning → active development
- Domain registered by law firm → stealth mode
- Domain + trademark application within 30 days → high commercialization confidence

**9. Academic Co-Authorship Network Shifts**
- Authors suddenly stop publishing → technology moved to proprietary
- Co-authors from competing companies on same university paper → converging on same technology
- Prolific academic joins company patent filings → talent acquisition signal

**10. Supplier Earnings Call Triangulation**
- 3+ suppliers mention "major customer" increasing orders → triangulate customer identity
- Supplier mentions diversifying away from largest customer → customer in trouble
- Supplier inventory buildup in specific components → product announcement incoming

**11. Conference Talk Withdrawal Detection**
- Talk submitted then withdrawn → research became commercially sensitive
- Author substitution (senior → junior) → senior moved to stealth project
- Company absent from conference they always attend → hiding progress or nothing to show

**12. Environmental Impact Filing Analysis**
- Chemical lists reveal manufacturing type
- Water usage requirements reveal process type
- Air emissions permits map to specific industrial processes
- Filings appear 2-3 years before facility opens

**13. The "Dog That Didn't Bark" Meta-Pattern**
- Maintains a model of "expected signals if declarative statement is true"
- Checks whether expected behavioral signals materialized
- Company announces factory → expected: building permit, utility application, construction permits
- None appear within 12 months → declarative without behavioral → vaporware signal

### Cross-Entity Patterns

**14. Competitor Convergence**
- 3+ companies in same sector increasing behavioral signals in same domain simultaneously

**15. Supply Chain Cascade**
- Upstream supplier signal change predicts downstream entity behavior

**16. Sector Rotation**
- Industry-wide domain shift detected across multiple entities

### Alert Schema

```sql
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES entities(id),
  domain TEXT,
  type TEXT NOT NULL,                     -- stealth-project, vaporware-risk, etc.
  severity TEXT NOT NULL,                 -- info, warning, critical

  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence JSONB NOT NULL,                -- {behavioral: [], declarative: []}

  alignment NUMERIC,
  reality_score NUMERIC,
  confidence NUMERIC,
  prediction TEXT,

  status TEXT DEFAULT 'new',              -- new, acknowledged, investigating, dismissed, confirmed
  status_by TEXT,
  status_at TIMESTAMPTZ,

  delivered_sse BOOLEAN DEFAULT false,
  delivered_webhook BOOLEAN DEFAULT false,
  delivered_email BOOLEAN DEFAULT false,

  team_id TEXT,
  watchlist_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Alert Cooldown

```typescript
interface AlertCooldown {
  minIntervalHours: number;       // don't re-fire same type for same entity-domain
  requireNewEvidence: boolean;    // only re-fire if new signals since last alert
  escalateAfter?: number;         // days — pattern persists → escalate severity
  // 0-30 days: info, 30-90 days: warning, 90+ days: critical
}
```

### Watchlist Schema

```sql
CREATE TABLE watchlists (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  entries JSONB NOT NULL,                 -- [{entityId, domains[], alertTypes[]}]
  notifications JSONB NOT NULL,           -- {sse, webhook: {url, secret}, email[]}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 11. FOIA Intelligence System

An active intelligence collection system that files, tracks, and processes FOIA requests at scale, plus scrapes all publicly available FOIA responses into the signal corpus.

### FOIA Request Schema

```sql
CREATE TABLE foia_requests (
  id TEXT PRIMARY KEY,
  entity_id TEXT REFERENCES entities(id),
  agency_id TEXT NOT NULL REFERENCES foia_agencies(id),

  description TEXT NOT NULL,
  date_range_from DATE,
  date_range_to DATE,
  keywords TEXT[] DEFAULT '{}',

  priority INT DEFAULT 50,
  expected_value TEXT,                    -- high, medium, low
  trigger_signal_id TEXT REFERENCES signals(id) ON DELETE SET NULL,

  status TEXT DEFAULT 'draft',            -- draft, filed, acknowledged, processing,
                                          -- fee-estimate, completed, appealed, litigated
  filed_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  estimated_completion DATE,
  tracking_number TEXT,

  response_pages INT,
  redaction_level TEXT,                   -- none, partial, heavy, full-denial
  exemptions_cited TEXT[] DEFAULT '{}',   -- b(1), b(4), etc.
  response_document_refs TEXT[] DEFAULT '{}',  -- MinIO keys

  appeal_filed BOOLEAN DEFAULT false,
  appeal_basis TEXT,

  fees_charged NUMERIC DEFAULT 0,
  fee_waiver_requested BOOLEAN DEFAULT false,
  fee_waiver_granted BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE foia_agencies (
  id TEXT PRIMARY KEY,                    -- "agency:dod"
  name TEXT NOT NULL,
  portal_url TEXT,
  filing_method TEXT NOT NULL,            -- web-form, email, foia-online, api
  rate_limits JSONB,                      -- {maxPerDay, maxPerMonth, maxPending}
  avg_response_days INT,
  fees JSONB,                             -- {searchPerHour, duplicationPerPage, feeWaiverEligible}
  response_format TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### FOIA Corpus Scraping

Continuously scraped into the signal pipeline:

| Source | Content | Frequency |
|---|---|---|
| MuckRock (API) | 150,000+ completed FOIA requests with responses | Every 6 hours |
| DocumentCloud | Millions of source documents from journalists | Daily |
| FOIA.gov | Federal agency FOIA logs | Daily |
| Agency reading rooms | Proactively disclosed documents (15+ agencies) | Daily |
| PropertyOfThePeople.org | FOIA archive | Weekly |
| National Security Archive (GWU) | Declassified national security docs | Weekly |
| CIA FOIA Reading Room | Declassified intelligence | Weekly |
| FBI Vault | Released FBI files | Weekly |
| State-level FOIA equivalents | State public records responses | Weekly |
| Court PACER FOIA dockets | Disputed documents as exhibits | As filed |

### Response Intelligence

FOIA responses produce signals, but the *meta-patterns* of responses are themselves intelligence:

- **Full denial with b(1)** (national security) → confirms classified government relationship
- **Heavy redactions with b(4)** (trade secrets) → government has entity's proprietary information
- **Glomar response** ("neither confirm nor deny") → existence of records is classified
- **Quick response, minimal redactions** → routine government interactions
- **Referral to another agency** → reveals which agency handles the entity
- **Fee waiver denied** → agency doesn't consider request in public interest

### Cascading Requests

FOIA responses trigger new requests automatically:

```
Response reveals Company X has DOE loan guarantee
  → Signal: government-contract (behavioral, Tier 1)
  → Auto-trigger: FOIA to DOE for loan terms
  → Auto-trigger: FOIA to EPA for environmental review
  → Cross-reference: building permits in county mentioned in response
```

### Legal Structure

For maximum FOIA effectiveness, file under a media/press entity designation:
- Fee waivers (eliminates cost barrier to scale)
- Expedited processing eligibility
- Stronger appeal standing
- Publishing analytical reports qualifies under most agencies' media requester definitions

---

## 12. Migration Path

Middle-out approach: new capabilities built on new stack, existing features migrated incrementally.

### Phase 1: Engine Foundation
- Stand up PostgreSQL, ClickHouse, Typesense, Temporal, MinIO alongside existing MongoDB/Neo4j/Redis
- Build service layer for new `/engine/v1/` endpoints
- Create unified entity model — seed from existing MongoDB collections
- Existing `/api/v1/` routes continue working unchanged
- Globe frontend continues consuming `/api/v1/`

### Phase 2: Ingestion Framework
- Build Temporal workflow pipeline
- Migrate RSS news pipeline as first source
- Add first behavioral sources (USPTO, SEC EDGAR)
- Entity resolution service against Typesense
- Signal writing to PostgreSQL + ClickHouse sync

### Phase 3: Gap Analysis + Alerts
- Build scoring engine reading from ClickHouse
- Implement 5 core detectors
- Alert system with watchlists
- Webhook delivery via Temporal

### Phase 4: Signal Dashboard
- Build React + Tailwind frontend
- Leaderboard, Entity Detail, Alert Feed
- Spatial View (globe as React component)
- SSE streaming for real-time updates

### Phase 5: Advanced Capabilities
- FOIA intelligence system
- Advanced detectors (ghost listings, examiner behavior, etc.)
- Cross-entity pattern detection
- Additional domain sources
- Export, GraphQL, billing

### Legacy Migration (ongoing)
- Per entity type: build `/engine/v1/` service → update consumers → deprecate `/api/v1/` route
- MongoDB → PostgreSQL sync via Change Streams during transition
- Eventually MongoDB removed entirely

---

## 13. Tiering & Packaging

### Product Tiers

| Tier | Access |
|---|---|
| **Free** | Leaderboard (top 20), spatial view (limited layers), 5 entity lookups/day, news feed |
| **Pro** | Full leaderboard, all geopolitical modules, 50 watchlist entities, alert feed, 10 FOIA requests/month, API (10k req/day) |
| **Enterprise** | All domains, FOIA intelligence, advanced analytics, unlimited watchlist, webhooks, custom alerts, API (unlimited), export, dedicated support |

### Domain Packaging

Customers subscribe to domains based on their industry:

| Customer Type | Relevant Domains |
|---|---|
| Defense / Intelligence | Geopolitical, Cyber, Space, Maritime, FOIA |
| Hedge Fund / Investment | Corporate, Financial, Supply Chain, Labor |
| Pharma / Biotech | Health, Legal, Supply Chain, Corporate |
| Energy | Energy & Climate, Geopolitical, Maritime, Supply Chain |
| Technology | Corporate, Cyber, Labor, Legal |

### API Scoping

```
X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9153
X-RateLimit-Reset: 1711152000
X-Usage-Tier: pro
```

Usage tracked in Redis for real-time enforcement, PostgreSQL for billing history.

---

## 14. Multi-Tenancy & Security

### Auth Schema (PostgreSQL)

```sql
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free',      -- free, pro, enterprise
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  team_id TEXT NOT NULL REFERENCES teams(id),
  role TEXT NOT NULL DEFAULT 'member',    -- admin, member, viewer
  providers JSONB DEFAULT '[]',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  team_id TEXT NOT NULL REFERENCES teams(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  scopes TEXT[] DEFAULT '{}',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Tenant Isolation Model

Entities, signals, sources, gap scores, and domain taxonomy are **shared global data** — all tenants see the same intelligence. This is the product: Gambit ingests and analyzes data for everyone.

Tenant-scoped data (private to each team):

| Table | Isolation | Mechanism |
|---|---|---|
| `watchlists` | Per team | `team_id` FK + query filter |
| `alerts` | Per team (via watchlist) | `team_id` FK + query filter |
| `foia_requests` | Per team | `team_id` FK + query filter |
| `usage_records` | Per team | `team_id` FK + query filter |
| `webhook_deliveries` | Per team | `team_id` FK + query filter |
| `api_keys` | Per team | `team_id` FK |
| `users` | Per team | `team_id` FK |

PostgreSQL Row Level Security (RLS) enforces isolation on tenant-scoped tables:

```sql
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY watchlists_team_isolation ON watchlists
  USING (team_id = current_setting('app.current_team_id'));

-- Applied to all tenant-scoped tables
```

The API middleware sets `app.current_team_id` from the authenticated API key or JWT before each request.

### Tier Enforcement

Tier limits are enforced at two levels:

1. **API middleware** — checks Redis usage counter (`gambit:usage:{teamId}:{date}`) against team tier limits before processing request
2. **Service layer** — `WatchlistService` checks `team.tier` before allowing creation beyond limit, `FOIAService` checks monthly allowance

### Secrets Management

Source credentials (`fetcher_auth.keyRef`) resolve to environment variables or a secrets store:

```typescript
// keyRef format: "env:USPTO_API_KEY" or "vault:source/uspto/api-key"
async function resolveSecret(keyRef: string): Promise<string> {
  if (keyRef.startsWith('env:')) return process.env[keyRef.slice(4)]!;
  if (keyRef.startsWith('vault:')) return vault.read(keyRef.slice(6));
  throw new Error(`Unknown keyRef format: ${keyRef}`);
}
```

- **Development:** `env:` prefix, secrets in `.env` file
- **Production:** HashiCorp Vault or cloud-native secrets manager (AWS Secrets Manager, GCP Secret Manager)
- **Never** stored as plaintext in the `sources` table — only the `keyRef` pointer

---

## 15. Reality Score Normalization

The normalization function converts raw alignment + metadata into a 0-100 score:

```typescript
function normalizeRealityScore(
  alignment: number,
  behavioralCount: number,
  declarativeCount: number,
  verificationRatio: number,   // verified signals / total signals
  signalDensity: number,       // signals per month
): number {
  const totalSignals = behavioralCount + declarativeCount;

  // Base score from alignment (sigmoid mapping)
  // alignment 1.0 → 75, alignment 0.0 → 15, alignment 2.0+ → 90+
  let base: number;
  if (declarativeCount === 0 && behavioralCount > 0) {
    base = 85; // stealth: high behavioral, unknown declarative
  } else if (behavioralCount === 0 && declarativeCount > 0) {
    base = 15; // pure vaporware
  } else {
    // Sigmoid centered at alignment=1.0, mapped to 30-95 range
    const x = Math.log(alignment); // ln(1.0) = 0, ln(0.5) = -0.69, ln(2.0) = 0.69
    base = 62.5 + 32.5 * Math.tanh(x * 1.5);
  }

  // Confidence multiplier: more signals = more confident in the score
  // Caps at 1.0 above 50 signals, scales linearly below
  const signalConfidence = Math.min(1.0, totalSignals / 50);

  // Verification bonus: verified signals boost score reliability
  // Up to +5 points for fully verified corpus
  const verificationBonus = verificationRatio * 5;

  // Final score
  const raw = base * signalConfidence + verificationBonus;
  return Math.round(Math.max(0, Math.min(100, raw)));
}
```

**Confidence interval** computed from signal count:

```typescript
function computeConfidenceInterval(
  realityScore: number,
  totalSignals: number,
): [number, number] {
  // Margin of error decreases with more signals (√n relationship)
  const margin = Math.round(30 / Math.sqrt(Math.max(1, totalSignals)));
  return [
    Math.max(0, realityScore - margin),
    Math.min(100, realityScore + margin),
  ];
  // 5 signals → ±13, 25 signals → ±6, 100 signals → ±3
}
```

---

## 16. Migration Synchronization Strategy

During the transition from MongoDB to PostgreSQL, data must be consistent across both stores.

### Approach: MongoDB Change Streams → PostgreSQL Sync

```
MongoDB (existing source of truth for legacy collections)
    │
    ├── Change Stream listener (runs as a Temporal workflow)
    │   └── On insert/update/delete in legacy collections:
    │       1. Map document to unified entity schema
    │       2. Upsert into PostgreSQL entities table
    │       3. Update Typesense search index
    │       4. Log sync event for monitoring
    │
    └── /api/v1/ routes continue reading from MongoDB (unchanged)

PostgreSQL (source of truth for ALL new data)
    │
    ├── /engine/v1/ routes read from PostgreSQL
    └── Signal dashboard reads from /engine/v1/
```

### Sync Rules

- **Legacy entity types** (countries, conflicts, bases, chokepoints, nsa, elections, trade-routes, ports): MongoDB → PostgreSQL sync via Change Streams. MongoDB remains writable; PostgreSQL is a read replica for engine queries.
- **New entity types** (companies, organizations, persons): created directly in PostgreSQL. Never exist in MongoDB.
- **Signals, gap scores, alerts, watchlists, FOIA**: PostgreSQL only from day one. Never in MongoDB.
- **Cutover per entity type**: when an entity type's `/api/v1/` route is migrated to `/engine/v1/`, PostgreSQL becomes the writable source of truth for that type. The Change Stream sync direction reverses (PostgreSQL → MongoDB) for any remaining legacy consumers, then MongoDB collection is deprecated.

### Gap Score Storage Clarification

- `gap_scores` (current state) → PostgreSQL. The API reads current scores from PostgreSQL for entity detail views.
- `gap_score_history` (time-series) → ClickHouse. The API reads historical scores from ClickHouse for sparklines, trend analysis, and leaderboard ranking.
- Gap analysis Temporal workflow writes to both: current score upsert to PostgreSQL, historical snapshot append to ClickHouse.
- Leaderboard queries run against ClickHouse (aggregation-heavy, sorted by score with filtering).

### Redis Clarification

- **Development:** self-hosted Redis via Docker (existing container continues). Upstash Redis SDK used with local Redis connection string.
- **Production:** Upstash Redis (managed, HTTP-based). For SSE pub/sub, use Upstash's native pub/sub support via the `@upstash/redis` client.
- The Upstash Redis client library supports both self-hosted Redis and Upstash cloud — same API, different connection string.

### Domain Decay Rate Precedence

When computing signal weight, decay rates are resolved in order:
1. Domain-specific `decay_rate` on `domain_taxonomy` (if set, overrides category default)
2. Category-specific rate from `DECAY_RATES` map
3. Default rate: `0.005` (half-life ~139 days)
