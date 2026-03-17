import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { signAccessToken, generateAuthCode, hashToken } from "../../src/infrastructure/auth";
import { authRoutes } from "../../src/modules/system/auth-routes";
import { randomUUID } from "crypto";

const BASE_URL = "http://localhost";

function createApp() {
  const app = new Hono();
  app.route("/auth", authRoutes);
  return app;
}

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  const db = getDb();
  await db.collection("authCodes").deleteMany({});
  await db.collection("users").deleteMany({});
  await db.collection("teams").deleteMany({});
  await db.collection("sessions").deleteMany({});
  await db.collection("apiKeys").deleteMany({});
});

afterAll(async () => {
  const db = getDb();
  await db.collection("authCodes").deleteMany({});
  await db.collection("users").deleteMany({});
  await db.collection("teams").deleteMany({});
  await db.collection("sessions").deleteMany({});
  await db.collection("apiKeys").deleteMany({});
  await disconnectMongo();
});

describe("POST /auth/token — exchange auth code for access token", () => {
  it("exchanges a valid auth code for access token", async () => {
    const db = getDb();
    const userId = randomUUID();
    const teamId = randomUUID();

    // Create team
    await db.collection("teams").insertOne({
      _id: teamId,
      name: "Test Team",
      slug: "test-team-" + randomUUID().slice(0, 8),
      plan: "free",
      ownerId: userId,
      watchlist: [],
      inviteCodes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create user
    await db.collection("users").insertOne({
      _id: userId,
      email: "token-test@example.com",
      name: "Token Test User",
      customAvatar: false,
      role: "owner",
      platformRole: "user",
      teamId,
      roleVersion: 0,
      providers: [],
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create valid auth code
    const code = generateAuthCode();
    await db.collection("authCodes").insertOne({
      _id: code,
      userId,
      expiresAt: new Date(Date.now() + 60_000),
      used: false,
      isNew: false,
    });

    const app = createApp();
    const res = await app.request("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(typeof body.data.accessToken).toBe("string");
    expect(body.data.accessToken.split(".")).toHaveLength(3);
    expect(typeof body.data.isNew).toBe("boolean");

    // Verify cookie is set
    const setCookieHeader = res.headers.get("set-cookie");
    expect(setCookieHeader).not.toBeNull();
    expect(setCookieHeader).toContain("refreshToken=");
    expect(setCookieHeader).toContain("HttpOnly");
  });

  it("rejects an already-used auth code with 401", async () => {
    const db = getDb();
    const userId = randomUUID();

    const code = generateAuthCode();
    await db.collection("authCodes").insertOne({
      _id: code,
      userId,
      expiresAt: new Date(Date.now() + 60_000),
      used: true, // already used
    });

    const app = createApp();
    const res = await app.request("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("INVALID_CODE");
  });

  it("rejects an expired auth code with 401", async () => {
    const db = getDb();
    const userId = randomUUID();

    const code = generateAuthCode();
    await db.collection("authCodes").insertOne({
      _id: code,
      userId,
      expiresAt: new Date(Date.now() - 1_000), // expired
      used: false,
    });

    const app = createApp();
    const res = await app.request("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBeDefined();
    expect(body.error.code).toBe("INVALID_CODE");
  });

  it("rejects a missing code with 400", async () => {
    const app = createApp();
    const res = await app.request("/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(400);
  });
});

describe("GET /auth/me — current user profile", () => {
  it("returns the current user profile with a valid JWT", async () => {
    const db = getDb();
    const userId = randomUUID();
    const teamId = randomUUID();

    await db.collection("users").insertOne({
      _id: userId,
      email: "me-test@example.com",
      name: "Me Test User",
      customAvatar: false,
      role: "member",
      platformRole: "user",
      teamId,
      roleVersion: 0,
      providers: [
        {
          provider: "github",
          providerId: "gh-123",
          email: "me-test@example.com",
          verified: true,
          linkedAt: new Date(),
        },
      ],
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const token = await signAccessToken({
      userId,
      role: "member",
      teamId,
      platformRole: "user",
      roleVersion: 0,
    });

    const app = createApp();
    const res = await app.request("/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data._id).toBe(userId);
    expect(body.data.email).toBe("me-test@example.com");
    expect(body.data.name).toBe("Me Test User");
    expect(body.data.roleVersion).toBeUndefined(); // excluded from response
    expect(body.data.providers).toBeArray();
  });

  it("returns 401 without authentication", async () => {
    const app = createApp();
    // Set NODE_ENV to production so dev bypass is disabled
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const res = await app.request("/auth/me");
    expect(res.status).toBe(401);

    process.env.NODE_ENV = origEnv;
  });
});
