# Phase 3a: Gap Analysis & Detectors — Design Spec

> **Scope:** Computation layer only. Scoring engine, 5 core detectors, workflow orchestration, graph snapshots. Phase 3b (separate spec) covers alerts/watchlists notification layer, webhook delivery, email, alert management API.

> **Boundary:** Phase 3a computes scores, runs detectors, and inserts alerts into PostgreSQL. It publishes events to NATS JetStream for score updates. The Phase 1.5 SSE Gateway delivers these to connected dashboard clients. It does NOT handle watchlist matching, webhook delivery, email notifications, or alert management API.

> **Parent spec:** `docs/v2/2026-03-22-gambit-engine-signal-design.md` (Sections 6, 10, 15, 16)

> **Depends on:** Phase 1 (Engine Foundation) + Phase 2 (Ingestion Framework) — both merged to main.

> **Infrastructure:** Phase 1.5 (Scale Infrastructure) — NATS JetStream event bus, PgCat connection pooling, SSE Gateway, DegradationRegistry, 3-tier cache strategy. Gap scoring publishes events to NATS instead of Redis Pub/Sub. SSE delivery via dedicated SSE Gateway.

---

## Table of Contents

1. [Schema Changes](#1-schema-changes)
2. [Scoring Algorithm](#2-scoring-algorithm)
3. [Detector Architecture](#3-detector-architecture)
4. [Workflow Orchestration](#4-workflow-orchestration)
5. [Graph Snapshots](#5-graph-snapshots)
6. [API Routes](#6-api-routes)
7. [Services](#7-services)
8. [SSE Events](#8-sse-events)
9. [Domain Taxonomy](#9-domain-taxonomy)
10. [Caching & Read Path Optimization](#10-caching--read-path-optimization)
11. [Observability](#11-observability)
12. [Algorithm Versioning](#12-algorithm-versioning)

---

## 1. Schema Changes

### 1.1 Gap Scores — Full Rebuild

Replace the Phase 1 stub in `engine/src/db/schema/analysis.ts`. Nothing reads from this table yet (routes return 501).

```sql
CREATE TABLE gap_scores (
  id TEXT PRIMARY KEY,                        -- "company:nvidia::ai-inference"
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,

  -- Raw counts
  behavioral_count INT DEFAULT 0,
  behavioral_weighted NUMERIC DEFAULT 0,
  behavioral_top_signals JSONB DEFAULT '[]',
  declarative_count INT DEFAULT 0,
  declarative_weighted NUMERIC DEFAULT 0,
  declarative_top_signals JSONB DEFAULT '[]',

  -- Computed
  alignment NUMERIC DEFAULT 0,
  reality_score NUMERIC DEFAULT 0,            -- 0-100
  category TEXT,                              -- confirmed, stealth, vaporware, pivot, insufficient-data, unclassified
  trend TEXT,                                 -- improving, stable, declining

  -- Confidence
  confidence_level NUMERIC,                   -- 0-1 composite
  confidence_interval JSONB,                  -- [low, high]
  confidence_factors TEXT[] DEFAULT '{}',     -- which components were weak

  -- Normalization
  normalization JSONB,                        -- {entityScale, peerGroup, percentileAlignment, signalDensity}

  -- History tracking
  previous_alignment NUMERIC,
  previous_category TEXT,
  category_changed_at TIMESTAMPTZ,

  -- Window
  signal_window_from TIMESTAMPTZ,
  signal_window_to TIMESTAMPTZ,
  computed_at TIMESTAMPTZ,
  next_compute_at TIMESTAMPTZ,

  -- Staleness
  stale_days INT DEFAULT 0,                   -- days since most recent signal

  -- Audit
  audit JSONB,                                -- {signalIds, weights, excludedSignals, algorithmVersion}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(entity_id, domain)
);

CREATE INDEX idx_gap_scores_entity ON gap_scores(entity_id);
CREATE INDEX idx_gap_scores_domain ON gap_scores(domain);
CREATE INDEX idx_gap_scores_category ON gap_scores(category);
CREATE INDEX idx_gap_scores_computed ON gap_scores(computed_at);
```

### 1.2 Alerts — Full Rebuild

Replace the Phase 1 stub. The alerts table is team-scoped (RLS already enabled from Phase 1 init).

```sql
CREATE TABLE alerts (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  entity_id TEXT REFERENCES entities(id),
  domain TEXT,
  type TEXT NOT NULL,                         -- stealth-project, vaporware-risk, acquisition-target, contradiction, trend-reversal
  severity alert_severity NOT NULL,           -- info, warning, critical (existing enum)

  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence JSONB NOT NULL,                    -- {behavioral: SignalRef[], declarative: SignalRef[]}
  evidence_fingerprint TEXT,                  -- hash of sorted signal IDs for dedup

  alignment NUMERIC,                          -- score snapshot at alert time
  reality_score NUMERIC,                      -- score snapshot at alert time
  confidence NUMERIC,
  prediction TEXT,
  recommended_actions TEXT[] DEFAULT '{}',

  status alert_status DEFAULT 'new',
  status_by TEXT,
  status_at TIMESTAMPTZ,

  delivered_sse BOOLEAN DEFAULT false,
  delivered_webhook BOOLEAN DEFAULT false,
  delivered_email BOOLEAN DEFAULT false,

  watchlist_id TEXT,

  meta JSONB DEFAULT '{}',                    -- includes detectorVersion

  expires_at TIMESTAMPTZ,                     -- dismissed/confirmed alerts expire after 90 days
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_team_status_created ON alerts(team_id, status, created_at DESC);
CREATE INDEX idx_alerts_entity ON alerts(entity_id);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_expires ON alerts(expires_at) WHERE expires_at IS NOT NULL;
```

Monthly partitioning by `created_at` for production. In development, standard table.

### 1.3 Watchlists — Evolve

Add `notifications` field to existing stub:

```sql
ALTER TABLE watchlists ADD COLUMN notifications JSONB DEFAULT '{}';
-- notifications: {sse: boolean, webhook: {url, secret}, email: string[]}
```

### 1.4 Watchlist Entities — New Junction Table

Replaces array containment scans with indexed lookups.

```sql
CREATE TABLE watchlist_entities (
  id SERIAL PRIMARY KEY,
  watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,  -- denormalized
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(watchlist_id, entity_id)
);

CREATE INDEX idx_watchlist_entities_entity_team ON watchlist_entities(entity_id, team_id);
CREATE INDEX idx_watchlist_entities_watchlist ON watchlist_entities(watchlist_id);
```

### 1.5 Graph Snapshots — New Table

```sql
CREATE TABLE graph_snapshots (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  layer TEXT NOT NULL,                        -- ownership, co-investment, supply-chain, competitive, regulatory, detector-output
  nodes JSONB NOT NULL DEFAULT '[]',          -- [{id, type, name, realityScore, category, meta}]
  edges JSONB NOT NULL DEFAULT '[]',          -- [{source, target, relation, weight, evidence}]
  stats JSONB DEFAULT '{}',                   -- {nodeCount, edgeCount, maxDepth, truncated}
  status TEXT DEFAULT 'fresh',                -- fresh, refreshing, stale, failed
  last_error TEXT,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_id, layer)
);

CREATE INDEX idx_graph_snapshots_entity ON graph_snapshots(entity_id);
CREATE INDEX idx_graph_snapshots_status ON graph_snapshots(status);
```

Size budget: 500 nodes max per snapshot. Truncate by edge weight for mega-cap entities.

### 1.6 Detector Config — New Table

Entity-type-aware scoring rubrics for heavyweight detectors.

```sql
CREATE TABLE detector_config (
  id TEXT PRIMARY KEY,
  detector_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,                  -- entity_type enum value, or '*' for default
  factors JSONB NOT NULL,                     -- [{name, weight, query, params}]
  threshold NUMERIC NOT NULL,                 -- minimum score to trigger
  version TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(detector_name, entity_type)
);
```

### 1.7 Entities Table — Add `last_signal_at`

The scheduled sweep needs to identify entities with new signals since last gap computation. Add column to existing `entities` table in `engine/src/db/schema/entities.ts`:

```sql
ALTER TABLE entities ADD COLUMN last_signal_at TIMESTAMPTZ;
CREATE INDEX idx_entities_last_signal ON entities(last_signal_at) WHERE last_signal_at IS NOT NULL;
```

Updated by the signal writer activity (`engine/src/pipeline/activities/write.ts`) — after incrementing signal counts, also update `last_signal_at`:

```sql
UPDATE entities SET last_signal_at = GREATEST(last_signal_at, $signalPublishedAt) WHERE id = $entityId;
```

### 1.8 Domain Taxonomy — Add Missing Columns

The existing `domain_taxonomy` table (from Phase 1 stub) is missing `importance_weight` and `decay_rate` columns required by the scoring algorithm (Section 2.1, 2.8).

```sql
ALTER TABLE domain_taxonomy ADD COLUMN importance_weight NUMERIC DEFAULT 1.0;
ALTER TABLE domain_taxonomy ADD COLUMN decay_rate NUMERIC;     -- NULL = use category default
ALTER TABLE domain_taxonomy ADD COLUMN keywords TEXT[] DEFAULT '{}';
ALTER TABLE domain_taxonomy ADD COLUMN cpc_codes TEXT[] DEFAULT '{}';
ALTER TABLE domain_taxonomy ADD COLUMN naics_codes TEXT[] DEFAULT '{}';
ALTER TABLE domain_taxonomy ADD COLUMN aliases TEXT[] DEFAULT '{}';
```

Add corresponding fields to Drizzle schema in `engine/src/db/schema/analysis.ts`.

### 1.9 Watchlists Migration — `entityIds` Array Deprecation

The existing `watchlists.entityIds` text array is replaced by the `watchlist_entities` junction table (Section 1.4). Migration:

1. Create `watchlist_entities` table
2. Migrate existing data: `INSERT INTO watchlist_entities (watchlist_id, entity_id, team_id) SELECT w.id, unnest(w.entity_ids), w.team_id FROM watchlists w WHERE array_length(w.entity_ids, 1) > 0`
3. Drop column: `ALTER TABLE watchlists DROP COLUMN entity_ids`
4. Update Drizzle schema: remove `entityIds` from `watchlists`, add `watchlistEntities` table definition

Since no production data exists yet, this can be done as a clean migration in the implementation plan.

### 1.10 Gap Computation DLQ — New Table

Stores entity-domain pairs that failed gap computation after 3 retries.

```sql
CREATE TABLE gap_computation_dlq (
  id SERIAL PRIMARY KEY,
  entity_id TEXT NOT NULL REFERENCES entities(id),
  domain TEXT NOT NULL,
  error TEXT NOT NULL,
  retry_count INT DEFAULT 0,
  trigger TEXT NOT NULL,                      -- signal-driven, scheduled, manual
  workflow_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by TEXT
);

CREATE INDEX idx_gap_dlq_unresolved ON gap_computation_dlq(created_at) WHERE resolved_at IS NULL;
```

### 1.11 Schema Rebuild Strategy

All Phase 1 stub tables (`gap_scores`, `alerts`, `watchlists`) are empty in the existing codebase — no routes write to them, all return 501. The rebuild strategy is:

1. Drop existing stub tables in reverse FK order
2. Create new tables with full schemas
3. Re-apply RLS policies and triggers from `engine/src/db/init/`

In Drizzle terms: replace the entire content of `engine/src/db/schema/analysis.ts` with the new schema definitions. Run `drizzle-kit generate` and `drizzle-kit migrate` to produce the migration.

### 1.12 New Enum

```sql
CREATE TYPE alert_status AS ENUM ('new', 'acknowledged', 'investigating', 'dismissed', 'confirmed', 'superseded');
```

### 1.13 ClickHouse Additions

**Expand `gap_score_history`:**

The existing Phase 1 table has 10 columns and is missing `trend`, `confidence_level`, and `normalization`. Since this is a pre-production system, drop and recreate:

```sql
DROP TABLE IF EXISTS gap_score_history;

CREATE TABLE gap_score_history (
  entity_id String,
  domain String,
  alignment Float64,
  reality_score Float64,
  category String,
  trend String,
  confidence_level Float64,
  behavioral_count UInt32,
  behavioral_weighted Float64,
  declarative_count UInt32,
  declarative_weighted Float64,
  normalization String,                       -- JSON string
  computed_at DateTime64(3)
) ENGINE = MergeTree()
ORDER BY (entity_id, domain, computed_at)
PARTITION BY toYYYYMM(computed_at)
```

**Pre-aggregated daily history:**

```sql
CREATE MATERIALIZED VIEW gap_score_history_daily
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (entity_id, domain, date)
AS SELECT
  entity_id,
  domain,
  toDate(computed_at) as date,
  avgState(alignment) as avg_alignment,
  avgState(reality_score) as avg_reality_score,
  minState(reality_score) as min_reality_score,
  maxState(reality_score) as max_reality_score,
  anyLastState(category) as latest_category,
  anyLastState(trend) as latest_trend
FROM gap_score_history
GROUP BY entity_id, domain, date
```

**Detector metrics:**

```sql
CREATE TABLE IF NOT EXISTS detector_metrics (
  detector_name String,
  detector_version String,
  entity_id String,
  domain String,
  detected UInt8,
  skipped UInt8,
  confidence Float64,
  execution_ms UInt32,
  error String,
  computed_at DateTime
) ENGINE = MergeTree()
ORDER BY (detector_name, computed_at)
PARTITION BY toYYYYMM(computed_at)
```

**Gap computation log:**

```sql
CREATE TABLE IF NOT EXISTS gap_computation_log (
  entity_id String,
  domain String,
  trigger Enum8('signal-driven' = 0, 'scheduled' = 1, 'manual' = 2),
  workflow_id String,
  signals_read UInt32,
  score_before Float64,
  score_after Float64,
  category_before String,
  category_after String,
  detectors_run UInt8,
  alerts_generated UInt8,
  duration_ms UInt32,
  error String,
  computed_at DateTime
) ENGINE = MergeTree()
ORDER BY (entity_id, domain, computed_at)
PARTITION BY toYYYYMM(computed_at)
```

**Leaderboard materialized views:**

```sql
CREATE MATERIALIZED VIEW leaderboard_by_reality_score
ENGINE = ReplacingMergeTree(computed_at)
ORDER BY (reality_score, entity_id)
AS SELECT
  entity_id, domain, reality_score, category, trend,
  behavioral_count, declarative_count, alignment,
  confidence_level, computed_at
FROM gap_score_history
```

The "movers" leaderboard cannot be a ClickHouse materialized view (window functions are not supported in MV definitions). Instead, `GapService.getMovers()` computes movers at query time via a self-join:

```sql
-- "latest" = most recent score per entity-domain
-- "baseline" = most recent score BEFORE the comparison window
-- score_change = latest - baseline (how much changed over the window)
SELECT
  latest.entity_id, latest.domain,
  latest.reality_score as current_score,
  baseline.reality_score as previous_score,
  latest.reality_score - baseline.reality_score as score_change,
  latest.category, latest.trend, latest.computed_at
FROM (
  SELECT entity_id, domain, reality_score, category, trend, computed_at,
         ROW_NUMBER() OVER (PARTITION BY entity_id, domain ORDER BY computed_at DESC) as rn
  FROM gap_score_history
) latest
INNER JOIN (
  SELECT entity_id, domain, reality_score, computed_at,
         ROW_NUMBER() OVER (PARTITION BY entity_id, domain ORDER BY computed_at DESC) as rn
  FROM gap_score_history
  WHERE computed_at < now() - INTERVAL {days} DAY
) baseline ON latest.entity_id = baseline.entity_id
         AND latest.domain = baseline.domain
         AND baseline.rn = 1
WHERE latest.rn = 1
ORDER BY abs(latest.reality_score - baseline.reality_score) DESC
LIMIT {limit}
```

This is a query-time computation, cached in Redis with `leaderboard:v{generation}:movers:{days}` key and 60-second TTL. Acceptable at scale because ClickHouse handles this self-join efficiently on the ordered MergeTree, and the Redis cache absorbs concurrent dashboard requests.

---

## 2. Scoring Algorithm

### 2.1 Signal Weight Computation

```
For each signal in the entity-domain pair:

  tier_weight     = { 1: 1.0, 2: 0.7, 3: 0.4 }[signal.tier]
  recency_decay   = e^(-λ × days_since_signal)
  financial_mult  = { trivial: 0.5, minor: 0.8, significant: 1.0,
                      major: 1.5, transformative: 2.0 }[magnitude] ?? 1.0
  signal_weight   = intensity × tier_weight × recency_decay × financial_mult
```

**Decay rate resolution order:**
1. Domain-specific `decay_rate` on `domain_taxonomy` (if set)
2. Category-specific from `DECAY_RATES` map (see parent spec Section 4)
3. Default: `0.005` (half-life ~139 days)

### 2.2 Signal Window

- Rolling 365-day window as default
- `signal_window_to` = `computed_at`
- `signal_window_from` = `computed_at - 365 days`
- Per-tier override: Enterprise customers can configure longer windows via team settings
- Window definition makes computation deterministic and reproducible

### 2.3 Alignment & Category

```
Behavioral weighted  = Σ signal_weight for behavioral signals
Declarative weighted = Σ signal_weight for declarative signals

Alignment = behavioral / declarative  (if declarative = 0 → ∞ → stealth)
```

**Category classification (top-down priority — first match wins):**

```
1. total_signals < 5                                    → 'insufficient-data'
2. 0.8 ≤ alignment ≤ 1.2                               → 'confirmed'
3. alignment > 1.5 AND declarative_count < 3            → 'stealth'
4. alignment < 0.5 AND behavioral_count < 3             → 'vaporware'
5. jaccard(behavioral_domains, declarative_domains) < 0.3  → 'pivot'
6. fallthrough                                          → 'unclassified'
```

### 2.4 Reality Score Normalization

Sigmoid mapping from parent spec Section 15:

```typescript
function normalizeRealityScore(
  alignment: number,
  behavioralCount: number,
  declarativeCount: number,
  verificationRatio: number,
  signalDensity: number,
): number {
  const totalSignals = behavioralCount + declarativeCount;

  let base: number;
  if (declarativeCount === 0 && behavioralCount > 0) {
    base = 85; // stealth: high behavioral, unknown declarative
  } else if (behavioralCount === 0 && declarativeCount > 0) {
    base = 15; // pure vaporware
  } else {
    const x = Math.log(alignment);
    base = 62.5 + 32.5 * Math.tanh(x * 1.5);
  }

  const signalConfidence = Math.min(1.0, totalSignals / 50);
  const verificationBonus = verificationRatio * 5;
  const raw = base * signalConfidence + verificationBonus;
  return Math.round(Math.max(0, Math.min(100, raw)));
}
```

**Peer group percentile:** After computing raw Reality Score, compute percentile rank within entities of the same `entityScale` (from `normalization` metadata). Store both `realityScore` (absolute) and `normalization.percentileAlignment` (peer-relative). Leaderboard can sort by either.

**Confidence interval:**

```typescript
function computeConfidenceInterval(
  realityScore: number,
  totalSignals: number,
): [number, number] {
  const margin = Math.round(30 / Math.sqrt(Math.max(1, totalSignals)));
  return [
    Math.max(0, realityScore - margin),
    Math.min(100, realityScore + margin),
  ];
}
```

### 2.5 Confidence Level

Composite of four factors:

```
volume    = min(1.0, totalSignals / 50)           — weight 0.3
diversity = min(1.0, uniqueSources / 5)            — weight 0.3
spread    = min(1.0, monthsWithSignals / 6)        — weight 0.2
verification = verifiedSignals / totalSignals      — weight 0.2

confidence_level = 0.3 × volume + 0.3 × diversity + 0.2 × spread + 0.2 × verification
```

`confidenceFactors` array stores weak components (e.g., "low source diversity", "clustered temporal spread").

### 2.6 Trend

Compare current alignment to alignment from 30 days ago (from `gap_score_history`):
- Alignment increased by >0.15 → `improving`
- Alignment decreased by >0.15 → `declining`
- Within ±0.15 → `stable`

### 2.7 Staleness

`staleDays` = days since the most recent signal's `published_at` within the signal window. If >90 days, dashboard renders "stale intelligence" badge. Detectors skip stale entities.

### 2.8 Entity Rollup

`entities.reality_score` = weighted average of domain gap scores by `domain_taxonomy.importance_weight`. Computed as a post-batch activity to ensure cross-domain correctness.

Batched as a single SQL statement:

```sql
UPDATE entities e
SET reality_score = sub.weighted_avg, updated_at = NOW()
FROM (
  SELECT entity_id,
         SUM(reality_score::numeric * COALESCE(dt.importance_weight, 1.0)) /
         SUM(COALESCE(dt.importance_weight, 1.0)) as weighted_avg
  FROM gap_scores gs
  LEFT JOIN domain_taxonomy dt ON gs.domain = dt.id
  WHERE entity_id = ANY($entityIds)
  GROUP BY entity_id
) sub
WHERE e.id = sub.entity_id
```

### 2.9 Idempotency & Concurrency

- Same signal window → same result (deterministic)
- `pg_try_advisory_xact_lock(hashtext(entityId || ':' || domain))` — non-blocking
- If lock held → skip, defer pair to `gap:pending` sorted set with 60-second delay
- Inside lock: check `gap_scores.computed_at > workflow_start_time` → skip (fresher score already landed)
- System is convergent regardless of execution order

### 2.10 ClickHouse Fallback

`SignalReader` interface with two implementations:
- `ClickHouseSignalReader` — fast, aggregation-optimized (primary)
- `PostgresSignalReader` — slower, always available (fallback)

Scoring workflow checks ClickHouse health at startup. Falls back to PG if unavailable. Logs warning so ops knows scoring is in degraded mode.

> **Phase 1.5 Update:** The `SignalReader` ClickHouse/PostgreSQL fallback is integrated with Phase 1.5's `DegradationRegistry`. Instead of independent health checking, the reader checks `degradation.isHealthy('clickhouse')` to decide which backend to use. This provides unified health state across all services.

### 2.11 Batch Signal Reads

When computing scores for N entity-domain pairs in one chunk, single query:

```sql
SELECT * FROM signals
WHERE entity_id = ANY($entityIds)
  AND published_at > $windowStart
ORDER BY entity_id, polarity, published_at DESC
```

Partition in memory by entity-domain. At 10M+ signals, read from ClickHouse `signals_analytics` instead.

### 2.12 VelocityStats Computation

`VelocityStats` (used by detectors) is computed from the batch signal read, not a separate query. After partitioning signals by entity-domain:

```typescript
function computeVelocity(signals: SignalRow[], polarity: string, now: Date): VelocityStats {
  const currentQuarterStart = startOfQuarter(now);
  const previousQuarterStart = subQuarters(currentQuarterStart, 1);

  const currentQuarter = signals.filter(s =>
    s.polarity === polarity && s.publishedAt >= currentQuarterStart
  ).length;

  const previousQuarter = signals.filter(s =>
    s.polarity === polarity && s.publishedAt >= previousQuarterStart && s.publishedAt < currentQuarterStart
  ).length;

  const qoqChange = previousQuarter === 0
    ? (currentQuarter > 0 ? 1.0 : 0)
    : (currentQuarter - previousQuarter) / previousQuarter;

  const monthsInWindow = 12; // 365-day window
  const monthlyAverage = signals.filter(s => s.polarity === polarity).length / monthsInWindow;

  return { currentQuarter, previousQuarter, qoqChange, monthlyAverage };
}
```

### 2.13 Pivot Domain Set Definition

For pivot category detection (Section 2.3, rule 5), domain sets are defined as:
- `behavioral_domains`: union of all `signals.domains[]` for signals with `polarity = 'behavioral'` in the entity's signal window
- `declarative_domains`: union of all `signals.domains[]` for signals with `polarity = 'declarative'` in the entity's signal window
- Jaccard similarity: `|intersection| / |union|`

### 2.14 Pivot Reality Score

Pivot entities use the standard sigmoid path in `normalizeRealityScore` — their alignment ratio is meaningful (it reflects how much behavioral vs. declarative activity exists, even if in different domains). The pivot classification adds context (the entity's actions diverge from its statements) but doesn't require a separate score path.

---

## 3. Detector Architecture

### 3.1 Interfaces

```typescript
interface DetectorContext {
  entityId: string;
  domain: string;
  gapScore: GapScore;
  previousGapScore: GapScore | null;
  signals: SignalSummary;
  entity: EntityMeta;
  peerContext: PeerContext | null;             // null for Phase 3a, ready for Phase 5
}

interface SignalSummary {
  behavioral: {
    count: number;
    weighted: number;
    velocity: VelocityStats;
    topCategories: CategoryCount[];
  };
  declarative: {
    count: number;
    weighted: number;
    velocity: VelocityStats;
    topCategories: CategoryCount[];
  };
  domainOverlap: number;                      // Jaccard similarity
  recentSignals: RecentSignal[];              // last 30 days, lightweight refs
  staleDays: number;
}

interface VelocityStats {
  currentQuarter: number;
  previousQuarter: number;
  qoqChange: number;                          // percentage
  monthlyAverage: number;
}

interface PeerContext {
  sectorPeers: PeerScore[];
  domainPeers: PeerScore[];
  upstreamEntities: string[];
  downstreamEntities: string[];
}

interface PeerScore {
  entityId: string;
  realityScore: number;
  category: string;
  trend: string;
  alignment: number;
}

interface Detector {
  name: string;
  version: string;
  type: 'lightweight' | 'heavyweight';
  shouldRun(ctx: DetectorContext): boolean;
  detect(ctx: DetectorContext): Promise<DetectorResult | null>;
}

interface DetectorResult {
  detected: boolean;
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  summary: string;
  evidence: { behavioral: SignalRef[]; declarative: SignalRef[] };
  evidenceFingerprint: string;                // hash of sorted signal IDs
  confidence: number;
  prediction?: string;
  recommendedActions: string[];
  snapshotData?: GraphSnapshotData;
  detectorVersion: string;
}
```

### 3.2 Registry

```typescript
class DetectorRegistry {
  private detectors: Map<string, Detector> = new Map();
  private health: Map<string, DetectorHealth> = new Map();

  register(detector: Detector): void;
  getAll(): Detector[];
  getLightweight(): Detector[];
  getHeavyweight(): Detector[];
  get(name: string): Detector | undefined;
  getHealth(): Map<string, DetectorHealth>;
  markFailure(name: string): void;
  markSuccess(name: string): void;
  isCircuitOpen(name: string): boolean;       // 5 consecutive failures → disabled 30 min
}
```

### 3.3 Core Detectors

**Detector 1: Stealth Project** (lightweight)

| Aspect | Detail |
|---|---|
| shouldRun | `alignment >= 1.0` |
| Trigger | behavioral velocity QoQ >50% AND behavioral > 2× declarative AND declarative_count < 3 AND 2+ behavioral categories present |
| Severity | info: alignment >1.5, single category. warning: >2.0, multiple categories. critical: >3.0, sustained 2+ quarters |
| Evidence | Top 5 behavioral signals + note absence of declarative |
| Prediction | "Entity may be developing undisclosed capabilities in {domain}" |
| Actions | ["Monitor patent filings in {domain}", "Check hiring activity for {entity}"] |

**Detector 2: Vaporware** (lightweight)

| Aspect | Detail |
|---|---|
| shouldRun | `alignment <= 0.8` |
| Trigger | declarative velocity stable or increasing AND behavioral flat/declining AND alignment < 0.5 AND behavioral_count < 3 AND no tier-1 behavioral in 90 days |
| Severity | info: alignment 0.3-0.5. warning: 0.1-0.3. critical: <0.1, zero recent behavioral |
| Evidence | Top declarative signals + absent behavioral categories |
| Prediction | "Stated initiatives in {domain} lack behavioral corroboration" |
| Actions | ["Verify claimed {domain} capabilities", "Request evidence of operational activity"] |

**Detector 3: Acquisition Target** (heavyweight)

| Aspect | Detail |
|---|---|
| shouldRun | `entity.type === 'company' && entity.status === 'active'` |
| Trigger | Point-based score >60 (entity-type-aware rubrics from `detector_config`). Note: parent spec Section 10 uses threshold >80; this spec lowers to >60 to surface more candidates with severity tiering (info 60-70, warning 70-85, critical 85+). |
| Default rubric (companies) | Co-investment (Neo4j, +25), foundational patents (+15), approaching commercialization (+15), talent concentration (+10), clean structure (+10), sector M&A precedent (+5), capital intensity (+5) |
| Severity | info: 60-70. warning: 70-85. critical: 85+ |
| Side effects | Writes co-investment graph snapshot |
| Evidence | Point breakdown with supporting signals per factor |
| Prediction | "Entity scores {score}/100 as acquisition target in {domain}" |
| Actions | ["Review co-investment network", "Track insider trading signals"] |
| Timeout | 30 seconds. Circuit breaker: 5 failures → disable 30 min |

**Detector 4: Contradiction** (heavyweight)

| Aspect | Detail |
|---|---|
| shouldRun | `signals.behavioral.count + signals.declarative.count >= 2` (uses full signal counts, not 30-day `recentSignals`) |
| Trigger | 2+ contradiction pairs in same domain within 90 days, OR 1 high-confidence pair (both tier 1). The heavyweight activity queries PG for the full 90-day window independently. |
| Severity | info: 1 pair, mixed confidence. warning: 2+ pairs or 1 high-confidence. critical: 3+ pairs across multiple categories |
| Side effects | Writes contradiction graph snapshot |
| Evidence | Paired contradicting signals with excerpts |
| Prediction | "Strategic messaging in {domain} conflicts with operational signals" |
| Actions | ["Compare {signal_a} against {signal_b}", "Investigate operational vs. stated intent"] |
| Timeout | 15 seconds. Circuit breaker: 5 failures → disable 30 min |

**Detector 5: Trend Reversal** (lightweight)

| Aspect | Detail |
|---|---|
| shouldRun | `previousGapScore !== null` |
| Trigger | Category changed from previous computation OR alignment shifted >0.5 |
| Severity | info: alignment shift 0.5-1.0. warning: category change. critical: change to/from vaporware or stealth |
| Evidence | Previous vs. current scores + driving signals |
| Prediction | "Entity's {domain} posture shifted from {previousCategory} to {category}" |
| Actions | ["Review signal timeline for {domain}", "Check for external market events"] |

### 3.4 Cooldown Logic

Before creating an alert, check:

1. Query most recent alert of same `(entity_id, domain, type)`
2. If within cooldown window → check evidence fingerprint
3. Evidence overlap >70% (sorted signal ID comparison) → suppress
4. Evidence overlap <70% → allow (new intelligence)
5. If no recent alert or outside cooldown window → allow

**Cooldown windows:**

| Alert type | Window |
|---|---|
| stealth-project | 72 hours |
| vaporware-risk | 72 hours |
| acquisition-target | 168 hours (weekly) |
| contradiction | 48 hours |
| trend-reversal | 24 hours |

**Severity escalation:** Same alert type persists across 3+ consecutive detections → bump severity one level.

### 3.5 Upstream Pre-Filter

Before dispatching `DetectorBatchWorkflow`, `GapChunkWorkflow` applies a coarse filter:

```typescript
const detectorCandidates = scoredPairs.filter(pair =>
  pair.staleDays < 90 &&
  (pair.alignment > 1.0 || pair.alignment < 0.8 ||
   pair.categoryChanged || pair.recentSignals.length >= 2)
);
```

Eliminates 60-70% of unnecessary detector workflow starts at scale.

### 3.6 Detector Versioning

Each detector has a `version` field stored in alert `meta.detectorVersion`. When a detector version changes:

- Optionally queue re-evaluation of recent alerts from previous version
- Mark superseded alerts as `superseded` if new version wouldn't have fired
- See Section 12 for full algorithm versioning strategy

---

## 4. Workflow Orchestration

### 4.1 Signal-Driven Path

> **Phase 1.5 Update:** The Redis sorted set coordinator (`gap:pending`) is replaced by NATS JetStream. Signal ingestion publishes `signals.ingested.{entityId}` events to the SIGNALS stream. The Gap Coordinator subscribes to these events via NATS consumer instead of polling Redis. The 6-hour scheduled sweep remains as a safety net. Advisory locks use `pg_try_advisory_xact_lock()` (transaction-scoped, PgCat-safe).

```
Signal batch workflow writes signals to PG + ClickHouse
  │
  ├─ For each written signal:
  │    ZADD gap:pending {timestamp} "{entityId}:{domain}"
  │
  ▼
Gap Coordinator Workflow (singleton, long-running)
  │
  ├─ Polls Redis sorted set every 30 seconds
  ├─ ZRANGEBYSCORE gap:pending -inf +inf LIMIT 500
  ├─ If pairs found:
  │    ├─ Start GapBatchRecomputeWorkflow(pairs) as child
  │    └─ ZREMRANGEBYSCORE (delete processed range)
  ├─ If no pairs: sleep 30 seconds
  └─ continueAsNew when history > 10000 events
```

No pub/sub. No debounce timer. The sorted set provides natural dedup (same entity-domain pair written multiple times = 1 entry with latest timestamp) and ordering.

### 4.2 Scheduled Sweep (6-Hour Safety Net)

```
Temporal Schedule: every 6 hours
  │
  ▼
GapScheduledSweepWorkflow
  │
  ├─ Delta query: entities with last_signal_at > gap_scores.computed_at
  ├─ Priority sort: watched entities first (join watchlist_entities), then by signal recency
  ├─ Batch into EntityDomainPair[]
  └─ Start GapBatchRecomputeWorkflow(pairs)
```

### 4.3 Batch Recompute Flow

```
GapBatchRecomputeWorkflow(pairs: EntityDomainPair[])
  │
  ├─ Partition into chunks of 100
  ├─ Fan out: child GapChunkWorkflow per chunk (max 10 concurrent)
  │     │
  │     ├─ Batch-read signals from ClickHouse (fallback: PG)
  │     ├─ For each entity-domain pair:
  │     │    ├─ pg_try_advisory_xact_lock → if held, defer to gap:pending with 60s delay
  │     │    ├─ Check gap_scores.computed_at > workflow_start_time → skip
  │     │    ├─ Read previous gap score (for trend + detector context)
  │     │    ├─ Compute signal weights
  │     │    ├─ Compute alignment, category, trend, reality score
  │     │    ├─ Compute confidence (level + interval + factors)
  │     │    ├─ Compute staleness
  │     │    ├─ Upsert gap_scores (PG)
  │     │    ├─ Append gap_score_history (ClickHouse)
  │     │    └─ Append gap_computation_log (ClickHouse)
  │     │
  │     ├─ Coarse pre-filter for detector candidates
  │     ├─ If candidates exist: start DetectorBatchWorkflow(candidates)
  │     │
  │     └─ Return: { computed, skipped, deferred, errors }
  │
  ├─ Aggregate results from all chunks
  ├─ Identify unique entities that were scored
  ├─ Run EntityRollupActivity (single batched SQL)
  ├─ Invalidate caches (see Section 10)
  ├─ Publish SSE gap-score-updated events
  └─ Refresh ClickHouse leaderboard materialized views
```

### 4.4 Detector Execution

```
DetectorBatchWorkflow(candidates: ScoredPair[])
  │
  ├─ Build DetectorContext for each candidate
  ├─ Skip if gapScore.staleDays > 90
  │
  ├─ Run lightweight detectors in-process (no activities):
  │    For each candidate:
  │      ├─ Stealth: shouldRun → detect
  │      ├─ Vaporware: shouldRun → detect
  │      └─ TrendReversal: shouldRun → detect
  │
  ├─ Collect candidates needing heavyweight detection
  ├─ Run heavyweight detectors as parallel activities:
  │    ├─ AcquisitionTarget activity (30s timeout, circuit breaker)
  │    └─ Contradiction activity (15s timeout, circuit breaker)
  │
  ├─ Collect all DetectorResults
  │
  ├─ For each result where detected=true:
  │    ├─ Check cooldown (query recent alerts)
  │    ├─ Check evidence fingerprint overlap (>70% → suppress)
  │    ├─ Check severity escalation (3+ consecutive → bump)
  │    ├─ If passes: insert alert (PG)
  │    ├─ If snapshotData: upsert graph_snapshots (PG)
  │    └─ Publish SSE alert-created event
  │
  ├─ Log detector_metrics (ClickHouse) for all detectors (ran or skipped)
  │
  ├─ Refresh structural graph snapshots via activity:
  │    ├─ Hot (watched entities): refresh 2-hop subgraph now
  │    ├─ Warm (recent signals): refresh if snapshot > 6 hours old
  │    └─ Cold: skip
  │
  └─ Return: { detectorsRun, alertsGenerated, snapshotsRefreshed }
```

### 4.5 Failure Handling

- **Chunk failure:** Each pair computation is independent. Successful pairs commit. Failed pairs are added to `gap:retry` sorted set in Redis. Chunk workflow always completes with partial results.
- **Retry:** Next coordinator cycle picks up retry pairs. After 3 retries → gap DLQ table.
- **Heavyweight detector failure:** Other detectors' results still generate alerts. Failed detector logged in `detector_metrics`.
- **Circuit breaker:** 5 consecutive failures per detector → disable 30 minutes.

### 4.6 Concurrency Limits

| Level | Limit | Purpose |
|---|---|---|
| Coordinator dispatch | 500 pairs max | Rate-limit into batch workflow |
| Batch workflow children | 10 concurrent chunks | Cap DB/ClickHouse pressure |
| Heavyweight detector activities | 5 per worker | Prevent Neo4j exhaustion |
| Temporal task queue rate limiting | Configurable | Final safety valve |

### 4.7 Task Queues

| Queue | Workers | Purpose |
|---|---|---|
| `gap-coordinator` | 1 | Singleton coordinator |
| `gap-compute` | 2-4 (autoscale by queue depth) | Batch + chunk + scheduled sweep + algorithm migration workflows |
| `detector-lightweight` | 2 | DetectorBatchWorkflow |
| `detector-heavyweight` | 1-2 | Acquisition + Contradiction activities |
| `graph-snapshot` | 1 | Snapshot refresh activities |

`GapScheduledSweepWorkflow` and `AlgorithmMigrationWorkflow` run on `gap-compute` queue — they dispatch `GapBatchRecomputeWorkflow` children which also run on `gap-compute`.

### 4.8 Coordinator Bootstrap

Engine startup (`index.ts`) checks for running coordinator workflow via Temporal `describe` API. If not found, starts it with deterministic workflow ID `gap-coordinator-singleton`. Idempotent — Temporal rejects duplicate IDs. Health endpoint reports degraded if coordinator not running.

### 4.9 Manual Recompute API

Three modes via `POST /engine/v1/admin/recompute`:

| Mode | Behavior |
|---|---|
| `{ entityId, domain }` | Single pair, synchronous, returns result |
| `{ entityId }` | All domains for entity, async, returns workflow ID |
| `{ all: true, confirm: true }` | Full recompute, async, admin-only, returns workflow ID |

All bypass coordinator — direct workflow dispatch. Use the same `GapChunkWorkflow` for shared computation logic.

---

## 5. Graph Snapshots

### 5.1 Tiered Refresh Strategy

| Tier | Criteria | Refresh Trigger | Subgraph Scope |
|---|---|---|---|
| Hot | Entity on any watchlist | Every detector run | Full 2-hop, all layers |
| Warm | Recent signals, not watched | 6-hour sweep if snapshot > 6h old | Full 2-hop, all layers |
| Cold | No recent signals, not watched | On-demand when user navigates | Full 2-hop, cached |

Priority derived from watchlist membership count. More teams watching = higher refresh priority.

### 5.2 Layers

| Layer | Content | Source |
|---|---|---|
| `ownership` | Parent-child, subsidiary relationships | Neo4j |
| `co-investment` | Shared investors, funding connections | Neo4j |
| `supply-chain` | Supplier-customer relationships | Neo4j |
| `competitive` | Same-sector, same-domain entities | Neo4j |
| `regulatory` | Government/regulatory connections | Neo4j |
| `detector-output` | Edges/nodes discovered by detectors | Written by heavyweight detectors |

### 5.3 Size Budget

500 nodes max per snapshot. If 2-hop neighborhood exceeds this (mega-cap entities), truncate by edge weight/relevance. `stats.truncated = true` indicates truncation.

### 5.4 Neo4j Query

```cypher
MATCH (e)-[r*1..2]-(n)
WHERE e.id = $entityId
RETURN e, r, n
LIMIT 500
```

Partitioned by relationship type into layers. Results written to `graph_snapshots` table.

### 5.5 Staleness Handling

- On API request: if snapshot `status = 'stale'` or `computed_at` older than threshold, serve stale data with `computedAt` timestamp + queue async refresh
- Dashboard shows "last updated X ago" and auto-refreshes via SSE when new snapshot lands
- Periodic cleanup workflow marks snapshots older than `expires_at` as `stale`

---

## 6. API Routes

### 6.1 Gap Routes (new)

```
/engine/v1/gaps
├── GET  /                    # all gap scores, filterable by domain, category, entity type
├── GET  /leaderboard         # ranked entities (ClickHouse materialized view + Redis cache)
├── GET  /movers              # biggest score changes in ?days=7|30|90
└── GET  /domain/:domain      # entities in a specific domain
```

### 6.2 Entity Route Stubs → Real (modify)

Replace 501 stubs in `engine/src/routes/entities.ts`:

```
GET /engine/v1/entities/:id/scores    # gap scores across all domains for entity
GET /engine/v1/entities/:id/history   # score history from ClickHouse (daily pre-aggregated)
```

`GET /engine/v1/entities/:id/alerts` remains a stub — implemented in Phase 3b.

### 6.3 Admin Routes (modify)

Add to existing admin routes:

```
POST /engine/v1/admin/recompute       # manual recompute (3 modes)
```

### 6.4 Domain Taxonomy Routes (new)

```
/engine/v1/domains
├── GET    /                  # full taxonomy (parent + children)
├── GET    /:id               # domain detail
├── POST   /                  # create domain (admin)
├── PATCH  /:id               # update domain (admin)
└── DELETE /:id               # delete domain (admin)
```

### 6.5 Rate Limiting

Endpoint-specific limits (in addition to team-level daily quota):

| Endpoint | Limit |
|---|---|
| Leaderboard | 10 req/min per user |
| Movers | 10 req/min per user |
| Entity history | 30 req/min per user |
| Score detail | 60 req/min per user |

---

## 7. Services

### 7.1 New Services Added to ServiceContainer

**GapService:**
- `computeGapScore(entityId, domain, windowDays?)` — single pair computation
- `batchComputeGapScores(pairs, signalReader)` — batch computation
- `getGapScores(entityId)` — all domain scores for entity
- `getGapScore(entityId, domain)` — single domain score
- `getLeaderboard(filters, cursor)` — reads ClickHouse materialized view
- `getMovers(days, cursor)` — biggest changes
- `getScoreHistory(entityId, domain, days)` — reads ClickHouse daily aggregation
- `rollupEntityScores(entityIds)` — batched entity reality_score update

**DetectorService:**
- `getRegistry()` — returns DetectorRegistry
- `runLightweightDetectors(ctx)` — runs all lightweight detectors
- `runHeavyweightDetector(name, ctx)` — runs single heavyweight detector (activity)
- `checkCooldown(entityId, domain, alertType)` — returns boolean
- `checkEvidenceOverlap(fingerprint, previousFingerprint)` — returns overlap ratio
- `logMetrics(results)` — writes to ClickHouse

**GraphSnapshotService:**
- `refreshSnapshot(entityId, layer)` — Neo4j query → write snapshot
- `refreshAllLayers(entityId)` — all layers for entity
- `getSnapshot(entityId, layer)` — read with staleness check
- `getSnapshotPriority(entityId)` — returns `{ tier: 'hot' | 'warm' | 'cold', watchlistCount: number }`. Numeric `watchlistCount` determines ordering within hot tier (more teams watching = higher refresh priority).
- `markStale(entityId, layer?)` — mark for refresh
- `cleanupExpired()` — periodic maintenance

### 7.2 ServiceContainer Changes

```typescript
export interface ServiceContainer {
  // ... existing ...
  gapService: GapService;
  detectorService: DetectorService;
  graphSnapshotService: GraphSnapshotService;
}
```

### 7.3 SignalReader Interface

```typescript
interface SignalReader {
  readSignals(entityIds: string[], windowStart: Date, windowEnd: Date): Promise<SignalRow[]>;
  healthy(): boolean;
}

class ClickHouseSignalReader implements SignalReader { ... }
class PostgresSignalReader implements SignalReader { ... }
```

---

## 8. SSE Events

### 8.1 New Event Types

Add to `engine/src/events/event-types.ts`:

```typescript
type SSEEventType =
  | ... existing ...
  | 'gap-score-updated'
  | 'alert-created'
  | 'alert-status-changed';
```

### 8.2 Channels

Gap score update events publish to the existing `sse:entity:{entityId}` channel — clients already subscribe to this for entity-scoped events (signal-ingested, entity-created). Adding gap-score-updated to the same channel means a single subscription covers all entity events.

Alert events publish to a new team-scoped channel:

```typescript
SSE_CHANNELS = {
  ... existing (global, entity, source, team) ...
  alerts: (teamId: string) => `sse:alerts:${teamId}`,
};
```

> **Phase 1.5 Update:** SSE events are published to NATS streams (not Redis Pub/Sub). The Phase 1.5 SSE Gateway subscribes to NATS and delivers events to connected clients. `gap-score-updated` publishes to NATS subject `gaps.recomputed.{entityId}`. `alert-created` publishes to `alerts.fired.{severity}`. The SSE Gateway filters by team watchlist subscriptions.

`gap-score-updated` → publishes to `SSE_CHANNELS.entity(entityId)` (existing)
`alert-created` → publishes to `SSE_CHANNELS.alerts(teamId)` (new) + `SSE_CHANNELS.entity(entityId)` (existing)
`alert-status-changed` → publishes to `SSE_CHANNELS.alerts(teamId)` (new)

### 8.3 Event Payloads

**gap-score-updated:**
```json
{
  "entityId": "company:nvidia",
  "domain": "ai-inference",
  "realityScore": 82,
  "previousRealityScore": 78,
  "category": "confirmed",
  "trend": "improving",
  "computedAt": "2026-03-22T12:00:00Z"
}
```

**alert-created:**
```json
{
  "alertId": "alert:...",
  "entityId": "company:nvidia",
  "domain": "ai-inference",
  "type": "stealth-project",
  "severity": "warning",
  "title": "Stealth project detected in ai-inference",
  "teamId": "team:..."
}
```

---

## 9. Domain Taxonomy

### 9.1 Structure

Two-level hierarchy:
- **Parent domains:** 14 top-level categories from spec Section 9 (Geopolitical, Corporate, Financial, Cyber, Energy, Health, Supply Chain, Space, Maritime, Labor, Legal, Real Estate, Media, FOIA)
- **Child domains:** Specific intelligence areas within each parent (e.g., Corporate → patent-analytics, stealth-detection, vaporware-detection, acquisition-scoring, hiring-signals, supply-chain-behavioral)

### 9.2 Seed Data

Initial seed covers parent domains + key child domains with:
- `id`, `domain`, `parentDomain`, `label`, `description`
- `importance_weight` (default 1.0, higher for patent/financial/hiring signals)
- Optional `decay_rate` override

### 9.3 Auto-Discovery

During scoring, if an entity has 10+ signals tagged with a domain string not in `domain_taxonomy`, write to a separate `pending_domains` table (not JSONB on gap_scores — a dedicated table is trivially queryable by admins):

```sql
CREATE TABLE pending_domains (
  id SERIAL PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  signal_count INT DEFAULT 1,
  example_entity_ids TEXT[] DEFAULT '{}',
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'pending',              -- pending, approved, rejected
  approved_taxonomy_id TEXT REFERENCES domain_taxonomy(id),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ
);
```

- Scoring workflow: on encountering unrecognized domain, `INSERT ... ON CONFLICT (domain) DO UPDATE SET signal_count = signal_count + 1, last_seen_at = NOW()`
- Admin API: `GET /engine/v1/admin/pending-domains` lists pending, `POST /engine/v1/admin/pending-domains/:id/approve` creates `domain_taxonomy` entry
- Global taxonomy — not team-scoped. Enterprise domain requests via support, not self-serve.

---

## 10. Caching & Read Path Optimization

### 10.1 Leaderboard Cache

- ClickHouse materialized views pre-compute rankings
- Redis cache per variant with 60-second TTL
- Cache key includes filter parameters: `leaderboard:v{generation}:{variant}:{filters_hash}`
- Generation counter incremented on each `GapBatchRecomputeWorkflow` completion
- Old generation keys expire via TTL, no explicit deletion needed
- Cursor-based pagination (not offset): `reality_score < $lastScore AND id > $lastId`

### 10.2 Entity Score Cache

- Redis cache per entity: `gap:cache:{entityId}:scores` with TTL matching scoring interval
- Invalidated on score update via explicit `DEL`

### 10.3 Score History Cache

- Redis cache: `gap:cache:{entityId}:{domain}:history:{days}` with 5-minute TTL
- Dashboard sparklines read daily pre-aggregated view, not raw history

### 10.4 Cache Invalidation

Event-driven on `GapBatchRecomputeWorkflow` completion:
1. Increment leaderboard generation counter
2. `DEL gap:cache:{entityId}:*` for affected entities
3. Publish SSE `gap-score-updated` events
4. Dashboard receives SSE → refetches if viewing affected entity

> **Phase 1.5 Update:** Cache invalidation is handled by the Phase 1.5 CacheInvalidatorConsumer (3 NATS consumer instances covering signals, entities, and gaps streams). Gap score recomputes publish to NATS → cache invalidator deletes Redis keys + broadcasts L1 invalidation. The 3-tier cache (L1 LRU → L2 Redis → L3 DB) with per-endpoint strategies replaces ad-hoc caching.

---

## 11. Observability

### 11.1 OpenTelemetry Trace Propagation

Full trace from signal write → gap score → detector → alert:

> **Phase 1.5 Update:** Trace context propagates via NATS message headers (`Gambit-Trace-Id`), not Redis sorted set metadata. OpenTelemetry `traceparent` header enables end-to-end tracing from signal ingestion through gap scoring to SSE delivery.

- Signal writer attaches trace context to Redis sorted set entry metadata
- Coordinator propagates trace to GapBatchRecomputeWorkflow
- Chunk workflows propagate to DetectorBatchWorkflow
- Activity spans: `gap.signal_read`, `gap.score_compute`, `gap.pg_write`, `gap.ch_write`, `detector.{name}.run`, `detector.{name}.skip`, `snapshot.refresh`
- Grafana Tempo (already in stack) renders full traces

### 11.2 ClickHouse Audit Tables

- `detector_metrics` — per-detector execution telemetry (see Section 1.13)
- `gap_computation_log` — end-to-end computation audit (see Section 1.13)

### 11.3 Health Checks

Engine health endpoint additions:
- Coordinator workflow status (running/not running)
- Gap compute task queue depth
- Detector circuit breaker states
- ClickHouse availability (primary signal reader)
- Redis sorted set depth (pending recomputes)

> **Phase 1.5 Update:** Replace "Redis sorted set depth" with NATS consumer lag metric (`nats_consumer_lag{stream="GAP_SCORES"}`). Prometheus scrapes NATS monitoring endpoint.

---

## 12. Algorithm Versioning

### 12.1 Version Tracking

`audit.algorithmVersion` on every gap score. Format: `gap-v{major}.{minor}` (e.g., `gap-v1.0`).

### 12.2 Migration Strategy

When algorithm version bumps:

1. Deploy new version with feature flag. Old version continues running.
2. **Shadow mode:** New version computes in parallel, writes to `gap_scores_shadow` table. The `AlgorithmMigrationWorkflow` creates this table at startup via `CREATE TABLE IF NOT EXISTS gap_scores_shadow (LIKE gap_scores INCLUDING ALL)` — this copies the exact schema, indexes, and constraints. If the table already exists (interrupted prior migration), the `IF NOT EXISTS` is a safe no-op. Compare shadow results against production scores.
3. **Validation:** Review shadow scores for anomalies, threshold calibration. `GET /engine/v1/admin/algorithm/shadow-comparison` returns divergence report.
4. **Flip:** Enable new version via flag. Next scheduled sweep uses it.
5. **Backfill:** `AlgorithmMigrationWorkflow` recomputes all entities at low priority (concurrency limit 2 on `gap-compute` queue). Runs on `gap-compute` task queue.
6. **Cleanup:** `AlgorithmMigrationWorkflow` drops `gap_scores_shadow` table after migration completes.

No big-bang recompute. Staged rollout with validation.
