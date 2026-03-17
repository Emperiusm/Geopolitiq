// api/tests/modules/reference/conflicts.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { invalidateCache } from "../../../src/infrastructure/cache";
import { seedConflicts } from "../../../src/seed/seed-conflicts";
import { seedNews } from "../../../src/seed/seed-news";
import { conflictsRouter } from "../../../src/modules/reference/conflicts";

describe("Conflicts API", () => {
  const app = new Hono().route("/conflicts", conflictsRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await getDb().collection("conflicts").deleteMany({});
    await getDb().collection("news").deleteMany({});
    await seedConflicts();
    await seedNews();
    await invalidateCache("gambit:conflicts:*");
  });

  afterAll(async () => {
    await getDb().collection("conflicts").deleteMany({});
    await getDb().collection("news").deleteMany({});
    await invalidateCache("gambit:conflicts:*");
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /conflicts returns paginated list", async () => {
    const res = await app.request("/conflicts");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.meta.total).toBeGreaterThanOrEqual(4);
    expect(body.meta.limit).toBe(50);
  });

  it("GET /conflicts/:id returns single conflict", async () => {
    const res = await app.request("/conflicts/us-iran-war");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.title).toBe("US and Israel at War with Iran");
    expect(body.data.status).toBe("active");
  });

  it("GET /conflicts/:id/timeline returns conflict with timeline sorted by date descending", async () => {
    const res = await app.request("/conflicts/us-iran-war/timeline");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.conflict).toBeDefined();
    expect(body.data.conflict.title).toBe("US and Israel at War with Iran");
    expect(body.data.timeline).toBeArray();
    expect(body.data.timeline.length).toBeGreaterThan(0);
    // Verify sorted descending by publishedAt
    const dates = body.data.timeline.map((n: any) => new Date(n.publishedAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
    }
  });

  it("GET /conflicts/:id/timeline returns 404 for unknown conflict", async () => {
    const res = await app.request("/conflicts/nonexistent-conflict-xyz/timeline");
    expect(res.status).toBe(404);
  });

  it("GET /conflicts/:id returns 404 for unknown conflict", async () => {
    const res = await app.request("/conflicts/nonexistent-conflict-xyz");
    expect(res.status).toBe(404);
  });
});
