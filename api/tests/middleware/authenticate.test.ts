import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { authenticate, PUBLIC_PATHS } from "../../src/middleware/authenticate";
import { signAccessToken, hashToken } from "../../src/infrastructure/auth";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { randomUUID } from "crypto";

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
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
