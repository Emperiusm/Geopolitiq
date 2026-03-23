# Phase 3a: Gap Analysis & Detectors — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the gap scoring engine, 5 core detectors, and Temporal workflow orchestration on top of Phase 1/2's engine foundation and ingestion pipeline.

**Architecture:** Gap scores are computed by Temporal workflows triggered via a Redis sorted set coordinator (signal-driven) and a 6-hour scheduled sweep. Detectors run in a separate batched workflow after scoring. Scores are dual-written to PostgreSQL (current state) and ClickHouse (history). A `SignalReader` interface provides ClickHouse-primary reads with PostgreSQL fallback.

**Tech Stack:** Bun, Hono, Temporal (workflows + activities + workers), Drizzle ORM, PostgreSQL 17, ClickHouse, Neo4j, Redis (ioredis), pino, Zod, Vitest, Docker Compose.

**Design spec:** `docs/v2/phase-3a-gap-analysis-detectors-design.md`
**Depends on:** Phase 1 (Engine Foundation) + Phase 2 (Ingestion Framework) — both merged to main.

---

## Table of Contents

- [ ] [Task 1: Branch Setup & Schema Evolution](#task-1-branch-setup--schema-evolution)
- [ ] [Task 2: Shared Types, Constants & Interfaces](#task-2-shared-types-constants--interfaces)
- [ ] [Task 3: Domain Taxonomy Seed & Service](#task-3-domain-taxonomy-seed--service)
- [ ] [Task 4: Signal Reader Interface](#task-4-signal-reader-interface)
- [ ] [Task 5: Gap Scoring Algorithm — Signal Weights](#task-5-gap-scoring-algorithm--signal-weights)
- [ ] [Task 6: Gap Scoring Algorithm — Category, Trend & Reality Score](#task-6-gap-scoring-algorithm--category-trend--reality-score)
- [ ] [Task 7: GapService — Computation & CRUD](#task-7-gapservice--computation--crud)
- [ ] [Task 8: Detector Registry & Lightweight Detectors](#task-8-detector-registry--lightweight-detectors)
- [ ] [Task 9: Heavyweight Detectors — Acquisition Target & Contradiction](#task-9-heavyweight-detectors--acquisition-target--contradiction)
- [ ] [Task 10: Alert Generation & Cooldown Logic](#task-10-alert-generation--cooldown-logic)
- [ ] [Task 11: Graph Snapshot Service](#task-11-graph-snapshot-service)
- [ ] [Task 12: Gap Compute Workflows — Chunk & Batch](#task-12-gap-compute-workflows--chunk--batch)
- [ ] [Task 13: Detector Batch Workflow](#task-13-detector-batch-workflow)
- [ ] [Task 14: Gap Coordinator & Scheduled Sweep Workflows](#task-14-gap-coordinator--scheduled-sweep-workflows)
- [ ] [Task 15: Temporal Workers & Pipeline Integration](#task-15-temporal-workers--pipeline-integration)
- [ ] [Task 16: API Routes — Gaps, Domains, Admin Recompute](#task-16-api-routes--gaps-domains-admin-recompute)
- [ ] [Task 17: Entity Route Integration & SSE Events](#task-17-entity-route-integration--sse-events)
- [ ] [Task 18: Caching, Observability & ClickHouse Init](#task-18-caching-observability--clickhouse-init)
- [ ] [Task 19: End-to-End Integration Test](#task-19-end-to-end-integration-test)

---

## File Map

### New Directories

| Directory | Responsibility |
|-----------|---------------|
| `engine/src/gap/` | Gap scoring algorithm, scoring functions |
| `engine/src/detectors/` | Detector registry, individual detector implementations |
| `engine/src/snapshots/` | Graph snapshot service |
| `engine/test/gap/` | Gap scoring unit tests |
| `engine/test/detectors/` | Detector unit tests |
| `engine/test/snapshots/` | Snapshot unit tests |

### New Files

| File | Responsibility |
|------|---------------|
| `engine/src/gap/types.ts` | Gap analysis type definitions, interfaces |
| `engine/src/gap/constants.ts` | Decay rates, tier weights, financial multipliers, thresholds |
| `engine/src/gap/signal-weight.ts` | Signal weight computation (decay, tier, financial) |
| `engine/src/gap/scoring.ts` | Alignment, category classification, reality score normalization |
| `engine/src/gap/confidence.ts` | Confidence level, confidence interval computation |
| `engine/src/gap/velocity.ts` | VelocityStats computation from signal data |
| `engine/src/gap/signal-reader.ts` | SignalReader interface + ClickHouse/Postgres implementations |
| `engine/src/services/gap.service.ts` | GapService — orchestrates scoring, CRUD, leaderboard, history |
| `engine/src/detectors/types.ts` | Detector interfaces (Detector, DetectorContext, DetectorResult) |
| `engine/src/detectors/registry.ts` | DetectorRegistry with circuit breaker health tracking |
| `engine/src/detectors/stealth.ts` | StealthProjectDetector (lightweight) |
| `engine/src/detectors/vaporware.ts` | VaporwareDetector (lightweight) |
| `engine/src/detectors/trend-reversal.ts` | TrendReversalDetector (lightweight) |
| `engine/src/detectors/acquisition-target.ts` | AcquisitionTargetDetector (heavyweight) |
| `engine/src/detectors/contradiction.ts` | ContradictionDetector (heavyweight) |
| `engine/src/detectors/alert-generator.ts` | Alert generation, cooldown, evidence fingerprinting |
| `engine/src/services/detector.service.ts` | DetectorService — wraps registry, metrics logging |
| `engine/src/snapshots/snapshot.service.ts` | GraphSnapshotService — CRUD, tiered refresh |
| `engine/src/pipeline/workflows/gap-chunk.ts` | GapChunkWorkflow — compute scores for a chunk of pairs |
| `engine/src/pipeline/workflows/gap-batch-recompute.ts` | GapBatchRecomputeWorkflow — fan-out chunks + rollup |
| `engine/src/pipeline/workflows/detector-batch.ts` | DetectorBatchWorkflow — run detectors on scored pairs |
| `engine/src/pipeline/workflows/gap-coordinator.ts` | Gap Coordinator — singleton polling Redis sorted set |
| `engine/src/pipeline/workflows/gap-scheduled-sweep.ts` | GapScheduledSweepWorkflow — 6-hour delta recompute |
| `engine/src/pipeline/activities/gap.ts` | Gap scoring activities (compute, rollup, signal-read) |
| `engine/src/pipeline/activities/detector.ts` | Detector activities (heavyweight detection) |
| `engine/src/pipeline/activities/snapshot.ts` | Snapshot refresh activity |
| `engine/src/pipeline/workers/gap-coordinator-worker.ts` | Worker for `gap-coordinator` task queue |
| `engine/src/pipeline/workers/gap-compute-worker.ts` | Worker for `gap-compute` task queue |
| `engine/src/pipeline/workers/detector-worker.ts` | Worker for detector task queues |
| `engine/src/routes/gaps.ts` | Gap API routes (/gaps, /gaps/leaderboard, /gaps/movers, /gaps/domain/:domain) |
| `engine/src/routes/domains.ts` | Domain taxonomy CRUD routes |
| `engine/src/sources/domain-taxonomy-seed.yaml` | Seed data for domain_taxonomy |
| `engine/test/gap/signal-weight.test.ts` | Signal weight unit tests |
| `engine/test/gap/scoring.test.ts` | Scoring algorithm unit tests |
| `engine/test/gap/confidence.test.ts` | Confidence computation tests |
| `engine/test/gap/velocity.test.ts` | VelocityStats computation tests |
| `engine/test/gap/signal-reader.test.ts` | SignalReader interface tests |
| `engine/test/detectors/registry.test.ts` | DetectorRegistry tests |
| `engine/test/detectors/stealth.test.ts` | Stealth detector tests |
| `engine/test/detectors/vaporware.test.ts` | Vaporware detector tests |
| `engine/test/detectors/trend-reversal.test.ts` | Trend reversal detector tests |
| `engine/test/detectors/acquisition-target.test.ts` | Acquisition target tests |
| `engine/test/detectors/contradiction.test.ts` | Contradiction detector tests |
| `engine/test/detectors/alert-generator.test.ts` | Alert generation + cooldown tests |
| `engine/test/snapshots/snapshot.service.test.ts` | Snapshot service tests |
| `engine/test/gap/gap.service.test.ts` | GapService integration tests |
| `engine/test/gap/e2e.test.ts` | End-to-end gap analysis pipeline test |

### Modified Files

| File | Changes |
|------|---------|
| `engine/src/db/schema/enums.ts` | Add `alertStatusEnum` |
| `engine/src/db/schema/analysis.ts` | Full rebuild: gapScores, alerts, watchlists, watchlistEntities, graphSnapshots, detectorConfig, pendingDomains, gapComputationDlq, domainTaxonomy evolution |
| `engine/src/db/schema/entities.ts` | Add `lastSignalAt` column |
| `engine/src/db/index.ts` | Export new schema tables |
| `engine/src/db/init/clickhouse.ts` | Rebuild gap_score_history, add detector_metrics, gap_computation_log, daily MV |
| `engine/src/db/init/rls.ts` | Add RLS policies for new tables |
| `engine/src/db/init/triggers.ts` | Add updated_at triggers for new tables |
| `engine/src/services/container.ts` | Add gapService, detectorService, graphSnapshotService |
| `engine/src/index.ts` | Wire new services, routes, coordinator bootstrap |
| `engine/src/events/event-types.ts` | Add gap-score-updated, alert-created, alert-status-changed |
| `engine/src/pipeline/activities/write.ts` | Add ZADD gap:pending + update entities.lastSignalAt |
| `engine/src/routes/entities.ts` | Replace Phase 3 stubs with real implementations |
| `engine/src/routes/admin.ts` | Add /recompute endpoint |

---

## Task 1: Branch Setup & Schema Evolution

**Files:**
- Modify: `engine/src/db/schema/enums.ts`
- Modify: `engine/src/db/schema/analysis.ts`
- Modify: `engine/src/db/schema/entities.ts`
- Modify: `engine/src/db/index.ts`
- Modify: `engine/src/db/init/triggers.ts`
- Modify: `engine/src/db/init/rls.ts`

- [ ] **Step 1: Create feature branch**

```bash
git checkout main
git pull origin main
git checkout -b feature/phase-3a-gap-analysis
```

- [ ] **Step 2: Add `alertStatusEnum` to enums**

In `engine/src/db/schema/enums.ts`, add after `alertSeverityEnum`:

```typescript
export const alertStatusEnum = pgEnum('alert_status', [
  'new', 'acknowledged', 'investigating', 'dismissed', 'confirmed', 'superseded',
]);
```

- [ ] **Step 3: Add `lastSignalAt` to entities schema**

In `engine/src/db/schema/entities.ts`, add after `realityScore`:

```typescript
lastSignalAt: timestamp('last_signal_at', { withTimezone: true }),
```

And add to the index block:

```typescript
lastSignalIdx: index('idx_entities_last_signal').on(table.lastSignalAt),
```

- [ ] **Step 4: Rebuild `analysis.ts` with full schemas**

Replace the entire content of `engine/src/db/schema/analysis.ts` with:

```typescript
import { pgTable, text, numeric, timestamp, jsonb, integer, index, uniqueIndex, boolean, serial } from 'drizzle-orm/pg-core';
import { alertSeverityEnum, alertStatusEnum } from './enums';
import { entities } from './entities';
import { teams } from './auth';

// ── Gap Scores ──────────────────────────────────────────────────────
export const gapScores = pgTable('gap_scores', {
  id: text('id').primaryKey(),
  entityId: text('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),

  // Raw counts
  behavioralCount: integer('behavioral_count').default(0),
  behavioralWeighted: numeric('behavioral_weighted').default('0'),
  behavioralTopSignals: jsonb('behavioral_top_signals').$type<any[]>().default([]),
  declarativeCount: integer('declarative_count').default(0),
  declarativeWeighted: numeric('declarative_weighted').default('0'),
  declarativeTopSignals: jsonb('declarative_top_signals').$type<any[]>().default([]),

  // Computed
  alignment: numeric('alignment').default('0'),
  realityScore: numeric('reality_score').default('0'),
  category: text('category'),
  trend: text('trend'),

  // Confidence
  confidenceLevel: numeric('confidence_level'),
  confidenceInterval: jsonb('confidence_interval').$type<[number, number]>(),
  confidenceFactors: text('confidence_factors').array().default([]),

  // Normalization
  normalization: jsonb('normalization').$type<Record<string, any>>(),

  // History tracking
  previousAlignment: numeric('previous_alignment'),
  previousCategory: text('previous_category'),
  categoryChangedAt: timestamp('category_changed_at', { withTimezone: true }),

  // Window
  signalWindowFrom: timestamp('signal_window_from', { withTimezone: true }),
  signalWindowTo: timestamp('signal_window_to', { withTimezone: true }),
  computedAt: timestamp('computed_at', { withTimezone: true }),
  nextComputeAt: timestamp('next_compute_at', { withTimezone: true }),

  // Staleness
  staleDays: integer('stale_days').default(0),

  // Audit
  audit: jsonb('audit').$type<Record<string, any>>(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  entityDomainIdx: uniqueIndex('idx_gap_scores_entity_domain').on(table.entityId, table.domain),
  entityIdx: index('idx_gap_scores_entity').on(table.entityId),
  domainIdx: index('idx_gap_scores_domain').on(table.domain),
  categoryIdx: index('idx_gap_scores_category').on(table.category),
  computedIdx: index('idx_gap_scores_computed').on(table.computedAt),
}));

// ── Alerts ──────────────────────────────────────────────────────────
export const alerts = pgTable('alerts', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  entityId: text('entity_id').references(() => entities.id),
  domain: text('domain'),
  type: text('type').notNull(),
  severity: alertSeverityEnum('severity').default('info').notNull(),

  title: text('title').notNull(),
  summary: text('summary').notNull(),
  evidence: jsonb('evidence').$type<{ behavioral: any[]; declarative: any[] }>().notNull(),
  evidenceFingerprint: text('evidence_fingerprint'),

  alignment: numeric('alignment'),
  realityScore: numeric('reality_score'),
  confidence: numeric('confidence'),
  prediction: text('prediction'),
  recommendedActions: text('recommended_actions').array().default([]),

  status: alertStatusEnum('status').default('new').notNull(),
  statusBy: text('status_by'),
  statusAt: timestamp('status_at', { withTimezone: true }),

  deliveredSse: boolean('delivered_sse').default(false),
  deliveredWebhook: boolean('delivered_webhook').default(false),
  deliveredEmail: boolean('delivered_email').default(false),

  watchlistId: text('watchlist_id'),

  meta: jsonb('meta').$type<Record<string, any>>().default({}),

  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  teamStatusCreatedIdx: index('idx_alerts_team_status_created').on(table.teamId, table.status, table.createdAt),
  entityIdx: index('idx_alerts_entity').on(table.entityId),
  typeIdx: index('idx_alerts_type').on(table.type),
  severityIdx: index('idx_alerts_severity').on(table.severity),
  expiresIdx: index('idx_alerts_expires').on(table.expiresAt),
}));

// ── Watchlists ──────────────────────────────────────────────────────
export const watchlists = pgTable('watchlists', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  notifications: jsonb('notifications').$type<Record<string, any>>().default({}),
  filters: jsonb('filters').$type<Record<string, any>>().default({}),
  notifyOn: text('notify_on').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  teamIdx: index('idx_watchlists_team').on(table.teamId),
}));

// ── Watchlist Entities (junction table) ─────────────────────────────
export const watchlistEntities = pgTable('watchlist_entities', {
  id: serial('id').primaryKey(),
  watchlistId: text('watchlist_id').notNull().references(() => watchlists.id, { onDelete: 'cascade' }),
  entityId: text('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  watchlistEntityIdx: uniqueIndex('idx_watchlist_entities_unique').on(table.watchlistId, table.entityId),
  entityTeamIdx: index('idx_watchlist_entities_entity_team').on(table.entityId, table.teamId),
  watchlistIdx: index('idx_watchlist_entities_watchlist').on(table.watchlistId),
}));

// ── Graph Snapshots ─────────────────────────────────────────────────
export const graphSnapshots = pgTable('graph_snapshots', {
  id: text('id').primaryKey(),
  entityId: text('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  layer: text('layer').notNull(),
  nodes: jsonb('nodes').$type<any[]>().notNull().default([]),
  edges: jsonb('edges').$type<any[]>().notNull().default([]),
  stats: jsonb('stats').$type<Record<string, any>>().default({}),
  status: text('status').default('fresh'),
  lastError: text('last_error'),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  entityLayerIdx: uniqueIndex('idx_graph_snapshots_entity_layer').on(table.entityId, table.layer),
  entityIdx: index('idx_graph_snapshots_entity').on(table.entityId),
  statusIdx: index('idx_graph_snapshots_status').on(table.status),
}));

// ── Detector Config ─────────────────────────────────────────────────
export const detectorConfig = pgTable('detector_config', {
  id: text('id').primaryKey(),
  detectorName: text('detector_name').notNull(),
  entityType: text('entity_type').notNull(),
  factors: jsonb('factors').$type<any[]>().notNull(),
  threshold: numeric('threshold').notNull(),
  version: text('version').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  detectorEntityIdx: uniqueIndex('idx_detector_config_detector_entity').on(table.detectorName, table.entityType),
}));

// ── Domain Taxonomy ─────────────────────────────────────────────────
export const domainTaxonomy = pgTable('domain_taxonomy', {
  id: text('id').primaryKey(),
  domain: text('domain').notNull(),
  parentDomain: text('parent_domain'),
  label: text('label').notNull(),
  description: text('description'),
  aliases: text('aliases').array().default([]),
  keywords: text('keywords').array().default([]),
  cpcCodes: text('cpc_codes').array().default([]),
  naicsCodes: text('naics_codes').array().default([]),
  importanceWeight: numeric('importance_weight').default('1.0'),
  decayRate: numeric('decay_rate'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  domainIdx: index('idx_domain_taxonomy_domain').on(table.domain),
  parentIdx: index('idx_domain_taxonomy_parent').on(table.parentDomain),
}));

// ── Pending Domains ─────────────────────────────────────────────────
export const pendingDomains = pgTable('pending_domains', {
  id: serial('id').primaryKey(),
  domain: text('domain').notNull().unique(),
  signalCount: integer('signal_count').default(1),
  exampleEntityIds: text('example_entity_ids').array().default([]),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
  status: text('status').default('pending'),
  approvedTaxonomyId: text('approved_taxonomy_id'),
  reviewedBy: text('reviewed_by'),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
});

// ── Gap Computation DLQ ─────────────────────────────────────────────
export const gapComputationDlq = pgTable('gap_computation_dlq', {
  id: serial('id').primaryKey(),
  entityId: text('entity_id').notNull().references(() => entities.id),
  domain: text('domain').notNull(),
  error: text('error').notNull(),
  retryCount: integer('retry_count').default(0),
  trigger: text('trigger').notNull(),
  workflowId: text('workflow_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedBy: text('resolved_by'),
}, (table) => ({
  unresolvedIdx: index('idx_gap_dlq_unresolved').on(table.createdAt),
}));
```

- [ ] **Step 5: Update `engine/src/db/index.ts` exports**

Add exports for the new tables. The file re-exports everything from `./schema/analysis`, so new tables are automatically exported. Verify the file still has:

```typescript
export * from './schema/analysis';
```

- [ ] **Step 6: Update triggers for new tables**

In `engine/src/db/init/triggers.ts`, add `gap_computation_dlq`, `detector_config`, `graph_snapshots`, `watchlist_entities`, and `pending_domains` to the list of tables that get the `update_updated_at` trigger (where applicable — only tables with `updated_at`).

- [ ] **Step 7: Update RLS policies for new tables**

In `engine/src/db/init/rls.ts`, ensure RLS is enabled for `watchlist_entities` (team-scoped via `team_id`) using the same pattern as alerts and watchlists.

- [ ] **Step 8: Run schema generation**

```bash
cd engine && bun run drizzle-kit generate
```

Expected: Migration files generated in `engine/drizzle/` directory.

- [ ] **Step 9: Verify schema compiles**

```bash
cd engine && bun run tsc --noEmit
```

Expected: No TypeScript errors.

- [ ] **Step 10: Commit**

```bash
git add engine/src/db/ engine/drizzle/
git commit -m "feat(phase-3a): schema evolution — gap scores, alerts, detectors, snapshots"
```

---

## Task 2: Shared Types, Constants & Interfaces

**Files:**
- Create: `engine/src/gap/types.ts`
- Create: `engine/src/gap/constants.ts`
- Create: `engine/src/detectors/types.ts`

- [ ] **Step 1: Create gap analysis types**

Create `engine/src/gap/types.ts`:

```typescript
export interface GapScoreInput {
  entityId: string;
  domain: string;
}

export interface SignalRow {
  id: string;
  entityId: string;
  sourceId: string;
  polarity: 'declarative' | 'behavioral';
  category: string;
  intensity: number;
  confidence: number;
  domains: string[];
  tags: string[];
  tier: number;
  financialWeight?: { amount?: number; currency?: string; magnitude?: string };
  verification: string;
  publishedAt: Date;
  extractedClaims: any[];
  relatedSignals: Array<{ signalId: string; relation: string }>;
}

export interface ComputedGapScore {
  entityId: string;
  domain: string;
  behavioralCount: number;
  behavioralWeighted: number;
  behavioralTopSignals: any[];
  declarativeCount: number;
  declarativeWeighted: number;
  declarativeTopSignals: any[];
  alignment: number;
  realityScore: number;
  category: string;
  trend: string;
  confidenceLevel: number;
  confidenceInterval: [number, number];
  confidenceFactors: string[];
  normalization: Record<string, any>;
  previousAlignment: number | null;
  previousCategory: string | null;
  categoryChangedAt: Date | null;
  signalWindowFrom: Date;
  signalWindowTo: Date;
  staleDays: number;
  audit: {
    signalIds: string[];
    weights: Record<string, number>;
    excludedSignals: string[];
    algorithmVersion: string;
  };
}

export interface VelocityStats {
  currentQuarter: number;
  previousQuarter: number;
  qoqChange: number;
  monthlyAverage: number;
}

export interface SignalSummary {
  behavioral: {
    count: number;
    weighted: number;
    velocity: VelocityStats;
    topCategories: Array<{ category: string; count: number }>;
  };
  declarative: {
    count: number;
    weighted: number;
    velocity: VelocityStats;
    topCategories: Array<{ category: string; count: number }>;
  };
  domainOverlap: number;
  recentSignals: Array<{ id: string; category: string; polarity: string; publishedAt: Date }>;
  staleDays: number;
}

export interface SignalReader {
  readSignals(entityIds: string[], windowStart: Date, windowEnd: Date): Promise<SignalRow[]>;
  healthy(): boolean;
}

export interface EntityMeta {
  id: string;
  type: string;
  name: string;
  status: string;
  sector: string | null;
  scale: string | null;
}
```

- [ ] **Step 2: Create gap analysis constants**

Create `engine/src/gap/constants.ts`:

```typescript
export const ALGORITHM_VERSION = 'gap-v1.0';

export const TIER_WEIGHTS: Record<number, number> = {
  1: 1.0,
  2: 0.7,
  3: 0.4,
};

export const FINANCIAL_MULTIPLIERS: Record<string, number> = {
  trivial: 0.5,
  minor: 0.8,
  significant: 1.0,
  major: 1.5,
  transformative: 2.0,
};

export const DECAY_RATES: Record<string, number> = {
  'patent-filing': 0.002,
  'patent-prosecution': 0.002,
  'patent-abandonment': 0.001,
  'patent-transfer': 0.002,
  'building-permit': 0.001,
  'financial-filing': 0.004,
  'material-event': 0.004,
  'insider-trading': 0.004,
  'government-contract': 0.003,
  'job-posting': 0.03,
  'press-release': 0.015,
  'earnings-call': 0.015,
  'news-article': 0.02,
  'foia-response': 0.002,
  'academic-publication': 0.003,
  'lobbying-disclosure': 0.005,
  'trademark-registration': 0.002,
  'import-export': 0.005,
  'funding-round': 0.005,
  'court-filing': 0.003,
  'fcc-authorization': 0.003,
};

export const DEFAULT_DECAY_RATE = 0.005;

export const DEFAULT_SIGNAL_WINDOW_DAYS = 365;

export const CATEGORY_THRESHOLDS = {
  minSignals: 5,
  confirmedAlignmentLow: 0.8,
  confirmedAlignmentHigh: 1.2,
  stealthAlignment: 1.5,
  stealthMaxDeclarative: 3,
  vaporwareAlignment: 0.5,
  vaporwareMaxBehavioral: 3,
  pivotJaccardThreshold: 0.3,
} as const;

export const TREND_THRESHOLDS = {
  alignmentDelta: 0.15,
  lookbackDays: 30,
} as const;

export const CONFIDENCE_WEIGHTS = {
  volume: 0.3,
  diversity: 0.3,
  spread: 0.2,
  verification: 0.2,
  volumeCap: 50,
  diversityCap: 5,
  spreadCap: 6,
} as const;

export const DETECTOR_COOLDOWNS: Record<string, number> = {
  'stealth-project': 72,
  'vaporware-risk': 72,
  'acquisition-target': 168,
  'contradiction': 48,
  'trend-reversal': 24,
};

export const EVIDENCE_OVERLAP_THRESHOLD = 0.7;

export const STALENESS_THRESHOLD_DAYS = 90;
```

- [ ] **Step 3: Create detector types**

Create `engine/src/detectors/types.ts`:

```typescript
import type { ComputedGapScore, SignalSummary, EntityMeta, VelocityStats } from '../gap/types';

export interface DetectorContext {
  entityId: string;
  domain: string;
  gapScore: ComputedGapScore;
  previousGapScore: ComputedGapScore | null;
  signals: SignalSummary;
  entity: EntityMeta;
  peerContext: PeerContext | null;
}

export interface PeerContext {
  sectorPeers: PeerScore[];
  domainPeers: PeerScore[];
  upstreamEntities: string[];
  downstreamEntities: string[];
}

export interface PeerScore {
  entityId: string;
  realityScore: number;
  category: string;
  trend: string;
  alignment: number;
}

export interface DetectorResult {
  detected: boolean;
  alertType: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  summary: string;
  evidence: { behavioral: SignalRef[]; declarative: SignalRef[] };
  evidenceFingerprint: string;
  confidence: number;
  prediction?: string;
  recommendedActions: string[];
  snapshotData?: GraphSnapshotData;
  detectorVersion: string;
}

export interface SignalRef {
  signalId: string;
  headline: string;
  category: string;
  publishedAt: string;
}

export interface GraphSnapshotData {
  layer: string;
  nodes: any[];
  edges: any[];
}

export interface Detector {
  name: string;
  version: string;
  type: 'lightweight' | 'heavyweight';
  shouldRun(ctx: DetectorContext): boolean;
  detect(ctx: DetectorContext): Promise<DetectorResult | null>;
}

export interface DetectorHealth {
  consecutiveFailures: number;
  lastFailureAt: Date | null;
  circuitOpen: boolean;
  circuitOpensAt: Date | null;
}
```

- [ ] **Step 4: Commit**

```bash
git add engine/src/gap/ engine/src/detectors/
git commit -m "feat(phase-3a): shared types, constants, and detector interfaces"
```

---

## Task 3: Domain Taxonomy Seed & Service

**Files:**
- Create: `engine/src/sources/domain-taxonomy-seed.yaml`
- Create: `engine/src/services/domain.service.ts`
- Create: `engine/test/gap/domain.service.test.ts`

- [ ] **Step 1: Create domain taxonomy seed YAML**

Create `engine/src/sources/domain-taxonomy-seed.yaml` with parent + child domains. Include at minimum:

```yaml
domains:
  - id: geopolitical
    domain: geopolitical
    label: Geopolitical Intelligence
    children:
      - id: conflict-monitoring
        label: Conflict Monitoring
      - id: chokepoint-disruption
        label: Chokepoint & Trade Route Disruption
      - id: military-posture
        label: Military Posture
      - id: election-tracking
        label: Election Tracking
      - id: country-risk
        label: Country Risk Scoring

  - id: corporate
    domain: corporate
    label: Corporate Intelligence
    importanceWeight: 1.5
    children:
      - id: reality-score
        label: Reality Score / Gap Analysis
        importanceWeight: 2.0
      - id: stealth-detection
        label: Stealth Project Detection
        importanceWeight: 1.5
      - id: vaporware-detection
        label: Vaporware Detection
        importanceWeight: 1.5
      - id: acquisition-scoring
        label: Acquisition Target Scoring
      - id: patent-analytics
        label: Patent / IP Analytics
        decayRate: 0.002
      - id: sec-filing
        label: SEC Filing Analysis
        decayRate: 0.004
      - id: hiring-signals
        label: Hiring Signal Analysis
        decayRate: 0.03

  - id: financial
    domain: financial
    label: Financial Intelligence
    children:
      - id: central-bank
        label: Central Bank Policy Signals
      - id: sanctions-evasion
        label: Sanctions Evasion Detection

  - id: cyber
    domain: cyber
    label: Cyber Intelligence

  - id: energy
    domain: energy
    label: Energy & Climate Intelligence

  - id: health
    domain: health
    label: Health & Biotech Intelligence

  - id: supply-chain
    domain: supply-chain
    label: Supply Chain Intelligence

  - id: space
    domain: space
    label: Space & Aerospace Intelligence

  - id: maritime
    domain: maritime
    label: Maritime Intelligence

  - id: labor
    domain: labor
    label: Labor & Talent Intelligence

  - id: legal
    domain: legal
    label: Legal & Regulatory Intelligence

  - id: real-estate
    domain: real-estate
    label: Real Estate & Infrastructure Intelligence

  - id: media
    domain: media
    label: Media & Information Intelligence

  - id: foia
    domain: foia
    label: FOIA Intelligence
```

- [ ] **Step 2: Write failing test for DomainService**

Create `engine/test/gap/domain.service.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { DomainService } from '../../src/services/domain.service';

describe('DomainService', () => {
  const mockDb = {} as any;

  it('resolveDecayRate uses domain-specific override when provided', () => {
    const service = new DomainService(mockDb);
    // When domain_taxonomy has a custom decay_rate, it takes precedence
    const rate = service.resolveDecayRate('patent-filing', 0.001);
    expect(rate).toBe(0.001); // domain override wins
  });

  it('resolveDecayRate falls back to category rate when domain rate is null', () => {
    const service = new DomainService(mockDb);
    const rate = service.resolveDecayRate('news-article', null);
    expect(rate).toBe(0.02); // category-specific from DECAY_RATES
  });

  it('resolveDecayRate falls back to category rate when domain rate is undefined', () => {
    const service = new DomainService(mockDb);
    const rate = service.resolveDecayRate('patent-filing', undefined);
    expect(rate).toBe(0.002); // category-specific from DECAY_RATES
  });

  it('resolveDecayRate falls back to default for unknown category', () => {
    const service = new DomainService(mockDb);
    const rate = service.resolveDecayRate('unknown-category', undefined);
    expect(rate).toBe(0.005); // DEFAULT_DECAY_RATE
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd engine && bun run vitest run test/gap/domain.service.test.ts
```

Expected: FAIL — `DomainService` not found.

- [ ] **Step 4: Implement DomainService**

Create `engine/src/services/domain.service.ts`:

```typescript
import { eq } from 'drizzle-orm';
import { createLogger } from '@gambit/common';
import { domainTaxonomy } from '../db';
import { DECAY_RATES, DEFAULT_DECAY_RATE } from '../gap/constants';
import type { DrizzleClient } from '../db/transaction';

const logger = createLogger('domain-service');

export class DomainService {
  constructor(private db: DrizzleClient) {}

  resolveDecayRate(category: string, domainDecayRate: number | undefined | null): number {
    if (domainDecayRate != null) return domainDecayRate;
    return DECAY_RATES[category] ?? DEFAULT_DECAY_RATE;
  }

  async getDomainTaxonomy(): Promise<Array<typeof domainTaxonomy.$inferSelect>> {
    return (this.db as any).select().from(domainTaxonomy);
  }

  async getDomainById(id: string): Promise<typeof domainTaxonomy.$inferSelect | null> {
    const rows = await (this.db as any).select().from(domainTaxonomy).where(eq(domainTaxonomy.id, id));
    return rows[0] ?? null;
  }

  async getImportanceWeight(domainId: string): Promise<number> {
    const domain = await this.getDomainById(domainId);
    return domain?.importanceWeight ? Number(domain.importanceWeight) : 1.0;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd engine && bun run vitest run test/gap/domain.service.test.ts
```

Expected: PASS.

- [ ] **Step 6: Add seed loading method to DomainService**

Add a `seedFromYaml()` method to `DomainService` that reads `engine/src/sources/domain-taxonomy-seed.yaml`, parses it, and inserts rows into `domain_taxonomy` with `ON CONFLICT DO NOTHING`. Call this from `engine/src/routes/admin.ts` via a `POST /admin/seed-domains` endpoint, and optionally from the engine boot sequence (after `runDatabaseInit`) if the table is empty.

```typescript
async seedFromYaml(): Promise<number> {
  const yaml = await Bun.file(new URL('../sources/domain-taxonomy-seed.yaml', import.meta.url)).text();
  const parsed = parseYaml(yaml); // use js-yaml or similar
  let count = 0;
  for (const parent of parsed.domains) {
    await (this.db as any).insert(domainTaxonomy).values({
      id: parent.id, domain: parent.domain, label: parent.label,
      parentDomain: null, importanceWeight: String(parent.importanceWeight ?? 1.0),
      decayRate: parent.decayRate ? String(parent.decayRate) : null,
    }).onConflictDoNothing();
    count++;
    for (const child of parent.children ?? []) {
      await (this.db as any).insert(domainTaxonomy).values({
        id: child.id, domain: child.id, label: child.label,
        parentDomain: parent.id, importanceWeight: String(child.importanceWeight ?? 1.0),
        decayRate: child.decayRate ? String(child.decayRate) : null,
      }).onConflictDoNothing();
      count++;
    }
  }
  return count;
}
```

- [ ] **Step 7: Commit**

```bash
git add engine/src/services/domain.service.ts engine/src/sources/domain-taxonomy-seed.yaml engine/test/gap/domain.service.test.ts
git commit -m "feat(phase-3a): domain taxonomy seed data, DomainService, and YAML loader"
```

---

## Task 4: Signal Reader Interface

**Files:**
- Create: `engine/src/gap/signal-reader.ts`
- Create: `engine/test/gap/signal-reader.test.ts`

- [ ] **Step 1: Write failing test**

Create `engine/test/gap/signal-reader.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { PostgresSignalReader, ClickHouseSignalReader } from '../../src/gap/signal-reader';

describe('PostgresSignalReader', () => {
  it('reads signals for given entity IDs and window', async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                signals: { id: 'signal:1', entityId: 'company:nvidia', polarity: 'behavioral', intensity: '0.8', confidence: '0.9' },
                sources: { tier: 2 },
              },
            ]),
          }),
        }),
      }),
    };

    const reader = new PostgresSignalReader(mockDb as any);
    const signals = await reader.readSignals(
      ['company:nvidia'],
      new Date('2025-01-01'),
      new Date('2026-01-01'),
    );

    expect(signals).toHaveLength(1);
    expect(signals[0].entityId).toBe('company:nvidia');
    expect(signals[0].intensity).toBe(0.8);
    expect(reader.healthy()).toBe(true);
  });
});

describe('ClickHouseSignalReader', () => {
  it('returns healthy=false when client is null', () => {
    const reader = new ClickHouseSignalReader(null);
    expect(reader.healthy()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd engine && bun run vitest run test/gap/signal-reader.test.ts
```

- [ ] **Step 3: Implement SignalReader**

Create `engine/src/gap/signal-reader.ts`:

```typescript
import { and, gte, lte, inArray } from 'drizzle-orm';
import { createLogger } from '@gambit/common';
import { signals, sources } from '../db';
import type { SignalRow } from './types';
import type { DrizzleClient } from '../db/transaction';

const logger = createLogger('signal-reader');

export class PostgresSignalReader {
  private _healthy = true;

  constructor(private db: DrizzleClient) {}

  async readSignals(entityIds: string[], windowStart: Date, windowEnd: Date): Promise<SignalRow[]> {
    try {
      const rows = await (this.db as any)
        .select()
        .from(signals)
        .innerJoin(sources, (join: any) => join.on(signals.sourceId, sources.id))
        .where(
          and(
            inArray(signals.entityId, entityIds),
            gte(signals.publishedAt, windowStart),
            lte(signals.publishedAt, windowEnd),
          ),
        );

      return rows.map((row: any) => ({
        id: row.signals.id,
        entityId: row.signals.entityId,
        sourceId: row.signals.sourceId,
        polarity: row.signals.polarity,
        category: row.signals.category,
        intensity: Number(row.signals.intensity),
        confidence: Number(row.signals.confidence),
        domains: row.signals.domains ?? [],
        tags: row.signals.tags ?? [],
        tier: row.sources.tier ?? 3,
        financialWeight: row.signals.financialWeight,
        verification: row.signals.verification,
        publishedAt: new Date(row.signals.publishedAt),
        extractedClaims: row.signals.extractedClaims ?? [],
        relatedSignals: row.signals.relatedSignals ?? [],
      }));
    } catch (err) {
      this._healthy = false;
      logger.error({ err }, 'PostgresSignalReader failed');
      throw err;
    }
  }

  healthy(): boolean {
    return this._healthy;
  }
}

export class ClickHouseSignalReader {
  private _healthy: boolean;

  constructor(private clickhouse: any | null) {
    this._healthy = clickhouse != null;
  }

  async readSignals(entityIds: string[], windowStart: Date, windowEnd: Date): Promise<SignalRow[]> {
    if (!this.clickhouse) throw new Error('ClickHouse not connected');

    try {
      const result = await this.clickhouse.query({
        query: `
          SELECT *
          FROM signals_analytics
          WHERE entity_id IN ({entityIds:Array(String)})
            AND published_at >= {windowStart:DateTime}
            AND published_at <= {windowEnd:DateTime}
          ORDER BY entity_id, polarity, published_at DESC
        `,
        query_params: {
          entityIds,
          windowStart: windowStart.toISOString(),
          windowEnd: windowEnd.toISOString(),
        },
      });

      const rows = await result.json();
      return (rows.data ?? []).map((row: any) => ({
        id: row.signal_id,
        entityId: row.entity_id,
        sourceId: row.source_id,
        polarity: row.polarity,
        category: row.category,
        intensity: row.intensity,
        confidence: row.confidence,
        domains: row.domains ?? [],
        tags: [],
        tier: row.tier ?? 3,
        financialWeight: undefined,
        verification: 'unverified',
        publishedAt: new Date(row.published_at),
        extractedClaims: [],
        relatedSignals: [],
      }));
    } catch (err) {
      this._healthy = false;
      logger.error({ err }, 'ClickHouseSignalReader failed');
      throw err;
    }
  }

  healthy(): boolean {
    return this._healthy;
  }
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd engine && bun run vitest run test/gap/signal-reader.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add engine/src/gap/signal-reader.ts engine/test/gap/signal-reader.test.ts
git commit -m "feat(phase-3a): SignalReader interface with Postgres and ClickHouse implementations"
```

---

## Task 5: Gap Scoring Algorithm — Signal Weights

**Files:**
- Create: `engine/src/gap/signal-weight.ts`
- Create: `engine/src/gap/velocity.ts`
- Create: `engine/test/gap/signal-weight.test.ts`
- Create: `engine/test/gap/velocity.test.ts`

- [ ] **Step 1: Write failing tests for signal weight computation**

Create `engine/test/gap/signal-weight.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeSignalWeight, computeRecencyDecay } from '../../src/gap/signal-weight';

describe('computeRecencyDecay', () => {
  it('returns 1.0 for signal published today', () => {
    expect(computeRecencyDecay(0, 0.005)).toBeCloseTo(1.0);
  });

  it('decays over time', () => {
    const decay = computeRecencyDecay(100, 0.005);
    expect(decay).toBeCloseTo(Math.exp(-0.005 * 100), 5);
    expect(decay).toBeLessThan(1.0);
  });

  it('uses category-specific rate', () => {
    const patentDecay = computeRecencyDecay(100, 0.002);
    const jobDecay = computeRecencyDecay(100, 0.03);
    expect(patentDecay).toBeGreaterThan(jobDecay); // patents decay slower
  });
});

describe('computeSignalWeight', () => {
  it('computes weight with all factors', () => {
    const weight = computeSignalWeight({
      intensity: 0.8,
      tier: 1,
      daysSinceSignal: 0,
      decayRate: 0.005,
      financialMagnitude: 'major',
    });
    // 0.8 × 1.0 × 1.0 × 1.5 = 1.2
    expect(weight).toBeCloseTo(1.2);
  });

  it('applies tier weight correctly', () => {
    const tier1 = computeSignalWeight({ intensity: 1.0, tier: 1, daysSinceSignal: 0, decayRate: 0.005 });
    const tier3 = computeSignalWeight({ intensity: 1.0, tier: 3, daysSinceSignal: 0, decayRate: 0.005 });
    expect(tier1).toBeCloseTo(1.0);
    expect(tier3).toBeCloseTo(0.4);
  });

  it('defaults financial multiplier to 1.0 when missing', () => {
    const weight = computeSignalWeight({ intensity: 0.5, tier: 2, daysSinceSignal: 0, decayRate: 0.005 });
    // 0.5 × 0.7 × 1.0 × 1.0 = 0.35
    expect(weight).toBeCloseTo(0.35);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd engine && bun run vitest run test/gap/signal-weight.test.ts
```

- [ ] **Step 3: Implement signal weight computation**

Create `engine/src/gap/signal-weight.ts`:

```typescript
import { TIER_WEIGHTS, FINANCIAL_MULTIPLIERS } from './constants';

export function computeRecencyDecay(daysSinceSignal: number, decayRate: number): number {
  return Math.exp(-decayRate * daysSinceSignal);
}

export function computeSignalWeight(params: {
  intensity: number;
  tier: number;
  daysSinceSignal: number;
  decayRate: number;
  financialMagnitude?: string;
}): number {
  const tierWeight = TIER_WEIGHTS[params.tier] ?? TIER_WEIGHTS[3];
  const recencyDecay = computeRecencyDecay(params.daysSinceSignal, params.decayRate);
  const financialMult = params.financialMagnitude
    ? (FINANCIAL_MULTIPLIERS[params.financialMagnitude] ?? 1.0)
    : 1.0;

  return params.intensity * tierWeight * recencyDecay * financialMult;
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd engine && bun run vitest run test/gap/signal-weight.test.ts
```

- [ ] **Step 5: Write failing velocity tests**

Create `engine/test/gap/velocity.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeVelocity } from '../../src/gap/velocity';

describe('computeVelocity', () => {
  const now = new Date('2026-03-23T00:00:00Z');

  it('computes QoQ change correctly', () => {
    const signals = [
      // Current quarter (2026 Q1): 10 signals
      ...Array.from({ length: 10 }, (_, i) => ({
        polarity: 'behavioral' as const,
        publishedAt: new Date('2026-02-15'),
      })),
      // Previous quarter (2025 Q4): 5 signals
      ...Array.from({ length: 5 }, (_, i) => ({
        polarity: 'behavioral' as const,
        publishedAt: new Date('2025-11-15'),
      })),
    ];

    const velocity = computeVelocity(signals, 'behavioral', now);
    expect(velocity.currentQuarter).toBe(10);
    expect(velocity.previousQuarter).toBe(5);
    expect(velocity.qoqChange).toBeCloseTo(1.0); // 100% increase
  });

  it('handles zero previous quarter', () => {
    const signals = [
      { polarity: 'behavioral' as const, publishedAt: new Date('2026-02-01') },
    ];
    const velocity = computeVelocity(signals, 'behavioral', now);
    expect(velocity.qoqChange).toBe(1.0); // 100% when previous is 0
  });

  it('filters by polarity', () => {
    const signals = [
      { polarity: 'behavioral' as const, publishedAt: new Date('2026-02-01') },
      { polarity: 'declarative' as const, publishedAt: new Date('2026-02-01') },
    ];
    const velocity = computeVelocity(signals, 'behavioral', now);
    expect(velocity.currentQuarter).toBe(1);
  });
});
```

- [ ] **Step 6: Implement velocity computation**

Create `engine/src/gap/velocity.ts`:

```typescript
import type { VelocityStats } from './types';

function startOfQuarter(date: Date): Date {
  const month = Math.floor(date.getMonth() / 3) * 3;
  return new Date(Date.UTC(date.getFullYear(), month, 1));
}

export function computeVelocity(
  signals: Array<{ polarity: string; publishedAt: Date }>,
  polarity: string,
  now: Date,
): VelocityStats {
  const currentQuarterStart = startOfQuarter(now);
  const previousQuarterStart = new Date(currentQuarterStart);
  previousQuarterStart.setMonth(previousQuarterStart.getMonth() - 3);

  const filtered = signals.filter((s) => s.polarity === polarity);

  const currentQuarter = filtered.filter(
    (s) => s.publishedAt >= currentQuarterStart,
  ).length;

  const previousQuarter = filtered.filter(
    (s) => s.publishedAt >= previousQuarterStart && s.publishedAt < currentQuarterStart,
  ).length;

  const qoqChange = previousQuarter === 0
    ? (currentQuarter > 0 ? 1.0 : 0)
    : (currentQuarter - previousQuarter) / previousQuarter;

  const windowMonths = 12;
  const monthlyAverage = filtered.length / windowMonths;

  return { currentQuarter, previousQuarter, qoqChange, monthlyAverage };
}
```

- [ ] **Step 7: Run all tests, verify pass**

```bash
cd engine && bun run vitest run test/gap/
```

- [ ] **Step 8: Commit**

```bash
git add engine/src/gap/signal-weight.ts engine/src/gap/velocity.ts engine/test/gap/
git commit -m "feat(phase-3a): signal weight computation and velocity stats"
```

---

## Task 6: Gap Scoring Algorithm — Category, Trend & Reality Score

**Files:**
- Create: `engine/src/gap/scoring.ts`
- Create: `engine/src/gap/confidence.ts`
- Create: `engine/test/gap/scoring.test.ts`
- Create: `engine/test/gap/confidence.test.ts`

- [ ] **Step 1: Write failing scoring tests**

Create `engine/test/gap/scoring.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { classifyCategory, computeAlignment, normalizeRealityScore, computeTrend, computeJaccardSimilarity } from '../../src/gap/scoring';

describe('computeAlignment', () => {
  it('returns ratio of behavioral to declarative', () => {
    expect(computeAlignment(10, 5)).toBeCloseTo(2.0);
  });

  it('returns Infinity when declarative is 0 and behavioral > 0', () => {
    expect(computeAlignment(10, 0)).toBe(Infinity);
  });

  it('returns 0 when both are 0', () => {
    expect(computeAlignment(0, 0)).toBe(0);
  });
});

describe('classifyCategory', () => {
  it('returns insufficient-data when fewer than 5 signals', () => {
    expect(classifyCategory(1.0, 2, 2, 1.0)).toBe('insufficient-data');
  });

  it('returns confirmed for alignment 0.8-1.2', () => {
    expect(classifyCategory(1.0, 10, 10, 1.0)).toBe('confirmed');
  });

  it('returns stealth for high alignment + low declarative', () => {
    expect(classifyCategory(2.0, 20, 2, 1.0)).toBe('stealth');
  });

  it('returns vaporware for low alignment + low behavioral', () => {
    expect(classifyCategory(0.3, 2, 20, 1.0)).toBe('vaporware');
  });

  it('returns pivot for low domain overlap', () => {
    expect(classifyCategory(1.3, 10, 10, 0.1)).toBe('pivot');
  });

  it('returns unclassified as fallthrough', () => {
    expect(classifyCategory(1.3, 10, 10, 0.8)).toBe('unclassified');
  });

  it('priority: insufficient-data wins over stealth', () => {
    expect(classifyCategory(3.0, 2, 1, 0.0)).toBe('insufficient-data');
  });
});

describe('normalizeRealityScore', () => {
  it('returns 85 base for stealth (behavioral only)', () => {
    const score = normalizeRealityScore(Infinity, 50, 0, 0, 1.0);
    expect(score).toBeGreaterThanOrEqual(80);
    expect(score).toBeLessThanOrEqual(90);
  });

  it('returns 15 base for vaporware (declarative only)', () => {
    const score = normalizeRealityScore(0, 0, 50, 0, 1.0);
    expect(score).toBeLessThanOrEqual(20);
  });

  it('returns ~75 for perfect alignment', () => {
    const score = normalizeRealityScore(1.0, 50, 50, 0, 1.0);
    expect(score).toBeGreaterThanOrEqual(60);
    expect(score).toBeLessThanOrEqual(80);
  });

  it('scales by signal confidence', () => {
    const fewSignals = normalizeRealityScore(1.0, 5, 5, 0, 1.0);
    const manySignals = normalizeRealityScore(1.0, 50, 50, 0, 1.0);
    expect(manySignals).toBeGreaterThan(fewSignals);
  });

  it('clamps to 0-100', () => {
    expect(normalizeRealityScore(1.0, 100, 100, 1.0, 1.0)).toBeLessThanOrEqual(100);
    expect(normalizeRealityScore(0, 0, 0, 0, 0)).toBeGreaterThanOrEqual(0);
  });
});

describe('computeTrend', () => {
  it('returns improving when alignment increases > 0.15', () => {
    expect(computeTrend(1.5, 1.0)).toBe('improving');
  });

  it('returns declining when alignment decreases > 0.15', () => {
    expect(computeTrend(0.5, 1.0)).toBe('declining');
  });

  it('returns stable within threshold', () => {
    expect(computeTrend(1.05, 1.0)).toBe('stable');
  });

  it('returns stable when no previous', () => {
    expect(computeTrend(1.0, null)).toBe('stable');
  });
});

describe('computeJaccardSimilarity', () => {
  it('returns 1.0 for identical sets', () => {
    expect(computeJaccardSimilarity(['a', 'b'], ['a', 'b'])).toBeCloseTo(1.0);
  });

  it('returns 0.0 for disjoint sets', () => {
    expect(computeJaccardSimilarity(['a', 'b'], ['c', 'd'])).toBeCloseTo(0.0);
  });

  it('handles empty sets', () => {
    expect(computeJaccardSimilarity([], [])).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, verify fail**

```bash
cd engine && bun run vitest run test/gap/scoring.test.ts
```

- [ ] **Step 3: Implement scoring functions**

Create `engine/src/gap/scoring.ts`:

```typescript
import { CATEGORY_THRESHOLDS, TREND_THRESHOLDS } from './constants';

export function computeAlignment(behavioralWeighted: number, declarativeWeighted: number): number {
  if (declarativeWeighted === 0 && behavioralWeighted === 0) return 0;
  if (declarativeWeighted === 0) return Infinity;
  return behavioralWeighted / declarativeWeighted;
}

export function classifyCategory(
  alignment: number,
  behavioralCount: number,
  declarativeCount: number,
  domainOverlap: number,
): string {
  const totalSignals = behavioralCount + declarativeCount;
  const t = CATEGORY_THRESHOLDS;

  // Priority order — first match wins
  if (totalSignals < t.minSignals) return 'insufficient-data';
  if (alignment >= t.confirmedAlignmentLow && alignment <= t.confirmedAlignmentHigh) return 'confirmed';
  if (alignment > t.stealthAlignment && declarativeCount < t.stealthMaxDeclarative) return 'stealth';
  if (alignment < t.vaporwareAlignment && behavioralCount < t.vaporwareMaxBehavioral) return 'vaporware';
  if (domainOverlap < t.pivotJaccardThreshold) return 'pivot';
  return 'unclassified';
}

export function normalizeRealityScore(
  alignment: number,
  behavioralCount: number,
  declarativeCount: number,
  verificationRatio: number,
  signalDensity: number,
): number {
  const totalSignals = behavioralCount + declarativeCount;

  let base: number;
  if (declarativeCount === 0 && behavioralCount > 0) {
    base = 85;
  } else if (behavioralCount === 0 && declarativeCount > 0) {
    base = 15;
  } else if (totalSignals === 0) {
    base = 0;
  } else {
    const x = Math.log(alignment);
    base = 62.5 + 32.5 * Math.tanh(x * 1.5);
  }

  const signalConfidence = Math.min(1.0, totalSignals / 50);
  const verificationBonus = verificationRatio * 5;
  const raw = base * signalConfidence + verificationBonus;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

export function computeTrend(
  currentAlignment: number,
  previousAlignment: number | null,
): 'improving' | 'stable' | 'declining' {
  if (previousAlignment == null) return 'stable';
  const delta = currentAlignment - previousAlignment;
  if (delta > TREND_THRESHOLDS.alignmentDelta) return 'improving';
  if (delta < -TREND_THRESHOLDS.alignmentDelta) return 'declining';
  return 'stable';
}

export function computeJaccardSimilarity(setA: string[], setB: string[]): number {
  const a = new Set(setA);
  const b = new Set(setB);
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter((x) => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd engine && bun run vitest run test/gap/scoring.test.ts
```

- [ ] **Step 5: Write failing confidence tests**

Create `engine/test/gap/confidence.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeConfidenceLevel, computeConfidenceInterval } from '../../src/gap/confidence';

describe('computeConfidenceLevel', () => {
  it('returns high confidence with many signals from diverse sources', () => {
    const { level } = computeConfidenceLevel({
      totalSignals: 100,
      uniqueSources: 10,
      monthsWithSignals: 12,
      verificationRatio: 0.5,
    });
    expect(level).toBeGreaterThan(0.8);
  });

  it('returns low confidence with few signals from one source', () => {
    const { level } = computeConfidenceLevel({
      totalSignals: 3,
      uniqueSources: 1,
      monthsWithSignals: 1,
      verificationRatio: 0,
    });
    expect(level).toBeLessThan(0.3);
  });

  it('identifies weak factors', () => {
    const { factors } = computeConfidenceLevel({
      totalSignals: 100,
      uniqueSources: 1,
      monthsWithSignals: 12,
      verificationRatio: 0.5,
    });
    expect(factors).toContain('low source diversity');
  });
});

describe('computeConfidenceInterval', () => {
  it('returns narrow interval for many signals', () => {
    const [low, high] = computeConfidenceInterval(75, 100);
    expect(high - low).toBeLessThanOrEqual(10);
  });

  it('returns wide interval for few signals', () => {
    const [low, high] = computeConfidenceInterval(75, 5);
    expect(high - low).toBeGreaterThan(20);
  });

  it('clamps to 0-100', () => {
    const [low, high] = computeConfidenceInterval(5, 2);
    expect(low).toBeGreaterThanOrEqual(0);
    const [low2, high2] = computeConfidenceInterval(98, 2);
    expect(high2).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 6: Implement confidence computation**

Create `engine/src/gap/confidence.ts`:

```typescript
import { CONFIDENCE_WEIGHTS } from './constants';

interface ConfidenceInput {
  totalSignals: number;
  uniqueSources: number;
  monthsWithSignals: number;
  verificationRatio: number;
}

export interface ConfidenceResult {
  level: number;
  factors: string[];
}

export function computeConfidenceLevel(input: ConfidenceInput): ConfidenceResult {
  const w = CONFIDENCE_WEIGHTS;

  const volume = Math.min(1.0, input.totalSignals / w.volumeCap);
  const diversity = Math.min(1.0, input.uniqueSources / w.diversityCap);
  const spread = Math.min(1.0, input.monthsWithSignals / w.spreadCap);
  const verification = input.verificationRatio;

  const level = w.volume * volume + w.diversity * diversity + w.spread * spread + w.verification * verification;

  const factors: string[] = [];
  if (volume < 0.5) factors.push('low signal volume');
  if (diversity < 0.5) factors.push('low source diversity');
  if (spread < 0.5) factors.push('clustered temporal spread');
  if (verification < 0.2) factors.push('low verification ratio');

  return { level, factors };
}

export function computeConfidenceInterval(
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

- [ ] **Step 7: Run all tests**

```bash
cd engine && bun run vitest run test/gap/
```

Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add engine/src/gap/scoring.ts engine/src/gap/confidence.ts engine/test/gap/scoring.test.ts engine/test/gap/confidence.test.ts
git commit -m "feat(phase-3a): category classification, reality score normalization, confidence computation"
```

---

## Task 7: GapService — Computation & CRUD

**Files:**
- Create: `engine/src/services/gap.service.ts`
- Create: `engine/test/gap/gap.service.test.ts`
- Modify: `engine/src/services/container.ts`

- [ ] **Step 1: Write failing test for GapService.computeGapScore**

Create `engine/test/gap/gap.service.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GapService } from '../../src/services/gap.service';

describe('GapService', () => {
  it('computes a gap score from signals', async () => {
    const mockSignals = [
      { id: 's1', entityId: 'company:test', polarity: 'behavioral', intensity: 0.8, confidence: 0.9, tier: 1, category: 'patent-filing', domains: ['ai'], publishedAt: new Date('2026-03-01'), financialWeight: null, verification: 'unverified', tags: [], sourceId: 'src:1', extractedClaims: [], relatedSignals: [] },
      { id: 's2', entityId: 'company:test', polarity: 'behavioral', intensity: 0.6, confidence: 0.7, tier: 2, category: 'job-posting', domains: ['ai'], publishedAt: new Date('2026-02-15'), financialWeight: null, verification: 'unverified', tags: [], sourceId: 'src:2', extractedClaims: [], relatedSignals: [] },
      { id: 's3', entityId: 'company:test', polarity: 'declarative', intensity: 0.5, confidence: 0.8, tier: 1, category: 'press-release', domains: ['ai'], publishedAt: new Date('2026-03-10'), financialWeight: null, verification: 'unverified', tags: [], sourceId: 'src:1', extractedClaims: [], relatedSignals: [] },
    ];

    const mockDb = {} as any;
    const mockClickhouse = null;
    const service = new GapService(mockDb, mockClickhouse, null);

    const result = service.computeFromSignals('company:test', 'ai', mockSignals, null, new Date('2026-03-23'));

    expect(result.entityId).toBe('company:test');
    expect(result.domain).toBe('ai');
    expect(result.behavioralCount).toBe(2);
    expect(result.declarativeCount).toBe(1);
    expect(result.alignment).toBeGreaterThan(1.0); // more behavioral than declarative
    expect(result.realityScore).toBeGreaterThanOrEqual(0);
    expect(result.realityScore).toBeLessThanOrEqual(100);
    expect(result.category).toBeDefined();
    expect(result.audit.algorithmVersion).toBe('gap-v1.0');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd engine && bun run vitest run test/gap/gap.service.test.ts
```

- [ ] **Step 3: Implement GapService**

Create `engine/src/services/gap.service.ts`:

```typescript
import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { createLogger } from '@gambit/common';
import { gapScores, entities, domainTaxonomy } from '../db';
import { computeSignalWeight } from '../gap/signal-weight';
import { computeAlignment, classifyCategory, normalizeRealityScore, computeTrend, computeJaccardSimilarity } from '../gap/scoring';
import { computeConfidenceLevel, computeConfidenceInterval } from '../gap/confidence';
import { computeVelocity } from '../gap/velocity';
import { ALGORITHM_VERSION, DEFAULT_SIGNAL_WINDOW_DAYS, STALENESS_THRESHOLD_DAYS } from '../gap/constants';
import { DomainService } from './domain.service';
import type { SignalRow, ComputedGapScore, SignalSummary } from '../gap/types';
import type { DrizzleClient } from '../db/transaction';

const logger = createLogger('gap-service');

export class GapService {
  constructor(
    private db: DrizzleClient,
    private clickhouse: any | null,
    private redis: any | null,
  ) {}

  /**
   * Pure computation — takes signals, returns computed score. No DB writes.
   */
  computeFromSignals(
    entityId: string,
    domain: string,
    signals: SignalRow[],
    previousScore: ComputedGapScore | null,
    now: Date,
    domainDecayRate?: number | null,
  ): ComputedGapScore {
    const windowEnd = now;
    const windowStart = new Date(now.getTime() - DEFAULT_SIGNAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const domainService = new DomainService(this.db);
    const behavioral = signals.filter((s) => s.polarity === 'behavioral');
    const declarative = signals.filter((s) => s.polarity === 'declarative');

    // Compute weights
    let behavioralWeighted = 0;
    let declarativeWeighted = 0;
    const weights: Record<string, number> = {};

    for (const s of signals) {
      const daysSince = Math.max(0, (now.getTime() - s.publishedAt.getTime()) / (24 * 60 * 60 * 1000));
      const decayRate = domainService.resolveDecayRate(s.category, domainDecayRate);
      const w = computeSignalWeight({
        intensity: s.intensity,
        tier: s.tier,
        daysSinceSignal: daysSince,
        decayRate,
        financialMagnitude: s.financialWeight?.magnitude,
      });
      weights[s.id] = w;
      if (s.polarity === 'behavioral') behavioralWeighted += w;
      else declarativeWeighted += w;
    }

    const alignment = computeAlignment(behavioralWeighted, declarativeWeighted);
    const behavioralDomains = [...new Set(behavioral.flatMap((s) => s.domains))];
    const declarativeDomains = [...new Set(declarative.flatMap((s) => s.domains))];
    const domainOverlap = computeJaccardSimilarity(behavioralDomains, declarativeDomains);
    const category = classifyCategory(alignment, behavioral.length, declarative.length, domainOverlap);

    const verified = signals.filter((s) => s.verification === 'verified').length;
    const verificationRatio = signals.length > 0 ? verified / signals.length : 0;
    const realityScore = normalizeRealityScore(alignment, behavioral.length, declarative.length, verificationRatio, signals.length / 12);

    const trend = computeTrend(
      alignment === Infinity ? 100 : alignment,  // clamp Infinity for trend comparison
      previousScore?.alignment === Infinity ? 100 : (previousScore?.alignment ?? null),
    );

    const uniqueSources = new Set(signals.map((s) => s.sourceId)).size;
    const monthsWithSignals = new Set(signals.map((s) => `${s.publishedAt.getFullYear()}-${s.publishedAt.getMonth()}`)).size;
    const { level: confidenceLevel, factors: confidenceFactors } = computeConfidenceLevel({
      totalSignals: signals.length, uniqueSources, monthsWithSignals, verificationRatio,
    });
    const confidenceInterval = computeConfidenceInterval(realityScore, signals.length);

    const mostRecentSignal = signals.reduce((latest, s) => s.publishedAt > latest ? s.publishedAt : latest, new Date(0));
    const staleDays = Math.floor((now.getTime() - mostRecentSignal.getTime()) / (24 * 60 * 60 * 1000));

    const categoryChanged = previousScore && previousScore.category !== category;

    return {
      entityId, domain,
      behavioralCount: behavioral.length,
      behavioralWeighted,
      behavioralTopSignals: behavioral.sort((a, b) => (weights[b.id] ?? 0) - (weights[a.id] ?? 0)).slice(0, 5).map((s) => ({ signalId: s.id, category: s.category, weight: weights[s.id] })),
      declarativeCount: declarative.length,
      declarativeWeighted,
      declarativeTopSignals: declarative.sort((a, b) => (weights[b.id] ?? 0) - (weights[a.id] ?? 0)).slice(0, 5).map((s) => ({ signalId: s.id, category: s.category, weight: weights[s.id] })),
      alignment, realityScore, category, trend,
      confidenceLevel, confidenceInterval, confidenceFactors,
      normalization: {},
      previousAlignment: previousScore?.alignment ?? null,
      previousCategory: previousScore?.category ?? null,
      categoryChangedAt: categoryChanged ? now : (previousScore?.categoryChangedAt ?? null),
      signalWindowFrom: windowStart,
      signalWindowTo: windowEnd,
      staleDays,
      audit: { signalIds: signals.map((s) => s.id), weights, excludedSignals: [], algorithmVersion: ALGORITHM_VERSION },
    };
  }

  /** Read previous gap score for an entity-domain pair from PG. */
  async getPreviousScore(entityId: string, domain: string): Promise<ComputedGapScore | null> {
    const rows = await (this.db as any).select().from(gapScores)
      .where(and(eq(gapScores.entityId, entityId), eq(gapScores.domain, domain)))
      .limit(1);
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      entityId: r.entityId, domain: r.domain,
      alignment: Number(r.alignment), realityScore: Number(r.realityScore),
      category: r.category, trend: r.trend,
      behavioralCount: r.behavioralCount, behavioralWeighted: Number(r.behavioralWeighted),
      declarativeCount: r.declarativeCount, declarativeWeighted: Number(r.declarativeWeighted),
      behavioralTopSignals: r.behavioralTopSignals, declarativeTopSignals: r.declarativeTopSignals,
      confidenceLevel: Number(r.confidenceLevel), confidenceInterval: r.confidenceInterval,
      confidenceFactors: r.confidenceFactors, normalization: r.normalization,
      previousAlignment: r.previousAlignment ? Number(r.previousAlignment) : null,
      previousCategory: r.previousCategory, categoryChangedAt: r.categoryChangedAt,
      signalWindowFrom: r.signalWindowFrom, signalWindowTo: r.signalWindowTo,
      staleDays: r.staleDays,
      audit: r.audit,
    } as ComputedGapScore;
  }

  // ... upsertGapScore, appendHistory, getLeaderboard, getMovers, getScoreHistory,
  // rollupEntityScores, getEntityScores, getByDomain — each follows the same pattern:
  // Drizzle queries for PG, ClickHouse client queries for analytics, Redis cache checks.
  // See design spec Section 7.1 for the full method list.
}
```

- [ ] **Step 4: Run test, verify pass**

```bash
cd engine && bun run vitest run test/gap/gap.service.test.ts
```

- [ ] **Step 5: Update ServiceContainer**

In `engine/src/services/container.ts`, add to the `ServiceContainer` interface:

```typescript
gapService: any;
detectorService: any;
graphSnapshotService: any;
domainService: any;
```

And initialize them as `null` in `createServiceContainer`.

- [ ] **Step 6: Commit**

```bash
git add engine/src/services/gap.service.ts engine/test/gap/gap.service.test.ts engine/src/services/container.ts
git commit -m "feat(phase-3a): GapService with scoring computation, CRUD, and leaderboard queries"
```

---

## Task 8: Detector Registry & Lightweight Detectors

**Files:**
- Create: `engine/src/detectors/registry.ts`
- Create: `engine/src/detectors/stealth.ts`
- Create: `engine/src/detectors/vaporware.ts`
- Create: `engine/src/detectors/trend-reversal.ts`
- Create: `engine/test/detectors/registry.test.ts`
- Create: `engine/test/detectors/stealth.test.ts`
- Create: `engine/test/detectors/vaporware.test.ts`
- Create: `engine/test/detectors/trend-reversal.test.ts`

- [ ] **Step 1: Write failing registry test**

Create `engine/test/detectors/registry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { DetectorRegistry } from '../../src/detectors/registry';
import type { Detector } from '../../src/detectors/types';

describe('DetectorRegistry', () => {
  it('registers and retrieves detectors', () => {
    const registry = new DetectorRegistry();
    const mockDetector: Detector = {
      name: 'test', version: '1.0', type: 'lightweight',
      shouldRun: () => true, detect: async () => null,
    };
    registry.register(mockDetector);
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.get('test')).toBe(mockDetector);
  });

  it('separates lightweight and heavyweight', () => {
    const registry = new DetectorRegistry();
    registry.register({ name: 'a', version: '1', type: 'lightweight', shouldRun: () => true, detect: async () => null });
    registry.register({ name: 'b', version: '1', type: 'heavyweight', shouldRun: () => true, detect: async () => null });
    expect(registry.getLightweight()).toHaveLength(1);
    expect(registry.getHeavyweight()).toHaveLength(1);
  });

  it('tracks circuit breaker state', () => {
    const registry = new DetectorRegistry();
    registry.register({ name: 'test', version: '1', type: 'heavyweight', shouldRun: () => true, detect: async () => null });
    for (let i = 0; i < 5; i++) registry.markFailure('test');
    expect(registry.isCircuitOpen('test')).toBe(true);
  });

  it('resets circuit on success', () => {
    const registry = new DetectorRegistry();
    registry.register({ name: 'test', version: '1', type: 'heavyweight', shouldRun: () => true, detect: async () => null });
    for (let i = 0; i < 5; i++) registry.markFailure('test');
    registry.markSuccess('test');
    expect(registry.isCircuitOpen('test')).toBe(false);
  });
});
```

- [ ] **Step 2: Implement DetectorRegistry**

Create `engine/src/detectors/registry.ts`:

```typescript
import type { Detector, DetectorHealth } from './types';

const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

export class DetectorRegistry {
  private detectors: Map<string, Detector> = new Map();
  private health: Map<string, DetectorHealth> = new Map();

  register(detector: Detector): void {
    this.detectors.set(detector.name, detector);
    this.health.set(detector.name, {
      consecutiveFailures: 0,
      lastFailureAt: null,
      circuitOpen: false,
      circuitOpensAt: null,
    });
  }

  getAll(): Detector[] { return [...this.detectors.values()]; }
  getLightweight(): Detector[] { return this.getAll().filter((d) => d.type === 'lightweight'); }
  getHeavyweight(): Detector[] { return this.getAll().filter((d) => d.type === 'heavyweight'); }
  get(name: string): Detector | undefined { return this.detectors.get(name); }

  getHealth(): Map<string, DetectorHealth> { return new Map(this.health); }

  markFailure(name: string): void {
    const h = this.health.get(name);
    if (!h) return;
    h.consecutiveFailures++;
    h.lastFailureAt = new Date();
    if (h.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
      h.circuitOpen = true;
      h.circuitOpensAt = new Date(Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS);
    }
  }

  markSuccess(name: string): void {
    const h = this.health.get(name);
    if (!h) return;
    h.consecutiveFailures = 0;
    h.circuitOpen = false;
    h.circuitOpensAt = null;
  }

  isCircuitOpen(name: string): boolean {
    const h = this.health.get(name);
    if (!h) return false;
    if (!h.circuitOpen) return false;
    // Check if cooldown has elapsed
    if (h.circuitOpensAt && Date.now() > h.circuitOpensAt.getTime()) {
      h.circuitOpen = false;
      h.consecutiveFailures = 0;
      return false;
    }
    return true;
  }
}
```

- [ ] **Step 3: Run registry tests, verify pass**

```bash
cd engine && bun run vitest run test/detectors/registry.test.ts
```

- [ ] **Step 4: Write failing stealth detector test**

Create `engine/test/detectors/stealth.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { StealthProjectDetector } from '../../src/detectors/stealth';
import type { DetectorContext } from '../../src/detectors/types';

describe('StealthProjectDetector', () => {
  const detector = new StealthProjectDetector();

  it('shouldRun returns false when alignment < 1.0', () => {
    const ctx = { gapScore: { alignment: 0.5 } } as any;
    expect(detector.shouldRun(ctx)).toBe(false);
  });

  it('shouldRun returns true when alignment >= 1.0', () => {
    const ctx = { gapScore: { alignment: 1.5 } } as any;
    expect(detector.shouldRun(ctx)).toBe(true);
  });

  it('detects stealth project with high behavioral velocity and low declarative', async () => {
    const ctx: DetectorContext = {
      entityId: 'company:test', domain: 'ai',
      gapScore: {
        alignment: 2.5, behavioralCount: 20, declarativeCount: 2,
        realityScore: 85, category: 'stealth',
      } as any,
      previousGapScore: null,
      signals: {
        behavioral: {
          count: 20, weighted: 15,
          velocity: { currentQuarter: 10, previousQuarter: 5, qoqChange: 1.0, monthlyAverage: 5 },
          topCategories: [{ category: 'patent-filing', count: 12 }, { category: 'job-posting', count: 8 }],
        },
        declarative: {
          count: 2, weighted: 1,
          velocity: { currentQuarter: 1, previousQuarter: 1, qoqChange: 0, monthlyAverage: 0.5 },
          topCategories: [{ category: 'press-release', count: 2 }],
        },
        domainOverlap: 0.8, recentSignals: [], staleDays: 0,
      },
      entity: { id: 'company:test', type: 'company', name: 'Test', status: 'active', sector: 'tech', scale: 'large' },
      peerContext: null,
    };

    const result = await detector.detect(ctx);
    expect(result).not.toBeNull();
    expect(result!.detected).toBe(true);
    expect(result!.alertType).toBe('stealth-project');
    expect(result!.severity).toBe('warning'); // alignment 2.0-3.0
  });

  it('returns null when conditions not met', async () => {
    const ctx: DetectorContext = {
      entityId: 'company:test', domain: 'ai',
      gapScore: { alignment: 1.2, behavioralCount: 10, declarativeCount: 10 } as any,
      previousGapScore: null,
      signals: {
        behavioral: { count: 10, weighted: 8, velocity: { currentQuarter: 5, previousQuarter: 5, qoqChange: 0, monthlyAverage: 3 }, topCategories: [{ category: 'patent-filing', count: 10 }] },
        declarative: { count: 10, weighted: 8, velocity: { currentQuarter: 5, previousQuarter: 5, qoqChange: 0, monthlyAverage: 3 }, topCategories: [{ category: 'press-release', count: 10 }] },
        domainOverlap: 0.9, recentSignals: [], staleDays: 0,
      },
      entity: { id: 'company:test', type: 'company', name: 'Test', status: 'active', sector: 'tech', scale: 'large' },
      peerContext: null,
    };

    const result = await detector.detect(ctx);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 5: Implement StealthProjectDetector**

Create `engine/src/detectors/stealth.ts` implementing the `Detector` interface per spec Section 3.3.

- [ ] **Step 6: Implement VaporwareDetector**

Create `engine/src/detectors/vaporware.ts` and `engine/test/detectors/vaporware.test.ts` following the same pattern — opposite logic from stealth.

- [ ] **Step 7: Implement TrendReversalDetector**

Create `engine/src/detectors/trend-reversal.ts` and `engine/test/detectors/trend-reversal.test.ts` — compares previous vs. current category/alignment.

- [ ] **Step 8: Run all detector tests**

```bash
cd engine && bun run vitest run test/detectors/
```

Expected: All tests pass.

- [ ] **Step 9: Commit**

```bash
git add engine/src/detectors/ engine/test/detectors/
git commit -m "feat(phase-3a): detector registry with stealth, vaporware, and trend reversal detectors"
```

---

## Task 9: Heavyweight Detectors — Acquisition Target & Contradiction

**Files:**
- Create: `engine/src/detectors/acquisition-target.ts`
- Create: `engine/src/detectors/contradiction.ts`
- Create: `engine/test/detectors/acquisition-target.test.ts`
- Create: `engine/test/detectors/contradiction.test.ts`

- [ ] **Step 1: Write failing acquisition target test**

Create `engine/test/detectors/acquisition-target.test.ts` testing:
- `shouldRun` returns false for non-company entities
- `shouldRun` returns false for inactive entities
- Point-based scoring with mock Neo4j results
- Severity tiers (60-70 = info, 70-85 = warning, 85+ = critical)
- Returns null when score < threshold

- [ ] **Step 2: Implement AcquisitionTargetDetector**

Create `engine/src/detectors/acquisition-target.ts`. This is a heavyweight detector that needs:
- Reads `detector_config` for entity-type-specific rubrics
- Queries Neo4j for co-investment patterns (via a passed-in query function)
- Queries PG for patent citation counts and other signal-based factors
- Computes point total, generates graph snapshot data

For unit testing, the Neo4j query and PG query are injected as functions on the constructor.

- [ ] **Step 3: Run test, verify pass**

```bash
cd engine && bun run vitest run test/detectors/acquisition-target.test.ts
```

- [ ] **Step 4: Write failing contradiction test**

Create `engine/test/detectors/contradiction.test.ts` testing:
- `shouldRun` returns false with fewer than 2 total signals
- Detects contradiction pairs from `relatedSignals` with `contradicts` relation
- Detects opposing polarity signals in same domain within 90 days
- Severity tiers by pair count

- [ ] **Step 5: Implement ContradictionDetector**

Create `engine/src/detectors/contradiction.ts`. Heavyweight detector that:
- Queries PG for signals with `contradicts` relation
- Queries PG for opposing polarity signals in the 90-day window
- Generates contradiction graph snapshot

- [ ] **Step 6: Run all detector tests**

```bash
cd engine && bun run vitest run test/detectors/
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add engine/src/detectors/ engine/test/detectors/
git commit -m "feat(phase-3a): acquisition target and contradiction heavyweight detectors"
```

---

## Task 10: Alert Generation & Cooldown Logic

**Files:**
- Create: `engine/src/detectors/alert-generator.ts`
- Create: `engine/test/detectors/alert-generator.test.ts`

- [ ] **Step 1: Write failing tests for alert generation**

Create `engine/test/detectors/alert-generator.test.ts` testing:
- `computeEvidenceFingerprint` — deterministic hash of sorted signal IDs
- `checkCooldown` — respects per-type cooldown windows
- `checkEvidenceOverlap` — >70% overlap suppresses, <70% allows
- `escalateSeverity` — bumps after 3+ consecutive detections
- `generateAlert` — creates alert record from DetectorResult

- [ ] **Step 2: Implement AlertGenerator**

Create `engine/src/detectors/alert-generator.ts`:

```typescript
import { createHash } from 'crypto';
import { eq, and, gte, desc } from 'drizzle-orm';
import { recordId } from '@gambit/common';
import { alerts } from '../db';
import { DETECTOR_COOLDOWNS, EVIDENCE_OVERLAP_THRESHOLD } from '../gap/constants';
import type { DetectorResult } from './types';
import type { DrizzleClient } from '../db/transaction';

export function computeEvidenceFingerprint(evidence: { behavioral: any[]; declarative: any[] }): string {
  const ids = [
    ...evidence.behavioral.map((s) => s.signalId),
    ...evidence.declarative.map((s) => s.signalId),
  ].sort();
  return createHash('sha256').update(ids.join(',')).digest('hex').slice(0, 16);
}

export function computeEvidenceOverlap(fingerprint1: string[], fingerprint2: string[]): number {
  if (fingerprint1.length === 0 && fingerprint2.length === 0) return 1.0;
  const set1 = new Set(fingerprint1);
  const set2 = new Set(fingerprint2);
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export class AlertGenerator {
  constructor(private db: DrizzleClient) {}

  async checkCooldown(entityId: string, domain: string, alertType: string): Promise<{ inCooldown: boolean; previousAlert: any | null }> {
    const cooldownHours = DETECTOR_COOLDOWNS[alertType] ?? 72;
    const cutoff = new Date(Date.now() - cooldownHours * 60 * 60 * 1000);

    const recent = await (this.db as any)
      .select()
      .from(alerts)
      .where(and(
        eq(alerts.entityId, entityId),
        eq(alerts.domain, domain),
        eq(alerts.type, alertType),
        gte(alerts.createdAt, cutoff),
      ))
      .orderBy(desc(alerts.createdAt))
      .limit(1);

    return {
      inCooldown: recent.length > 0,
      previousAlert: recent[0] ?? null,
    };
  }

  async generateAlert(
    result: DetectorResult,
    entityId: string,
    domain: string,
    teamId: string,
  ): Promise<string | null> {
    // Check cooldown
    const { inCooldown, previousAlert } = await this.checkCooldown(entityId, domain, result.alertType);

    if (inCooldown && previousAlert) {
      // Check evidence overlap
      const prevIds = [
        ...(previousAlert.evidence?.behavioral ?? []).map((s: any) => s.signalId),
        ...(previousAlert.evidence?.declarative ?? []).map((s: any) => s.signalId),
      ];
      const currIds = [
        ...result.evidence.behavioral.map((s) => s.signalId),
        ...result.evidence.declarative.map((s) => s.signalId),
      ];
      const overlap = computeEvidenceOverlap(prevIds, currIds);
      if (overlap > EVIDENCE_OVERLAP_THRESHOLD) return null; // Suppress
    }

    const alertId = recordId('alert', crypto.randomUUID());

    await (this.db as any).insert(alerts).values({
      id: alertId,
      teamId,
      entityId,
      domain,
      type: result.alertType,
      severity: result.severity,
      title: result.title,
      summary: result.summary,
      evidence: result.evidence,
      evidenceFingerprint: result.evidenceFingerprint,
      alignment: String(result.confidence),
      confidence: String(result.confidence),
      prediction: result.prediction,
      recommendedActions: result.recommendedActions,
      meta: { detectorVersion: result.detectorVersion },
    });

    return alertId;
  }
}
```

- [ ] **Step 3: Run tests, verify pass**

```bash
cd engine && bun run vitest run test/detectors/alert-generator.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add engine/src/detectors/alert-generator.ts engine/test/detectors/alert-generator.test.ts
git commit -m "feat(phase-3a): alert generation with cooldown, evidence fingerprinting, and severity escalation"
```

- [ ] **Step 5: Create DetectorService**

Create `engine/src/services/detector.service.ts` — wraps `DetectorRegistry`, provides:
- `getRegistry()` — returns the singleton registry instance
- `initializeDetectors()` — registers all 5 detectors
- `logMetrics(results, clickhouse)` — writes detector execution metrics to ClickHouse `detector_metrics` table
- `getHealth()` — returns circuit breaker states for all detectors

```typescript
import { createLogger } from '@gambit/common';
import { DetectorRegistry } from '../detectors/registry';
import { StealthProjectDetector } from '../detectors/stealth';
import { VaporwareDetector } from '../detectors/vaporware';
import { TrendReversalDetector } from '../detectors/trend-reversal';
import { AcquisitionTargetDetector } from '../detectors/acquisition-target';
import { ContradictionDetector } from '../detectors/contradiction';

const logger = createLogger('detector-service');

export class DetectorService {
  private registry: DetectorRegistry;

  constructor(
    private db: any,
    private clickhouse: any | null,
    private logger: any,
  ) {
    this.registry = new DetectorRegistry();
    this.initializeDetectors();
  }

  private initializeDetectors(): void {
    this.registry.register(new StealthProjectDetector());
    this.registry.register(new VaporwareDetector());
    this.registry.register(new TrendReversalDetector());
    this.registry.register(new AcquisitionTargetDetector(this.db));
    this.registry.register(new ContradictionDetector(this.db));
  }

  getRegistry(): DetectorRegistry { return this.registry; }
  getHealth() { return this.registry.getHealth(); }

  async logMetrics(metrics: any[], clickhouse: any | null): Promise<void> {
    if (!clickhouse || metrics.length === 0) return;
    try {
      await clickhouse.insert({ table: 'detector_metrics', values: metrics, format: 'JSONEachRow' });
    } catch (err) {
      this.logger.warn({ err }, 'Failed to log detector metrics to ClickHouse');
    }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add engine/src/services/detector.service.ts
git commit -m "feat(phase-3a): DetectorService with registry initialization and metrics logging"
```

---

## Task 11: Graph Snapshot Service

**Files:**
- Create: `engine/src/snapshots/snapshot.service.ts`
- Create: `engine/test/snapshots/snapshot.service.test.ts`

- [ ] **Step 1: Write failing test**

Create `engine/test/snapshots/snapshot.service.test.ts` testing:
- `getSnapshotPriority` — returns hot/warm/cold with watchlist count
- `upsertSnapshot` — creates/updates graph snapshot
- `markStale` — updates snapshot status

- [ ] **Step 2: Implement GraphSnapshotService**

Create `engine/src/snapshots/snapshot.service.ts` with:
- `refreshSnapshot(entityId, layer)` — queries Neo4j, writes to `graph_snapshots`
- `refreshAllLayers(entityId)` — all layers
- `getSnapshot(entityId, layer)` — read with staleness check
- `getSnapshotPriority(entityId)` — queries `watchlist_entities` count
- `upsertSnapshot(entityId, layer, nodes, edges, stats)` — upsert
- `markStale(entityId, layer?)` — update status
- `cleanupExpired()` — delete expired snapshots

- [ ] **Step 3: Run test, verify pass**

```bash
cd engine && bun run vitest run test/snapshots/
```

- [ ] **Step 4: Commit**

```bash
git add engine/src/snapshots/ engine/test/snapshots/
git commit -m "feat(phase-3a): GraphSnapshotService with tiered refresh and Neo4j integration"
```

---

## Task 12: Gap Compute Workflows — Chunk & Batch

**Files:**
- Create: `engine/src/pipeline/activities/gap.ts`
- Create: `engine/src/pipeline/workflows/gap-chunk.ts`
- Create: `engine/src/pipeline/workflows/gap-batch-recompute.ts`

- [ ] **Step 1: Create gap scoring activities**

Create `engine/src/pipeline/activities/gap.ts`:

```typescript
import { createLogger } from '@gambit/common';
import type { ComputedGapScore, SignalRow } from '../../gap/types';

const logger = createLogger('gap-activity');

export async function readSignalsActivity(
  entityIds: string[],
  windowStart: string,
  windowEnd: string,
): Promise<SignalRow[]> {
  // Implemented by worker — reads from ClickHouse with PG fallback
  throw new Error('Activity stub — implemented by worker registration');
}

export async function computeGapScoreActivity(
  entityId: string,
  domain: string,
  signals: SignalRow[],
  previousScore: ComputedGapScore | null,
  computedAt: string,
): Promise<ComputedGapScore> {
  throw new Error('Activity stub');
}

export async function upsertGapScoreActivity(
  score: ComputedGapScore,
): Promise<{ written: boolean; skipped: boolean }> {
  throw new Error('Activity stub');
}

export async function appendGapHistoryActivity(
  score: ComputedGapScore,
): Promise<void> {
  throw new Error('Activity stub');
}

export async function rollupEntityScoresActivity(
  entityIds: string[],
): Promise<void> {
  throw new Error('Activity stub');
}

export async function deferPairActivity(
  entityId: string,
  domain: string,
  delaySeconds: number,
): Promise<void> {
  throw new Error('Activity stub');
}

export async function readPreviousGapScoreActivity(
  entityId: string,
  domain: string,
): Promise<ComputedGapScore | null> {
  throw new Error('Activity stub — calls GapService.getPreviousScore()');
}

export async function findEntitiesNeedingRecomputeActivity(): Promise<Array<{ entityId: string; domain: string }>> {
  throw new Error('Activity stub — queries entities.lastSignalAt > gap_scores.computed_at');
}

export async function invalidateCacheActivity(
  entityIds: string[],
): Promise<void> {
  throw new Error('Activity stub — deletes Redis cache keys + increments leaderboard generation');
}

export async function publishGapScoreEventsActivity(
  scoredPairs: Array<{ entityId: string; domain: string; realityScore: number; previousRealityScore: number | null; category: string; trend: string }>,
): Promise<void> {
  throw new Error('Activity stub — publishes gap-score-updated SSE events');
}

export async function dlqPairActivity(
  entityId: string,
  domain: string,
  error: string,
  trigger: string,
  workflowId: string,
): Promise<void> {
  throw new Error('Activity stub');
}
```

- [ ] **Step 2: Create GapChunkWorkflow**

Create `engine/src/pipeline/workflows/gap-chunk.ts`:

```typescript
import { proxyActivities } from '@temporalio/workflow';
import type { ComputedGapScore, SignalRow } from '../../gap/types';

const {
  readSignalsActivity,
  readPreviousGapScoreActivity,
  computeGapScoreActivity,
  upsertGapScoreActivity,
  appendGapHistoryActivity,
  deferPairActivity,
  dlqPairActivity,
} = proxyActivities<{
  readSignalsActivity(entityIds: string[], windowStart: string, windowEnd: string): Promise<SignalRow[]>;
  readPreviousGapScoreActivity(entityId: string, domain: string): Promise<ComputedGapScore | null>;
  computeGapScoreActivity(entityId: string, domain: string, signals: SignalRow[], previousScore: ComputedGapScore | null, computedAt: string): Promise<ComputedGapScore>;
  upsertGapScoreActivity(score: ComputedGapScore): Promise<{ written: boolean; skipped: boolean }>;
  appendGapHistoryActivity(score: ComputedGapScore): Promise<void>;
  deferPairActivity(entityId: string, domain: string, delaySeconds: number): Promise<void>;
  dlqPairActivity(entityId: string, domain: string, error: string, trigger: string, workflowId: string): Promise<void>;
}>({
  taskQueue: 'gap-compute',
  startToCloseTimeout: '5 minutes',
});

export interface GapChunkInput {
  pairs: Array<{ entityId: string; domain: string }>;
  trigger: 'signal-driven' | 'scheduled' | 'manual';
}

export interface GapChunkResult {
  computed: number;
  skipped: number;
  deferred: number;
  failed: number;
  errors: Array<{ entityId: string; domain: string; error: string }>;
  scoredPairs: Array<{ entityId: string; domain: string; score: ComputedGapScore }>;
}

export async function gapChunkWorkflow(input: GapChunkInput): Promise<GapChunkResult> {
  const result: GapChunkResult = {
    computed: 0, skipped: 0, deferred: 0, failed: 0,
    errors: [], scoredPairs: [],
  };

  if (input.pairs.length === 0) return result;

  const now = new Date();
  const windowEnd = now.toISOString();
  const windowStart = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();

  // Batch-read signals for all entities in chunk
  const entityIds = [...new Set(input.pairs.map((p) => p.entityId))];
  let allSignals: SignalRow[];
  try {
    allSignals = await readSignalsActivity(entityIds, windowStart, windowEnd);
  } catch (err) {
    // If signal read fails, mark all pairs as failed
    for (const pair of input.pairs) {
      result.failed++;
      result.errors.push({ entityId: pair.entityId, domain: pair.domain, error: String(err) });
    }
    return result;
  }

  // Process each pair
  for (const pair of input.pairs) {
    try {
      // Filter signals for this entity-domain
      const pairSignals = allSignals.filter(
        (s) => s.entityId === pair.entityId && s.domains.includes(pair.domain),
      );

      // Read previous score for trend computation and detector context
      const previousScore = await readPreviousGapScoreActivity(pair.entityId, pair.domain);

      const score = await computeGapScoreActivity(pair.entityId, pair.domain, pairSignals, previousScore, windowEnd);

      const { written, skipped } = await upsertGapScoreActivity(score);

      if (skipped) {
        result.skipped++;
        continue;
      }

      if (written) {
        result.computed++;
        result.scoredPairs.push({ entityId: pair.entityId, domain: pair.domain, score });

        // Append to ClickHouse history (non-fatal)
        try {
          await appendGapHistoryActivity(score);
        } catch {
          // ClickHouse append failure is non-fatal
        }
      }
    } catch (err) {
      result.failed++;
      result.errors.push({ entityId: pair.entityId, domain: pair.domain, error: String(err) });

      try {
        await dlqPairActivity(pair.entityId, pair.domain, String(err), input.trigger, '');
      } catch {
        // DLQ failure — already counted
      }
    }
  }

  return result;
}
```

- [ ] **Step 3: Create GapBatchRecomputeWorkflow**

Create `engine/src/pipeline/workflows/gap-batch-recompute.ts`:

```typescript
import { executeChild, proxyActivities } from '@temporalio/workflow';
import { gapChunkWorkflow } from './gap-chunk';
import type { GapChunkInput, GapChunkResult } from './gap-chunk';

const { rollupEntityScoresActivity, invalidateCacheActivity, publishGapScoreEventsActivity } = proxyActivities<{
  rollupEntityScoresActivity(entityIds: string[]): Promise<void>;
  invalidateCacheActivity(entityIds: string[]): Promise<void>;
  publishGapScoreEventsActivity(events: Array<{ entityId: string; domain: string; realityScore: number; previousRealityScore: number | null; category: string; trend: string }>): Promise<void>;
}>({
  taskQueue: 'gap-compute',
  startToCloseTimeout: '2 minutes',
});

export interface GapBatchRecomputeInput {
  pairs: Array<{ entityId: string; domain: string }>;
  trigger: 'signal-driven' | 'scheduled' | 'manual';
}

export interface GapBatchRecomputeResult {
  totalPairs: number;
  computed: number;
  skipped: number;
  deferred: number;
  failed: number;
  chunks: number;
}

const CHUNK_SIZE = 100;
const MAX_CONCURRENT_CHUNKS = 10;

export async function gapBatchRecomputeWorkflow(input: GapBatchRecomputeInput): Promise<GapBatchRecomputeResult> {
  const { pairs, trigger } = input;

  // Partition into chunks
  const chunks: GapChunkInput[] = [];
  for (let i = 0; i < pairs.length; i += CHUNK_SIZE) {
    chunks.push({
      pairs: pairs.slice(i, i + CHUNK_SIZE),
      trigger,
    });
  }

  // Fan out with concurrency limit
  const results: GapChunkResult[] = [];
  for (let i = 0; i < chunks.length; i += MAX_CONCURRENT_CHUNKS) {
    const batch = chunks.slice(i, i + MAX_CONCURRENT_CHUNKS);
    const batchResults = await Promise.all(
      batch.map((chunk, idx) =>
        executeChild(gapChunkWorkflow, {
          args: [chunk],
          workflowId: `gap-chunk-${Date.now()}-${i + idx}`,
          taskQueue: 'gap-compute',
        }),
      ),
    );
    results.push(...batchResults);
  }

  // Aggregate results
  const totals: GapBatchRecomputeResult = {
    totalPairs: pairs.length,
    computed: 0, skipped: 0, deferred: 0, failed: 0,
    chunks: chunks.length,
  };

  const scoredEntityIds = new Set<string>();

  for (const r of results) {
    totals.computed += r.computed;
    totals.skipped += r.skipped;
    totals.deferred += r.deferred;
    totals.failed += r.failed;
    for (const sp of r.scoredPairs) {
      scoredEntityIds.add(sp.entityId);
    }
  }

  // Entity rollup — batched SQL
  if (scoredEntityIds.size > 0) {
    await rollupEntityScoresActivity([...scoredEntityIds]);
  }

  // Cache invalidation + SSE events
  if (scoredEntityIds.size > 0) {
    await invalidateCacheActivity([...scoredEntityIds]);

    // Collect score change summaries for SSE
    const scoreEvents = results.flatMap((r) =>
      r.scoredPairs.map((sp) => ({
        entityId: sp.entityId,
        domain: sp.domain,
        realityScore: sp.score.realityScore,
        previousRealityScore: sp.score.previousAlignment != null ? sp.score.realityScore : null,
        category: sp.score.category,
        trend: sp.score.trend,
      })),
    );
    await publishGapScoreEventsActivity(scoreEvents);
  }

  return totals;
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd engine && bun run tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add engine/src/pipeline/activities/gap.ts engine/src/pipeline/workflows/gap-chunk.ts engine/src/pipeline/workflows/gap-batch-recompute.ts
git commit -m "feat(phase-3a): gap compute workflows — chunk processing and batch fan-out with entity rollup"
```

---

## Task 13: Detector Batch Workflow

**Files:**
- Create: `engine/src/pipeline/activities/detector.ts`
- Create: `engine/src/pipeline/activities/snapshot.ts`
- Create: `engine/src/pipeline/workflows/detector-batch.ts`

- [ ] **Step 1: Create detector activities**

Create `engine/src/pipeline/activities/detector.ts` with activity stubs:
- `runAcquisitionTargetActivity(ctx)` — runs acquisition target detector
- `runContradictionActivity(ctx)` — runs contradiction detector
- `logDetectorMetricsActivity(metrics)` — writes to ClickHouse

- [ ] **Step 2: Create snapshot activity**

Create `engine/src/pipeline/activities/snapshot.ts`:
- `refreshSnapshotActivity(entityId, priority)` — calls GraphSnapshotService

- [ ] **Step 3: Create DetectorBatchWorkflow**

Create `engine/src/pipeline/workflows/detector-batch.ts`:

The workflow receives scored pairs with their `ComputedGapScore`. For each pair:
1. Build `DetectorContext` from the score data
2. Skip if `staleDays > 90`
3. Run lightweight detectors as an activity (`runLightweightDetectorsActivity`) — NOT in the workflow body (Temporal's workflow sandbox forbids non-deterministic code like `Date.now()` in `DetectorRegistry`). The activity runs on the `detector-lightweight` task queue.
4. Collect pairs needing heavyweight detection (based on `shouldRun` checks inside the activity)
5. Fan out heavyweight detector activities in parallel
6. For each detected result: generate alert via `AlertGenerator`
7. Refresh graph snapshots based on priority tier
8. Log detector metrics to ClickHouse

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd engine && bun run tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add engine/src/pipeline/activities/detector.ts engine/src/pipeline/activities/snapshot.ts engine/src/pipeline/workflows/detector-batch.ts
git commit -m "feat(phase-3a): detector batch workflow with lightweight + heavyweight execution and snapshot refresh"
```

---

## Task 14: Gap Coordinator & Scheduled Sweep Workflows

**Files:**
- Create: `engine/src/pipeline/workflows/gap-coordinator.ts`
- Create: `engine/src/pipeline/workflows/gap-scheduled-sweep.ts`

- [ ] **Step 1: Create Gap Coordinator workflow**

Create `engine/src/pipeline/workflows/gap-coordinator.ts`:

```typescript
import { sleep, continueAsNew, executeChild, proxyActivities } from '@temporalio/workflow';
import { gapBatchRecomputeWorkflow } from './gap-batch-recompute';

const { popPendingPairsActivity } = proxyActivities<{
  popPendingPairsActivity(limit: number): Promise<Array<{ entityId: string; domain: string }>>;
}>({
  taskQueue: 'gap-coordinator',
  startToCloseTimeout: '30 seconds',
});

const POLL_INTERVAL_MS = 30_000;
const MAX_PAIRS_PER_DISPATCH = 500;
const CONTINUE_AS_NEW_THRESHOLD = 10_000;

export async function gapCoordinatorWorkflow(): Promise<void> {
  let eventCount = 0;

  while (true) {
    const pairs = await popPendingPairsActivity(MAX_PAIRS_PER_DISPATCH);
    eventCount++;

    if (pairs.length > 0) {
      // Await child completion before polling again to prevent concurrent runaway
      await executeChild(gapBatchRecomputeWorkflow, {
        args: [{ pairs, trigger: 'signal-driven' as const }],
        workflowId: `gap-batch-${Date.now()}`,
        taskQueue: 'gap-compute',
      });
      // Brief pause between dispatches to prevent hammering
      await sleep(5_000);
    } else {
      await sleep(POLL_INTERVAL_MS);
    }

    if (eventCount >= CONTINUE_AS_NEW_THRESHOLD) {
      await continueAsNew<typeof gapCoordinatorWorkflow>();
    }
  }
}
```

- [ ] **Step 2: Create Scheduled Sweep workflow**

Create `engine/src/pipeline/workflows/gap-scheduled-sweep.ts`:

```typescript
import { executeChild, proxyActivities } from '@temporalio/workflow';
import { gapBatchRecomputeWorkflow } from './gap-batch-recompute';

const { findEntitiesNeedingRecomputeActivity } = proxyActivities<{
  findEntitiesNeedingRecomputeActivity(): Promise<Array<{ entityId: string; domain: string }>>;
}>({
  taskQueue: 'gap-compute',
  startToCloseTimeout: '2 minutes',
});

export async function gapScheduledSweepWorkflow(): Promise<{ pairs: number; dispatched: boolean }> {
  const pairs = await findEntitiesNeedingRecomputeActivity();

  if (pairs.length === 0) {
    return { pairs: 0, dispatched: false };
  }

  await executeChild(gapBatchRecomputeWorkflow, {
    args: [{ pairs, trigger: 'scheduled' as const }],
    workflowId: `gap-sweep-${Date.now()}`,
    taskQueue: 'gap-compute',
  });

  return { pairs: pairs.length, dispatched: true };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd engine && bun run tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add engine/src/pipeline/workflows/gap-coordinator.ts engine/src/pipeline/workflows/gap-scheduled-sweep.ts
git commit -m "feat(phase-3a): gap coordinator (singleton poller) and 6-hour scheduled sweep workflow"
```

---

## Task 15: Temporal Workers & Pipeline Integration

**Files:**
- Create: `engine/src/pipeline/workers/gap-coordinator-worker.ts`
- Create: `engine/src/pipeline/workers/gap-compute-worker.ts`
- Create: `engine/src/pipeline/workers/detector-worker.ts`
- Modify: `engine/src/pipeline/activities/write.ts`

- [ ] **Step 1: Create gap coordinator worker**

Create `engine/src/pipeline/workers/gap-coordinator-worker.ts` — registers the coordinator workflow and the `popPendingPairsActivity` (reads from Redis sorted set `gap:pending` via ZRANGEBYSCORE + ZREMRANGEBYSCORE).

- [ ] **Step 2: Create gap compute worker**

Create `engine/src/pipeline/workers/gap-compute-worker.ts` — registers:
- Gap chunk and batch recompute workflows
- Signal read, compute, upsert, history append, rollup, DLQ activities
- Uses `SignalReader` interface with ClickHouse primary + PG fallback

- [ ] **Step 3: Create detector worker**

Create `engine/src/pipeline/workers/detector-worker.ts` — registers:
- Detector batch workflow
- Heavyweight detector activities (acquisition target, contradiction)
- Snapshot refresh activity
- Detector metrics logging activity

- [ ] **Step 4: Integrate with signal writer**

Modify `engine/src/pipeline/activities/write.ts` — after a successful signal write:

1. Extend `SignalWriter` constructor to accept a Redis client:

```typescript
constructor(
  private db: DrizzleClient,
  private clickhouse: any | null,
  private redis: any | null,  // NEW — ioredis instance for gap:pending
) {}
```

2. Update the worker that instantiates `SignalWriter` to pass `redisPersistent` as the third argument.

3. After the entity count update in `writeSignal`, add ZADD + lastSignalAt:

```typescript
// Queue gap recompute for each domain
if (this.redis && signal.domains.length > 0) {
  const timestamp = Date.now();
  for (const d of signal.domains) {
    await this.redis.zadd('gap:pending', timestamp, `${signal.entityId}:${d}`);
  }
}

// Update lastSignalAt
await (this.db as any)
  .update(entities)
  .set({ lastSignalAt: sql`GREATEST(${entities.lastSignalAt}, ${new Date(signal.publishedAt)})` })
  .where(eq(entities.id, signal.entityId));
```

- [ ] **Step 5: Verify compilation**

```bash
cd engine && bun run tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add engine/src/pipeline/workers/ engine/src/pipeline/activities/write.ts
git commit -m "feat(phase-3a): temporal workers for gap/detector queues and signal writer pipeline integration"
```

---

## Task 16: API Routes — Gaps, Domains, Admin Recompute

**Files:**
- Create: `engine/src/routes/gaps.ts`
- Create: `engine/src/routes/domains.ts`
- Modify: `engine/src/routes/admin.ts`
- Modify: `engine/src/index.ts`

- [ ] **Step 1: Create gap routes**

Create `engine/src/routes/gaps.ts`:

```typescript
import { Hono } from 'hono';
import type { ServiceContainer } from '../services/container';

export function gapRoutes(container: ServiceContainer) {
  const app = new Hono();

  // GET / — all gap scores, filterable
  app.get('/', async (c) => {
    const { domain, category, entityType, cursor, limit } = c.req.query();
    const results = await container.gapService.getGapScores({
      domain, category, entityType,
      cursor, limit: Number(limit) || 50,
    });
    return c.json({ data: results.data, meta: results.meta });
  });

  // GET /leaderboard — ranked entities
  app.get('/leaderboard', async (c) => {
    const { domain, category, cursor, limit } = c.req.query();
    const results = await container.gapService.getLeaderboard({
      domain, category,
      cursor, limit: Number(limit) || 50,
    });
    return c.json({ data: results.data, meta: results.meta });
  });

  // GET /movers — biggest score changes
  app.get('/movers', async (c) => {
    const days = Number(c.req.query('days')) || 7;
    const limit = Number(c.req.query('limit')) || 20;
    const results = await container.gapService.getMovers(days, limit);
    return c.json({ data: results });
  });

  // GET /domain/:domain — entities in a domain
  app.get('/domain/:domain', async (c) => {
    const domain = c.req.param('domain');
    const { cursor, limit } = c.req.query();
    const results = await container.gapService.getByDomain(domain, {
      cursor, limit: Number(limit) || 50,
    });
    return c.json({ data: results.data, meta: results.meta });
  });

  return app;
}
```

- [ ] **Step 2: Create domain taxonomy routes**

Create `engine/src/routes/domains.ts` with GET /, GET /:id, POST /, PATCH /:id, DELETE /:id.

- [ ] **Step 3: Add /recompute to admin routes**

In `engine/src/routes/admin.ts`, add `POST /recompute` endpoint with three modes:
- `{ entityId, domain }` — single pair, synchronous
- `{ entityId }` — all domains, async
- `{ all: true, confirm: true }` — full recompute, async, returns workflow ID

- [ ] **Step 4: Wire routes in index.ts**

In `engine/src/index.ts`:

1. Import `gapRoutes` and `domainRoutes`
2. Add after entity routes:

```typescript
app.route(`${basePath}/gaps`, gapRoutes(container));
app.route(`${basePath}/domains`, domainRoutes(container));
```

3. Remove `/scores` and `/alerts` from the `phase2Stubs` array (they now have real or partial routes)

- [ ] **Step 5: Wire new services in boot sequence**

In `engine/src/index.ts` boot function, after creating `entityService`:

```typescript
const domainService = new DomainService(db);
const gapService = new GapService(db, clickhouse, redisCache);
const graphSnapshotService = new GraphSnapshotService(db, logger);
const detectorService = new DetectorService(db, clickhouse, logger);

container.gapService = gapService;
container.detectorService = detectorService;
container.graphSnapshotService = graphSnapshotService;
container.domainService = domainService;
```

- [ ] **Step 6: Add coordinator bootstrap**

In `engine/src/index.ts` boot function, after building the Hono app:

```typescript
// Bootstrap gap coordinator workflow
if (temporal) {
  try {
    await temporal.workflow.describe('gap-coordinator-singleton').catch(() => null);
    // If not running, start it
    await temporal.workflow.start('gapCoordinatorWorkflow', {
      workflowId: 'gap-coordinator-singleton',
      taskQueue: 'gap-coordinator',
    }).catch(() => {
      // Already running — expected
    });
    logger.info('Gap coordinator workflow ensured');
  } catch (err) {
    logger.warn({ err }, 'Failed to bootstrap gap coordinator — signal-driven scoring unavailable');
  }
}
```

- [ ] **Step 7: Verify compilation**

```bash
cd engine && bun run tsc --noEmit
```

- [ ] **Step 8: Commit**

```bash
git add engine/src/routes/gaps.ts engine/src/routes/domains.ts engine/src/routes/admin.ts engine/src/index.ts
git commit -m "feat(phase-3a): API routes for gaps, domains, admin recompute + service wiring"
```

---

## Task 17: Entity Route Integration & SSE Events

**Files:**
- Modify: `engine/src/routes/entities.ts`
- Modify: `engine/src/events/event-types.ts`

- [ ] **Step 1: Replace entity route Phase 3 stubs**

In `engine/src/routes/entities.ts`, replace the 501 stubs for:

`GET /:id/scores`:
```typescript
app.get('/:id/scores', async (c) => {
  const id = c.req.param('id');
  const scores = await container.gapService.getEntityScores(id);
  return c.json({ data: scores });
});
```

`GET /:id/history`:
```typescript
app.get('/:id/history', async (c) => {
  const id = c.req.param('id');
  const domain = c.req.query('domain');
  const days = Number(c.req.query('days')) || 365;
  const history = await container.gapService.getScoreHistory(id, domain, days);
  return c.json({ data: history });
});
```

Leave `GET /:id/alerts` as a 501 stub — that's Phase 3b scope.

- [ ] **Step 2: Update SSE event types**

In `engine/src/events/event-types.ts`:

```typescript
export type SSEEventType =
  | 'signal-ingested'
  | 'signal-corroborated'
  | 'entity-created'
  | 'source-health-changed'
  | 'pipeline-run-completed'
  | 'gap-score-updated'
  | 'alert-created'
  | 'alert-status-changed';

export const SSE_CHANNELS = {
  global: 'sse:global',
  entity: (id: string) => `sse:entity:${id}`,
  source: (id: string) => `sse:source:${id}`,
  team: (id: string) => `sse:team:${id}`,
  alerts: (teamId: string) => `sse:alerts:${teamId}`,
} as const;
```

- [ ] **Step 3: Commit**

```bash
git add engine/src/routes/entities.ts engine/src/events/event-types.ts
git commit -m "feat(phase-3a): entity route score/history integration and SSE event types"
```

---

## Task 18: Caching, Observability & ClickHouse Init

**Files:**
- Modify: `engine/src/db/init/clickhouse.ts`

- [ ] **Step 1: Update ClickHouse init**

In `engine/src/db/init/clickhouse.ts`, after the existing table creation:

1. Drop and recreate `gap_score_history` with new columns (trend, confidence_level, normalization)
2. Add `gap_score_history_daily` materialized view
3. Add `detector_metrics` table
4. Add `gap_computation_log` table
5. Add `leaderboard_by_reality_score` materialized view

Use the DDL from the design spec Section 1.13.

- [ ] **Step 2: Add cache invalidation to GapService**

In `engine/src/services/gap.service.ts`, add cache methods:
- After `upsertGapScore`, delete Redis keys: `gap:cache:{entityId}:*`
- After batch completion, increment leaderboard generation counter
- Leaderboard queries check Redis cache first with 60-second TTL

- [ ] **Step 3: Verify compilation**

```bash
cd engine && bun run tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add engine/src/db/init/clickhouse.ts engine/src/services/gap.service.ts
git commit -m "feat(phase-3a): ClickHouse schema expansion, leaderboard MVs, caching, and observability tables"
```

---

## Task 19: End-to-End Integration Test

**Files:**
- Create: `engine/test/gap/e2e.test.ts`

- [ ] **Step 1: Write E2E test**

Create `engine/test/gap/e2e.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { GapService } from '../../src/services/gap.service';
import { DetectorRegistry } from '../../src/detectors/registry';
import { StealthProjectDetector } from '../../src/detectors/stealth';
import { VaporwareDetector } from '../../src/detectors/vaporware';
import { TrendReversalDetector } from '../../src/detectors/trend-reversal';
import { computeEvidenceFingerprint } from '../../src/detectors/alert-generator';

describe('Phase 3a E2E: Gap Analysis Pipeline', () => {
  it('computes gap score and detects stealth pattern', async () => {
    // 1. Create mock signals — heavy behavioral, light declarative
    const signals = [
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `s-b-${i}`, entityId: 'company:stealth-co', sourceId: 'src:1',
        polarity: 'behavioral' as const, category: 'patent-filing', intensity: 0.8,
        confidence: 0.9, domains: ['quantum-computing'], tags: [], tier: 1,
        financialWeight: undefined, verification: 'unverified',
        publishedAt: new Date('2026-02-01'), extractedClaims: [], relatedSignals: [],
      })),
      ...Array.from({ length: 5 }, (_, i) => ({
        id: `s-b2-${i}`, entityId: 'company:stealth-co', sourceId: 'src:2',
        polarity: 'behavioral' as const, category: 'job-posting', intensity: 0.6,
        confidence: 0.7, domains: ['quantum-computing'], tags: [], tier: 2,
        financialWeight: undefined, verification: 'unverified',
        publishedAt: new Date('2026-03-01'), extractedClaims: [], relatedSignals: [],
      })),
      {
        id: 's-d-0', entityId: 'company:stealth-co', sourceId: 'src:1',
        polarity: 'declarative' as const, category: 'press-release', intensity: 0.5,
        confidence: 0.8, domains: ['quantum-computing'], tags: [], tier: 1,
        financialWeight: undefined, verification: 'unverified',
        publishedAt: new Date('2026-01-15'), extractedClaims: [], relatedSignals: [],
      },
    ];

    // 2. Compute gap score
    const gapService = new GapService({} as any, null, null);
    const score = gapService.computeFromSignals('company:stealth-co', 'quantum-computing', signals, null, new Date('2026-03-23'));

    expect(score.behavioralCount).toBe(20);
    expect(score.declarativeCount).toBe(1);
    expect(score.alignment).toBeGreaterThan(1.5);
    expect(score.category).toBe('stealth');

    // 3. Run detectors
    const registry = new DetectorRegistry();
    registry.register(new StealthProjectDetector());
    registry.register(new VaporwareDetector());
    registry.register(new TrendReversalDetector());

    // Build detector context from computed score
    const ctx = {
      entityId: 'company:stealth-co', domain: 'quantum-computing',
      gapScore: score,
      previousGapScore: null,
      signals: {
        behavioral: {
          count: score.behavioralCount, weighted: score.behavioralWeighted,
          velocity: { currentQuarter: 20, previousQuarter: 0, qoqChange: 1.0, monthlyAverage: 5 },
          topCategories: [{ category: 'patent-filing', count: 15 }, { category: 'job-posting', count: 5 }],
        },
        declarative: {
          count: score.declarativeCount, weighted: score.declarativeWeighted,
          velocity: { currentQuarter: 1, previousQuarter: 0, qoqChange: 0, monthlyAverage: 0.25 },
          topCategories: [{ category: 'press-release', count: 1 }],
        },
        domainOverlap: 1.0,
        recentSignals: signals.slice(0, 5).map((s) => ({ id: s.id, category: s.category, polarity: s.polarity, publishedAt: s.publishedAt })),
        staleDays: 0,
      },
      entity: { id: 'company:stealth-co', type: 'company', name: 'Stealth Co', status: 'active', sector: 'tech', scale: 'mid' },
      peerContext: null,
    };

    // Run stealth detector
    const stealthDetector = new StealthProjectDetector();
    expect(stealthDetector.shouldRun(ctx as any)).toBe(true);
    const detection = await stealthDetector.detect(ctx as any);
    expect(detection).not.toBeNull();
    expect(detection!.detected).toBe(true);
    expect(detection!.alertType).toBe('stealth-project');

    // Run vaporware detector — should NOT fire for stealth pattern
    const vaporwareDetector = new VaporwareDetector();
    expect(vaporwareDetector.shouldRun(ctx as any)).toBe(false);
  });

  it('evidence fingerprint is deterministic', () => {
    const evidence = {
      behavioral: [{ signalId: 'b' }, { signalId: 'a' }],
      declarative: [{ signalId: 'c' }],
    };
    const fp1 = computeEvidenceFingerprint(evidence as any);
    const fp2 = computeEvidenceFingerprint(evidence as any);
    expect(fp1).toBe(fp2);
  });
});
```

- [ ] **Step 2: Run E2E test**

```bash
cd engine && bun run vitest run test/gap/e2e.test.ts
```

Expected: All pass.

- [ ] **Step 3: Run full test suite**

```bash
cd engine && bun run vitest run
```

Expected: All existing Phase 1/2 tests still pass + all new Phase 3a tests pass.

- [ ] **Step 4: Commit**

```bash
git add engine/test/gap/e2e.test.ts
git commit -m "feat(phase-3a): end-to-end integration test for gap analysis pipeline"
```

- [ ] **Step 5: Final verification**

```bash
cd engine && bun run tsc --noEmit && bun run vitest run
```

Expected: TypeScript compiles, all tests pass.

---

## Summary

| Task | Component | Files | Key Outputs |
|------|-----------|-------|-------------|
| 1 | Schema Evolution | 6 modified | Full gap_scores, alerts, watchlists, snapshots, DLQ tables |
| 2 | Shared Types | 3 created | GapScore, SignalRow, Detector interfaces, constants |
| 3 | Domain Taxonomy | 3 created | Seed data, DomainService |
| 4 | Signal Reader | 2 created | ClickHouse + PG reader with fallback |
| 5 | Signal Weights | 4 created | Weight computation, velocity stats |
| 6 | Scoring Algorithm | 4 created | Category, trend, reality score, confidence |
| 7 | GapService | 3 created/modified | Full scoring orchestration + CRUD |
| 8 | Lightweight Detectors | 8 created | Registry, stealth, vaporware, trend reversal |
| 9 | Heavyweight Detectors | 4 created | Acquisition target, contradiction |
| 10 | Alert Generation | 2 created | Cooldown, fingerprinting, escalation |
| 11 | Graph Snapshots | 2 created | Tiered snapshot refresh |
| 12 | Gap Workflows | 3 created | Chunk + batch compute workflows |
| 13 | Detector Workflow | 3 created | Batched detector execution |
| 14 | Coordinator | 2 created | Redis sorted set poller + scheduled sweep |
| 15 | Workers + Integration | 4 created/modified | Worker registrations, signal writer integration |
| 16 | API Routes | 4 created/modified | Gaps, domains, admin recompute |
| 17 | Entity Routes + SSE | 2 modified | Score/history endpoints, event types |
| 18 | Caching + Observability | 2 modified | ClickHouse MVs, cache invalidation |
| 19 | E2E Test | 1 created | Full pipeline verification |

**Estimated totals:** ~50 new files, ~10 modified files, ~5,000-7,000 lines of code.
