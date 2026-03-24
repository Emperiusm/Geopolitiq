import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenBucketRateLimiter } from '../../src/fetchers/rate-limiter';

describe('TokenBucketRateLimiter', () => {
  it('acquires token when bucket has capacity', async () => {
    const mockRedis = { eval: vi.fn().mockResolvedValue(1) };
    const limiter = new TokenBucketRateLimiter(mockRedis as any, 'test-source', 1000, 10);
    const acquired = await limiter.acquire();
    expect(acquired).toBe(true);
  });

  it('rejects when bucket is empty', async () => {
    const mockRedis = { eval: vi.fn().mockResolvedValue(0) };
    const limiter = new TokenBucketRateLimiter(mockRedis as any, 'test-source', 1000, 10);
    const acquired = await limiter.acquire();
    expect(acquired).toBe(false);
  });
});
