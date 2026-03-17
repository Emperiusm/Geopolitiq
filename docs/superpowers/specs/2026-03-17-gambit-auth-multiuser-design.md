# Gambit Multi-User Auth & Team Platform — Design Spec

## Overview

Gambit is a multi-tenant SaaS intelligence platform. Core intelligence data (countries, conflicts, news, feeds, graph edges, anomalies) is shared across all users — it's the same world. What's per-user or per-team is the personalization layer: BYOK API keys, watchlists, alert preferences, AI analyses, saved views, and API access keys.

This spec covers: OAuth authentication (GitHub + Google), JWT session management with server-side refresh tokens, team collaboration with full RBAC, API key access with read/write scopes, platform admin separation, account lifecycle (deletion + recovery), email infrastructure, scoping rules, and SSE multi-tenancy.

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Deployment model | Multi-tenant SaaS | Strangers sign up, multiple independent teams |
| Session storage | Hybrid — stateless access JWT (15 min) + server-side refresh tokens in MongoDB (7-day sliding, 30-day hard cap) | Revocable sessions without per-request DB hit |
| OAuth token delivery | Auth code exchange — one-time code in URL, frontend POSTs for tokens | Tokens never appear in URLs/logs/history |
| Team system | Full at launch — all four roles, invite codes, team management | Collaboration story ready from day one |
| Account linking | Auto-link by verified email | Industry standard (Vercel, Linear). Only links if OAuth provider confirms email is verified |
| API key scopes | Read / read-write (two levels) | Covers real needs (read-only dashboards, CI monitoring) without premature granularity |
| Platform admin | Separate `platformRole` field independent of team role | "I own my team" != "I can run seeds and manage plugins for the whole platform" |
| OAuth library | Arctic (by lucia-auth team) | Handles provider-specific OAuth flows (PKCE, state, provider quirks) without dictating session/DB strategy. ~50KB, zero runtime deps. Everything else custom. |
| Email service | Abstraction layer with swappable adapter (Resend/SendGrid/SES) | Console adapter for dev, real provider for production. Single-file swap. |

---

## Section 1: Authentication Flow

### OAuth Login (GitHub + Google via Arctic)

1. User clicks "Sign in with GitHub" — frontend redirects to `GET /api/v1/auth/github`
2. Backend uses Arctic to generate the authorization URL with PKCE + state. Stores `state` and `codeVerifier` in a short-lived httpOnly cookie (5 min TTL). Optionally stores `inviteCode` or `recoveryToken` in the same cookie if present in query params. Redirects user to GitHub.
3. GitHub redirects back to `GET /api/v1/auth/github/callback` with `code` and `state`
4. Backend validates `state` against the cookie, uses Arctic to exchange `code` for GitHub tokens (with PKCE verifier). Fetches user profile + verified email from GitHub API.
5. Runs `findOrCreateUser` (auto-links by verified email, creates personal team if new, joins invite team if invite code present, links new provider if recovery token present).
6. Generates a **one-time auth code** (random UUID), stores it in MongoDB with a 60-second TTL, associated with the userId.
7. Redirects to `{FRONTEND_URL}/auth/callback?code={authCode}`
8. Frontend's callback page immediately POSTs to `POST /api/v1/auth/token` with the code.
9. Backend validates the code (single use, not expired), deletes it. Creates:
   - **Access JWT** (15 min) — contains `userId`, `role`, `teamId`, `platformRole`, `roleVersion`. Returned in response body.
   - **Refresh token** (7-day sliding expiry, 30-day hard cap) — stored hashed in `sessions` collection. Set as **httpOnly, Secure, SameSite=Strict cookie**. Never touches frontend JS.
