// api/src/modules/system/auth-routes.ts
// Handles: OAuth redirects (GitHub + Google via Arctic), callbacks, auth code exchange,
// token refresh, logout, /me, sessions, provider linking/unlinking, and providers list.

import { Hono } from "hono";
import { GitHub, Google } from "arctic";
import { randomBytes, randomUUID } from "crypto";
import {
  signAccessToken,
  verifyAccessToken,
  hashToken,
  generateRefreshToken,
  generateAuthCode,
  parseDevice,
  logAudit,
} from "../../infrastructure/auth";
import { getDb } from "../../infrastructure/mongo";
import { getEmailService } from "../../infrastructure/email";
import { success, apiError } from "../../helpers/response";
import type { User, Session } from "../../types/auth";

// ---- Env helpers ----
function getGitHubProvider() {
  const clientId = process.env.GITHUB_CLIENT_ID ?? "";
  const clientSecret = process.env.GITHUB_CLIENT_SECRET ?? "";
  const redirectUri = `${process.env.API_URL ?? "http://localhost:3000"}/api/v1/auth/github/callback`;
  return new GitHub(clientId, clientSecret, redirectUri);
}

function getGoogleProvider() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const redirectUri = `${process.env.API_URL ?? "http://localhost:3000"}/api/v1/auth/google/callback`;
  return new Google(clientId, clientSecret, redirectUri);
}

function getFrontendUrl() {
  return process.env.FRONTEND_URL ?? "http://localhost:5173";
}

// ---- Cookie helpers ----
const REFRESH_COOKIE = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/v1/auth";
const SESSION_SLIDING_DAYS = 7;
const SESSION_HARD_CAP_DAYS = 30;

function setRefreshCookie(c: any, token: string) {
  const expiresAt = new Date(Date.now() + SESSION_SLIDING_DAYS * 24 * 60 * 60 * 1000);
  c.header(
    "Set-Cookie",
    `${REFRESH_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=${REFRESH_COOKIE_PATH}; Expires=${expiresAt.toUTCString()}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
}

function clearRefreshCookie(c: any) {
  c.header(
    "Set-Cookie",
    `${REFRESH_COOKIE}=; HttpOnly; SameSite=Strict; Path=${REFRESH_COOKIE_PATH}; Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
  );
}

function getRefreshTokenFromCookie(c: any): string | null {
  const cookieHeader = c.req.header("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)refreshToken=([^;]+)/);
  return match ? match[1] : null;
}

// ---- IP helper ----
function getIp(c: any): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown"
  );
}

// ---- Auth context helper ----
function getAuthContext(c: any) {
  return {
    userId: c.get("userId") as string,
    teamId: c.get("teamId") as string,
    role: c.get("role") as string,
    platformRole: c.get("platformRole") as string,
    authMethod: c.get("authMethod") as string,
    roleVersion: c.get("roleVersion") as number,
  };
}

// ---- Token exchange core ----
async function createSessionAndTokens(
  c: any,
  user: User,
  team: any,
  isNew: boolean,
  joined?: { teamId: string; teamName: string },
  inviteError?: "expired" | "exhausted" | "not_found",
) {
  const db = getDb();
  const ip = getIp(c);
  const ua = c.req.header("user-agent") ?? "";
  const device = parseDevice(ua);
  const now = new Date();

  // Check for new device
  const recentSession = await db.collection("sessions").findOne({
    userId: user._id,
    "device.browser": device.browser,
    "device.os": device.os,
    ip,
    expiresAt: { $gt: now },
  });
  const isNewDevice = !recentSession;

  // Generate refresh token
  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);
  const sessionId = randomUUID();
  const absoluteExpiresAt = new Date(now.getTime() + SESSION_HARD_CAP_DAYS * 24 * 60 * 60 * 1000);
  const expiresAt = new Date(now.getTime() + SESSION_SLIDING_DAYS * 24 * 60 * 60 * 1000);

  const session: Session = {
    _id: sessionId,
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
  };

  await db.collection("sessions").insertOne(session);
  setRefreshCookie(c, rawRefreshToken);

  // Sign access token
  const accessToken = await signAccessToken({
    userId: user._id,
    role: user.role,
    teamId: user.teamId,
    platformRole: user.platformRole,
    roleVersion: user.roleVersion,
  });

  // New device email (fire-and-forget)
  if (isNewDevice) {
    const notifPrefs = await db.collection("notificationPreferences").findOne({ _id: user._id });
    if (!notifPrefs || notifPrefs.loginAlerts !== false) {
      getEmailService()
        .send(user.email, "new_device_login", {
          name: user.name,
          browser: device.browser,
          os: device.os,
          ip,
          time: now.toISOString(),
        })
        .catch(() => {});
    }
  }

  // Audit login
  logAudit({
    teamId: user.teamId,
    actorId: user._id,
    action: "user.login",
    ip,
    plan: (team?.plan ?? "free") as "free" | "pro",
    target: { type: "session", id: sessionId },
  }).catch(() => {});

  return { accessToken, isNew, joined, inviteError, sessionId };
}

