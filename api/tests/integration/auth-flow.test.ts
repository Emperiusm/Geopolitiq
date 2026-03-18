import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../src/infrastructure/redis";
import { ensureAuthIndexes } from "../../src/infrastructure/indexes";
import {
  findOrCreateUser,
  signAccessToken,
  hashToken,
} from "../../src/infrastructure/auth";
import { Hono } from "hono";
import type { AppVariables } from "../../src/types/auth";
import { authenticate } from "../../src/middleware/authenticate";
import { requireRole } from "../../src/middleware/require-role";
import { scopeCheck } from "../../src/middleware/scope-check";
import { apiKeyRoutes } from "../../src/modules/system/api-key-routes";
import { teamRoutes } from "../../src/modules/system/team-routes";
import { randomUUID } from "crypto";

// Clean all auth collections before tests
beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  try {
    await connectRedis("redis://localhost:6380");
  } catch {}
  const db = getDb();
  const collections = [
    "users",
    "teams",
    "sessions",
    "authCodes",
    "apiKeys",
    "auditEvents",
    "savedViews",
    "notificationPreferences",
    "platformConfig",
    "teamSettings",
    "recoveryTokens",
    "userPreferences",
  ];
  for (const col of collections) {
    await db.collection(col).deleteMany({});
  }
  await ensureAuthIndexes();
}, 15000);

afterAll(async () => {
  const db = getDb();
  const collections = [
    "users",
    "teams",
    "sessions",
    "authCodes",
    "apiKeys",
    "auditEvents",
    "savedViews",
    "notificationPreferences",
    "platformConfig",
    "teamSettings",
    "recoveryTokens",
    "userPreferences",
  ];
  for (const col of collections) {
    await db.collection(col).deleteMany({});
  }
  try {
    await disconnectRedis();
  } catch {}
  await disconnectMongo();
});

// Shared state across tests
let user1Id: string;
let user1TeamId: string;
let user2Id: string;
let user2TeamId: string;
let inviteCode: string;

