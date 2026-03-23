import { describe, it, expect } from 'vitest';
import type { FetchResult, ParsedSignal, Claim, PipelineRunCounters } from '../../src/pipeline/types';

describe('pipeline types', () => {
  it('FetchResult has required fields', () => {
    const result: FetchResult = {
      items: [{ raw: '<xml/>', url: 'https://example.com', publishedAt: '2026-01-01T00:00:00Z' }],
      fetchState: { lastDate: '2026-01-01' },
      metadata: { itemCount: 1, httpStatus: 200 },
    };
    expect(result.items).toHaveLength(1);
  });

  it('ParsedSignal has required fields', () => {
    const signal: ParsedSignal = {
      headline: 'Test Signal',
      body: 'Body text',
      url: 'https://example.com/article',
      publishedAt: '2026-01-01T00:00:00Z',
      category: 'news-article',
      entityNames: ['Nvidia'],
      domains: ['technology'],
      intensity: 0.5,
      confidence: 0.8,
      claims: [],
    };
    expect(signal.headline).toBe('Test Signal');
  });

  it('Claim has subject, predicate, object', () => {
    const claim: Claim = {
      subject: 'entity:nvidia',
      predicate: 'filed-patent',
      object: 'solid-state-battery',
      confidence: 0.9,
    };
    expect(claim.predicate).toBe('filed-patent');
  });
});