// ---- Router ----
export const authRoutes = new Hono();

// =====================================
// OAuth: GitHub
// =====================================

authRoutes.get("/github", async (c) => {
  const github = getGitHubProvider();
  const state = randomBytes(16).toString("hex");
  const codeVerifier = randomBytes(32).toString("hex");
  const inviteCode = new URL(c.req.url).searchParams.get("invite") ?? undefined;
  const recoveryToken = new URL(c.req.url).searchParams.get("recovery") ?? undefined;

  const authUrl = await github.createAuthorizationURL(state, codeVerifier, ["user:email"]);

  const cookieValue = JSON.stringify({ state, codeVerifier, inviteCode, recoveryToken });
  const cookieExpiry = new Date(Date.now() + 5 * 60 * 1000);
  c.header(
    "Set-Cookie",
    `oauth_state=${encodeURIComponent(cookieValue)}; HttpOnly; SameSite=Lax; Path=/; Expires=${cookieExpiry.toUTCString()}`,
  );

  return c.redirect(authUrl.toString());
});

authRoutes.get("/github/callback", async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const cookieHeader = c.req.header("cookie") ?? "";
  const stateCookieMatch = cookieHeader.match(/(?:^|;\s*)oauth_state=([^;]+)/);
  if (!stateCookieMatch) {
    return c.redirect(`${getFrontendUrl()}/auth/error?code=MISSING_STATE`);
  }

  let stateCookie: { state: string; codeVerifier: string; inviteCode?: string; recoveryToken?: string };
  try {
    stateCookie = JSON.parse(decodeURIComponent(stateCookieMatch[1]));
  } catch {
    return c.redirect(`${getFrontendUrl()}/auth/error?code=INVALID_STATE`);
  }

  if (!returnedState || returnedState !== stateCookie.state) {
    return c.redirect(`${getFrontendUrl()}/auth/error?code=STATE_MISMATCH`);
  }

  if (!code) {
    return c.redirect(`${getFrontendUrl()}/auth/error?code=NO_CODE`);
  }

  try {
    const github = getGitHubProvider();
    const tokens = await github.validateAuthorizationCode(code, stateCookie.codeVerifier);

    // Fetch GitHub user profile
    const [profileRes, emailsRes] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
          Accept: "application/vnd.github+json",
        },
      }),
      fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
          Accept: "application/vnd.github+json",
        },
      }),
    ]);

    const ghUser: any = await profileRes.json();
    const ghEmails: any[] = await emailsRes.json();
    const primaryEmail = ghEmails.find((e: any) => e.primary && e.verified) ?? ghEmails[0];

    if (!primaryEmail) {
      return c.redirect(`${getFrontendUrl()}/auth/error?code=NO_EMAIL`);
    }

    const { findOrCreateUser } = await import("../../infrastructure/auth");
    const result = await findOrCreateUser(
      {
        provider: "github",
        providerId: String(ghUser.id),
        email: primaryEmail.email,
        emailVerified: primaryEmail.verified ?? false,
        name: ghUser.name ?? ghUser.login,
        avatar: ghUser.avatar_url,
      },
      stateCookie.inviteCode,
    );

    // Generate one-time auth code
    const authCode = generateAuthCode();
    const db = getDb();
    await db.collection("authCodes").insertOne({
      _id: authCode,
      userId: result.user._id,
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
      isNew: result.isNew,
      joined: result.joined,
      inviteError: result.inviteError,
    });

    // Clear oauth state cookie
    c.header("Set-Cookie", "oauth_state=; HttpOnly; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");

    return c.redirect(`${getFrontendUrl()}/auth/callback?code=${authCode}`);
  } catch (err) {
    console.error("[auth/github/callback]", err);
    return c.redirect(`${getFrontendUrl()}/auth/error?code=OAUTH_FAILED`);
  }
});

// =====================================
// OAuth: Google
// =====================================

authRoutes.get("/google", async (c) => {
  const google = getGoogleProvider();
  const state = randomBytes(16).toString("hex");
  const codeVerifier = randomBytes(32).toString("hex");
  const inviteCode = new URL(c.req.url).searchParams.get("invite") ?? undefined;
  const recoveryToken = new URL(c.req.url).searchParams.get("recovery") ?? undefined;

  const authUrl = await google.createAuthorizationURL(state, codeVerifier, ["email", "profile"]);

  const cookieValue = JSON.stringify({ state, codeVerifier, inviteCode, recoveryToken });
  const cookieExpiry = new Date(Date.now() + 5 * 60 * 1000);
  c.header(
    "Set-Cookie",
    `oauth_state=${encodeURIComponent(cookieValue)}; HttpOnly; SameSite=Lax; Path=/; Expires=${cookieExpiry.toUTCString()}`,
  );

  return c.redirect(authUrl.toString());
});