describe("Auth Flow Integration", () => {
  it("1. First user gets platform admin", async () => {
    const profile = {
      provider: "github" as const,
      providerId: "gh-100001",
      email: "alice@example.com",
      emailVerified: true,
      name: "Alice Smith",
      avatar: "https://avatars.example.com/alice",
    };

    const result = await findOrCreateUser(profile);

    expect(result.isNew).toBe(true);
    expect(result.user.platformRole).toBe("admin");
    expect(result.user.role).toBe("owner");
    expect(result.user.email).toBe("alice@example.com");

    // A personal team should have been created
    const db = getDb();
    const team = await db.collection("teams").findOne({ _id: result.user.teamId });
    expect(team).not.toBeNull();
    expect(team!.ownerId).toBe(result.user._id);

    user1Id = result.user._id;
    user1TeamId = result.user.teamId;
  });

  it("2. Second user is a regular user", async () => {
    const profile = {
      provider: "github" as const,
      providerId: "gh-100002",
      email: "bob@example.com",
      emailVerified: true,
      name: "Bob Jones",
      avatar: "https://avatars.example.com/bob",
    };

    const result = await findOrCreateUser(profile);

    expect(result.isNew).toBe(true);
    expect(result.user.platformRole).toBe("user");
    expect(result.user.role).toBe("owner");

    user2Id = result.user._id;
    user2TeamId = result.user.teamId;
  });

  it("3. Account linking by email — same email with different provider links to existing user", async () => {
    // Use same email as user1 (alice@example.com) but via Google
    const profile = {
      provider: "google" as const,
      providerId: "google-alice-999",
      email: "alice@example.com",
      emailVerified: true,
      name: "Alice Smith",
      avatar: "https://lh3.googleusercontent.com/alice",
    };

    const result = await findOrCreateUser(profile);

    expect(result.isNew).toBe(false);
    // Should be the same user (alice)
    expect(result.user._id).toBe(user1Id);

    // User should now have 2 providers
    const db = getDb();
    const user = await db.collection("users").findOne({ _id: user1Id });
    expect(user).not.toBeNull();
    expect(user!.providers).toHaveLength(2);
    const providerNames = user!.providers.map((p: any) => p.provider);
    expect(providerNames).toContain("github");
    expect(providerNames).toContain("google");
  });

  it("4. JWT auth works — authenticate middleware sets auth context from Bearer token", async () => {
    // Create a JWT for user1
    const token = await signAccessToken({
      userId: user1Id,
      role: "owner",
      teamId: user1TeamId,
      platformRole: "admin",
      roleVersion: 0,
    });

    // Create a minimal Hono app with authenticate middleware
    const app = new Hono<{ Variables: AppVariables }>();
    app.use("*", authenticate);
    app.get("/api/v1/protected", (c) => {
      return c.json({
        userId: c.get("userId"),
        role: c.get("role"),
        teamId: c.get("teamId"),
        platformRole: c.get("platformRole"),
        authMethod: c.get("authMethod"),
      });
    });

    const req = new Request("http://localhost/api/v1/protected", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const res = await app.fetch(req);
    expect(res.status).toBe(200);

    const body = await res.json() as any;
    expect(body.userId).toBe(user1Id);
    expect(body.role).toBe("owner");
    expect(body.teamId).toBe(user1TeamId);
    expect(body.platformRole).toBe("admin");
    expect(body.authMethod).toBe("jwt");
  });

  it("5. API key auth works — create key, use it for GET (allowed) and POST (blocked for read scope)", async () => {
    // Build the app with authenticate + scopeCheck + apiKeyRoutes
    const app = new Hono<{ Variables: AppVariables }>();
    app.use("*", authenticate);
    app.use("*", scopeCheck);

    // Mount api key routes under /api/v1/api-keys
    app.route("/api/v1/api-keys", apiKeyRoutes);

    // Add a sentinel route to test scope blocking
    app.get("/api/v1/data", (c) => c.json({ ok: true }));
    app.post("/api/v1/data", (c) => c.json({ ok: true }));

    // First, create an API key as user1 (using JWT so we get past authenticate)
    const token = await signAccessToken({
      userId: user1Id,
      role: "owner",
      teamId: user1TeamId,
      platformRole: "admin",
      roleVersion: 0,
    });

    const createRes = await app.fetch(
      new Request("http://localhost/api/v1/api-keys", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "test-read-key", scope: "read" }),
      }),
    );

    expect(createRes.status).toBe(201);
    const createBody = await createRes.json() as any;
    expect(createBody.data).toBeDefined();
    const rawApiKey: string = createBody.data.key;
    expect(rawApiKey).toMatch(/^gbt_/);

    // Use the API key for a GET request — should succeed
    const getRes = await app.fetch(
      new Request("http://localhost/api/v1/data", {
        method: "GET",
        headers: { "x-api-key": rawApiKey },
      }),
    );
    expect(getRes.status).toBe(200);

    // Use the API key for a POST request — should be blocked with SCOPE_INSUFFICIENT
    const postRes = await app.fetch(
      new Request("http://localhost/api/v1/data", {
        method: "POST",
        headers: {
          "x-api-key": rawApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );
    expect(postRes.status).toBe(403);
    const postBody = await postRes.json() as any;
    expect(postBody.error.code).toBe("SCOPE_INSUFFICIENT");
  });

  it("6. Team invite + join flow — user1 creates invite, user2 joins, gets new access token with correct role", async () => {
    // Build an app with authenticate + teamRoutes
    const app = new Hono<{ Variables: AppVariables }>();
    app.use("*", authenticate);
    app.route("/api/v1/team", teamRoutes);

    // Sign tokens for user1 (admin/owner of their team)
    const user1Token = await signAccessToken({
      userId: user1Id,
      role: "owner",
      teamId: user1TeamId,
      platformRole: "admin",
      roleVersion: 0,
    });

    // User1 creates an invite code for their team
    const inviteRes = await app.fetch(
      new Request("http://localhost/api/v1/team/invite", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user1Token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "member", maxUses: 5, expiresInDays: 7 }),
      }),
    );

    expect(inviteRes.status).toBe(201);
    const inviteBody = await inviteRes.json() as any;
    expect(inviteBody.data).toBeDefined();
    inviteCode = inviteBody.data.code;
    expect(typeof inviteCode).toBe("string");
    expect(inviteCode.length).toBeGreaterThan(0);

    // Sign token for user2 (currently in their own team)
    const user2Token = await signAccessToken({
      userId: user2Id,
      role: "owner",
      teamId: user2TeamId,
      platformRole: "user",
      roleVersion: 0,
    });

    // User2 joins user1's team via invite
    const joinRes = await app.fetch(
      new Request("http://localhost/api/v1/team/join", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user2Token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: inviteCode }),
      }),
    );

    expect(joinRes.status).toBe(200);
    const joinBody = await joinRes.json() as any;
    expect(joinBody.data).toBeDefined();
    expect(joinBody.data.accessToken).toBeDefined();
    expect(typeof joinBody.data.accessToken).toBe("string");
    expect(joinBody.data.teamId).toBe(user1TeamId);
    expect(joinBody.data.role).toBe("member");

    // Verify the DB reflects the change: user2 is now in user1's team
    const db = getDb();
    const user2Doc = await db.collection("users").findOne({ _id: user2Id });
    expect(user2Doc).not.toBeNull();
    expect(user2Doc!.teamId).toBe(user1TeamId);
    expect(user2Doc!.role).toBe("member");

    // The new access token should be valid and carry the new team context
    const newToken: string = joinBody.data.accessToken;
    const app2 = new Hono<{ Variables: AppVariables }>();
    app2.use("*", authenticate);
    app2.get("/api/v1/me", (c) =>
      c.json({
        userId: c.get("userId"),
        teamId: c.get("teamId"),
        role: c.get("role"),
      }),
    );

    const meRes = await app2.fetch(
      new Request("http://localhost/api/v1/me", {
        headers: { Authorization: `Bearer ${newToken}` },
      }),
    );
    expect(meRes.status).toBe(200);
    const meBody = await meRes.json() as any;
    expect(meBody.userId).toBe(user2Id);
    expect(meBody.teamId).toBe(user1TeamId);
    expect(meBody.role).toBe("member");
  });
});
