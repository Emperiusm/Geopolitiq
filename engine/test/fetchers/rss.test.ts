import { describe, it, expect } from 'vitest';
import { RssFetcher } from '../../src/fetchers/rss';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('RssFetcher', () => {
  it('parses RSS feed into FetchedItems', () => {
    const xml = readFileSync(resolve(__dirname, '../fixtures/rss-sample.xml'), 'utf-8');
    const fetcher = new RssFetcher();
    const result = fetcher.parseRssXml(xml);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].url).toBeDefined();
    expect(result[0].publishedAt).toBeDefined();
  });

  it('handles CDATA in RSS fields', () => {
    const xml = `<item><title><![CDATA[Test & Title]]></title><link>https://example.com</link><pubDate>Sat, 21 Mar 2026 10:00:00 GMT</pubDate></item>`;
    const fetcher = new RssFetcher();
    const items = fetcher.parseRssXml(xml);
    expect(items[0].meta?.title).toBe('Test & Title');
  });

  it('handles Atom feed format', () => {
    const xml = `<entry><title>Atom Entry</title><link href="https://example.com/atom"/><published>2026-03-21T10:00:00Z</published><summary>Summary text</summary></entry>`;
    const fetcher = new RssFetcher();
    const items = fetcher.parseRssXml(xml);
    expect(items.length).toBeGreaterThan(0);
  });
});
