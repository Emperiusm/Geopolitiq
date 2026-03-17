import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectRedis, disconnectRedis, getRedis } from "../../src/infrastructure/redis";
import { cacheAside } from "../../src/infrastructure/cache";

describe("Cache-aside helper", () => {
  beforeAll(async () => {
    await connectRedis("redis://localhost:6379");
  });

  afterAll(async () => {
    const redis = getRedis();
    const keys = await redis.keys("gambit:test:*");
    if (keys.length) await redis.del(...keys);
    await disconnectRedis();
  });

  it("calls fetcher on cache miss and caches the result", async () => {
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { name: "test", value: 42 };
    };

    const result1 = await cacheAside("gambit:test:miss", fetcher, 60);
    expect(result1).toEqual({ name: "test", value: 42 });
    expect(fetchCount).toBe(1);

    const result2 = await cacheAside("gambit:test:miss", fetcher, 60);
    expect(result2).toEqual({ name: "test", value: 42, _cached: true });
    expect(fetchCount).toBe(1);
  });

  it("returns fetcher result when Redis is unavailable", async () => {
    await disconnectRedis();

    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { fallback: true };
    };

    const result = await cacheAside("gambit:test:noop", fetcher, 60);
    expect(result).toEqual({ fallback: true });
    expect(fetchCount).toBe(1);

    await connectRedis("redis://localhost:6379");
  });
});
