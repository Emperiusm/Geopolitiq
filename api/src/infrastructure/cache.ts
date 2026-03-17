import { getRedis, isRedisConnected } from "./redis";

export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<T & { _cached?: boolean }> {
  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      const cached = await redis.get(key);
      if (cached !== null) {
        return { ...JSON.parse(cached), _cached: true };
      }
    } catch {
      // Redis error — fall through to fetcher
    }
  }

  const data = await fetcher();

  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    } catch {
      // Redis error — ignore
    }
  }

  return data;
}

export async function invalidateCache(pattern: string): Promise<number> {
  if (!isRedisConnected()) return 0;
  try {
    const redis = getRedis();
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    return await redis.del(...keys);
  } catch {
    return 0;
  }
}
