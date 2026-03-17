// api/tests/modules/aggregate/search.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { invalidateCache } from "../../../src/infrastructure/cache";
import { seedAll } from "../../../src/seed/seed-all";
import { searchRouter } from "../../../src/modules/aggregate/search";

describe("Search API", () => {
  const app = new Hono().route("/search", searchRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await invalidateCache("gambit:search:*");
    await seedAll();
  }, 30000);

  afterAll(async () => {
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /search without q returns 400", async () => {
    const res = await app.request("/search");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /search?q=a (single char) returns 400", async () => {
    const res = await app.request("/search?q=a");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toContain("2 characters");
  });

  it("GET /search?q=iran returns results across collections", async () => {
    const res = await app.request("/search?q=iran");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.countries).toBeArray();
    expect(body.data.conflicts).toBeArray();
    expect(body.data.bases).toBeArray();
    expect(body.data.nsa).toBeArray();
    expect(body.data.chokepoints).toBeArray();
    // Iran should be in countries
    expect(body.data.countries.length).toBeGreaterThan(0);
    expect(body.meta.query).toBe("iran");
    expect(body.meta.total).toBeGreaterThanOrEqual(0);
  });

  it("GET /search?q=ukraine returns ukraine in countries", async () => {
    const res = await app.request("/search?q=ukraine");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.countries.length).toBeGreaterThan(0);
    const ukraine = body.data.countries.find((c: any) => c.name === "Ukraine");
    expect(ukraine).toBeDefined();
  });

  it("GET /search?q=nonexistent returns empty results", async () => {
    const res = await app.request("/search?q=xyzzy_nonexistent_term_12345");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.countries).toBeArray();
    expect(body.data.countries.length).toBe(0);
    expect(body.meta.total).toBe(0);
  });
});
