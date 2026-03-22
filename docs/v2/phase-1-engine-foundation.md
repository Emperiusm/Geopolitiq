# Phase 1: Engine Foundation — Design Spec

> **Phase 1 of 5.** Stands up the Gambit Engine as a separate server alongside the legacy API. Establishes PostgreSQL + Drizzle, unified entity model, entity seeding from MongoDB, Change Stream sync, Typesense search, and the `/engine/v1/` API surface. The existing `/api/v1/` routes continue working unchanged.

**Parent spec:** `docs/superpowers/specs/2026-03-22-gambit-engine-signal-design.md`

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Project Structure & Workspace](#2-project-structure--workspace)
3. [Docker Compose & Infrastructure](#3-docker-compose--infrastructure)
4. [Drizzle Schema & Database Design](#4-drizzle-schema--database-design)
5. [Entity Seed & Edge Extraction](#5-entity-seed--edge-extraction)
6. [MongoDB Change Stream Sync](#6-mongodb-change-stream-sync)
7. [Typesense Integration](#7-typesense-integration)
8. [Engine API Server & Entity Routes](#8-engine-api-server--entity-routes)
9. [Performance Optimizations](#9-performance-optimizations)
10. [Forward References (Phase 2-5)](#10-forward-references-phase-2-5)

---

## 1. Design Principles

### One Idea Per Container

Inspired by Luhmann's Zettelkasten and the paper "One Idea Per Container" (howtothink.ai). Every data container in the engine holds exactly one idea:

- **Each entity is one identity node** — name, type, aliases, location. No embedded relationships.
- **Each signal is one atomic claim** — one data point per record, independently linkable.
- **All relationships are explicit edges** — stored in `entity_edges` table and synced to Neo4j. Never embedded in entity `meta`.
- **The `meta` JSONB bag** holds only attributes of the entity itself (ticker, flag, population) — never relationships or claims about other entities.

This enables combinatorial intelligence — atomic units recombine in ways that compound multi-idea documents cannot.

### SurrealDB-Inspired Record IDs

Every record has a typed address: `type:slug` (e.g., `company:nvidia`, `country:united-states`).

```typescript
// @gambit/common
type RecordId = `${string}:${string}`;

function recordId(type: string, slug: string): RecordId;
function parseRecordId(id: RecordId): { type: string; slug: string };
function edgeId(fromId: string, relation: string, toId: string): string;
// edgeId output: "edge--conflict:x--involves--country:y" (double hyphens as separators)
```

PostgreSQL enforces format via domain type on entity tables:

```sql
-- Applied to entities.id, entity_edges.from_id, entity_edges.to_id
CREATE DOMAIN record_id AS TEXT CHECK (VALUE ~ '^[a-z][a-z0-9-]*:[a-z0-9_-]+$');
```

**Note:** `entity_edges.id` uses plain `TEXT`, not the `record_id` domain, because edge IDs have a different format (`edge--from--relation--to`) that includes the separator pattern.

### Declarative Edge Mappings

Relationships between entities are defined as configuration, not extraction code:

```typescript
interface EdgeMapping {
  sourceCollection: string;
  sourceType: string;
  edges: {
    field: string;
    fieldType: 'string' | 'array';
    targetType: string;
    relation: string;
    weight?: number;
    bidirectional?: boolean;
    reverseRelation?: string;
    targetResolver?: string;
  }[];
}
```

The same mapping drives seed, sync, and Neo4j sync. Adding a new relationship = adding a config entry.

### TokMem Procedural Memory

Based on the TokMem paper (Wu et al., 2025). Each reusable extraction procedure is compiled into a single trainable memory token on a frozen LLM backbone. The 4-stage maturity model:

```
Prompt mode (Claude API) → Token mode (Qwen 2.5 7B on RunPod) → Structured parser (deterministic)
```

Phase 1 establishes the schema for training data collection. Phase 2 implements the training pipeline.

**Inference cost ladder:**

```
1. RunPod Primary (Qwen 7B + token)     — $0.0004/extraction
2. RunPod Backup (Qwen 7B + token)      — $0.0004/extraction (different region)
3. Claude Haiku (prompt mode)            — $0.001/extraction
4. Claude Sonnet (prompt mode)           — $0.005/extraction (complex/ambiguous)
5. DLQ                                   — source is broken
```

Each stage returns a confidence score. Below threshold → escalate to next tier. Sonnet-level extractions are auto-extracted but flagged `verification: 'needs-review'` for the review queue.

### Graceful Degradation

PostgreSQL is required. Everything else degrades gracefully:

| Service | If unavailable |
|---|---|
| PostgreSQL | Engine won't start (fatal) |
| Typesense | Search returns 503, entity resolution falls back to PostgreSQL alias lookup |
| ClickHouse | Analytics endpoints return 503 |
| Temporal | Workflow endpoints return 503, sync runs as native process |
| MinIO | Document storage returns 503 |
| Neo4j | Graph traversal returns 503, edge queries use PostgreSQL |
| Redis (cache) | Caching disabled, all queries hit PostgreSQL |
| Redis (persistent) | Rate limiting falls back to in-memory, sync resume tokens lost on restart |

---

## 2. Project Structure & Workspace

Bun workspaces with shared `@gambit/common` package:

```
Geopolitiq/
├── package.json                  # workspace root: ["packages/*", "api", "engine"]
├── packages/
│   └── common/                   # @gambit/common
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── record-id.ts          # recordId(), parseRecordId(), edgeId()
│           ├── edges.ts              # EDGE_MAPPINGS declarative schema
│           ├── types/
│           │   ├── entities.ts       # Entity, EntityType, EntityEdge
│           │   ├── signals.ts        # Signal, SignalCategory, Claim
│           │   ├── auth.ts           # AppVariables, UserRole, scopes
│           │   └── api.ts            # ApiMeta, ApiSuccess, ApiError
│           ├── auth/
│           │   ├── types.ts          # AuthProvider interface
│           │   ├── verify-token.ts   # JWT verification (pure crypto)
│           │   └── hash.ts           # key hashing
│           ├── config/
│           │   ├── index.ts          # loadConfig() — Zod-validated
│           │   ├── schema.ts         # config schema
│           │   └── defaults.ts       # development defaults
│           ├── errors/
│           │   ├── index.ts
│           │   ├── base.ts           # GambitError
│           │   ├── not-found.ts      # EntityNotFoundError
│           │   ├── validation.ts     # ValidationError
│           │   ├── conflict.ts       # DuplicateEntityError
│           │   ├── auth.ts           # UnauthorizedError, ForbiddenError
│           │   └── service.ts        # ServiceUnavailableError
│           ├── logger/
│           │   ├── index.ts          # createLogger() via pino
│           │   └── context.ts        # request context propagation
│           └── validation/
│               ├── entity.ts         # Zod schemas for entity endpoints
│               └── common.ts         # cursor pagination, list params
├── api/                          # legacy server (unchanged, reads MongoDB)
│   ├── package.json              # adds @gambit/common dependency
│   └── src/
│       └── auth/
│           └── mongo-auth-provider.ts  # implements AuthProvider
├── engine/                       # new server (reads PostgreSQL)
│   ├── package.json
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   ├── vitest.config.ts
│   ├── .env.example
│   ├── Dockerfile.dev
│   └── src/
│       ├── index.ts                  # Hono app, startup sequence
│       ├── infrastructure/
│       │   ├── postgres.ts           # connection + Drizzle + pool warming
│       │   ├── clickhouse.ts         # connection (graceful degradation)
│       │   ├── typesense.ts          # connection + collection init + synonyms
│       │   ├── temporal.ts           # client connection
│       │   ├── minio.ts              # connection + bucket setup
│       │   ├── health.ts             # per-service health checks
│       │   ├── cache-layers.ts       # L1 (LRU) + L2 (Redis) + L3 (DB)
│       │   └── coalesce.ts           # request coalescing for duplicate queries
│       ├── db/
│       │   ├── schema/
│       │   │   ├── entities.ts       # entities, entity_edges, resolution_*
│       │   │   ├── auth.ts           # teams, users, api_keys, sessions
│       │   │   ├── signals.ts        # sources, signals (Phase 2)
│       │   │   ├── analysis.ts       # gap_scores, alerts, watchlists, domain_taxonomy (Phase 3)
│       │   │   ├── memory.ts         # memory_tokens, extraction_samples (Phase 2)
│       │   │   ├── operations.ts     # pipeline_runs, signal_dlq, usage_records, webhooks
│       │   │   ├── foia.ts           # foia_agencies, foia_requests (Phase 5)
│       │   │   └── analytics.ts      # search_analytics
│       │   ├── init/
│       │   │   ├── extensions.ts     # postgis, pg_trgm
│       │   │   ├── enums.ts          # all pgEnum definitions
│       │   │   ├── triggers.ts       # updated_at triggers
│       │   │   ├── rls.ts            # Row Level Security policies
│       │   │   ├── comments.ts       # table/column documentation
│       │   │   └── index.ts          # runDatabaseInit()
│       │   ├── prepared.ts           # prepared statements for hot paths
│       │   ├── transaction.ts        # withTransaction() wrapper
│       │   ├── index.ts              # re-exports all schema
│       │   └── migrations/           # generated by drizzle-kit
│       ├── services/
│       │   ├── container.ts          # ServiceContainer + factory
│       │   ├── entity.service.ts     # CRUD, edges, resolution
│       │   └── search.service.ts     # Typesense wrapper
│       ├── routes/
│       │   ├── health.ts             # per-service + sync health
│       │   ├── entities.ts           # CRUD, edges, resolve, batch
│       │   └── admin.ts              # seed, rebuild-index, verify-sync, DLQ
│       ├── middleware/
│       │   ├── authenticate.ts       # JWT/API key via AuthProvider
│       │   ├── db-context.ts         # RLS SET LOCAL per request
│       │   ├── rate-limit.ts         # Redis counters + headers
│       │   ├── tier-check.ts         # free/pro/enterprise enforcement
│       │   ├── error-handler.ts      # GambitError → JSON response
│       │   ├── request-id.ts         # X-Request-Id
│       │   ├── request-logger.ts     # structured logging + slow request warnings
│       │   ├── cache.ts              # response caching middleware
│       │   ├── etag.ts               # ETag + 304 Not Modified
│       │   ├── tracing.ts            # OpenTelemetry spans
│       │   └── api-version.ts        # X-API-Version headers
│       ├── auth/
│       │   └── postgres-auth-provider.ts  # implements AuthProvider
│       ├── seed/
│       │   ├── seed-from-mongo.ts    # orchestrator
│       │   ├── transformers.ts       # ENTITY_MAPPINGS + AUTH_MAPPINGS
│       │   ├── resolvers.ts          # country name/ISO2 resolution
│       │   ├── infer-edges.ts        # NSA→conflict, conflict→chokepoint
│       │   └── validator.ts          # pre-insert validation
│       ├── sync/
│       │   ├── change-stream.ts      # MongoDB watcher class
│       │   ├── neo4j-sync.ts         # PostgreSQL edges → Neo4j
│       │   ├── sync-dlq.ts           # sync dead letter queue schema
│       │   └── verify-sync.ts        # consistency checker
│       ├── scripts/
│       │   └── smoke-test.sh
│       └── test/
│           ├── setup.ts              # create test DB, run migrations
│           ├── teardown.ts           # drop test DB
│           ├── helpers/
│           │   ├── container.ts      # test ServiceContainer
│           │   ├── fixtures.ts       # factory functions
│           │   └── db.ts             # resetDb()
│           └── integration/
│               ├── entity.service.test.ts
│               ├── search.service.test.ts
│               └── seed.test.ts
├── frontend/                     # existing globe (Preact)
├── signal/                       # new dashboard (Phase 4, React + Tailwind)
└── docker-compose.yml
```

### Auth Extraction

Auth logic shared via `AuthProvider` interface in `@gambit/common`:

```typescript
export interface AuthProvider {
  findUserById(id: string): Promise<User | null>;
  findApiKeyByHash(hash: string): Promise<ApiKey | null>;
  findSession(id: string): Promise<Session | null>;
}
```

- `api/` implements `MongoAuthProvider` (reads MongoDB)
- `engine/` implements `PostgresAuthProvider` (reads PostgreSQL)
- JWT verification and key hashing are pure functions in `@gambit/common` — no DB dependency

---

## 3. Docker Compose & Infrastructure

### Profiles

```
docker compose up                         → core (mongo, redis, redis-persistent, postgres, pgbouncer, caddy)
docker compose --profile engine up        → + clickhouse, typesense, temporal, temporal-ui, postgres-temporal, minio, minio-init, engine-dev
docker compose --profile observability up → + grafana, tempo
docker compose --profile legacy up        → + neo4j, ollama, bullmq-dashboard, mongo-express
docker compose --profile test up          → + postgres-test
docker compose --profile all up           → everything
```

### Services

**Core (always run):**

| Service | Port | Purpose |
|---|---|---|
| `mongo:7` | 27017 | Legacy data store |
| `redis:7-alpine` | 6380 | Cache (LRU eviction, 256MB) |
| `redis-persistent:7-alpine` | 6381 | Rate limits, usage counters, sync state (AOF, no eviction, 128MB) |
| `postgres:17` | 5432 | Engine primary database |
| `pgbouncer` | 6432 | Connection pooling (transaction mode, 200 max client, 20 pool) |
| `caddy:2-alpine` | 80, 443 | Reverse proxy — routes `/api/v1/*` and `/engine/v1/*` |

**Engine profile:**

| Service | Port | Purpose |
|---|---|---|
| `clickhouse` | 8123 (HTTP), 9100 (native) | Signal analytics, gap scoring, time-series |
| `typesense:27.1` | 8108 | Fuzzy entity search and resolution |
| `temporal` | 7233 | Workflow orchestration |
| `temporal-ui` | 8080 | Temporal dashboard |
| `postgres-temporal` | (internal) | Dedicated PostgreSQL for Temporal (isolated from app DB) |
| `minio` | 9000 (S3), 9001 (console) | Document storage |
| `minio-init` | — | Creates buckets: documents, exports, foia-responses, raw-payloads, token-embeddings |
| `engine-dev` | 3001 | Engine server with hot reload |

**Observability profile:**

| Service | Port | Purpose |
|---|---|---|
| `tempo` | 3200, 4317 | Trace collection |
| `grafana` | 3000 | Dashboards |

**Test profile:**

| Service | Port | Purpose |
|---|---|---|
| `postgres-test` | 5433 | Isolated test DB (tmpfs — RAM-backed) |

### Caddy Configuration

```
:80 {
    handle /api/v1/events/* {
        reverse_proxy api-dev:3000 {
            flush_interval -1
            transport http { read_timeout 0 }
        }
    }
    handle /engine/v1/stream/* {
        reverse_proxy engine-dev:3001 {
            flush_interval -1
            transport http { read_timeout 0 }
        }
    }
    handle /api/v1/* { reverse_proxy api-dev:3000 }
    handle /engine/v1/* { reverse_proxy engine-dev:3001 }
    handle /temporal/* { reverse_proxy temporal-ui:8080 }
    handle /minio/* { reverse_proxy minio:9001 }
    handle { reverse_proxy frontend-dev:5200 }
}
```

### Key Decisions

- **Temporal has its own PostgreSQL** — prevents migration conflicts and connection pool contention with the app database
- **Dual Redis** — cache (evictable) and persistent (durable counters/state)
- **PgBouncer in transaction mode** — `SET LOCAL` only survives within a single transaction. The `db-context` middleware wraps every authenticated request in a transaction that opens with `SET LOCAL app.team_id`, ensuring RLS enforcement persists for all queries within that request. This is critical: without the transaction wrapper, PgBouncer returns the connection to the pool between statements and the RLS context is lost. Every tenant-scoped database call MUST go through the transaction-scoped `c.get('db')`, never `container.db` directly
- **Test PostgreSQL on tmpfs** — RAM-backed for fast test execution, data thrown away
- **All services have healthchecks** — `depends_on` with `condition: service_healthy` prevents startup race conditions

---

## 4. Drizzle Schema & Database Design

### Schema Files

| File | Tables | Phase 1 Status |
|---|---|---|
| `entities.ts` | entities, entity_edges, resolution_aliases, resolution_feedback | Active — seeded and served |
| `auth.ts` | teams, users, api_keys, sessions | Active — seeded from MongoDB |
| `signals.ts` | sources, signals | Created empty (Phase 2) |
| `analysis.ts` | gap_scores, alerts, watchlists, domain_taxonomy | Created empty (Phase 3) |
| `memory.ts` | memory_tokens, memory_token_versions, extraction_samples | Created empty (Phase 2) |
| `operations.ts` | pipeline_runs, signal_dlq, sync_dlq, usage_records, webhook_deliveries | Created empty except sync_dlq (active in Phase 1) |
| `foia.ts` | foia_agencies, foia_requests | Created empty (Phase 5) |
| `analytics.ts` | search_analytics | Active (Phase 1) |

All tables created in Phase 1 so future phases only alter, never add tables.

### PostgreSQL Enums

```typescript
entityTypeEnum: company, country, government, organization, person, conflict, chokepoint, base, trade-route, port, nsa, election
entityStatusEnum: active, acquired, dissolved, merged, inactive, unverified
polarityEnum: declarative, behavioral
tierEnum: 1, 2, 3
teamTierEnum: free, pro, enterprise
userRoleEnum: owner, admin, member, viewer
alertSeverityEnum: info, warning, critical
verificationEnum: unverified, verified, disputed, retracted, needs-review
parserModeEnum: structured, agent, token, hybrid (new modes require `ALTER TYPE parser_mode ADD VALUE`)
```

### Entity Table

```typescript
entities = pgTable('entities', {
  id: text('id').primaryKey(),                    // record_id: "company:nvidia"
  type: entityTypeEnum('type').notNull(),
  name: text('name').notNull(),
  aliases: text('aliases').array().default([]),
  parentId: text('parent_id').references(() => entities.id),
  status: entityStatusEnum('status').default('active').notNull(),
  statusDetail: text('status_detail'),
  statusAt: timestamp('status_at', { withTimezone: true }),
  sector: text('sector'),
  jurisdiction: text('jurisdiction'),
  domains: text('domains').array().default([]),
  lat: numeric('lat'),
  lng: numeric('lng'),
  location: geography('location', { type: 'point', srid: 4326 }),  // PostGIS
  externalIds: jsonb('external_ids').default({}),
  tags: text('tags').array().default([]),
  risk: text('risk'),
  ticker: text('ticker'),
  iso2: text('iso2'),
  meta: jsonb('meta').default({}),
  signalCountDeclarative: integer('signal_count_declarative').default(0),
  signalCountBehavioral: integer('signal_count_behavioral').default(0),
  realityScore: numeric('reality_score'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**Indexes:** type, status, ticker, iso2, risk, parentId, domains (GIN), tags (GIN), aliases (GIN), location (GIST), active entities partial index.

### Entity Edges Table

```typescript
entityEdges = pgTable('entity_edges', {
  id: text('id').primaryKey(),          // deterministic: "edge:from::relation::to"
  fromId: text('from_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  toId: text('to_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  relation: text('relation').notNull(),
  weight: numeric('weight').default('1.0'),
  source: text('source').default('seed'),
  meta: jsonb('meta').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

**Unique constraint:** `(fromId, relation, toId)` — prevents duplicate edges.

### Database Initialization

Run after migrations on every startup (idempotent):

1. **Extensions:** `postgis`, `pg_trgm`
2. **Triggers:** `updated_at` auto-update on all mutable tables
3. **RLS policies:** on watchlists, alerts, foia_requests, usage_records, webhook_deliveries, api_keys. **Note:** `audit_log` is global (admin-only access, no RLS) — system operations, seed operations, and admin actions write audit entries with `team_id = NULL`. The admin routes expose audit log without tenant filtering
4. **Table comments:** documentation on every table and key column
5. **Materialized view:** `entity_listing` for fast list queries (refreshed concurrently every 30s). **Safety note:** materialized views bypass RLS — this is safe for `entity_listing` because entities are global shared data (all tenants see the same entities). Materialized views must NEVER be used for tenant-scoped tables (watchlists, alerts, etc.)

### Audit Log

Append-only table for tracking all mutations:

```typescript
auditLog = pgTable('audit_log', {
  id: text('id').primaryKey(),
  teamId: text('team_id'),
  userId: text('user_id'),
  action: text('action').notNull(),       // entity.update, alert.acknowledge, etc.
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### Cascade Rules

- **Ownership cascades:** team → users, api_keys, watchlists, usage_records (DELETE CASCADE)
- **References restrict:** signal → entity, signal → source (DELETE RESTRICT — must mark inactive, not delete)
- **Edges cascade:** entity deletion cascades to its edges
- **Aliases cascade:** entity deletion cascades to its resolution aliases

### Migration Strategy

- **Development:** `drizzle-kit push` (direct schema sync, no files)
- **Production:** `drizzle-kit generate` + `drizzle-kit migrate` (versioned SQL files)

---

## 5. Entity Seed & Edge Extraction

### Seed Order

```
1. Database init (extensions, triggers, RLS)
2. Auth: teams → users → api_keys → sessions
3. Entities: countries, ports, chokepoints, conflicts, bases, NSA, elections, trade routes
4. Entity edges (declarative + inferred)
5. Resolution aliases
6. Typesense index sync
7. Neo4j graph sync (non-fatal)
8. Seed snapshot to MinIO
```

### Entity Transformers

Each MongoDB collection has a declarative transformer (`ENTITY_MAPPINGS`) that maps documents to the unified entity schema. Key rule: **relationship fields are excluded from `meta` and extracted as edges.**

| Collection | Record ID | Excluded from meta (→ edges) |
|---|---|---|
| countries | `country:slug` | — (no embedded relationships) |
| conflicts | `conflict:slug` | `relatedCountries` |
| bases | `base:slug` | `hostNation`, `operatingCountry` |
| chokepoints | `chokepoint:slug` | `dependentCountries` |
| nonStateActors | `nsa:slug` | `allies`, `rivals` |
| elections | `election:slug` | `countryISO2` |
| tradeRoutes | `trade-route:slug` | `from`, `to`, `waypoints` |
| ports | `port:slug` | `country` |

### Edge Mappings

Declarative config defines all relationships:

| Source | Field | Target | Relation | Resolver |
|---|---|---|---|---|
| conflicts | relatedCountries[] | country | involves (↔ involved-in) | iso2-or-name |
| bases | hostNation | country | hosted-by | country-name |
| bases | operatingCountry | country | operated-by | country-name |
| chokepoints | dependentCountries[] | country | depends-on (↔ dependent-on) | country-name |
| nsa | allies[] | country | ally-of | country-name |
| nsa | rivals[] | country | rival-of | country-name |
| tradeRoutes | from | port | originates-at | default |
| tradeRoutes | to | port | terminates-at | default |
| tradeRoutes | waypoints[] | chokepoint | passes-through | default |
| ports | country | country | port-in | country-name |
| elections | countryISO2 | country | election-in | iso2-or-name |

### Target Resolvers

Handle inconsistent ID formats in MongoDB:

- **`default`** — direct slug match: `recordId(targetType, value)`
- **`iso2-or-name`** — try ISO2 uppercase, then name lowercase
- **`country-name`** — try name lowercase, then ISO2 uppercase

Resolver context built from inserted entities after Phase 3 of seed.

### Inferred Edges

Beyond declarative mappings, two relationship types are inferred:

1. **NSA → Conflict (participates-in):** matched by overlapping countries between NSA allies/rivals and conflict relatedCountries. Weight scales with overlap count.
2. **Conflict → Chokepoint (disrupts):** matched by overlapping countries between active conflicts and chokepoint dependent countries. Weight based on conflict status.

### Validation

Pre-insert validation catches:
- Invalid record ID format
- Missing required fields (name, type)
- Out-of-range coordinates
- Missing parent entity references

Invalid entities are logged and skipped — not inserted.

### Seed Report

```
╔══════════════════════════════════════════════════╗
║  Gambit Engine — Seed Report                     ║
╠══════════════════════════════════════════════════╣
║  Entities:  487 inserted, 3 invalid (skipped)    ║
║  Edges:     728 inserted, 5 unresolvable         ║
║  Aliases:   1,204 inserted                       ║
║  Auth:      12 teams, 47 users, 23 API keys      ║
║  Typesense: 487 indexed                          ║
║  Neo4j:     487 nodes, 728 edges                 ║
║  Duration:  3.2s                                 ║
║                                                  ║
║  Unresolvable edges:                             ║
║    conflict:x → involves → "Unknown Region"      ║
║    nsa:y → ally-of → "Various"                   ║
╚══════════════════════════════════════════════════╝
```

Seed is idempotent — uses `onConflictDoUpdate` for entities, `onConflictDoNothing` for edges/aliases.

---

## 6. MongoDB Change Stream Sync

### Architecture

**Phase 1 uses a native Change Stream process** — not a Temporal workflow. Temporal is in the `engine` Docker profile (not `core`), and the sync must work without it. In Phase 2, when Temporal is fully operational, the sync can optionally migrate to a Temporal workflow for enhanced durability and retry semantics. The parent spec's reference to "Change Stream listener (runs as a Temporal workflow)" is updated to reflect this phased approach.

```
MongoDB (legacy writes via api/)
    │
    ├── Change Stream watcher (one per collection, 8 total)
    │   └── on insert/update/replace/delete:
    │       1. Transform (same ENTITY_MAPPINGS as seed)
    │       2. Validate
    │       3. Upsert to PostgreSQL (mongo-owned fields only)
    │       4. Re-extract edges for changed entity
    │       5. Update Typesense search index
    │       6. Log to sync metrics
    │       7. Persist resume token to Redis (persistent)
    │
    └── Resume tokens in redis-persistent
        └── Survives engine restarts — picks up where it left off
```

### Field Ownership Model

During migration, MongoDB and PostgreSQL coexist. Field ownership prevents one from clobbering the other:

**MongoDB-owned (sync always overwrites):**
`name`, `aliases`, `lat`, `lng`, `meta`, `tags`, `risk`, `iso2`

**PostgreSQL-owned (sync never overwrites):**
`domains`, `signalCountDeclarative`, `signalCountBehavioral`, `realityScore`, `sector`, `jurisdiction`, `externalIds`, `parentId`, `status`, `statusDetail`, `statusAt`

### Batching & Debouncing

Changes are debounced (1s window) and processed in batches to avoid per-change overhead. Rapid updates to the same entity within the debounce window are collapsed into one upsert.

### No-Op Detection

Before writing to PostgreSQL, compare the incoming data with the current row. Skip if nothing changed — prevents unnecessary `updated_at` bumps and cache invalidation.

### Edge Refresh

On entity upsert, existing edges FROM the changed entity are deleted and re-extracted from the current document. Bidirectional reverse edges are also cleaned up. Only `source: 'sync'` edges are touched — seed and signal-generated edges are preserved.

### Stall Detection

The sync health monitor distinguishes "no changes to sync" from "actually stalled" by comparing MongoDB's oplog timestamp against the last processed change. If MongoDB has unprocessed changes older than 60s, status = `stalled`.

### Sync DLQ

Failed sync operations go to a dedicated `sync_dlq` table with the full document, error, and attempt count. Exposed via `GET /engine/v1/admin/sync-dlq` and retryable via `POST /engine/v1/admin/sync-dlq/:id/retry`.

### Consistency Verification

`POST /engine/v1/admin/verify-sync` compares entity counts and IDs between MongoDB and PostgreSQL per collection. Reports missing, extra, and mismatched entities. Run on-demand or scheduled hourly.

### Resume Token Expiry

If the engine is down long enough for the MongoDB oplog to roll over, the resume token is invalid. The sync detects this error and triggers a full re-seed.

---

## 7. Typesense Integration

### Entity Collection Schema

Fields: `id`, `type`, `name`, `aliases[]`, `status`, `sector`, `jurisdiction`, `domains[]`, `tags[]`, `risk`, `ticker`, `iso2`, `reality_score`, `signal_count`, `lat`, `lng`, `location` (geopoint), `updated_at`.

Default sorting: `updated_at` descending.
Token separators: `-`, `_`, `:` (so `ai-inference` matches `ai inference`).

### Capabilities

**Full-text search:** typo-tolerant (2 typos), prefix matching, weighted fields (name 5x, ticker 4x, aliases 3x), faceted filtering by type/status/risk/sector/domain.

**Entity resolution:** stricter matching (1 typo, no prefix), confidence scoring combining Typesense text match score with Levenshtein similarity, 0.85 threshold for auto-match.

**Geo search:** entities within radius of a point, sorted by distance.

**Batch resolution:** rate-limited batching (50 per batch, 100ms delay) for ingestion pipeline.

### Synonyms

Server-side synonym configuration for country name variants (USA/US/America/United States), organization abbreviations (NATO, UN, EU, OPEC), and corporate suffixes (Corp/Inc/Ltd).

### Search Analytics

Track queries, result counts, clicked results, and zero-result queries. Zero-result queries that repeat = missing entities or aliases. Fed back into resolution alias improvements.

### Zero-Downtime Index Rebuild

Uses Typesense collection aliases: create new collection with temp name, index all entities, atomically swap alias, delete old collection. No search downtime during rebuild.

### Alias Deduplication

Resolution aliases from multiple sources are deduplicated before indexing. Each entity's Typesense document contains the union of base aliases and resolution aliases.

---

## 8. Engine API Server & Entity Routes

### Startup Sequence

```
1. Load config (Zod-validated)
2. Connect PostgreSQL (fatal on failure)
3. Run database init (extensions, triggers, RLS, materialized views)
4. Connect optional services (Typesense, ClickHouse, Temporal, MinIO, Redis ×2)
5. Connect MongoDB (for sync — non-fatal if unavailable, sync disabled)
6. Configure Typesense synonyms
7. Create MinIO buckets
8. Build service container (DI) — all connections available
9. Start Change Stream sync (if MongoDB connected)
10. Run self-check (verify all services functional)
11. Start HTTP server
```

**Note:** MongoDB is connected before the service container is built so `sync` is available when the container is constructed. If MongoDB is unavailable, the engine starts without sync — entity data is still served from PostgreSQL (seeded data), but changes made via the legacy API won't propagate until MongoDB reconnects.

### Middleware Stack (ordered)

```
1.  CORS
2.  Request ID (X-Request-Id)
3.  OpenTelemetry tracing
4.  Request logger (structured, slow request warnings)
5.  API version headers (X-API-Version, X-Engine-Version)
6.  ETag + 304 Not Modified
7.  Brotli compression
8.  Error handler (GambitError → JSON)
    ── health routes (public, no auth) ──
9.  Authentication (JWT / API key → AuthProvider)
10. DB context (SET LOCAL app.team_id for RLS)
11. Rate limiting (Redis counters + X-RateLimit headers)
12. Tier enforcement (free/pro/enterprise limits)
    ── authenticated routes ──
```

### Entity Endpoints (Phase 1)

```
GET    /engine/v1/entities                — list (cursor pagination, filters, Typesense search)
GET    /engine/v1/entities/:id            — detail (with ?include=edges; ?include=scores returns null until Phase 3)
POST   /engine/v1/entities/resolve        — entity resolution (name → ID)
POST   /engine/v1/entities/batch          — bulk fetch by IDs (max 100)
GET    /engine/v1/entities/:id/edges      — relationships (filterable by relation, direction)
GET    /engine/v1/entities/:id/signals    — 501 (Phase 2)
GET    /engine/v1/entities/:id/scores     — 501 (Phase 3)
GET    /engine/v1/entities/:id/alerts     — 501 (Phase 3)
GET    /engine/v1/entities/:id/history    — 501 (Phase 3)
```

### Admin Endpoints

```
POST   /engine/v1/admin/seed             — re-seed from MongoDB
POST   /engine/v1/admin/rebuild-index    — rebuild Typesense from PostgreSQL
POST   /engine/v1/admin/verify-sync      — sync consistency check
GET    /engine/v1/admin/sync-dlq         — view sync DLQ
POST   /engine/v1/admin/sync-dlq/:id/retry — retry DLQ item
POST   /engine/v1/admin/neo4j-sync       — trigger full Neo4j sync
```

### Health Endpoint

```
GET    /engine/v1/health                 — per-service status + sync health + version + uptime
```

Returns `200 OK`, `200 degraded`, or `503 down` based on PostgreSQL availability.

### Phase 2+ Stubs

All other `/engine/v1/` routes return `501 Not Implemented` with a message indicating which phase delivers them.

### Response Caching

Middleware-based caching with Redis:
- Entity list: 60s TTL
- Entity detail: 300s TTL
- Cache headers: `X-Cache: HIT/MISS`, `X-Cache-TTL`
- Cache invalidation on Change Stream sync events

### Service Layer

Dependency injection via `ServiceContainer`. Services receive the container and expose typed methods. Tests create containers with test databases and mock services.

```typescript
interface ServiceContainer {
  db: DrizzleClient;
  typesense: TypesenseClient | null;
  clickhouse: ClickhouseClient | null;
  minio: MinioClient | null;
  temporal: TemporalClient | null;
  redisCache: RedisClient;
  redisPersistent: RedisClient;
  config: GambitConfig;
  logger: Logger;
  entityService: EntityService;
  searchService: SearchService;
  sync?: ChangeStreamSync;
}
```

---

## 9. Performance Optimizations

### Multi-Layer Caching

```
L1: In-process LRU (1000 entries, 5s TTL) — ~0.01ms
L2: Redis (configurable TTL)              — ~1ms
L3: PostgreSQL (source of truth)          — ~5ms
```

L1 absorbs 80%+ of reads for hot entities. Combined with request coalescing, 100 concurrent requests for the same entity = 1 database query.

### Prepared Statements

Critical queries (entity-by-ID, entity-by-ticker, entity-by-iso2, entity edges) are prepared once on startup. Eliminates PostgreSQL parse + plan overhead on every call (~2x faster).

### Materialized View

`entity_listing` view precomputes list data including edge counts. Refreshed concurrently every 30s — zero downtime during refresh. List endpoint reads from the view, not the base table.

### Response Projection

List endpoints exclude `meta` JSONB (can be 2KB+ per entity). At 200 entities per page, this saves ~400KB of unnecessary JSON. Detail endpoint includes `meta`.

### Request Coalescing

Duplicate in-flight requests for the same entity are collapsed into a single database query. The other requests await the same promise.

### Edge Preloading

`?include=edges,scores` on entity detail fetches relationships in parallel with the entity — one round trip instead of three.

### Brotli Compression

15-20% better compression than gzip for JSON payloads. Threshold: 1KB.

### Connection Pool Warming

On startup, all PgBouncer connections are exercised with a trivial query. Eliminates cold-start latency on first real request.

### Streaming JSON

Large result sets stream as JSON arrays — time-to-first-byte drops from "wait for full query + serialize" to "start streaming as rows arrive."

### Precomputed Entity Counts

Entity counts by type maintained in Redis (HINCRBY on insert/delete). Dashboard reads O(1) instead of `COUNT(*) GROUP BY type`.

### Read Replica Readiness

Service layer designed so `db` parameter can point to a read replica for list/search endpoints. Not implemented in Phase 1 — but no code changes needed to add one.

---

## 10. Forward References (Phase 2-5)

### Phase 1 Deliverable: ClickHouse Schema Initialization

Phase 1 creates the ClickHouse tables (empty) so Phase 2 doesn't need to figure out initialization:

```sql
-- ClickHouse tables (created in Phase 1, populated in Phase 2+)

CREATE TABLE IF NOT EXISTS signal_analytics (
  entity_id String,
  source_id String,
  polarity Enum8('declarative' = 0, 'behavioral' = 1),
  category String,
  tier UInt8,
  domains Array(String),
  intensity Float32,
  confidence Float32,
  published_at DateTime64(3),
  ingested_at DateTime64(3),
  content_hash String
) ENGINE = MergeTree()
ORDER BY (entity_id, polarity, published_at)
PARTITION BY toYYYYMM(published_at);

CREATE TABLE IF NOT EXISTS gap_score_history (
  entity_id String,
  domain String,
  alignment Float64,
  reality_score Float64,
  category String,
  behavioral_count UInt32,
  behavioral_weighted Float64,
  declarative_count UInt32,
  declarative_weighted Float64,
  computed_at DateTime64(3)
) ENGINE = MergeTree()
ORDER BY (entity_id, domain, computed_at)
PARTITION BY toYYYYMM(computed_at);
```

Data flows to ClickHouse via direct application writes from Temporal activities (Phase 2+), not logical replication. PostgreSQL `gap_scores` holds the current state; ClickHouse `gap_score_history` holds all historical snapshots for time-series analysis.

### Phase 2: Ingestion Framework
- Temporal workflow pipeline: fetch → parse → classify → resolve → write
- RSS news pipeline migrated as first source
- First behavioral sources: USPTO patents, SEC EDGAR
- TokMem token training pipeline on RunPod (Qwen 2.5 7B)
- `extraction_samples` table starts collecting training data
- `sources` and `signals` tables activated

### Phase 3: Gap Analysis & Alerts
- Scoring engine reads from ClickHouse
- 5 core detectors + advanced detectors (ghost listings, examiner behavior, etc.)
- Alert system with watchlists
- Webhook delivery via Temporal
- `gap_scores`, `alerts`, `watchlists` tables activated

### Phase 4: Signal Dashboard
- React + Tailwind frontend
- Leaderboard, Entity Detail, Comparison, Alert Feed
- Spatial View (globe as React component via Deck.GL)
- **Cosmograph integration** — hybrid graph endpoint: JSON default + binary format via `Accept: application/octet-stream` or `?format=binary`. Binary serves pre-computed Float32Arrays for GPU-accelerated rendering. Zero-downtime rebuild uses Cosmograph collection aliases.
- SSE streaming for real-time updates
- Source Health and FOIA Tracker views

### Phase 5: Advanced Capabilities
- FOIA intelligence system (automated filing, response parsing, corpus scraping)
- Advanced detectors (cross-entity patterns, competitor convergence)
- GraphQL endpoint
- Export / bulk download
- Billing integration
- MongoDB decommissioned — `api/` server retired
