import { describe, it, expect } from 'vitest';

describe('Pipeline E2E', () => {
  it.todo('ingests an RSS feed through the full pipeline');
  it.todo('handles content hash dedup correctly');
  it.todo('resolves entities via Typesense fuzzy match');
  it.todo('writes claims to Neo4j graph');
  it.todo('publishes SSE events on signal ingestion');
  it.todo('tracks pipeline run counters accurately');
  it.todo('DLQs signals that fail validation');

  // These tests require running infrastructure:
  // docker compose --profile test --profile engine up -d
  // Then: bun test test/pipeline/e2e.test.ts

  it('verifies pipeline types are importable', async () => {
    const types = await import('../../src/pipeline/types');
    expect(types).toBeDefined();
    expect(typeof (types as any).PipelineRunCounters).toBe('undefined'); // it's a type, not a runtime value
  });

  it('verifies all parsers are importable', async () => {
    const rss = await import('../../src/parsers/rss-parser');
    const registry = await import('../../src/parsers/registry');
    expect(rss.RssParser).toBeDefined();
    expect(registry.ParserRegistry).toBeDefined();
  });

  it('verifies all fetchers are importable', async () => {
    const base = await import('../../src/fetchers/base');
    const rss = await import('../../src/fetchers/rss');
    const api = await import('../../src/fetchers/api');
    expect(base.FetcherRegistry).toBeDefined();
    expect(rss.RssFetcher).toBeDefined();
    expect(api.ApiFetcher).toBeDefined();
  });
});
