// api/tests/modules/realtime/news.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { invalidateCache } from "../../../src/infrastructure/cache";
import { seedNews } from "../../../src/seed/seed-news";
import { newsRouter } from "../../../src/modules/realtime/news";

describe("News API", () => {
  const app = new Hono().route("/news", newsRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await invalidateCache("gambit:news:*");
    await getDb().collection("news").deleteMany({});
    await seedNews();
  });

  afterAll(async () => {
    await getDb().collection("news").deleteMany({});
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /news returns latest news sorted by date", async () => {
    const res = await app.request("/news");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("GET /news?conflict=us-iran-war filters by conflict", async () => {
    const res = await app.request("/news?conflict=us-iran-war");
    const body = await res.json();
    for (const n of body.data) {
      expect(n.conflictId).toBe("us-iran-war");
    }
  });

  it("GET /news?tag=CONFLICT filters by tag", async () => {
    const res = await app.request("/news?tag=CONFLICT");
    const body = await res.json();
    for (const n of body.data) {
      expect(n.tags).toContain("CONFLICT");
    }
  });
});
