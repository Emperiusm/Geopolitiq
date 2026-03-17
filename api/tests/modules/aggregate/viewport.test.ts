// api/tests/modules/aggregate/viewport.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { seedBases } from "../../../src/seed/seed-bases";
import { viewportRouter } from "../../../src/modules/aggregate/viewport";

describe("Viewport API", () => {
  const app = new Hono().route("/viewport", viewportRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await seedBases();
  }, 30000);

  afterAll(async () => {
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /viewport without bbox returns 400", async () => {
    const res = await app.request("/viewport");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.message).toContain("bbox");
  });

  it("GET /viewport with invalid bbox values returns 400", async () => {
    const res = await app.request("/viewport?bbox=abc,def,ghi,jkl&layers=bases");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("GET /viewport with valid bbox and bases layer returns data", async () => {
    // Middle East region bbox - should contain US military bases
    const res = await app.request("/viewport?bbox=44,20,60,35&layers=bases");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.bases).toBeArray();
    expect(body.data.bases.length).toBeGreaterThan(0);
    expect(body.meta.bbox).toBeArray();
    expect(body.meta.total).toBeGreaterThan(0);
  });

  it("GET /viewport with no layers returns empty data", async () => {
    const res = await app.request("/viewport?bbox=0,0,10,10");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.meta.total).toBe(0);
  });

  it("GET /viewport returns only requested layers", async () => {
    const res = await app.request("/viewport?bbox=-180,-90,180,90&layers=bases");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.bases).toBeDefined();
    expect(body.data.chokepoints).toBeUndefined();
    expect(body.data.nsa).toBeUndefined();
  });
});
