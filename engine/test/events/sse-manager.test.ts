import { describe, it, expect, vi } from 'vitest';
import { SSEManager } from '../../src/events/sse-manager';

function makeMockRedis() {
  return {
    duplicate: vi.fn().mockReturnThis(),
    publish: vi.fn().mockResolvedValue(1),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue('OK'),
    on: vi.fn(),
    off: vi.fn(),
  };
}

describe('SSEManager', () => {
  it('publishes to all expected channels on publishSignalIngested', async () => {
    const mockRedis = makeMockRedis();
    const manager = new SSEManager(mockRedis as any);

    const signal = {
      entityId: 'entity:nvidia',
      resolvedEntity: { entityId: 'entity:nvidia', entityName: 'Nvidia', method: 'cache', confidence: 0.99 },
      headline: 'Nvidia reports record revenue',
      category: 'news-article',
      intensity: 0.8,
      confidence: 0.9,
      domains: ['technology'],
      publishedAt: '2026-01-01T00:00:00Z',
      contentHash: 'abc123',
      entityNames: ['Nvidia'],
      secondaryEntities: [],
      claims: [],
    } as any;

    const source = { id: 'source:reuters', name: 'Reuters', tier: 1, polarity: 'behavioral' } as any;

    await manager.publishSignalIngested(signal, source);

    // Should publish to 3 channels: global, entity, source
    expect(mockRedis.publish).toHaveBeenCalledTimes(3);

    const calls = mockRedis.publish.mock.calls.map((c: any[]) => c[0]);
    expect(calls).toContain('sse:global');
    expect(calls).toContain('sse:entity:entity:nvidia');
    expect(calls).toContain('sse:source:source:reuters');
  });

  it('suppresses backfill signals', async () => {
    const mockRedis = makeMockRedis();
    const manager = new SSEManager(mockRedis as any);

    const signal = {
      entityId: 'entity:test',
      resolvedEntity: { entityId: 'entity:test', entityName: 'Test', method: 'cache', confidence: 1 },
      headline: 'Old News',
      category: 'news-article',
      intensity: 0.5,
      confidence: 0.5,
      domains: [],
      publishedAt: '2020-01-01T00:00:00Z',
      contentHash: 'backfill-hash',
      isBackfill: true,
      entityNames: [],
      secondaryEntities: [],
      claims: [],
    } as any;

    const source = { id: 'source:test', name: 'Test', tier: 1 } as any;

    await manager.publishSignalIngested(signal, source);

    expect(mockRedis.publish).not.toHaveBeenCalled();
  });

  it('shuts down both connections', async () => {
    const mockRedis = makeMockRedis();
    const manager = new SSEManager(mockRedis as any);

    await manager.shutdown();

    // Both publisher and subscriber should call quit
    expect(mockRedis.quit).toHaveBeenCalledTimes(2);
  });

  it('does not throw on publish failure', async () => {
    const mockRedis = makeMockRedis();
    mockRedis.publish.mockRejectedValue(new Error('Redis down'));
    const manager = new SSEManager(mockRedis as any);

    const signal = {
      entityId: 'entity:err',
      resolvedEntity: { entityId: 'entity:err', entityName: 'Err', method: 'cache', confidence: 1 },
      headline: 'Error test',
      category: 'news-article',
      intensity: 0.5,
      confidence: 0.5,
      domains: [],
      publishedAt: '2026-01-01T00:00:00Z',
      contentHash: 'err-hash',
      entityNames: [],
      secondaryEntities: [],
      claims: [],
    } as any;

    const source = { id: 'source:err', name: 'Err', tier: 1 } as any;

    await expect(manager.publishSignalIngested(signal, source)).resolves.toBeUndefined();
  });
});
