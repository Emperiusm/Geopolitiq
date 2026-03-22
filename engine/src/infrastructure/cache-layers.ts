import { LRUCache } from 'lru-cache';
import type { Logger } from '@gambit/common';

export function createCacheStack(redis: any | null, logger: Logger) {
  const l1 = new LRUCache<string, any>({
    max: 1000,
    ttl: 5_000,
  });

  return {
    async get<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number): Promise<T> {
      const l1Hit = l1.get(key);
      if (l1Hit !== undefined) return l1Hit as T;

      if (redis) {
        try {
          const l2Hit = await redis.get(key);
          if (l2Hit) {
            const parsed = JSON.parse(l2Hit) as T;
            l1.set(key, parsed);
            return parsed;
          }
        } catch { /* Redis unavailable — skip L2 */ }
      }

      const data = await fetcher();
      l1.set(key, data);
      if (redis) {
        redis.set(key, JSON.stringify(data), 'EX', ttlSeconds).catch(() => {});
      }
      return data;
    },

    invalidate(key: string) {
      l1.delete(key);
      if (redis) redis.del(key).catch(() => {});
    },

    invalidatePattern(_pattern: string) {
      l1.clear();
      // Redis pattern invalidation is expensive — use sparingly
    },
  };
}
