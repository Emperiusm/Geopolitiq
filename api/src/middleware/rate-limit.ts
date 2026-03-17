import type { MiddlewareHandler } from "hono";
import { getRedis, isRedisConnected } from "../infrastructure/redis";
import type { UserRole } from "../types/auth";

const ROLE_LIMITS: Record<string, number> = {
  owner: 1000,
  admin: 500,
  member: 200,
  viewer: 50,
};
const DEFAULT_RPM = 100;

const memoryCounters = new Map<string, { count: number; resetAt: number }>();

export const rateLimit: MiddlewareHandler = async (c, next) => {
  // Use userId if authenticated, fall back to IP
  const userId = c.get("userId") as string | undefined;
  const role = (c.get("role") as UserRole) || undefined;
  const identifier = userId || c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rpm = role ? (ROLE_LIMITS[role] ?? DEFAULT_RPM) : DEFAULT_RPM;

  const minute = Math.floor(Date.now() / 60000);
  const resetEpoch = (minute + 1) * 60;
  const key = `gambit:ratelimit:${identifier}:${minute}`;

  let count = 0;

  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
    } catch {
      count = incrementMemory(identifier, minute);
    }
  } else {
    count = incrementMemory(identifier, minute);
  }

  // Always set rate limit headers
  c.header("X-RateLimit-Limit", String(rpm));
  c.header("X-RateLimit-Remaining", String(Math.max(0, rpm - count)));
  c.header("X-RateLimit-Reset", String(resetEpoch));

  if (count > rpm) {
    c.header("Retry-After", String(resetEpoch - Math.floor(Date.now() / 1000)));
    return c.json({ error: { code: "RATE_LIMITED", message: "Too many requests", action: "none" } }, 429);
  }

  return next();
};

function incrementMemory(id: string, minute: number): number {
  const key = `${id}:${minute}`;
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
