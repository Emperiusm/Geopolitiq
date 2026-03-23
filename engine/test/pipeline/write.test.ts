import { describe, it, expect, vi } from 'vitest';
import { SignalWriter } from '../../src/pipeline/activities/write';

describe('SignalWriter', () => {
  it('writes a signal and returns written=true', async () => {
    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'signal:test' }])
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
        })
      }),
      schema: { signals: {}, entities: { id: 'id' } },
      eq: vi.fn(),
      sql: vi.fn(),
    };

    const writer = new SignalWriter(mockDb as any, null);
    const result = await writer.writeSignal({
      headline: 'Test',
      body: 'Body',
      publishedAt: '2026-01-01T00:00:00Z',
      category: 'news-article',
      entityNames: ['Nvidia'],
      domains: ['technology'],
      intensity: 0.5,
      confidence: 0.8,
      claims: [],
      entityId: 'entity:nvidia',
      resolvedEntity: { entityId: 'entity:nvidia', entityName: 'Nvidia', method: 'cache', confidence: 0.99 },
      secondaryEntities: [],
      contentHash: 'abc123',
    }, { id: 'source:test', name: 'Test', tier: 1, polarity: 'declarative' } as any);

    expect(result.written).toBe(true);
  });

  it('returns deduplicated=true on content hash conflict', async () => {
    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]) // empty = conflict
          })
        })
      }),
      schema: { signals: {}, entities: {} },
    };

    const writer = new SignalWriter(mockDb as any, null);
    const result = await writer.writeSignal({
      headline: 'Dupe',
      publishedAt: '2026-01-01T00:00:00Z',
      category: 'news-article',
      entityNames: [],
      domains: [],
      intensity: 0.5,
      confidence: 0.5,
      claims: [],
      entityId: 'entity:test',
      resolvedEntity: { entityId: 'entity:test', entityName: 'Test', method: 'cache', confidence: 1 },
      secondaryEntities: [],
      contentHash: 'existing-hash',
    }, { id: 'source:test', name: 'Test', tier: 1 } as any);

    expect(result.written).toBe(false);
    expect(result.deduplicated).toBe(true);
  });

  it('buffers ClickHouse rows without flushing when below threshold', async () => {
    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'signal:buf' }])
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
        })
      }),
    };

    const mockCH = { insert: vi.fn().mockResolvedValue(undefined) };
    const writer = new SignalWriter(mockDb as any, mockCH);

    await writer.writeSignal({
      headline: 'Buffered',
      publishedAt: '2026-01-01T00:00:00Z',
      category: 'news-article',
      entityNames: [],
      domains: [],
      intensity: 0.5,
      confidence: 0.5,
      claims: [],
      entityId: 'entity:buf',
      resolvedEntity: { entityId: 'entity:buf', entityName: 'Buf', method: 'cache', confidence: 1 },
      secondaryEntities: [],
      contentHash: 'buf-hash',
    }, { id: 'source:test', name: 'Test', tier: 1, polarity: 'behavioral' } as any);

    // Should not have flushed yet (below 500)
    expect(mockCH.insert).not.toHaveBeenCalled();

    // Explicit flush should fire
    await writer.flushClickHouse();
    expect(mockCH.insert).toHaveBeenCalledOnce();
  });

  it('does not throw on ClickHouse flush failure', async () => {
    const mockDb = {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoNothing: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: 'signal:err' }])
          })
        })
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined)
        })
      }),
    };

    const mockCH = { insert: vi.fn().mockRejectedValue(new Error('CH down')) };
    const writer = new SignalWriter(mockDb as any, mockCH);

    await writer.writeSignal({
      headline: 'Error',
      publishedAt: '2026-01-01T00:00:00Z',
      category: 'news-article',
      entityNames: [],
      domains: [],
      intensity: 0.5,
      confidence: 0.5,
      claims: [],
      entityId: 'entity:err',
      resolvedEntity: { entityId: 'entity:err', entityName: 'Err', method: 'cache', confidence: 1 },
      secondaryEntities: [],
      contentHash: 'err-hash',
    }, { id: 'source:test', name: 'Test', tier: 1, polarity: 'behavioral' } as any);

    // Should not throw
    await expect(writer.flushClickHouse()).resolves.toBeUndefined();
  });
});
