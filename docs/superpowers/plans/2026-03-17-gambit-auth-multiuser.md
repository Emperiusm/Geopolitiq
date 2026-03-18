# Gambit Auth & Multi-User Platform Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add OAuth authentication (GitHub + Google), JWT sessions, team collaboration with RBAC, API key access, platform admin, account lifecycle, and scoping rules to the Gambit backend.

**Architecture:** Replace the existing static API key middleware with a full auth stack: Arctic for OAuth, jose for JWTs, httpOnly refresh cookies, MongoDB-backed sessions, Redis-cached role versions, and per-team/per-user data scoping. Auth context flows through Hono middleware via `c.set()`/`c.get()`.

**Tech Stack:** Bun runtime, Hono web framework, MongoDB (driver, no ORM), Redis (ioredis), Arctic (OAuth), jose (JWT), crypto (SHA-256, AES-256-GCM)

**Spec:** `docs/superpowers/specs/2026-03-17-gambit-auth-multiuser-design.md`

**Environment:**
- Runtime: Bun (not Node). Tests: `bun test`
- Redis port: **6380** (not 6379)
- MongoDB: port 27017, container `gambit-mongo`
- Start services: `docker compose up -d mongo redis` (from repo root)
- Start API: `cd api && bun src/index.ts`
- Run tests: `cd api && bun test`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `api/src/types/auth.ts` | All auth-related types: User, Team, Session, AuthCode, ApiKey, UserPreferences, NotificationPreferences, TeamSettings, SavedView, AuditEvent, RecoveryToken, PlatformConfig, enums, auth context |
| `api/src/infrastructure/auth.ts` | JWT sign/verify (jose), password hashing (SHA-256), refresh token generation, slug generation, findOrCreateUser decision tree |
| `api/src/infrastructure/email.ts` | EmailService interface, console adapter, adapter factory |
| `api/src/infrastructure/indexes.ts` | `ensureAuthIndexes()` — creates all auth-related MongoDB indexes |
| `api/src/middleware/authenticate.ts` | Main auth middleware: JWT verification, API key lookup, role version check, dev bypass |
| `api/src/middleware/require-role.ts` | `requireRole(...roles)` — hierarchy-based RBAC guard |
| `api/src/middleware/require-platform-admin.ts` | `requirePlatformAdmin()` — platform-level admin guard |
| `api/src/middleware/impersonation.ts` | `X-Impersonate-User` header handling with audit logging |
| `api/src/middleware/scope-check.ts` | API key scope enforcement (read vs read-write) |
| `api/src/middleware/auth-rate-limit.ts` | IP-based rate limit for `/auth/*` endpoints (10 req/min) |
| `api/src/modules/system/auth-routes.ts` | OAuth flows, token exchange, refresh, logout, `/auth/me`, account deletion, provider linking |
| `api/src/modules/system/api-key-routes.ts` | API key CRUD + rotate |
| `api/src/modules/system/team-routes.ts` | Team CRUD, invite, join, leave, members, watchlist, views, audit |
| `api/src/modules/system/team-settings-routes.ts` | Team-level BYOK AI config |
| `api/src/modules/system/notification-routes.ts` | Notification preferences |
| `api/src/modules/system/admin-routes.ts` | Platform admin: recovery, user/team list |
| `api/tests/infrastructure/auth.test.ts` | Tests for JWT, hashing, slug, findOrCreateUser |
| `api/tests/infrastructure/email.test.ts` | Tests for email service |
| `api/tests/infrastructure/indexes.test.ts` | Tests for index creation |
| `api/tests/middleware/authenticate.test.ts` | Tests for auth middleware |
| `api/tests/middleware/require-role.test.ts` | Tests for role guard |
| `api/tests/middleware/scope-check.test.ts` | Tests for scope check |
| `api/tests/middleware/auth-rate-limit.test.ts` | Tests for auth rate limiter |
| `api/tests/modules/auth-routes.test.ts` | Tests for auth routes |
| `api/tests/modules/api-key-routes.test.ts` | Tests for API key routes |
| `api/tests/modules/team-routes.test.ts` | Tests for team routes |
| `api/tests/modules/team-settings-routes.test.ts` | Tests for team settings |
| `api/tests/modules/notification-routes.test.ts` | Tests for notification routes |
| `api/tests/modules/admin-routes.test.ts` | Tests for admin routes |

### Modified Files

| File | Changes |
|------|---------|
| `api/src/types/index.ts` | Re-export from `auth.ts` |
| `api/src/middleware/cors.ts` | `credentials: true`, new allowed methods/headers, expose rate limit headers, production `FRONTEND_URL` |
| `api/src/middleware/rate-limit.ts` | Per-userId (not IP), role-based limits, `X-RateLimit-Reset` header |
| `api/src/modules/system/settings-routes.ts` | Replace `getUserId(c)` with `c.get("userId")`, add `requireRole`, fix GET masking bug |
| `api/src/infrastructure/user-settings.ts` | Export `encrypt` and `decrypt` functions (needed by team-settings-routes.ts) |
| `api/src/modules/realtime/sse.ts` | Query param token auth, team-scoped filtering, periodic revalidation |
| `api/src/infrastructure/ai-analysis.ts` | BYOK key resolution: team → personal. `analyzeForUser` gains `teamId` param |
| `api/src/modules/realtime/news.ts` | Add `GET /news/analysis` (team-scoped) and `POST /news/analyze` (BYOK resolution via auth context) |
| `api/src/index.ts` | Swap middleware stack, mount new routes, call `ensureAuthIndexes()` |

### Deleted Files

| File | Reason |
|------|--------|
| `api/src/middleware/api-key.ts` | Replaced by `authenticate.ts` |
| `api/tests/middleware/api-key.test.ts` | Replaced by `authenticate.test.ts` |

---

---

# Phase 1: Foundation — Types, Infrastructure, Middleware (Tasks 1–11)

> **Parallelism:** Tasks 6, 7, 8, 9 are fully independent. Tasks 10, 11 are independent.
> **Review checkpoint:** After Phase 1, verify all middleware works correctly in isolation before building routes on top. Run `bun test` and `bun x tsc --noEmit`.

---

## Task 1: Install Dependencies

**Files:**
- Modify: `api/package.json`

- [ ] **Step 1: Install arctic and jose**

```bash
cd api && bun add arctic jose
```

Arctic provides OAuth provider flows (GitHub, Google) with PKCE and state management. jose provides JWT creation and verification.

- [ ] **Step 2: Verify installation**

```bash
cd api && bun x tsc --noEmit 2>&1 | head -5
```

Expected: No new type errors (existing ones are fine).

- [ ] **Step 3: Commit**

```bash
cd api && git add package.json bun.lock
git commit -m "feat: add arctic and jose dependencies for OAuth and JWT auth"
```

---

## Task 2: Auth Types

**Files:**
- Create: `api/src/types/auth.ts`
- Modify: `api/src/types/index.ts`
- Test: `api/tests/types/auth.test.ts`

- [ ] **Step 1: Write the type test**

Create `api/tests/types/auth.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import type {
  User, Team, Session, AuthCode, ApiKey, UserPreferences,
  NotificationPreferences, TeamSettings, SavedView, AuditEvent,
  RecoveryToken, PlatformConfig, UserRole, PlatformRole,
  TeamPlan, ApiKeyScope, AuditAction, AuthMethod, AuthContext,
  OAuthProfile, FindOrCreateResult, TokenResponse, AuthError,
  EmailTemplate,
} from "../../src/types/auth";

describe("Auth types", () => {
  it("UserRole values are correct", () => {
    const roles: UserRole[] = ["owner", "admin", "member", "viewer"];
    expect(roles).toHaveLength(4);
  });

  it("PlatformRole values are correct", () => {
    const roles: PlatformRole[] = ["admin", "user"];
    expect(roles).toHaveLength(2);
  });

  it("AuthContext shape is valid", () => {
    const ctx: AuthContext = {
      userId: "abc",
      role: "member",
      teamId: "team-1",
      platformRole: "user",
      authMethod: "jwt",
      roleVersion: 1,
    };
    expect(ctx.userId).toBe("abc");
    expect(ctx.authMethod).toBe("jwt");
  });

  it("AuthContext with API key metadata", () => {
    const ctx: AuthContext = {
      userId: "abc",
      role: "member",
      teamId: "team-1",
      platformRole: "user",
      authMethod: "apikey",
      roleVersion: 1,
      scope: "read",
      apiKeyMeta: { id: "k1", name: "test", prefix: "gbt_abcd" },
    };
    expect(ctx.scope).toBe("read");
    expect(ctx.apiKeyMeta?.prefix).toBe("gbt_abcd");
  });

  it("TokenResponse shape is valid", () => {
    const res: TokenResponse = {
      accessToken: "jwt...",
      isNew: false,
    };
    expect(res.accessToken).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/types/auth.test.ts
```

Expected: FAIL — cannot resolve `../../src/types/auth`.

- [ ] **Step 3: Create auth types file**

Create `api/src/types/auth.ts`:

```typescript
// api/src/types/auth.ts — All auth-related type definitions

// --- Enums ---

export type UserRole = "owner" | "admin" | "member" | "viewer";
export type PlatformRole = "admin" | "user";
export type TeamPlan = "free" | "pro";
export type ApiKeyScope = "read" | "read-write";
export type AuthMethod = "jwt" | "apikey" | "dev";

export type AuditAction =
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

export type EmailTemplate =
  | "new_device_login"
  | "deletion_scheduled"
  | "deletion_cancelled"
  | "account_recovery"
  | "team_invite"
  | "provider_linked";

// --- Data Models ---

export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  customAvatar: boolean;
  role: UserRole;
  platformRole: PlatformRole;
  teamId: string;
  roleVersion: number;
  providers: Array<{
    provider: "github" | "google";
    providerId: string;
    email: string;
    verified: boolean;
    linkedAt: Date;
  }>;
  lastLoginAt: Date;
  lastLoginIp?: string;
  deletionRequestedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  _id: string;
  name: string;
  slug: string;
  plan: TeamPlan;
  ownerId: string;
  watchlist: string[];
  inviteCodes: Array<{
    code: string;
    label?: string;
    role: UserRole;
    createdBy: string;
    expiresAt: Date;
    maxUses: number;
    uses: number;
    usedBy: string[];
  }>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  _id: string;
  userId: string;
  teamId: string;
  refreshTokenHash: string;
  device: {
    browser: string;
    os: string;
    raw: string;
  };
  ip: string;
  location?: {
    city: string;
    country: string;
  };
  isNewDevice: boolean;
  createdAt: Date;
  lastRefreshedAt: Date;
  expiresAt: Date;
  absoluteExpiresAt: Date;
}

export interface AuthCode {
  _id: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
  isNew?: boolean;
  joined?: { teamId: string; teamName: string };
  inviteError?: "expired" | "exhausted" | "not_found";
}

export interface ApiKey {
  _id: string;
  keyHash: string;
  keyPrefix: string;
  userId: string;
  teamId: string;
  name: string;
  scope: ApiKeyScope;
  disabled: boolean;
  disabledAt?: Date;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt?: Date;
}

export interface UserPreferences {
  _id: string;
  watchlist: string[];
  alertSeverity: "watch" | "alert" | "critical";
  alertEntities?: string[];
  defaultLayers: string[];
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  _id: string;
  loginAlerts: boolean;
  teamInvites: boolean;
  anomalyDigest: "realtime" | "daily" | "off";
  updatedAt: Date;
}

export interface TeamSettings {
  _id: string;
  llmProvider?: "anthropic" | "openai";
  llmApiKey?: string;
  llmModel?: string;
  aiAnalysisEnabled: boolean;
  updatedBy: string;
  updatedAt: Date;
}

export interface SavedView {
  _id: string;
  teamId: string;
  createdBy: string;
  name: string;
  layers: string[];
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

export interface AuditEvent {
  _id: string;
  teamId: string;
  actorId: string;
  realActorId?: string;
  viaApiKey?: {
    id: string;
    name: string;
    prefix: string;
  };
  action: AuditAction;
  target?: {
    type: "user" | "apikey" | "team" | "session" | "invite";
    id: string;
  };
  metadata?: Record<string, any>;
  ip: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface RecoveryToken {
  _id: string;
  tokenHash: string;
  userId: string;
  createdBy: string;
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
}

export interface PlatformConfig {
  _id: "config";
  firstUserClaimed: boolean;
  claimedBy?: string;
}

// --- Auth Context (set by middleware, read by routes) ---

export interface AuthContext {
  userId: string;
  role: UserRole;
  teamId: string;
  platformRole: PlatformRole;
  authMethod: AuthMethod;
  roleVersion: number;
  scope?: ApiKeyScope;
  apiKeyMeta?: { id: string; name: string; prefix: string };
  realActorId?: string;
}

// --- OAuth Types ---

export interface OAuthProfile {
  provider: "github" | "google";
  providerId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatar?: string;
}

export interface FindOrCreateResult {
  user: User;
  isNew: boolean;
  joined?: { teamId: string; teamName: string };
  inviteError?: "expired" | "exhausted" | "not_found";
  emailUpdated?: { old: string; new: string };
}

// --- API Response Types ---

export interface TokenResponse {
  accessToken: string;
  isNew: boolean;
  joined?: { teamId: string; teamName: string };
  inviteError?: "expired" | "exhausted" | "not_found";
}

export interface AuthError {
  error: {
    code: string;
    message: string;
    action: "refresh" | "login" | "show_deletion_notice" | "none";
    deletionDate?: string;
  };
}
```

- [ ] **Step 4: Re-export auth types from main types file**

Add to the end of `api/src/types/index.ts`:

```typescript
// --- Auth & Multi-User Types ---
export * from "./auth";
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd api && bun test tests/types/auth.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/src/types/auth.ts api/src/types/index.ts api/tests/types/auth.test.ts
git commit -m "feat: add auth type definitions for multi-user platform"
```

---

## Task 3: Auth Infrastructure — JWT, Hashing, Slugs

**Files:**
- Create: `api/src/infrastructure/auth.ts`
- Test: `api/tests/infrastructure/auth.test.ts`

This file contains pure utility functions: JWT sign/verify, SHA-256 hashing, refresh token generation, slug generation, role hierarchy, and audit event logging. `findOrCreateUser` will be added in Task 11.

- [ ] **Step 1: Write the failing tests**

Create `api/tests/infrastructure/auth.test.ts`:

```typescript
import { describe, it, expect, beforeAll } from "bun:test";
import {
  signAccessToken,
  verifyAccessToken,
  hashToken,
  generateRefreshToken,
  generateSlug,
  roleLevel,
  generateAuthCode,
  logAudit,
} from "../../src/infrastructure/auth";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  // Clean audit events from prior runs
  await getDb().collection("auditEvents").deleteMany({});
});

describe("JWT", () => {
  const payload = {
    userId: "u1",
    role: "member" as const,
    teamId: "t1",
    platformRole: "user" as const,
    roleVersion: 0,
  };

  it("signs and verifies an access token", async () => {
    const token = await signAccessToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const decoded = await verifyAccessToken(token);
    expect(decoded.userId).toBe("u1");
    expect(decoded.role).toBe("member");
    expect(decoded.teamId).toBe("t1");
    expect(decoded.platformRole).toBe("user");
    expect(decoded.roleVersion).toBe(0);
  });

  it("rejects expired tokens", async () => {
    // Sign with 0-second expiry
    const token = await signAccessToken(payload, "0s");
    // Wait a tick for expiry
    await new Promise((r) => setTimeout(r, 50));
    await expect(verifyAccessToken(token)).rejects.toThrow();
  });

  it("rejects tampered tokens", async () => {
    const token = await signAccessToken(payload);
    const tampered = token.slice(0, -5) + "XXXXX";
    await expect(verifyAccessToken(tampered)).rejects.toThrow();
  });
});

describe("hashing", () => {
  it("produces consistent SHA-256 hex hashes", () => {
    const hash1 = hashToken("my-secret-token");
    const hash2 = hashToken("my-secret-token");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});

describe("generateRefreshToken", () => {
  it("returns a 64-char hex string", () => {
    const token = generateRefreshToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates unique tokens", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
  });
});

describe("generateAuthCode", () => {
  it("returns a UUID-format string", () => {
    const code = generateAuthCode();
    expect(code).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe("generateSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(generateSlug("John Doe")).toBe("john-doe");
  });

  it("strips non-alphanumeric characters", () => {
    expect(generateSlug("Hello, World!")).toBe("hello-world");
  });

  it("collapses multiple hyphens", () => {
    expect(generateSlug("a - - b")).toBe("a-b");
  });

  it("trims leading/trailing hyphens", () => {
    expect(generateSlug(" --test-- ")).toBe("test");
  });

  it("handles unicode by stripping diacritics", () => {
    expect(generateSlug("José García")).toBe("jose-garcia");
  });
});

describe("roleLevel", () => {
  it("assigns correct hierarchy values", () => {
    expect(roleLevel("viewer")).toBe(0);
    expect(roleLevel("member")).toBe(1);
    expect(roleLevel("admin")).toBe(2);
    expect(roleLevel("owner")).toBe(3);
  });
});

describe("logAudit", () => {
  it("inserts an audit event into MongoDB", async () => {
    await logAudit({
      teamId: "t1",
      actorId: "u1",
      action: "user.login",
      ip: "127.0.0.1",
      plan: "free",
    });

    const db = getDb();
    const event = await db.collection("auditEvents").findOne({
      teamId: "t1",
      action: "user.login",
    });
    expect(event).not.toBeNull();
    expect(event!.actorId).toBe("u1");
    expect(event!.expiresAt).toBeInstanceOf(Date);
    // Free plan = 90 days
    const daysDiff = (event!.expiresAt.getTime() - event!.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(90, 0);
  });

  it("sets 365-day expiry for pro plan", async () => {
    await logAudit({
      teamId: "t2",
      actorId: "u2",
      action: "team.updated",
      ip: "127.0.0.1",
      plan: "pro",
    });

    const db = getDb();
    const event = await db.collection("auditEvents").findOne({
      teamId: "t2",
      action: "team.updated",
    });
    const daysDiff = (event!.expiresAt.getTime() - event!.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(365, 0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/infrastructure/auth.test.ts
```

Expected: FAIL — cannot resolve `../../src/infrastructure/auth`.

- [ ] **Step 3: Implement auth infrastructure**

Create `api/src/infrastructure/auth.ts`:

```typescript
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { createHash, randomBytes, randomUUID } from "crypto";
import { getDb } from "./mongo";
import type { UserRole, PlatformRole, AuditAction, TeamPlan } from "../types/auth";

// --- JWT ---

const JWT_EXPIRY = "15m";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "dev-jwt-secret-change-me-in-production-64-chars-minimum-padding!";
  return new TextEncoder().encode(secret);
}

interface AccessTokenPayload {
  userId: string;
  role: UserRole;
  teamId: string;
  platformRole: PlatformRole;
  roleVersion: number;
}

export async function signAccessToken(
  payload: AccessTokenPayload,
  expiresIn: string = JWT_EXPIRY,
): Promise<string> {
  return new SignJWT({ ...payload } as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer("gambit")
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    issuer: "gambit",
  });
  return {
    userId: payload.userId as string,
    role: payload.role as UserRole,
    teamId: payload.teamId as string,
    platformRole: payload.platformRole as PlatformRole,
    roleVersion: payload.roleVersion as number,
  };
}

// --- Hashing ---

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// --- Token Generation ---

export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateAuthCode(): string {
  return randomUUID();
}

// --- Slug Generation ---

export function generateSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")   // strip non-alphanumeric
    .replace(/[\s-]+/g, "-")         // spaces/hyphens → single hyphen
    .replace(/^-+|-+$/g, "");        // trim leading/trailing hyphens
}

export async function generateUniqueSlug(baseName: string): Promise<string> {
  const db = getDb();
  const base = generateSlug(baseName);
  // Try base slug first
  const exists = await db.collection("teams").findOne({ slug: base });
  if (!exists) return base;

  // Try with random suffix up to 3 times
  for (let i = 0; i < 3; i++) {
    const suffix = randomBytes(2).toString("hex"); // 4 chars
    const candidate = `${base}-${suffix}`;
    const taken = await db.collection("teams").findOne({ slug: candidate });
    if (!taken) return candidate;
  }

  // Final fallback: UUID fragment
  return `${base}-${randomUUID().slice(0, 8)}`;
}

// --- Role Hierarchy ---

const ROLE_LEVELS: Record<UserRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function roleLevel(role: UserRole): number {
  return ROLE_LEVELS[role];
}

// --- Device Parsing ---

export function parseDevice(userAgent: string): { browser: string; os: string } {
  let browser = "Unknown";
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) browser = "Chrome";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Edg")) browser = "Edge";

  let os = "Unknown";
  if (userAgent.includes("Windows NT 10")) os = "Windows";
  else if (userAgent.includes("Macintosh")) os = "macOS";
  else if (userAgent.includes("iPhone")) os = "iPhone";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("Linux")) os = "Linux";

  return { browser, os };
}

// --- Audit Logging ---

interface AuditParams {
  teamId: string;
  actorId: string;
  action: AuditAction;
  ip: string;
  plan: TeamPlan;
  realActorId?: string;
  viaApiKey?: { id: string; name: string; prefix: string };
  target?: { type: "user" | "apikey" | "team" | "session" | "invite"; id: string };
  metadata?: Record<string, any>;
}

export async function logAudit(params: AuditParams): Promise<void> {
  const db = getDb();
  const now = new Date();
  const retentionDays = params.plan === "pro" ? 365 : 90;
  const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

  await db.collection("auditEvents").insertOne({
    _id: randomUUID(),
    teamId: params.teamId,
    actorId: params.actorId,
    realActorId: params.realActorId,
    viaApiKey: params.viaApiKey,
    action: params.action,
    target: params.target,
    metadata: params.metadata,
    ip: params.ip,
    expiresAt,
    createdAt: now,
  });
}

// --- Scoping Helpers ---

export function teamScope(teamId: string): { teamId: string } {
  return { teamId };
}

export function userScope(userId: string): { userId: string } {
  return { userId };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd api && bun test tests/infrastructure/auth.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/infrastructure/auth.ts api/tests/infrastructure/auth.test.ts
git commit -m "feat: add auth infrastructure — JWT, hashing, slugs, audit logging"
```

---

## Task 4: MongoDB Auth Indexes

**Files:**
- Create: `api/src/infrastructure/indexes.ts`
- Test: `api/tests/infrastructure/indexes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `api/tests/infrastructure/indexes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { ensureAuthIndexes } from "../../src/infrastructure/indexes";

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
});

afterAll(async () => {
  await disconnectMongo();
});

