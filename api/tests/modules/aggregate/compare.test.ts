// api/tests/modules/aggregate/compare.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { invalidateCache } from "../../../src/infrastructure/cache";
import { seedAll } from "../../../src/seed/seed-all";
import { compareRouter } from "../../../src/modules/aggregate/compare";

describe("Compare API", () => {
  const app = new Hono().route("/compare", compareRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await invalidateCache("gambit:compare:*");
    await seedAll();
  }, 30000);

  afterAll(async () => {
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /compare without countries param returns 400", async () => {
    const res = await app.request("/compare");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toContain("countries");
  });

  it("GET /compare/colors returns colors object", async () => {
    const res = await app.request("/compare/colors");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(typeof body.data).toBe("object");
  });

  it("GET /compare?countries=US,IR returns enriched data", async () => {
    const res = await app.request("/compare?countries=US,IR");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.countries).toBeArray();
    expect(body.data.conflicts).toBeArray();
    expect(body.data.nsa).toBeArray();
    expect(body.data.bases).toBeArray();
    // Should find at least US and IR in countries
    expect(body.data.countries.length).toBeGreaterThanOrEqual(2);
  });

  it("GET /compare?countries=US,IR,UA caps at 3 countries", async () => {
    const res = await app.request("/compare?countries=US,IR,UA");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.countries).toBeArray();
    expect(body.data.countries.length).toBeLessThanOrEqual(3);
  });

  it("GET /compare?countries=US,IR,UA,CN only uses first 3 codes", async () => {
    const res = await app.request("/compare?countries=US,IR,UA,CN");
    expect(res.status).toBe(200);
    const body = await res.json();
    // CN should be excluded (4th param), result should have at most 3 countries
    expect(body.data.countries.length).toBeLessThanOrEqual(3);
  });
});
