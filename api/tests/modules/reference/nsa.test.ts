// api/tests/modules/reference/nsa.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { seedNSA } from "../../../src/seed/seed-nsa";
import { nsaRouter } from "../../../src/modules/reference/nsa";

describe("NSA API", () => {
  const app = new Hono().route("/nsa", nsaRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await getDb().collection("nonStateActors").deleteMany({});
    await seedNSA();
  });

  afterAll(async () => {
    await getDb().collection("nonStateActors").deleteMany({});
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /nsa returns paginated list", async () => {
    const res = await app.request("/nsa");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.meta.total).toBeGreaterThan(0);
    expect(body.meta.limit).toBe(50);
  });

  it("GET /nsa/:id returns single actor", async () => {
    const res = await app.request("/nsa/hamas");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBeDefined();
  });

  it("GET /nsa/:id returns 404 for unknown", async () => {
    const res = await app.request("/nsa/nonexistent-actor-xyz");
    expect(res.status).toBe(404);
  });

  it("GET /nsa?q=hamas does text search", async () => {
    const res = await app.request("/nsa?q=hamas");
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
  });
});
