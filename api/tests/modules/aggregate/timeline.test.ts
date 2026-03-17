import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { seedAll } from "../../../src/seed/seed-all";
import { captureSnapshot, ensureSnapshotIndexes } from "../../../src/infrastructure/snapshots";
import { timelineRouter } from "../../../src/modules/aggregate/timeline";
import { bootstrapRouter } from "../../../src/modules/aggregate/bootstrap";

describe("Timeline API", () => {
  const app = new Hono();
  app.route("/timeline", timelineRouter);
  app.route("/bootstrap", bootstrapRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await getDb().collection("snapshots").deleteMany({});
    await seedAll();
    await ensureSnapshotIndexes();
    // Create a snapshot for tests
    await captureSnapshot("scheduled");
  }, 30000);

  afterAll(async () => {
    await getDb().collection("snapshots").deleteMany({});
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /timeline/at?t=<future> returns snapshot", async () => {
    const future = new Date(Date.now() + 60000).toISOString();
    const res = await app.request(`/timeline/at?t=${future}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.conflicts).toBeArray();
    expect(body.data.chokepoints).toBeArray();
    expect(body.data.countries).toBeArray();
    expect(body.data.nsa).toBeArray();
    expect(body.meta.snapshotAt).toBeDefined();
  });

  it("GET /timeline/at without t returns 400", async () => {
    const res = await app.request("/timeline/at");
    expect(res.status).toBe(400);
  });

  it("GET /timeline/at with far-past t returns null data", async () => {
    const res = await app.request("/timeline/at?t=2020-01-01T00:00:00Z");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeNull();
  });

  it("GET /timeline/range returns snapshots", async () => {
    const from = new Date(Date.now() - 60000).toISOString();
    const to = new Date(Date.now() + 60000).toISOString();
    const res = await app.request(`/timeline/range?from=${from}&to=${to}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.meta.count).toBeGreaterThan(0);
  });

  it("GET /timeline/range without from returns 400", async () => {
    const res = await app.request("/timeline/range");
    expect(res.status).toBe(400);
  });

  it("GET /bootstrap?at=<time> returns temporal bootstrap", async () => {
    const future = new Date(Date.now() + 60000).toISOString();
    const res = await app.request(`/bootstrap?at=${future}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    // Should have all bootstrap data
    expect(body.data.countries).toBeArray();
    expect(body.data.bases).toBeArray();
    expect(body.data.conflicts).toBeArray();
    expect(body.data.countryColors).toBeDefined();
    // Should have snapshot metadata
    expect(body.meta.snapshotAt).toBeDefined();
    expect(body.meta.at).toBeDefined();
  });

  it("GET /bootstrap?at=<far-past> returns 400", async () => {
    const res = await app.request("/bootstrap?at=2020-01-01T00:00:00Z");
    expect(res.status).toBe(400);
  });
});
