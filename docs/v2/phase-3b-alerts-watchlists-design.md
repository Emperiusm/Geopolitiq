# Phase 3b: Alerts & Watchlists — Design Spec

> **Scope:** Notification/user-facing layer. Alert management, watchlist configuration, delivery pipeline (SSE + webhook), collaboration groups, alert search, and scheduled maintenance. Phase 3a (separate spec) covers scoring engine and detectors.

> **Boundary:** Phase 3b manages, queries, delivers, and cleans up alerts. It does NOT create alerts (Phase 3a detectors do that) or build the dashboard UI (Phase 4).

> **Parent spec:** `docs/v2/2026-03-22-gambit-engine-signal-design.md` (Sections 7, 10, 14)

> **Depends on:** Phase 3a (Gap Analysis & Detectors) — specifically the `alerts` table, `watchlists` table, `watchlist_entities` junction table, `alertStatusEnum`, SSE event types, `WebhookPublisher`, and `DetectorBatchWorkflow`.

> **Infrastructure:** Phase 1.5 (Scale Infrastructure) — NATS JetStream event bus for alert delivery, dedicated SSE Gateway for client connections, PgCat for read/write pool separation, DegradationRegistry for service health tracking, webhook SSRF validator.

---

## Table of Contents

1. [Schema Changes](#1-schema-changes)
2. [Alert Delivery Pipeline](#2-alert-delivery-pipeline)
3. [Webhook Delivery](#3-webhook-delivery)
4. [Watchlist Management](#4-watchlist-management)
5. [Collaboration Groups](#5-collaboration-groups)
6. [Alert Search](#6-alert-search)
7. [API Routes](#7-api-routes)
8. [Services](#8-services)
9. [SSE Events & Connection Management](#9-sse-events--connection-management)
10. [Scheduled Workflows](#10-scheduled-workflows)
11. [Caching & Hyper-Optimizations](#11-caching--hyper-optimizations)
12. [Rate Limiting](#12-rate-limiting)

---

## 1. Schema Changes

### 1.1 Alerts Table — Restructure to Global

Phase 3a creates the `alerts` table with `team_id`. Phase 3b restructures it to be global (no team scoping). Since no production data exists, this is a clean migration.

**Full migration DDL:**

```sql
-- Drop team-scoped columns and constraints
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_team_id_teams_id_fk;
ALTER TABLE alerts DROP COLUMN IF EXISTS team_id;
ALTER TABLE alerts DROP COLUMN IF EXISTS watchlist_id;
ALTER TABLE alerts DROP COLUMN IF EXISTS status;
ALTER TABLE alerts DROP COLUMN IF EXISTS status_by;
ALTER TABLE alerts DROP COLUMN IF EXISTS status_at;
ALTER TABLE alerts DROP COLUMN IF EXISTS delivered_sse;
ALTER TABLE alerts DROP COLUMN IF EXISTS delivered_webhook;
ALTER TABLE alerts DROP COLUMN IF EXISTS delivered_email;

-- Drop team-scoped indexes
DROP INDEX IF EXISTS idx_alerts_team_status_created;

-- Add fan-out tracking
ALTER TABLE alerts ADD COLUMN fan_out_status TEXT DEFAULT 'pending';  -- pending/completed/failed
CREATE INDEX idx_alerts_fan_out ON alerts(fan_out_status, created_at) WHERE fan_out_status = 'pending';

-- Disable RLS (alerts are now global)
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alerts_team_isolation ON alerts;
```

**Resulting `alerts` table (post-migration):**

```sql
-- id, entity_id, domain, type, severity, title, summary, evidence,
-- evidence_fingerprint, alignment, reality_score, confidence, prediction,
-- recommended_actions, meta, expires_at, fan_out_status, created_at, updated_at
```

All team scoping moves to `alert_deliveries`.

**Phase 3a code change required:** Update `DetectorBatchWorkflow`'s alert insert to remove `teamId`, `watchlistId`, `status`, `statusBy`, `statusAt`, `deliveredSse`, `deliveredWebhook`, `deliveredEmail` from the INSERT values. Add `fanOutStatus: 'pending'`. After insert, start `AlertFanOutWorkflow` as a child workflow. This is a Phase 3b code change to Phase 3a's detector activities.

**Drizzle schema update:** Replace the `alerts` table definition in `engine/src/db/schema/analysis.ts` to match the post-migration schema (remove team-scoped fields, add `fanOutStatus`).

### 1.2 Alert Deliveries — New Table

One row per team per alert. This is the team-scoped view of a global alert.

```sql
CREATE TABLE alert_deliveries (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  watchlist_ids TEXT[] DEFAULT '{}',           -- all watchlists that matched
  status alert_status DEFAULT 'new',
  status_by TEXT,
  status_at TIMESTAMPTZ,
  delivered_sse BOOLEAN DEFAULT false,
  delivered_webhook BOOLEAN DEFAULT false,
  delivered_email BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(alert_id, team_id)
);

CREATE INDEX idx_alert_deliveries_team_status_created ON alert_deliveries(team_id, status, created_at DESC);
CREATE INDEX idx_alert_deliveries_alert ON alert_deliveries(alert_id);
CREATE INDEX idx_alert_deliveries_expires ON alert_deliveries(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_alert_deliveries_team_alert ON alert_deliveries(team_id, alert_id);  -- Typesense two-step query
CREATE INDEX idx_alert_deliveries_watchlist ON alert_deliveries USING GIN(watchlist_ids);  -- watchlist alert lookup
```

RLS enabled (team-scoped via `app.team_id`).

**Partitioning:** Deferred to production deployment. The table is created as a standard (non-partitioned) table initially. When alert volume warrants it, convert to range-partitioned by `created_at` (monthly). This will require changing the `UNIQUE(alert_id, team_id)` constraint to `UNIQUE(alert_id, team_id, created_at)` — acceptable because all lookups already include `created_at` in the query pattern. The conversion is a one-time migration, not a Phase 3b implementation task.

### 1.3 Collaboration Groups — New Tables

```sql
CREATE TABLE collaboration_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sharing_level TEXT DEFAULT 'counts-only',    -- counts-only/named/none
  created_by TEXT NOT NULL REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE collaboration_members (
  id SERIAL PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES collaboration_groups(id) ON DELETE CASCADE,
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',                  -- owner/member/viewer
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, team_id)
);

CREATE INDEX idx_collab_members_team ON collaboration_members(team_id);

CREATE TABLE collaboration_invites (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES collaboration_groups(id) ON DELETE CASCADE,
  invited_team_id TEXT NOT NULL REFERENCES teams(id),
  invited_by TEXT NOT NULL REFERENCES teams(id),
  status TEXT DEFAULT 'pending',               -- pending/accepted/rejected/expired
  expires_at TIMESTAMPTZ,                      -- 7-day TTL
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collab_invites_team ON collaboration_invites(invited_team_id, status);
CREATE INDEX idx_collab_invites_group ON collaboration_invites(group_id);
```

### 1.4 Watchlists — Add Soft Delete

```sql
ALTER TABLE watchlists ADD COLUMN deleted_at TIMESTAMPTZ;
CREATE INDEX idx_watchlists_deleted ON watchlists(deleted_at) WHERE deleted_at IS NOT NULL;
```

Fan-out queries filter `WHERE w.deleted_at IS NULL`. Hard-delete after 90 days via expiration workflow.

### 1.5 Webhook Endpoints — Add Verification & Versioning

```sql
ALTER TABLE webhook_endpoints ADD COLUMN verified BOOLEAN DEFAULT false;
ALTER TABLE webhook_endpoints ADD COLUMN verified_at TIMESTAMPTZ;
ALTER TABLE webhook_endpoints ADD COLUMN payload_version TEXT DEFAULT '1.0';
```

Unverified endpoints don't receive deliveries. Re-verification every 30 days.

### 1.6 Team Alert Digests — New Table

```sql
CREATE TABLE team_alert_digests (
  id SERIAL PRIMARY KEY,
  team_id TEXT NOT NULL REFERENCES teams(id),
  unread_count INT NOT NULL,
  alert_types TEXT[] DEFAULT '{}',
  entity_ids TEXT[] DEFAULT '{}',
  latest_alert_at TIMESTAMPTZ,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

UNIQUE(team_id, period_start),
CREATE INDEX idx_digests_team ON team_alert_digests(team_id, created_at DESC);
```

### 1.7 Typesense `alerts` Collection

```json
{
  "name": "alerts",
  "fields": [
    { "name": "id", "type": "string" },
    { "name": "title", "type": "string" },
    { "name": "summary", "type": "string" },
    { "name": "entity_id", "type": "string", "facet": true },
    { "name": "entity_name", "type": "string" },
    { "name": "domain", "type": "string", "facet": true },
    { "name": "type", "type": "string", "facet": true },
    { "name": "severity", "type": "string", "facet": true },
    { "name": "created_at", "type": "int64", "sort": true }
  ]
}
```

Synced via batched Typesense import (flush every 10 seconds or 50 documents).

---

## 2. Alert Delivery Pipeline

### 2.1 Full Flow

```
DetectorBatchWorkflow detects alert
  │
  ├─ INSERT INTO alerts (global, fan_out_status = 'pending')
  ├─ Start child: AlertFanOutWorkflow(alertId, entityId, alertType)
  │     │
  │     ├─ Read entity→team mapping from Redis hash:
  │     │   HGETALL entity:watchers:{entityId}
  │     │   Filter by notify_on matching alertType
  │     │   (Fallback: PG query if Redis miss)
  │     │
  │     ├─ Buffer alert for Typesense batch indexing
  │     │
  │     ├─ Batch-insert alert_deliveries via COPY (500/chunk):
  │     │   For each chunk (each chunk is a separate Temporal activity):
  │     │     ├─ COPY alert_deliveries FROM STDIN (one row per team)
  │     │     ├─ Redis pipeline: INCR alert:unread:{teamId} per team
  │     │     ├─ Redis pipeline: PUBLISH sse:alerts:{teamId} per team
  │     │     ├─ Redis pipeline: ZADD alert:inbox:{teamId} per team
  │     │     └─ For each team with verified+active webhook endpoints:
  │     │          └─ Start child: WebhookDeliveryWorkflow(alertId, teamId)
  │     │
  │     ├─ UPDATE alerts SET fan_out_status = 'completed'
  │     └─ Return: { deliveriesCreated, ssePublished, webhooksQueued }
```

> **Phase 1.5 Update:** Alert SSE delivery uses NATS instead of Redis PUBLISH. Alerts publish to NATS subject `alerts.fired.{severity}`. The Phase 1.5 SSE Gateway subscribes to `alerts.>` and delivers to connected clients filtered by team watchlist. Redis pipeline is still used for counter/cache updates (`alert:unread:{teamId}`, `alert:inbox:{teamId}`), but SSE distribution goes through NATS.

```
  │
  └─ Continue detector batch processing
```

### 2.2 Fan-Out Concurrency Limits

| Level | Limit | Purpose |
|---|---|---|
| AlertFanOutWorkflow | Max 5 concurrent | Prevent DB write spikes from multiple popular entities |
| Delivery chunk activities | 500 rows per chunk | PG COPY batch size |
| SSE publish per chunk | Redis pipeline (single round-trip) | No individual PUBLISH calls |
| WebhookDeliveryWorkflow | Max 10 concurrent outbound per worker | Prevent connection exhaustion |

### 2.3 Pre-Computed Entity→Team Mapping

Redis hash `entity:watchers:{entityId}`:

```
{
  "team:abc": "{\"watchlistIds\":[\"wl:1\",\"wl:2\"],\"notifyOn\":[\"stealth-project\",\"vaporware-risk\"],\"notifications\":{\"sse\":true,\"webhook\":true}}",
  "team:def": "{\"watchlistIds\":[\"wl:3\"],\"notifyOn\":[],\"notifications\":{\"sse\":true}}"
}
```

Updated by `WatchlistService` on entity add/remove. Reconciled from PG every 15 minutes. Fan-out reads this hash instead of joining PG tables — sub-millisecond lookup.

Empty `notifyOn` = all alert types (default).

**Rebuild query** (used by `WatchlistService.rebuildEntityWatchersCache` and the 15-minute reconciliation):

```sql
SELECT
  we.entity_id,
  we.team_id,
  array_agg(DISTINCT we.watchlist_id) as watchlist_ids,
  array_agg(DISTINCT unnest_notify) FILTER (WHERE unnest_notify IS NOT NULL) as notify_on,
  jsonb_object_agg(DISTINCT w.id, w.notifications) as notifications_by_watchlist
FROM watchlist_entities we
JOIN watchlists w ON we.watchlist_id = w.id AND w.deleted_at IS NULL
LEFT JOIN LATERAL unnest(w.notify_on) AS unnest_notify ON true
WHERE we.entity_id = $entityId   -- omit for full rebuild
GROUP BY we.entity_id, we.team_id
```

Result is serialized as JSON per team entry and written to the Redis hash via `HSET`.

### 2.4 Delivery INSERT via COPY

For batches > 500 deliveries, use PostgreSQL COPY protocol via the underlying `postgres.js` client (Drizzle does not expose COPY streaming):

```typescript
// Access the raw postgres.js sql tagged template from the Drizzle client
const rawSql = getRawPostgresClient(db);

// Use postgres.js writable stream for COPY
const writable = await rawSql`COPY alert_deliveries (id, alert_id, team_id, watchlist_ids, expires_at) FROM STDIN`.writable();

for (const row of deliveries) {
  // Tab-delimited TEXT format (safer than CSV for array literals)
  const watchlistArray = `{${row.watchlistIds.join(',')}}`;
  const expiresAt = row.expiresAt ? row.expiresAt.toISOString() : '\\N'; // \N = NULL in TEXT format
  writable.write(`${row.id}\t${row.alertId}\t${row.teamId}\t${watchlistArray}\t${expiresAt}\n`);
}

writable.end();
await finished(writable); // from 'stream/promises'
```

Uses TEXT format (tab-delimited) instead of CSV to avoid escaping issues with array literals. `\N` represents NULL values in TEXT format.

For batches ≤ 500, use standard batch INSERT with `RETURNING id, team_id` to get IDs in the same round-trip.

### 2.5 One Delivery Per Team Per Alert

An entity can be on multiple watchlists for the same team. Fan-out creates ONE delivery per team, with `watchlist_ids` array containing all matching watchlists. The pre-computed Redis hash already groups by team — `array_agg(watchlistId)` is done at cache population time.

### 2.6 Delivery Expiration

Every `alert_delivery` row gets `expires_at = created_at + 90 days` set during fan-out. This defines the retention window:
- `GET /watchlists/:id/alerts` default window: 30 days, max: 90 days (aligned with retention)
- `AlertExpirationWorkflow` deletes deliveries where `expires_at < now()`
- Deliveries in `confirmed` or `dismissed` status are archived to ClickHouse before deletion

---

## 3. Webhook Delivery

### 3.1 WebhookDeliveryWorkflow

```
WebhookDeliveryWorkflow(alertId, teamId)
  │
  ├─ Read team's webhook endpoints (verified=true, active=true)
  ├─ Read alert data for payload
  ├─ For each endpoint:
  │    ├─ Check circuit breaker: webhook:circuit:{teamId}:{endpointId}
  │    │   If open → skip, log
  │    ├─ Build payload envelope:
  │    │   {
  │    │     "version": endpoint.payload_version,
  │    │     "type": "alert.created",
  │    │     "idempotency_key": "{alertId}:{teamId}:{attempt}",
  │    │     "timestamp": "...",
  │    │     "data": { ...alert... },
  │    │     "signature": "hmac-sha256:..."
  │    │   }
  │    ├─ Enforce 64KB size cap (truncate evidence to top 10 signals if over)
  │    │   Include evidence_truncated: true + API link for full evidence
  │    ├─ POST to endpoint URL, 10s timeout
  │    │   Headers: X-Gambit-Delivery-Id, X-Gambit-Signature
  │    ├─ On 2xx: mark delivered, reset circuit breaker
  │    ├─ On failure: retry with backoff (1s, 5s, 25s, 2min, 10min)
  │    └─ After 5 failures: mark exhausted, trip circuit breaker,
  │       publish SSE "webhook-failed" to team
  │
  ├─ Update alert_deliveries.delivered_webhook = true (if any endpoint succeeded)
  └─ Insert webhook_deliveries record for audit trail
```

### 3.2 Endpoint Verification

On webhook endpoint creation or URL change:

1. `POST {url}` with `{ "type": "url_verification", "challenge": "random-token" }`
2. Endpoint must respond with `{ "challenge": "random-token" }` within 10 seconds
3. Mark `verified = true`, `verified_at = now()` on success
4. Mark `verified = false` on failure — endpoint doesn't receive deliveries
5. Re-verify every 30 days via `WebhookReverificationWorkflow`

Same pattern as Slack, Stripe, and GitHub.

### 3.3 Connection Pooling

Use `undici` HTTP Agent with keep-alive connection pooling grouped by domain:

```typescript
const agent = new Agent({ connections: 50, keepAliveTimeout: 60_000, pipelining: 1 });
```

Multiple teams with endpoints at the same domain (e.g., `hooks.slack.com`) share connections. Reduces per-delivery latency from ~150ms (new connection) to ~20ms (reused).

### 3.4 Circuit Breaker

Per-endpoint circuit breaker stored in Redis: `webhook:circuit:{teamId}:{endpointId}`.

- 5 consecutive failures → trip circuit (SET with 1-hour TTL)
- On trip: publish SSE notification to team
- On successful delivery: DEL circuit key
- Webhook delivery workflow checks circuit before attempting delivery

### 3.5 Payload Versioning

Webhook endpoints register a `payload_version`. When payload format changes:

1. New version is deployed alongside old
2. Endpoints receiving old version continue until they opt-in
3. Payloads always include `"version": "1.0"` in the envelope

### 3.6 Test Endpoint

`POST /webhooks/:id/test` sends:

```json
{
  "version": "1.0",
  "type": "webhook.test",
  "test": true,
  "timestamp": "...",
  "data": { "message": "Test webhook delivery from Gambit" },
  "signature": "hmac-sha256:..."
}
```

No `alert_deliveries` row created. Returns HTTP status code and response time from the endpoint.

> **Phase 1.5 Update:** Webhook URLs are validated against SSRF attacks using Phase 1.5's `validateWebhookUrl()` from `engine/src/security/webhook-validator.ts`. This checks: HTTPS only, no IP addresses, DNS resolution against denied CIDRs (private, link-local, loopback). Validation runs at both configuration time and delivery time (DNS can change).

---

## 4. Watchlist Management

### 4.1 Tier Limits

| Resource | Free | Pro | Enterprise |
|---|---|---|---|
| Watchlists per team | 1 | 10 | Unlimited |
| Entities per team (across all watchlists) | 5 | 100 | Unlimited |

Enforced with PostgreSQL advisory lock on `hashtext(teamId || ':watchlist_limit')` to prevent concurrent bypass.

### 4.2 Entity Add/Remove

On `POST /watchlists/:id/entities`:

1. Acquire advisory lock
2. Check tier limit: `SELECT count(*) FROM watchlist_entities WHERE team_id = $teamId`
3. Insert into `watchlist_entities`
4. Update Redis `entity:watchers:{entityId}` hash (add team entry)
5. Trigger retroactive delivery: query alerts from last 24 hours for added entities that don't have a delivery for this team. Cap at 20 most recent alerts per entity. Batch-insert deliveries.
6. Return `{ added: N, retroactiveAlerts: N }`

On `DELETE /watchlists/:id/entities`:

1. Delete from `watchlist_entities`
2. Update Redis `entity:watchers:{entityId}` hash (remove team entry or update watchlist_ids)
3. Don't delete existing deliveries (user may have acted on them)

### 4.3 Soft Delete

`DELETE /watchlists/:id` sets `deleted_at = now()`:

- Fan-out queries filter `WHERE w.deleted_at IS NULL`
- Dashboard hides deleted watchlists
- Alert delivery audit trail shows "via watchlist: {name} (deleted)"
- Hard-delete after 90 days via `AlertExpirationWorkflow`
- Cascading: `watchlist_entities` rows remain until hard-delete (so entity:watchers Redis hash can reference them for audit)

### 4.4 Notification Config

`watchlists.notifications` JSONB:

```json
{
  "sse": true,
  "webhook": true,
  "email": false
}
```

`watchlists.notifyOn` text array: `["stealth-project", "vaporware-risk"]`. Empty = all types.

Both stored in the pre-computed `entity:watchers` Redis hash for fast fan-out filtering.

---

## 5. Collaboration Groups

### 5.1 Sharing Levels

| Level | Behavior |
|---|---|
| `counts-only` | "2 collaborators confirmed this" — no team identities revealed |
| `named` | "Acme Corp confirmed this" — identities visible to group members |
| `none` | No community status shared — group exists for organizational purposes |

Default: `counts-only`. `named` requires explicit opt-in per group (owner sets it).

### 5.2 Community Status — Eagerly Computed

On fan-out: after batch-inserting deliveries, for each collaboration group with multiple members receiving this alert, initialize status counters:

```
collab:alert:{alertId}:{groupId} = HASH { new: N, acknowledged: 0, investigating: 0, dismissed: 0, confirmed: 0 }
```

On status change (`PATCH /alerts/:deliveryId`):

```
HINCRBY collab:alert:{alertId}:{groupId} {oldStatus} -1
HINCRBY collab:alert:{alertId}:{groupId} {newStatus} 1
```

Read path: `HGETALL collab:alert:{alertId}:{groupId}` — O(1), no query, no aggregation. Filter by sharing level before returning to client.

### 5.3 Collaborator Set Cache

Redis set `collab:teams:{teamId}` = set of team IDs the team collaborates with (across all groups). Updated on:

- Invite accepted → SADD
- Member removed / leave → SREM
- Group deleted → rebuild from PG

### 5.4 Invite Lifecycle

1. `POST /collaborations/:id/invite` → creates invite, publishes SSE `collaboration-invite` to `sse:team:{invitedTeamId}`
2. Invited team sees invite via `GET /collaborations/invites`
3. `POST /collaborations/invites/:id/accept` → creates `collaboration_members` row, updates Redis collaborator sets for all group members, marks invite `accepted`
4. `POST /collaborations/invites/:id/reject` → marks invite `rejected`
5. Invites expire after 7 days → `InviteExpirationWorkflow` marks them `expired`

### 5.5 Privacy Protection

- Collaboration groups are opt-in (invite + accept)
- `counts-only` reveals that collaborators exist but not who they are
- `named` reveals identity only to group members
- Teams outside the group see zero community status — equivalent to no collaboration
- A team can leave a group at any time → immediately stops sharing status

---

## 6. Alert Search

### 6.1 Typesense-Powered, Two-Step Query

1. `GET /alerts?q=quantum+computing&type=stealth-project&limit=50`
2. API layer: Typesense search with facet filters, capped at `limit` results (max 50) → matching alert IDs
3. API layer: `SELECT * FROM alert_deliveries WHERE team_id = $teamId AND alert_id = ANY($ids)` (uses `idx_alert_deliveries_team_alert` index)
4. Join alert detail from PG `alerts` table
5. Return results with Typesense relevance ordering, cursor = Typesense's `page` parameter
6. Pagination: Typesense handles page-based pagination natively. Each page produces a bounded `ANY($ids)` array (max 50 elements).

### 6.2 Index Sync — Batched

Alerts are buffered and batch-indexed to Typesense every 10 seconds or every 50 documents (whichever comes first) via a lightweight activity in the fan-out workflow.

Dual-path for freshness: `GET /alerts?q=` also queries PG for alerts created in the last 30 seconds (tiny result set). This covers the latency gap between alert creation and Typesense indexing.

### 6.3 Index Size

Only global alerts are indexed (not per-team deliveries). At 10,000 alerts/day × 365 days = 3.6M documents. Typesense handles this easily. TTL: alerts older than the retention period are removed from Typesense by the expiration workflow.

---

## 7. API Routes

### 7.1 Alert Routes

```
GET    /engine/v1/alerts                    — team's deliveries, filterable, cursor-paginated
                                              Params: ?q= (search), ?type=, ?severity=, ?status=,
                                              ?entity=, ?from=, ?to=, ?cursor=, ?limit=
GET    /engine/v1/alerts/feed               — SSE stream (sse:alerts:{teamId})
GET    /engine/v1/alerts/stats              — unread count + breakdown by type/severity
GET    /engine/v1/alerts/:deliveryId        — single delivery + full alert detail + community status
PATCH  /engine/v1/alerts/:deliveryId        — update status (validated transitions)
POST   /engine/v1/alerts/bulk               — bulk status update (max 100)
```

### 7.2 Watchlist Routes

```
GET    /engine/v1/watchlists                — team's watchlists (excludes soft-deleted)
POST   /engine/v1/watchlists                — create (tier-limited)
GET    /engine/v1/watchlists/:id            — detail + entity list
PATCH  /engine/v1/watchlists/:id            — update name, filters, notifyOn, notifications
DELETE /engine/v1/watchlists/:id            — soft delete
POST   /engine/v1/watchlists/:id/entities   — add entities (tier-limited, retroactive delivery)
DELETE /engine/v1/watchlists/:id/entities   — remove entities (body: { entityIds: [...] })
GET    /engine/v1/watchlists/:id/alerts     — alerts via this watchlist (30-day default, 90-day max)
```

### 7.3 Entity Route Completion

```
GET    /engine/v1/entities/:id/alerts       — replace 501 stub
```

### 7.4 Webhook Routes

```
GET    /engine/v1/webhooks                  — team's endpoints
POST   /engine/v1/webhooks                  — create + verification challenge
GET    /engine/v1/webhooks/:id              — detail + recent delivery history
PATCH  /engine/v1/webhooks/:id              — update (re-verifies on URL change)
DELETE /engine/v1/webhooks/:id              — delete
POST   /engine/v1/webhooks/:id/test         — test payload (type: "webhook.test", no delivery row)
```

### 7.5 Collaboration Routes

```
GET    /engine/v1/collaborations            — groups the team belongs to
POST   /engine/v1/collaborations            — create group (team becomes owner)
GET    /engine/v1/collaborations/:id        — detail + members
PATCH  /engine/v1/collaborations/:id        — update name/sharing_level (owner only)
DELETE /engine/v1/collaborations/:id        — delete (owner only)
POST   /engine/v1/collaborations/:id/invite — invite team
POST   /engine/v1/collaborations/:id/leave  — leave group
DELETE /engine/v1/collaborations/:id/members/:teamId — remove member (owner)
GET    /engine/v1/collaborations/invites    — pending invites for my team
POST   /engine/v1/collaborations/invites/:id/accept
POST   /engine/v1/collaborations/invites/:id/reject
```

### 7.6 Admin Routes

```
POST   /engine/v1/admin/fan-out/:alertId    — manually trigger fan-out for an alert
GET    /engine/v1/admin/webhook-health      — circuit breaker status across all endpoints
```

### 7.7 Pagination

All list endpoints use cursor-based pagination with composite cursor `{created_at}:{id}`:

```sql
WHERE (created_at, id) < ($cursorCreatedAt, $cursorId)
ORDER BY created_at DESC, id DESC
LIMIT $limit
```

Stable ordering even with identical timestamps.

### 7.8 Status Transition Validation

Valid transitions:

```
new → acknowledged → investigating → dismissed | confirmed
new → dismissed (shortcut)
any → superseded (system only, not user-callable)
```

Invalid transitions return `422 Unprocessable Entity`.

**`superseded` semantics:** When Phase 3a's algorithm versioning (Section 12 of 3a spec) detects that a new detector version wouldn't have fired an alert, it sets `superseded` on ALL `alert_deliveries` rows for that alert (global operation). This is triggered by `AlgorithmMigrationWorkflow`, not by user action. The global `alerts` table does NOT have a status column — `superseded` is per-delivery because different teams may have already acted on the alert (confirmed/dismissed) before the detector version changed. Deliveries already in `confirmed` or `dismissed` status are NOT changed to `superseded`.

### 7.9 Bulk Operations

`POST /alerts/bulk`:

```json
{
  "action": "acknowledge" | "dismiss" | "investigate",
  "delivery_ids": ["...", "..."],
  "max": 100
}
```

Single transaction. Atomic Redis unread counter decrement for the batch. Returns `{ updated: N, skipped: N, errors: [] }`.

---

## 8. Services

### 8.1 New Services for ServiceContainer

**AlertService:**
- `getDeliveries(teamId, filters, cursor)` — paginated list with optional Typesense search
- `getDeliveryById(deliveryId, teamId)` — single delivery + alert detail + community status
- `updateStatus(deliveryId, teamId, status, userId)` — validated transition + Redis counter + collab counter
- `bulkUpdateStatus(deliveryIds, teamId, action, userId)` — batch transition
- `getStats(teamId)` — Redis counter → Redis breakdown → PG fallback
- `getEntityAlerts(entityId, teamId, cursor)` — alerts for specific entity
- `getCommunityStatus(alertId, teamId)` — read collab counters from Redis

**WatchlistService:**
- `create(teamId, name, filters, notifyOn, notifications)` — tier-limited
- `update(watchlistId, teamId, fields)` — partial update
- `softDelete(watchlistId, teamId)` — set deleted_at
- `addEntities(watchlistId, teamId, entityIds)` — tier-limited, retroactive delivery, update Redis hash
- `removeEntities(watchlistId, teamId, entityIds)` — update Redis hash
- `getWatchlistAlerts(watchlistId, teamId, days, cursor)` — deliveries via this watchlist
- `rebuildEntityWatchersCache(entityId?)` — rebuild Redis hash from PG

**WebhookService:**
- `create(teamId, url, eventTypes, secret)` — trigger verification challenge
- `update(endpointId, teamId, fields)` — re-verify on URL change
- `delete(endpointId, teamId)` — hard delete
- `test(endpointId, teamId)` — send test payload
- `verify(endpointId, challenge)` — process verification response
- `getCircuitStatus(teamId)` — circuit breaker states for all endpoints

**CollaborationService:**
- `createGroup(teamId, name, sharingLevel)` — team becomes owner
- `invite(groupId, invitedTeamId, invitedByTeamId)` — create invite, SSE notification
- `acceptInvite(inviteId, teamId)` — create member, update Redis collab sets
- `rejectInvite(inviteId, teamId)` — mark rejected
- `leave(groupId, teamId)` — remove member, update Redis collab sets
- `removeMember(groupId, targetTeamId, ownerTeamId)` — owner removes member
- `getCollaboratorTeamIds(teamId)` — Redis set lookup
- `rebuildCollaboratorCache(teamId?)` — rebuild Redis sets from PG

---

## 9. SSE Events & Connection Management

### 9.1 New Event Types

```typescript
type SSEEventType =
  | ... existing ...
  | 'alert-delivered'          // fan-out created a delivery for this team
  | 'webhook-failed'           // webhook delivery exhausted for an endpoint
  | 'collaboration-invite';    // team received a group invite
```

**Note on `alert-created` vs `alert-delivered`:** Phase 3a defines `alert-created` (published when the global alert is inserted). Phase 3b adds `alert-delivered` (published when the team-specific delivery is created during fan-out). With the Phase 3b restructure, `alert-created` should be published ONLY to `sse:entity:{entityId}` (entity-scoped, for anyone viewing that entity). `alert-delivered` is published to `sse:alerts:{teamId}` (team-scoped, for the dashboard). Dashboard clients subscribe to `sse:alerts:{teamId}` and receive `alert-delivered` — they should NOT also receive `alert-created` on the same channel.

### 9.2 Channel Usage

| Event | Channel | Published by |
|---|---|---|
| `alert-created` | `sse:entity:{entityId}` only | DetectorBatchWorkflow (Phase 3a) |
| `alert-delivered` | `sse:alerts:{teamId}` | AlertFanOutWorkflow (Phase 3b) |
| `alert-status-changed` | `sse:alerts:{teamId}` | AlertService.updateStatus |
| `webhook-failed` | `sse:alerts:{teamId}` | WebhookDeliveryWorkflow |
| `collaboration-invite` | `sse:team:{teamId}` | CollaborationService.invite |

### 9.3 Connection Management

| Setting | Value | Purpose |
|---|---|---|
| Heartbeat interval | 30 seconds | Detect dead connections |
| Max connection duration | 4 hours | Force reconnect, prevent stale auth |
| Per-instance connection cap | 10,000 | Memory protection |
| Auth re-validation | Every 15 minutes | Catch revoked keys |
| `Last-Event-ID` replay window | 5 minutes | Reconnection reliability |

When connection cap is reached, return `503 Service Unavailable` with `Retry-After: 5` header.

### 9.4 Future: SSE Edge Service

When SSE connections exceed 10,000 per engine instance, deploy a lightweight edge service:

```
Engine → Redis PUBLISH sse:alerts:{teamId}
SSE Edge Service → Redis SUBSCRIBE sse:alerts:* → fan out to connected clients
```

Architecture already supports this (Redis pub/sub is the bus). Deployment change, not code change. ~100 lines of Bun/Hono code. Not built in Phase 3b — documented for future scaling.

> **Phase 1.5 Update:** The dedicated SSE Gateway service is now implemented (Phase 1.5, Task 7). It runs on port 3002 as a separate Hono app with:
> - NATS JetStream multiplexed fan-out (one consumer per pod, not per connection)
> - Per-team connection caps enforced via Redis (Pro: 25, Enterprise: 200)
> - JWT/API key authentication via `PostgresAuthProvider`
> - 15-second heartbeat with graceful disconnect cleanup
> - `Last-Event-ID` support for reconnection
>
> Phase 3b alert events publish to NATS → SSE Gateway delivers to clients. No direct Redis Pub/Sub SSE needed.

---

## 10. Scheduled Workflows

| Workflow | Frequency | Purpose |
|---|---|---|
| `UnreadCounterReconciliation` | Every 1 hour | Safety net — sync Redis `alert:unread:{teamId}` with PG. Log drift > 0 as a bug. |
| `OrphanedAlertSweep` | Every 15 minutes | `alerts WHERE fan_out_status = 'pending' AND created_at < now() - 5min` → for each, attempt `UPDATE alerts SET fan_out_status = 'in-progress' WHERE id = $id AND fan_out_status = 'pending'` (atomic CAS). If update returns 1 row, trigger fan-out. If 0 rows (already picked up), skip. Fan-out INSERT uses `ON CONFLICT (alert_id, team_id) DO NOTHING` to be idempotent against races. |
| `AlertDigestWorkflow` | Every 24 hours | Single-query batch digest: `SELECT team_id, count(*), array_agg(DISTINCT type), array_agg(DISTINCT entity_id) FROM alert_deliveries ad JOIN alerts a ON ad.alert_id = a.id WHERE ad.status = 'new' AND ad.created_at >= now() - interval '24 hours' GROUP BY team_id HAVING count(*) > 0` → write `team_alert_digests` |
| `AlertExpirationWorkflow` | Every 24 hours | Delete expired deliveries (batch 1,000). Archive orphaned alerts to ClickHouse. Hard-delete soft-deleted watchlists >90 days. Clean webhook delivery records >30 days (archive to ClickHouse first). |
| `WebhookReverificationWorkflow` | Every 24 hours | Re-verify endpoints with `verified_at < now() - 30 days` |
| `InviteExpirationWorkflow` | Every 6 hours | Mark pending invites older than 7 days as `expired` |
| `EntityWatchersCacheReconciliation` | Every 15 minutes | Rebuild `entity:watchers:*` Redis hashes from PG to catch drift |

**Task queues:**

| Queue | Workers | Purpose |
|---|---|---|
| `alert-fanout` | 2 | AlertFanOutWorkflow (max 5 concurrent) |
| `webhook-delivery` | 2-4 | WebhookDeliveryWorkflow (max 10 concurrent outbound) |
| `alert-maintenance` | 1 | All scheduled maintenance workflows |

---

## 11. Caching & Hyper-Optimizations

> **Phase 1.5 Update:** Use Phase 1.5's `CachedQueryExecutor` for alert/watchlist caching. Cache invalidation is automatic via NATS CacheInvalidatorConsumer when alert events publish. The 3-tier cache (L1 LRU → L2 Redis → L3 DB) with stale-while-revalidate handles the read path.

### 11.1 Redis Cache Map

| Cache | Key Pattern | TTL | Invalidation |
|---|---|---|---|
| Unread counter | `alert:unread:{teamId}` | None | Atomic INCR/DECR, hourly reconciliation |
| Alert stats breakdown | `alert:stats:{teamId}` | 60 seconds | TTL expiry |
| Alert inbox (sorted set) | `alert:inbox:{teamId}` | None, capped at 500 entries | ZADD on fan-out, ZREM on expire, ZRANGEBYSCORE for reads |
| Entity→team mapping | `entity:watchers:{entityId}` | None | Updated on watchlist entity add/remove, 15-min reconciliation |
| Collaborator team IDs | `collab:teams:{teamId}` | None | Updated on membership change |
| Community status | `collab:alert:{alertId}:{groupId}` | 90 days (set on initialization) | HINCRBY on status change, initialized on fan-out. `AlertExpirationWorkflow` also DELs keys for expired alerts. |
| Webhook circuit breaker | `webhook:circuit:{teamId}:{endpointId}` | 1 hour (on trip) | DEL on successful delivery |

### 11.2 Alert Inbox — Redis Sorted Set

Each team has a sorted set `alert:inbox:{teamId}`:
- Score = `created_at` timestamp
- Member = JSON string: `{ deliveryId, alertId, title, type, severity, entityName, status, createdAt }`

Populated during fan-out. Dashboard `GET /alerts` reads from this set first (sub-millisecond). Falls back to PG for older alerts (beyond the 500-entry cap) or filtered queries.

Updated on status change: ZREM old member, ZADD updated member (same score).

### 11.3 Atomic Unread Counters

All counter mutations are transactional:
- Fan-out: `INCR` after successful delivery INSERT
- Status change from `new` → anything: `DECR`
- Expiration cleanup: `DECRBY` count of expired `status=new` deliveries
- Hourly reconciliation as safety net — log drift > 0 as bug to investigate

### 11.4 SSE Publish via Redis Pipeline

Fan-out publishes SSE events using Redis pipeline (batch all commands into single round-trip):

```typescript
const pipeline = redis.pipeline();
for (const teamId of teamIds) {
  pipeline.publish(`sse:alerts:${teamId}`, payload);
  pipeline.incr(`alert:unread:${teamId}`);
  pipeline.zadd(`alert:inbox:${teamId}`, createdAtTimestamp, inboxJson);
  pipeline.zremrangebyrank(`alert:inbox:${teamId}`, 0, -501); // trim to 500 from oldest
}
await pipeline.exec();
```

5,000 teams = 1 Redis round-trip instead of 5,000.

> **Phase 1.5 Update:** Replace Redis PUBLISH for SSE delivery with NATS publishing:
> ```typescript
> // Publish alert event to NATS — SSE Gateway handles delivery
> await eventBus.publish('ALERTS', `alerts.fired.${alert.severity}`, buildEvent(
>   'alert.fired', 'alert-fanout', { alertId, entityId, severity, teamIds },
>   { traceId }
> ));
>
> // Redis still used for counter/cache updates (not SSE delivery)
> const pipeline = redis.pipeline();
> for (const teamId of teamIds) {
>   pipeline.incr(`alert:unread:${teamId}`);
>   pipeline.zadd(`alert:inbox:${teamId}`, timestamp, inboxJson);
> }
> await pipeline.exec();
> ```

### 11.5 COPY for Bulk Delivery Inserts

Batches > 500 deliveries use PostgreSQL COPY protocol (5-10x faster than batch INSERT). Batches ≤ 500 use batch INSERT with RETURNING.

### 11.6 Batched Typesense Indexing

Alerts buffered and batch-indexed every 10 seconds or 50 documents via Typesense `import` endpoint. Dual-path query covers the 10-second freshness gap.

### 11.7 HTTP Connection Pooling for Webhooks

`undici` Agent with keep-alive pooling. Multiple teams sharing the same webhook domain reuse connections.

---

## 12. Rate Limiting

> **Phase 1.5 Update:** Phase 1.5 provides 4-layer rate limiting (global → per-IP → per-team → per-endpoint) and tier-based priority admission under load. Alert-specific rate limits (per the spec) layer on top of these. Use the existing `engine/src/middleware/rate-limit.ts` and `engine/src/middleware/priority-admission.ts`.

Endpoint-specific limits (in addition to team-level daily quota):

| Endpoint | Limit |
|---|---|
| `GET /alerts` | 30 req/min per user |
| `GET /alerts/feed` (SSE) | 2 concurrent connections per team |
| `PATCH /alerts/:id` | 60 req/min per user |
| `POST /alerts/bulk` | 10 req/min per user |
| `GET /watchlists` | 30 req/min per user |
| `POST /watchlists/:id/entities` | 10 req/min per user |
| `POST /webhooks` | 5 req/min per team |
| `POST /webhooks/:id/test` | 3 req/min per team |
| `POST /collaborations/:id/invite` | 10 req/min per team |
