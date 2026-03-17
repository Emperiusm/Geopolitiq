# Session 4 Prompt — Gambit Auth & Multi-User Platform (Plan 4)

Copy everything below the line and paste as your first message in a new session.

---

Write an implementation plan for the Gambit auth & multi-user platform using `superpowers:writing-plans`. The spec is at `docs/superpowers/specs/2026-03-17-gambit-auth-multiuser-design.md`.

## What's done (Plans 1-3 — completed)

Branch `feat/gambit-backend-infra-pipeline` has the full backend + frontend:

**Backend (`api/src/`):**
- Infrastructure: MongoDB, Redis, cache-aside, SSE pub/sub, health routes
- Middleware: CORS, request-id, logger, compression, api-key auth (simple X-API-Key), rate-limit (IP-based), cache-headers
- Helpers: query parsing (pagination, filters, sparse fields), response envelope (success, paginated, apiError)
- Reference endpoints: countries, bases, nsa, chokepoints, elections, trade-routes, ports, conflicts
- Aggregate endpoints: bootstrap, viewport, search, compare, timeline, graph, anomalies
- Realtime: news routes, SSE event stream with Redis pub/sub
- Binary: Deck.GL Float32Array layer endpoints
- System: seed routes, settings routes (BYOK AI keys with AES-256-GCM), plugin routes
- Periodic: conflict counter, news aggregator (140 RSS feeds, tiered polling), anomaly cleanup
- Infrastructure: temporal snapshots, entity dictionary NER, graph edges, plugin registry, provenance, anomaly detection, AI analysis
- Types: 25+ interfaces in `types/index.ts`

**Frontend (`frontend/`):**
- Preact + Vite + Deck.GL (globe + flat view with MapLibre + PMTiles)
- 7 data layers: risk heatmap, trade routes, chokepoints, military bases, NSA zones, conflicts, elections
- Panels: sidebar, layer menu, detail panels per layer, compare mode
- SSE client, day/night theme, timeline scrubbing, global search, news feed
- Binary data integration, service worker, bundle splitting

## What to plan (auth & multi-user)

The spec covers 7 sections — use these as the basis for the plan's task breakdown:

1. **Authentication flow** — OAuth (GitHub + Google) via Arctic, auth code exchange, JWT access tokens, httpOnly refresh cookie, role version check, auth endpoint rate limiting, CSRF via SameSite=Strict
2. **Data models** — User, Team, Session, AuthCode, ApiKey, UserPreferences, NotificationPreferences, TeamSettings, SavedView, AuditEvent, RecoveryToken, PlatformConfig + all MongoDB indexes
3. **Middleware chain** — Replace api-key.ts with full authenticate middleware, add impersonation, scope check, post-auth log enrichment, update CORS and rate limiter
4. **Routes** — Auth (OAuth, token, refresh, logout, me, providers), API keys (CRUD + rotate), Team (CRUD, invite, join, leave, members, watchlist, views, audit), team settings, notifications, platform admin
5. **findOrCreateUser** — Decision tree with 4 paths (returning, linking, invite, organic), race condition protection, email sync, deletion cancellation on login
6. **Account lifecycle** — Deletion (soft + hard), recovery (admin-initiated), email infrastructure abstraction
7. **Scoping rules** — Global vs per-team vs per-user data, team/user scope helpers, BYOK key resolution, SSE auth + team filtering, watchlist merging

## Key constraints

- **Arctic** for OAuth provider flows (not custom fetch calls)
- **jose** for JWT creation/verification
- Refresh token as **httpOnly Secure SameSite=Strict cookie** (not in response body)
- OAuth callback uses **auth code exchange** (one-time code in URL, frontend POSTs for tokens)
- **Active Redis invalidation** on role/team changes (`DEL gambit:user:{userId}:rv`)
- Team join/leave **revokes API keys** (not re-scopes)
- Team join/leave returns **new JWT directly** (not force re-auth)
- `pluginConfigs` model is **deferred**
- Existing bug to fix: `GET /settings/ai` masks encrypted ciphertext instead of plaintext

## Environment notes

- **Bun** is the runtime (not Node). Use `bun test` to run tests.
- **Redis** is on port **6380** (not 6379) — local Redis uses 6379, Docker Redis remapped to 6380.
- **MongoDB** is on port 27017 (Docker container `gambit-mongo`).
- **Shell** is PowerShell on Windows — use `;` not `&&` to chain commands. Subagents use bash and can use `&&`.
- Start services: `docker compose up -d mongo redis` (from repo root)
- Start API: `cd api; bun src/index.ts`
- Seed data: `cd api; bun src/seed/seed-all.ts`
- Run tests: `cd api; bun test`
