import type { MiddlewareHandler } from "hono";
import { getRedis, isRedisConnected } from "../infrastructure/redis";

const AUTH_RPM = 10;
const memoryCounters = new Map<string, { count: number; resetAt: number }>();

export const authRateLimit: MiddlewareHandler = async (c, next) => {
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const minute = Math.floor(Date.now() / 60000);
  const key = `gambit:authrl:${ip}:${minute}`;

  let count = 0;

  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
    } catch {
      count = incrementMemory(ip, minute);
    }
  } else {
    count = incrementMemory(ip, minute);
  }

  if (count > AUTH_RPM) {
    c.header("Retry-After", "60");
    return c.json(
      { error: { code: "RATE_LIMITED", message: "Too many auth requests", action: "none" } },
      429,
    );
  }

  return next();
};

function incrementMemory(ip: string, minute: number): number {
  const key = `${ip}:${minute}`;
  const entry = memoryCounters.get(key);
  if (entry && entry.resetAt === minute) {
    entry.count++;
    return entry.count;
  }
  if (memoryCounters.size > 10000) {
    for (const [k, v] of memoryCounters) {
      if (v.resetAt < minute) memoryCounters.delete(k);
    }
  }
  memoryCounters.set(key, { count: 1, resetAt: minute });
  return 1;
}
