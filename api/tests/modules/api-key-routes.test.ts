import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { Hono } from "hono";
import type { AppVariables } from "../../src/types/auth";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { hashToken } from "../../src/infrastructure/auth";
import { apiKeyRoutes } from "../../src/modules/system/api-key-routes";
import { randomUUID } from "crypto";

const BASE_URL = "http://localhost";

const TEST_USER_ID = randomUUID();
const TEST_TEAM_ID = randomUUID();
const TEST_ROLE = "member";

function createApp() {
  const app = new Hono<{ Variables: AppVariables }>();

  // Mock auth context middleware — sets userId, teamId, role via c.set
  app.use("*", async (c, next) => {
    c.set("userId", TEST_USER_ID);
    c.set("teamId", TEST_TEAM_ID);
    c.set("role", TEST_ROLE);
    await next();
  });

  app.route("/api-keys", apiKeyRoutes);
  return app;
}

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
});

beforeEach(async () => {
  const db = getDb();
  await db.collection("apiKeys").deleteMany({});
  await db.collection("auditEvents").deleteMany({});

  // Insert a test team for audit logging (logAudit needs plan from team)
  await db.collection("teams").deleteMany({ _id: TEST_TEAM_ID });
  await db.collection("teams").insertOne({
    _id: TEST_TEAM_ID,
    name: "Test Team",
    slug: "test-team-" + randomUUID().slice(0, 8),
    plan: "free",
    ownerId: TEST_USER_ID,
    watchlist: [],
    inviteCodes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
});

afterAll(async () => {
  const db = getDb();
  await db.collection("apiKeys").deleteMany({});
  await db.collection("auditEvents").deleteMany({});
  await db.collection("teams").deleteMany({ _id: TEST_TEAM_ID });
  await disconnectMongo();
});

describe("POST /api-keys — create API key", () => {
  it("creates a key and returns raw key once", async () => {
    const app = createApp();
    const res = await app.request("/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "My Test Key", scope: "read" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.key).toBeDefined();
    expect(body.data.key).toStartWith("gbt_");
    expect(body.data._id).toBeDefined();
    expect(body.data.name).toBe("My Test Key");
    expect(body.data.scope).toBe("read");
    expect(body.data.keyPrefix).toBeDefined();
  });

  it("stores a SHA-256 hash, not the raw key", async () => {
    const app = createApp();
    const res = await app.request("/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Hash Check Key", scope: "read-write" }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    const rawKey = body.data.key;

    const db = getDb();
    const stored = await db.collection("apiKeys").findOne({ _id: body.data._id });
    expect(stored).not.toBeNull();
    expect(stored!.keyHash).toBeDefined();
    expect(stored!.keyHash).not.toBe(rawKey);
    expect(stored!.keyHash).toBe(hashToken(rawKey));
    // keyHash should not be returned in response
    expect(body.data.keyHash).toBeUndefined();
  });

  it("returns 400 when name is missing", async () => {
    const app = createApp();
    const res = await app.request("/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope: "read" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when scope is invalid", async () => {
    const app = createApp();
    const res = await app.request("/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Bad Scope Key", scope: "write-only" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("stores expiresAt if provided", async () => {
    const app = createApp();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const res = await app.request("/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Expiring Key", scope: "read", expiresAt }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();

    const db = getDb();
    const stored = await db.collection("apiKeys").findOne({ _id: body.data._id });
    expect(stored!.expiresAt).toBeDefined();
  });
});

describe("GET /api-keys — list API keys", () => {
  it("returns list of keys without keyHash", async () => {
    const app = createApp();

    // Create two keys first
    await app.request("/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "List Key 1", scope: "read" }),
    });
    await app.request("/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "List Key 2", scope: "read-write" }),
    });

    const res = await app.request("/api-keys");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBe(2);

    for (const item of body.data) {
      expect(item.keyHash).toBeUndefined();
      expect(item.keyPrefix).toBeDefined();
      expect(item.name).toBeDefined();
      expect(item.scope).toBeDefined();
      expect("lastUsedAt" in item).toBe(true);
      expect(item.createdAt).toBeDefined();
    }
  });

  it("does not return keys of other users", async () => {
    const db = getDb();
    // Insert a key belonging to a different user
    await db.collection("apiKeys").insertOne({
      _id: randomUUID(),
      keyHash: hashToken("gbt_othersecret"),
      keyPrefix: "gbt_othe",
      userId: randomUUID(), // different user
      teamId: TEST_TEAM_ID,
      name: "Other User's Key",
      scope: "read",
      disabled: false,
      lastUsedAt: null,
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/api-keys");
    expect(res.status).toBe(200);
    const body = await res.json();
    // Should be empty — no keys for TEST_USER_ID yet
    expect(body.data.length).toBe(0);
  });

  it("supports pagination via limit and offset", async () => {
    const app = createApp();

    // Create 3 keys
    for (let i = 1; i <= 3; i++) {
      await app.request("/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Paginated Key ${i}`, scope: "read" }),
      });
    }

    const res = await app.request("/api-keys?limit=2&offset=0");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(2);
    expect(body.meta.total).toBe(3);
    expect(body.meta.limit).toBe(2);
    expect(body.meta.offset).toBe(0);
  });
});

describe("DELETE /api-keys/:id — revoke API key", () => {
  it("deletes an existing key", async () => {
    const app = createApp();
    const createRes = await app.request("/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Delete Me", scope: "read" }),
    });
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    const keyId = createBody.data._id;

    const deleteRes = await app.request(`/api-keys/${keyId}`, { method: "DELETE" });
    expect(deleteRes.status).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.data.revoked).toBe(true);

    // Verify key is actually removed from DB
    const db = getDb();
    const stored = await db.collection("apiKeys").findOne({ _id: keyId });
    expect(stored).toBeNull();
  });

  it("returns 404 when key does not exist", async () => {
    const app = createApp();
    const res = await app.request(`/api-keys/${randomUUID()}`, { method: "DELETE" });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when key belongs to another user", async () => {
    const db = getDb();
    const keyId = randomUUID();
    await db.collection("apiKeys").insertOne({
      _id: keyId,
      keyHash: hashToken("gbt_someothersecret"),
      keyPrefix: "gbt_some",
      userId: randomUUID(), // different user
      teamId: TEST_TEAM_ID,
      name: "Another's Key",
      scope: "read",
      disabled: false,
      lastUsedAt: null,
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request(`/api-keys/${keyId}`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api-keys/:id/rotate — rotate API key", () => {
  it("returns a new raw key and updates hash", async () => {
    const app = createApp();

    // Create the key first
    const createRes = await app.request("/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Rotate Me", scope: "read" }),
    });
    expect(createRes.status).toBe(201);
    const createBody = await createRes.json();
    const keyId = createBody.data._id;
    const originalKey = createBody.data.key;
    const originalPrefix = createBody.data.keyPrefix;

    const db = getDb();
    const originalStored = await db.collection("apiKeys").findOne({ _id: keyId });
    const originalHash = originalStored!.keyHash;

    // Rotate
    const rotateRes = await app.request(`/api-keys/${keyId}/rotate`, { method: "POST" });
    expect(rotateRes.status).toBe(200);
    const rotateBody = await rotateRes.json();

    expect(rotateBody.data.key).toBeDefined();
    expect(rotateBody.data.key).toStartWith("gbt_");
    expect(rotateBody.data.key).not.toBe(originalKey);
    expect(rotateBody.data.keyPrefix).toBeDefined();

    // Verify hash was updated in DB
    const updatedStored = await db.collection("apiKeys").findOne({ _id: keyId });
    expect(updatedStored!.keyHash).not.toBe(originalHash);
    expect(updatedStored!.keyHash).toBe(hashToken(rotateBody.data.key));
  });

  it("returns 404 when key does not exist", async () => {
    const app = createApp();
    const res = await app.request(`/api-keys/${randomUUID()}/rotate`, { method: "POST" });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 when key belongs to another user", async () => {
    const db = getDb();
    const keyId = randomUUID();
    await db.collection("apiKeys").insertOne({
      _id: keyId,
      keyHash: hashToken("gbt_rotateotheruserkey"),
      keyPrefix: "gbt_rota",
      userId: randomUUID(), // different user
      teamId: TEST_TEAM_ID,
      name: "Another's Rotate Key",
      scope: "read",
      disabled: false,
      lastUsedAt: null,
      createdAt: new Date(),
    });

    const app = createApp();
    const res = await app.request(`/api-keys/${keyId}/rotate`, { method: "POST" });
    expect(res.status).toBe(404);
  });
});
