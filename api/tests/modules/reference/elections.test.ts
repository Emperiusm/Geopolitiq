// api/tests/modules/reference/elections.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { invalidateCache } from "../../../src/infrastructure/cache";
import { seedElections } from "../../../src/seed/seed-elections";
import { electionsRouter } from "../../../src/modules/reference/elections";

describe("Elections API", () => {
  const app = new Hono().route("/elections", electionsRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await invalidateCache("gambit:elections:*");
    await getDb().collection("elections").deleteMany({});
    await seedElections();
  });

  afterAll(async () => {
    await getDb().collection("elections").deleteMany({});
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /elections returns paginated list", async () => {
    const res = await app.request("/elections");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.meta.total).toBeGreaterThan(0);
    expect(body.meta.limit).toBe(50);
  });

  it("GET /elections/:id returns single election", async () => {
    const res = await app.request("/elections/bangladesh-feb-2026");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.country).toBeDefined();
  });

  it("GET /elections/upcoming returns upcoming elections", async () => {
    const res = await app.request("/elections/upcoming");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
  });

  it("GET /elections/:id returns 404 for unknown", async () => {
    const res = await app.request("/elections/nonexistent-election-xyz");
    expect(res.status).toBe(404);
  });
});
