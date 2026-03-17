// api/tests/modules/reference/chokepoints.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { seedChokepoints } from "../../../src/seed/seed-chokepoints";
import { chokepointsRouter } from "../../../src/modules/reference/chokepoints";

describe("Chokepoints API", () => {
  const app = new Hono().route("/chokepoints", chokepointsRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await getDb().collection("chokepoints").deleteMany({});
    await seedChokepoints();
  });

  afterAll(async () => {
    await getDb().collection("chokepoints").deleteMany({});
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /chokepoints returns paginated list", async () => {
    const res = await app.request("/chokepoints");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.meta.total).toBeGreaterThan(0);
    expect(body.meta.limit).toBe(50);
  });

  it("GET /chokepoints/:id returns single chokepoint", async () => {
    const res = await app.request("/chokepoints/hormuz");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBeDefined();
  });

  it("GET /chokepoints/:id returns 404 for unknown", async () => {
    const res = await app.request("/chokepoints/nonexistent-chokepoint-xyz");
    expect(res.status).toBe(404);
  });
});
