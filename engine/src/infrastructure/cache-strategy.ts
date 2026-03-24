import { LRUCache } from 'lru-cache';
import { coalesce } from './coalesce';

// ── Cache Strategy Definitions ──────────────────────────────────────

export interface CacheStrategy {
  key: (...args: any[]) => string;
  ttl: number;               // Redis TTL in seconds
  l1: boolean;               // Whether to use L1 LRU
  staleWhileRevalidate?: number; // Serve stale up to this many seconds past TTL
  invalidateOn: string[];    // NATS event names that trigger invalidation
}

export const CACHE_STRATEGIES = {
  entityById: {
    key: (id: string) => `entity:${id}`,
    ttl: 30,
    l1: true,
    staleWhileRevalidate: 60,
    invalidateOn: ['entity.updated', 'signal.ingested'],
  },
  leaderboard: {
    key: (domain: string, cursor: string) => `leaderboard:${domain}:${cursor}`,
    ttl: 120,
    l1: false,
    staleWhileRevalidate: 300,
    invalidateOn: ['gap.recomputed'],
  },
  gapScoreByEntity: {
    key: (entityId: string) => `gap:${entityId}`,
    ttl: 60,
    l1: true,
    invalidateOn: ['gap.recomputed'],
  },
  domainTaxonomy: {
    key: () => 'domains:all',
    ttl: 3600,
    l1: true,
    invalidateOn: ['domain.updated'],
  },
} satisfies Record<string, CacheStrategy>;

// ── L2 Redis payload shape ──────────────────────────────────────────

interface L2Payload<T> {
  data: T;
  expiresAt: number; // Unix timestamp (ms)
}

// ── CachedQueryExecutor ─────────────────────────────────────────────

export class CachedQueryExecutor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private l1: LRUCache<string, any>;

  constructor(private redis: any | null) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.l1 = new LRUCache<string, any>({
      max: 1000,
      ttl: 10_000, // 10s in ms
    });
  }

  /**
   * Execute a query with L1 → L2 → L3 (fetcher) fallback.
   * Supports stale-while-revalidate when the strategy defines it.
   */
  async query<T>(
    strategy: CacheStrategy,
    keyArgs: any[],
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = strategy.key(...keyArgs);

    // L1: LRU (only if strategy enables it)
    if (strategy.l1) {
      const l1Hit = this.l1.get(cacheKey);
      if (l1Hit !== undefined) {
        return l1Hit as T;
      }
    }

    // L2: Redis
    if (this.redis) {
      try {
        const raw = await this.redis.get(cacheKey);
        if (raw) {
          const payload = JSON.parse(raw) as L2Payload<T>;
          const nowMs = Date.now();

          // Fresh hit — populate L1 and return
          if (nowMs < payload.expiresAt) {
            if (strategy.l1) {
              this.l1.set(cacheKey, payload.data);
            }
            return payload.data;
          }

          // Stale-while-revalidate: serve stale data, refresh async
          const staleWindowMs = (strategy.staleWhileRevalidate ?? 0) * 1000;
          if (staleWindowMs > 0 && nowMs < payload.expiresAt + staleWindowMs) {
            // Kick off background refresh — fire and forget via coalesce
            coalesce(`refresh:${cacheKey}`, () =>
              this._fetchAndStore(strategy, cacheKey, fetcher),
            ).catch(() => {});

            if (strategy.l1) {
              this.l1.set(cacheKey, payload.data);
            }
            return payload.data;
          }
        }
      } catch {
        // Redis unavailable — fall through to L3
      }
    }

    // L3: Fetcher (source of truth), coalesced to prevent thundering herd
    return coalesce(cacheKey, () =>
      this._fetchAndStore(strategy, cacheKey, fetcher),
    );
  }

  /** Invalidate L1 for a given key (used by NATS-driven invalidation). */
  invalidateL1(key: string): void {
    this.l1.delete(key);
  }

  /** Invalidate both L1 and L2 for a given key. */
  async invalidate(key: string): Promise<void> {
    this.l1.delete(key);
    if (this.redis) {
      await this.redis.del(key).catch(() => {});
    }
  }

  // ── Private ──────────────────────────────────────────────────────

  private async _fetchAndStore<T>(
    strategy: CacheStrategy,
    cacheKey: string,
    fetcher: () => Promise<T>,
  ): Promise<T> {
    const data = await fetcher();

    if (strategy.l1) {
      this.l1.set(cacheKey, data);
    }

    if (this.redis) {
      const payload: L2Payload<T> = {
        data,
        expiresAt: Date.now() + strategy.ttl * 1000,
      };
      this.redis
        .set(cacheKey, JSON.stringify(payload), 'EX', strategy.ttl)
        .catch(() => {});
    }

    return data;
  }
}
