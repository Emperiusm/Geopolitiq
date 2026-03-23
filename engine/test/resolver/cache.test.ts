import { describe, it, expect, vi } from 'vitest';
import { ResolutionCache } from '../../src/resolver/cache';

describe('ResolutionCache', () => {
  it('returns null on cache miss', async () => {
    const mockRedis = { get: vi.fn().mockResolvedValue(null) };
    const cache = new ResolutionCache(mockRedis as any);
    const result = await cache.get('unknown-entity');
    expect(result).toBeNull();
  });

  it('returns entity id on cache hit', async () => {
    const mockRedis = {
      get: vi.fn().mockResolvedValue(JSON.stringify({ entityId: 'entity:nvidia', confidence: 0.99 })),
    };
    const cache = new ResolutionCache(mockRedis as any);
    const result = await cache.get('nvidia');
    expect(result?.entityId).toBe('entity:nvidia');
  });

  it('normalizes names before lookup', async () => {
    const mockRedis = { get: vi.fn().mockResolvedValue(null) };
    const cache = new ResolutionCache(mockRedis as any);
    await cache.get('  NVIDIA Corporation  ');
    expect(mockRedis.get).toHaveBeenCalledWith('resolve:nvidia corporation');
  });
});