authRoutes.get("/google/callback", async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const cookieHeader = c.req.header("cookie") ?? "";
  const stateCookieMatch = cookieHeader.match(/(?:^|;\s*)oauth_state=([^;]+)/);
  if (!stateCookieMatch) {
    return c.redirect(`${getFrontendUrl()}/auth/error?code=MISSING_STATE`);
  }

  let stateCookie: { state: string; codeVerifier: string; inviteCode?: string; recoveryToken?: string };
  try {
    stateCookie = JSON.parse(decodeURIComponent(stateCookieMatch[1]));
  } catch {
    return c.redirect(`${getFrontendUrl()}/auth/error?code=INVALID_STATE`);
  }

  if (!returnedState || returnedState !== stateCookie.state) {
    return c.redirect(`${getFrontendUrl()}/auth/error?code=STATE_MISMATCH`);
  }

  if (!code) {
    return c.redirect(`${getFrontendUrl()}/auth/error?code=NO_CODE`);
  }

  try {
    const google = getGoogleProvider();
    const tokens = await google.validateAuthorizationCode(code, stateCookie.codeVerifier);

    // Fetch Google user info
    const userInfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.accessToken()}` },
    });
    const googleUser: any = await userInfoRes.json();

    if (!googleUser.email) {
      return c.redirect(`${getFrontendUrl()}/auth/error?code=NO_EMAIL`);
    }

    const { findOrCreateUser } = await import("../../infrastructure/auth");
    const result = await findOrCreateUser(
      {
        provider: "google",
        providerId: googleUser.sub,
        email: googleUser.email,
        emailVerified: googleUser.email_verified ?? false,
        name: googleUser.name ?? googleUser.email,
        avatar: googleUser.picture,
      },
      stateCookie.inviteCode,
    );

    // Generate one-time auth code
    const authCode = generateAuthCode();
    const db = getDb();
    await db.collection("authCodes").insertOne({
      _id: authCode,
      userId: result.user._id,
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
      isNew: result.isNew,
      joined: result.joined,
      inviteError: result.inviteError,
    });

    c.header("Set-Cookie", "oauth_state=; HttpOnly; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");

    return c.redirect(`${getFrontendUrl()}/auth/callback?code=${authCode}`);
  } catch (err) {
    console.error("[auth/google/callback]", err);
    return c.redirect(`${getFrontendUrl()}/auth/error?code=OAUTH_FAILED`);
  }
});

// =====================================
// POST /token — Exchange auth code for tokens
// =====================================

authRoutes.post("/token", async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return apiError(c, "INVALID_BODY", "Request body must be JSON", 400);
  }

  const { code } = body;
  if (!code || typeof code !== "string") {
    return apiError(c, "MISSING_CODE", "code is required", 400);
  }

  const db = getDb();
  const authCodeDoc = await db.collection("authCodes").findOne({ _id: code });

  if (!authCodeDoc) {
    return apiError(c, "INVALID_CODE", "Invalid or expired auth code", 401);
  }

  if (authCodeDoc.used) {
    return apiError(c, "INVALID_CODE", "Auth code has already been used", 401);
  }

  if (new Date(authCodeDoc.expiresAt) < new Date()) {
    return apiError(c, "INVALID_CODE", "Auth code has expired", 401);
  }

  // Mark as used atomically
  const updateResult = await db.collection("authCodes").updateOne(
    { _id: code, used: false },
    { $set: { used: true } },
  );

  if (updateResult.modifiedCount === 0) {
    return apiError(c, "INVALID_CODE", "Auth code has already been used", 401);
  }

  const user = await db.collection("users").findOne({ _id: authCodeDoc.userId }) as User | null;
  if (!user) {
    return apiError(c, "USER_NOT_FOUND", "User not found", 401);
  }

  const team = await db.collection("teams").findOne({ _id: user.teamId });

  const result = await createSessionAndTokens(
    c,
    user,
    team,
    authCodeDoc.isNew ?? false,
    authCodeDoc.joined,
    authCodeDoc.inviteError,
  );

  return success(c, {
    accessToken: result.accessToken,
    isNew: result.isNew,
    ...(result.joined ? { joined: result.joined } : {}),
    ...(result.inviteError ? { inviteError: result.inviteError } : {}),
  });
});

// =====================================
// POST /refresh — Rotate refresh token
// =====================================

authRoutes.post("/refresh", async (c) => {
  const rawToken = getRefreshTokenFromCookie(c);
  if (!rawToken) {
    clearRefreshCookie(c);
    return apiError(c, "NO_REFRESH_TOKEN", "No refresh token", 401);
  }

  const tokenHash = hashToken(rawToken);
  const db = getDb();
  const now = new Date();

  const session = await db.collection("sessions").findOne({
    refreshTokenHash: tokenHash,
    expiresAt: { $gt: now },
    absoluteExpiresAt: { $gt: now },
  }) as Session | null;

  if (!session) {
    clearRefreshCookie(c);
    return apiError(c, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token", 401);
  }

  const user = await db.collection("users").findOne({ _id: session.userId }) as User | null;
  if (!user) {
    clearRefreshCookie(c);
    return apiError(c, "USER_NOT_FOUND", "User not found", 401);
  }

  // Rotate refresh token
  const newRawToken = generateRefreshToken();
  const newHash = hashToken(newRawToken);
  const newExpiresAt = new Date(
    Math.min(
      now.getTime() + SESSION_SLIDING_DAYS * 24 * 60 * 60 * 1000,
      session.absoluteExpiresAt.getTime(),
    ),
  );

  await db.collection("sessions").updateOne(
    { _id: session._id },
    {
      $set: {
        refreshTokenHash: newHash,
        lastRefreshedAt: now,
        expiresAt: newExpiresAt,
      },
    },
  );

  setRefreshCookie(c, newRawToken);

  const accessToken = await signAccessToken({
    userId: user._id,
    role: user.role,
    teamId: user.teamId,
    platformRole: user.platformRole,
    roleVersion: user.roleVersion,
  });

  return success(c, { accessToken });
});

// =====================================
// POST /logout — Revoke current session
// =====================================

authRoutes.post("/logout", async (c) => {
  const rawToken = getRefreshTokenFromCookie(c);
  const db = getDb();

  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    const session = await db.collection("sessions").findOne({ refreshTokenHash: tokenHash });
    if (session) {
      await db.collection("sessions").deleteOne({ _id: session._id });

      // Try to get user context from JWT if present
      const authHeader = c.req.header("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const payload = await verifyAccessToken(authHeader.slice(7));
          const team = await db.collection("teams").findOne({ _id: payload.teamId });
          logAudit({
            teamId: payload.teamId,
            actorId: payload.userId,
            action: "user.logout",
            ip: getIp(c),
            plan: (team?.plan ?? "free") as "free" | "pro",
            target: { type: "session", id: session._id },
          }).catch(() => {});
        } catch {
          // ignore JWT errors on logout
        }
      }
    }
  }

  clearRefreshCookie(c);
  return success(c, { ok: true });
});

// =====================================
// POST /logout-all — Revoke all other sessions
// =====================================

authRoutes.post("/logout-all", async (c) => {
  const { userId, teamId } = getAuthContext(c);
  const rawToken = getRefreshTokenFromCookie(c);
  const db = getDb();

  const currentHash = rawToken ? hashToken(rawToken) : null;

  await db.collection("sessions").deleteMany({
    userId,
    ...(currentHash ? { refreshTokenHash: { $ne: currentHash } } : {}),
  });

  const team = await db.collection("teams").findOne({ _id: teamId });
  logAudit({
    teamId,
    actorId: userId,
    action: "user.logout",
    ip: getIp(c),
    plan: (team?.plan ?? "free") as "free" | "pro",
    metadata: { logoutAll: true },
  }).catch(() => {});

  return success(c, { ok: true });
});

// =====================================
// GET /me — Current user profile
// =====================================

authRoutes.get("/me", async (c) => {
  const authHeader = c.req.header("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    // Check dev bypass
    const isDev = (process.env.NODE_ENV ?? "development") !== "production";
    if (!isDev) {
      return apiError(c, "UNAUTHORIZED", "Authentication required", 401);
    }
  }

  let userId: string;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7));
      userId = payload.userId;
    } catch {
      return apiError(c, "INVALID_TOKEN", "Invalid or expired access token", 401);
    }
  } else {
    const isDev = (process.env.NODE_ENV ?? "development") !== "production";
    if (!isDev) {
      return apiError(c, "UNAUTHORIZED", "Authentication required", 401);
    }
    userId = c.get("userId") ?? "dev-user";
  }

  const db = getDb();
  const user = await db.collection("users").findOne({ _id: userId });
  if (!user) {
    return apiError(c, "USER_NOT_FOUND", "User not found", 404);
  }

  // Exclude roleVersion from response
  const { roleVersion: _rv, ...userResponse } = user;
  return success(c, userResponse);
});

// =====================================
// PUT /me — Update user profile
// =====================================

authRoutes.put("/me", async (c) => {
  const authHeader = c.req.header("authorization");
  let userId: string;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7));
      userId = payload.userId;
    } catch {
      return apiError(c, "INVALID_TOKEN", "Invalid or expired access token", 401);
    }
  } else {
    const isDev = (process.env.NODE_ENV ?? "development") !== "production";
    if (!isDev) {
      return apiError(c, "UNAUTHORIZED", "Authentication required", 401);
    }
    userId = c.get("userId") ?? "dev-user";
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return apiError(c, "INVALID_BODY", "Request body must be JSON", 400);
  }

  const db = getDb();
  const updates: Record<string, any> = { updatedAt: new Date() };

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return apiError(c, "VALIDATION_ERROR", "name must be a non-empty string", 400);
    }
    updates.name = body.name.trim();
  }

  if (body.avatar !== undefined) {
    if (typeof body.avatar !== "string") {
      return apiError(c, "VALIDATION_ERROR", "avatar must be a string URL", 400);
    }
    updates.avatar = body.avatar;
    updates.customAvatar = true;
  }

  await db.collection("users").updateOne({ _id: userId }, { $set: updates });
  const updated = await db.collection("users").findOne({ _id: userId });

  if (!updated) {
    return apiError(c, "USER_NOT_FOUND", "User not found", 404);
  }

  const { roleVersion: _rv, ...userResponse } = updated;
  return success(c, userResponse);
});

// =====================================
// DELETE /account — Request soft deletion
// =====================================

authRoutes.delete("/account", async (c) => {
  const authHeader = c.req.header("authorization");
  let userId: string;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7));
      userId = payload.userId;
    } catch {
      return apiError(c, "INVALID_TOKEN", "Invalid or expired access token", 401);
    }
  } else {
    const isDev = (process.env.NODE_ENV ?? "development") !== "production";
    if (!isDev) {
      return apiError(c, "UNAUTHORIZED", "Authentication required", 401);
    }
    userId = c.get("userId") ?? "dev-user";
  }

  const db = getDb();
  const user = await db.collection("users").findOne({ _id: userId }) as User | null;
  if (!user) {
    return apiError(c, "USER_NOT_FOUND", "User not found", 404);
  }

  const now = new Date();
  const deletionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  await db.collection("users").updateOne(
    { _id: userId },
    { $set: { deletionRequestedAt: now, deletedAt: deletionDate, updatedAt: now } },
  );

  // Revoke all sessions
  await db.collection("sessions").deleteMany({ userId });
  clearRefreshCookie(c);

  // Disable all API keys
  await db.collection("apiKeys").updateMany(
    { userId, disabled: false },
    { $set: { disabled: true, disabledAt: now } },
  );

  // Clear Redis cache (fire-and-forget)
  try {
    const { getRedis, isRedisConnected } = await import("../../infrastructure/redis");
    if (isRedisConnected()) {
      getRedis().del(`gambit:user:${userId}:rv`).catch(() => {});
    }
  } catch {
    // Redis might not be available
  }

  const team = await db.collection("teams").findOne({ _id: user.teamId });
  logAudit({
    teamId: user.teamId,
    actorId: userId,
    action: "user.deletion_requested",
    ip: getIp(c),
    plan: (team?.plan ?? "free") as "free" | "pro",
    metadata: { deletionDate: deletionDate.toISOString() },
  }).catch(() => {});

  getEmailService()
    .send(user.email, "deletion_scheduled", {
      name: user.name,
      deletionDate: deletionDate.toISOString(),
    })
    .catch(() => {});

  return success(c, { deletionDate: deletionDate.toISOString() });
});

// =====================================
// POST /cancel-deletion — Cancel pending deletion
// =====================================

authRoutes.post("/cancel-deletion", async (c) => {
  const authHeader = c.req.header("authorization");
  let userId: string;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7));
      userId = payload.userId;
    } catch {
      return apiError(c, "INVALID_TOKEN", "Invalid or expired access token", 401);
    }
  } else {
    const isDev = (process.env.NODE_ENV ?? "development") !== "production";
    if (!isDev) {
      return apiError(c, "UNAUTHORIZED", "Authentication required", 401);
    }
    userId = c.get("userId") ?? "dev-user";
  }

  const db = getDb();
  const user = await db.collection("users").findOne({ _id: userId }) as User | null;
  if (!user) {
    return apiError(c, "USER_NOT_FOUND", "User not found", 404);
  }

  if (!user.deletionRequestedAt) {
    return apiError(c, "NO_DELETION_PENDING", "No pending deletion to cancel", 400);
  }

  const now = new Date();
  await db.collection("users").updateOne(
    { _id: userId },
    { $set: { deletionRequestedAt: null, deletedAt: null, updatedAt: now } },
  );

  // Re-enable API keys
  await db.collection("apiKeys").updateMany(
    { userId, disabled: true },
    { $set: { disabled: false, disabledAt: null } },
  );

  // Clear Redis cache
  try {
    const { getRedis, isRedisConnected } = await import("../../infrastructure/redis");
    if (isRedisConnected()) {
      getRedis().del(`gambit:user:${userId}:rv`).catch(() => {});
    }
  } catch {}

  const team = await db.collection("teams").findOne({ _id: user.teamId });
  logAudit({
    teamId: user.teamId,
    actorId: userId,
    action: "user.deletion_cancelled",
    ip: getIp(c),
    plan: (team?.plan ?? "free") as "free" | "pro",
  }).catch(() => {});

  getEmailService()
    .send(user.email, "deletion_cancelled", { name: user.name })
    .catch(() => {});

  return success(c, { ok: true });
});

// =====================================
// GET /sessions — List own sessions
// =====================================

authRoutes.get("/sessions", async (c) => {
  const authHeader = c.req.header("authorization");
  let userId: string;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7));
      userId = payload.userId;
    } catch {
      return apiError(c, "INVALID_TOKEN", "Invalid or expired access token", 401);
    }
  } else {
    const isDev = (process.env.NODE_ENV ?? "development") !== "production";
    if (!isDev) {
      return apiError(c, "UNAUTHORIZED", "Authentication required", 401);
    }
    userId = c.get("userId") ?? "dev-user";
  }

  const url = new URL(c.req.url);
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);
  const offset = Math.max(Number(url.searchParams.get("offset")) || 0, 0);
  const rawToken = getRefreshTokenFromCookie(c);
  const currentHash = rawToken ? hashToken(rawToken) : null;

  const db = getDb();
  const now = new Date();
  const [sessions, total] = await Promise.all([
    db
      .collection("sessions")
      .find({ userId, expiresAt: { $gt: now } })
      .sort({ lastRefreshedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection("sessions").countDocuments({ userId, expiresAt: { $gt: now } }),
  ]);

  const sessionsWithCurrent = sessions.map((s) => ({
    ...s,
    isCurrent: currentHash ? s.refreshTokenHash === currentHash : false,
    refreshTokenHash: undefined, // never expose
  }));

  return c.json({ data: sessionsWithCurrent, meta: { total, limit, offset } });
});

// =====================================
// DELETE /sessions/:id — Revoke a session
// =====================================

authRoutes.delete("/sessions/:id", async (c) => {
  const authHeader = c.req.header("authorization");
  let userId: string;
  let teamId: string;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7));
      userId = payload.userId;
      teamId = payload.teamId;
    } catch {
      return apiError(c, "INVALID_TOKEN", "Invalid or expired access token", 401);
    }
  } else {
    const isDev = (process.env.NODE_ENV ?? "development") !== "production";
    if (!isDev) {
      return apiError(c, "UNAUTHORIZED", "Authentication required", 401);
    }
    userId = c.get("userId") ?? "dev-user";
    teamId = c.get("teamId") ?? "dev-team";
  }

  const sessionId = c.req.param("id");
  const db = getDb();

  const session = await db.collection("sessions").findOne({ _id: sessionId, userId });
  if (!session) {
    return apiError(c, "NOT_FOUND", "Session not found", 404);
  }

  await db.collection("sessions").deleteOne({ _id: sessionId });

  const team = await db.collection("teams").findOne({ _id: teamId });
  logAudit({
    teamId,
    actorId: userId,
    action: "session.revoked",
    ip: getIp(c),
    plan: (team?.plan ?? "free") as "free" | "pro",
    target: { type: "session", id: sessionId },
  }).catch(() => {});

  return success(c, { ok: true });
});

// =====================================
// GET /link/github — Start GitHub linking flow
// =====================================

authRoutes.get("/link/github", async (c) => {
  const authHeader = c.req.header("authorization");
  let userId: string;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7));
      userId = payload.userId;
    } catch {
      return apiError(c, "INVALID_TOKEN", "Invalid or expired access token", 401);
    }
  } else {
    const isDev = (process.env.NODE_ENV ?? "development") !== "production";
    if (!isDev) {
      return apiError(c, "UNAUTHORIZED", "Authentication required", 401);
    }
    userId = c.get("userId") ?? "dev-user";
  }

  const github = getGitHubProvider();
  const state = randomBytes(16).toString("hex");
  const codeVerifier = randomBytes(32).toString("hex");

  const authUrl = await github.createAuthorizationURL(state, codeVerifier, ["user:email"]);

  const cookieValue = JSON.stringify({ state, codeVerifier, linkingUserId: userId });
  const cookieExpiry = new Date(Date.now() + 5 * 60 * 1000);
  c.header(
    "Set-Cookie",
    `oauth_link_state=${encodeURIComponent(cookieValue)}; HttpOnly; SameSite=Lax; Path=/; Expires=${cookieExpiry.toUTCString()}`,
  );

  return c.redirect(authUrl.toString());
});

authRoutes.get("/link/github/callback", async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const cookieHeader = c.req.header("cookie") ?? "";
  const stateCookieMatch = cookieHeader.match(/(?:^|;\s*)oauth_link_state=([^;]+)/);
  if (!stateCookieMatch) {
    return c.redirect(`${getFrontendUrl()}/settings?link_error=MISSING_STATE`);
  }

  let stateCookie: { state: string; codeVerifier: string; linkingUserId: string };
  try {
    stateCookie = JSON.parse(decodeURIComponent(stateCookieMatch[1]));
  } catch {
    return c.redirect(`${getFrontendUrl()}/settings?link_error=INVALID_STATE`);
  }

  if (!returnedState || returnedState !== stateCookie.state) {
    return c.redirect(`${getFrontendUrl()}/settings?link_error=STATE_MISMATCH`);
  }

  if (!code) {
    return c.redirect(`${getFrontendUrl()}/settings?link_error=NO_CODE`);
  }

  try {
    const github = getGitHubProvider();
    const tokens = await github.validateAuthorizationCode(code, stateCookie.codeVerifier);

    const [profileRes, emailsRes] = await Promise.all([
      fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
          Accept: "application/vnd.github+json",
        },
      }),
      fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${tokens.accessToken()}`,
          Accept: "application/vnd.github+json",
        },
      }),
    ]);

    const ghUser: any = await profileRes.json();
    const ghEmails: any[] = await emailsRes.json();
    const primaryEmail = ghEmails.find((e: any) => e.primary && e.verified) ?? ghEmails[0];

    if (!primaryEmail) {
      return c.redirect(`${getFrontendUrl()}/settings?link_error=NO_EMAIL`);
    }

    const db = getDb();
    const providerId = String(ghUser.id);

    // Check for provider conflict (same provider ID on different user)
    const conflict = await db.collection("users").findOne({
      "providers.provider": "github",
      "providers.providerId": providerId,
      _id: { $ne: stateCookie.linkingUserId },
    });
    if (conflict) {
      return c.redirect(`${getFrontendUrl()}/settings?link_error=PROVIDER_CONFLICT`);
    }

    const user = await db.collection("users").findOne({ _id: stateCookie.linkingUserId }) as User | null;
    if (!user) {
      return c.redirect(`${getFrontendUrl()}/settings?link_error=USER_NOT_FOUND`);
    }

    // Check if already linked
    const alreadyLinked = user.providers?.some((p) => p.provider === "github" && p.providerId === providerId);
    if (alreadyLinked) {
      return c.redirect(`${getFrontendUrl()}/settings?link_error=ALREADY_LINKED`);
    }

    const now = new Date();
    await db.collection("users").updateOne(
      { _id: stateCookie.linkingUserId },
      {
        $push: {
          providers: {
            provider: "github",
            providerId,
            email: primaryEmail.email,
            verified: primaryEmail.verified ?? false,
            linkedAt: now,
          },
        } as any,
        $set: { updatedAt: now },
      },
    );

    const team = await db.collection("teams").findOne({ _id: user.teamId });
    logAudit({
      teamId: user.teamId,
      actorId: user._id,
      action: "provider.linked",
      ip: getIp(c),
      plan: (team?.plan ?? "free") as "free" | "pro",
      metadata: { provider: "github", providerId },
    }).catch(() => {});

    getEmailService()
      .send(user.email, "provider_linked", {
        name: user.name,
        provider: "GitHub",
      })
      .catch(() => {});

    c.header("Set-Cookie", "oauth_link_state=; HttpOnly; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    return c.redirect(`${getFrontendUrl()}/settings?link_success=github`);
  } catch (err) {
    console.error("[auth/link/github/callback]", err);
    return c.redirect(`${getFrontendUrl()}/settings?link_error=OAUTH_FAILED`);
  }
});

