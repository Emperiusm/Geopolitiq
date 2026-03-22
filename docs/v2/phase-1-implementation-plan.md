# Phase 1: Engine Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Gambit Engine as a separate Hono server with PostgreSQL + Drizzle, unified entity model, entity seeding from MongoDB, Change Stream sync, Typesense search, and `/engine/v1/` API surface — while leaving the existing `/api/v1/` routes completely unchanged.

**Architecture:** Bun workspaces monorepo with `@gambit/common` shared package. Separate `engine/` Hono app on port 3001 reading from PostgreSQL via Drizzle ORM. PgBouncer for connection pooling. Caddy reverse proxy routes `/api/v1/*` to port 3000 and `/engine/v1/*` to port 3001. MongoDB Change Stream keeps PostgreSQL in sync. Typesense powers fuzzy entity search and resolution.

**Tech Stack:** Bun, Hono, PostgreSQL 17, Drizzle ORM, PgBouncer, Typesense 27, ClickHouse, Temporal, MinIO, Caddy, pino, Zod, Vitest, Docker Compose profiles.

**Design spec:** `docs/v2/phase-1-engine-foundation.md`

**Status:** ✅ Complete — 10/10 tasks implemented, 86 files, 6,777 lines. Branch: `feature/phase-1-engine-foundation`

---

## Table of Contents

