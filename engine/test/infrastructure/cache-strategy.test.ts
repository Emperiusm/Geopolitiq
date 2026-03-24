import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CachedQueryExecutor, CACHE_STRATEGIES } from '../../src/infrastructure/cache-strategy';

// ── Redis mock factory ────────────────────────────────────────────────

function makeRedisMock(overrides: Partial<{
  get: (key: string) => Promise<string | null>;
  set: (...args: any[]) => Promise<'OK'>;
  del: (key: string) => Promise<number>;
}> = {}) {
  return {
    get: vi.fn(overrides.get ?? (() => Promise.resolve(null))),
    set: vi.fn(overrides.set ?? (() => Promise.resolve('OK'))),
    del: vi.fn(overrides.del ?? (() => Promise.resolve(1))),
  };
}

// ── Helpers ───────────────────────────────────────────────────────────

function makePayload<T>(data: T, ttlSeconds: number, offsetMs = 0) {
  return JSON.stringify({
    data,
    expiresAt: Date.now() + ttlSeconds * 1000 + offsetMs,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('CachedQueryExecutor', () => {
  const strategy = CACHE_STRATEGIES.entityById;
  const entityId = 'entity-001';
  const cacheKey = strategy.key(entityId);
  const fakeEntity = { id: entityId, name: 'Acme Corp' };

  describe('L1 cache hit', () => {
    it('returns data from L1 without consulting Redis or fetcher', async () => {
      const redis = makeRedisMock();
      const executor = new CachedQueryExecutor(redis);
      const fetcher = vi.fn().mockResolvedValue(fakeEntity);

      // Prime L1 via first query
      await executor.query(strategy, [entityId], fetcher);

      // Reset Redis spy — should not be called again
      redis.get.mockClear();
      fetcher.mockClear();

      const result = await executor.query(strategy, [entityId], fetcher);

      expect(result).toEqual(fakeEntity);
      expect(redis.get).not.toHaveBeenCalled();
      expect(fetcher).not.toHaveBeenCalled();
    });
  });

  describe('L2 cache hit (Redis fresh)', () => {
    it('returns data from Redis and populates L1', async () => {
      const redis = makeRedisMock({
        get: () => Promise.resolve(makePayload(fakeEntity, 30)),
      });
      const executor = new CachedQueryExecutor(redis);
      const fetcher = vi.fn();

      const result = await executor.query(strategy, [entityId], fetcher);

      expect(result).toEqual(fakeEntity);
      expect(redis.get).toHaveBeenCalledWith(cacheKey);
      expect(fetcher).not.toHaveBeenCalled();
    });
  });

  describe('L3 fetcher (cache miss)', () => {
    it('calls fetcher when Redis returns null, stores result in Redis', async () => {
      const redis = makeRedisMock({
        get: () => Promise.resolve(null),
      });
      const executor = new CachedQueryExecutor(redis);
      const fetcher = vi.fn().mockResolvedValue(fakeEntity);

      const result = await executor.query(strategy, [entityId], fetcher);

      expect(result).toEqual(fakeEntity);
      expect(fetcher).toHaveBeenCalledOnce();
      expect(redis.set).toHaveBeenCalledWith(
        cacheKey,
        expect.stringContaining(JSON.stringify(fakeEntity.id).slice(1, -1)),
        'EX',
        strategy.ttl,
      );
    });
  });

  describe('stale-while-revalidate', () => {
    it('returns stale data and triggers async revalidation', async () => {
      // Payload is expired (expiresAt in the past) but within stale window
      const stalePayload = JSON.stringify({
        data: fakeEntity,
        expiresAt: Date.now() - 5_000, // 5 seconds stale
      });

      const redis = makeRedisMock({
        get: () => Promise.resolve(stalePayload),
      });
      const executor = new CachedQueryExecutor(redis);
      const freshEntity = { id: entityId, name: 'Acme Corp (updated)' };
      const fetcher = vi.fn().mockResolvedValue(freshEntity);

      const result = await executor.query(strategy, [entityId], fetcher);

      // Should return stale data immediately
      expect(result).toEqual(fakeEntity);

      // Background refresh should eventually call the fetcher
      // Allow microtasks to flush
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(fetcher).toHaveBeenCalledOnce();
    });

    it('does NOT serve stale when staleWhileRevalidate is 0 (no SWR configured)', async () => {
      const strategyNoSWR = {
        ...CACHE_STRATEGIES.gapScoreByEntity,
        staleWhileRevalidate: undefined,
      };
      const entityKey = strategyNoSWR.key(entityId);

      // Payload is expired
      const stalePayload = JSON.stringify({
        data: fakeEntity,
        expiresAt: Date.now() - 10_000,
      });

      let getCalled = 0;
      const redis = makeRedisMock({
        get: () => { getCalled++; return Promise.resolve(stalePayload); },
      });
      const executor = new CachedQueryExecutor(redis);
      const freshEntity = { id: entityId, name: 'Fresh' };
      const fetcher = vi.fn().mockResolvedValue(freshEntity);

      const result = await executor.query(strategyNoSWR, [entityId], fetcher);

      // Should fall through to fetcher for fresh data
      expect(fetcher).toHaveBeenCalledOnce();
      expect(result).toEqual(freshEntity);
    });
  });

  describe('L1 disabled for strategy', () => {
    it('does not store result in L1 when strategy.l1 is false', async () => {
      const leaderboardStrategy = CACHE_STRATEGIES.leaderboard;
      const redis = makeRedisMock({
        get: () => Promise.resolve(makePayload({ items: [] }, 120)),
      });
      const executor = new CachedQueryExecutor(redis);
      const fetcher = vi.fn();

      // First query — Redis hit
      await executor.query(leaderboardStrategy, ['geopolitics', 'cursor-0'], fetcher);
      redis.get.mockClear();

      // Second query — should still hit Redis (L1 was not populated)
      await executor.query(leaderboardStrategy, ['geopolitics', 'cursor-0'], fetcher);
      expect(redis.get).toHaveBeenCalledOnce();
      expect(fetcher).not.toHaveBeenCalled();
    });
  });

  describe('Redis unavailable', () => {
    it('falls through to fetcher gracefully when Redis throws', async () => {
      const redis = makeRedisMock({
        get: () => Promise.reject(new Error('ECONNREFUSED')),
      });
      const executor = new CachedQueryExecutor(redis);
      const fetcher = vi.fn().mockResolvedValue(fakeEntity);

      const result = await executor.query(strategy, [entityId], fetcher);

      expect(result).toEqual(fakeEntity);
      expect(fetcher).toHaveBeenCalledOnce();
    });

    it('works with null redis client', async () => {
      const executor = new CachedQueryExecutor(null);
      const fetcher = vi.fn().mockResolvedValue(fakeEntity);

      const result = await executor.query(strategy, [entityId], fetcher);

      expect(result).toEqual(fakeEntity);
      expect(fetcher).toHaveBeenCalledOnce();
    });
  });

  describe('invalidateL1', () => {
    it('removes a key from L1 so next call hits L2/L3', async () => {
      const redis = makeRedisMock();
      const executor = new CachedQueryExecutor(redis);
      const fetcher = vi.fn().mockResolvedValue(fakeEntity);

      // Prime L1
      await executor.query(strategy, [entityId], fetcher);
      fetcher.mockClear();
      redis.get.mockClear();

      // Invalidate L1 for this key
      executor.invalidateL1(cacheKey);

      // Next call should miss L1 and consult Redis
      await executor.query(strategy, [entityId], fetcher);
      expect(redis.get).toHaveBeenCalledWith(cacheKey);
    });
  });

  describe('invalidate (full)', () => {
    it('removes from L1 and calls Redis DEL', async () => {
      const redis = makeRedisMock();
      const executor = new CachedQueryExecutor(redis);
      const fetcher = vi.fn().mockResolvedValue(fakeEntity);

      // Prime L1
      await executor.query(strategy, [entityId], fetcher);

      await executor.invalidate(cacheKey);

      expect(redis.del).toHaveBeenCalledWith(cacheKey);
    });
  });

  describe('CACHE_STRATEGIES key builders', () => {
    it('entityById produces expected key', () => {
      expect(CACHE_STRATEGIES.entityById.key('abc123')).toBe('entity:abc123');
    });

    it('leaderboard produces domain+cursor key', () => {
      expect(CACHE_STRATEGIES.leaderboard.key('geopolitics', 'c1')).toBe(
        'leaderboard:geopolitics:c1',
      );
    });

    it('gapScoreByEntity produces expected key', () => {
      expect(CACHE_STRATEGIES.gapScoreByEntity.key('e-42')).toBe('gap:e-42');
    });

    it('domainTaxonomy produces fixed key', () => {
      expect(CACHE_STRATEGIES.domainTaxonomy.key()).toBe('domains:all');
    });
  });
});
