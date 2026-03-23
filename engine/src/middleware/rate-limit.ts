import { createMiddleware } from 'hono/factory';
import type { TeamTier } from '@gambit/common';

const TIER_LIMITS: Record<string, number> = {
  free: 60,
  pro: 300,
  enterprise: 3000,
};

// In-memory fallback counters: key → { count, resetAt }
const memoryCounters = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(redis: any | null) {
  return createMiddleware(async (c, next) => {
    const teamId = c.get('teamId') as string | undefined;
    if (!teamId) {
      // No team context (e.g. public endpoints) — skip rate limiting
      await next();
      return;
    }

    const tier = (c.get('tier') as TeamTier) ?? 'free';
    const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;

    const now = Date.now();
    const windowStart = Math.floor(now / 60_000) * 60_000; // current minute
    const windowEnd = windowStart + 60_000;
    const key = `ratelimit:${teamId}:${windowStart}`;

    let count: number;
    let remaining: number;

    if (redis) {
      try {
        count = await redis.incr(key);
        if (count === 1) {
          // Set expiry on first increment
          await redis.pexpire(key, 60_000);
        }
      } catch {
        // Redis unavailable, fall back to memory
        count = incrementMemory(key, windowEnd);
      }
    } else {
      count = incrementMemory(key, windowEnd);
    }

    remaining = Math.max(0, limit - count);
    const resetEpochSeconds = Math.ceil(windowEnd / 1000);

    c.header('X-RateLimit-Limit', String(limit));
    c.header('X-RateLimit-Remaining', String(remaining));
    c.header('X-RateLimit-Reset', String(resetEpochSeconds));
    c.header('X-Usage-Tier', tier);

    if (count > limit) {
      return c.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Limit: ${limit} requests/minute for ${tier} tier.`,
          },
        },
        429 as any,
      );
    }

    await next();
  });
}

function incrementMemory(key: string, resetAt: number): number {
  const entry = memoryCounters.get(key);
  if (entry && entry.resetAt === resetAt) {
    entry.count++;
    return entry.count;
  }

  // Clean stale entries periodically
  if (memoryCounters.size > 10_000) {
    const now = Date.now();
    for (const [k, v] of memoryCounters) {
      if (v.resetAt < now) memoryCounters.delete(k);
    }
  }

  memoryCounters.set(key, { count: 1, resetAt });
  return 1;
}
