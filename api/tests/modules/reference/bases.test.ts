// api/tests/modules/reference/bases.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { seedBases } from "../../../src/seed/seed-bases";
import { basesRouter } from "../../../src/modules/reference/bases";

describe("Bases API", () => {
  const app = new Hono().route("/bases", basesRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await getDb().collection("bases").deleteMany({});
    await seedBases();
  });

  afterAll(async () => {
    await getDb().collection("bases").deleteMany({});
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /bases returns paginated list", async () => {
    const res = await app.request("/bases");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.meta.total).toBeGreaterThanOrEqual(490);
  });

  it("GET /bases/:id returns single base", async () => {
    const res = await app.request("/bases/us-al-udeid");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Al Udeid Air Base");
  });

  it("GET /bases/nearby?lat=25&lng=51&radius=100 returns nearby bases", async () => {
    const res = await app.request("/bases/nearby?lat=25&lng=51&radius=100");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("GET /bases?country=United+States filters by country", async () => {
    const res = await app.request("/bases?country=United+States");
    const body = await res.json();
    for (const b of body.data) {
      expect(b.country).toBe("United States");
    }
  });
});