// =====================================
// GET /link/google — Start Google linking flow
// =====================================

authRoutes.get("/link/google", async (c) => {
  const authHeader = c.req.header("authorization");
  let userId: string;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7));
      userId = payload.userId;
    } catch {
      return apiError(c, "INVALID_TOKEN", "Invalid or expired access token", 401);
    }
  } else {
    const isDev = (process.env.NODE_ENV ?? "development") !== "production";
    if (!isDev) {
      return apiError(c, "UNAUTHORIZED", "Authentication required", 401);
    }
    userId = c.get("userId") ?? "dev-user";
  }

  const google = getGoogleProvider();
  const state = randomBytes(16).toString("hex");
  const codeVerifier = randomBytes(32).toString("hex");

  const authUrl = await google.createAuthorizationURL(state, codeVerifier, ["email", "profile"]);

  const cookieValue = JSON.stringify({ state, codeVerifier, linkingUserId: userId });
  const cookieExpiry = new Date(Date.now() + 5 * 60 * 1000);
  c.header(
    "Set-Cookie",
    `oauth_link_state=${encodeURIComponent(cookieValue)}; HttpOnly; SameSite=Lax; Path=/; Expires=${cookieExpiry.toUTCString()}`,
  );

  return c.redirect(authUrl.toString());
});

