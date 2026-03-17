// api/tests/modules/reference/ports.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { invalidateCache } from "../../../src/infrastructure/cache";
import { seedPorts } from "../../../src/seed/seed-ports";
import { portsRouter } from "../../../src/modules/reference/ports";

describe("Ports API", () => {
  const app = new Hono().route("/ports", portsRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await getDb().collection("ports").deleteMany({});
    await seedPorts();
    await invalidateCache("gambit:ports:*");
  });

  afterAll(async () => {
    await getDb().collection("ports").deleteMany({});
    await invalidateCache("gambit:ports:*");
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /ports returns paginated list", async () => {
    const res = await app.request("/ports");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.meta.total).toBeGreaterThanOrEqual(37);
    expect(body.meta.limit).toBe(50);
    expect(body.data[0].lat).toBeNumber();
    expect(body.data[0].lng).toBeNumber();
  });

  it("GET /ports?limit=5 respects limit param", async () => {
    const res = await app.request("/ports?limit=5");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(5);
    expect(body.meta.limit).toBe(5);
  });
});
