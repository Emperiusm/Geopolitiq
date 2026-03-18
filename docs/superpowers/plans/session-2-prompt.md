# Session 2 Prompt — Gambit API Routes (Plan 2)

Copy everything below the line and paste as your first message in a new session.

---

Execute Plan 2 for the Gambit platform: **API Routes + Middleware** at `docs/superpowers/plans/2026-03-17-gambit-api-routes.md`

## What's done (Plan 1 — completed)

Branch `feat/gambit-backend-infra-pipeline` has 18 commits implementing the full backend infrastructure + data pipeline:

**Infrastructure (`api/src/infrastructure/`):**
- `mongo.ts` — MongoDB connection singleton (connectMongo, getDb, disconnectMongo)
- `redis.ts` — Redis connection with ioredis (port 6380 on host, 6379 internal)
- `cache.ts` — Cache-aside helper (Redis → Mongo fallback)
- `health.ts` — Health/readiness Hono routes

**Middleware (`api/src/middleware/`):**
- `cors.ts` — CORS middleware (configurable origins)
- `request-id.ts` — X-Request-Id generation

**Seed scripts (`api/src/seed/`):**
- `parse-bundle.ts` — Parses `.firecrawl/*.js` files (uses regex `cleanEscapes` to strip `\[ \] \`` artifacts, then `new Function` eval)
- 10 seed scripts: countries, bases, nsa, chokepoints, elections, ports, trade-routes, conflicts, news, country-colors
- `seed-all.ts` — Orchestrator running all seeds in dependency order

**Entry (`api/src/index.ts`):** Hono app with middleware + health routes mounted at `/api/v1/health`

**Types (`api/src/types/index.ts`):** 25+ shared interfaces for all collections

**Docker:** `docker-compose.yml` with gambit-api, gambit-mongo (:27017), gambit-redis (:6380→6379), gambit-mongo-express, gambit-frontend

**Tests:** 14 passing — infrastructure (mongo, redis, cache, health) + bundle parser

## What to build (Plan 2)

Read the plan at `docs/superpowers/plans/2026-03-17-gambit-api-routes.md` and execute it using `superpowers:subagent-driven-development`. The plan has 9 tasks:

1. Query & response helpers (`api/src/helpers/`)
2. Countries endpoints
3. Bases endpoints
4. NSA + Chokepoints + Elections endpoints
5. Trade Routes (with `?resolve=true`) + Ports + Conflicts (with `/timeline`)
6. Bootstrap + Viewport + Search + Compare
7. News + SSE event stream
8. Binary layer endpoints
9. Middleware (auth, rate-limit, compression, logging) + seed routes + periodic module
10. Mount all routes in `api/src/index.ts`

## Environment notes

- **Bun** is the runtime (not Node). Use `bun test` to run tests.
- **Redis** is on port **6380** (not 6379) — local Redis uses 6379, Docker Redis remapped to 6380.
- **MongoDB** is on port 27017 (Docker container `gambit-mongo`).
- **Shell** is PowerShell on Windows — use `;` not `&&` to chain commands. Subagents use bash and can use `&&`.
- Start services: `docker compose up -d mongo redis` (from repo root)
- Seed data: `cd api; bun src/seed/seed-all.ts`
- Run tests: `cd api; bun test`