- [x] [Task 1: Workspace Setup & Shared Package Scaffold](#task-1-workspace-setup--shared-package-scaffold) — `030c559`
- [x] [Task 2: Shared Package — Record IDs, Types, Config, Errors, Logger](#task-2-shared-package--record-ids-types-config-errors-logger) — `942f450`
- [x] [Task 3: Docker Compose Infrastructure](#task-3-docker-compose-infrastructure) — `7345375`
- [x] [Task 4: Drizzle Schema & Database Init](#task-4-drizzle-schema--database-init) — `16feabb`
- [x] [Task 5: Infrastructure Connections (Typesense, ClickHouse, MinIO, Temporal, Redis, Health)](#task-5-infrastructure-connections-typesense-clickhouse-minio-temporal-redis-health) — `a5322b2`
- [x] [Task 6: Entity Seed from MongoDB](#task-6-entity-seed-from-mongodb) — `fec5299`
- [x] [Task 7: Service Layer & Entity Routes](#task-7-service-layer--entity-routes) — `d47a28e`
- [x] [Task 8: Engine Server Startup & Integration](#task-8-engine-server-startup--integration) — `9269d44`
- [x] [Task 9: Change Stream Sync](#task-9-change-stream-sync) — `5e4cd8d`
- [x] [Task 10: Test Infrastructure & Final Verification](#task-10-test-infrastructure--final-verification) — `45766e2`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `package.json` (root) | Modify | Add `workspaces` field |
| `.gitignore` | Modify | Add engine artifacts |
| `docker-compose.yml` | Modify | Add Postgres, PgBouncer, Caddy, ClickHouse, Typesense, Temporal, MinIO, dual Redis |
| `Caddyfile` | Create | Reverse proxy config |
| `docker/clickhouse/users.xml` | Create | ClickHouse user + limits |
| `engine/package.json` | Create | Engine dependencies + scripts |
| `engine/tsconfig.json` | Create | TypeScript config |
| `engine/drizzle.config.ts` | Create | Drizzle migration config |
| `engine/vitest.config.ts` | Create | Test config |
| `engine/.env.example` | Create | Environment variable reference |
| `engine/Dockerfile.dev` | Create | Dev container with hot reload |
| `packages/common/package.json` | Create | Shared package config |
| `packages/common/tsconfig.json` | Create | Shared TypeScript config |
| `packages/common/src/index.ts` | Create | Re-exports |
| `packages/common/src/record-id.ts` | Create | RecordId type, recordId(), parseRecordId(), edgeId() |
| `packages/common/src/edges.ts` | Create | EDGE_MAPPINGS declarative config |
| `packages/common/src/types/entities.ts` | Create | Entity, EntityEdge types |
| `packages/common/src/types/auth.ts` | Create | AppVariables, UserRole, AuthProvider |
| `packages/common/src/types/api.ts` | Create | ApiMeta, ApiSuccess, ApiError |
| `packages/common/src/auth/verify-token.ts` | Create | JWT verification (pure crypto) |
| `packages/common/src/auth/hash.ts` | Create | Key hashing |
| `packages/common/src/config/schema.ts` | Create | Zod config schema |
| `packages/common/src/config/index.ts` | Create | loadConfig() |
| `packages/common/src/errors/base.ts` | Create | GambitError + subclasses |
| `packages/common/src/logger/index.ts` | Create | pino logger factory |
| `packages/common/src/validation/entity.ts` | Create | Zod schemas for entity endpoints |
| `engine/src/index.ts` | Create | Hono app + startup sequence |
| `engine/src/infrastructure/postgres.ts` | Create | PostgreSQL + Drizzle connection |
| `engine/src/infrastructure/typesense.ts` | Create | Typesense connection + collection init |
| `engine/src/infrastructure/clickhouse.ts` | Create | ClickHouse connection |
| `engine/src/infrastructure/minio.ts` | Create | MinIO connection + buckets |
| `engine/src/infrastructure/temporal.ts` | Create | Temporal client connection |
| `engine/src/infrastructure/health.ts` | Create | Per-service health checks |
| `engine/src/infrastructure/cache-layers.ts` | Create | L1 LRU + L2 Redis cache stack |
| `engine/src/infrastructure/coalesce.ts` | Create | Request coalescing |
| `engine/src/db/schema/enums.ts` | Create | PostgreSQL enum definitions |
| `engine/src/db/schema/entities.ts` | Create | entities, entity_edges, resolution tables |
| `engine/src/db/schema/auth.ts` | Create | teams, users, api_keys, sessions |
| `engine/src/db/schema/signals.ts` | Create | sources, signals (Phase 2 ready) |
| `engine/src/db/schema/analysis.ts` | Create | gap_scores, alerts, watchlists (Phase 3 ready) |
| `engine/src/db/schema/memory.ts` | Create | memory_tokens, extraction_samples (Phase 2 ready) |
| `engine/src/db/schema/operations.ts` | Create | pipeline_runs, sync_dlq, usage_records |
| `engine/src/db/schema/foia.ts` | Create | FOIA tables (Phase 5 ready) |
| `engine/src/db/schema/analytics.ts` | Create | search_analytics |
| `engine/src/db/index.ts` | Create | Schema re-exports |
| `engine/src/db/init/extensions.ts` | Create | PostGIS, pg_trgm |
| `engine/src/db/init/triggers.ts` | Create | updated_at auto-update |
| `engine/src/db/init/rls.ts` | Create | Row Level Security policies |
| `engine/src/db/init/comments.ts` | Create | Table documentation |
| `engine/src/db/init/materialized-views.ts` | Create | entity_listing view |
| `engine/src/db/init/clickhouse.ts` | Create | ClickHouse table creation |
| `engine/src/db/init/index.ts` | Create | runDatabaseInit() orchestrator |
| `engine/src/db/prepared.ts` | Create | Prepared statements |
| `engine/src/db/transaction.ts` | Create | withTransaction() wrapper |
| `engine/src/services/container.ts` | Create | ServiceContainer + factory |
| `engine/src/services/entity.service.ts` | Create | Entity CRUD, edges, resolution |
| `engine/src/services/search.service.ts` | Create | Typesense search wrapper |
| `engine/src/routes/health.ts` | Create | Health endpoint |
| `engine/src/routes/entities.ts` | Create | Entity CRUD routes |
| `engine/src/routes/admin.ts` | Create | Admin routes (seed, rebuild, verify) |
| `engine/src/middleware/error-handler.ts` | Create | GambitError → JSON |
| `engine/src/middleware/authenticate.ts` | Create | Auth via AuthProvider |
| `engine/src/middleware/db-context.ts` | Create | RLS SET LOCAL wrapper |
| `engine/src/middleware/rate-limit.ts` | Create | Redis counters + headers |
| `engine/src/middleware/request-id.ts` | Create | X-Request-Id |
| `engine/src/middleware/request-logger.ts` | Create | Structured pino logging |
| `engine/src/middleware/api-version.ts` | Create | X-API-Version headers |
| `engine/src/middleware/etag.ts` | Create | ETag + 304 |
| `engine/src/middleware/cache.ts` | Create | Response caching middleware |
| `engine/src/auth/postgres-auth-provider.ts` | Create | AuthProvider for PostgreSQL |
| `engine/src/seed/transformers.ts` | Create | ENTITY_MAPPINGS + AUTH_MAPPINGS |
| `engine/src/seed/resolvers.ts` | Create | Target resolvers for edge extraction |
| `engine/src/seed/infer-edges.ts` | Create | NSA→conflict, conflict→chokepoint |
| `engine/src/seed/validator.ts` | Create | Entity validation |
| `engine/src/seed/seed-from-mongo.ts` | Create | Seed orchestrator |
| `engine/src/sync/change-stream.ts` | Create | MongoDB Change Stream watcher |
| `engine/src/sync/neo4j-sync.ts` | Create | PostgreSQL edges → Neo4j |
| `engine/src/sync/verify-sync.ts` | Create | Consistency checker |
| `engine/src/scripts/smoke-test.sh` | Create | Post-deployment verification |
| `engine/test/setup.ts` | Create | Test DB creation + migrations |
| `engine/test/teardown.ts` | Create | Test DB cleanup |
| `engine/test/helpers/container.ts` | Create | Test ServiceContainer |
| `engine/test/helpers/fixtures.ts` | Create | Test entity factories |
| `engine/test/helpers/db.ts` | Create | resetDb() |

---

## Task 1: Workspace Setup & Shared Package Scaffold

**Files:**
- Modify: `package.json` (root)
- Modify: `.gitignore`
- Create: `packages/common/package.json`
- Create: `packages/common/tsconfig.json`
- Create: `packages/common/src/index.ts`
- Create: `engine/package.json`
- Create: `engine/tsconfig.json`
- Create: `engine/.env.example`

- [ ] **Step 1: Add workspaces to root package.json**

Add the `workspaces` field to the root `package.json`:

```json
{
  "name": "gambit",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "workspaces": ["packages/*", "api", "engine"],
  "scripts": {
    "dev": "docker compose up -d mongo redis && cd api && bun dev",
    "dev:docker": "docker compose --profile dev up -d",
    "dev:stop": "docker compose down",
    "dev:engine": "docker compose up -d mongo redis postgres pgbouncer && cd engine && bun dev",
    "staging": "cd frontend && bun run build && cd .. && docker compose --profile staging up -d --build",
    "staging:stop": "docker compose --profile staging down",
    "seed": "cd api && bun src/seed/seed-all.ts",
    "seed:engine": "cd engine && bun src/seed/seed-from-mongo.ts",
    "test": "cd api && bun test",
    "test:engine": "cd engine && bun run test",
    "test:watch": "cd api && bun test --watch",
    "typecheck": "cd api && bun run typecheck && cd ../engine && bun run typecheck",
    "backup": "docker exec gambit-mongo mongodump --db=gambit --out=/backups/manual-$(date +%Y%m%d)",
    "logs": "docker compose logs -f",
    "logs:api": "docker compose logs -f api-dev || docker compose logs -f api-staging",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 2: Create @gambit/common package scaffold**

Create `packages/common/package.json`:

```json
{
  "name": "@gambit/common",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "jose": "^6.2.1",
    "pino": "^9.6.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.7.0"
  }
}
```

Create `packages/common/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `packages/common/src/index.ts`:

```typescript
export { recordId, parseRecordId, edgeId, type RecordId } from './record-id';
export { EDGE_MAPPINGS, type EdgeMapping } from './edges';
export { loadConfig, type GambitConfig } from './config';
export { GambitError, EntityNotFoundError, ValidationError, ServiceUnavailableError, DuplicateEntityError, UnauthorizedError, ForbiddenError } from './errors/base';
export { createLogger, type Logger } from './logger';
export type { AuthProvider } from './types/auth';
export type { Entity, EntityType, EntityEdge, EntityStatus } from './types/entities';
export type { ApiMeta, ApiSuccess, ApiError } from './types/api';
```

- [ ] **Step 3: Create engine package scaffold**

Create `engine/package.json`:

```json
{
  "name": "gambit-engine",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "bun x tsc --noEmit",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "seed": "bun src/seed/seed-from-mongo.ts"
  },
  "dependencies": {
    "@gambit/common": "workspace:*",
    "@clickhouse/client": "^1.8.0",
    "@temporalio/client": "^1.11.0",
    "drizzle-orm": "^0.38.0",
    "hono": "^4.7.0",
    "lru-cache": "^11.0.0",
    "minio": "^8.0.0",
    "mongodb": "^6.12.0",
    "neo4j-driver": "^6.0.1",
    "postgres": "^3.4.0",
    "typesense": "^2.0.0",
    "zod": "^3.24.0",
    "@hono/zod-validator": "^0.4.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "drizzle-kit": "^0.30.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

Create `engine/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": ".",
    "types": ["bun-types"]
  },
  "include": ["src/**/*.ts", "test/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

Create `engine/.env.example`:

```env
# Engine
ENGINE_PORT=3001

# PostgreSQL (via PgBouncer)
POSTGRES_URL=postgresql://gambit:gambit@localhost:6432/gambit

# ClickHouse
CLICKHOUSE_URL=http://localhost:8123

# Typesense
TYPESENSE_URL=http://localhost:8108
TYPESENSE_API_KEY=gambit-dev

# Temporal
TEMPORAL_ADDRESS=localhost:7233

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=gambit
MINIO_SECRET_KEY=gambit-dev

# MongoDB (for sync)
MONGO_URI=mongodb://localhost:27017/gambit

# Redis
REDIS_CACHE_URL=redis://localhost:6380
REDIS_PERSISTENT_URL=redis://localhost:6381

# Auth
JWT_SECRET=gambit-dev-secret-change-in-production

# Logging
LOG_LEVEL=info
```

- [ ] **Step 4: Update .gitignore**

Add engine-specific entries to `.gitignore`:

```
# Engine artifacts
engine/dist/
engine/src/db/migrations/
```

- [ ] **Step 5: Install dependencies**

```bash
cd C:\Users\slabl\Documents\GitHub\Geopolitiq && bun install
```

Expected: installs all workspace dependencies, links `@gambit/common` to `engine/`.

- [ ] **Step 6: Verify workspace resolution**

```bash
cd engine && bun run typecheck
```

Expected: may have errors (no source files yet), but should NOT have "Cannot find module '@gambit/common'" errors.

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore packages/ engine/package.json engine/tsconfig.json engine/.env.example
git commit -m "feat: scaffold Bun workspace with @gambit/common and engine packages"
```

---

## Task 2: Shared Package — Record IDs, Types, Config, Errors, Logger

**Files:**
- Create: `packages/common/src/record-id.ts`
- Create: `packages/common/src/types/entities.ts`
- Create: `packages/common/src/types/auth.ts`
- Create: `packages/common/src/types/api.ts`
- Create: `packages/common/src/config/schema.ts`
- Create: `packages/common/src/config/index.ts`
- Create: `packages/common/src/errors/base.ts`
- Create: `packages/common/src/logger/index.ts`
- Create: `packages/common/src/edges.ts`
- Create: `packages/common/src/validation/entity.ts`
- Test: `packages/common/src/record-id.test.ts`

- [ ] **Step 1: Create record-id with tests**

Create `packages/common/src/record-id.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { recordId, parseRecordId, edgeId } from './record-id';

describe('recordId', () => {
  it('creates a type:slug format', () => {
    expect(recordId('company', 'nvidia')).toBe('company:nvidia');
    expect(recordId('country', 'united-states')).toBe('country:united-states');
  });

  it('handles hyphens and underscores in slug', () => {
    expect(recordId('trade-route', 'china-europe-suez')).toBe('trade-route:china-europe-suez');
  });
});

describe('parseRecordId', () => {
  it('parses type and slug', () => {
    expect(parseRecordId('company:nvidia')).toEqual({ type: 'company', slug: 'nvidia' });
    expect(parseRecordId('trade-route:china-europe-suez')).toEqual({ type: 'trade-route', slug: 'china-europe-suez' });
  });

  it('handles slugs with colons', () => {
    expect(parseRecordId('base:camp:david')).toEqual({ type: 'base', slug: 'camp:david' });
  });
});

describe('edgeId', () => {
  it('creates deterministic edge IDs', () => {
    const id = edgeId('conflict:israel-hamas', 'involves', 'country:israel');
    expect(id).toBe('edge--conflict:israel-hamas--involves--country:israel');
  });

  it('produces same ID for same inputs', () => {
    const a = edgeId('base:ramstein', 'hosted-by', 'country:germany');
    const b = edgeId('base:ramstein', 'hosted-by', 'country:germany');
    expect(a).toBe(b);
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd packages/common && bun test src/record-id.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement record-id**

Create `packages/common/src/record-id.ts`:

```typescript
export type RecordId = `${string}:${string}`;

export function recordId(type: string, slug: string): RecordId {
  return `${type}:${slug}` as RecordId;
}

export function parseRecordId(id: RecordId | string): { type: string; slug: string } {
  const colonIdx = id.indexOf(':');
  if (colonIdx === -1) throw new Error(`Invalid record ID: ${id}`);
  return {
    type: id.slice(0, colonIdx),
    slug: id.slice(colonIdx + 1),
  };
}

export function edgeId(fromId: string, relation: string, toId: string): string {
  return `edge--${fromId}--${relation}--${toId}`;
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd packages/common && bun test src/record-id.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Create type definitions**

Create `packages/common/src/types/entities.ts`:

```typescript
export type EntityType =
  | 'company' | 'country' | 'government' | 'organization' | 'person'
  | 'conflict' | 'chokepoint' | 'base' | 'trade-route' | 'port'
  | 'nsa' | 'election';

export type EntityStatus = 'active' | 'acquired' | 'dissolved' | 'merged' | 'inactive' | 'unverified';

export interface Entity {
  id: string;
  type: EntityType;
  name: string;
  aliases: string[];
  parentId?: string | null;
  status: EntityStatus;
  statusDetail?: string | null;
  statusAt?: Date | null;
  sector?: string | null;
  jurisdiction?: string | null;
  domains: string[];
  lat?: string | null;
  lng?: string | null;
  externalIds: Record<string, string>;
  tags: string[];
  risk?: string | null;
  ticker?: string | null;
  iso2?: string | null;
  meta: Record<string, any>;
  signalCountDeclarative: number;
  signalCountBehavioral: number;
  realityScore?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EntityEdge {
  id: string;
  fromId: string;
  toId: string;
  relation: string;
  weight: string;
  source: string;
  meta: Record<string, any>;
  createdAt: Date;
}
```

Create `packages/common/src/types/auth.ts`:

```typescript
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export type PlatformRole = 'admin' | 'user';
export type TeamTier = 'free' | 'pro' | 'enterprise';
export type ApiKeyScope = 'read' | 'read-write';
export type AuthMethod = 'jwt' | 'apikey' | 'dev';

export interface AppVariables {
  userId: string;
  teamId: string;
  role: UserRole;
  platformRole: PlatformRole;
  authMethod: AuthMethod;
  scope: ApiKeyScope;
  tier: TeamTier;
  roleVersion: number;
  apiKeyMeta: { id: string; name: string; prefix: string };
  requestId: string;
}

export interface AuthProvider {
  findUserById(id: string): Promise<AuthUser | null>;
  findApiKeyByHash(hash: string): Promise<AuthApiKey | null>;
  findSession(id: string): Promise<AuthSession | null>;
  findTeamById(id: string): Promise<AuthTeam | null>;
}

export interface AuthUser {
  id: string;
  email: string;
  teamId: string;
  role: UserRole;
  platformRole: PlatformRole;
  roleVersion?: number;
  deletedAt?: Date | null;
}

export interface AuthApiKey {
  id: string;
  keyHash: string;
  teamId: string;
  userId: string;
  name: string;
  scopes: string[];
  disabled?: boolean;
  expiresAt?: Date | null;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface AuthTeam {
  id: string;
  name: string;
  slug: string;
  tier: TeamTier;
}
```

Create `packages/common/src/types/api.ts`:

```typescript
export interface ApiMeta {
  total?: number;
  limit?: number;
  offset?: number;
  cursor?: string | null;
  hasMore?: boolean;
  cached?: boolean;
  searchTimeMs?: number;
  computedAt?: string;
  tier?: string;
  usage?: { requestsToday: number; limit: number };
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export function success<T>(data: T, meta: ApiMeta = {}): ApiSuccess<T> {
  return { data, meta };
}
```

- [ ] **Step 6: Create error classes**

Create `packages/common/src/errors/base.ts`:

```typescript
export class GambitError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'GambitError';
  }
}

export class EntityNotFoundError extends GambitError {
  constructor(id: string) {
    super('ENTITY_NOT_FOUND', `Entity ${id} not found`, 404, { id });
  }
}

export class ValidationError extends GambitError {
  constructor(message: string, context?: Record<string, any>) {
    super('VALIDATION_ERROR', message, 400, context);
  }
}

export class DuplicateEntityError extends GambitError {
  constructor(id: string) {
    super('DUPLICATE_ENTITY', `Entity ${id} already exists`, 409, { id });
  }
}

export class UnauthorizedError extends GambitError {
  constructor(message = 'Authentication required') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends GambitError {
  constructor(message = 'Insufficient permissions') {
    super('FORBIDDEN', message, 403);
  }
}

export class ServiceUnavailableError extends GambitError {
  constructor(service: string) {
    super('SERVICE_UNAVAILABLE', `${service} is not available`, 503, { service });
  }
}
```

- [ ] **Step 7: Create config module**

Create `packages/common/src/config/schema.ts`:

```typescript
import { z } from 'zod';

export const configSchema = z.object({
  engine: z.object({
    port: z.coerce.number().default(3001),
  }),
  postgres: z.object({
    url: z.string().default('postgresql://gambit:gambit@localhost:6432/gambit'),
  }),
  mongo: z.object({
    uri: z.string().default('mongodb://localhost:27017/gambit'),
  }),
  redis: z.object({
    cacheUrl: z.string().default('redis://localhost:6380'),
    persistentUrl: z.string().default('redis://localhost:6381'),
  }),
  clickhouse: z.object({
    url: z.string().optional(),
  }),
  typesense: z.object({
    url: z.string().optional(),
    apiKey: z.string().default('gambit-dev'),
  }),
  temporal: z.object({
    address: z.string().optional(),
  }),
  minio: z.object({
    endpoint: z.string().optional(),
    accessKey: z.string().default('gambit'),
    secretKey: z.string().default('gambit-dev'),
  }),
  auth: z.object({
    jwtSecret: z.string().default('gambit-dev-secret-change-in-production'),
  }),
  log: z.object({
    level: z.string().default('info'),
  }),
});
```

Create `packages/common/src/config/index.ts`:

```typescript
import { configSchema } from './schema';

export type GambitConfig = ReturnType<typeof loadConfig>;

export function loadConfig() {
  return configSchema.parse({
    engine: { port: process.env.ENGINE_PORT },
    postgres: { url: process.env.POSTGRES_URL },
    mongo: { uri: process.env.MONGO_URI },
    redis: {
      cacheUrl: process.env.REDIS_CACHE_URL,
      persistentUrl: process.env.REDIS_PERSISTENT_URL,
    },
    clickhouse: { url: process.env.CLICKHOUSE_URL },
    typesense: {
      url: process.env.TYPESENSE_URL,
      apiKey: process.env.TYPESENSE_API_KEY,
    },
    temporal: { address: process.env.TEMPORAL_ADDRESS },
    minio: {
      endpoint: process.env.MINIO_ENDPOINT,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    },
    auth: { jwtSecret: process.env.JWT_SECRET },
    log: { level: process.env.LOG_LEVEL },
  });
}
```

- [ ] **Step 8: Create logger module**

Create `packages/common/src/logger/index.ts`:

```typescript
import pino from 'pino';

export type Logger = pino.Logger;

export function createLogger(service: string): Logger {
  return pino({
    name: service,
    level: process.env.LOG_LEVEL ?? 'info',
    formatters: {
      level: (label) => ({ level: label }),
    },
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  });
}
```

- [ ] **Step 9: Create edge mappings**

Create `packages/common/src/edges.ts`:

```typescript
export interface EdgeMapping {
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

export const EDGE_MAPPINGS: EdgeMapping[] = [
  {
    sourceCollection: 'conflicts',
    sourceType: 'conflict',
    edges: [
      { field: 'relatedCountries', fieldType: 'array', targetType: 'country',
        relation: 'involves', weight: 1.0, bidirectional: true, reverseRelation: 'involved-in',
        targetResolver: 'iso2-or-name' },
    ],
  },
  {
    sourceCollection: 'bases',
    sourceType: 'base',
    edges: [
      { field: 'hostNation', fieldType: 'string', targetType: 'country',
        relation: 'hosted-by', weight: 1.0, targetResolver: 'country-name' },
      { field: 'operatingCountry', fieldType: 'string', targetType: 'country',
        relation: 'operated-by', weight: 1.0, targetResolver: 'country-name' },
    ],
  },
  {
    sourceCollection: 'chokepoints',
    sourceType: 'chokepoint',
    edges: [
      { field: 'dependentCountries', fieldType: 'array', targetType: 'country',
        relation: 'depends-on', weight: 0.8, bidirectional: true, reverseRelation: 'dependent-on',
        targetResolver: 'country-name' },
    ],
  },
  {
    sourceCollection: 'nonStateActors',
    sourceType: 'nsa',
    edges: [
      { field: 'allies', fieldType: 'array', targetType: 'country',
        relation: 'ally-of', weight: 0.7, targetResolver: 'country-name' },
      { field: 'rivals', fieldType: 'array', targetType: 'country',
        relation: 'rival-of', weight: 0.7, targetResolver: 'country-name' },
    ],
  },
  {
    sourceCollection: 'tradeRoutes',
    sourceType: 'trade-route',
    edges: [
      { field: 'from', fieldType: 'string', targetType: 'port', relation: 'originates-at', weight: 1.0 },
      { field: 'to', fieldType: 'string', targetType: 'port', relation: 'terminates-at', weight: 1.0 },
      { field: 'waypoints', fieldType: 'array', targetType: 'chokepoint', relation: 'passes-through', weight: 0.9 },
    ],
  },
  {
    sourceCollection: 'ports',
    sourceType: 'port',
    edges: [
      { field: 'country', fieldType: 'string', targetType: 'country',
        relation: 'port-in', weight: 1.0, targetResolver: 'country-name' },
    ],
  },
  {
    sourceCollection: 'elections',
    sourceType: 'election',
    edges: [
      { field: 'countryISO2', fieldType: 'string', targetType: 'country',
        relation: 'election-in', weight: 1.0, targetResolver: 'iso2-or-name' },
    ],
  },
];
```

- [ ] **Step 10: Create validation schemas**

Create `packages/common/src/validation/entity.ts`:

```typescript
import { z } from 'zod';

export const entityListSchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  status: z.string().default('active'),
  risk: z.string().optional(),
  sector: z.string().optional(),
  domain: z.string().optional(),
  tag: z.string().optional(),
  sortBy: z.enum(['updated_at', 'name', 'reality_score']).default('updated_at'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

export const entityResolveSchema = z.object({
  query: z.string().min(1),
  type: z.string().optional(),
});

export const entityBatchSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
});

export type EntityListParams = z.infer<typeof entityListSchema>;
export type EntityResolveParams = z.infer<typeof entityResolveSchema>;
export type EntityBatchParams = z.infer<typeof entityBatchSchema>;
```

- [ ] **Step 11: Update index.ts exports**

Update `packages/common/src/index.ts` to include all new modules (already written in Step 2).

- [ ] **Step 12: Run typecheck**

```bash
cd packages/common && bun x tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 13: Commit**

```bash
git add packages/common/
git commit -m "feat: implement @gambit/common — record IDs, types, config, errors, logger, edge mappings"
```

---

## Task 3: Docker Compose Infrastructure

**Files:**
- Modify: `docker-compose.yml`
- Create: `Caddyfile`
- Create: `docker/clickhouse/users.xml`
- Create: `engine/Dockerfile.dev`

This task is infrastructure only — no application code. The full Docker Compose changes are extensive. See the Phase 1 spec Section 3 for the complete service list.

- [ ] **Step 1: Create ClickHouse config**

Create `docker/clickhouse/users.xml`:

```xml
<clickhouse>
  <users>
    <gambit>
      <password>gambit-dev</password>
      <networks><ip>::/0</ip></networks>
      <profile>default</profile>
      <quota>default</quota>
      <max_memory_usage>2000000000</max_memory_usage>
      <max_execution_time>30</max_execution_time>
    </gambit>
  </users>
</clickhouse>
```

- [ ] **Step 2: Create Caddyfile**

Create `Caddyfile`:

```
:80 {
    handle /api/v1/events/* {
        reverse_proxy api-dev:3000 {
            flush_interval -1
            transport http {
                read_timeout 0
            }
        }
    }
    handle /engine/v1/stream/* {
        reverse_proxy engine-dev:3001 {
            flush_interval -1
            transport http {
                read_timeout 0
            }
        }
    }
    handle /api/v1/* {
        reverse_proxy api-dev:3000
    }
    handle /engine/v1/* {
        reverse_proxy engine-dev:3001
    }
    handle /temporal/* {
        reverse_proxy temporal-ui:8080
    }
    handle /minio/* {
        reverse_proxy minio:9001
    }
    handle {
        reverse_proxy frontend-dev:5200
    }
}
```

- [ ] **Step 3: Create engine Dockerfile.dev**

Create `engine/Dockerfile.dev`:

```dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/common/package.json packages/common/
COPY engine/package.json engine/

RUN bun install

COPY packages/common/ packages/common/
COPY engine/ engine/

WORKDIR /app/engine
CMD ["bun", "--watch", "src/index.ts"]
```

- [ ] **Step 4: Update docker-compose.yml**

Add the new services to `docker-compose.yml`. This is a large change — add the following services alongside the existing ones (do NOT remove any existing services):

**Add to base services (no profile):**
- `postgres` (port 5432, healthcheck)
- `pgbouncer` (port 6432, depends on postgres)
- `redis-persistent` (port 6381, AOF persistence)
- `caddy` (port 80)

**Add with `engine` profile:**
- `clickhouse` (ports 8123, 9100)
- `typesense` (port 8108)
- `postgres-temporal` (internal, healthcheck)
- `temporal` (port 7233, depends on postgres-temporal)
- `temporal-ui` (port 8080)
- `minio` (ports 9000, 9001)
- `minio-init` (bucket creation)
- `engine-dev` (port 3001)

**Add with `observability` profile:**
- `tempo` (ports 3200, 4317)
- `grafana` (port 3000)

**Add with `test` profile:**
- `postgres-test` (port 5433, tmpfs)

**Add volumes:**
- `pgdata`, `pg_temporal_data`, `clickhouse_data`, `typesense_data`, `minio_data`, `redis_persistent_data`, `caddy_data`, `grafana_data`

Refer to the Phase 1 spec Section 3 for exact service definitions with environment variables, healthchecks, and depends_on conditions.

- [ ] **Step 5: Create .dockerignore**

Create `.dockerignore`:

```
node_modules
.git
.worktrees
.firecrawl
.playwright-mcp
.superpowers
*.tar.gz
dist
frontend/node_modules
api/node_modules
engine/node_modules
```

- [ ] **Step 6: Verify core services start**

```bash
docker compose up -d mongo redis postgres pgbouncer caddy
```

Expected: all 5 services start. Verify with:

```bash
docker compose ps
```

- [ ] **Step 7: Verify PostgreSQL is reachable through PgBouncer**

```bash
docker exec -it $(docker compose ps -q pgbouncer) sh -c "nc -z localhost 6432 && echo OK"
```

Expected: `OK`

- [ ] **Step 8: Verify engine profile services start**

```bash
docker compose --profile engine up -d
```

Expected: all engine profile services start (clickhouse, typesense, temporal, minio, etc.).

- [ ] **Step 9: Stop all and commit**

```bash
docker compose --profile engine down
git add docker-compose.yml Caddyfile docker/ engine/Dockerfile.dev .dockerignore
git commit -m "feat: add Docker Compose infrastructure — Postgres, PgBouncer, Caddy, ClickHouse, Typesense, Temporal, MinIO"
```

---

## Task 4: Drizzle Schema & Database Init

**Files:**
- Create: `engine/drizzle.config.ts`
- Create: `engine/src/db/schema/enums.ts`
- Create: `engine/src/db/schema/entities.ts`
- Create: `engine/src/db/schema/auth.ts`
- Create: `engine/src/db/schema/signals.ts`
- Create: `engine/src/db/schema/analysis.ts`
- Create: `engine/src/db/schema/memory.ts`
- Create: `engine/src/db/schema/operations.ts`
- Create: `engine/src/db/schema/foia.ts`
- Create: `engine/src/db/schema/analytics.ts`
- Create: `engine/src/db/index.ts`
- Create: `engine/src/db/transaction.ts`
- Create: `engine/src/db/init/extensions.ts`
- Create: `engine/src/db/init/triggers.ts`
- Create: `engine/src/db/init/rls.ts`
- Create: `engine/src/db/init/comments.ts`
- Create: `engine/src/db/init/materialized-views.ts`
- Create: `engine/src/db/init/clickhouse.ts`
- Create: `engine/src/db/init/index.ts`
- Create: `engine/src/infrastructure/postgres.ts`

This is the largest task — all table definitions from the Phase 1 spec Section 4. The exact schema code is in the spec. Each schema file should match the spec's Drizzle definitions exactly, including all indexes, enums, foreign keys, and cascade rules.

- [ ] **Step 1: Create drizzle.config.ts**

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/*',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? 'postgresql://gambit:gambit@localhost:6432/gambit',
  },
});
```

- [ ] **Step 2: Create enum definitions**

Create `engine/src/db/schema/enums.ts` with all PostgreSQL enums from the spec: `entityTypeEnum`, `entityStatusEnum`, `polarityEnum`, `teamTierEnum`, `userRoleEnum`, `alertSeverityEnum`, `verificationEnum`, `parserModeEnum`.

- [ ] **Step 3: Create entities schema**

Create `engine/src/db/schema/entities.ts` with `entities`, `entityEdges`, `resolutionAliases`, `resolutionFeedback` tables per spec Section 4. Include all indexes (GIN for arrays, GIST for PostGIS, partial indexes for active entities).

- [ ] **Step 4: Create auth schema**

Create `engine/src/db/schema/auth.ts` with `teams`, `users`, `apiKeys`, `sessions`, `auditLog` tables per spec.

- [ ] **Step 5: Create remaining schema files**

Create `engine/src/db/schema/signals.ts`, `analysis.ts`, `memory.ts`, `operations.ts` (with `syncDlq`), `foia.ts`, `analytics.ts` per spec. These are mostly Phase 2+ tables created empty.

- [ ] **Step 6: Create schema index**

Create `engine/src/db/index.ts` re-exporting all schema files.

- [ ] **Step 7: Create transaction helper**

Create `engine/src/db/transaction.ts`:

```typescript
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type DrizzleClient = PostgresJsDatabase<Record<string, never>>;
export type DrizzleTransaction = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

export async function withTransaction<T>(
  db: DrizzleClient,
  work: (tx: DrizzleTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => work(tx));
}
```

- [ ] **Step 8: Create PostgreSQL connection**

Create `engine/src/infrastructure/postgres.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { GambitConfig } from '@gambit/common';
import type { Logger } from '@gambit/common';
import type { DrizzleClient } from '../db/transaction';

let db: DrizzleClient;
let sql: ReturnType<typeof postgres>;

export async function connectPostgres(config: GambitConfig, logger: Logger): Promise<DrizzleClient> {
  sql = postgres(config.postgres.url, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
  });

  db = drizzle(sql);

  // Verify connection
  await sql`SELECT 1`;
  logger.info('PostgreSQL connected');

  // Warm pool
  const warmPromises = Array.from({ length: 5 }, () => sql`SELECT 1`);
  await Promise.all(warmPromises);
  logger.info({ poolSize: 5 }, 'PostgreSQL pool warmed');

  return db;
}

export function getDb(): DrizzleClient {
  if (!db) throw new Error('PostgreSQL not connected');
  return db;
}

export async function closePgPool(): Promise<void> {
  if (sql) await sql.end();
}
```

- [ ] **Step 9: Create database init modules**

Create `engine/src/db/init/extensions.ts`:

```typescript
import type { DrizzleClient } from '../transaction';

export async function createExtensions(db: DrizzleClient) {
  await db.execute('CREATE EXTENSION IF NOT EXISTS postgis');
  await db.execute('CREATE EXTENSION IF NOT EXISTS pg_trgm');
}
```

Create `engine/src/db/init/triggers.ts` with the `updated_at` trigger function and per-table triggers.

Create `engine/src/db/init/rls.ts` with RLS policies for tenant-scoped tables (watchlists, alerts, foia_requests, usage_records, webhook_deliveries, api_keys). NOT audit_log (global).

Create `engine/src/db/init/comments.ts` with `COMMENT ON TABLE/COLUMN` statements.

Create `engine/src/db/init/materialized-views.ts` with the `entity_listing` materialized view.

Create `engine/src/db/init/clickhouse.ts` with `signal_analytics` and `gap_score_history` ClickHouse table creation.

Create `engine/src/db/init/index.ts` orchestrating all init steps:

```typescript
import type { DrizzleClient } from '../transaction';
import type { Logger } from '@gambit/common';
import { createExtensions } from './extensions';
import { createTriggers } from './triggers';
import { createRlsPolicies } from './rls';
import { createComments } from './comments';
import { createMaterializedViews } from './materialized-views';

export async function runDatabaseInit(db: DrizzleClient, logger: Logger): Promise<void> {
  await createExtensions(db);
  logger.info('PostgreSQL extensions created');

  await createTriggers(db);
  logger.info('Updated_at triggers created');

  await createRlsPolicies(db);
  logger.info('RLS policies applied');

  await createComments(db);
  logger.info('Table comments applied');

  await createMaterializedViews(db);
  logger.info('Materialized views created');
}
```

- [ ] **Step 10: Push schema to PostgreSQL**

```bash
cd engine && POSTGRES_URL=postgresql://gambit:gambit@localhost:5432/gambit bun run db:push
```

Expected: all tables created. Verify:

```bash
docker exec -it $(docker compose ps -q postgres) psql -U gambit -c "\dt"
```

Expected: lists all tables (entities, entity_edges, teams, users, etc.).

- [ ] **Step 11: Run database init**

Create a temporary script to test init:

```bash
cd engine && POSTGRES_URL=postgresql://gambit:gambit@localhost:5432/gambit bun -e "
  import { connectPostgres } from './src/infrastructure/postgres';
  import { runDatabaseInit } from './src/db/init';
  import { createLogger } from '@gambit/common';
  const logger = createLogger('init-test');
  const db = await connectPostgres({ postgres: { url: 'postgresql://gambit:gambit@localhost:5432/gambit' } }, logger);
  await runDatabaseInit(db, logger);
  console.log('Done');
  process.exit(0);
"
```

Expected: all init steps run without error.

- [ ] **Step 12: Commit**

```bash
git add engine/drizzle.config.ts engine/src/db/ engine/src/infrastructure/postgres.ts
git commit -m "feat: add Drizzle schema (15+ tables) and database init — PostGIS, triggers, RLS, materialized views"
```

---

## Task 5: Infrastructure Connections (Typesense, ClickHouse, MinIO, Temporal, Redis, Health)

**Files:**
- Create: `engine/src/infrastructure/typesense.ts`
- Create: `engine/src/infrastructure/clickhouse.ts`
- Create: `engine/src/infrastructure/minio.ts`
- Create: `engine/src/infrastructure/temporal.ts`
- Create: `engine/src/infrastructure/health.ts`
- Create: `engine/src/infrastructure/cache-layers.ts`
- Create: `engine/src/infrastructure/coalesce.ts`

Each connection follows the graceful degradation pattern: attempt connection, return client or null, log warning if unavailable.

- [ ] **Step 1: Create all connection modules**

Each module follows the same pattern — see spec Section 7 for Typesense, Section 9 for cache layers. Implement `connectTypesense`, `connectClickhouse`, `connectMinio`, `connectTemporal`, plus the LRU + Redis cache stack and request coalescing utility.

- [ ] **Step 2: Create health check module**

Create `engine/src/infrastructure/health.ts` with per-service health checks that return `'ok' | 'down' | 'not-configured'`.

- [ ] **Step 3: Verify connections**

Start engine profile services:

```bash
docker compose --profile engine up -d
```

Test each connection with a temporary script that calls each `connect*` function.

- [ ] **Step 4: Commit**

```bash
git add engine/src/infrastructure/
git commit -m "feat: add infrastructure connections — Typesense, ClickHouse, MinIO, Temporal, Redis, health checks, cache layers"
```

---

## Task 6: Entity Seed from MongoDB

**Files:**
- Create: `engine/src/seed/transformers.ts`
- Create: `engine/src/seed/resolvers.ts`
- Create: `engine/src/seed/infer-edges.ts`
- Create: `engine/src/seed/validator.ts`
- Create: `engine/src/seed/seed-from-mongo.ts`
- Test: `engine/test/integration/seed.test.ts`

- [ ] **Step 1: Create entity transformers**

Create `engine/src/seed/transformers.ts` with `ENTITY_MAPPINGS` (8 MongoDB collections → entity schema) and `AUTH_MAPPINGS` (teams, users, apiKeys, sessions). Per spec Section 5.

- [ ] **Step 2: Create target resolvers**

Create `engine/src/seed/resolvers.ts` with `buildResolverContext()` and `TARGET_RESOLVERS` (default, iso2-or-name, country-name). Per spec Section 5.

- [ ] **Step 3: Create edge inference**

Create `engine/src/seed/infer-edges.ts` with `inferNsaConflictEdges()` and `inferConflictChokepointEdges()`. Per spec Section 5.

- [ ] **Step 4: Create validator**

Create `engine/src/seed/validator.ts` with `validateEntity()` — checks record ID format, required fields, coordinate ranges, parent references.

- [ ] **Step 5: Create seed orchestrator**

Create `engine/src/seed/seed-from-mongo.ts` with `seedFromMongo()` per spec Section 5. Seed order: auth → entities → edges (declarative + inferred) → resolution aliases → Typesense sync. Uses batch inserts with `onConflictDoUpdate` for idempotency.

- [ ] **Step 6: Write seed integration test**

Create `engine/test/integration/seed.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
// Tests require running MongoDB and PostgreSQL
// Seed a small fixture set, verify entities + edges in PostgreSQL

describe('seedFromMongo', () => {
  it('seeds entities from MongoDB to PostgreSQL', async () => {
    // verify entity count matches MongoDB
  });

  it('extracts edges from embedded arrays', async () => {
    // verify edge count > 0
    // verify a known edge exists (e.g., conflict:x involves country:y)
  });

  it('skips invalid entities and reports them', async () => {
    // verify report.invalid > 0 for known bad data
  });

  it('is idempotent — running twice produces same result', async () => {
    // seed, count, seed again, count again — same numbers
  });
});
```

- [ ] **Step 7: Run seed against real MongoDB**

```bash
cd engine && POSTGRES_URL=postgresql://gambit:gambit@localhost:5432/gambit MONGO_URI=mongodb://localhost:27017/gambit bun src/seed/seed-from-mongo.ts
```

Expected: seed report showing entities inserted, edges extracted, aliases created.

- [ ] **Step 8: Verify data in PostgreSQL**

```bash
docker exec -it $(docker compose ps -q postgres) psql -U gambit -c "SELECT type, count(*) FROM entities GROUP BY type ORDER BY count DESC"
```

Expected: counts per entity type matching MongoDB.

- [ ] **Step 9: Commit**

```bash
git add engine/src/seed/ engine/test/
git commit -m "feat: add entity seed from MongoDB — transformers, resolvers, edge inference, validation"
```

---

## Task 7: Service Layer & Entity Routes

**Files:**
- Create: `engine/src/services/container.ts`
- Create: `engine/src/services/entity.service.ts`
- Create: `engine/src/services/search.service.ts`
- Create: `engine/src/middleware/error-handler.ts`
- Create: `engine/src/middleware/authenticate.ts`
- Create: `engine/src/middleware/db-context.ts`
- Create: `engine/src/middleware/rate-limit.ts`
- Create: `engine/src/middleware/request-id.ts`
- Create: `engine/src/middleware/request-logger.ts`
- Create: `engine/src/middleware/api-version.ts`
- Create: `engine/src/middleware/etag.ts`
- Create: `engine/src/middleware/cache.ts`
- Create: `engine/src/auth/postgres-auth-provider.ts`
- Create: `engine/src/routes/health.ts`
- Create: `engine/src/routes/entities.ts`
- Create: `engine/src/routes/admin.ts`
- Create: `engine/src/db/prepared.ts`
- Test: `engine/test/integration/entity.service.test.ts`

- [ ] **Step 1: Create service container**

Create `engine/src/services/container.ts` with `ServiceContainer` interface and `createServiceContainer()` factory per spec Section 8.

- [ ] **Step 2: Create entity service**

Create `engine/src/services/entity.service.ts` with `findById`, `findByIds`, `list` (cursor pagination), `getEdges`, `resolve` (PostgreSQL alias match → Typesense fallback). Per spec Section 8.

- [ ] **Step 3: Create search service**

Create `engine/src/services/search.service.ts` with `search`, `resolve`, `searchNearby`, `upsertEntities`, `rebuildIndex`. Per spec Section 7.

- [ ] **Step 4: Create prepared statements**

Create `engine/src/db/prepared.ts` with prepared queries for `entityById`, `entityByTicker`, `entityByIso2`, `entityEdges`.

- [ ] **Step 5: Create middleware stack**

Create all middleware files per spec Section 8:
- `error-handler.ts` — catches GambitError, returns JSON
- `authenticate.ts` — JWT/API key via AuthProvider
- `db-context.ts` — wraps request in transaction with `SET LOCAL app.team_id`
- `rate-limit.ts` — Redis counters + X-RateLimit headers
- `request-id.ts` — generates + sets X-Request-Id
- `request-logger.ts` — pino structured logging, slow request warnings
- `api-version.ts` — X-API-Version, X-Engine-Version headers
- `etag.ts` — ETag + 304 Not Modified
- `cache.ts` — Redis response caching middleware

- [ ] **Step 6: Create auth provider**

Create `engine/src/auth/postgres-auth-provider.ts` implementing `AuthProvider` interface, reading from PostgreSQL teams/users/api_keys/sessions tables.

- [ ] **Step 7: Create route handlers**

Create `engine/src/routes/health.ts` — per-service health + sync health.
Create `engine/src/routes/entities.ts` — GET list, GET :id, POST resolve, POST batch, GET :id/edges, stubs for signals/scores/alerts.
Create `engine/src/routes/admin.ts` — POST seed, POST rebuild-index, POST verify-sync, GET sync-dlq, POST neo4j-sync.

- [ ] **Step 8: Write entity service tests**

Create `engine/test/integration/entity.service.test.ts`:

```typescript
describe('EntityService', () => {
  it('findById returns entity by record ID', async () => {});
  it('findById throws EntityNotFoundError for missing entity', async () => {});
  it('list returns paginated results with cursor', async () => {});
  it('list filters by type', async () => {});
  it('getEdges returns edges for entity', async () => {});
  it('resolve matches by ticker', async () => {});
  it('resolve matches by ISO2', async () => {});
  it('resolve falls back to alias match', async () => {});
});
```

- [ ] **Step 9: Run tests**

```bash
cd engine && bun run test
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add engine/src/services/ engine/src/middleware/ engine/src/auth/ engine/src/routes/ engine/src/db/prepared.ts engine/test/
git commit -m "feat: add entity service, middleware stack, routes, and auth provider"
```

---

## Task 8: Engine Server Startup & Integration

**Files:**
- Create: `engine/src/index.ts`
- Create: `engine/src/scripts/smoke-test.sh`

- [ ] **Step 1: Create engine entry point**

Create `engine/src/index.ts` with the full startup sequence from spec Section 8:

1. Load config
2. Connect PostgreSQL (fatal)
3. Run database init
4. Connect optional services
5. Connect MongoDB
6. Configure Typesense
7. Create MinIO buckets
8. Build service container
9. Start Change Stream sync
10. Run self-check
11. Start HTTP server

Mount the Hono app with the full middleware stack and routes.

- [ ] **Step 2: Create smoke test script**

Create `engine/src/scripts/smoke-test.sh`:

```bash
#!/bin/bash
set -e
echo "=== Gambit Engine Smoke Test ==="
echo "Health..." && curl -sf localhost:3001/engine/v1/health | jq .status
echo "Entities..." && curl -sf "localhost:3001/engine/v1/entities?limit=3" | jq '.meta.total'
echo "Entity detail..." && curl -sf localhost:3001/engine/v1/entities/country:united-states | jq '.data.name'
echo "Resolve..." && curl -sf -X POST localhost:3001/engine/v1/entities/resolve -H 'Content-Type: application/json' -d '{"query":"USA"}' | jq '.data.match.id'
echo "Legacy API..." && curl -sf localhost:3000/api/v1/health | jq .
echo "=== All checks passed ==="
```

- [ ] **Step 3: Start engine and verify**

```bash
cd engine && bun run dev
```

In another terminal:

```bash
curl http://localhost:3001/engine/v1/health | jq .
```

Expected: JSON with service statuses.

```bash
curl "http://localhost:3001/engine/v1/entities?limit=5" | jq '.meta.total'
```

Expected: entity count > 0 (from seed).

- [ ] **Step 4: Verify legacy API is unchanged**

```bash
curl http://localhost:3000/api/v1/health | jq .
curl "http://localhost:3000/api/v1/countries?limit=3" | jq '.meta.total'
```

Expected: both work exactly as before.

- [ ] **Step 5: Run smoke test**

```bash
bash engine/src/scripts/smoke-test.sh
```

Expected: all checks pass.

- [ ] **Step 6: Commit**

```bash
git add engine/src/index.ts engine/src/scripts/
git commit -m "feat: add engine server entry point with full startup sequence and smoke test"
```

---

## Task 9: Change Stream Sync

**Files:**
- Create: `engine/src/sync/change-stream.ts`
- Create: `engine/src/sync/neo4j-sync.ts`
- Create: `engine/src/sync/verify-sync.ts`

- [ ] **Step 1: Create Change Stream watcher**

Create `engine/src/sync/change-stream.ts` with the `ChangeStreamSync` class per spec Section 6. Implements: per-collection watchers, resume token persistence, debounced batching, field ownership (mongo-owned vs pg-owned), no-op detection, edge refresh, stall detection, sync DLQ writes, health reporting.

- [ ] **Step 2: Create Neo4j sync**

Create `engine/src/sync/neo4j-sync.ts` with `fullNeo4jSync()` — reads all edges from PostgreSQL, writes to Neo4j via MERGE statements. Non-fatal if Neo4j is unavailable.

- [ ] **Step 3: Create sync verification**

Create `engine/src/sync/verify-sync.ts` with `verifySyncConsistency()` — compares entity counts and IDs between MongoDB and PostgreSQL per collection.

- [ ] **Step 4: Test sync by modifying MongoDB**

Start the engine. In another terminal, modify a country in MongoDB:

```bash
docker exec -it $(docker compose ps -q mongo) mongosh gambit --eval "db.countries.updateOne({_id: 'united-states'}, {\$set: {risk: 'extreme'}})"
```

Check PostgreSQL within a few seconds:

```bash
docker exec -it $(docker compose ps -q postgres) psql -U gambit -c "SELECT risk FROM entities WHERE id = 'country:united-states'"
```

Expected: `extreme` (synced from MongoDB).

- [ ] **Step 5: Test sync verification**

```bash
curl -X POST http://localhost:3001/engine/v1/admin/verify-sync | jq .
```

Expected: report showing matching counts between MongoDB and PostgreSQL.

- [ ] **Step 6: Commit**

```bash
git add engine/src/sync/
git commit -m "feat: add Change Stream sync — MongoDB → PostgreSQL with field ownership, DLQ, and verification"
```

---

## Task 10: Test Infrastructure & Final Verification

**Files:**
- Create: `engine/vitest.config.ts`
- Create: `engine/test/setup.ts`
- Create: `engine/test/teardown.ts`
- Create: `engine/test/helpers/container.ts`
- Create: `engine/test/helpers/fixtures.ts`
- Create: `engine/test/helpers/db.ts`

- [ ] **Step 1: Create vitest config**

Create `engine/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    globalSetup: ['./test/teardown.ts'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
```

- [ ] **Step 2: Create test setup**

Create `engine/test/setup.ts` — connects to test PostgreSQL (port 5433), runs migrations, creates test database.

Create `engine/test/teardown.ts` — drops test database.

Create `engine/test/helpers/container.ts` — builds a test `ServiceContainer` with test database.

Create `engine/test/helpers/fixtures.ts` — factory functions for test entities, edges, teams, users.

Create `engine/test/helpers/db.ts` — `resetDb()` that truncates all tables between tests.

- [ ] **Step 3: Run all tests**

```bash
docker compose --profile test up -d
cd engine && POSTGRES_URL=postgresql://gambit_test:gambit_test@localhost:5433/gambit_test bun run test
```

Expected: all tests pass.

- [ ] **Step 4: Run typecheck on entire workspace**

```bash
cd C:\Users\slabl\Documents\GitHub\Geopolitiq && bun run typecheck
```

Expected: 0 errors across api/ and engine/.

- [ ] **Step 5: Full end-to-end verification**

Start everything:

```bash
docker compose --profile engine up -d
cd engine && bun run seed
cd engine && bun run dev
```

Run smoke test:

```bash
bash engine/src/scripts/smoke-test.sh
```

Verify:
- `GET /engine/v1/health` → all services ok or degraded (not down)
- `GET /engine/v1/entities` → returns entities with cursor pagination
- `GET /engine/v1/entities/country:united-states` → returns entity
- `POST /engine/v1/entities/resolve` with `{"query":"USA"}` → resolves to country:united-states
- `GET /engine/v1/entities/country:united-states/edges` → returns edges
- Legacy `GET /api/v1/countries` → unchanged behavior

- [ ] **Step 6: Final commit**

```bash
git add engine/vitest.config.ts engine/test/
git commit -m "feat: add test infrastructure — Vitest config, setup, fixtures, helpers"
```

- [ ] **Step 7: Summary commit**

```bash
git add -A
git commit -m "feat: Phase 1 Engine Foundation — complete

Gambit Engine running as separate Hono server on :3001 with:
- PostgreSQL + Drizzle (15+ tables, PostGIS, RLS, materialized views)
- Entity seed from MongoDB (8 collections, declarative edge extraction)
- Change Stream sync (field ownership, DLQ, stall detection)
- Typesense search + entity resolution
- /engine/v1/ API (entities CRUD, edges, resolve, batch, health, admin)
- Full middleware stack (auth, RLS context, rate limiting, caching, ETag, tracing)
- Docker Compose profiles (core, engine, observability, legacy, test)
- Caddy reverse proxy, PgBouncer connection pooling
- ClickHouse + MinIO + Temporal connections (ready for Phase 2)"
```
