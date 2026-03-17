// api/tests/modules/reference/countries.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { seedCountries } from "../../../src/seed/seed-countries";
import { countriesRouter } from "../../../src/modules/reference/countries";

describe("Countries API", () => {
  const app = new Hono().route("/countries", countriesRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await getDb().collection("countries").deleteMany({});
    await seedCountries();
  });

  afterAll(async () => {
    await getDb().collection("countries").deleteMany({});
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /countries returns paginated list", async () => {
    const res = await app.request("/countries");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.meta.total).toBeGreaterThanOrEqual(190);
    expect(body.meta.limit).toBe(50);
  });

  it("GET /countries?risk=catastrophic filters by risk", async () => {
    const res = await app.request("/countries?risk=catastrophic");
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    for (const c of body.data) {
      expect(c.risk).toBe("catastrophic");
    }
  });

  it("GET /countries?fields=name,lat,lng returns sparse fields", async () => {
    const res = await app.request("/countries?fields=name,lat,lng&limit=5");
    const body = await res.json();
    expect(body.data[0].name).toBeDefined();
    expect(body.data[0].lat).toBeDefined();
    expect(body.data[0].analysis).toBeUndefined();
  });

  it("GET /countries/:id returns single country", async () => {
    const res = await app.request("/countries/ukraine");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Ukraine");
    expect(body.data.iso2).toBe("UA");
  });

  it("GET /countries/:id returns 404 for unknown", async () => {
    const res = await app.request("/countries/nonexistent");
    expect(res.status).toBe(404);
  });

  it("GET /countries/risks returns risk counts", async () => {
    const res = await app.request("/countries/risks");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
  });

  it("GET /countries?q=ukraine does text search", async () => {
    const res = await app.request("/countries?q=ukraine");
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].name).toBe("Ukraine");
  });
});
