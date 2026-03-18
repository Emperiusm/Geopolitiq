// api/tests/modules/system/team-settings-routes.test.ts
// Tests for team settings routes: AI config management and encryption.

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { Hono } from "hono";
import type { AppVariables } from "../../../src/types/auth";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { teamSettingsRoutes } from "../../../src/modules/system/team-settings-routes";
import { randomUUID } from "crypto";

const BASE_URL = "http://localhost";

// Test identity constants
const OWNER_ID = randomUUID();
const ADMIN_ID = randomUUID();
const MEMBER_ID = randomUUID();
const TEAM_ID = randomUUID();

type Role = "owner" | "admin" | "member" | "viewer";

function createApp(
  userId = OWNER_ID,
  role: Role = "owner",
  teamId = TEAM_ID,
) {
  const app = new Hono<{ Variables: AppVariables }>();

  // Mock auth context
  app.use("*", async (c, next) => {
    c.set("userId", userId);
    c.set("teamId", teamId);
    c.set("role", role);
    c.set("platformRole", "user");
    c.set("roleVersion", 0);
    await next();
  });

  app.route("/settings", teamSettingsRoutes);
  return app;
}

describe("Team settings routes", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await getDb().collection("teamSettings").deleteMany({});
  });

  afterAll(async () => {
    await getDb().collection("teamSettings").deleteMany({});
    await disconnectMongo();
  });

  beforeEach(async () => {
    await getDb().collection("teamSettings").deleteMany({});
  });

  describe("GET /settings/ai", () => {
    it("returns defaults when no config is set", async () => {
      const app = createApp(OWNER_ID, "owner", TEAM_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/settings/ai`, { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toEqual({
        aiAnalysisEnabled: false,
      });
    });

    it("returns masked key when config is set", async () => {
      const db = getDb();
      // Manually set encrypted key in teamSettings
      const encrypted = "iv:tag:data"; // This would be real encryption in implementation
      await db.collection("teamSettings").insertOne({
        _id: TEAM_ID,
        provider: "anthropic",
        aiAnalysisEnabled: true,
        apiKey: encrypted,
        createdAt: new Date(),
      });

      const app = createApp(OWNER_ID, "owner", TEAM_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/settings/ai`, { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.provider).toBe("anthropic");
      expect(data.data.aiAnalysisEnabled).toBe(true);
      // Should be masked, not plaintext
      expect(data.data.apiKey).not.toBe(encrypted);
      expect(data.data.apiKey).toContain("...");
    });

    it("allows member+ roles to read", async () => {
      const app = createApp(MEMBER_ID, "member", TEAM_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/settings/ai`, { method: "GET" }),
      );

      expect(res.status).toBe(200);
    });
  });

  describe("PUT /settings/ai", () => {
    it("sets config for admin+", async () => {
      const app = createApp(OWNER_ID, "owner", TEAM_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/settings/ai`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "anthropic",
            apiKey: "sk-ant-test-key-minimum-10-chars-long",
          }),
        }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.provider).toBe("anthropic");
      expect(data.data.aiAnalysisEnabled).toBe(true);

      // Verify it was encrypted in database
      const db = getDb();
      const stored = await db.collection("teamSettings").findOne({ _id: TEAM_ID });
      expect(stored).toBeDefined();
      expect(stored!.provider).toBe("anthropic");
      // Should be encrypted, not plaintext
      expect(stored!.apiKey).not.toBe("sk-ant-test-key-minimum-10-chars-long");
    });

    it("rejects member role with 403", async () => {
      const app = createApp(MEMBER_ID, "member", TEAM_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/settings/ai`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "anthropic",
            apiKey: "sk-ant-test-key-minimum-10-chars-long",
          }),
        }),
      );

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe("FORBIDDEN");
    });

    it("accepts admin role", async () => {
      const app = createApp(ADMIN_ID, "admin", TEAM_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/settings/ai`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "openai",
            apiKey: "sk-proj-test-key-minimum-10-chars-long",
          }),
        }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.provider).toBe("openai");
    });

    it("rejects invalid provider", async () => {
      const app = createApp(OWNER_ID, "owner", TEAM_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/settings/ai`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "invalid",
            apiKey: "sk-test-key-minimum-10-chars-long",
          }),
        }),
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("rejects apiKey shorter than 10 chars", async () => {
      const app = createApp(OWNER_ID, "owner", TEAM_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/settings/ai`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "anthropic",
            apiKey: "short",
          }),
        }),
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("rejects missing provider", async () => {
      const app = createApp(OWNER_ID, "owner", TEAM_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/settings/ai`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: "sk-test-key-minimum-10-chars-long",
          }),
        }),
      );

      expect(res.status).toBe(400);
    });

    it("rejects missing apiKey", async () => {
      const app = createApp(OWNER_ID, "owner", TEAM_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/settings/ai`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider: "anthropic",
          }),
        }),
      );

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /settings/ai", () => {
    it("removes config for admin+", async () => {
      const db = getDb();
      await db.collection("teamSettings").insertOne({
        _id: TEAM_ID,
        provider: "anthropic",
        apiKey: "encrypted-key",
        aiAnalysisEnabled: true,
        createdAt: new Date(),
      });

      const app = createApp(OWNER_ID, "owner", TEAM_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/settings/ai`, { method: "DELETE" }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.deleted).toBe(true);

      // Verify it was deleted from database
      const stored = await db.collection("teamSettings").findOne({ _id: TEAM_ID });
      expect(stored).toBeNull();
    });

    it("returns 200 when deleting non-existent config", async () => {
      const app = createApp(OWNER_ID, "owner", TEAM_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/settings/ai`, { method: "DELETE" }),
      );

      expect(res.status).toBe(200);
    });

    it("rejects member role with 403", async () => {
      const app = createApp(MEMBER_ID, "member", TEAM_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/settings/ai`, { method: "DELETE" }),
      );

      expect(res.status).toBe(403);
    });
  });
});
