import { describe, it, expect } from 'vitest';
import { RssParser } from '../../src/parsers/rss-parser';

describe('RssParser', () => {
  it('extracts ParsedSignal from RSS item', () => {
    const parser = new RssParser();
    const signals = parser.parse({
      items: [{
        raw: '<item>...</item>',
        url: 'https://example.com/nvidia-q4',
        publishedAt: '2026-03-21T10:00:00Z',
        meta: { title: 'Nvidia Reports Record Q4 Revenue', description: 'Nvidia posted record revenue.' }
      }],
      fetchState: {},
      metadata: { itemCount: 1, httpStatus: 200 },
    });
    expect(signals).toHaveLength(1);
    expect(signals[0].headline).toBe('Nvidia Reports Record Q4 Revenue');
    expect(signals[0].url).toBe('https://example.com/nvidia-q4');
    expect(signals[0].category).toBe('news-article');
  });

  it('extracts entity names from text', () => {
    const parser = new RssParser();
    const names = parser.extractEntityNames('Nvidia and TSMC announced a partnership for advanced chips.');
    expect(names).toContain('Nvidia');
    expect(names).toContain('TSMC');
  });

  it('filters stop words from entity names', () => {
    const parser = new RssParser();
    const names = parser.extractEntityNames('The Monday report from Washington showed results.');
    expect(names).not.toContain('The');
    expect(names).not.toContain('Monday');
  });

  it('skips items without title', () => {
    const parser = new RssParser();
    const signals = parser.parse({
      items: [{ raw: '<item/>', meta: {} }],
      fetchState: {},
      metadata: { itemCount: 1, httpStatus: 200 },
    });
    expect(signals).toHaveLength(0);
  });
});
