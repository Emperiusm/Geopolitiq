# Session 3 Prompt — Gambit Frontend (Plan 3)

Copy everything below the line and paste as your first message in a new session.

---

Execute Plan 3 for the Gambit platform: **Frontend Shell, Layers & Performance** at `docs/superpowers/plans/2026-03-17-gambit-frontend.md`

## What's done (Plans 1 & 2 + upgrades — completed)

Branch `feat/gambit-backend-infra-pipeline` has 29 commits implementing the full backend:

**Infrastructure (`api/src/infrastructure/`):**
- `mongo.ts` — MongoDB connection singleton (connectMongo, getDb, disconnectMongo)
- `redis.ts` — Redis connection with ioredis (port 6380 on host, 6379 internal)
- `cache.ts` — Cache-aside helper (Redis → Mongo fallback, handles arrays and objects)
- `health.ts` — Health/readiness Hono routes
- `sse.ts` — SSE connection manager: publishEvent, getBufferedEvents, Redis pub/sub bridge

**Middleware (`api/src/middleware/`):**
- `cors.ts` — CORS middleware (configurable origins)
- `request-id.ts` — X-Request-Id generation
- `api-key.ts` — X-API-Key auth (skips in dev, enforces in production)
- `rate-limit.ts` — Sliding window rate limiter (Redis + in-memory fallback)
- `cache-headers.ts` — Cache-Control header injection by route prefix
- `compression.ts` — Gzip response compression
- `logger.ts` — Structured JSON request logging

**Helpers (`api/src/helpers/`):**
- `query.ts` — parseListParams (pagination, filters), parseSparseFields, buildMongoFilter
- `response.ts` — success, paginated, apiError, notFound, validationError envelope helpers

**Reference endpoints (`api/src/modules/reference/`):**
- `countries.ts` — GET /countries (list, filter, search), /countries/:id, /countries/risks
- `bases.ts` — GET /bases (list, filter), /bases/:id, /bases/nearby (geospatial)
- `nsa.ts` — GET /nsa (list, search), /nsa/:id
- `chokepoints.ts` — GET /chokepoints (list), /chokepoints/:id
- `elections.ts` — GET /elections (list), /elections/:id, /elections/upcoming
- `trade-routes.ts` — GET /trade-routes (list), /trade-routes/:id, ?resolve=true
- `ports.ts` — GET /ports (list)
- `conflicts.ts` — GET /conflicts (list), /conflicts/:id, /conflicts/:id/timeline

**Aggregate endpoints (`api/src/modules/aggregate/`):**
- `bootstrap.ts` — GET /bootstrap (all data), ?slim=true (minimal fields)
- `viewport.ts` — GET /viewport?bbox=...&layers=... (geospatial filter)
- `search.ts` — GET /search?q=... (cross-collection regex search)
- `compare.ts` — GET /compare?countries=US,IR,RU, /compare/colors

**Realtime (`api/src/modules/realtime/`):**
- `news.ts` — GET /news (list, filter by conflict/tag)
- `sse.ts` — GET /events/stream (SSE with Redis pub/sub, reconnect replay)

**Binary (`api/src/modules/binary/`):**
- `layers.ts` — GET /layers/:layer/binary (Float32Array for Deck.GL: bases, chokepoints, conflicts, nsa-zones, trade-arcs)

**System (`api/src/modules/system/`, `periodic/`):**
- `seed-routes.ts` — POST /seed/run (dev-only), GET /seed/status
- `conflict-counter.ts` — Hourly dayCount updater with SSE events + temporal snapshot capture

**Temporal (`api/src/infrastructure/snapshots.ts`, `api/src/modules/aggregate/timeline.ts`):**
- Hourly snapshots of mutable entity state (conflicts, chokepoints, countries, NSA) — only mutable fields (~80KB/snapshot)
- `GET /timeline/at?t=` — nearest snapshot at or before requested time
- `GET /timeline/range?from=&to=` — snapshot series for frontend scrubber
- `GET /bootstrap?at=` — full world state at historical moment (static data + snapshot overlay)

**Entry (`api/src/index.ts`):** All 17 route groups mounted under /api/v1 with full middleware chain: CORS → requestId → logger → compression → apiKey → rateLimit → cacheHeaders

**Seed scripts (`api/src/seed/`):** 10 seed scripts + orchestrator, bundle parser

**Types (`api/src/types/index.ts`):** 25+ shared interfaces for all collections + API envelope types

**Docker:** `docker-compose.yml` with gambit-api, gambit-mongo (:27017), gambit-redis (:6380→6379), gambit-mongo-express, gambit-frontend

