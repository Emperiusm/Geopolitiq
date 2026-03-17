// api/tests/modules/system/notification-routes.test.ts
// Tests for notification preference routes.

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { notificationRoutes } from "../../../src/modules/system/notification-routes";
import { randomUUID } from "crypto";

const BASE_URL = "http://localhost";

// Test identity constants
const USER_ID = randomUUID();
const OTHER_USER_ID = randomUUID();

function createApp(userId = USER_ID) {
  const app = new Hono();

  // Mock auth context
  app.use("*", async (c, next) => {
    c.set("userId", userId);
    await next();
  });

  app.route("/notifications", notificationRoutes);
  return app;
}

describe("Notification routes", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await getDb().collection("notificationPreferences").deleteMany({});
  });

  afterAll(async () => {
    await getDb().collection("notificationPreferences").deleteMany({});
    await disconnectMongo();
  });

  beforeEach(async () => {
    await getDb().collection("notificationPreferences").deleteMany({});
  });

  describe("GET /notifications", () => {
    it("returns defaults when none set", async () => {
      const app = createApp(USER_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/notifications`, { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toEqual({
        loginAlerts: true,
        teamInvites: true,
        anomalyDigest: "daily",
      });
    });

    it("returns stored preferences when set", async () => {
      const db = getDb();
      await db.collection("notificationPreferences").insertOne({
        _id: USER_ID,
        loginAlerts: false,
        teamInvites: true,
        anomalyDigest: "realtime",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const app = createApp(USER_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/notifications`, { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toEqual({
        loginAlerts: false,
        teamInvites: true,
        anomalyDigest: "realtime",
      });
    });

    it("returns only own preferences", async () => {
      const db = getDb();
      await db.collection("notificationPreferences").insertOne({
        _id: OTHER_USER_ID,
        loginAlerts: false,
        teamInvites: false,
        anomalyDigest: "off",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const app = createApp(USER_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/notifications`, { method: "GET" }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      // Should return defaults, not other user's prefs
      expect(data.data).toEqual({
        loginAlerts: true,
        teamInvites: true,
        anomalyDigest: "daily",
      });
    });
  });

  describe("PUT /notifications", () => {
    it("updates all preferences", async () => {
      const app = createApp(USER_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/notifications`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loginAlerts: false,
            teamInvites: false,
            anomalyDigest: "off",
          }),
        }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data).toEqual({
        loginAlerts: false,
        teamInvites: false,
        anomalyDigest: "off",
      });

      // Verify it was stored in database
      const db = getDb();
      const stored = await db
        .collection("notificationPreferences")
        .findOne({ _id: USER_ID });
      expect(stored).toBeDefined();
      expect(stored!.loginAlerts).toBe(false);
      expect(stored!.teamInvites).toBe(false);
      expect(stored!.anomalyDigest).toBe("off");
    });

    it("updates partial preferences", async () => {
      const app = createApp(USER_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/notifications`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loginAlerts: false,
          }),
        }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.loginAlerts).toBe(false);
    });

    it("validates loginAlerts as boolean", async () => {
      const app = createApp(USER_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/notifications`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loginAlerts: "yes", // invalid
          }),
        }),
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("validates teamInvites as boolean", async () => {
      const app = createApp(USER_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/notifications`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamInvites: 1, // invalid
          }),
        }),
      );

      expect(res.status).toBe(400);
    });

    it("validates anomalyDigest enum", async () => {
      const app = createApp(USER_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/notifications`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anomalyDigest: "weekly", // invalid
          }),
        }),
      );

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBeDefined();
    });

    it("accepts realtime for anomalyDigest", async () => {
      const app = createApp(USER_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/notifications`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anomalyDigest: "realtime",
          }),
        }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.anomalyDigest).toBe("realtime");
    });

    it("accepts daily for anomalyDigest", async () => {
      const app = createApp(USER_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/notifications`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anomalyDigest: "daily",
          }),
        }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.anomalyDigest).toBe("daily");
    });

    it("accepts off for anomalyDigest", async () => {
      const app = createApp(USER_ID);
      const res = await app.request(
        new Request(`${BASE_URL}/notifications`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anomalyDigest: "off",
          }),
        }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.anomalyDigest).toBe("off");
    });

    it("upserts preferences correctly", async () => {
      const db = getDb();

      // First update
      let app = createApp(USER_ID);
      let res = await app.request(
        new Request(`${BASE_URL}/notifications`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loginAlerts: false,
            teamInvites: true,
            anomalyDigest: "daily",
          }),
        }),
      );
      expect(res.status).toBe(200);

      // Second update to verify upsert
      app = createApp(USER_ID);
      res = await app.request(
        new Request(`${BASE_URL}/notifications`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anomalyDigest: "realtime",
          }),
        }),
      );

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.data.loginAlerts).toBe(false); // Preserved from first update
      expect(data.data.anomalyDigest).toBe("realtime"); // Updated
    });
  });
});
