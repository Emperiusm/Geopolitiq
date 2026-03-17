import Redis from "ioredis";

let redis: Redis | null = null;

export async function connectRedis(url?: string): Promise<Redis> {
  const redisUrl = url ?? process.env.REDIS_URL ?? "redis://localhost:6380";
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 10) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });
  await redis.connect();
  return redis;
}

export function getRedis(): Redis {
  if (!redis) throw new Error("Redis not connected. Call connectRedis() first.");
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export function isRedisConnected(): boolean {
  return redis !== null && redis.status === "ready";
}