10. Backend checks if this is a **new device** (IP + parsed user agent not seen in recent sessions). If so, queues a login notification email (respects user's `notificationPreferences.loginAlerts`).
11. Frontend stores access token in memory (Preact signal). Redirects to app.

Google flow: identical structure, different Arctic provider.

### Token Response Shape

```typescript
interface TokenResponse {
  accessToken: string;
  isNew: boolean;                    // frontend uses to trigger onboarding
  joined?: { teamId: string; teamName: string };
  inviteError?: "expired" | "exhausted" | "not_found";
}
// Refresh token is set as httpOnly cookie, not in body
```

### Token Refresh

- Frontend intercepts 401 responses, calls `POST /api/v1/auth/refresh` — browser automatically sends the httpOnly cookie.
- Backend validates refresh token hash against `sessions` collection.
- If valid: issues new access JWT, **rotates** refresh token (invalidate old, issue new cookie), updates `lastRefreshedAt`, slides `expiresAt` to 7 days from now (capped at `absoluteExpiresAt`).
- If invalid/expired: clears cookie, returns 401.
- Frontend on 401 from refresh: shows **re-auth modal overlay** (not a redirect) preserving current page state. After successful re-auth, dismisses modal and user continues where they were.

### Role Version Check

- User document has `roleVersion: number`, incremented on any role/team change.
- `roleVersion` is included in the access JWT.
- Middleware compares JWT's `roleVersion` against a Redis-cached value (`gambit:user:{userId}:rv`, 60s TTL, lazy-populated from MongoDB on miss).
- **Active invalidation:** When a role/team change or account deletion occurs, the handler immediately issues `DEL gambit:user:{userId}:rv` to Redis. This eliminates the up-to-60-second stale window. The next request lazy-populates from MongoDB.
- Redis down? Fail open, log warning, continue. The access token is only valid for 15 minutes anyway.
- Mismatch? Return 401 `{ code: "ROLE_CHANGED", action: "refresh" }` — frontend triggers token refresh, gets new JWT with current role.

### Auth Endpoint Rate Limiting

- Separate IP-based rate limiter on all `/auth/*` routes: **10 requests/min per IP**.
- Applies before authentication (pre-auth endpoints).
- Uses same Redis counter pattern as main rate limiter with distinct key prefix (`gambit:authrl:{ip}:{minute}`).
- Returns `Retry-After` header on 429.

### "Which Provider Did I Use?" UX

On the login page, show both OAuth buttons always. If a user tries Google but their email is linked to GitHub only, auto-linking handles it silently (verified email). No error, no confusion.

### CSRF Protection

The refresh token is delivered as an httpOnly cookie with `SameSite=Strict`. This is the CSRF defense for all cookie-bearing endpoints (`/auth/refresh`). No additional CSRF token is needed. **Important:** If `SameSite=Strict` is ever relaxed to `Lax` (e.g., for cross-site redirect flows), a CSRF token must be added to cookie-bearing endpoints.

### Graceful Re-Auth

When the refresh token expires (7 days of inactivity or 30-day hard cap), show a modal overlay: "Your session expired — sign in to continue" with OAuth buttons, preserving current page/state. After re-auth, dismiss modal and resume.

---

## Section 2: Data Models

### User

```typescript
interface User {
  _id: string;                        // UUID
  email: string;                      // verified email from OAuth
  name: string;
  avatar?: string;                    // URL from OAuth provider
  customAvatar: boolean;              // true if user set via PUT /auth/me, prevents OAuth overwrite
  role: UserRole;                     // team-level: owner | admin | member | viewer
  platformRole: PlatformRole;         // platform-level: admin | user
  teamId: string;                     // every user belongs to exactly one team
  roleVersion: number;                // incremented on role/team changes, for JWT invalidation
  providers: Array<{
    provider: "github" | "google";
    providerId: string;               // provider's user ID
    email: string;                    // email from this provider (for audit)
    verified: boolean;                // was email verified by provider
    linkedAt: Date;
  }>;
  lastLoginAt: Date;
  lastLoginIp?: string;
  deletionRequestedAt?: Date;         // soft delete: when user requested deletion
  deletedAt?: Date;                   // soft delete: when grace period expires (30 days after request)
  createdAt: Date;
  updatedAt: Date;
}

type UserRole = "owner" | "admin" | "member" | "viewer";
type PlatformRole = "admin" | "user";
```

### Team

```typescript
interface Team {
  _id: string;                        // UUID
  name: string;
  slug: string;                       // URL-friendly, unique index
  plan: TeamPlan;                     // free | pro
  ownerId: string;
  watchlist: string[];                // team-level monitored entities: ["country:iran", "chokepoint:strait-of-hormuz"]
  inviteCodes: Array<{
    code: string;                     // random string
    label?: string;                   // "Engineering", "Analysts"
    role: UserRole;                   // role assigned on join
    createdBy: string;                // userId who generated it
    expiresAt: Date;
    maxUses: number;
    uses: number;
    usedBy: string[];                 // userIds who used this code
  }>;
  deletedAt?: Date;                   // soft delete for archived personal teams
  createdAt: Date;
  updatedAt: Date;
}

type TeamPlan = "free" | "pro";
```

### Session

```typescript
interface Session {
  _id: string;                        // UUID
  userId: string;
  teamId: string;
  refreshTokenHash: string;           // SHA-256 of refresh token
  device: {
    browser: string;                  // parsed: "Chrome", "Safari", "Firefox"
    os: string;                       // parsed: "Windows 11", "macOS", "iPhone"
    raw: string;                      // original user agent
  };
  ip: string;
  location?: {                        // city-level GeoIP lookup
    city: string;
    country: string;
  };
  isNewDevice: boolean;               // true if IP+device combo not seen before
  createdAt: Date;
  lastRefreshedAt: Date;
  expiresAt: Date;                    // 7 days from last refresh (sliding)
  absoluteExpiresAt: Date;            // 30 days from creation (hard cap)
}
```

### Auth Code

```typescript
interface AuthCode {
  _id: string;                        // the code itself (UUID)
  userId: string;
  expiresAt: Date;                    // 60 seconds from creation, TTL index
  used: boolean;
}
```

### API Key

```typescript
interface ApiKey {
  _id: string;                        // UUID
  keyHash: string;                    // SHA-256 of full key
  keyPrefix: string;                  // first 8 chars for display: "gbt_a3k9"
  userId: string;
  teamId: string;
  name: string;                       // user label: "Production", "CI/CD"
  scope: ApiKeyScope;                 // "read" | "read-write"
  disabled: boolean;                  // true when user requests account deletion
  disabledAt?: Date;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt?: Date;                   // optional expiry
}

type ApiKeyScope = "read" | "read-write";
```

### User Preferences

```typescript
interface UserPreferences {
  _id: string;                        // = userId
  watchlist: string[];                // personal entity IDs
  alertSeverity: "watch" | "alert" | "critical";
  alertEntities?: string[];
  defaultLayers: string[];
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Notification Preferences

```typescript
interface NotificationPreferences {
  _id: string;                        // = userId
  loginAlerts: boolean;               // new device email, default true
  teamInvites: boolean;               // email when invited, default true
  anomalyDigest: "realtime" | "daily" | "off";  // default "daily"
  updatedAt: Date;
}
```

### Team Settings

```typescript
interface TeamSettings {
  _id: string;                        // = teamId
  llmProvider?: LLMProvider;          // "anthropic" | "openai"
  llmApiKey?: string;                 // encrypted (AES-256-GCM, same as userSettings)
  llmModel?: string;
  aiAnalysisEnabled: boolean;
  updatedBy: string;                  // userId who last changed it
  updatedAt: Date;
}
```

### Saved View

```typescript
interface SavedView {
  _id: string;
  teamId: string;
  createdBy: string;
  name: string;                       // "Middle East Watch", "Trade Route Overview"
  layers: string[];                   // enabled layer IDs
  viewport: {
    longitude: number;
    latitude: number;
    zoom: number;
    viewMode: "globe" | "flat";
  };
  filters?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Audit Event

```typescript
interface AuditEvent {
  _id: string;
  teamId: string;
  actorId: string;
  realActorId?: string;               // set during impersonation (the actual admin)
  viaApiKey?: {                       // set when action performed via API key
    id: string;
    name: string;
    prefix: string;
  };
  action: AuditAction;
  target?: {
    type: "user" | "apikey" | "team" | "session" | "invite";
    id: string;
  };
  metadata?: Record<string, any>;     // { oldRole: "member", newRole: "admin" }
  ip: string;
  expiresAt: Date;                    // computed at insertion: now + 90d (free) or now + 365d (pro)
  createdAt: Date;
}

type AuditAction =
  | "user.login"
  | "user.logout"
  | "user.email_updated"
  | "user.deletion_requested"
  | "user.deletion_cancelled"
  | "user.deleted"
  | "user.recovery_initiated"
  | "user.recovery_completed"
  | "admin.impersonated"
  | "member.invited"
  | "member.joined"
  | "member.removed"
  | "role.changed"
  | "team.updated"
  | "team.ownership_transferred"
  | "apikey.created"
  | "apikey.revoked"
  | "apikey.rotated"
  | "session.revoked"
  | "settings.updated"
  | "provider.linked";
```

### Recovery Token

```typescript
interface RecoveryToken {
  _id: string;
  tokenHash: string;                  // SHA-256 of raw token
  userId: string;
  createdBy: string;                  // admin userId who initiated
  expiresAt: Date;                    // 24 hours, TTL index
  used: boolean;
  usedAt?: Date;
}
```

### Platform Config (singleton)

```typescript
interface PlatformConfig {
  _id: "config";
  firstUserClaimed: boolean;
  claimedBy?: string;                 // userId of first user (platform admin)
}
```

### MongoDB Indexes

```
users:                    unique on email
                          unique compound on providers.provider + providers.providerId
                          index on teamId
                          sparse index on deletedAt
teams:                    unique on slug
sessions:                 index on userId
                          TTL on absoluteExpiresAt
authCodes:                TTL on expiresAt
apiKeys:                  unique on keyHash
                          index on userId
                          index on teamId
auditEvents:              compound index on teamId + createdAt
                          TTL on expiresAt (computed at write time: 90d free, 365d pro)
                          Note: plan upgrades don't retroactively extend existing events
savedViews:               index on teamId
recoveryTokens:           TTL on expiresAt
                          index on userId
notificationPreferences:  (keyed by _id = userId, no extra indexes)
userPreferences:          (keyed by _id = userId, no extra indexes)
teamSettings:             (keyed by _id = teamId, no extra indexes)
platformConfig:           (singleton, no extra indexes)
```

---

## Section 3: Middleware Chain & RBAC

### Middleware Order in index.ts

1. **CORS** — production: `FRONTEND_URL` origin only, `credentials: true`. Dev: allow `localhost:*`.
2. **Request ID** — unchanged
3. **Logger** — initial structured log (method, path, IP)
4. **Compression** — unchanged
5. **Auth endpoint rate limit** — 10 req/min per IP, only on `/api/v1/auth/*`. Returns `Retry-After` on 429.
6. **Authenticate** — resolves JWT / API key / dev bypass to user context
7. **Post-auth log enrichment** — attaches `userId`, `teamId`, `platformRole`, `authMethod` ("jwt" | "apikey" | "dev") to the request's structured log fields
8. **Impersonation** — if `X-Impersonate-User` header present, validates platform admin, swaps context, logs audit event
9. **General rate limit** — per-userId, role-based limits. Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` on every response. `Retry-After` on 429.
10. **Scope check** — for API key requests, blocks mutations on read-only keys
11. **Cache headers** — unchanged

### Authenticate Middleware

```
Request comes in
  → Public path? (/health, /auth/github, /auth/github/callback,
    /auth/google, /auth/google/callback, /auth/token)
    → Skip, continue
  → Has Bearer token?
    → Verify JWT with jose
    → roleVersion check against Redis (gambit:user:{userId}:rv, 60s TTL)
      → Redis down? Fail open, log warning, continue
      → Mismatch? Return 401 { code: "ROLE_CHANGED", action: "refresh" }
    → Check deletedAt on user (cached in Redis alongside roleVersion)
      → Set? Return 401 { code: "ACCOUNT_DELETED", action: "show_deletion_notice",
          deletionDate: "..." }
    → Set userId, role, teamId, platformRole on context
    → Set authMethod: "jwt"
  → Has X-API-Key header?
    → SHA-256 hash, look up in apiKeys collection
    → Check disabled === true → 401 { code: "KEY_DISABLED", action: "none" }
    → Check expiry
    → Set userId, role, teamId, scope on context
    → Set authMethod: "apikey", apiKeyMeta: { id, name, prefix }
    → Fire-and-forget lastUsedAt update
  → Dev mode?
    → Set dev defaults, authMethod: "dev"
  → None?
    → Return 401 { code: "UNAUTHORIZED", action: "login" }
```

### Impersonation Middleware

```
X-Impersonate-User header present?
  → Caller platformRole !== "admin"?
    → Return 403 FORBIDDEN
  → Look up target user
    → Not found? Return 404
  → Store real admin identity: c.set("realActorId", adminUserId)
  → Swap context to target user's userId, role, teamId
  → Emit audit event: {
      action: "admin.impersonated",
      actorId: adminUserId,
      target: { type: "user", id: targetUserId },
      ip, createdAt
    }
  → Continue (all downstream middleware/routes see target user's context)
```

### Scope Check Middleware

```
authMethod === "apikey" AND request is mutation (POST/PUT/PATCH/DELETE)?
  → scope === "read"?
    → Return 403 { code: "SCOPE_INSUFFICIENT",
        message: "This API key has read-only access", action: "none" }
  → Continue
```

### Auth Error Response Format

```typescript
interface AuthError {
  error: {
    code: string;                  // machine-readable
    message: string;               // human-readable
    action: "refresh" | "login" | "show_deletion_notice" | "none";
    deletionDate?: string;         // only for ACCOUNT_DELETED
  }
}
```

### Role-Based Access Control

`requireRole(...roles)` — hierarchy: viewer(0) < member(1) < admin(2) < owner(3). Checks `userLevel >= minLevel`.

`requirePlatformAdmin()` — checks `platformRole === "admin"`. Returns 403 if not.

### CORS Configuration

```typescript
// Production
cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Authorization", "Content-Type", "X-API-Key", "X-Impersonate-User"],
  exposeHeaders: ["X-Request-Id", "X-RateLimit-Limit", "X-RateLimit-Remaining",
                   "X-RateLimit-Reset", "Retry-After"],
})

// Development
cors({
  origin: (origin) => origin?.startsWith("http://localhost") ? origin : null,
  credentials: true,
  // ... same headers
})
```

### Rate Limit Headers (every response)

```
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 347
X-RateLimit-Reset: 1742425200
Retry-After: 23                 // only on 429
```

Role-based limits: owner 1000/min, admin 500/min, member 200/min, viewer 50/min.

**API key rate limits:** API key requests inherit the user's role-based limit. For machine-to-machine integrations that need higher throughput, the user's role determines the ceiling. Pro teams may have elevated limits in the future (configurable per-plan), but at launch, API keys share the same pool as browser requests for the same userId.

### Route Protection Map

| Routes | Auth | Role | Platform | Scope | Notes |
|---|---|---|---|---|---|
| `/health`, `/auth/*` (public) | None | — | — | — | Auth rate limit only |
| `/countries`, `/news`, `/bootstrap`, etc. | Required | Any | — | read ok | |
| `/settings/*` | Required | member+ | — | read-write | |
| `/settings/notifications` | Required | Any | — | read-write | Own prefs |
| `/team` (read) | Required | Any | — | read ok | |
| `/team` (mutate), `/team/invite` | Required | admin+ | — | read-write | Audit logged |
| `/team` (delete), ownership transfer | Required | owner | — | read-write | Audit logged |
| `/team/leave` | Required | Any (not owner) | — | read-write | Audit logged |
| `/team/watchlist` (read) | Required | Any | — | read ok | |
| `/team/watchlist` (mutate) | Required | member+ | — | read-write | |
| `/team/views` (read) | Required | Any | — | read ok | |
| `/team/views` (mutate) | Required | member+ or creator | — | read-write | |
| `/team/settings/ai` (read) | Required | member+ | — | read ok | |
| `/team/settings/ai` (mutate) | Required | admin+ | — | read-write | |
| `/team/audit` | Required | admin+ | — | read ok | |
| `/auth/keys` (manage own) | Required | Any | — | read-write | Audit logged |
| `/auth/sessions` | Required | Any | — | read ok | |
| `/auth/me` (read) | Required | Any | — | read ok | |
| `/auth/me` (update) | Required | Any | — | read-write | |
| `/auth/providers/*` | Required | Any | — | read-write | Audit logged |
| `/auth/cancel-deletion` | Required | Any | — | — | |
| `/auth/account` (delete) | Required | Any | — | read-write | Audit logged |
| `/seed/*`, `/plugins/*/poll` | Required | — | admin | read-write | |
| `/admin/*` | Required | — | admin | read-write | Audit logged |

---

## Section 4: Routes & API Surface

### Auth Routes (`/api/v1/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/github` | None | Redirect to GitHub OAuth. Accepts `?invite={code}` or `?recovery={token}`. |
| `GET` | `/auth/github/callback` | None | Validate state, exchange code, findOrCreateUser, generate auth code, redirect to frontend. |
| `GET` | `/auth/google` | None | Same flow for Google. |
| `GET` | `/auth/google/callback` | None | Same flow for Google. |
| `POST` | `/auth/token` | None | Exchange one-time auth code for access JWT + refresh cookie. |
| `POST` | `/auth/refresh` | Cookie | Validate refresh cookie, rotate tokens, slide session expiry. |
| `POST` | `/auth/logout` | Required | Revoke current session, clear refresh cookie. |
| `POST` | `/auth/logout-all` | Required | Revoke all sessions except current. Audit logged. |
| `GET` | `/auth/me` | Required | Current user profile (includes linked providers, excludes tokens). |
| `PUT` | `/auth/me` | Required | Update display name, optional custom avatar URL. Sets `customAvatar = true`. |
| `POST` | `/auth/cancel-deletion` | Required | Cancel pending account deletion. Re-enables API keys. Audit logged. |
| `DELETE` | `/auth/account` | Required | Request account deletion (30-day soft delete). Owner must transfer ownership first if team has other members. Audit logged. |

### Provider Management (`/api/v1/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/link/github` | Required | Start OAuth flow to link GitHub as additional provider. |
| `GET` | `/auth/link/google` | Required | Same for Google. |
| `GET` | `/auth/link/github/callback` | Required | Callback for provider linking. |
| `GET` | `/auth/link/google/callback` | Required | Callback for provider linking. |
| `DELETE` | `/auth/providers/:provider` | Required | Unlink a provider. 409 if it's the only provider. Audit logged. |

### Session Routes (`/api/v1/auth/sessions`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/sessions` | Required | List active sessions. Parsed device, location, timestamps. Current session flagged. `?limit=50&offset=0`. |
| `DELETE` | `/auth/sessions/:id` | Required | Revoke a specific session. Own sessions only. Audit logged. |

### API Key Routes (`/api/v1/auth/keys`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/keys` | Required | Generate new key. Body: `{ name, scope, expiresAt? }`. Returns raw key **once**. Audit logged. |
| `GET` | `/auth/keys` | Required | List own keys (prefix, name, scope, lastUsedAt, createdAt, expiresAt). `?limit=50&offset=0`. |
| `DELETE` | `/auth/keys/:id` | Required | Revoke a key. Audit logged. |
| `POST` | `/auth/keys/:id/rotate` | Required | Rotate key. Returns new raw key. Old key valid for grace period. Body: `{ gracePeriodHours?: 24 }` (max 168 / 7 days). Audit logged with old + new prefix. |

### Team Routes (`/api/v1/team`)

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/team` | Required | Any | Team info + member list. `?search=&limit=50&offset=0`. |
| `PUT` | `/team` | Required | admin+ | Update team name/slug. Audit logged. |
| `DELETE` | `/team` | Required | owner | Delete team. All other members must be removed first. Audit logged. |
| `POST` | `/team/invite` | Required | admin+ | Generate invite code. Body: `{ label?, role, expiresInDays?, maxUses? }`. Defaults: 7 days, 10 uses. Max 50 active codes per team. Audit logged. |
| `GET` | `/team/invites` | Required | admin+ | List active invite codes with usage stats. |
| `DELETE` | `/team/invites/:code` | Required | admin+ | Revoke invite code. Audit logged. |
| `POST` | `/team/join` | Required | Any | Join team with invite code. Body: `{ code }`. Returns new access JWT directly (avoids full re-auth). Audit logged. |
| `POST` | `/team/leave` | Required | Any | Leave current team. Cannot leave if owner (must transfer first). Creates fresh personal team. Revokes API keys (security: keys should not carry over to new context). Returns new access JWT. Audit logged. |
| `GET` | `/team/invite-info/:code` | None | — | Public. Returns team name, inviter name, role being offered. 404/410 for invalid/expired. |
| `DELETE` | `/team/members/:userId` | Required | admin+ | Remove member. Cannot remove owner. Audit logged. |
| `PUT` | `/team/members/:userId/role` | Required | owner | Change role. Increments target's roleVersion. Audit logged. |
| `POST` | `/team/transfer-ownership` | Required | owner | Transfer to another member. Current owner becomes admin. Audit logged. |
| `GET` | `/team/audit` | Required | admin+ | Paginated audit log. `?action=&actorId=&from=&to=&limit=50&offset=0`. |

### Team Watchlist Routes (`/api/v1/team/watchlist`)

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/team/watchlist` | Required | Any | Get team watchlist. |
| `PUT` | `/team/watchlist` | Required | member+ | Replace team watchlist. |
| `PATCH` | `/team/watchlist` | Required | member+ | Add/remove entities. Body: `{ add?: string[], remove?: string[] }`. |

### Saved View Routes (`/api/v1/team/views`)

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/team/views` | Required | member+ | Create saved view. |
| `GET` | `/team/views` | Required | Any | List team's saved views. |
| `PUT` | `/team/views/:id` | Required | creator or admin+ | Update a saved view. |
| `DELETE` | `/team/views/:id` | Required | creator or admin+ | Delete a saved view. |

### Team AI Settings Routes (`/api/v1/team/settings`)

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/team/settings/ai` | Required | member+ | Get team AI config (key masked). |
| `PUT` | `/team/settings/ai` | Required | admin+ | Set team BYOK key + model. |
| `DELETE` | `/team/settings/ai` | Required | admin+ | Remove team BYOK key. |

### Notification Preferences (`/api/v1/settings/notifications`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/settings/notifications` | Required | Get notification preferences (returns defaults if none set). |
| `PUT` | `/settings/notifications` | Required | Update notification preferences. |

### Platform Admin Routes (`/api/v1/admin`)

| Method | Path | Auth | Platform | Description |
|---|---|---|---|---|
| `POST` | `/admin/recovery` | Required | admin | Send recovery email. Body: `{ email }`. 409 if active token exists (24h cooldown). Audit logged. |
| `GET` | `/admin/users` | Required | admin | List all users. `?search=&limit=50&offset=0`. |
| `GET` | `/admin/teams` | Required | admin | List all teams. `?search=&limit=50&offset=0`. |

### Existing Routes That Change

| Route | Before | After |
|---|---|---|
| `GET/PUT/DELETE /settings/ai` | `X-User-Id` header | `c.get("userId")` from auth context, requires member+. **Bug fix:** `GET` currently masks the encrypted ciphertext, not the plaintext. Fix: either decrypt-then-mask, or store the key prefix separately at write time. |
| `POST /news/analyze` | userId from header | `c.get("userId")` for trigger, BYOK key resolution (team then personal) |
| `GET /news/analysis` | No scoping | `teamScope(c)` — analyses visible to whole team |
| SSE `/events` | No auth, broadcasts all | Authenticated via query param token, team-filtered, periodic revalidation |
| `POST /seed/run` | Open | `requirePlatformAdmin()` |
| `POST /plugins/:id/poll` | Open | `requirePlatformAdmin()` |

### Invite Flow for New Users (Full Sequence)

1. Admin generates invite code via `POST /team/invite`
2. Admin shares link: `{FRONTEND_URL}/invite/{code}`
3. Recipient opens link — frontend calls `GET /team/invite-info/{code}` — shows team name, inviter, role: "You've been invited to join **Acme Intelligence** as a **member**"
4. Two paths:
   - **Already logged in:** "Join team" button calls `POST /team/join`
   - **Not logged in / no account:** OAuth buttons link to `/auth/github?invite={code}`. Invite code stored in state cookie alongside PKCE.
5. After OAuth callback, `findOrCreateUser` receives the invite code:
   - **New user:** Validates invite code. Creates user with invite's teamId and role directly — **skips personal team creation**. Decrements invite code uses.
   - **Existing user:** Normal login. Frontend redirects back to `/invite/{code}` page for explicit join.
6. Auth code issued — token exchange — frontend redirects to app (now in new team context).

---

## Section 5: findOrCreateUser Logic

### Input

```typescript
interface OAuthProfile {
  provider: "github" | "google";
  providerId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatar?: string;
}

interface FindOrCreateResult {
  user: User;
  isNew: boolean;
  joined?: { teamId: string; teamName: string };
  inviteError?: "expired" | "exhausted" | "not_found";
  emailUpdated?: { old: string; new: string };
}
```

### Decision Tree

```
findOrCreateUser(profile, inviteCode?)
  │
  ├─ Look up by provider + providerId
  │   Found? → RETURNING USER
  │   │  Update lastLoginAt
  │   │  Update avatar ONLY if customAvatar === false
  │   │  Email sync: if profile.email !== user.email && profile.emailVerified:
  │   │    → Check no other user has profile.email
  │   │    → If clear: update user.email, audit log user.email_updated { old, new, provider }
  │   │    → If taken: log warning, don't change
  │   │  If deletionRequestedAt set:
  │   │    → Clear deletionRequestedAt and deletedAt
  │   │    → Re-enable disabled API keys
  │   │    → Audit: user.deletion_cancelled { reason: "login" }
  │   │  If inviteCode present: ignore (already has account,
  │   │    frontend redirects to invite page for explicit join)
  │   │  Return { user, isNew: false }
  │
  ├─ emailVerified === false?
  │   → Reject: "Email not verified by provider.
  │     Please verify your email on GitHub/Google and try again."
  │
  ├─ Look up by email (only users without deletedAt)
  │   Found? → ACCOUNT LINKING
  │   │  Add provider to user's providers[]
  │   │  Update lastLoginAt
  │   │  Update avatar ONLY if customAvatar === false
  │   │  Name: never overwrite (user controls via PUT /auth/me)
  │   │  Audit: provider.linked { provider, providerId }
  │   │  Send "provider_linked" notification email:
  │   │    "A new sign-in method ({provider}) was linked to your account.
  │   │     If this wasn't you, remove it in account settings."
  │   │  If inviteCode present: ignore (same as returning user)
  │   │  Return { user, isNew: false }
  │
  ├─ No existing user found. New account creation:
  │   │
  │   │  Resolve invite code (if present):
  │   │  │  Atomic: findOneAndUpdate on team's inviteCodes entry
  │   │  │    filter: { code, expiresAt: { $gt: now }, uses: { $lt: maxUses } }
  │   │  │    update: { $inc: uses, $push: usedBy }
  │   │  │  Matched? → inviteValid = true, extract teamId + role
  │   │  │  No match? → inviteValid = false, determine reason:
  │   │  │    code not found → inviteError: "not_found"
  │   │  │    expired → inviteError: "expired"
  │   │  │    uses >= maxUses → inviteError: "exhausted"
  │   │
  │   ├─ inviteValid === true → NEW USER VIA INVITE
  │   │   Create user:
  │   │     - teamId = invite's teamId
  │   │     - role = invite's role
  │   │     - platformRole = "user"
  │   │     - roleVersion = 0
  │   │     - customAvatar = false
  │   │   Create default NotificationPreferences
  │   │   Audit: member.joined { teamId, inviteCode, role }
  │   │   Return { user, isNew: true, joined: { teamId, teamName } }
  │   │
  │   └─ inviteCode absent OR inviteValid === false → NEW USER (organic)
  │       First-user check:
  │         Atomic findOneAndUpdate on platformConfig singleton:
  │           filter: { _id: "config", firstUserClaimed: false }
  │           update: { $set: { firstUserClaimed: true, claimedBy: userId } }
  │         Matched? → this user gets platformRole: "admin"
  │         No match? → platformRole: "user"
  │       Generate team slug:
  │         slugify(name) → check uniqueness
  │         → collision? append "-{4 random alphanumeric}" → retry up to 3x
  │         → still colliding? append "-{8 char UUID fragment}"
  │       Create team:
  │         - name: "{name}'s Team"
  │         - slug: generated slug
  │         - plan: "free"
  │         - ownerId: userId
  │         - watchlist: []
  │       Create user:
  │         - teamId = new team id
  │         - role = "owner"
  │         - platformRole = resolved above
  │         - roleVersion = 0
  │         - customAvatar = false
  │       Create default NotificationPreferences
  │       Audit: user.login (first login)
  │       Return { user, isNew: true, inviteError? }
```

### Race Condition Protection

- **First user:** `findOneAndUpdate` with upsert on `platformConfig` singleton. First write wins atomically.
- **Email linking:** Unique index on `email`. Second insert fails, retry triggers linking path.
- **Invite code usage:** `findOneAndUpdate` with `$inc` and filter `{ uses: { $lt: maxUses } }`. Zero matches = code exhausted.

### Team Join for Existing Users (`POST /team/join`)

```
User calls POST /team/join { code }
  │
  ├─ Validate invite code (atomic findOneAndUpdate, same as above)
  │   Invalid? → Return error with reason
  │
  ├─ User owns a team with other members?
  │   → Return 409: "Transfer team ownership before joining another team"
  │
  ├─ Migrate user-scoped data:
  │   API keys: revoked (keys should not carry over to new team context)
  │   UserPreferences: no change (keyed by userId, team-independent)
  │   NotificationPreferences: no change (keyed by userId)
  │   UserSettings (BYOK keys): no change (keyed by userId)
  │
  ├─ Archive old personal team:
  │   Set deletedAt = now on old team
  │   Team-scoped data stays attached to old team record
  │   30-day TTL — background job hard-deletes after grace period
  │   If user leaves new team later, a fresh personal team is created
  │
  ├─ Update user:
  │   teamId = new team
  │   role = invite's role
  │   Increment roleVersion
  │
  ├─ Invalidate Redis roleVersion cache (DEL gambit:user:{userId}:rv)
  │
  ├─ Revoke all other sessions (keep current)
  │   Revoke all API keys (keys should not silently carry over to new team context)
  │
  ├─ Issue new access JWT with updated teamId + role (returned in response)
  │   Rotate refresh token cookie
  │
  ├─ Audit: member.joined { teamId, inviteCode, previousTeamId }
  │
  └─ Return 200: { accessToken, teamId, teamName, role }
      Frontend replaces stored access token, redirects to app
```

### Team Leave (`POST /team/leave`)

```
User calls POST /team/leave
  │
  ├─ User is team owner?
  │   → Return 409: "Transfer ownership before leaving the team"
  │
  ├─ Remove user from team (decrement member count)
  │
  ├─ Create fresh personal team:
  │   name: "{name}'s Team", slug: generated, plan: "free", ownerId: userId
  │
  ├─ Update user:
  │   teamId = new personal team
  │   role = "owner"
  │   Increment roleVersion
  │
  ├─ Invalidate Redis roleVersion cache
  │
  ├─ Revoke all API keys (security: keys should not carry context from old team)
  │   User preferences (watchlist, notifications) carry over (per-user, not per-team)
  │
  ├─ Issue new access JWT + rotate refresh cookie
  │
  ├─ Audit (on old team): member.removed { userId, reason: "left" }
  │
  └─ Return 200: { accessToken, teamId, teamName, role: "owner" }
```

### Name and Avatar Rules

| Field | First signup | Subsequent login | Account linking | `PUT /auth/me` |
|---|---|---|---|---|
| name | Set from OAuth | Never changed | Never changed | User updates freely |
| avatar | Set from OAuth | Updated from latest provider unless `customAvatar === true` | Not changed | User sets custom URL, `customAvatar = true` |
| email | Set from OAuth (verified) | Synced if provider email changed and new email not taken | Not changed | Not user-editable (tied to OAuth identity) |

---

## Section 6: Account Deletion, Recovery & Email Infrastructure

### Email Infrastructure

```typescript
interface EmailService {
  send(to: string, template: EmailTemplate, data: Record<string, any>): Promise<void>;
}

type EmailTemplate =
  | "new_device_login"      // device, location, revoke URL
  | "deletion_scheduled"    // deletionDate, cancel URL
  | "deletion_cancelled"    // confirmation only
  | "account_recovery"      // recovery URL, admin name, expiry
  | "team_invite"           // team name, inviter name, join URL
  | "provider_linked"       // provider name, account settings URL
```

Concrete adapter choice deferred — Resend, SendGrid, or AWS SES. Console logger adapter for development. Swapping providers is a single-file change.

**Environment variables:**
```
EMAIL_PROVIDER=resend|sendgrid|ses|console   # default "console" in dev
EMAIL_API_KEY=
EMAIL_FROM=noreply@gambit.app
```

### Account Deletion Flow

```
User calls DELETE /auth/account
  │
  ├─ Owner with other members?
  │   → 409: "Transfer ownership first"
  │
  ├─ Soft delete:
  │   Set user.deletionRequestedAt = now
  │   Set user.deletedAt = now + 30 days
  │   Revoke all sessions (force logout)
  │   Disable all API keys (disabled = true, disabledAt = now)
  │   Audit: user.deletion_requested
  │
  ├─ Send deletion_scheduled email
  │
  └─ Return 200: { deletionDate }
```

### Deletion Cancellation

Triggered by: `POST /auth/cancel-deletion` (explicit), OAuth login while soft-deleted (implicit), or recovery flow completion.

```
├─ Clear user.deletionRequestedAt and user.deletedAt
├─ Re-enable API keys: set disabled = false, unset disabledAt
├─ Audit: user.deletion_cancelled { reason: "manual" | "login" | "recovery" }
├─ Send deletion_cancelled email
└─ If via OAuth login: proceed with normal session creation
```

### Hard Deletion (Background Job, Daily)

```
Find users where deletedAt <= now
  │
  For each user:
  ├─ Delete all sessions
  ├─ Delete all API keys (hard delete)
  ├─ Delete UserPreferences
  ├─ Delete NotificationPreferences
  ├─ Delete UserSettings (BYOK keys)
  ├─ Anonymize in shared data:
  │   newsAnalysis: replace userId with "deleted-user"
  │   auditEvents: replace actorId with "deleted-user"
  ├─ If sole team owner (no other members):
  │   Delete the team
  │   Team-scoped audit events: keep, anonymized
  ├─ Delete the user document
  └─ Platform audit: user.deleted

  After hard deletion, re-signup with the same OAuth provider
  creates a completely new account — new userId, new team,
  no link to old data.
```

### Account Recovery

```
Platform admin calls POST /admin/recovery { email }
  │
  ├─ Look up user by email (including soft-deleted)
  │   Not found? → 404
  │
  ├─ Cooldown: existing unexpired token for this userId?
  │   → 409: "Recovery already initiated. Token expires at {time}."
  │
  ├─ Generate recovery token:
  │   { tokenHash (SHA-256), userId, createdBy, expiresAt: now + 24h, used: false }
  │
  ├─ Send account_recovery email
  ├─ Audit: user.recovery_initiated { targetEmail, targetUserId, adminId }
  └─ Return 200: { message: "Recovery email sent", expiresAt }
```

### Recovery Redemption

```
User clicks recovery link → /recover?token={token}
  │
  ├─ Frontend shows: "Link a new sign-in method to recover your account"
  │
  ├─ OAuth buttons → /auth/github?recovery={token}
  │   Token stored in state cookie alongside PKCE
  │
  ├─ After OAuth callback:
  │   Validate recovery token (exists, not expired, not used)
  │   Look up userId from token
  │   │
  │   ├─ User has deletionRequestedAt set?
  │   │   → Cancel deletion: clear fields, re-enable API keys
  │   │   → Audit: user.deletion_cancelled { reason: "recovery" }
  │   │
  │   ├─ Add new OAuth provider to user's providers[]
  │   ├─ Mark recovery token as used (usedAt = now)
  │   ├─ Proceed with normal login (auth code → token exchange)
  │   └─ Audit: user.recovery_completed { provider, newProviderEmail, adminWhoInitiated }
```

**Recovery security note:** Recovery tokens are high-security credentials. Anyone who intercepts a recovery email can link their own OAuth identity to the target account. The recovery flow intentionally allows linking any OAuth provider (since the user lost access to their original providers). Mitigations:
- Tokens are single-use and expire in 24 hours
- Only platform admins can initiate recovery (no self-service)
- One active token per user (24h cooldown)
- The audit trail records the new provider's email — if it doesn't match the account email, this is logged as a warning in the audit event metadata: `{ emailMismatch: true, accountEmail, recoveryEmail }`
- The user receives a `provider_linked` notification email to their account email when the new provider is added

---

## Section 7: Scoping Rules — What Lives Where

### Global (shared across all users and teams)

| Collection | Notes |
|---|---|
| countries, conflicts, bases, nonStateActors, chokepoints, elections, tradeRoutes, ports | Same world for everyone |
| news | Ingested articles are shared |
| edges (graph) | Entity relationships |
| temporalSnapshots | Historical world state |
| anomalies | Detected spikes/changes |
| pluginManifests | Available plugins (platform-level) |
| platformConfig | Singleton: firstUserClaimed, etc. |

### Per-Team (shared among team members)

| Collection | Notes |
|---|---|
| newsAnalysis | AI analyses benefit all team members |
| pluginConfigs | Which plugins enabled, team-specific settings (model deferred — will be defined when per-team plugin configuration is implemented) |
| teamSettings | Team-level BYOK key for AI analyses |
| savedViews | Shared map presets and monitoring views |
| auditEvents | Team activity history |
| teams | Team document (includes team watchlist) |

### Per-User (private)

| Collection | Notes |
|---|---|
| users | User profile |
| sessions | Login sessions |
| apiKeys | API access keys |
| userSettings | Personal BYOK LLM keys (encrypted) |
| userPreferences | Personal watchlist, alert prefs, default layers |
| notificationPreferences | Email notification settings |
| recoveryTokens | Account recovery |
| authCodes | Ephemeral OAuth exchange codes |

### Scoping Enforcement

```typescript
function teamScope(c: Context): { teamId: string } {
  return { teamId: c.get("teamId") };
}

function userScope(c: Context): { userId: string } {
  return { userId: c.get("userId") };
}
```

If a query on a scoped collection doesn't use `teamScope()` or `userScope()`, it's a bug.

### BYOK Key Resolution Order

```
Team-triggered analysis (auto-analysis on new article batch):
  → Use team BYOK key (from teamSettings)
  → Not set? Skip analysis, log "no team AI key configured"

User-triggered analysis ("analyze this article for me"):
  → Use user's personal BYOK key (from userSettings)
  → Not set? Fall back to team key
  → Neither set? Return 400: "Configure an AI key in settings"
```

### SSE Connection Lifecycle

```
Client connects to GET /events?token={accessToken}
  │
  ├─ Authenticate: validate token from query param
  │   (EventSource API doesn't support custom headers)
  │   Invalid? → 401, no stream
  │
  ├─ Tag connection with userId, teamId
  │
  ├─ Stream events:
  │   Global (news, risk-change, conflict-update, etc.) → all connections
  │   Team-scoped (news-analysis) → matching teamId only
  │
  ├─ Every 5 minutes: periodic auth check
  │   Redis lookup for roleVersion
  │   Redis down? Skip (fail open)
  │   Mismatch or user soft-deleted? → send auth-expired event, close
  │
  ├─ On auth-expired: frontend closes, refreshes tokens, reconnects
  │
  └─ Heartbeat every 30 seconds
```

**SSE auth security note:** The access token appears in the query parameter because the browser's `EventSource` API does not support custom headers. Mitigations:
- Token is short-lived (15 min) and the connection upgrades to a persistent stream immediately
- **Deployment requirement:** Reverse proxies (nginx, Cloudflare) MUST be configured to not log query parameters on the `/events` endpoint. Add this to the deployment checklist.
- **Alternative considered:** Ticket-based SSE auth (client POSTs to get a single-use connection ticket, then connects with that ticket instead of the JWT). This eliminates the token-in-URL issue entirely but adds a round trip. If the query param approach proves problematic in production, switch to ticket-based auth.

### Watchlist Merging (Frontend)

Frontend merges personal watchlist (`userPreferences.watchlist`) with team watchlist (`team.watchlist`). Team items display with a team badge. Anomaly alerts fire on both personal and team-watched entities.

---

## Environment Variables (New)

```
# Auth
JWT_SECRET=                          # random 64+ char string
GITHUB_CLIENT_ID=                    # GitHub OAuth app
GITHUB_CLIENT_SECRET=
GOOGLE_CLIENT_ID=                    # Google Cloud Console
GOOGLE_CLIENT_SECRET=
FRONTEND_URL=http://localhost:5173   # redirect target after OAuth

# Email
EMAIL_PROVIDER=console               # resend | sendgrid | ses | console
EMAIL_API_KEY=
EMAIL_FROM=noreply@gambit.app

# Existing (unchanged)
SETTINGS_ENCRYPTION_KEY=             # 32-byte hex, used for BYOK key encryption
```

---

## New Files

```
api/src/
  infrastructure/
    auth.ts                           # JWT creation/verification, findOrCreateUser, slug generation
    email.ts                          # EmailService interface + adapter factory
    email-templates/                  # Template strings per EmailTemplate type
  middleware/
    auth.ts                           # authenticate middleware (replaces api-key.ts)
    require-role.ts                   # requireRole() factory
    require-platform-admin.ts         # requirePlatformAdmin()
    impersonation.ts                  # X-Impersonate-User handling
    scope-check.ts                    # API key read/read-write enforcement
    auth-rate-limit.ts                # IP-based rate limit for /auth/* endpoints
  modules/
    system/
      auth-routes.ts                  # OAuth, token, refresh, logout, me, deletion, providers
      api-key-routes.ts               # CRUD + rotate for API keys
      team-routes.ts                  # Team CRUD, invite, join, members, watchlist, views, audit
      team-settings-routes.ts         # Team-level BYOK AI config
      notification-routes.ts          # Notification preferences
      admin-routes.ts                 # Platform admin: recovery, user list, team list
  types/
    index.ts                          # Add all new interfaces and types
```

## Files to Modify

```
api/src/
  middleware/api-key.ts               # Replaced by middleware/auth.ts (delete old file)
  middleware/rate-limit.ts            # Use c.get("userId") instead of IP, add response headers
  modules/system/settings-routes.ts   # Replace getUserId(c) with c.get("userId"), add requireRole
  modules/realtime/sse.ts             # Add auth, team filtering, periodic revalidation
  index.ts                            # Swap middleware, mount new routes, add CORS config
  infrastructure/user-settings.ts     # No changes (already takes userId param)
  infrastructure/ai-analysis.ts       # BYOK resolution: team key → personal key
```

## Background Jobs (New)

| Job | Interval | Description |
|---|---|---|
| Hard deletion cleanup | Daily | Find users with `deletedAt <= now`, anonymize + delete |
| Archived team cleanup | Daily | Delete teams with `deletedAt <= now - 30 days` |
| Expired session cleanup | Handled by MongoDB TTL index on `absoluteExpiresAt` | |
| Expired auth code cleanup | Handled by MongoDB TTL index on `expiresAt` | |
| Expired recovery token cleanup | Handled by MongoDB TTL index on `expiresAt` | |
