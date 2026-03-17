// api/tests/modules/aggregate/bootstrap.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { invalidateCache } from "../../../src/infrastructure/cache";
import { seedAll } from "../../../src/seed/seed-all";
import { bootstrapRouter } from "../../../src/modules/aggregate/bootstrap";

describe("Bootstrap API", () => {
  const app = new Hono().route("/bootstrap", bootstrapRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await invalidateCache("gambit:bootstrap:*");
    await seedAll();
  }, 30000);

  afterAll(async () => {
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /bootstrap returns all reference data", async () => {
    const res = await app.request("/bootstrap");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.countries).toBeArray();
    expect(body.data.bases).toBeArray();
    expect(body.data.nsa).toBeArray();
    expect(body.data.chokepoints).toBeArray();
    expect(body.data.conflicts).toBeArray();
    expect(body.data.elections).toBeArray();
    expect(body.data.tradeRoutes).toBeArray();
    expect(body.data.ports).toBeArray();
    expect(body.data.countryColors).toBeDefined();
    expect(body.meta.freshness).toBeDefined();
  });

  it("GET /bootstrap?slim=true returns minimal fields", async () => {
    const res = await app.request("/bootstrap?slim=true");
    const body = await res.json();
    if (body.data.countries.length > 0) {
      expect(body.data.countries[0].analysis).toBeUndefined();
      expect(body.data.countries[0].name).toBeDefined();
    }
  });
});
