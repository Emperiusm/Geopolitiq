// api/tests/modules/reference/trade-routes.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { invalidateCache } from "../../../src/infrastructure/cache";
import { seedPorts } from "../../../src/seed/seed-ports";
import { seedChokepoints } from "../../../src/seed/seed-chokepoints";
import { seedTradeRoutes } from "../../../src/seed/seed-trade-routes";
import { tradeRoutesRouter } from "../../../src/modules/reference/trade-routes";

describe("Trade Routes API", () => {
  const app = new Hono().route("/trade-routes", tradeRoutesRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await getDb().collection("tradeRoutes").deleteMany({});
    await getDb().collection("ports").deleteMany({});
    await getDb().collection("chokepoints").deleteMany({});
    await seedPorts();
    await seedChokepoints();
    await seedTradeRoutes();
    await invalidateCache("gambit:trade-routes:*");
  });

  afterAll(async () => {
    await getDb().collection("tradeRoutes").deleteMany({});
    await getDb().collection("ports").deleteMany({});
    await getDb().collection("chokepoints").deleteMany({});
    await invalidateCache("gambit:trade-routes:*");
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /trade-routes returns paginated list", async () => {
    const res = await app.request("/trade-routes");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.meta.total).toBeGreaterThanOrEqual(21);
    expect(body.meta.limit).toBe(50);
  });

  it("GET /trade-routes/:id returns single trade route", async () => {
    const res = await app.request("/trade-routes/china-europe-suez");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("China -> Europe (Suez)");
    expect(body.data.from).toBe("shanghai");
    expect(body.data.to).toBe("rotterdam");
  });

  it("GET /trade-routes/:id without resolve returns raw waypoint IDs (no resolved field)", async () => {
    const res = await app.request("/trade-routes/china-europe-suez");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.waypoints).toBeArray();
    expect(body.data.resolved).toBeUndefined();
  });

  it("GET /trade-routes?resolve=true returns routes with resolved coordinates", async () => {
    const res = await app.request("/trade-routes?resolve=true");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    const first = body.data[0];
    expect(first.resolved).toBeDefined();
    expect(first.resolved.from).toBeDefined();
    expect(first.resolved.from).not.toBeNull();
    expect(first.resolved.from.lat).toBeNumber();
    expect(first.resolved.from.lng).toBeNumber();
    expect(first.resolved.to).toBeDefined();
    expect(first.resolved.to).not.toBeNull();
    expect(first.resolved.to.lat).toBeNumber();
    expect(first.resolved.to.lng).toBeNumber();
    expect(first.resolved.waypoints).toBeArray();
  });

  it("GET /trade-routes/:id?resolve=true returns single route with resolved coordinates", async () => {
    const res = await app.request("/trade-routes/china-europe-suez?resolve=true");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.resolved).toBeDefined();
    expect(body.data.resolved.from._id).toBe("shanghai");
    expect(body.data.resolved.from.lat).toBeNumber();
    expect(body.data.resolved.to._id).toBe("rotterdam");
    expect(body.data.resolved.waypoints).toBeArray();
    expect(body.data.resolved.waypoints.length).toBeGreaterThan(0);
    // Each waypoint should have coordinates
    for (const wp of body.data.resolved.waypoints) {
      expect(wp.lat).toBeNumber();
      expect(wp.lng).toBeNumber();
    }
  });

  it("GET /trade-routes/:id returns 404 for unknown", async () => {
    const res = await app.request("/trade-routes/nonexistent-route-xyz");
    expect(res.status).toBe(404);
  });
});