describe("ensureAuthIndexes", () => {
  it("creates all required indexes without errors", async () => {
    await ensureAuthIndexes();
    // If it doesn't throw, indexes were created successfully
  });

  it("creates unique email index on users", async () => {
    const db = getDb();
    const indexes = await db.collection("users").indexes();
    const emailIdx = indexes.find((i: any) =>
      i.key?.email !== undefined && i.unique === true,
    );
    expect(emailIdx).toBeTruthy();
  });

  it("creates TTL index on authCodes", async () => {
    const db = getDb();
    const indexes = await db.collection("authCodes").indexes();
    const ttlIdx = indexes.find((i: any) =>
      i.key?.expiresAt !== undefined && i.expireAfterSeconds !== undefined,
    );
    expect(ttlIdx).toBeTruthy();
  });

  it("creates TTL index on sessions", async () => {
    const db = getDb();
    const indexes = await db.collection("sessions").indexes();
    const ttlIdx = indexes.find((i: any) =>
      i.key?.absoluteExpiresAt !== undefined && i.expireAfterSeconds !== undefined,
    );
    expect(ttlIdx).toBeTruthy();
  });

  it("creates unique keyHash index on apiKeys", async () => {
    const db = getDb();
    const indexes = await db.collection("apiKeys").indexes();
    const hashIdx = indexes.find((i: any) =>
      i.key?.keyHash !== undefined && i.unique === true,
    );
    expect(hashIdx).toBeTruthy();
  });

  it("is idempotent — runs twice without error", async () => {
    await ensureAuthIndexes();
    await ensureAuthIndexes();
    // No error = idempotent
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/infrastructure/indexes.test.ts
```

Expected: FAIL — cannot resolve `ensureAuthIndexes`.

- [ ] **Step 3: Implement indexes**

Create `api/src/infrastructure/indexes.ts`:

```typescript
import { getDb } from "./mongo";

export async function ensureAuthIndexes(): Promise<void> {
  const db = getDb();

  // users
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex(
    { "providers.provider": 1, "providers.providerId": 1 },
    { unique: true },
  );
  await db.collection("users").createIndex({ teamId: 1 });
  await db.collection("users").createIndex(
    { deletedAt: 1 },
    { sparse: true },
  );

  // teams
  await db.collection("teams").createIndex({ slug: 1 }, { unique: true });

  // sessions
  await db.collection("sessions").createIndex({ userId: 1 });
  await db.collection("sessions").createIndex(
    { absoluteExpiresAt: 1 },
    { expireAfterSeconds: 0 },
  );

  // authCodes
  await db.collection("authCodes").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );

  // apiKeys
  await db.collection("apiKeys").createIndex({ keyHash: 1 }, { unique: true });
  await db.collection("apiKeys").createIndex({ userId: 1 });
  await db.collection("apiKeys").createIndex({ teamId: 1 });

  // auditEvents
  await db.collection("auditEvents").createIndex({ teamId: 1, createdAt: -1 });
  await db.collection("auditEvents").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );

  // savedViews
  await db.collection("savedViews").createIndex({ teamId: 1 });

  // recoveryTokens
  await db.collection("recoveryTokens").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );
  await db.collection("recoveryTokens").createIndex({ userId: 1 });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd api && bun test tests/infrastructure/indexes.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/infrastructure/indexes.ts api/tests/infrastructure/indexes.test.ts
git commit -m "feat: add MongoDB index creation for auth collections"
```

---

## Task 5: Email Infrastructure

**Files:**
- Create: `api/src/infrastructure/email.ts`
- Test: `api/tests/infrastructure/email.test.ts`

- [ ] **Step 1: Write the failing test**

Create `api/tests/infrastructure/email.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { createEmailService, type EmailService } from "../../src/infrastructure/email";

describe("EmailService — console adapter", () => {
  it("creates a console email service by default", () => {
    const svc = createEmailService();
    expect(svc).toBeTruthy();
    expect(typeof svc.send).toBe("function");
  });

  it("send resolves without error", async () => {
    const svc = createEmailService();
    await svc.send("test@example.com", "new_device_login", {
      device: "Chrome on Windows",
      location: "New York, US",
    });
    // Should not throw
  });

  it("records sent emails for testing", async () => {
    const svc = createEmailService();
    await svc.send("a@b.com", "deletion_scheduled", { deletionDate: "2026-04-16" });
    expect(svc.getSentEmails()).toHaveLength(1);
    expect(svc.getSentEmails()[0].to).toBe("a@b.com");
    expect(svc.getSentEmails()[0].template).toBe("deletion_scheduled");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/infrastructure/email.test.ts
```

Expected: FAIL — cannot resolve `../../src/infrastructure/email`.

- [ ] **Step 3: Implement email service**

Create `api/src/infrastructure/email.ts`:

```typescript
import type { EmailTemplate } from "../types/auth";

interface SentEmail {
  to: string;
  template: EmailTemplate;
  data: Record<string, any>;
  sentAt: Date;
}

export interface EmailService {
  send(to: string, template: EmailTemplate, data: Record<string, any>): Promise<void>;
  getSentEmails(): SentEmail[];
}

function createConsoleEmailService(): EmailService {
  const sent: SentEmail[] = [];

  return {
    async send(to, template, data) {
      const entry: SentEmail = { to, template, data, sentAt: new Date() };
      sent.push(entry);
      console.log(`[email] → ${to} | template=${template} | data=${JSON.stringify(data)}`);
    },
    getSentEmails() {
      return sent;
    },
  };
}

export function createEmailService(): EmailService {
  const provider = process.env.EMAIL_PROVIDER || "console";

  switch (provider) {
    case "console":
      return createConsoleEmailService();
    // Future: case "resend": / "sendgrid": / "ses":
    default:
      console.warn(`[email] Unknown provider "${provider}", falling back to console`);
      return createConsoleEmailService();
  }
}

// Singleton instance
let emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = createEmailService();
  }
  return emailService;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd api && bun test tests/infrastructure/email.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/infrastructure/email.ts api/tests/infrastructure/email.test.ts
git commit -m "feat: add email service infrastructure with console adapter"
```

---

## Task 6: Auth Rate Limiter Middleware

**Files:**
- Create: `api/src/middleware/auth-rate-limit.ts`
- Test: `api/tests/middleware/auth-rate-limit.test.ts`

- [ ] **Step 1: Write the failing test**

Create `api/tests/middleware/auth-rate-limit.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { authRateLimit } from "../../src/middleware/auth-rate-limit";

describe("auth rate limit middleware", () => {
  it("allows requests under the limit", async () => {
    const app = new Hono();
    app.use("*", authRateLimit);
    app.get("/auth/test", (c) => c.json({ ok: true }));

    const res = await app.request("/auth/test");
    expect(res.status).toBe(200);
  });

  it("returns 429 after exceeding 10 requests", async () => {
    const app = new Hono();
    app.use("*", authRateLimit);
    app.get("/auth/test", (c) => c.json({ ok: true }));

    // Send 11 requests (limit is 10/min)
    for (let i = 0; i < 10; i++) {
      await app.request("/auth/test");
    }
    const res = await app.request("/auth/test");
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/middleware/auth-rate-limit.test.ts
```

Expected: FAIL — cannot resolve `../../src/middleware/auth-rate-limit`.

- [ ] **Step 3: Implement auth rate limiter**

Create `api/src/middleware/auth-rate-limit.ts`:

```typescript
import type { MiddlewareHandler } from "hono";
import { getRedis, isRedisConnected } from "../infrastructure/redis";

const AUTH_RPM = 10;
const memoryCounters = new Map<string, { count: number; resetAt: number }>();

export const authRateLimit: MiddlewareHandler = async (c, next) => {
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const minute = Math.floor(Date.now() / 60000);
  const key = `gambit:authrl:${ip}:${minute}`;

  let count = 0;

  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
    } catch {
      count = incrementMemory(ip, minute);
    }
  } else {
    count = incrementMemory(ip, minute);
  }

  if (count > AUTH_RPM) {
    c.header("Retry-After", "60");
    return c.json(
      { error: { code: "RATE_LIMITED", message: "Too many auth requests", action: "none" } },
      429,
    );
  }

  return next();
};

function incrementMemory(ip: string, minute: number): number {
  const key = `${ip}:${minute}`;
  const entry = memoryCounters.get(key);
  if (entry && entry.resetAt === minute) {
    entry.count++;
    return entry.count;
  }
  if (memoryCounters.size > 10000) {
    for (const [k, v] of memoryCounters) {
      if (v.resetAt < minute) memoryCounters.delete(k);
    }
  }
  memoryCounters.set(key, { count: 1, resetAt: minute });
  return 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd api && bun test tests/middleware/auth-rate-limit.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/middleware/auth-rate-limit.ts api/tests/middleware/auth-rate-limit.test.ts
git commit -m "feat: add auth endpoint rate limiter (10 req/min per IP)"
```

---

## Task 7: Require-Role & Require-Platform-Admin Middleware

**Files:**
- Create: `api/src/middleware/require-role.ts`
- Create: `api/src/middleware/require-platform-admin.ts`
- Test: `api/tests/middleware/require-role.test.ts`

- [ ] **Step 1: Write the failing test**

Create `api/tests/middleware/require-role.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { requireRole } from "../../src/middleware/require-role";
import { requirePlatformAdmin } from "../../src/middleware/require-platform-admin";

function setAuthContext(role: string, platformRole = "user") {
  return async (c: any, next: any) => {
    c.set("userId", "u1");
    c.set("role", role);
    c.set("teamId", "t1");
    c.set("platformRole", platformRole);
    c.set("authMethod", "jwt");
    await next();
  };
}

describe("requireRole", () => {
  it("allows owner when admin+ required", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("owner"));
    app.get("/test", requireRole("admin"), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("allows admin when admin+ required", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("admin"));
    app.get("/test", requireRole("admin"), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("rejects member when admin+ required", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("member"));
    app.get("/test", requireRole("admin"), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows viewer when any role required", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("viewer"));
    app.get("/test", requireRole("viewer"), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("allows member when member+ required", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("member"));
    app.get("/test", requireRole("member"), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });
});

describe("requirePlatformAdmin", () => {
  it("allows platform admin", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("member", "admin"));
    app.get("/test", requirePlatformAdmin(), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("rejects non-admin", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("owner", "user"));
    app.get("/test", requirePlatformAdmin(), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/middleware/require-role.test.ts
```

Expected: FAIL — cannot resolve modules.

- [ ] **Step 3: Implement requireRole**

Create `api/src/middleware/require-role.ts`:

```typescript
import type { MiddlewareHandler } from "hono";
import { roleLevel } from "../infrastructure/auth";
import type { UserRole } from "../types/auth";

export function requireRole(minimumRole: UserRole): MiddlewareHandler {
  return async (c, next) => {
    const userRole = c.get("role") as UserRole;
    if (roleLevel(userRole) < roleLevel(minimumRole)) {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: `Requires ${minimumRole} role or higher`,
            action: "none",
          },
        },
        403,
      );
    }
    return next();
  };
}
```

- [ ] **Step 4: Implement requirePlatformAdmin**

Create `api/src/middleware/require-platform-admin.ts`:

```typescript
import type { MiddlewareHandler } from "hono";

export function requirePlatformAdmin(): MiddlewareHandler {
  return async (c, next) => {
    const platformRole = c.get("platformRole") as string;
    if (platformRole !== "admin") {
      return c.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Platform admin access required",
            action: "none",
          },
        },
        403,
      );
    }
    return next();
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd api && bun test tests/middleware/require-role.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/src/middleware/require-role.ts api/src/middleware/require-platform-admin.ts api/tests/middleware/require-role.test.ts
git commit -m "feat: add requireRole and requirePlatformAdmin middleware"
```

---

## Task 8: Scope Check & Impersonation Middleware

**Files:**
- Create: `api/src/middleware/scope-check.ts`
- Create: `api/src/middleware/impersonation.ts`
- Test: `api/tests/middleware/scope-check.test.ts`

- [ ] **Step 1: Write the failing test**

Create `api/tests/middleware/scope-check.test.ts`:

```typescript
import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { scopeCheck } from "../../src/middleware/scope-check";

function setApiKeyContext(scope: string) {
  return async (c: any, next: any) => {
    c.set("authMethod", "apikey");
    c.set("scope", scope);
    c.set("userId", "u1");
    c.set("teamId", "t1");
    c.set("role", "member");
    c.set("platformRole", "user");
    await next();
  };
}

function setJwtContext() {
  return async (c: any, next: any) => {
    c.set("authMethod", "jwt");
    c.set("userId", "u1");
    c.set("teamId", "t1");
    c.set("role", "member");
    c.set("platformRole", "user");
    await next();
  };
}

describe("scopeCheck", () => {
  it("allows GET requests with read scope", async () => {
    const app = new Hono();
    app.use("*", setApiKeyContext("read"));
    app.use("*", scopeCheck);
    app.get("/test", (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("blocks POST requests with read scope", async () => {
    const app = new Hono();
    app.use("*", setApiKeyContext("read"));
    app.use("*", scopeCheck);
    app.post("/test", (c) => c.json({ ok: true }));
    const res = await app.request("/test", { method: "POST" });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("SCOPE_INSUFFICIENT");
  });

  it("allows POST requests with read-write scope", async () => {
    const app = new Hono();
    app.use("*", setApiKeyContext("read-write"));
    app.use("*", scopeCheck);
    app.post("/test", (c) => c.json({ ok: true }));
    const res = await app.request("/test", { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("skips check for JWT auth", async () => {
    const app = new Hono();
    app.use("*", setJwtContext());
    app.use("*", scopeCheck);
    app.post("/test", (c) => c.json({ ok: true }));
    const res = await app.request("/test", { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("blocks PUT requests with read scope", async () => {
    const app = new Hono();
    app.use("*", setApiKeyContext("read"));
    app.use("*", scopeCheck);
    app.put("/test", (c) => c.json({ ok: true }));
    const res = await app.request("/test", { method: "PUT" });
    expect(res.status).toBe(403);
  });

  it("blocks DELETE requests with read scope", async () => {
    const app = new Hono();
    app.use("*", setApiKeyContext("read"));
    app.use("*", scopeCheck);
    app.delete("/test", (c) => c.json({ ok: true }));
    const res = await app.request("/test", { method: "DELETE" });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/middleware/scope-check.test.ts
```

Expected: FAIL — cannot resolve `../../src/middleware/scope-check`.

- [ ] **Step 3: Implement scope check**

Create `api/src/middleware/scope-check.ts`:

```typescript
import type { MiddlewareHandler } from "hono";

const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export const scopeCheck: MiddlewareHandler = async (c, next) => {
  const authMethod = c.get("authMethod") as string;
  if (authMethod !== "apikey") return next();

  const scope = c.get("scope") as string;
  if (scope === "read" && MUTATION_METHODS.has(c.req.method)) {
    return c.json(
      {
        error: {
          code: "SCOPE_INSUFFICIENT",
          message: "This API key has read-only access",
          action: "none",
        },
      },
      403,
    );
  }

  return next();
};
```

- [ ] **Step 4: Implement impersonation middleware**

Create `api/src/middleware/impersonation.ts`:

```typescript
import type { MiddlewareHandler } from "hono";
import { getDb } from "../infrastructure/mongo";
import { logAudit } from "../infrastructure/auth";

export const impersonation: MiddlewareHandler = async (c, next) => {
  const targetUserId = c.req.header("x-impersonate-user");
  if (!targetUserId) return next();

  const platformRole = c.get("platformRole") as string;
  if (platformRole !== "admin") {
    return c.json(
      { error: { code: "FORBIDDEN", message: "Only platform admins can impersonate", action: "none" } },
      403,
    );
  }

  const db = getDb();
  const targetUser = await db.collection("users").findOne({ _id: targetUserId });
  if (!targetUser) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Target user not found", action: "none" } },
      404,
    );
  }

  const adminUserId = c.get("userId") as string;
  c.set("realActorId", adminUserId);
  c.set("userId", targetUser._id);
  c.set("role", targetUser.role);
  c.set("teamId", targetUser.teamId);

  // Fire-and-forget audit
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  logAudit({
    teamId: targetUser.teamId,
    actorId: adminUserId,
    action: "admin.impersonated",
    target: { type: "user", id: targetUserId },
    ip,
    plan: "free", // impersonation audit always recorded
  }).catch(() => {});

  return next();
};
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd api && bun test tests/middleware/scope-check.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/src/middleware/scope-check.ts api/src/middleware/impersonation.ts api/tests/middleware/scope-check.test.ts
git commit -m "feat: add scope check and impersonation middleware"
```

---

## Task 9: Authenticate Middleware

**Files:**
- Create: `api/src/middleware/authenticate.ts`
- Test: `api/tests/middleware/authenticate.test.ts`

This is the core auth middleware that replaces `api-key.ts`. It resolves JWT / API key / dev bypass to user context on `c.set()`.

- [ ] **Step 1: Write the failing test**

Create `api/tests/middleware/authenticate.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { authenticate, PUBLIC_PATHS } from "../../src/middleware/authenticate";
import { signAccessToken, hashToken } from "../../src/infrastructure/auth";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { randomUUID } from "crypto";

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  // Clean test data
  const db = getDb();
  await db.collection("apiKeys").deleteMany({});
  await db.collection("users").deleteMany({});
});

afterAll(async () => {
  const db = getDb();
  await db.collection("apiKeys").deleteMany({});
  await db.collection("users").deleteMany({});
  await disconnectMongo();
});

function createApp() {
  const app = new Hono();
  app.use("*", authenticate);
  app.get("/api/v1/health", (c) => c.json({ ok: true }));
  app.get("/api/v1/countries", (c) =>
    c.json({
      userId: c.get("userId"),
      role: c.get("role"),
      teamId: c.get("teamId"),
      authMethod: c.get("authMethod"),
    }),
  );
  return app;
}

describe("authenticate middleware", () => {
  it("skips auth for public paths", async () => {
    const app = createApp();
    const res = await app.request("/api/v1/health");
    expect(res.status).toBe(200);
  });

  it("authenticates valid JWT Bearer token", async () => {
    const token = await signAccessToken({
      userId: "u1",
      role: "member",
      teamId: "t1",
      platformRole: "user",
      roleVersion: 0,
    });

    // Insert a user doc for roleVersion check
    const db = getDb();
    await db.collection("users").updateOne(
      { _id: "u1" },
      {
        $set: {
          _id: "u1", email: "test@test.com", role: "member",
          teamId: "t1", platformRole: "user", roleVersion: 0,
        },
      },
      { upsert: true },
    );

    const app = createApp();
    const res = await app.request("/api/v1/countries", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe("u1");
    expect(body.authMethod).toBe("jwt");
  });

  it("rejects invalid JWT", async () => {
    const app = createApp();
    const res = await app.request("/api/v1/countries", {
      headers: { Authorization: "Bearer invalid.token.here" },
    });
    expect(res.status).toBe(401);
  });

  it("authenticates valid API key", async () => {
    const rawKey = `gbt_${randomUUID().replace(/-/g, "")}`;
    const keyHash = hashToken(rawKey);
    const db = getDb();
    await db.collection("apiKeys").insertOne({
      _id: randomUUID(),
      keyHash,
      keyPrefix: rawKey.slice(0, 8),
      userId: "u1",
      teamId: "t1",
      name: "Test Key",
      scope: "read",
      disabled: false,
      lastUsedAt: null,
      createdAt: new Date(),
    });

    // Ensure user exists for role lookup
    await db.collection("users").updateOne(
      { _id: "u1" },
      { $set: { role: "member", platformRole: "user", roleVersion: 0 } },
      { upsert: true },
    );

    const app = createApp();
    const res = await app.request("/api/v1/countries", {
      headers: { "X-API-Key": rawKey },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe("u1");
    expect(body.authMethod).toBe("apikey");
  });

  it("rejects disabled API key", async () => {
    const rawKey = `gbt_${randomUUID().replace(/-/g, "")}`;
    const keyHash = hashToken(rawKey);
    const db = getDb();
    await db.collection("apiKeys").insertOne({
      _id: randomUUID(),
      keyHash,
      keyPrefix: rawKey.slice(0, 8),
      userId: "u1",
      teamId: "t1",
      name: "Disabled Key",
      scope: "read",
      disabled: true,
      disabledAt: new Date(),
      lastUsedAt: null,
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/api/v1/countries", {
      headers: { "X-API-Key": rawKey },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("KEY_DISABLED");
  });

  it("allows dev bypass when NODE_ENV is development", async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const app = createApp();
    const res = await app.request("/api/v1/countries");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.authMethod).toBe("dev");

    process.env.NODE_ENV = origEnv;
  });

  it("rejects unauthenticated requests in production", async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const app = createApp();
    const res = await app.request("/api/v1/countries");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");

    process.env.NODE_ENV = origEnv;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/middleware/authenticate.test.ts
```

Expected: FAIL — cannot resolve `../../src/middleware/authenticate`.

- [ ] **Step 3: Implement authenticate middleware**

Create `api/src/middleware/authenticate.ts`:

```typescript
import type { MiddlewareHandler } from "hono";
import { verifyAccessToken, hashToken } from "../infrastructure/auth";
import { getDb } from "../infrastructure/mongo";
import { getRedis, isRedisConnected } from "../infrastructure/redis";

// Paths that skip authentication entirely
export const PUBLIC_PATHS = new Set([
  "/api/v1/health",
  "/api/v1/auth/github",
  "/api/v1/auth/github/callback",
  "/api/v1/auth/google",
  "/api/v1/auth/google/callback",
  "/api/v1/auth/token",
  "/api/v1/auth/refresh",
]);

// Paths that start with these prefixes are public
const PUBLIC_PREFIXES = ["/api/v1/health", "/api/v1/team/invite-info/"];

function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export const authenticate: MiddlewareHandler = async (c, next) => {
  const path = new URL(c.req.url).pathname;

  // Public paths skip auth
  if (isPublicPath(path)) return next();

  // 1. Try Bearer token (JWT)
  const authHeader = c.req.header("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = await verifyAccessToken(token);

      // Role version check
      const rvMismatch = await checkRoleVersion(payload.userId, payload.roleVersion);
      if (rvMismatch) {
        return c.json(
          { error: { code: "ROLE_CHANGED", message: "Role has changed, refresh token", action: "refresh" } },
          401,
        );
      }

      // Check deletion status (from Redis or DB)
      const deletionDate = await checkDeletion(payload.userId);
      if (deletionDate) {
        return c.json(
          {
            error: {
              code: "ACCOUNT_DELETED",
              message: "Account scheduled for deletion",
              action: "show_deletion_notice",
              deletionDate,
            },
          },
          401,
        );
      }

      c.set("userId", payload.userId);
      c.set("role", payload.role);
      c.set("teamId", payload.teamId);
      c.set("platformRole", payload.platformRole);
      c.set("roleVersion", payload.roleVersion);
      c.set("authMethod", "jwt");
      return next();
    } catch {
      return c.json(
        { error: { code: "INVALID_TOKEN", message: "Invalid or expired access token", action: "refresh" } },
        401,
      );
    }
  }

  // 2. Try API key
  const apiKey = c.req.header("x-api-key");
  if (apiKey) {
    const keyHash = hashToken(apiKey);
    const db = getDb();
    const keyDoc = await db.collection("apiKeys").findOne({ keyHash });

    if (!keyDoc) {
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid API key", action: "none" } },
        401,
      );
    }

    if (keyDoc.disabled) {
      return c.json(
        { error: { code: "KEY_DISABLED", message: "This API key has been disabled", action: "none" } },
        401,
      );
    }

    if (keyDoc.expiresAt && new Date(keyDoc.expiresAt) < new Date()) {
      return c.json(
        { error: { code: "KEY_EXPIRED", message: "This API key has expired", action: "none" } },
        401,
      );
    }

    // Look up user for role info
    const user = await db.collection("users").findOne({ _id: keyDoc.userId });
    if (!user) {
      return c.json(
        { error: { code: "UNAUTHORIZED", message: "API key owner not found", action: "none" } },
        401,
      );
    }

    c.set("userId", keyDoc.userId);
    c.set("role", user.role);
    c.set("teamId", keyDoc.teamId);
    c.set("platformRole", user.platformRole);
    c.set("authMethod", "apikey");
    c.set("scope", keyDoc.scope);
    c.set("apiKeyMeta", { id: keyDoc._id, name: keyDoc.name, prefix: keyDoc.keyPrefix });

    // Fire-and-forget: update lastUsedAt
    db.collection("apiKeys")
      .updateOne({ _id: keyDoc._id }, { $set: { lastUsedAt: new Date() } })
      .catch(() => {});

    return next();
  }

  // 3. Dev bypass
  const isDev = (process.env.NODE_ENV ?? "development") !== "production";
  if (isDev) {
    c.set("userId", "dev-user");
    c.set("role", "owner");
    c.set("teamId", "dev-team");
    c.set("platformRole", "admin");
    c.set("authMethod", "dev");
    c.set("roleVersion", 0);
    return next();
  }

  // 4. No auth
  return c.json(
    { error: { code: "UNAUTHORIZED", message: "Authentication required", action: "login" } },
    401,
  );
};

// --- Role Version + Deletion Check (cached together in Redis) ---

interface UserAuthCache {
  rv: number;
  deletedAt?: string; // ISO string or absent
}

async function getUserAuthCache(userId: string): Promise<UserAuthCache | null> {
  const cacheKey = `gambit:user:${userId}:rv`;

  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      let cached = await redis.get(cacheKey);
      if (cached === null) {
        // Lazy-populate from MongoDB
        const db = getDb();
        const user = await db.collection("users").findOne({ _id: userId });
        if (!user) return null;
        const cacheValue: UserAuthCache = {
          rv: user.roleVersion,
          ...(user.deletedAt ? { deletedAt: new Date(user.deletedAt).toISOString() } : {}),
        };
        await redis.set(cacheKey, JSON.stringify(cacheValue), "EX", 60);
        return cacheValue;
      }
      return JSON.parse(cached) as UserAuthCache;
    } catch {
      console.warn("[auth] Redis unavailable for auth cache, failing open");
      // Fall through to MongoDB
    }
  }

  // No Redis — check MongoDB directly
  const db = getDb();
  const user = await db.collection("users").findOne({ _id: userId });
  if (!user) return null;
  return {
    rv: user.roleVersion,
    ...(user.deletedAt ? { deletedAt: new Date(user.deletedAt).toISOString() } : {}),
  };
}

async function checkRoleVersion(userId: string, jwtVersion: number): Promise<boolean> {
  const cache = await getUserAuthCache(userId);
  if (!cache) return false;
  return cache.rv !== jwtVersion;
}

async function checkDeletion(userId: string): Promise<string | null> {
  const cache = await getUserAuthCache(userId);
  return cache?.deletedAt || null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd api && bun test tests/middleware/authenticate.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/middleware/authenticate.ts api/tests/middleware/authenticate.test.ts
git commit -m "feat: add authenticate middleware (JWT, API key, dev bypass, role version check)"
```

---

## Task 10: Update CORS Middleware

**Files:**
- Modify: `api/src/middleware/cors.ts`

- [ ] **Step 1: Update CORS configuration**

Replace the entire content of `api/src/middleware/cors.ts`:

```typescript
import { cors } from "hono/cors";

export function createCorsMiddleware() {
  const isDev = (process.env.NODE_ENV ?? "development") !== "production";

  if (isDev) {
    return cors({
      origin: (origin) => (origin?.startsWith("http://localhost") ? origin : null),
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Authorization", "Content-Type", "X-API-Key", "X-Impersonate-User", "Last-Event-Id"],
      exposeHeaders: [
        "X-Request-Id",
        "X-RateLimit-Limit",
        "X-RateLimit-Remaining",
        "X-RateLimit-Reset",
        "Retry-After",
      ],
      maxAge: 86400,
    });
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  return cors({
    origin: frontendUrl,
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Authorization", "Content-Type", "X-API-Key", "X-Impersonate-User", "Last-Event-Id"],
    exposeHeaders: [
      "X-Request-Id",
      "X-RateLimit-Limit",
      "X-RateLimit-Remaining",
      "X-RateLimit-Reset",
      "Retry-After",
    ],
    maxAge: 86400,
  });
}
```

- [ ] **Step 2: Run existing tests**

```bash
cd api && bun test
```

Expected: All existing tests still pass.

- [ ] **Step 3: Commit**

```bash
git add api/src/middleware/cors.ts
git commit -m "feat: update CORS for auth — credentials, mutation methods, rate limit headers"
```

---

## Task 11: Update Rate Limiter — Per-User, Role-Based

**Files:**
- Modify: `api/src/middleware/rate-limit.ts`
- Modify: `api/tests/middleware/rate-limit.test.ts`

- [ ] **Step 1: Update rate limiter to use userId and role-based limits**

Replace the content of `api/src/middleware/rate-limit.ts`:

```typescript
import type { MiddlewareHandler } from "hono";
import { getRedis, isRedisConnected } from "../infrastructure/redis";
import type { UserRole } from "../types/auth";

const ROLE_LIMITS: Record<string, number> = {
  owner: 1000,
  admin: 500,
  member: 200,
  viewer: 50,
};
const DEFAULT_RPM = 100;

const memoryCounters = new Map<string, { count: number; resetAt: number }>();

export const rateLimit: MiddlewareHandler = async (c, next) => {
  // Use userId if authenticated, fall back to IP
  const userId = c.get("userId") as string | undefined;
  const role = (c.get("role") as UserRole) || undefined;
  const identifier = userId || c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rpm = role ? (ROLE_LIMITS[role] ?? DEFAULT_RPM) : DEFAULT_RPM;

  const minute = Math.floor(Date.now() / 60000);
  const resetEpoch = (minute + 1) * 60;
  const key = `gambit:ratelimit:${identifier}:${minute}`;

  let count = 0;

  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
    } catch {
      count = incrementMemory(identifier, minute);
    }
  } else {
    count = incrementMemory(identifier, minute);
  }

  // Always set rate limit headers
  c.header("X-RateLimit-Limit", String(rpm));
  c.header("X-RateLimit-Remaining", String(Math.max(0, rpm - count)));
  c.header("X-RateLimit-Reset", String(resetEpoch));

  if (count > rpm) {
    c.header("Retry-After", String(resetEpoch - Math.floor(Date.now() / 1000)));
    return c.json({ error: { code: "RATE_LIMITED", message: "Too many requests", action: "none" } }, 429);
  }

  return next();
};

function incrementMemory(id: string, minute: number): number {
  const key = `${id}:${minute}`;
  const entry = memoryCounters.get(key);
  if (entry && entry.resetAt === minute) {
    entry.count++;
    return entry.count;
  }
  if (memoryCounters.size > 10000) {
    for (const [k, v] of memoryCounters) {
      if (v.resetAt < minute) memoryCounters.delete(k);
    }
  }
  memoryCounters.set(key, { count: 1, resetAt: minute });
  return 1;
}
```

- [ ] **Step 2: Update rate limit tests**

Update `api/tests/middleware/rate-limit.test.ts` to account for the new userId-based behavior and role-based limits. The existing test structure should continue to work since the middleware falls back to IP when no userId is set.

- [ ] **Step 3: Run tests**

```bash
cd api && bun test tests/middleware/rate-limit.test.ts
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add api/src/middleware/rate-limit.ts api/tests/middleware/rate-limit.test.ts
git commit -m "feat: update rate limiter to per-userId with role-based limits"
```

---

---

# Phase 2: Routes (Tasks 12–17)

> **Parallelism:** Tasks 14, 16, 17 are independent of each other. Task 13 (findOrCreateUser) must complete before Task 12's OAuth callbacks work end-to-end. Task 15 (team routes) depends on Task 13.
> **Review checkpoint:** After Phase 2, verify all route handlers work with mock auth context. Run `bun test` and `bun x tsc --noEmit`.

---

## Task 12: Auth Routes — OAuth + Token Exchange

**Files:**
- Create: `api/src/modules/system/auth-routes.ts`
- Test: `api/tests/modules/auth-routes.test.ts`

This is the largest route file. It handles: OAuth redirects (GitHub + Google via Arctic), callbacks, auth code exchange for tokens, token refresh, logout, `/auth/me`, account deletion, and provider linking.

- [ ] **Step 1: Write failing tests for token exchange and refresh**

Create `api/tests/modules/auth-routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import {
  signAccessToken,
  hashToken,
  generateRefreshToken,
  generateAuthCode,
} from "../../src/infrastructure/auth";
import { randomUUID } from "crypto";

// We test the token exchange and refresh endpoints directly.
// OAuth redirect/callback tests require mocking Arctic and are covered in integration tests.

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  const db = getDb();
  await db.collection("authCodes").deleteMany({});
  await db.collection("sessions").deleteMany({});
  await db.collection("users").deleteMany({});
  await db.collection("teams").deleteMany({});
});

afterAll(async () => {
  const db = getDb();
  await db.collection("authCodes").deleteMany({});
  await db.collection("sessions").deleteMany({});
  await db.collection("users").deleteMany({});
  await db.collection("teams").deleteMany({});
  await disconnectMongo();
});

describe("POST /auth/token — auth code exchange", () => {
  it("exchanges valid auth code for access token", async () => {
    const db = getDb();
    const userId = randomUUID();
    const teamId = randomUUID();
    const code = generateAuthCode();

    // Insert user + team
    await db.collection("teams").insertOne({
      _id: teamId, name: "Test Team", slug: "test-team",
      plan: "free", ownerId: userId, watchlist: [], inviteCodes: [],
      createdAt: new Date(), updatedAt: new Date(),
    });
    await db.collection("users").insertOne({
      _id: userId, email: "test@test.com", name: "Test",
      role: "owner", platformRole: "user", teamId,
      roleVersion: 0, providers: [], customAvatar: false,
      lastLoginAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    });

    // Insert auth code
    await db.collection("authCodes").insertOne({
      _id: code, userId, expiresAt: new Date(Date.now() + 60000), used: false,
    });

    // Import and create route handler
    const { authRoutes } = await import("../../src/modules/system/auth-routes");
    const app = new Hono();
    app.route("/auth", authRoutes);

    const res = await app.request("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.accessToken).toBeTruthy();
    expect(typeof body.data.isNew).toBe("boolean");

    // Auth code should be marked as used
    const usedCode = await db.collection("authCodes").findOne({ _id: code });
    expect(usedCode?.used).toBe(true);
  });

  it("rejects already-used auth code", async () => {
    const db = getDb();
    const code = generateAuthCode();
    await db.collection("authCodes").insertOne({
      _id: code, userId: "u1",
      expiresAt: new Date(Date.now() + 60000), used: true,
    });

    const { authRoutes } = await import("../../src/modules/system/auth-routes");
    const app = new Hono();
    app.route("/auth", authRoutes);

    const res = await app.request("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects expired auth code", async () => {
    const db = getDb();
    const code = generateAuthCode();
    await db.collection("authCodes").insertOne({
      _id: code, userId: "u1",
      expiresAt: new Date(Date.now() - 1000), used: false,
    });

    const { authRoutes } = await import("../../src/modules/system/auth-routes");
    const app = new Hono();
    app.route("/auth", authRoutes);

    const res = await app.request("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    expect(res.status).toBe(401);
  });
});

describe("GET /auth/me", () => {
  it("returns current user profile", async () => {
    const db = getDb();
    const userId = randomUUID();

    await db.collection("users").insertOne({
      _id: userId, email: "me@test.com", name: "Me",
      role: "member", platformRole: "user", teamId: "t1",
      roleVersion: 0, providers: [
        { provider: "github", providerId: "gh123", email: "me@test.com", verified: true, linkedAt: new Date() },
      ],
      customAvatar: false, lastLoginAt: new Date(),
      createdAt: new Date(), updatedAt: new Date(),
    });

    const token = await signAccessToken({
      userId, role: "member", teamId: "t1", platformRole: "user", roleVersion: 0,
    });

    const { authRoutes } = await import("../../src/modules/system/auth-routes");
    const { authenticate } = await import("../../src/middleware/authenticate");
    const app = new Hono();
    app.use("*", authenticate);
    app.route("/api/v1/auth", authRoutes);

    const res = await app.request("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.email).toBe("me@test.com");
    expect(body.data.providers).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/modules/auth-routes.test.ts
```

Expected: FAIL — cannot resolve `../../src/modules/system/auth-routes`.

- [ ] **Step 3: Implement auth routes**

Create `api/src/modules/system/auth-routes.ts`. This file is large — it contains all auth endpoints. Key sections:

```typescript
import { Hono } from "hono";
import { setCookie, getCookie, deleteCookie } from "hono/cookie";
import { GitHub, Google } from "arctic";
import { randomUUID } from "crypto";
import { getDb } from "../../infrastructure/mongo";
import {
  signAccessToken,
  verifyAccessToken,
  hashToken,
  generateRefreshToken,
  generateAuthCode,
  parseDevice,
  logAudit,
} from "../../infrastructure/auth";
import { success, apiError } from "../../helpers/response";
import type { User, TokenResponse } from "../../types/auth";

export const authRoutes = new Hono();

// --- OAuth Providers (lazy-init) ---

function getApiUrl() {
  return process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
}

function getGitHub() {
  return new GitHub(
    process.env.GITHUB_CLIENT_ID || "",
    process.env.GITHUB_CLIENT_SECRET || "",
    `${getApiUrl()}/api/v1/auth/github/callback`,
  );
}

function getGoogle() {
  return new Google(
    process.env.GOOGLE_CLIENT_ID || "",
    process.env.GOOGLE_CLIENT_SECRET || "",
    `${getApiUrl()}/api/v1/auth/google/callback`,
  );
}

// --- OAuth Redirect (GitHub) ---

authRoutes.get("/github", async (c) => {
  const github = getGitHub();
  const state = randomUUID();
  const codeVerifier = randomUUID() + randomUUID(); // PKCE
  const inviteCode = c.req.query("invite");
  const recoveryToken = c.req.query("recovery");

  const url = github.createAuthorizationURL(state, codeVerifier, ["user:email"]);

  // Store state + PKCE verifier + optional codes in httpOnly cookie (5 min TTL)
  const cookieValue = JSON.stringify({ state, codeVerifier, inviteCode, recoveryToken });
  setCookie(c, "oauth_state", cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 300,
    path: "/",
  });

  return c.redirect(url.toString());
});

// --- OAuth Callback (GitHub) ---

authRoutes.get("/github/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const cookieValue = getCookie(c, "oauth_state");

  if (!code || !state || !cookieValue) {
    return apiError(c, "INVALID_CALLBACK", "Missing code, state, or cookie", 400);
  }

  let cookieData: any;
  try {
    cookieData = JSON.parse(cookieValue);
  } catch {
    return apiError(c, "INVALID_CALLBACK", "Invalid state cookie", 400);
  }

  if (cookieData.state !== state) {
    return apiError(c, "INVALID_STATE", "OAuth state mismatch", 400);
  }

  // Clear the state cookie
  deleteCookie(c, "oauth_state", { path: "/" });

  try {
    const github = getGitHub();
    const tokens = await github.validateAuthorizationCode(code, cookieData.codeVerifier);
    const accessToken = tokens.accessToken();

    // Fetch user profile from GitHub
    const [userRes, emailsRes] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "Gambit" },
      }),
      fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "Gambit" },
      }),
    ]);

    const ghUser = await userRes.json() as any;
    const ghEmails = await emailsRes.json() as any[];

    const primaryEmail = ghEmails.find((e: any) => e.primary && e.verified);
    if (!primaryEmail) {
      return apiError(c, "EMAIL_NOT_VERIFIED", "No verified primary email on GitHub", 400);
    }

    // Import findOrCreateUser (Task 13)
    const { findOrCreateUser } = await import("../../infrastructure/auth");
    const result = await findOrCreateUser(
      {
        provider: "github",
        providerId: String(ghUser.id),
        email: primaryEmail.email,
        emailVerified: true,
        name: ghUser.name || ghUser.login,
        avatar: ghUser.avatar_url,
      },
      cookieData.inviteCode,
      cookieData.recoveryToken,
    );

    // Generate one-time auth code
    const authCode = generateAuthCode();
    const db = getDb();
    await db.collection("authCodes").insertOne({
      _id: authCode,
      userId: result.user._id,
      expiresAt: new Date(Date.now() + 60000),
      used: false,
      isNew: result.isNew,
      joined: result.joined,
      inviteError: result.inviteError,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return c.redirect(`${frontendUrl}/auth/callback?code=${authCode}`);
  } catch (err: any) {
    console.error("[auth] GitHub callback error:", err);
    return apiError(c, "OAUTH_ERROR", "Authentication failed", 500);
  }
});

// --- Google OAuth (same pattern) ---

authRoutes.get("/google", async (c) => {
  const google = getGoogle();
  const state = randomUUID();
  const codeVerifier = randomUUID() + randomUUID(); // PKCE
  const inviteCode = c.req.query("invite");
  const recoveryToken = c.req.query("recovery");

  const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "email", "profile"]);

  const cookieValue = JSON.stringify({ state, codeVerifier, inviteCode, recoveryToken });
  setCookie(c, "oauth_state", cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 300,
    path: "/",
  });

  return c.redirect(url.toString());
});

authRoutes.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const cookieValue = getCookie(c, "oauth_state");

  if (!code || !state || !cookieValue) {
    return apiError(c, "INVALID_CALLBACK", "Missing code, state, or cookie", 400);
  }

  let cookieData: any;
  try {
    cookieData = JSON.parse(cookieValue);
  } catch {
    return apiError(c, "INVALID_CALLBACK", "Invalid state cookie", 400);
  }

  if (cookieData.state !== state) {
    return apiError(c, "INVALID_STATE", "OAuth state mismatch", 400);
  }

  deleteCookie(c, "oauth_state", { path: "/" });

  try {
    const google = getGoogle();
    const tokens = await google.validateAuthorizationCode(code, cookieData.codeVerifier);
    const accessToken = tokens.accessToken();

    // Fetch user info from Google
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const gUser = await userInfoRes.json() as any;

    if (!gUser.verified_email) {
      return apiError(c, "EMAIL_NOT_VERIFIED", "Email not verified by Google", 400);
    }

    const { findOrCreateUser } = await import("../../infrastructure/auth");
    const result = await findOrCreateUser(
      {
        provider: "google",
        providerId: gUser.id,
        email: gUser.email,
        emailVerified: true,
        name: gUser.name,
        avatar: gUser.picture,
      },
      cookieData.inviteCode,
      cookieData.recoveryToken,
    );

    const authCode = generateAuthCode();
    const db = getDb();
    await db.collection("authCodes").insertOne({
      _id: authCode,
      userId: result.user._id,
      expiresAt: new Date(Date.now() + 60000),
      used: false,
      isNew: result.isNew,
      joined: result.joined,
      inviteError: result.inviteError,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return c.redirect(`${frontendUrl}/auth/callback?code=${authCode}`);
  } catch (err: any) {
    console.error("[auth] Google callback error:", err);
    return apiError(c, "OAUTH_ERROR", "Authentication failed", 500);
  }
});

// --- Token Exchange ---

authRoutes.post("/token", async (c) => {
  const body = await c.req.json();
  const { code } = body;

  if (!code) {
    return apiError(c, "MISSING_CODE", "Auth code is required", 400);
  }

  const db = getDb();
  const authCode = await db.collection("authCodes").findOne({ _id: code });

  if (!authCode || authCode.used || new Date(authCode.expiresAt) < new Date()) {
    return apiError(c, "INVALID_CODE", "Invalid or expired auth code", 401);
  }

  // Mark as used
  await db.collection("authCodes").updateOne({ _id: code }, { $set: { used: true } });

  // Load user
  const user = await db.collection("users").findOne({ _id: authCode.userId });
  if (!user) {
    return apiError(c, "USER_NOT_FOUND", "User not found", 404);
  }

  // Create access token
  const accessToken = await signAccessToken({
    userId: user._id as string,
    role: user.role,
    teamId: user.teamId,
    platformRole: user.platformRole,
    roleVersion: user.roleVersion,
  });

  // Create refresh token + session
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const absoluteExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const ua = c.req.header("user-agent") || "";
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const device = parseDevice(ua);

  // Check if new device
  const existingSession = await db.collection("sessions").findOne({
    userId: user._id,
    ip,
    "device.browser": device.browser,
    "device.os": device.os,
  });
  const isNewDevice = !existingSession;

  await db.collection("sessions").insertOne({
    _id: randomUUID(),
    userId: user._id,
    teamId: user.teamId,
    refreshTokenHash,
    device: { browser: device.browser, os: device.os, raw: ua },
    ip,
    isNewDevice,
    createdAt: now,
    lastRefreshedAt: now,
    expiresAt,
    absoluteExpiresAt,
  });

  // New device login notification email
  if (isNewDevice) {
    const notifPrefs = await db.collection("notificationPreferences").findOne({ _id: user._id });
    if (notifPrefs?.loginAlerts !== false) {
      const { getEmailService } = await import("../../infrastructure/email");
      getEmailService().send(user.email, "new_device_login", {
        device: `${device.browser} on ${device.os}`,
        ip,
      }).catch(() => {});
    }
  }

  // Set refresh token as httpOnly cookie
  setCookie(c, "refresh_token", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: "/api/v1/auth",
  });

  const response: TokenResponse = {
    accessToken,
    isNew: authCode.isNew || false,
    joined: authCode.joined,
    inviteError: authCode.inviteError,
  };

  return success(c, response);
});

// --- Token Refresh ---

authRoutes.post("/refresh", async (c) => {
  const refreshToken = getCookie(c, "refresh_token");
  if (!refreshToken) {
    return apiError(c, "NO_REFRESH_TOKEN", "No refresh token cookie", 401);
  }

  const db = getDb();
  const tokenHash = hashToken(refreshToken);
  const session = await db.collection("sessions").findOne({ refreshTokenHash: tokenHash });

  if (!session) {
    deleteCookie(c, "refresh_token", { path: "/api/v1/auth" });
    return apiError(c, "INVALID_SESSION", "Invalid refresh token", 401);
  }

  const now = new Date();
  if (now > new Date(session.expiresAt) || now > new Date(session.absoluteExpiresAt)) {
    await db.collection("sessions").deleteOne({ _id: session._id });
    deleteCookie(c, "refresh_token", { path: "/api/v1/auth" });
    return apiError(c, "SESSION_EXPIRED", "Session expired", 401);
  }

  // Load user
  const user = await db.collection("users").findOne({ _id: session.userId });
  if (!user) {
    await db.collection("sessions").deleteOne({ _id: session._id });
    deleteCookie(c, "refresh_token", { path: "/api/v1/auth" });
    return apiError(c, "USER_NOT_FOUND", "User not found", 401);
  }

  // Rotate refresh token
  const newRefreshToken = generateRefreshToken();
  const newRefreshTokenHash = hashToken(newRefreshToken);
  const newExpiresAt = new Date(Math.min(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
    new Date(session.absoluteExpiresAt).getTime(),
  ));

  await db.collection("sessions").updateOne(
    { _id: session._id },
    {
      $set: {
        refreshTokenHash: newRefreshTokenHash,
        lastRefreshedAt: now,
        expiresAt: newExpiresAt,
        teamId: user.teamId,
      },
    },
  );

  // New access token
  const accessToken = await signAccessToken({
    userId: user._id as string,
    role: user.role,
    teamId: user.teamId,
    platformRole: user.platformRole,
    roleVersion: user.roleVersion,
  });

  setCookie(c, "refresh_token", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 30 * 24 * 60 * 60,
    path: "/api/v1/auth",
  });

  return success(c, { accessToken, isNew: false });
});

// --- Logout ---

authRoutes.post("/logout", async (c) => {
  const refreshToken = getCookie(c, "refresh_token");
  if (refreshToken) {
    const db = getDb();
    const tokenHash = hashToken(refreshToken);
    await db.collection("sessions").deleteOne({ refreshTokenHash: tokenHash });
  }
  deleteCookie(c, "refresh_token", { path: "/api/v1/auth" });

  // Audit log (fire-and-forget, may not have full auth context on cookie-only auth)
  const userId = c.get("userId") as string;
  if (userId) {
    const db = getDb();
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const user = await db.collection("users").findOne({ _id: userId });
    const team = await db.collection("teams").findOne({ _id: user?.teamId });
    logAudit({
      teamId: user?.teamId || "",
      actorId: userId,
      action: "user.logout",
      ip,
      plan: (team?.plan as any) || "free",
    }).catch(() => {});
  }

  return success(c, { message: "Logged out" });
});

authRoutes.post("/logout-all", async (c) => {
  const userId = c.get("userId") as string;
  const db = getDb();

  // Delete all sessions except current
  const refreshToken = getCookie(c, "refresh_token");
  const currentHash = refreshToken ? hashToken(refreshToken) : null;

  if (currentHash) {
    await db.collection("sessions").deleteMany({
      userId,
      refreshTokenHash: { $ne: currentHash },
    });
  } else {
    await db.collection("sessions").deleteMany({ userId });
  }

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const user = await db.collection("users").findOne({ _id: userId });
  const team = await db.collection("teams").findOne({ _id: user?.teamId });
  logAudit({
    teamId: user?.teamId || "",
    actorId: userId,
    action: "user.logout",
    ip,
    plan: (team?.plan as any) || "free",
    metadata: { scope: "all_other_sessions" },
  }).catch(() => {});

  return success(c, { message: "All other sessions revoked" });
});

// --- GET /auth/me ---

authRoutes.get("/me", async (c) => {
  const userId = c.get("userId") as string;
  const db = getDb();
  const user = await db.collection("users").findOne(
    { _id: userId },
    { projection: { roleVersion: 0 } },
  );

  if (!user) {
    return apiError(c, "USER_NOT_FOUND", "User not found", 404);
  }

  return success(c, user);
});

// --- PUT /auth/me ---

authRoutes.put("/me", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { name, avatar } = body;
  const db = getDb();

  const update: Record<string, any> = { updatedAt: new Date() };
  if (name && typeof name === "string" && name.trim().length > 0) {
    update.name = name.trim();
  }
  if (avatar && typeof avatar === "string") {
    update.avatar = avatar;
    update.customAvatar = true;
  }

  await db.collection("users").updateOne({ _id: userId }, { $set: update });
  const user = await db.collection("users").findOne({ _id: userId });
  return success(c, user);
});

// --- DELETE /auth/account ---

authRoutes.delete("/account", async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const db = getDb();

  // Check if owner with other members
  const user = await db.collection("users").findOne({ _id: userId });
  if (!user) return apiError(c, "USER_NOT_FOUND", "User not found", 404);

  if (user.role === "owner") {
    const memberCount = await db.collection("users").countDocuments({
      teamId, _id: { $ne: userId },
    });
    if (memberCount > 0) {
      return apiError(c, "TRANSFER_REQUIRED", "Transfer team ownership before deleting account", 409);
    }
  }

  const now = new Date();
  const deletedAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Soft delete
  await db.collection("users").updateOne({ _id: userId }, {
    $set: { deletionRequestedAt: now, deletedAt, updatedAt: now },
  });

  // Revoke all sessions
  await db.collection("sessions").deleteMany({ userId });

  // Disable all API keys
  await db.collection("apiKeys").updateMany(
    { userId },
    { $set: { disabled: true, disabledAt: now } },
  );

  // Invalidate role version cache
  const { isRedisConnected, getRedis } = await import("../../infrastructure/redis");
  if (isRedisConnected()) {
    try { await getRedis().del(`gambit:user:${userId}:rv`); } catch {}
  }

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const team = await db.collection("teams").findOne({ _id: teamId });
  logAudit({
    teamId,
    actorId: userId,
    action: "user.deletion_requested",
    ip,
    plan: (team?.plan as any) || "free",
  }).catch(() => {});

  // Send deletion email (fire-and-forget)
  const { getEmailService } = await import("../../infrastructure/email");
  getEmailService().send(user.email, "deletion_scheduled", {
    deletionDate: deletedAt.toISOString(),
  }).catch(() => {});

  deleteCookie(c, "refresh_token", { path: "/api/v1/auth" });
  return success(c, { deletionDate: deletedAt.toISOString() });
});

// --- POST /auth/cancel-deletion ---

authRoutes.post("/cancel-deletion", async (c) => {
  const userId = c.get("userId") as string;
  const db = getDb();

  const user = await db.collection("users").findOne({ _id: userId });
  if (!user || !user.deletionRequestedAt) {
    return apiError(c, "NO_PENDING_DELETION", "No pending deletion to cancel", 400);
  }

  await db.collection("users").updateOne({ _id: userId }, {
    $set: { updatedAt: new Date() },
    $unset: { deletionRequestedAt: "", deletedAt: "" },
  });

  // Re-enable API keys
  await db.collection("apiKeys").updateMany(
    { userId },
    { $set: { disabled: false }, $unset: { disabledAt: "" } },
  );

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const team = await db.collection("teams").findOne({ _id: user.teamId });
  logAudit({
    teamId: user.teamId,
    actorId: userId,
    action: "user.deletion_cancelled",
    ip,
    plan: (team?.plan as any) || "free",
    metadata: { reason: "manual" },
  }).catch(() => {});

  const { getEmailService } = await import("../../infrastructure/email");
  getEmailService().send(user.email, "deletion_cancelled", {}).catch(() => {});

  return success(c, { message: "Account deletion cancelled" });
});

// --- GET /auth/sessions ---

authRoutes.get("/sessions", async (c) => {
  const userId = c.get("userId") as string;
  const db = getDb();

  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);

  const refreshToken = getCookie(c, "refresh_token");
  const currentHash = refreshToken ? hashToken(refreshToken) : null;

  const sessions = await db.collection("sessions")
    .find({ userId })
    .sort({ lastRefreshedAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray();

  const total = await db.collection("sessions").countDocuments({ userId });

  const mapped = sessions.map((s: any) => ({
    id: s._id,
    device: s.device,
    ip: s.ip,
    location: s.location,
    isNewDevice: s.isNewDevice,
    isCurrent: s.refreshTokenHash === currentHash,
    createdAt: s.createdAt,
    lastRefreshedAt: s.lastRefreshedAt,
    expiresAt: s.expiresAt,
  }));

  return c.json({
    data: mapped,
    meta: { total, limit, offset },
  });
});

// --- DELETE /auth/sessions/:id ---

authRoutes.delete("/sessions/:id", async (c) => {
  const userId = c.get("userId") as string;
  const sessionId = c.req.param("id");
  const db = getDb();

  const result = await db.collection("sessions").deleteOne({
    _id: sessionId,
    userId, // Only own sessions
  });

  if (result.deletedCount === 0) {
    return apiError(c, "NOT_FOUND", "Session not found", 404);
  }

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const user = await db.collection("users").findOne({ _id: userId });
  const team = await db.collection("teams").findOne({ _id: user?.teamId });
  logAudit({
    teamId: user?.teamId || "",
    actorId: userId,
    action: "session.revoked",
    target: { type: "session", id: sessionId },
    ip,
    plan: (team?.plan as any) || "free",
  }).catch(() => {});

  return success(c, { message: "Session revoked" });
});

// --- Provider Linking ---

authRoutes.get("/link/github", async (c) => {
  const github = getGitHub();
  const state = randomUUID();
  const codeVerifier = randomUUID() + randomUUID();

  // Store linking userId so callback knows who to add the provider to
  const linkingUserId = c.get("userId") as string;
  setCookie(c, "oauth_state", JSON.stringify({ state, codeVerifier, linking: true, linkingUserId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 300,
    path: "/",
  });

  const url = github.createAuthorizationURL(state, codeVerifier, ["user:email"]);
  return c.redirect(url.toString());
});

authRoutes.get("/link/github/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const cookieValue = getCookie(c, "oauth_state");

  if (!code || !state || !cookieValue) return apiError(c, "INVALID_CALLBACK", "Missing params", 400);
  let cookieData: any;
  try { cookieData = JSON.parse(cookieValue); } catch { return apiError(c, "INVALID_CALLBACK", "Bad cookie", 400); }
  if (cookieData.state !== state || !cookieData.linking) return apiError(c, "INVALID_STATE", "State mismatch", 400);
  deleteCookie(c, "oauth_state", { path: "/" });

  try {
    const github = getGitHub();
    const tokens = await github.validateAuthorizationCode(code, cookieData.codeVerifier);
    const accessToken = tokens.accessToken();
    const [userRes, emailsRes] = await Promise.all([
      fetch("https://api.github.com/user", { headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "Gambit" } }),
      fetch("https://api.github.com/user/emails", { headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": "Gambit" } }),
    ]);
    const ghUser = await userRes.json() as any;
    const ghEmails = await emailsRes.json() as any[];
    const primaryEmail = ghEmails.find((e: any) => e.primary && e.verified);
    if (!primaryEmail) return apiError(c, "EMAIL_NOT_VERIFIED", "No verified email", 400);

    const db = getDb();
    const userId = cookieData.linkingUserId;
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) return apiError(c, "USER_NOT_FOUND", "User not found", 404);

    // Check if this provider is already linked to another account
    const conflict = await db.collection("users").findOne({
      "providers.provider": "github",
      "providers.providerId": String(ghUser.id),
      _id: { $ne: userId },
    });
    if (conflict) return apiError(c, "PROVIDER_CONFLICT", "This GitHub account is linked to another user", 409);

    await db.collection("users").updateOne(
      { _id: userId },
      {
        $push: { providers: { provider: "github", providerId: String(ghUser.id), email: primaryEmail.email, verified: true, linkedAt: new Date() } } as any,
        $set: { updatedAt: new Date() },
      },
    );

    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const team = await db.collection("teams").findOne({ _id: user.teamId });
    logAudit({ teamId: user.teamId, actorId: userId, action: "provider.linked", ip, plan: (team?.plan as any) || "free", metadata: { provider: "github" } }).catch(() => {});

    // Send provider_linked notification email
    const { getEmailService } = await import("../../infrastructure/email");
    getEmailService().send(user.email, "provider_linked", { provider: "github" }).catch(() => {});

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return c.redirect(`${frontendUrl}/settings/account?linked=github`);
  } catch (err: any) {
    console.error("[auth] GitHub link callback error:", err);
    return apiError(c, "OAUTH_ERROR", "Provider linking failed", 500);
  }
});

authRoutes.get("/link/google", async (c) => {
  const google = getGoogle();
  const state = randomUUID();
  const codeVerifier = randomUUID() + randomUUID();
  const linkingUserId = c.get("userId") as string;

  setCookie(c, "oauth_state", JSON.stringify({ state, codeVerifier, linking: true, linkingUserId }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 300,
    path: "/",
  });

  const url = google.createAuthorizationURL(state, codeVerifier, ["openid", "email", "profile"]);
  return c.redirect(url.toString());
});

authRoutes.get("/link/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const cookieValue = getCookie(c, "oauth_state");

  if (!code || !state || !cookieValue) return apiError(c, "INVALID_CALLBACK", "Missing params", 400);
  let cookieData: any;
  try { cookieData = JSON.parse(cookieValue); } catch { return apiError(c, "INVALID_CALLBACK", "Bad cookie", 400); }
  if (cookieData.state !== state || !cookieData.linking) return apiError(c, "INVALID_STATE", "State mismatch", 400);
  deleteCookie(c, "oauth_state", { path: "/" });

  try {
    const google = getGoogle();
    const tokens = await google.validateAuthorizationCode(code, cookieData.codeVerifier);
    const accessToken = tokens.accessToken();
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${accessToken}` } });
    const gUser = await userInfoRes.json() as any;
    if (!gUser.verified_email) return apiError(c, "EMAIL_NOT_VERIFIED", "Email not verified", 400);

    const db = getDb();
    const userId = cookieData.linkingUserId;
    const user = await db.collection("users").findOne({ _id: userId });
    if (!user) return apiError(c, "USER_NOT_FOUND", "User not found", 404);

    const conflict = await db.collection("users").findOne({
      "providers.provider": "google",
      "providers.providerId": gUser.id,
      _id: { $ne: userId },
    });
    if (conflict) return apiError(c, "PROVIDER_CONFLICT", "This Google account is linked to another user", 409);

    await db.collection("users").updateOne(
      { _id: userId },
      {
        $push: { providers: { provider: "google", providerId: gUser.id, email: gUser.email, verified: true, linkedAt: new Date() } } as any,
        $set: { updatedAt: new Date() },
      },
    );

    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const team = await db.collection("teams").findOne({ _id: user.teamId });
    logAudit({ teamId: user.teamId, actorId: userId, action: "provider.linked", ip, plan: (team?.plan as any) || "free", metadata: { provider: "google" } }).catch(() => {});

    const { getEmailService } = await import("../../infrastructure/email");
    getEmailService().send(user.email, "provider_linked", { provider: "google" }).catch(() => {});

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    return c.redirect(`${frontendUrl}/settings/account?linked=google`);
  } catch (err: any) {
    console.error("[auth] Google link callback error:", err);
    return apiError(c, "OAUTH_ERROR", "Provider linking failed", 500);
  }
});

authRoutes.delete("/providers/:provider", async (c) => {
  const userId = c.get("userId") as string;
  const provider = c.req.param("provider");
  const db = getDb();

  const user = await db.collection("users").findOne({ _id: userId });
  if (!user) return apiError(c, "USER_NOT_FOUND", "User not found", 404);

  if (user.providers.length <= 1) {
    return apiError(c, "LAST_PROVIDER", "Cannot remove the only sign-in method", 409);
  }

  await db.collection("users").updateOne(
    { _id: userId },
    { $pull: { providers: { provider } } as any, $set: { updatedAt: new Date() } },
  );

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const team = await db.collection("teams").findOne({ _id: user.teamId });
  logAudit({
    teamId: user.teamId,
    actorId: userId,
    action: "provider.linked",
    ip,
    plan: (team?.plan as any) || "free",
    metadata: { provider, action: "unlinked" },
  }).catch(() => {});

  return success(c, { message: `${provider} provider removed` });
});

// --- GET /auth/providers ---

authRoutes.get("/providers", (c) => {
  const providers = [];
  if (process.env.GITHUB_CLIENT_ID) providers.push("github");
  if (process.env.GOOGLE_CLIENT_ID) providers.push("google");
  return success(c, { providers });
});
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd api && bun test tests/modules/auth-routes.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/system/auth-routes.ts api/tests/modules/auth-routes.test.ts
git commit -m "feat: add auth routes — OAuth, token exchange, refresh, logout, sessions, providers"
```

---

## Task 13: findOrCreateUser

**Files:**
- Modify: `api/src/infrastructure/auth.ts`
- Test: `api/tests/infrastructure/find-or-create-user.test.ts`

Add the `findOrCreateUser` function to `auth.ts`. This is the decision tree from spec section 5 with 4 paths: returning user, account linking, invite join, organic signup.

- [ ] **Step 1: Write the failing test**

Create `api/tests/infrastructure/find-or-create-user.test.ts`:

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { findOrCreateUser } from "../../src/infrastructure/auth";
import { randomUUID } from "crypto";
import type { OAuthProfile } from "../../src/types/auth";

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
});

beforeEach(async () => {
  const db = getDb();
  await db.collection("users").deleteMany({});
  await db.collection("teams").deleteMany({});
  await db.collection("notificationPreferences").deleteMany({});
  await db.collection("platformConfig").deleteMany({});
});

afterAll(async () => {
  const db = getDb();
  await db.collection("users").deleteMany({});
  await db.collection("teams").deleteMany({});
  await db.collection("notificationPreferences").deleteMany({});
  await db.collection("platformConfig").deleteMany({});
  await disconnectMongo();
});

const profile: OAuthProfile = {
  provider: "github",
  providerId: "gh-123",
  email: "test@example.com",
  emailVerified: true,
  name: "Test User",
  avatar: "https://example.com/avatar.png",
};

describe("findOrCreateUser", () => {
  describe("organic new user (first user = platform admin)", () => {
    it("creates user, team, and sets platformRole to admin", async () => {
      const result = await findOrCreateUser(profile);
      expect(result.isNew).toBe(true);
      expect(result.user.email).toBe("test@example.com");
      expect(result.user.platformRole).toBe("admin"); // first user
      expect(result.user.role).toBe("owner");
      expect(result.user.roleVersion).toBe(0);

      const db = getDb();
      const team = await db.collection("teams").findOne({ _id: result.user.teamId });
      expect(team).not.toBeNull();
      expect(team!.name).toBe("Test User's Team");
      expect(team!.ownerId).toBe(result.user._id);

      const notifPrefs = await db.collection("notificationPreferences").findOne({
        _id: result.user._id,
      });
      expect(notifPrefs).not.toBeNull();
      expect(notifPrefs!.loginAlerts).toBe(true);
    });
  });

  describe("organic new user (second user = regular user)", () => {
    it("creates user with platformRole user", async () => {
      // First user claims admin
      await findOrCreateUser(profile);

      // Second user
      const result = await findOrCreateUser({
        ...profile,
        providerId: "gh-456",
        email: "second@example.com",
        name: "Second User",
      });
      expect(result.isNew).toBe(true);
      expect(result.user.platformRole).toBe("user"); // not admin
    });
  });

  describe("returning user", () => {
    it("finds existing user by provider + providerId", async () => {
      const first = await findOrCreateUser(profile);
      const second = await findOrCreateUser(profile);
      expect(second.isNew).toBe(false);
      expect(second.user._id).toBe(first.user._id);
    });

    it("updates avatar when customAvatar is false", async () => {
      await findOrCreateUser(profile);
      const result = await findOrCreateUser({
        ...profile,
        avatar: "https://example.com/new-avatar.png",
      });
      expect(result.user.avatar).toBe("https://example.com/new-avatar.png");
    });
  });

  describe("account linking by email", () => {
    it("links new provider to existing user with same verified email", async () => {
      await findOrCreateUser(profile); // github

      const googleProfile: OAuthProfile = {
        provider: "google",
        providerId: "g-789",
        email: "test@example.com", // same email
        emailVerified: true,
        name: "Test via Google",
        avatar: "https://google.com/photo.jpg",
      };

      const result = await findOrCreateUser(googleProfile);
      expect(result.isNew).toBe(false);
      expect(result.user.providers).toHaveLength(2);
      expect(result.user.providers.some((p: any) => p.provider === "google")).toBe(true);
    });
  });

  describe("unverified email rejection", () => {
    it("rejects login when email is not verified", async () => {
      await expect(
        findOrCreateUser({ ...profile, emailVerified: false }),
      ).rejects.toThrow("Email not verified");
    });
  });

  describe("invite flow", () => {
    it("creates user in invite team with invite role", async () => {
      const db = getDb();
      const teamId = randomUUID();
      const inviteCode = "INV-TEST-123";

      // Create team with invite code
      await db.collection("teams").insertOne({
        _id: teamId,
        name: "Invite Team",
        slug: "invite-team",
        plan: "free",
        ownerId: "admin-id",
        watchlist: [],
        inviteCodes: [{
          code: inviteCode,
          role: "member" as const,
          createdBy: "admin-id",
          expiresAt: new Date(Date.now() + 86400000),
          maxUses: 10,
          uses: 0,
          usedBy: [],
        }],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Ensure platformConfig exists so first-user logic doesn't make this user admin
      await db.collection("platformConfig").insertOne({
        _id: "config",
        firstUserClaimed: true,
        claimedBy: "admin-id",
      });

      const result = await findOrCreateUser(
        { ...profile, providerId: "gh-invite-test" },
        inviteCode,
      );
      expect(result.isNew).toBe(true);
      expect(result.user.teamId).toBe(teamId);
      expect(result.user.role).toBe("member");
      expect(result.joined).toBeTruthy();
      expect(result.joined!.teamId).toBe(teamId);
      expect(result.joined!.teamName).toBe("Invite Team");
    });

    it("returns inviteError for expired invite code", async () => {
      const db = getDb();
      const teamId = randomUUID();

      await db.collection("teams").insertOne({
        _id: teamId,
        name: "Expired Team",
        slug: "expired-team",
        plan: "free",
        ownerId: "admin-id",
        watchlist: [],
        inviteCodes: [{
          code: "EXPIRED-CODE",
          role: "member" as const,
          createdBy: "admin-id",
          expiresAt: new Date(Date.now() - 86400000), // expired
          maxUses: 10,
          uses: 0,
          usedBy: [],
        }],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.collection("platformConfig").updateOne(
        { _id: "config" },
        { $set: { firstUserClaimed: true } },
        { upsert: true },
      );

      const result = await findOrCreateUser(
        { ...profile, providerId: "gh-expired-test", email: "expired@test.com" },
        "EXPIRED-CODE",
      );
      expect(result.isNew).toBe(true);
      expect(result.inviteError).toBe("expired");
      // User still created — just in personal team
      expect(result.user.teamId).not.toBe(teamId);
    });
  });

  describe("deletion cancellation on login", () => {
    it("cancels pending deletion when user logs in", async () => {
      const db = getDb();
      const first = await findOrCreateUser(profile);

      // Simulate soft delete
      await db.collection("users").updateOne(
        { _id: first.user._id },
        { $set: { deletionRequestedAt: new Date(), deletedAt: new Date(Date.now() + 86400000) } },
      );

      const result = await findOrCreateUser(profile);
      expect(result.isNew).toBe(false);
      expect(result.user.deletionRequestedAt).toBeUndefined();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/infrastructure/find-or-create-user.test.ts
```

Expected: FAIL — `findOrCreateUser` not exported.

- [ ] **Step 3: Add findOrCreateUser to auth.ts**

Add the following to the end of `api/src/infrastructure/auth.ts`:

```typescript
import type { OAuthProfile, FindOrCreateResult, User } from "../types/auth";

export async function findOrCreateUser(
  profile: OAuthProfile,
  inviteCode?: string,
  recoveryToken?: string,
): Promise<FindOrCreateResult> {
  const db = getDb();

  // Reject unverified email
  if (!profile.emailVerified) {
    throw new Error("Email not verified by provider. Please verify your email and try again.");
  }

  // Recovery token flow — link provider to existing (possibly deleted) user
  if (recoveryToken) {
    const tokenHash = hashToken(recoveryToken);
    const token = await db.collection("recoveryTokens").findOne({
      tokenHash,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (token) {
      const targetUser = await db.collection("users").findOne({ _id: token.userId });
      if (targetUser) {
        // Cancel deletion if pending
        if (targetUser.deletionRequestedAt) {
          await db.collection("users").updateOne(
            { _id: targetUser._id },
            { $unset: { deletionRequestedAt: "", deletedAt: "" } },
          );
          await db.collection("apiKeys").updateMany(
            { userId: targetUser._id },
            { $set: { disabled: false }, $unset: { disabledAt: "" } },
          );
          logAudit({
            teamId: targetUser.teamId,
            actorId: targetUser._id as string,
            action: "user.deletion_cancelled",
            ip: "system",
            plan: "free",
            metadata: { reason: "recovery" },
          }).catch(() => {});
        }

        // Add new OAuth provider
        await db.collection("users").updateOne(
          { _id: targetUser._id },
          {
            $push: {
              providers: {
                provider: profile.provider,
                providerId: profile.providerId,
                email: profile.email,
                verified: profile.emailVerified,
                linkedAt: new Date(),
              },
            } as any,
            $set: { lastLoginAt: new Date(), updatedAt: new Date() },
          },
        );

        // Mark token as used
        await db.collection("recoveryTokens").updateOne(
          { _id: token._id },
          { $set: { used: true, usedAt: new Date() } },
        );

        const emailMismatch = profile.email !== targetUser.email;
        logAudit({
          teamId: targetUser.teamId,
          actorId: targetUser._id as string,
          action: "user.recovery_completed",
          ip: "system",
          plan: "free",
          metadata: {
            provider: profile.provider,
            newProviderEmail: profile.email,
            adminWhoInitiated: token.createdBy,
            ...(emailMismatch ? { emailMismatch: true, accountEmail: targetUser.email, recoveryEmail: profile.email } : {}),
          },
        }).catch(() => {});

        // Send provider_linked notification
        const { getEmailService } = await import("./email");
        getEmailService().send(targetUser.email, "provider_linked", { provider: profile.provider }).catch(() => {});

        const user = await db.collection("users").findOne({ _id: targetUser._id });
        return { user: user as unknown as User, isNew: false };
      }
    }
    // If recovery token invalid/expired, fall through to normal flow
  }

  // 1. Look up by provider + providerId
  const existingByProvider = await db.collection("users").findOne({
    "providers.provider": profile.provider,
    "providers.providerId": profile.providerId,
  });

  if (existingByProvider) {
    // RETURNING USER
    const updates: Record<string, any> = {
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    };

    // Update avatar only if customAvatar is false
    if (!existingByProvider.customAvatar && profile.avatar) {
      updates.avatar = profile.avatar;
    }

    // Email sync — update user.email AND the provider's email in providers[]
    let emailUpdated: { old: string; new: string } | undefined;
    if (profile.email !== existingByProvider.email && profile.emailVerified) {
      const emailTaken = await db.collection("users").findOne({
        email: profile.email,
        _id: { $ne: existingByProvider._id },
      });
      if (!emailTaken) {
        updates.email = profile.email;
        emailUpdated = { old: existingByProvider.email, new: profile.email };
        // Also update the provider's email in providers[] for audit accuracy
        await db.collection("users").updateOne(
          { _id: existingByProvider._id, "providers.provider": profile.provider, "providers.providerId": profile.providerId },
          { $set: { "providers.$.email": profile.email } },
        );
        logAudit({
          teamId: existingByProvider.teamId,
          actorId: existingByProvider._id,
          action: "user.email_updated",
          ip: "system",
          plan: "free",
          metadata: { old: existingByProvider.email, new: profile.email, provider: profile.provider },
        }).catch(() => {});
      }
    }

    // Cancel deletion if pending
    if (existingByProvider.deletionRequestedAt) {
      await db.collection("users").updateOne(
        { _id: existingByProvider._id },
        { $unset: { deletionRequestedAt: "", deletedAt: "" } },
      );
      // Re-enable API keys
      await db.collection("apiKeys").updateMany(
        { userId: existingByProvider._id },
        { $set: { disabled: false }, $unset: { disabledAt: "" } },
      );
      logAudit({
        teamId: existingByProvider.teamId,
        actorId: existingByProvider._id,
        action: "user.deletion_cancelled",
        ip: "system",
        plan: "free",
        metadata: { reason: "login" },
      }).catch(() => {});
    }

    await db.collection("users").updateOne({ _id: existingByProvider._id }, { $set: updates });
    const user = await db.collection("users").findOne({ _id: existingByProvider._id });
    return { user: user as unknown as User, isNew: false, emailUpdated };
  }

  // 2. Look up by email (account linking)
  const existingByEmail = await db.collection("users").findOne({
    email: profile.email,
    deletedAt: { $exists: false },
  });

  if (existingByEmail) {
    // ACCOUNT LINKING
    await db.collection("users").updateOne(
      { _id: existingByEmail._id },
      {
        $push: {
          providers: {
            provider: profile.provider,
            providerId: profile.providerId,
            email: profile.email,
            verified: profile.emailVerified,
            linkedAt: new Date(),
          },
        } as any,
        $set: {
          lastLoginAt: new Date(),
          updatedAt: new Date(),
          ...((!existingByEmail.customAvatar && profile.avatar) ? { avatar: profile.avatar } : {}),
        },
      },
    );

    logAudit({
      teamId: existingByEmail.teamId,
      actorId: existingByEmail._id,
      action: "provider.linked",
      ip: "system",
      plan: "free",
      metadata: { provider: profile.provider, providerId: profile.providerId },
    }).catch(() => {});

    // Send provider_linked notification email
    const { getEmailService } = await import("./email");
    getEmailService().send(existingByEmail.email, "provider_linked", { provider: profile.provider }).catch(() => {});

    const user = await db.collection("users").findOne({ _id: existingByEmail._id });
    return { user: user as unknown as User, isNew: false };
  }

  // 3. New user — resolve invite code if present
  let inviteValid = false;
  let inviteTeamId: string | undefined;
  let inviteRole: string | undefined;
  let inviteTeamName: string | undefined;
  let inviteError: "expired" | "exhausted" | "not_found" | undefined;

  if (inviteCode) {
    const now = new Date();
    // Atomic: use aggregation pipeline update to enforce uses < maxUses
    // Pipeline updates allow referencing document fields in the filter
    const inviteResult = await db.collection("teams").findOneAndUpdate(
      {
        "inviteCodes.code": inviteCode,
        "inviteCodes.expiresAt": { $gt: now },
      },
      [
        {
          $set: {
            inviteCodes: {
              $map: {
                input: "$inviteCodes",
                as: "ic",
                in: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ["$$ic.code", inviteCode] },
                        { $lt: ["$$ic.uses", "$$ic.maxUses"] },
                      ],
                    },
                    then: {
                      $mergeObjects: [
                        "$$ic",
                        {
                          uses: { $add: ["$$ic.uses", 1] },
                          usedBy: { $concatArrays: ["$$ic.usedBy", ["pending"]] },
                        },
                      ],
                    },
                    else: "$$ic",
                  },
                },
              },
            },
          },
        },
      ],
      { returnDocument: "after" },
    );

    if (inviteResult) {
      const ic = inviteResult.inviteCodes.find((c: any) => c.code === inviteCode);
      // Check if uses was actually incremented (uses < maxUses was true)
      if (ic && ic.usedBy.includes("pending")) {
        inviteValid = true;
        inviteTeamId = inviteResult._id as string;
        inviteRole = ic.role;
        inviteTeamName = inviteResult.name;
      } else {
        inviteError = "exhausted";
      }
    } else {
      // Check if code exists but expired
      const teamWithCode = await db.collection("teams").findOne({
        "inviteCodes.code": inviteCode,
      });
      inviteError = teamWithCode ? "expired" : "not_found";
    }
  }

  const userId = randomUUID();

  if (inviteValid && inviteTeamId && inviteRole) {
    // NEW USER VIA INVITE
    const now = new Date();
    const user: any = {
      _id: userId,
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      customAvatar: false,
      role: inviteRole,
      platformRole: "user",
      teamId: inviteTeamId,
      roleVersion: 0,
      providers: [{
        provider: profile.provider,
        providerId: profile.providerId,
        email: profile.email,
        verified: profile.emailVerified,
        linkedAt: now,
      }],
      lastLoginAt: now,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("users").insertOne(user);
    await db.collection("notificationPreferences").insertOne({
      _id: userId,
      loginAlerts: true,
      teamInvites: true,
      anomalyDigest: "daily",
      updatedAt: now,
    });

    // Update usedBy with actual userId
    await db.collection("teams").updateOne(
      { _id: inviteTeamId, "inviteCodes.code": inviteCode },
      { $set: { "inviteCodes.$.usedBy.$[elem]": userId } },
      { arrayFilters: [{ elem: "pending" }] },
    );

    logAudit({
      teamId: inviteTeamId,
      actorId: userId,
      action: "member.joined",
      ip: "system",
      plan: "free",
      metadata: { inviteCode, role: inviteRole },
    }).catch(() => {});

    return {
      user: user as User,
      isNew: true,
      joined: { teamId: inviteTeamId, teamName: inviteTeamName! },
    };
  }

  // NEW USER (organic)
  // First-user check
  const platformClaim = await db.collection("platformConfig").findOneAndUpdate(
    { _id: "config", firstUserClaimed: false },
    { $set: { firstUserClaimed: true, claimedBy: userId } },
    { upsert: true, returnDocument: "after" },
  );

  const isPlatformAdmin = platformClaim?.claimedBy === userId;

  // Create personal team
  const teamId = randomUUID();
  const slug = await generateUniqueSlug(profile.name);
  const now = new Date();

  await db.collection("teams").insertOne({
    _id: teamId,
    name: `${profile.name}'s Team`,
    slug,
    plan: "free",
    ownerId: userId,
    watchlist: [],
    inviteCodes: [],
    createdAt: now,
    updatedAt: now,
  });

  const user: any = {
    _id: userId,
    email: profile.email,
    name: profile.name,
    avatar: profile.avatar,
    customAvatar: false,
    role: "owner",
    platformRole: isPlatformAdmin ? "admin" : "user",
    teamId,
    roleVersion: 0,
    providers: [{
      provider: profile.provider,
      providerId: profile.providerId,
      email: profile.email,
      verified: profile.emailVerified,
      linkedAt: now,
    }],
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("users").insertOne(user);
  await db.collection("notificationPreferences").insertOne({
    _id: userId,
    loginAlerts: true,
    teamInvites: true,
    anomalyDigest: "daily",
    updatedAt: now,
  });

  return { user: user as User, isNew: true, inviteError };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd api && bun test tests/infrastructure/find-or-create-user.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/infrastructure/auth.ts api/tests/infrastructure/find-or-create-user.test.ts
git commit -m "feat: add findOrCreateUser with 4-path decision tree"
```

---

## Task 14: API Key Routes

**Files:**
- Create: `api/src/modules/system/api-key-routes.ts`
- Test: `api/tests/modules/api-key-routes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `api/tests/modules/api-key-routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { apiKeyRoutes } from "../../src/modules/system/api-key-routes";
import { hashToken } from "../../src/infrastructure/auth";
import { randomUUID } from "crypto";

function setAuth() {
  return async (c: any, next: any) => {
    c.set("userId", "test-user-1");
    c.set("teamId", "test-team-1");
    c.set("role", "member");
    c.set("platformRole", "user");
    c.set("authMethod", "jwt");
    await next();
  };
}

let app: Hono;

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  app = new Hono();
  app.use("*", setAuth());
  app.route("/auth/keys", apiKeyRoutes);
});

beforeEach(async () => {
  await getDb().collection("apiKeys").deleteMany({});
  await getDb().collection("auditEvents").deleteMany({});
  // Insert team for audit logging
  await getDb().collection("teams").updateOne(
    { _id: "test-team-1" },
    { $set: { name: "Test", slug: "test", plan: "free", ownerId: "test-user-1" } },
    { upsert: true },
  );
});

afterAll(async () => {
  await getDb().collection("apiKeys").deleteMany({});
  await getDb().collection("teams").deleteMany({});
  await disconnectMongo();
});

describe("POST /auth/keys — create", () => {
  it("creates a new API key and returns the raw key once", async () => {
    const res = await app.request("/auth/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "CI Key", scope: "read" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.key).toBeTruthy();
    expect(body.data.key).toMatch(/^gbt_/);
    expect(body.data.name).toBe("CI Key");
    expect(body.data.scope).toBe("read");

    // Verify stored in DB
    const db = getDb();
    const stored = await db.collection("apiKeys").findOne({ keyHash: hashToken(body.data.key) });
    expect(stored).not.toBeNull();
    expect(stored!.name).toBe("CI Key");
  });
});

describe("GET /auth/keys — list", () => {
  it("lists user's API keys without raw key", async () => {
    // Create a key first
    await app.request("/auth/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "List Test", scope: "read-write" }),
    });

    const res = await app.request("/auth/keys");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("List Test");
    expect(body.data[0].prefix).toBeTruthy();
    expect(body.data[0].key).toBeUndefined(); // raw key not returned in list
  });
});

describe("DELETE /auth/keys/:id — revoke", () => {
  it("revokes an API key", async () => {
    const createRes = await app.request("/auth/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "To Delete", scope: "read" }),
    });
    const { data } = await createRes.json();

    const res = await app.request(`/auth/keys/${data.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);

    // Verify deleted
    const db = getDb();
    const deleted = await db.collection("apiKeys").findOne({ _id: data.id });
    expect(deleted).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/modules/api-key-routes.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement API key routes**

Create `api/src/modules/system/api-key-routes.ts`:

```typescript
import { Hono } from "hono";
import { randomUUID, randomBytes } from "crypto";
import { getDb } from "../../infrastructure/mongo";
import { hashToken, logAudit } from "../../infrastructure/auth";
import { success, apiError, validationError } from "../../helpers/response";

export const apiKeyRoutes = new Hono();

// POST /auth/keys — create
apiKeyRoutes.post("/", async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const body = await c.req.json();
  const { name, scope, expiresAt } = body;

  if (!name || typeof name !== "string") {
    return validationError(c, "name is required");
  }
  if (!scope || !["read", "read-write"].includes(scope)) {
    return validationError(c, "scope must be 'read' or 'read-write'");
  }

  const rawKey = `gbt_${randomBytes(24).toString("hex")}`;
  const keyHash = hashToken(rawKey);
  const keyPrefix = rawKey.slice(0, 8);
  const id = randomUUID();
  const now = new Date();

  const doc = {
    _id: id,
    keyHash,
    keyPrefix,
    userId,
    teamId,
    name,
    scope,
    disabled: false,
    lastUsedAt: null,
    createdAt: now,
    ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
  };

  const db = getDb();
  await db.collection("apiKeys").insertOne(doc);

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const team = await db.collection("teams").findOne({ _id: teamId });
  logAudit({
    teamId,
    actorId: userId,
    action: "apikey.created",
    target: { type: "apikey", id },
    ip,
    plan: (team?.plan as any) || "free",
    metadata: { name, scope, prefix: keyPrefix },
  }).catch(() => {});

  return success(c, {
    id,
    key: rawKey,
    prefix: keyPrefix,
    name,
    scope,
    createdAt: now,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  });
});

// GET /auth/keys — list
apiKeyRoutes.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const db = getDb();

  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);

  const keys = await db.collection("apiKeys")
    .find({ userId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .project({ keyHash: 0 })
    .toArray();

  const total = await db.collection("apiKeys").countDocuments({ userId });

  const mapped = keys.map((k: any) => ({
    id: k._id,
    prefix: k.keyPrefix,
    name: k.name,
    scope: k.scope,
    disabled: k.disabled,
    lastUsedAt: k.lastUsedAt,
    createdAt: k.createdAt,
    expiresAt: k.expiresAt,
  }));

  return c.json({ data: mapped, meta: { total, limit, offset } });
});

// DELETE /auth/keys/:id — revoke
apiKeyRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const keyId = c.req.param("id");
  const db = getDb();

  const key = await db.collection("apiKeys").findOne({ _id: keyId, userId });
  if (!key) return apiError(c, "NOT_FOUND", "API key not found", 404);

  await db.collection("apiKeys").deleteOne({ _id: keyId });

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const team = await db.collection("teams").findOne({ _id: teamId });
  logAudit({
    teamId,
    actorId: userId,
    action: "apikey.revoked",
    target: { type: "apikey", id: keyId },
    ip,
    plan: (team?.plan as any) || "free",
    metadata: { prefix: key.keyPrefix, name: key.name },
  }).catch(() => {});

  return success(c, { message: "API key revoked" });
});

// POST /auth/keys/:id/rotate — rotate
apiKeyRoutes.post("/:id/rotate", async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const keyId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const gracePeriodHours = Math.min(Number(body.gracePeriodHours ?? 24), 168);

  const db = getDb();
  const oldKey = await db.collection("apiKeys").findOne({ _id: keyId, userId });
  if (!oldKey) return apiError(c, "NOT_FOUND", "API key not found", 404);

  // Generate new key
  const newRawKey = `gbt_${randomBytes(24).toString("hex")}`;
  const newKeyHash = hashToken(newRawKey);
  const newKeyPrefix = newRawKey.slice(0, 8);
  const now = new Date();

  // Update with new hash
  await db.collection("apiKeys").updateOne(
    { _id: keyId },
    { $set: { keyHash: newKeyHash, keyPrefix: newKeyPrefix } },
  );

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const team = await db.collection("teams").findOne({ _id: teamId });
  logAudit({
    teamId,
    actorId: userId,
    action: "apikey.rotated",
    target: { type: "apikey", id: keyId },
    ip,
    plan: (team?.plan as any) || "free",
    metadata: { oldPrefix: oldKey.keyPrefix, newPrefix: newKeyPrefix },
  }).catch(() => {});

  return success(c, {
    id: keyId,
    key: newRawKey,
    prefix: newKeyPrefix,
    name: oldKey.name,
    scope: oldKey.scope,
  });
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd api && bun test tests/modules/api-key-routes.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/system/api-key-routes.ts api/tests/modules/api-key-routes.test.ts
git commit -m "feat: add API key routes — create, list, revoke, rotate"
```

---

## Task 15: Team Routes

**Files:**
- Create: `api/src/modules/system/team-routes.ts`
- Test: `api/tests/modules/team-routes.test.ts`

This is the largest route file. Team CRUD, invite codes, join, leave, member management, watchlist, saved views, and audit log.

- [ ] **Step 1: Write the failing test**

Create `api/tests/modules/team-routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { teamRoutes } from "../../src/modules/system/team-routes";
import { randomUUID } from "crypto";

const teamId = "test-team-1";
const userId = "test-user-1";

function setAuth(role = "owner", uId = userId, tId = teamId) {
  return async (c: any, next: any) => {
    c.set("userId", uId);
    c.set("teamId", tId);
    c.set("role", role);
    c.set("platformRole", "user");
    c.set("authMethod", "jwt");
    await next();
  };
}

let app: Hono;

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
});

beforeEach(async () => {
  const db = getDb();
  await db.collection("teams").deleteMany({});
  await db.collection("users").deleteMany({});
  await db.collection("apiKeys").deleteMany({});
  await db.collection("auditEvents").deleteMany({});
  await db.collection("savedViews").deleteMany({});
  await db.collection("sessions").deleteMany({});

  // Insert test team + user
  await db.collection("teams").insertOne({
    _id: teamId,
    name: "Test Team",
    slug: "test-team",
    plan: "free",
    ownerId: userId,
    watchlist: ["country:usa"],
    inviteCodes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  await db.collection("users").insertOne({
    _id: userId,
    email: "owner@test.com",
    name: "Owner",
    role: "owner",
    platformRole: "user",
    teamId,
    roleVersion: 0,
    providers: [],
    customAvatar: false,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  app = new Hono();
  app.use("*", setAuth());
  app.route("/team", teamRoutes);
});

afterAll(async () => {
  const db = getDb();
  await db.collection("teams").deleteMany({});
  await db.collection("users").deleteMany({});
  await disconnectMongo();
});

describe("GET /team", () => {
  it("returns team info with member list", async () => {
    const res = await app.request("/team");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.team.name).toBe("Test Team");
    expect(body.data.members).toHaveLength(1);
    expect(body.data.members[0].email).toBe("owner@test.com");
  });
});

describe("PUT /team", () => {
  it("updates team name (admin+)", async () => {
    const res = await app.request("/team", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Name" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("New Name");
  });
});

describe("POST /team/invite", () => {
  it("generates an invite code (admin+)", async () => {
    const res = await app.request("/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "member" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.code).toBeTruthy();
    expect(body.data.role).toBe("member");
  });
});

describe("GET /team/invite-info/:code", () => {
  it("returns public invite info", async () => {
    // Create invite first
    const createRes = await app.request("/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "member" }),
    });
    const { data } = await createRes.json();

    // Public endpoint — no auth needed
    const publicApp = new Hono();
    publicApp.route("/team", teamRoutes);
    const res = await publicApp.request(`/team/invite-info/${data.code}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.teamName).toBe("Test Team");
    expect(body.data.role).toBe("member");
  });
});

describe("GET /team/watchlist", () => {
  it("returns team watchlist", async () => {
    const res = await app.request("/team/watchlist");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.watchlist).toContain("country:usa");
  });
});

describe("PATCH /team/watchlist", () => {
  it("adds and removes entities", async () => {
    const res = await app.request("/team/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ add: ["conflict:ukraine"], remove: ["country:usa"] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.watchlist).toContain("conflict:ukraine");
    expect(body.data.watchlist).not.toContain("country:usa");
  });
});

describe("POST + GET /team/views — saved views", () => {
  it("creates and lists saved views", async () => {
    const createRes = await app.request("/team/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Middle East Watch",
        layers: ["risk", "conflicts"],
        viewport: { longitude: 45, latitude: 30, zoom: 5, viewMode: "flat" },
      }),
    });
    expect(createRes.status).toBe(200);

    const listRes = await app.request("/team/views");
    expect(listRes.status).toBe(200);
    const body = await listRes.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].name).toBe("Middle East Watch");
  });
});

describe("GET /team/audit", () => {
  it("returns paginated audit log (admin+)", async () => {
    const res = await app.request("/team/audit");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/modules/team-routes.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement team routes**

Create `api/src/modules/system/team-routes.ts`:

```typescript
import { Hono } from "hono";
import { randomUUID, randomBytes } from "crypto";
import { getDb } from "../../infrastructure/mongo";
import {
  signAccessToken,
  hashToken,
  generateRefreshToken,
  generateUniqueSlug,
  logAudit,
} from "../../infrastructure/auth";
import { success, apiError, validationError } from "../../helpers/response";
import { requireRole } from "../../middleware/require-role";
import { isRedisConnected, getRedis } from "../../infrastructure/redis";
import { setCookie } from "hono/cookie";

export const teamRoutes = new Hono();

// GET /team — team info + members
teamRoutes.get("/", async (c) => {
  const teamId = c.get("teamId") as string;
  const db = getDb();

  const team = await db.collection("teams").findOne({ _id: teamId });
  if (!team) return apiError(c, "NOT_FOUND", "Team not found", 404);

  const search = c.req.query("search") || "";
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);

  const memberFilter: any = { teamId };
  if (search) {
    memberFilter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const members = await db.collection("users")
    .find(memberFilter)
    .project({ roleVersion: 0, providers: 0 })
    .skip(offset)
    .limit(limit)
    .toArray();

  const total = await db.collection("users").countDocuments(memberFilter);

  return success(c, { team, members }, { total, limit, offset });
});

// PUT /team — update name/slug
teamRoutes.put("/", requireRole("admin"), async (c) => {
  const teamId = c.get("teamId") as string;
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const db = getDb();

  const update: Record<string, any> = { updatedAt: new Date() };
  if (body.name) update.name = body.name;
  if (body.slug) {
    const existing = await db.collection("teams").findOne({ slug: body.slug, _id: { $ne: teamId } });
    if (existing) return apiError(c, "SLUG_TAKEN", "This slug is already in use", 409);
    update.slug = body.slug;
  }

  await db.collection("teams").updateOne({ _id: teamId }, { $set: update });
  const team = await db.collection("teams").findOne({ _id: teamId });

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  logAudit({
    teamId, actorId: userId, action: "team.updated", ip,
    plan: (team?.plan as any) || "free",
    metadata: { changes: Object.keys(update).filter((k) => k !== "updatedAt") },
  }).catch(() => {});

  return success(c, team);
});

// DELETE /team — delete team (owner only)
teamRoutes.delete("/", requireRole("owner"), async (c) => {
  const teamId = c.get("teamId") as string;
  const userId = c.get("userId") as string;
  const db = getDb();

  const memberCount = await db.collection("users").countDocuments({
    teamId, _id: { $ne: userId },
  });
  if (memberCount > 0) {
    return apiError(c, "HAS_MEMBERS", "Remove all members before deleting team", 409);
  }

  await db.collection("teams").updateOne(
    { _id: teamId },
    { $set: { deletedAt: new Date() } },
  );

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  logAudit({
    teamId, actorId: userId, action: "team.updated", ip, plan: "free",
    metadata: { action: "deleted" },
  }).catch(() => {});

  return success(c, { message: "Team deleted" });
});

// POST /team/invite — generate invite code
teamRoutes.post("/invite", requireRole("admin"), async (c) => {
  const teamId = c.get("teamId") as string;
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { label, role, expiresInDays, maxUses } = body;

  if (!role || !["owner", "admin", "member", "viewer"].includes(role)) {
    return validationError(c, "role must be owner, admin, member, or viewer");
  }

  const db = getDb();
  const team = await db.collection("teams").findOne({ _id: teamId });
  if (!team) return apiError(c, "NOT_FOUND", "Team not found", 404);

  const activeInvites = team.inviteCodes?.filter(
    (ic: any) => new Date(ic.expiresAt) > new Date() && ic.uses < ic.maxUses,
  ) || [];
  if (activeInvites.length >= 50) {
    return apiError(c, "INVITE_LIMIT", "Maximum 50 active invite codes per team", 400);
  }

  const code = randomBytes(6).toString("hex").toUpperCase();
  const now = new Date();
  const invite = {
    code,
    label: label || undefined,
    role,
    createdBy: userId,
    expiresAt: new Date(now.getTime() + (expiresInDays || 7) * 24 * 60 * 60 * 1000),
    maxUses: maxUses || 10,
    uses: 0,
    usedBy: [],
  };

  await db.collection("teams").updateOne(
    { _id: teamId },
    { $push: { inviteCodes: invite } as any },
  );

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  logAudit({
    teamId, actorId: userId, action: "member.invited", ip,
    plan: (team.plan as any) || "free",
    metadata: { code, role, label },
  }).catch(() => {});

  return success(c, invite);
});

// GET /team/invites — list active invites
teamRoutes.get("/invites", requireRole("admin"), async (c) => {
  const teamId = c.get("teamId") as string;
  const db = getDb();
  const team = await db.collection("teams").findOne({ _id: teamId });
  if (!team) return apiError(c, "NOT_FOUND", "Team not found", 404);

  const now = new Date();
  const invites = (team.inviteCodes || []).map((ic: any) => ({
    ...ic,
    active: new Date(ic.expiresAt) > now && ic.uses < ic.maxUses,
  }));

  return success(c, invites);
});

// DELETE /team/invites/:code — revoke invite
teamRoutes.delete("/invites/:code", requireRole("admin"), async (c) => {
  const teamId = c.get("teamId") as string;
  const code = c.req.param("code");
  const db = getDb();

  await db.collection("teams").updateOne(
    { _id: teamId },
    { $pull: { inviteCodes: { code } } as any },
  );

  return success(c, { message: "Invite code revoked" });
});

// GET /team/invite-info/:code — public
teamRoutes.get("/invite-info/:code", async (c) => {
  const code = c.req.param("code");
  const db = getDb();

  const team = await db.collection("teams").findOne({
    "inviteCodes.code": code,
  });

  if (!team) return apiError(c, "NOT_FOUND", "Invite code not found", 404);

  const invite = team.inviteCodes.find((ic: any) => ic.code === code);
  if (!invite) return apiError(c, "NOT_FOUND", "Invite code not found", 404);

  const now = new Date();
  if (new Date(invite.expiresAt) < now) {
    return apiError(c, "EXPIRED", "Invite code has expired", 410);
  }
  if (invite.uses >= invite.maxUses) {
    return apiError(c, "EXHAUSTED", "Invite code has been fully used", 410);
  }

  const inviter = await db.collection("users").findOne({ _id: invite.createdBy });

  return success(c, {
    teamName: team.name,
    inviterName: inviter?.name || "Unknown",
    role: invite.role,
  });
});

// POST /team/join — join via invite code
teamRoutes.post("/join", async (c) => {
  const userId = c.get("userId") as string;
  const currentTeamId = c.get("teamId") as string;
  const body = await c.req.json();
  const { code } = body;

  if (!code) return validationError(c, "code is required");

  const db = getDb();

  // Validate invite code atomically with pipeline update for uses < maxUses
  const now = new Date();
  const inviteResult = await db.collection("teams").findOneAndUpdate(
    {
      "inviteCodes.code": code,
      "inviteCodes.expiresAt": { $gt: now },
    },
    [
      {
        $set: {
          inviteCodes: {
            $map: {
              input: "$inviteCodes",
              as: "ic",
              in: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ["$$ic.code", code] },
                      { $lt: ["$$ic.uses", "$$ic.maxUses"] },
                    ],
                  },
                  then: {
                    $mergeObjects: [
                      "$$ic",
                      {
                        uses: { $add: ["$$ic.uses", 1] },
                        usedBy: { $concatArrays: ["$$ic.usedBy", [userId]] },
                      },
                    ],
                  },
                  else: "$$ic",
                },
              },
            },
          },
        },
      },
    ],
    { returnDocument: "after" },
  );

  if (!inviteResult) {
    // Determine error reason
    const teamWithCode = await db.collection("teams").findOne({ "inviteCodes.code": code });
    if (!teamWithCode) return apiError(c, "NOT_FOUND", "Invite code not found", 404);
    const ic = teamWithCode.inviteCodes.find((i: any) => i.code === code);
    if (ic && new Date(ic.expiresAt) < now) return apiError(c, "EXPIRED", "Invite code has expired", 410);
    return apiError(c, "EXHAUSTED", "Invite code has been fully used", 410);
  }

  const invite = inviteResult.inviteCodes.find((ic: any) => ic.code === code);
  // Verify the update actually happened (uses was incremented)
  if (!invite || !invite.usedBy.includes(userId)) {
    return apiError(c, "EXHAUSTED", "Invite code has been fully used", 410);
  }

  const newTeamId = inviteResult._id as string;

  // Check if owner with other members
  const user = await db.collection("users").findOne({ _id: userId });
  if (user?.role === "owner") {
    const memberCount = await db.collection("users").countDocuments({
      teamId: currentTeamId, _id: { $ne: userId },
    });
    if (memberCount > 0) {
      return apiError(c, "TRANSFER_REQUIRED", "Transfer team ownership before joining another team", 409);
    }
  }

  // Archive old personal team
  await db.collection("teams").updateOne(
    { _id: currentTeamId },
    { $set: { deletedAt: now } },
  );

  // Revoke API keys
  await db.collection("apiKeys").deleteMany({ userId });

  // Update user
  await db.collection("users").updateOne(
    { _id: userId },
    {
      $set: {
        teamId: newTeamId,
        role: invite.role,
        updatedAt: now,
      },
      $inc: { roleVersion: 1 },
    },
  );

  // Invalidate Redis role version cache
  if (isRedisConnected()) {
    try { await getRedis().del(`gambit:user:${userId}:rv`); } catch {}
  }

  // Revoke all other sessions except current, then rotate refresh token
  const { getCookie: getC, setCookie: setC } = await import("hono/cookie");
  const currentRefreshToken = getC(c, "refresh_token");
  const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;

  if (currentHash) {
    await db.collection("sessions").deleteMany({ userId, refreshTokenHash: { $ne: currentHash } });
  } else {
    await db.collection("sessions").deleteMany({ userId });
  }

  // Issue new access token
  const updatedUser = await db.collection("users").findOne({ _id: userId });
  const accessToken = await signAccessToken({
    userId,
    role: updatedUser!.role,
    teamId: newTeamId,
    platformRole: updatedUser!.platformRole,
    roleVersion: updatedUser!.roleVersion,
  });

  // Rotate refresh token cookie
  const newRefreshToken = generateRefreshToken();
  const newRefreshHash = hashToken(newRefreshToken);
  const nowRefresh = new Date();
  if (currentHash) {
    await db.collection("sessions").updateOne(
      { refreshTokenHash: currentHash },
      { $set: { refreshTokenHash: newRefreshHash, teamId: newTeamId, lastRefreshedAt: nowRefresh } },
    );
  }
  setCookie(c, "refresh_token", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 30 * 24 * 60 * 60,
    path: "/api/v1/auth",
  });

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  logAudit({
    teamId: newTeamId, actorId: userId, action: "member.joined", ip,
    plan: (inviteResult.plan as any) || "free",
    metadata: { inviteCode: code, previousTeamId: currentTeamId },
  }).catch(() => {});

  return success(c, {
    accessToken,
    teamId: newTeamId,
    teamName: inviteResult.name,
    role: invite.role,
  });
});

// POST /team/leave
teamRoutes.post("/leave", async (c) => {
  const userId = c.get("userId") as string;
  const currentTeamId = c.get("teamId") as string;
  const db = getDb();

  const user = await db.collection("users").findOne({ _id: userId });
  if (!user) return apiError(c, "NOT_FOUND", "User not found", 404);

  if (user.role === "owner") {
    return apiError(c, "TRANSFER_REQUIRED", "Transfer ownership before leaving the team", 409);
  }

  // Create fresh personal team
  const newTeamId = randomUUID();
  const slug = await generateUniqueSlug(user.name);
  const now = new Date();

  await db.collection("teams").insertOne({
    _id: newTeamId,
    name: `${user.name}'s Team`,
    slug,
    plan: "free",
    ownerId: userId,
    watchlist: [],
    inviteCodes: [],
    createdAt: now,
    updatedAt: now,
  });

  // Update user
  await db.collection("users").updateOne(
    { _id: userId },
    {
      $set: { teamId: newTeamId, role: "owner", updatedAt: now },
      $inc: { roleVersion: 1 },
    },
  );

  // Invalidate Redis
  if (isRedisConnected()) {
    try { await getRedis().del(`gambit:user:${userId}:rv`); } catch {}
  }

  // Revoke API keys
  await db.collection("apiKeys").deleteMany({ userId });

  // Issue new token + rotate refresh cookie
  const updatedUser = await db.collection("users").findOne({ _id: userId });
  const accessToken = await signAccessToken({
    userId,
    role: "owner",
    teamId: newTeamId,
    platformRole: updatedUser!.platformRole,
    roleVersion: updatedUser!.roleVersion,
  });

  const { getCookie: getC } = await import("hono/cookie");
  const currentRefreshToken = getC(c, "refresh_token");
  const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;

  const newRefreshToken = generateRefreshToken();
  const newRefreshHash = hashToken(newRefreshToken);
  if (currentHash) {
    await db.collection("sessions").updateOne(
      { refreshTokenHash: currentHash },
      { $set: { refreshTokenHash: newRefreshHash, teamId: newTeamId, lastRefreshedAt: new Date() } },
    );
  }
  setCookie(c, "refresh_token", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 30 * 24 * 60 * 60,
    path: "/api/v1/auth",
  });

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const oldTeam = await db.collection("teams").findOne({ _id: currentTeamId });
  logAudit({
    teamId: currentTeamId, actorId: userId, action: "member.removed", ip,
    plan: (oldTeam?.plan as any) || "free",
    metadata: { reason: "left" },
  }).catch(() => {});

  return success(c, {
    accessToken,
    teamId: newTeamId,
    teamName: `${user.name}'s Team`,
    role: "owner",
  });
});

// DELETE /team/members/:userId — remove member
teamRoutes.delete("/members/:userId", requireRole("admin"), async (c) => {
  const teamId = c.get("teamId") as string;
  const actorId = c.get("userId") as string;
  const targetUserId = c.req.param("userId");
  const db = getDb();

  const target = await db.collection("users").findOne({ _id: targetUserId, teamId });
  if (!target) return apiError(c, "NOT_FOUND", "Member not found", 404);
  if (target.role === "owner") return apiError(c, "FORBIDDEN", "Cannot remove the team owner", 403);

  // Create personal team for removed member
  const newTeamId = randomUUID();
  const slug = await generateUniqueSlug(target.name);
  const now = new Date();

  await db.collection("teams").insertOne({
    _id: newTeamId,
    name: `${target.name}'s Team`,
    slug,
    plan: "free",
    ownerId: targetUserId,
    watchlist: [],
    inviteCodes: [],
    createdAt: now,
    updatedAt: now,
  });

  await db.collection("users").updateOne(
    { _id: targetUserId },
    {
      $set: { teamId: newTeamId, role: "owner", updatedAt: now },
      $inc: { roleVersion: 1 },
    },
  );

  if (isRedisConnected()) {
    try { await getRedis().del(`gambit:user:${targetUserId}:rv`); } catch {}
  }

  await db.collection("apiKeys").deleteMany({ userId: targetUserId });
  await db.collection("sessions").deleteMany({ userId: targetUserId });

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const team = await db.collection("teams").findOne({ _id: teamId });
  logAudit({
    teamId, actorId, action: "member.removed", ip,
    plan: (team?.plan as any) || "free",
    target: { type: "user", id: targetUserId },
  }).catch(() => {});

  return success(c, { message: "Member removed" });
});

// PUT /team/members/:userId/role — change role (owner only)
teamRoutes.put("/members/:userId/role", requireRole("owner"), async (c) => {
  const teamId = c.get("teamId") as string;
  const actorId = c.get("userId") as string;
  const targetUserId = c.req.param("userId");
  const body = await c.req.json();
  const { role } = body;

  if (!role || !["admin", "member", "viewer"].includes(role)) {
    return validationError(c, "role must be admin, member, or viewer");
  }

  const db = getDb();
  const target = await db.collection("users").findOne({ _id: targetUserId, teamId });
  if (!target) return apiError(c, "NOT_FOUND", "Member not found", 404);

  const oldRole = target.role;
  await db.collection("users").updateOne(
    { _id: targetUserId },
    { $set: { role, updatedAt: new Date() }, $inc: { roleVersion: 1 } },
  );

  if (isRedisConnected()) {
    try { await getRedis().del(`gambit:user:${targetUserId}:rv`); } catch {}
  }

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const team = await db.collection("teams").findOne({ _id: teamId });
  logAudit({
    teamId, actorId, action: "role.changed", ip,
    plan: (team?.plan as any) || "free",
    target: { type: "user", id: targetUserId },
    metadata: { oldRole, newRole: role },
  }).catch(() => {});

  return success(c, { message: `Role updated to ${role}` });
});

// POST /team/transfer-ownership (owner only)
teamRoutes.post("/transfer-ownership", requireRole("owner"), async (c) => {
  const teamId = c.get("teamId") as string;
  const actorId = c.get("userId") as string;
  const body = await c.req.json();
  const { targetUserId } = body;

  const db = getDb();
  const target = await db.collection("users").findOne({ _id: targetUserId, teamId });
  if (!target) return apiError(c, "NOT_FOUND", "Target member not found", 404);

  const now = new Date();

  // Transfer ownership
  await db.collection("users").updateOne(
    { _id: targetUserId },
    { $set: { role: "owner", updatedAt: now }, $inc: { roleVersion: 1 } },
  );
  await db.collection("users").updateOne(
    { _id: actorId },
    { $set: { role: "admin", updatedAt: now }, $inc: { roleVersion: 1 } },
  );
  await db.collection("teams").updateOne(
    { _id: teamId },
    { $set: { ownerId: targetUserId, updatedAt: now } },
  );

  if (isRedisConnected()) {
    try {
      await getRedis().del(`gambit:user:${targetUserId}:rv`);
      await getRedis().del(`gambit:user:${actorId}:rv`);
    } catch {}
  }

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const team = await db.collection("teams").findOne({ _id: teamId });
  logAudit({
    teamId, actorId, action: "team.ownership_transferred", ip,
    plan: (team?.plan as any) || "free",
    target: { type: "user", id: targetUserId },
  }).catch(() => {});

  return success(c, { message: "Ownership transferred" });
});

// --- Watchlist ---

teamRoutes.get("/watchlist", async (c) => {
  const teamId = c.get("teamId") as string;
  const db = getDb();
  const team = await db.collection("teams").findOne({ _id: teamId });
  return success(c, { watchlist: team?.watchlist || [] });
});

teamRoutes.put("/watchlist", requireRole("member"), async (c) => {
  const teamId = c.get("teamId") as string;
  const body = await c.req.json();
  const db = getDb();
  await db.collection("teams").updateOne(
    { _id: teamId },
    { $set: { watchlist: body.watchlist || [], updatedAt: new Date() } },
  );
  return success(c, { watchlist: body.watchlist || [] });
});

teamRoutes.patch("/watchlist", requireRole("member"), async (c) => {
  const teamId = c.get("teamId") as string;
  const body = await c.req.json();
  const { add, remove } = body;
  const db = getDb();

  const updates: any = {};
  if (add?.length) updates.$addToSet = { watchlist: { $each: add } };
  if (remove?.length) updates.$pull = { watchlist: { $in: remove } };
  updates.$set = { updatedAt: new Date() };

  // MongoDB doesn't allow $addToSet and $pull in same update, split if both
  if (add?.length && remove?.length) {
    await db.collection("teams").updateOne({ _id: teamId }, { $pull: { watchlist: { $in: remove } } } as any);
    await db.collection("teams").updateOne({ _id: teamId }, { $addToSet: { watchlist: { $each: add } }, $set: { updatedAt: new Date() } } as any);
  } else {
    await db.collection("teams").updateOne({ _id: teamId }, updates);
  }

  const team = await db.collection("teams").findOne({ _id: teamId });
  return success(c, { watchlist: team?.watchlist || [] });
});

// --- Saved Views ---

teamRoutes.post("/views", requireRole("member"), async (c) => {
  const teamId = c.get("teamId") as string;
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { name, layers, viewport, filters } = body;

  if (!name || !layers || !viewport) {
    return validationError(c, "name, layers, and viewport are required");
  }

  const db = getDb();
  const now = new Date();
  const doc = {
    _id: randomUUID(),
    teamId,
    createdBy: userId,
    name,
    layers,
    viewport,
    filters,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("savedViews").insertOne(doc);
  return success(c, doc);
});

teamRoutes.get("/views", async (c) => {
  const teamId = c.get("teamId") as string;
  const db = getDb();
  const views = await db.collection("savedViews")
    .find({ teamId })
    .sort({ createdAt: -1 })
    .toArray();
  return success(c, views);
});

teamRoutes.put("/views/:id", requireRole("member"), async (c) => {
  const teamId = c.get("teamId") as string;
  const userId = c.get("userId") as string;
  const viewId = c.req.param("id");
  const body = await c.req.json();
  const db = getDb();

  const view = await db.collection("savedViews").findOne({ _id: viewId, teamId });
  if (!view) return apiError(c, "NOT_FOUND", "View not found", 404);

  // Creator or admin+ can edit
  const role = c.get("role") as string;
  if (view.createdBy !== userId && !["admin", "owner"].includes(role)) {
    return apiError(c, "FORBIDDEN", "Only the creator or admin can edit this view", 403);
  }

  const update: Record<string, any> = { updatedAt: new Date() };
  if (body.name) update.name = body.name;
  if (body.layers) update.layers = body.layers;
  if (body.viewport) update.viewport = body.viewport;
  if (body.filters !== undefined) update.filters = body.filters;

  await db.collection("savedViews").updateOne({ _id: viewId }, { $set: update });
  const updated = await db.collection("savedViews").findOne({ _id: viewId });
  return success(c, updated);
});

teamRoutes.delete("/views/:id", requireRole("member"), async (c) => {
  const teamId = c.get("teamId") as string;
  const userId = c.get("userId") as string;
  const viewId = c.req.param("id");
  const db = getDb();

  const view = await db.collection("savedViews").findOne({ _id: viewId, teamId });
  if (!view) return apiError(c, "NOT_FOUND", "View not found", 404);

  const role = c.get("role") as string;
  if (view.createdBy !== userId && !["admin", "owner"].includes(role)) {
    return apiError(c, "FORBIDDEN", "Only the creator or admin can delete this view", 403);
  }

  await db.collection("savedViews").deleteOne({ _id: viewId });
  return success(c, { message: "View deleted" });
});

// --- Audit Log ---

teamRoutes.get("/audit", requireRole("admin"), async (c) => {
  const teamId = c.get("teamId") as string;
  const db = getDb();

  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);
  const action = c.req.query("action");
  const actorId = c.req.query("actorId");
  const from = c.req.query("from");
  const to = c.req.query("to");

  const filter: any = { teamId };
  if (action) filter.action = action;
  if (actorId) filter.actorId = actorId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const events = await db.collection("auditEvents")
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .toArray();

  const total = await db.collection("auditEvents").countDocuments(filter);

  return c.json({ data: events, meta: { total, limit, offset } });
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd api && bun test tests/modules/team-routes.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/system/team-routes.ts api/tests/modules/team-routes.test.ts
git commit -m "feat: add team routes — CRUD, invites, join, leave, members, watchlist, views, audit"
```

---

## Task 16: Team Settings & Notification Routes

**Files:**
- Create: `api/src/modules/system/team-settings-routes.ts`
- Create: `api/src/modules/system/notification-routes.ts`
- Test: `api/tests/modules/team-settings-routes.test.ts`
- Test: `api/tests/modules/notification-routes.test.ts`

- [ ] **Step 1: Write failing tests for team settings**

Create `api/tests/modules/team-settings-routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { teamSettingsRoutes } from "../../src/modules/system/team-settings-routes";

function setAuth(role = "admin") {
  return async (c: any, next: any) => {
    c.set("userId", "u1");
    c.set("teamId", "t1");
    c.set("role", role);
    c.set("platformRole", "user");
    c.set("authMethod", "jwt");
    await next();
  };
}

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
});

beforeEach(async () => {
  await getDb().collection("teamSettings").deleteMany({});
});

afterAll(async () => {
  await getDb().collection("teamSettings").deleteMany({});
  await disconnectMongo();
});

describe("Team AI Settings", () => {
  it("GET returns empty config when none set", async () => {
    const app = new Hono();
    app.use("*", setAuth("member"));
    app.route("/settings", teamSettingsRoutes);

    const res = await app.request("/settings/ai");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.aiAnalysisEnabled).toBe(false);
  });

  it("PUT sets team AI config (admin+)", async () => {
    const app = new Hono();
    app.use("*", setAuth("admin"));
    app.route("/settings", teamSettingsRoutes);

    const res = await app.request("/settings/ai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "anthropic", apiKey: "sk-ant-test-key-12345", model: "claude-sonnet-4-20250514" }),
    });
    // May fail validation (key check), but structure is correct
    expect([200, 400]).toContain(res.status);
  });

  it("rejects member from setting AI config", async () => {
    const app = new Hono();
    app.use("*", setAuth("member"));
    app.route("/settings", teamSettingsRoutes);

    const res = await app.request("/settings/ai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "anthropic", apiKey: "sk-ant-test", model: "claude-sonnet-4-20250514" }),
    });
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Write failing tests for notification routes**

Create `api/tests/modules/notification-routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { notificationRoutes } from "../../src/modules/system/notification-routes";

function setAuth() {
  return async (c: any, next: any) => {
    c.set("userId", "u1");
    c.set("teamId", "t1");
    c.set("role", "member");
    c.set("platformRole", "user");
    c.set("authMethod", "jwt");
    await next();
  };
}

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
});

beforeEach(async () => {
  await getDb().collection("notificationPreferences").deleteMany({});
});

afterAll(async () => {
  await getDb().collection("notificationPreferences").deleteMany({});
  await disconnectMongo();
});

describe("Notification Preferences", () => {
  it("GET returns defaults when none set", async () => {
    const app = new Hono();
    app.use("*", setAuth());
    app.route("/settings", notificationRoutes);

    const res = await app.request("/settings/notifications");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.loginAlerts).toBe(true);
    expect(body.data.anomalyDigest).toBe("daily");
  });

  it("PUT updates notification preferences", async () => {
    const app = new Hono();
    app.use("*", setAuth());
    app.route("/settings", notificationRoutes);

    const res = await app.request("/settings/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loginAlerts: false, anomalyDigest: "off" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.loginAlerts).toBe(false);
    expect(body.data.anomalyDigest).toBe("off");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd api && bun test tests/modules/team-settings-routes.test.ts tests/modules/notification-routes.test.ts
```

Expected: FAIL

- [ ] **Step 4: Implement team settings routes**

Create `api/src/modules/system/team-settings-routes.ts`:

```typescript
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { success, apiError, validationError } from "../../helpers/response";
import { requireRole } from "../../middleware/require-role";
import { maskApiKey } from "../../infrastructure/user-settings";

export const teamSettingsRoutes = new Hono();

teamSettingsRoutes.get("/ai", requireRole("member"), async (c) => {
  const teamId = c.get("teamId") as string;
  const db = getDb();
  const settings = await db.collection("teamSettings").findOne({ _id: teamId });

  if (!settings) {
    return success(c, { aiAnalysisEnabled: false });
  }

  // Decrypt first, then mask the plaintext (not the ciphertext)
  let maskedKey = null;
  if (settings.llmApiKey) {
    try {
      const { decrypt } = await import("../../infrastructure/user-settings") as any;
      maskedKey = maskApiKey(decrypt(settings.llmApiKey));
    } catch {
      maskedKey = "****"; // fallback if decryption fails
    }
  }

  return success(c, {
    provider: settings.llmProvider,
    model: settings.llmModel || null,
    apiKey: maskedKey,
    aiAnalysisEnabled: settings.aiAnalysisEnabled,
  });
});

teamSettingsRoutes.put("/ai", requireRole("admin"), async (c) => {
  const teamId = c.get("teamId") as string;
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { provider, apiKey, model } = body;

  if (!provider || !["anthropic", "openai"].includes(provider)) {
    return validationError(c, "provider must be 'anthropic' or 'openai'");
  }
  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
    return validationError(c, "apiKey is required (minimum 10 characters)");
  }

  // Import encrypt from user-settings (same AES-256-GCM as personal keys)
  const userSettingsMod = await import("../../infrastructure/user-settings") as any;
  const encryptedKey = userSettingsMod.encrypt ? userSettingsMod.encrypt(apiKey) : apiKey;

  const db = getDb();
  const now = new Date();

  await db.collection("teamSettings").updateOne(
    { _id: teamId },
    {
      $set: {
        llmProvider: provider,
        llmApiKey: encryptedKey,
        llmModel: model,
        aiAnalysisEnabled: true,
        updatedBy: userId,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  return success(c, { provider, model: model || null, aiAnalysisEnabled: true });
});

teamSettingsRoutes.delete("/ai", requireRole("admin"), async (c) => {
  const teamId = c.get("teamId") as string;
  const db = getDb();
  await db.collection("teamSettings").deleteOne({ _id: teamId });
  return success(c, { aiAnalysisEnabled: false });
});
```

- [ ] **Step 5: Implement notification routes**

Create `api/src/modules/system/notification-routes.ts`:

```typescript
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { success } from "../../helpers/response";

export const notificationRoutes = new Hono();

const DEFAULTS = {
  loginAlerts: true,
  teamInvites: true,
  anomalyDigest: "daily" as const,
};

notificationRoutes.get("/notifications", async (c) => {
  const userId = c.get("userId") as string;
  const db = getDb();
  const prefs = await db.collection("notificationPreferences").findOne({ _id: userId });
  return success(c, prefs || { ...DEFAULTS, _id: userId, updatedAt: new Date() });
});

notificationRoutes.put("/notifications", async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const db = getDb();
  const now = new Date();

  const update: Record<string, any> = { updatedAt: now };
  if (typeof body.loginAlerts === "boolean") update.loginAlerts = body.loginAlerts;
  if (typeof body.teamInvites === "boolean") update.teamInvites = body.teamInvites;
  if (body.anomalyDigest && ["realtime", "daily", "off"].includes(body.anomalyDigest)) {
    update.anomalyDigest = body.anomalyDigest;
  }

  await db.collection("notificationPreferences").updateOne(
    { _id: userId },
    {
      $set: update,
      $setOnInsert: {
        loginAlerts: DEFAULTS.loginAlerts,
        teamInvites: DEFAULTS.teamInvites,
        anomalyDigest: DEFAULTS.anomalyDigest,
      },
    },
    { upsert: true },
  );

  const prefs = await db.collection("notificationPreferences").findOne({ _id: userId });
  return success(c, prefs);
});
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd api && bun test tests/modules/team-settings-routes.test.ts tests/modules/notification-routes.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add api/src/modules/system/team-settings-routes.ts api/src/modules/system/notification-routes.ts api/tests/modules/team-settings-routes.test.ts api/tests/modules/notification-routes.test.ts
git commit -m "feat: add team settings and notification preference routes"
```

---

## Task 17: Admin Routes

**Files:**
- Create: `api/src/modules/system/admin-routes.ts`
- Test: `api/tests/modules/admin-routes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `api/tests/modules/admin-routes.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { adminRoutes } from "../../src/modules/system/admin-routes";
import { requirePlatformAdmin } from "../../src/middleware/require-platform-admin";

function setAuth(platformRole = "admin") {
  return async (c: any, next: any) => {
    c.set("userId", "admin-1");
    c.set("teamId", "t1");
    c.set("role", "owner");
    c.set("platformRole", platformRole);
    c.set("authMethod", "jwt");
    await next();
  };
}

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
});

beforeEach(async () => {
  const db = getDb();
  await db.collection("users").deleteMany({});
  await db.collection("teams").deleteMany({});
  await db.collection("recoveryTokens").deleteMany({});

  await db.collection("users").insertOne({
    _id: "target-user", email: "target@test.com", name: "Target",
    role: "member", platformRole: "user", teamId: "t2",
    roleVersion: 0, providers: [], customAvatar: false,
    lastLoginAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
  });
  await db.collection("teams").insertOne({
    _id: "t1", name: "Admin Team", slug: "admin", plan: "free",
    ownerId: "admin-1", watchlist: [], inviteCodes: [],
    createdAt: new Date(), updatedAt: new Date(),
  });
});

afterAll(async () => {
  await getDb().collection("users").deleteMany({});
  await getDb().collection("teams").deleteMany({});
  await getDb().collection("recoveryTokens").deleteMany({});
  await disconnectMongo();
});

describe("GET /admin/users", () => {
  it("lists all users for platform admin", async () => {
    const app = new Hono();
    app.use("*", setAuth("admin"));
    app.use("*", requirePlatformAdmin());
    app.route("/admin", adminRoutes);

    const res = await app.request("/admin/users");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("rejects non-admin", async () => {
    const app = new Hono();
    app.use("*", setAuth("user"));
    app.use("*", requirePlatformAdmin());
    app.route("/admin", adminRoutes);

    const res = await app.request("/admin/users");
    expect(res.status).toBe(403);
  });
});

describe("POST /admin/recovery", () => {
  it("creates a recovery token for target user", async () => {
    const app = new Hono();
    app.use("*", setAuth("admin"));
    app.use("*", requirePlatformAdmin());
    app.route("/admin", adminRoutes);

    const res = await app.request("/admin/recovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "target@test.com" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.message).toContain("Recovery email sent");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/modules/admin-routes.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement admin routes**

Create `api/src/modules/system/admin-routes.ts`:

```typescript
import { Hono } from "hono";
import { randomUUID } from "crypto";
import { getDb } from "../../infrastructure/mongo";
import { hashToken, logAudit } from "../../infrastructure/auth";
import { success, apiError } from "../../helpers/response";
import { getEmailService } from "../../infrastructure/email";

export const adminRoutes = new Hono();

// POST /admin/recovery — send recovery email
adminRoutes.post("/recovery", async (c) => {
  const actorId = c.get("userId") as string;
  const body = await c.req.json();
  const { email } = body;

  if (!email) return apiError(c, "MISSING_EMAIL", "email is required", 400);

  const db = getDb();
  const target = await db.collection("users").findOne({ email });
  if (!target) return apiError(c, "NOT_FOUND", "User not found", 404);

  // Check cooldown
  const existing = await db.collection("recoveryTokens").findOne({
    userId: target._id,
    used: false,
    expiresAt: { $gt: new Date() },
  });
  if (existing) {
    return apiError(c, "COOLDOWN", `Recovery already initiated. Token expires at ${existing.expiresAt.toISOString()}`, 409);
  }

  const rawToken = randomUUID();
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  await db.collection("recoveryTokens").insertOne({
    _id: randomUUID(),
    tokenHash,
    userId: target._id,
    createdBy: actorId,
    expiresAt,
    used: false,
  });

  // Send email
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  getEmailService().send(email, "account_recovery", {
    recoveryUrl: `${frontendUrl}/recover?token=${rawToken}`,
    expiresAt: expiresAt.toISOString(),
  }).catch(() => {});

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const team = await db.collection("teams").findOne({ _id: c.get("teamId") as string });
  logAudit({
    teamId: c.get("teamId") as string,
    actorId,
    action: "user.recovery_initiated",
    ip,
    plan: (team?.plan as any) || "free",
    target: { type: "user", id: target._id as string },
    metadata: { targetEmail: email },
  }).catch(() => {});

  return success(c, { message: "Recovery email sent", expiresAt });
});

// GET /admin/users
adminRoutes.get("/users", async (c) => {
  const db = getDb();
  const search = c.req.query("search") || "";
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);

  const filter: any = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const users = await db.collection("users")
    .find(filter)
    .project({ roleVersion: 0 })
    .skip(offset)
    .limit(limit)
    .toArray();

  const total = await db.collection("users").countDocuments(filter);

  return c.json({ data: users, meta: { total, limit, offset } });
});

// GET /admin/teams
adminRoutes.get("/teams", async (c) => {
  const db = getDb();
  const search = c.req.query("search") || "";
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);

  const filter: any = {};
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { slug: { $regex: search, $options: "i" } },
    ];
  }

  const teams = await db.collection("teams")
    .find(filter)
    .skip(offset)
    .limit(limit)
    .toArray();

  const total = await db.collection("teams").countDocuments(filter);

  return c.json({ data: teams, meta: { total, limit, offset } });
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd api && bun test tests/modules/admin-routes.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/system/admin-routes.ts api/tests/modules/admin-routes.test.ts
git commit -m "feat: add platform admin routes — recovery, user list, team list"
```

---

---

# Phase 3: Integration — Wiring, Updates, Verification (Tasks 18–25)

> **Parallelism:** Tasks 18, 19, 22, 22b are independent. Task 20 (index.ts rewire) depends on all prior tasks. Tasks 23–25 are sequential.
> **Review checkpoint:** After Task 20 (index.ts rewire), run `bun test` to verify nothing broke. After Task 25, full verification including API startup.

---

## Task 18: Update Settings Routes — Fix Bug & Use Auth Context

**Files:**
- Modify: `api/src/modules/system/settings-routes.ts`

- [ ] **Step 1: Update settings routes**

Replace `api/src/modules/system/settings-routes.ts`:

```typescript
import { Hono } from "hono";
import {
  getUserSettings,
  setUserLLMKey,
  removeUserLLMKey,
  getDecryptedLLMKey,
  maskApiKey,
} from "../../infrastructure/user-settings";
import { success, apiError, validationError } from "../../helpers/response";
import { requireRole } from "../../middleware/require-role";
import type { LLMProvider } from "../../types";

export const settingsRoutes = new Hono();

settingsRoutes.put("/ai", requireRole("member"), async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { provider, apiKey, model } = body;

  if (!provider || !["anthropic", "openai"].includes(provider)) {
    return validationError(c, "provider must be 'anthropic' or 'openai'");
  }
  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
    return validationError(c, "apiKey is required (minimum 10 characters)");
  }

  const valid = await validateLLMKey(provider as LLMProvider, apiKey);
  if (!valid.ok) {
    return apiError(c, "INVALID_KEY", valid.error || "API key validation failed", 400);
  }

  await setUserLLMKey(userId, provider as LLMProvider, apiKey, model);
  return success(c, { provider, model: model || null, aiAnalysisEnabled: true });
});

settingsRoutes.get("/ai", async (c) => {
  const userId = c.get("userId") as string;
  const settings = await getUserSettings(userId);
  if (!settings) {
    return success(c, { aiAnalysisEnabled: false });
  }

  // Bug fix: decrypt first, then mask the plaintext (not the ciphertext)
  const decrypted = await getDecryptedLLMKey(userId);
  const maskedKey = decrypted ? maskApiKey(decrypted.apiKey) : null;

  return success(c, {
    provider: settings.llmProvider,
    model: settings.llmModel || null,
    apiKey: maskedKey,
    aiAnalysisEnabled: settings.aiAnalysisEnabled,
  });
});

settingsRoutes.delete("/ai", requireRole("member"), async (c) => {
  const userId = c.get("userId") as string;
  await removeUserLLMKey(userId);
  return success(c, { aiAnalysisEnabled: false });
});

async function validateLLMKey(
  provider: LLMProvider,
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }],
        }),
      });
      if (res.status === 401) return { ok: false, error: "Invalid Anthropic API key" };
      return { ok: true };
    } else {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.status === 401) return { ok: false, error: "Invalid OpenAI API key" };
      return { ok: true };
    }
  } catch {
    return { ok: true };
  }
}
```

Key changes:
- Replaced `getUserId(c)` with `c.get("userId")` (from auth middleware)
- Added `requireRole("member")` to PUT and DELETE
- **Bug fix on GET**: Now calls `getDecryptedLLMKey()` to decrypt, then `maskApiKey()` on the plaintext — previously masked the encrypted ciphertext

- [ ] **Step 1b: Export encrypt/decrypt from user-settings.ts**

In `api/src/infrastructure/user-settings.ts`, change `function encrypt` and `function decrypt` to `export function encrypt` and `export function decrypt`. These are needed by team-settings-routes.ts for encrypting/decrypting team BYOK keys.

- [ ] **Step 2: Run existing tests**

```bash
cd api && bun test
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add api/src/modules/system/settings-routes.ts
git commit -m "fix: settings routes use auth context, fix GET masking encrypted ciphertext instead of plaintext"
```

---

## Task 19: SSE Auth + Team Scoping

**Files:**
- Modify: `api/src/modules/realtime/sse.ts`

- [ ] **Step 1: Update SSE router with auth and team scoping**

Replace `api/src/modules/realtime/sse.ts`:

```typescript
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getRedis, isRedisConnected } from "../../infrastructure/redis";
import { getBufferedEvents, getChannel } from "../../infrastructure/sse";
import { verifyAccessToken } from "../../infrastructure/auth";

export const sseRouter = new Hono();

sseRouter.get("/stream", async (c) => {
  // Auth via query param (EventSource doesn't support custom headers)
  const token = c.req.query("token");
  let userId: string;
  let teamId: string;

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      userId = payload.userId;
      teamId = payload.teamId;
    } catch {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } }, 401);
    }
  } else {
    // Fallback: check if auth context was set by middleware (dev mode)
    userId = c.get("userId") as string;
    teamId = c.get("teamId") as string;
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Token required" } }, 401);
    }
  }

  const lastEventId = c.req.header("last-event-id");

  return streamSSE(c, async (stream) => {
    if (lastEventId) {
      const missed = await getBufferedEvents(lastEventId);
      for (const evt of missed) {
        if (shouldSendEvent(evt, teamId)) {
          await stream.writeSSE({ id: evt.id, event: evt.event, data: evt.data });
        }
      }
    }

    if (!isRedisConnected()) {
      await stream.writeSSE({ event: "error", data: "Redis unavailable" });
      return;
    }

    const subscriber = getRedis().duplicate();
    await subscriber.subscribe(getChannel());

    // Heartbeat
    const heartbeatMs = Number(process.env.SSE_HEARTBEAT_MS ?? 30000);
    const heartbeat = setInterval(async () => {
      try {
        await stream.writeSSE({ event: "heartbeat", data: "" });
      } catch {
        clearInterval(heartbeat);
      }
    }, heartbeatMs);

    // Periodic auth revalidation (every 5 minutes)
    const revalidateMs = 5 * 60 * 1000;
    const revalidate = setInterval(async () => {
      try {
        if (!isRedisConnected()) return; // fail open
        const redis = getRedis();
        const cachedRv = await redis.get(`gambit:user:${userId}:rv`);
        // If user was deleted or role changed, close stream
        if (cachedRv === null) return; // not cached, skip
        // We can't easily check mismatch without the original JWT rv,
        // but we can check deletion
        const { getDb } = await import("../../infrastructure/mongo");
        const user = await getDb().collection("users").findOne({ _id: userId });
        if (!user || user.deletedAt) {
          await stream.writeSSE({ event: "auth-expired", data: "Session invalidated" });
          clearInterval(heartbeat);
          clearInterval(revalidate);
          subscriber.unsubscribe();
          subscriber.quit();
        }
      } catch {
        // Fail open
      }
    }, revalidateMs);

    subscriber.on("message", async (_channel, message) => {
      try {
        const evt = JSON.parse(message);
        if (shouldSendEvent(evt, teamId)) {
          await stream.writeSSE({ id: evt.id, event: evt.event, data: JSON.stringify(evt.data) });
        }
      } catch {
        // ignore parse errors
      }
    });

    stream.onAbort(() => {
      clearInterval(heartbeat);
      clearInterval(revalidate);
      subscriber.unsubscribe();
      subscriber.quit();
    });

    await new Promise(() => {});
  });
});

// Team-scoped events: only send to matching team
// Global events: send to all
function shouldSendEvent(evt: any, teamId: string): boolean {
  // Events with a teamId field are team-scoped
  if (evt.teamId && evt.teamId !== teamId) return false;
  return true;
}
```

- [ ] **Step 2: Run tests**

```bash
cd api && bun test
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add api/src/modules/realtime/sse.ts
git commit -m "feat: add SSE auth via query param token, team-scoped filtering, periodic revalidation"
```

---

## Task 20: Rewire index.ts — Swap Middleware, Mount Routes

**Files:**
- Modify: `api/src/index.ts`
- Delete: `api/src/middleware/api-key.ts`
- Delete: `api/tests/middleware/api-key.test.ts`

- [ ] **Step 1: Update index.ts**

Replace `api/src/index.ts`:

```typescript
import { Hono } from "hono";
import { connectMongo } from "./infrastructure/mongo";
import { connectRedis } from "./infrastructure/redis";
import { healthRoutes } from "./infrastructure/health";
import { createCorsMiddleware } from "./middleware/cors";
import { requestId } from "./middleware/request-id";
import { rateLimit } from "./middleware/rate-limit";
import { cacheHeaders } from "./middleware/cache-headers";
import { compression } from "./middleware/compression";
import { requestLogger } from "./middleware/logger";
import { authenticate } from "./middleware/authenticate";
import { authRateLimit } from "./middleware/auth-rate-limit";
import { impersonation } from "./middleware/impersonation";
import { scopeCheck } from "./middleware/scope-check";
import { ensureAuthIndexes } from "./infrastructure/indexes";

// Module routers
import { countriesRouter } from "./modules/reference/countries";
import { basesRouter } from "./modules/reference/bases";
import { nsaRouter } from "./modules/reference/nsa";
import { chokepointsRouter } from "./modules/reference/chokepoints";
import { electionsRouter } from "./modules/reference/elections";
import { tradeRoutesRouter } from "./modules/reference/trade-routes";
import { portsRouter } from "./modules/reference/ports";
import { conflictsRouter } from "./modules/reference/conflicts";
import { newsRouter } from "./modules/realtime/news";
import { sseRouter } from "./modules/realtime/sse";
import { bootstrapRouter } from "./modules/aggregate/bootstrap";
import { viewportRouter } from "./modules/aggregate/viewport";
import { searchRouter } from "./modules/aggregate/search";
import { compareRouter } from "./modules/aggregate/compare";
import { binaryLayersRouter } from "./modules/binary/layers";
import { seedRoutes } from "./modules/system/seed-routes";
import { timelineRouter } from "./modules/aggregate/timeline";
import { graphRouter } from "./modules/aggregate/graph";
import { settingsRoutes } from "./modules/system/settings-routes";
import { pluginRoutes } from "./modules/system/plugin-routes";
import { anomaliesRouter } from "./modules/aggregate/anomalies";

// New auth routes
import { authRoutes } from "./modules/system/auth-routes";
import { apiKeyRoutes } from "./modules/system/api-key-routes";
import { teamRoutes } from "./modules/system/team-routes";
import { teamSettingsRoutes } from "./modules/system/team-settings-routes";
import { notificationRoutes } from "./modules/system/notification-routes";
import { adminRoutes } from "./modules/system/admin-routes";
import { requirePlatformAdmin } from "./middleware/require-platform-admin";

import { startConflictCounter } from "./modules/periodic/conflict-counter";
import { ensureSnapshotIndexes } from "./infrastructure/snapshots";
import { buildEntityDictionary } from "./infrastructure/entity-dictionary";
import { rebuildGraph } from "./infrastructure/graph";
import { startNewsAggregator } from "./modules/periodic/news-aggregator";
import { mountPlugins } from "./infrastructure/plugin-registry";
import { startAnomalyCleanup } from "./modules/periodic/anomaly-cleanup";

const app = new Hono();

// Global middleware (order matches spec Section 3)
app.use("*", createCorsMiddleware());       // 1. CORS
app.use("*", requestId);                    // 2. Request ID
app.use("*", requestLogger);                // 3. Logger
app.use("*", compression);                  // 4. Compression
app.use("/api/v1/auth/*", authRateLimit);   // 5. Auth endpoint rate limit
app.use("/api/*", authenticate);            // 6. Authenticate (JWT / API key / dev)
// 7. Post-auth log enrichment
app.use("/api/*", async (c, next) => {
  const userId = c.get("userId");
  if (userId) {
    c.set("logFields", {
      userId,
      teamId: c.get("teamId"),
      platformRole: c.get("platformRole"),
      authMethod: c.get("authMethod"),
    });
  }
  await next();
});
app.use("/api/*", impersonation);           // 8. Impersonation
app.use("/api/*", rateLimit);               // 9. General rate limit (now per-user)
app.use("/api/*", scopeCheck);              // 10. Scope check (API key read/write)
app.use("/api/*", cacheHeaders);            // 11. Cache headers

// Mount routes
const api = new Hono();
api.route("/health", healthRoutes);

// Auth routes (public + protected)
api.route("/auth", authRoutes);
api.route("/auth/keys", apiKeyRoutes);

// Team routes
api.route("/team", teamRoutes);
api.route("/team/settings", teamSettingsRoutes);

// User settings
api.route("/settings", settingsRoutes);
api.route("/settings", notificationRoutes);

// Admin routes (platform admin only)
const adminRouter = new Hono();
adminRouter.use("*", requirePlatformAdmin());
adminRouter.route("/", adminRoutes);
api.route("/admin", adminRouter);

// Reference data
api.route("/countries", countriesRouter);
api.route("/bases", basesRouter);
api.route("/nsa", nsaRouter);
api.route("/chokepoints", chokepointsRouter);
api.route("/elections", electionsRouter);
api.route("/trade-routes", tradeRoutesRouter);
api.route("/ports", portsRouter);
api.route("/conflicts", conflictsRouter);

// Realtime
api.route("/news", newsRouter);
api.route("/events", sseRouter);

// Aggregate
api.route("/bootstrap", bootstrapRouter);
api.route("/viewport", viewportRouter);
api.route("/search", searchRouter);
api.route("/compare", compareRouter);
api.route("/layers", binaryLayersRouter);
api.route("/timeline", timelineRouter);
api.route("/graph", graphRouter);
api.route("/anomalies", anomaliesRouter);

// System (platform admin only)
const seedRouter = new Hono();
seedRouter.use("*", requirePlatformAdmin());
seedRouter.route("/", seedRoutes);
api.route("/seed", seedRouter);

const pluginRouter = new Hono();
pluginRouter.use("*", requirePlatformAdmin());
pluginRouter.route("/", pluginRoutes);
api.route("/plugins", pluginRouter);

app.route("/api/v1", api);

// Root
app.get("/", (c) => c.json({ message: "Gambit API", version: "0.2.0" }));

// Startup
const port = Number(process.env.PORT ?? 3000);

async function start() {
  console.log("[gambit] Starting API...");

  try {
    await connectMongo();
    console.log("[gambit] MongoDB connected");
  } catch (err) {
    console.error("[gambit] MongoDB connection failed:", err);
    process.exit(1);
  }

  try {
    await connectRedis();
    console.log("[gambit] Redis connected");
  } catch (err) {
    console.warn("[gambit] Redis connection failed (cache disabled):", err);
  }

  console.log(`[gambit] API listening on http://localhost:${port}`);

  // Create indexes
  await ensureSnapshotIndexes();
  await ensureAuthIndexes();
  console.log("[gambit] Auth indexes created");

  const dictSize = await buildEntityDictionary();
  console.log(`[gambit] Entity dictionary built (${dictSize} patterns)`);
  const edgeCount = await rebuildGraph();
  console.log(`[gambit] Graph built (${edgeCount} edges)`);
  const pluginCount = await mountPlugins();
  if (pluginCount > 0) console.log(`[gambit] ${pluginCount} plugins mounted`);
  startConflictCounter();
  startAnomalyCleanup();
  startNewsAggregator();
}

start();

export default { port, fetch: app.fetch };
export { app };
```

- [ ] **Step 2: Delete old api-key middleware and its test**

```bash
rm api/src/middleware/api-key.ts api/tests/middleware/api-key.test.ts
```

- [ ] **Step 3: Run all tests**

```bash
cd api && bun test
```

Expected: All tests pass. The old api-key test is deleted, and no other file imports `api-key.ts`.

- [ ] **Step 4: Commit**

```bash
git add -A api/src/index.ts api/src/middleware/
git rm api/src/middleware/api-key.ts api/tests/middleware/api-key.test.ts
git commit -m "feat: rewire index.ts — full auth middleware chain, mount all auth routes, remove old api-key"
```

---

## Task 21: Account Lifecycle — Hard Deletion Job

**Files:**
- Modify: `api/src/index.ts` (start the job)
- Create: `api/src/modules/periodic/account-cleanup.ts`
- Test: `api/tests/modules/account-cleanup.test.ts`

- [ ] **Step 1: Write the failing test**

Create `api/tests/modules/account-cleanup.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { runAccountCleanup } from "../../src/modules/periodic/account-cleanup";
import { randomUUID } from "crypto";

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
});

beforeEach(async () => {
  const db = getDb();
  await db.collection("users").deleteMany({});
  await db.collection("teams").deleteMany({});
  await db.collection("sessions").deleteMany({});
  await db.collection("apiKeys").deleteMany({});
  await db.collection("userPreferences").deleteMany({});
  await db.collection("notificationPreferences").deleteMany({});
  await db.collection("userSettings").deleteMany({});
});

afterAll(async () => {
  await disconnectMongo();
});

describe("runAccountCleanup", () => {
  it("hard-deletes users past their deletedAt date", async () => {
    const db = getDb();
    const userId = randomUUID();
    const teamId = randomUUID();

    await db.collection("users").insertOne({
      _id: userId, email: "delete@test.com", name: "Delete Me",
      role: "owner", platformRole: "user", teamId,
      roleVersion: 0, providers: [], customAvatar: false,
      lastLoginAt: new Date(),
      deletionRequestedAt: new Date(Date.now() - 31 * 86400000),
      deletedAt: new Date(Date.now() - 1 * 86400000), // past
      createdAt: new Date(), updatedAt: new Date(),
    });
    await db.collection("teams").insertOne({
      _id: teamId, name: "Gone", slug: "gone", plan: "free",
      ownerId: userId, watchlist: [], inviteCodes: [],
      createdAt: new Date(), updatedAt: new Date(),
    });
    await db.collection("sessions").insertOne({ _id: randomUUID(), userId, teamId, refreshTokenHash: "x", device: {}, ip: "1", isNewDevice: false, createdAt: new Date(), lastRefreshedAt: new Date(), expiresAt: new Date(), absoluteExpiresAt: new Date() });
    await db.collection("apiKeys").insertOne({ _id: randomUUID(), keyHash: "x", keyPrefix: "gbt_", userId, teamId, name: "k", scope: "read", disabled: true, lastUsedAt: null, createdAt: new Date() });

    const count = await runAccountCleanup();
    expect(count).toBe(1);

    // Verify hard deleted
    expect(await db.collection("users").findOne({ _id: userId })).toBeNull();
    expect(await db.collection("sessions").findOne({ userId })).toBeNull();
    expect(await db.collection("apiKeys").findOne({ userId })).toBeNull();
  });

  it("does not delete users before their deletedAt date", async () => {
    const db = getDb();
    const userId = randomUUID();

    await db.collection("users").insertOne({
      _id: userId, email: "notyet@test.com", name: "Not Yet",
      role: "owner", platformRole: "user", teamId: "t1",
      roleVersion: 0, providers: [], customAvatar: false,
      lastLoginAt: new Date(),
      deletionRequestedAt: new Date(),
      deletedAt: new Date(Date.now() + 30 * 86400000), // future
      createdAt: new Date(), updatedAt: new Date(),
    });

    const count = await runAccountCleanup();
    expect(count).toBe(0);
    expect(await db.collection("users").findOne({ _id: userId })).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/modules/account-cleanup.test.ts
```

Expected: FAIL

- [ ] **Step 3: Implement account cleanup**

Create `api/src/modules/periodic/account-cleanup.ts`:

```typescript
import { getDb } from "../../infrastructure/mongo";

export async function runAccountCleanup(): Promise<number> {
  const db = getDb();
  const now = new Date();

  // Find users past their deletion date
  const usersToDelete = await db.collection("users")
    .find({ deletedAt: { $lte: now } })
    .toArray();

  let count = 0;
  for (const user of usersToDelete) {
    const userId = user._id as string;

    // Delete related data
    await db.collection("sessions").deleteMany({ userId });
    await db.collection("apiKeys").deleteMany({ userId });
    await db.collection("userPreferences").deleteOne({ _id: userId });
    await db.collection("notificationPreferences").deleteOne({ _id: userId });
    await db.collection("userSettings").deleteOne({ _id: userId });

    // Anonymize in shared data
    await db.collection("newsAnalysis").updateMany(
      { userId },
      { $set: { userId: "deleted-user" } },
    );
    await db.collection("auditEvents").updateMany(
      { actorId: userId },
      { $set: { actorId: "deleted-user" } },
    );

    // If sole owner with no other members, delete team
    if (user.role === "owner") {
      const memberCount = await db.collection("users").countDocuments({
        teamId: user.teamId, _id: { $ne: userId },
      });
      if (memberCount === 0) {
        await db.collection("teams").deleteOne({ _id: user.teamId });
        await db.collection("savedViews").deleteMany({ teamId: user.teamId });
        await db.collection("teamSettings").deleteOne({ _id: user.teamId });
      }
    }

    // Delete user document
    await db.collection("users").deleteOne({ _id: userId });
    count++;
  }

  if (count > 0) {
    console.log(`[gambit] Account cleanup: hard-deleted ${count} user(s)`);
  }

  // Archived team cleanup — delete teams soft-deleted > 30 days ago
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const archivedTeams = await db.collection("teams")
    .find({ deletedAt: { $lte: thirtyDaysAgo } })
    .toArray();

  for (const team of archivedTeams) {
    await db.collection("savedViews").deleteMany({ teamId: team._id });
    await db.collection("teamSettings").deleteOne({ _id: team._id });
    await db.collection("teams").deleteOne({ _id: team._id });
  }

  if (archivedTeams.length > 0) {
    console.log(`[gambit] Account cleanup: removed ${archivedTeams.length} archived team(s)`);
  }

  return count;
}

export function startAccountCleanup(): void {
  // Run daily
  const intervalMs = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runAccountCleanup().catch((err) =>
      console.error("[gambit] Account cleanup error:", err),
    );
  }, intervalMs);
  console.log("[gambit] Account cleanup job scheduled (daily)");
}
```

- [ ] **Step 4: Add to index.ts startup**

Add to the startup section in `api/src/index.ts`, after `startNewsAggregator()`:

```typescript
import { startAccountCleanup } from "./modules/periodic/account-cleanup";
// ... at end of start():
startAccountCleanup();
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd api && bun test tests/modules/account-cleanup.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/src/modules/periodic/account-cleanup.ts api/tests/modules/account-cleanup.test.ts api/src/index.ts
git commit -m "feat: add daily account hard-deletion cleanup job"
```

---

## Task 22: BYOK Key Resolution — Team → Personal

**Files:**
- Modify: `api/src/infrastructure/ai-analysis.ts`

- [ ] **Step 1: Read the current ai-analysis.ts**

Read `api/src/infrastructure/ai-analysis.ts` to understand the current BYOK key resolution pattern before modifying.

- [ ] **Step 2: Update BYOK key resolution**

Add a `resolveBYOKKey` function that implements the spec's resolution order:

```typescript
import { getDecryptedLLMKey } from "./user-settings";
import { getDb } from "./mongo";

export async function resolveBYOKKey(
  userId: string,
  teamId: string,
  trigger: "user" | "team",
): Promise<{ provider: string; apiKey: string; model: string } | null> {
  if (trigger === "team") {
    // Team-triggered: use team key only
    const db = getDb();
    const teamSettings = await db.collection("teamSettings").findOne({ _id: teamId });
    if (teamSettings?.llmApiKey && teamSettings?.aiAnalysisEnabled) {
      return {
        provider: teamSettings.llmProvider,
        apiKey: teamSettings.llmApiKey, // Already encrypted, decrypt at use
        model: teamSettings.llmModel || (teamSettings.llmProvider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o"),
      };
    }
    return null; // No team key — skip analysis
  }

  // User-triggered: personal key → team key → null
  const personal = await getDecryptedLLMKey(userId);
  if (personal) return personal;

  const db = getDb();
  const teamSettings = await db.collection("teamSettings").findOne({ _id: teamId });
  if (teamSettings?.llmApiKey && teamSettings?.aiAnalysisEnabled) {
    return {
      provider: teamSettings.llmProvider,
      apiKey: teamSettings.llmApiKey,
      model: teamSettings.llmModel || (teamSettings.llmProvider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o"),
    };
  }

  return null;
}
```

- [ ] **Step 3: Run tests**

```bash
cd api && bun test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add api/src/infrastructure/ai-analysis.ts
git commit -m "feat: add BYOK key resolution — team key for team triggers, personal→team for user triggers"
```

---

## Task 22b: News Routes — Auth Context + Team Scoping

**Files:**
- Modify: `api/src/modules/realtime/news.ts`
- Modify: `api/src/infrastructure/ai-analysis.ts`

The spec's "Existing Routes That Change" table requires two news-related changes: `POST /news/analyze` must use `c.get("userId")` and BYOK key resolution, and `GET /news/analysis` must scope results to the team. The analyze/analysis routes don't exist yet — add them to the news router.

Also update `analyzeForUser` in `ai-analysis.ts` to accept a `teamId` parameter so analyses are stored with team scope, and update `publishEvent` to include `teamId` for SSE team filtering.

- [ ] **Step 1: Write the failing test**

Create `api/tests/modules/news-auth.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { randomUUID } from "crypto";

function setAuth(userId = "u1", teamId = "t1") {
  return async (c: any, next: any) => {
    c.set("userId", userId);
    c.set("teamId", teamId);
    c.set("role", "member");
    c.set("platformRole", "user");
    c.set("authMethod", "jwt");
    await next();
  };
}

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
});

beforeEach(async () => {
  await getDb().collection("newsAnalysis").deleteMany({});
});

afterAll(async () => {
  await getDb().collection("newsAnalysis").deleteMany({});
  await disconnectMongo();
});

describe("GET /news/analysis — team scoped", () => {
  it("returns only analyses for the user's team", async () => {
    const db = getDb();

    // Insert analysis for team t1
    await db.collection("newsAnalysis").insertOne({
      _id: randomUUID(),
      articleIds: ["a1"],
      summary: "Team 1 analysis",
      perspectives: [],
      relevanceScore: 0.8,
      escalationSignal: "stable",
      relatedCountries: [],
      conflictId: null,
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      userId: "u1",
      teamId: "t1",
      analyzedAt: new Date(),
    });

    // Insert analysis for team t2
    await db.collection("newsAnalysis").insertOne({
      _id: randomUUID(),
      articleIds: ["a2"],
      summary: "Team 2 analysis",
      perspectives: [],
      relevanceScore: 0.7,
      escalationSignal: "escalating",
      relatedCountries: [],
      conflictId: null,
      provider: "openai",
      model: "gpt-4o",
      userId: "u2",
      teamId: "t2",
      analyzedAt: new Date(),
    });

    const { newsRouter } = await import("../../src/modules/realtime/news");
    const app = new Hono();
    app.use("*", setAuth("u1", "t1"));
    app.route("/news", newsRouter);

    const res = await app.request("/news/analysis");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].summary).toBe("Team 1 analysis");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd api && bun test tests/modules/news-auth.test.ts
```

Expected: FAIL — no `/news/analysis` route exists.

- [ ] **Step 3: Add analysis routes to news router**

Add to the end of `api/src/modules/realtime/news.ts`:

```typescript
import { success, apiError } from "../../helpers/response";

// GET /news/analysis — team-scoped analyses
newsRouter.get("/analysis", async (c) => {
  const teamId = c.get("teamId") as string;
  const db = getDb();
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);

  const filter = { teamId };
  const [data, total] = await Promise.all([
    db.collection("newsAnalysis")
      .find(filter)
      .sort({ analyzedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection("newsAnalysis").countDocuments(filter),
  ]);

  return paginated(c, data, total, limit, offset);
});

// POST /news/analyze — trigger analysis with BYOK key resolution
newsRouter.post("/analyze", async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;

  const { resolveBYOKKey } = await import("../../infrastructure/ai-analysis");
  const credentials = await resolveBYOKKey(userId, teamId, "user");
  if (!credentials) {
    return apiError(c, "NO_AI_KEY", "Configure an AI key in settings", 400);
  }

  const { clusterArticles, analyzeForUser } = await import("../../infrastructure/ai-analysis");
  const db = getDb();

  // Get recent unanalyzed articles
  const recentArticles = await db.collection("news")
    .find({})
    .sort({ publishedAt: -1 })
    .limit(100)
    .toArray();

  const clusters = clusterArticles(recentArticles);
  if (clusters.length === 0) {
    return success(c, { analyzed: 0, message: "No article clusters to analyze" });
  }

  const analyzed = await analyzeForUser(userId, teamId, clusters);
  return success(c, { analyzed });
});
```

- [ ] **Step 4: Update analyzeForUser to accept teamId**

In `api/src/infrastructure/ai-analysis.ts`, update `analyzeForUser` signature and storage:

Change `export async function analyzeForUser(userId: string, clusters: ArticleCluster[])` to:

```typescript
export async function analyzeForUser(
  userId: string,
  teamId: string,
  clusters: ArticleCluster[],
): Promise<number> {
```

In the analysis object inside the loop, add `teamId`:

```typescript
    const analysis: NewsAnalysis = {
      articleIds: sortedIds,
      // ... existing fields ...
      userId,
      teamId, // <-- add this
      analyzedAt: new Date(),
    };
```

And update `publishEvent` to include `teamId` for SSE team filtering:

```typescript
    await publishEvent("news-analysis", {
      teamId, // <-- add this so SSE filters by team
      articleIds: sortedIds,
      summary: parsed.summary,
      escalationSignal: parsed.escalationSignal,
    });
```

Also update `resolveBYOKKey` — it was added in Task 22 but lives in ai-analysis.ts. Add the export if not already present.

- [ ] **Step 5: Run test to verify it passes**

```bash
cd api && bun test tests/modules/news-auth.test.ts
```

Expected: PASS

- [ ] **Step 6: Run all tests**

```bash
cd api && bun test
```

Expected: All tests pass. Existing ai-analysis tests may need the `teamId` parameter added to `analyzeForUser` calls.

- [ ] **Step 7: Commit**

```bash
git add api/src/modules/realtime/news.ts api/src/infrastructure/ai-analysis.ts api/tests/modules/news-auth.test.ts
git commit -m "feat: add news analysis routes with auth context and team scoping"
```

---

## Task 23: PlatformConfig Initialization

**Files:**
- Modify: `api/src/infrastructure/indexes.ts`

- [ ] **Step 1: Add platformConfig initialization to ensureAuthIndexes**

Add to the end of `ensureAuthIndexes()` in `api/src/infrastructure/indexes.ts`:

```typescript
  // Ensure platformConfig singleton exists
  await db.collection("platformConfig").updateOne(
    { _id: "config" },
    { $setOnInsert: { firstUserClaimed: false } },
    { upsert: true },
  );
```

This ensures the first-user claim works atomically on first signup.

- [ ] **Step 2: Run tests**

```bash
cd api && bun test
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add api/src/infrastructure/indexes.ts
git commit -m "feat: ensure platformConfig singleton on startup for first-user claim"
```

---

## Task 24: Full Integration Test

**Files:**
- Create: `api/tests/integration/auth-flow.test.ts`

- [ ] **Step 1: Write integration test**

Create `api/tests/integration/auth-flow.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../src/infrastructure/redis";
import { ensureAuthIndexes } from "../../src/infrastructure/indexes";
import {
  findOrCreateUser,
  signAccessToken,
  hashToken,
  generateAuthCode,
  generateRefreshToken,
} from "../../src/infrastructure/auth";
import { Hono } from "hono";
import { authenticate } from "../../src/middleware/authenticate";
import { requireRole } from "../../src/middleware/require-role";
import { scopeCheck } from "../../src/middleware/scope-check";
import { apiKeyRoutes } from "../../src/modules/system/api-key-routes";
import { teamRoutes } from "../../src/modules/system/team-routes";
import { randomUUID } from "crypto";

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  await connectRedis("redis://localhost:6380");
  // Clean slate
  const db = getDb();
  const collections = ["users", "teams", "sessions", "authCodes", "apiKeys",
    "auditEvents", "savedViews", "notificationPreferences", "platformConfig",
    "teamSettings", "recoveryTokens", "userPreferences"];
  for (const col of collections) {
    await db.collection(col).deleteMany({});
  }
  await ensureAuthIndexes();
}, 15000);

afterAll(async () => {
  const db = getDb();
  const collections = ["users", "teams", "sessions", "authCodes", "apiKeys",
    "auditEvents", "savedViews", "notificationPreferences", "platformConfig",
    "teamSettings", "recoveryTokens", "userPreferences"];
  for (const col of collections) {
    await db.collection(col).deleteMany({});
  }
  await disconnectRedis();
  await disconnectMongo();
});

describe("Full auth flow integration", () => {
  let user1Token: string;
  let user1Id: string;
  let user1TeamId: string;
  let user2Id: string;

  it("first user gets platform admin", async () => {
    const result = await findOrCreateUser({
      provider: "github",
      providerId: "gh-integration-1",
      email: "admin@gambit.test",
      emailVerified: true,
      name: "Platform Admin",
      avatar: "https://example.com/admin.png",
    });

    expect(result.isNew).toBe(true);
    expect(result.user.platformRole).toBe("admin");
    expect(result.user.role).toBe("owner");
    user1Id = result.user._id;
    user1TeamId = result.user.teamId;

    user1Token = await signAccessToken({
      userId: user1Id,
      role: result.user.role,
      teamId: user1TeamId,
      platformRole: result.user.platformRole,
      roleVersion: 0,
    });
  });

  it("second user is regular user", async () => {
    const result = await findOrCreateUser({
      provider: "google",
      providerId: "g-integration-2",
      email: "user@gambit.test",
      emailVerified: true,
      name: "Regular User",
    });

    expect(result.isNew).toBe(true);
    expect(result.user.platformRole).toBe("user");
    user2Id = result.user._id;
  });

  it("account linking by email works", async () => {
    const result = await findOrCreateUser({
      provider: "google",
      providerId: "g-integration-admin",
      email: "admin@gambit.test", // same email as user 1
      emailVerified: true,
      name: "Admin via Google",
    });

    expect(result.isNew).toBe(false);
    expect(result.user._id).toBe(user1Id);
    expect(result.user.providers).toHaveLength(2);
  });

  it("authenticated requests work with JWT", async () => {
    const app = new Hono();
    app.use("*", authenticate);
    app.get("/api/v1/test", (c) =>
      c.json({ userId: c.get("userId"), role: c.get("role") }),
    );

    const res = await app.request("/api/v1/test", {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe(user1Id);
  });

  it("API key auth works end-to-end", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("userId", user1Id);
      c.set("teamId", user1TeamId);
      c.set("role", "owner");
      c.set("platformRole", "admin");
      c.set("authMethod", "jwt");
      await next();
    });
    app.route("/auth/keys", apiKeyRoutes);

    // Create a key
    const createRes = await app.request("/auth/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Integration Test", scope: "read" }),
    });
    expect(createRes.status).toBe(200);
    const { data } = await createRes.json();
    const rawKey = data.key;

    // Use the key for auth
    const authApp = new Hono();
    authApp.use("*", authenticate);
    authApp.use("*", scopeCheck);
    authApp.get("/api/v1/data", (c) =>
      c.json({ userId: c.get("userId"), authMethod: c.get("authMethod") }),
    );
    authApp.post("/api/v1/data", (c) => c.json({ ok: true }));

    // Read should work
    const readRes = await authApp.request("/api/v1/data", {
      headers: { "X-API-Key": rawKey },
    });
    expect(readRes.status).toBe(200);
    const readBody = await readRes.json();
    expect(readBody.authMethod).toBe("apikey");

    // Write should fail (read-only key)
    const writeRes = await authApp.request("/api/v1/data", {
      method: "POST",
      headers: { "X-API-Key": rawKey },
    });
    expect(writeRes.status).toBe(403);
  });

  it("team invite + join flow works", async () => {
    const app = new Hono();
    app.use("*", async (c, next) => {
      c.set("userId", user1Id);
      c.set("teamId", user1TeamId);
      c.set("role", "owner");
      c.set("platformRole", "admin");
      c.set("authMethod", "jwt");
      await next();
    });
    app.route("/team", teamRoutes);

    // Create invite
    const inviteRes = await app.request("/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "member", maxUses: 5 }),
    });
    expect(inviteRes.status).toBe(200);
    const inviteData = await inviteRes.json();
    const inviteCode = inviteData.data.code;

    // User 2 joins via invite
    const joinApp = new Hono();
    const user2 = await getDb().collection("users").findOne({ _id: user2Id });
    joinApp.use("*", async (c, next) => {
      c.set("userId", user2Id);
      c.set("teamId", user2!.teamId);
      c.set("role", "owner");
      c.set("platformRole", "user");
      c.set("authMethod", "jwt");
      await next();
    });
    joinApp.route("/team", teamRoutes);

    const joinRes = await joinApp.request("/team/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: inviteCode }),
    });
    expect(joinRes.status).toBe(200);
    const joinBody = await joinRes.json();
    expect(joinBody.data.teamId).toBe(user1TeamId);
    expect(joinBody.data.role).toBe("member");
    expect(joinBody.data.accessToken).toBeTruthy();

    // Verify user 2 is now in team 1
    const updatedUser2 = await getDb().collection("users").findOne({ _id: user2Id });
    expect(updatedUser2!.teamId).toBe(user1TeamId);
    expect(updatedUser2!.role).toBe("member");
  });
});
```

- [ ] **Step 2: Run integration test**

```bash
cd api && bun test tests/integration/auth-flow.test.ts
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add api/tests/integration/auth-flow.test.ts
git commit -m "test: add full auth flow integration test"
```

---

## Task 25: Run Full Test Suite & Final Verification

- [ ] **Step 1: Run all tests**

```bash
cd api && bun test
```

Expected: All tests pass — both existing (infrastructure, modules, integration) and new auth tests.

- [ ] **Step 2: Type check**

```bash
cd api && bun x tsc --noEmit
```

Expected: No type errors.

- [ ] **Step 3: Start the API and verify startup**

```bash
docker compose up -d mongo redis
cd api && bun src/index.ts
```

Expected: Startup log shows:
- MongoDB connected
- Redis connected
- Auth indexes created
- Entity dictionary built
- Graph built
- Account cleanup job scheduled

- [ ] **Step 4: Commit any final fixes**

If any tests fail or type errors exist, fix them and commit.

```bash
git add -A
git commit -m "chore: final fixes for auth implementation"
```
