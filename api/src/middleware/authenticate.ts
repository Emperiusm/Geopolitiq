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

const PUBLIC_PREFIXES = ["/api/v1/health", "/api/v1/team/invite-info/"];

function isPublicPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export const authenticate: MiddlewareHandler = async (c, next) => {
  const path = new URL(c.req.url).pathname;

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

      // Check deletion status
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
  deletedAt?: string;
}

async function getUserAuthCache(userId: string): Promise<UserAuthCache | null> {
  const cacheKey = `gambit:user:${userId}:rv`;

  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      let cached = await redis.get(cacheKey);
      if (cached === null) {
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
    }
  }

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