**Live RSS Ingestion (`api/src/infrastructure/`, `api/src/modules/periodic/`):**
- `feed-registry.ts` — 140 RSS sources across 14 categories, tiered: fast (15m), standard (1h), slow (4h)
- `rss-parser.ts` — Zero-dep regex XML parser for RSS 2.0 + Atom, CDATA, entities
- `news-aggregator.ts` — Staggered tier polling, title-hash dedup, NLP enrich, graph edges, SSE, Tier 2 AI queue
- `user-settings.ts` — BYOK API key storage with AES-256-GCM encryption
- `ai-analysis.ts` — Tier 2: cluster related articles, call Anthropic/OpenAI LLMs, parse JSON analysis
- `settings-routes.ts` — PUT/GET/DELETE /settings/ai with live key validation

**Plugin System (`api/src/infrastructure/plugin-registry.ts`, `api/plugins/`):**
- Three extension contracts: data source, map layer, enrichment
- Manifest-driven auto-wiring: Mongo collection, periodic polling, binary layers, graph edges, SSE
- `GET /plugins/manifest` — frontend discovers available plugins
- `GET /plugins/:id/status` — plugin health and doc counts
- Example plugin: USGS Earthquakes (source type, stride 4, ScatterplotLayer)

**Tests:** 162 passing — infrastructure, helpers, all reference/aggregate/realtime/binary endpoints, middleware, seed routes

## What to build (Plan 3)

Read the plan at `docs/superpowers/plans/2026-03-17-gambit-frontend.md` and execute it using `superpowers:subagent-driven-development`. The plan has 15 tasks:

1. Frontend scaffold — Preact + Vite + Deck.GL
2. State management + API client
3. Deck.GL Globe View + earth texture
4. Flat View + MapLibre + PMTiles + view transition
5. SSE client + day/night theme
6. Risk heatmap + country interaction
7. Sidebar — watchlist + layer menu
8. Data layers — trade routes, chokepoints, military, NSA, conflicts, elections
9. Detail panels — per-layer sidebars
10. Compare mode
11. Global search + news feed
12. Keyboard shortcuts + tooltip
13. Binary data + Deck.GL integration
14. Service worker + bundle splitting + loading states
15. Static bootstrap snapshot

## API endpoints available

All routes are at `http://localhost:3000/api/v1/`:

| Endpoint | Notes |
|----------|-------|
| GET /health, /health/ready | Health checks |
| GET /countries, /countries/:id, /countries/risks | Paginated, ?risk=, ?q=, ?fields= |
| GET /bases, /bases/:id, /bases/nearby | ?country=, ?lat=&lng=&radius= |
| GET /nsa, /nsa/:id | ?q= searches name + searchTerms |
| GET /chokepoints, /chokepoints/:id | Standard list/detail |
| GET /elections, /elections/:id, /elections/upcoming | Sorted by dateISO |
| GET /trade-routes, /trade-routes/:id | ?resolve=true hydrates ports/waypoints |
| GET /ports | List only |
| GET /conflicts, /conflicts/:id, /conflicts/:id/timeline | Timeline includes related news |
| GET /bootstrap, /bootstrap?slim=true | All data in one payload |
| GET /viewport?bbox=...&layers=... | Geospatial filter |
| GET /search?q=... | Cross-collection (min 2 chars) |
| GET /compare?countries=US,IR,RU | Up to 3 ISO2 codes |
| GET /compare/colors | Country color map |
| GET /news | ?conflict=, ?tag= |
| GET /events/stream | SSE with Last-Event-ID replay |
| GET /layers/:layer/binary | octet-stream: bases, chokepoints, conflicts, nsa-zones, trade-arcs |
| POST /seed/run, GET /seed/status | Dev-only seed management |
| GET /timeline/at?t=...  | Snapshot at a point in time |
| GET /timeline/range?from=...&to=... | Snapshot series for scrubber animation |
| GET /bootstrap?at=... | Temporal world state (static data + historical mutable fields) |
| GET /graph/connections?entity=country:iran&depth=1 | BFS fan-out subgraph (nodes + edges) |
| GET /graph/path?from=...&to=... | Shortest path between entities (up to 4 hops) |
| PUT/GET/DELETE /settings/ai | BYOK LLM key management (AES-256-GCM encrypted) |
| GET /plugins/manifest | All registered plugin manifests |
| GET /plugins/:id/status | Plugin health, last poll, doc count |

## Environment notes

- **Bun** is the API runtime. **Frontend uses Vite + Preact** (standard npm/pnpm).
- **Redis** is on port **6380** (not 6379) — local Redis uses 6379, Docker Redis remapped to 6380.
- **MongoDB** is on port 27017 (Docker container `gambit-mongo`).
- **Shell** is PowerShell on Windows — use `;` not `&&` to chain commands. Subagents use bash and can use `&&`.
- Start services: `docker compose up -d mongo redis` (from repo root)
- Start API: `cd api; bun src/index.ts`
- Seed data: `cd api; bun src/seed/seed-all.ts`
- Run API tests: `cd api; bun test`
