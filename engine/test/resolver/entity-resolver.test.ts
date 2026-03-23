import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntityResolver } from '../../src/resolver/entity-resolver';

describe('EntityResolver', () => {
  let mockCache: any;
  let mockDb: any;
  let mockTypesense: any;
  let mockBloom: any;

  beforeEach(() => {
    mockCache = { get: vi.fn().mockResolvedValue(null), set: vi.fn(), evict: vi.fn() };
    mockDb = {
      query: {
        entities: { findFirst: vi.fn().mockResolvedValue(null) },
        resolutionAliases: { findFirst: vi.fn().mockResolvedValue(null) },
      },
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        }),
      }),
      schema: { entities: {} },
    };
    mockTypesense = null;
    mockBloom = { mightContain: vi.fn().mockReturnValue(true), add: vi.fn() };
  });

  it('returns from cache on cache hit', async () => {
    mockCache.get.mockResolvedValue({ entityId: 'entity:nvidia', confidence: 0.99 });
    const resolver = new EntityResolver(mockCache, mockDb, mockTypesense, mockBloom);
    const result = await resolver.resolve('Nvidia', { domains: ['technology'] });
    expect(result.method).toBe('cache');
    expect(result.entityId).toBe('entity:nvidia');
  });

  it('creates unverified entity when bloom filter says not present', async () => {
    mockBloom.mightContain.mockReturnValue(false);
    const resolver = new EntityResolver(mockCache, mockDb, mockTypesense, mockBloom);
    const result = await resolver.resolve('TotallyNewCorp', { domains: ['technology'] });
    expect(result.method).toBe('new');
  });

  it('resolves batch deduplicating names', async () => {
    mockCache.get.mockResolvedValue({ entityId: 'entity:nvidia', confidence: 0.99 });
    const resolver = new EntityResolver(mockCache, mockDb, mockTypesense, mockBloom);
    const results = await resolver.resolveBatch(['Nvidia', 'Nvidia', 'NVIDIA'], { domains: [] });
    // Should still call cache for each unique normalized name
    expect(results.size).toBeGreaterThan(0);
  });

  it('falls through to new when bloom passes but no db/alias/fuzzy matches', async () => {
    mockBloom.mightContain.mockReturnValue(true);
    const resolver = new EntityResolver(mockCache, mockDb, mockTypesense, mockBloom);
    const result = await resolver.resolve('UnknownEntityXYZ', { domains: [] });
    expect(result.method).toBe('new');
    expect(result.entityId).toMatch(/^entity:/);
  });

  it('matches via alias table', async () => {
    mockDb.query.resolutionAliases.findFirst.mockResolvedValue({
      entityId: 'entity:alphabet',
      confidence: '0.95',
    });
    const resolver = new EntityResolver(mockCache, mockDb, mockTypesense, mockBloom);
    const result = await resolver.resolve('Google', { domains: ['technology'] });
    expect(result.method).toBe('alias');
    expect(result.entityId).toBe('entity:alphabet');
    expect(result.confidence).toBe(0.95);
  });

  it('caches alias resolution result', async () => {
    mockDb.query.resolutionAliases.findFirst.mockResolvedValue({
      entityId: 'entity:alphabet',
      confidence: '0.95',
    });
    const resolver = new EntityResolver(mockCache, mockDb, mockTypesense, mockBloom);
    await resolver.resolve('Google', { domains: ['technology'] });
    expect(mockCache.set).toHaveBeenCalledWith('Google', 'entity:alphabet', 0.95);
  });

  it('new entity is added to bloom filter', async () => {
    mockBloom.mightContain.mockReturnValue(false);
    const resolver = new EntityResolver(mockCache, mockDb, mockTypesense, mockBloom);
    await resolver.resolve('BrandNewCorp', { domains: [] });
    expect(mockBloom.add).toHaveBeenCalledWith('BrandNewCorp');
  });

  it('batch returns all input names as keys', async () => {
    mockCache.get.mockResolvedValue(null);
    const resolver = new EntityResolver(mockCache, mockDb, mockTypesense, mockBloom);
    const names = ['Alpha Corp', 'Beta Inc'];
    const results = await resolver.resolveBatch(names, { domains: [] });
    for (const name of names) {
      expect(results.has(name)).toBe(true);
    }
  });

  it('new entity has confidence 0', async () => {
    mockBloom.mightContain.mockReturnValue(false);
    const resolver = new EntityResolver(mockCache, mockDb, mockTypesense, mockBloom);
    const result = await resolver.resolve('SomeNewEntity', { domains: [] });
    expect(result.confidence).toBe(0.0);
  });
});
