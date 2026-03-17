import { getRedis, isRedisConnected } from "./redis";

export async function cacheBinaryAside(
  key: string,
  fetcher: () => Promise<Buffer>,
  ttlSeconds: number,
): Promise<Buffer> {
  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      const cached = await redis.getBuffer(key);
      if (cached !== null) return cached;
    } catch {
      // Redis error — fall through to fetcher
    }
  }

  const buf = await fetcher();

  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      await redis.set(key, buf, "EX", ttlSeconds);
    } catch {
      // Redis error — ignore
    }
  }

  return buf;
}