authRoutes.get("/link/google/callback", async (c) => {
  const url = new URL(c.req.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const cookieHeader = c.req.header("cookie") ?? "";
  const stateCookieMatch = cookieHeader.match(/(?:^|;\s*)oauth_link_state=([^;]+)/);
  if (!stateCookieMatch) {
    return c.redirect(`${getFrontendUrl()}/settings?link_error=MISSING_STATE`);
  }

  let stateCookie: { state: string; codeVerifier: string; linkingUserId: string };
  try {
    stateCookie = JSON.parse(decodeURIComponent(stateCookieMatch[1]));
  } catch {
    return c.redirect(`${getFrontendUrl()}/settings?link_error=INVALID_STATE`);
  }

  if (!returnedState || returnedState !== stateCookie.state) {
    return c.redirect(`${getFrontendUrl()}/settings?link_error=STATE_MISMATCH`);
  }

  if (!code) {
    return c.redirect(`${getFrontendUrl()}/settings?link_error=NO_CODE`);
  }

  try {
    const google = getGoogleProvider();
    const tokens = await google.validateAuthorizationCode(code, stateCookie.codeVerifier);

    const userInfoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.accessToken()}` },
    });
    const googleUser: any = await userInfoRes.json();

    if (!googleUser.email) {
      return c.redirect(`${getFrontendUrl()}/settings?link_error=NO_EMAIL`);
    }

    const db = getDb();
    const providerId = googleUser.sub;

    // Check for provider conflict
    const conflict = await db.collection("users").findOne({
      "providers.provider": "google",
      "providers.providerId": providerId,
      _id: { $ne: stateCookie.linkingUserId },
    });
    if (conflict) {
      return c.redirect(`${getFrontendUrl()}/settings?link_error=PROVIDER_CONFLICT`);
    }

    const user = await db.collection("users").findOne({ _id: stateCookie.linkingUserId }) as User | null;
    if (!user) {
      return c.redirect(`${getFrontendUrl()}/settings?link_error=USER_NOT_FOUND`);
    }

    // Check if already linked
    const alreadyLinked = user.providers?.some((p) => p.provider === "google" && p.providerId === providerId);
    if (alreadyLinked) {
      return c.redirect(`${getFrontendUrl()}/settings?link_error=ALREADY_LINKED`);
    }

    const now = new Date();
    await db.collection("users").updateOne(
      { _id: stateCookie.linkingUserId },
      {
        $push: {
          providers: {
            provider: "google",
            providerId,
            email: googleUser.email,
            verified: googleUser.email_verified ?? false,
            linkedAt: now,
          },
        } as any,
        $set: { updatedAt: now },
      },
    );

    const team = await db.collection("teams").findOne({ _id: user.teamId });
    logAudit({
      teamId: user.teamId,
      actorId: user._id,
      action: "provider.linked",
      ip: getIp(c),
      plan: (team?.plan ?? "free") as "free" | "pro",
      metadata: { provider: "google", providerId },
    }).catch(() => {});

    getEmailService()
      .send(user.email, "provider_linked", {
        name: user.name,
        provider: "Google",
      })
      .catch(() => {});

    c.header("Set-Cookie", "oauth_link_state=; HttpOnly; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT");
    return c.redirect(`${getFrontendUrl()}/settings?link_success=google`);
  } catch (err) {
    console.error("[auth/link/google/callback]", err);
    return c.redirect(`${getFrontendUrl()}/settings?link_error=OAUTH_FAILED`);
  }
});

// =====================================
// DELETE /providers/:provider — Unlink provider
// =====================================

authRoutes.delete("/providers/:provider", async (c) => {
  const authHeader = c.req.header("authorization");
  let userId: string;
  let teamId: string;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyAccessToken(authHeader.slice(7));
      userId = payload.userId;
      teamId = payload.teamId;
    } catch {
      return apiError(c, "INVALID_TOKEN", "Invalid or expired access token", 401);
    }
  } else {
    const isDev = (process.env.NODE_ENV ?? "development") !== "production";
    if (!isDev) {
      return apiError(c, "UNAUTHORIZED", "Authentication required", 401);
    }
    userId = c.get("userId") ?? "dev-user";
    teamId = c.get("teamId") ?? "dev-team";
  }

  const provider = c.req.param("provider");
  if (provider !== "github" && provider !== "google") {
    return apiError(c, "INVALID_PROVIDER", "Provider must be github or google", 400);
  }

  const db = getDb();
  const user = await db.collection("users").findOne({ _id: userId }) as User | null;
  if (!user) {
    return apiError(c, "USER_NOT_FOUND", "User not found", 404);
  }

  const providerEntry = user.providers?.find((p) => p.provider === provider);
  if (!providerEntry) {
    return apiError(c, "PROVIDER_NOT_LINKED", `${provider} is not linked to this account`, 404);
  }

  // Cannot unlink if it's the only provider
  if (user.providers.length <= 1) {
    return apiError(
      c,
      "LAST_PROVIDER",
      "Cannot unlink the only authentication provider",
      409,
    );
  }

  const now = new Date();
  await db.collection("users").updateOne(
    { _id: userId },
    {
      $pull: { providers: { provider } } as any,
      $set: { updatedAt: now },
    },
  );

  const team = await db.collection("teams").findOne({ _id: teamId });
  logAudit({
    teamId,
    actorId: userId,
    action: "provider.linked", // audit type closest - "provider.unlinked" not in type
    ip: getIp(c),
    plan: (team?.plan ?? "free") as "free" | "pro",
    metadata: { action: "unlink", provider },
  }).catch(() => {});

  return success(c, { ok: true, provider });
});

// =====================================
// GET /providers — Available providers list
// =====================================

authRoutes.get("/providers", async (c) => {
  const providers: Array<{ name: string; enabled: boolean }> = [
    {
      name: "github",
      enabled: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
    {
      name: "google",
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  ];

  return success(c, providers);
});
