import { describe, it, expect, afterAll } from "bun:test";
import { connectRedis, disconnectRedis, getRedis } from "../../src/infrastructure/redis";

describe("Redis infrastructure", () => {
  afterAll(async () => {
    await disconnectRedis();
  });

  it("connects and returns a Redis client", async () => {
    const redis = await connectRedis("redis://localhost:6379");
    expect(redis).toBeDefined();
    expect(redis.status).toBe("ready");
  });

  it("can set and get a value", async () => {
    const redis = getRedis();
    await redis.set("gambit:test:key", "hello");
    const val = await redis.get("gambit:test:key");
    expect(val).toBe("hello");
    await redis.del("gambit:test:key");
  });
});
