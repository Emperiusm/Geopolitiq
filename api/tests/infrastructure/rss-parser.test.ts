import { describe, expect, it } from 'bun:test';
import { parseRssXml } from '../../src/infrastructure/rss-parser';

const RSS_BASIC = `<?xml version="1.0"?>
<rss version="2.0">
<channel>
<item>
  <title>Test Article</title>
  <link>https://example.com/1</link>
  <description>Summary text here</description>
  <pubDate>Mon, 17 Mar 2026 12:00:00 GMT</pubDate>
</item>
</channel>
</rss>`;

const ATOM_BASIC = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test Feed</title>
  <entry>
    <title>Atom Article</title>
    <link rel="alternate" href="https://example.com/atom/1"/>
    <summary>Atom summary text</summary>
    <published>2026-03-17T12:00:00Z</published>
  </entry>
</feed>`;

const RSS_CDATA = `<?xml version="1.0"?>
<rss version="2.0">
<channel>
<item>
  <title><![CDATA[CDATA Title & More]]></title>
  <link>https://example.com/cdata</link>
  <description><![CDATA[<p>CDATA description with <b>HTML</b></p>]]></description>
  <pubDate>Mon, 17 Mar 2026 12:00:00 GMT</pubDate>
</item>
</channel>
</rss>`;

const RSS_ENTITIES = `<?xml version="1.0"?>
<rss version="2.0">
<channel>
<item>
  <title>Title &amp; More &lt;stuff&gt;</title>
  <link>https://example.com/entities</link>
  <description>Summary with &quot;quotes&quot; and &apos;apostrophes&apos;</description>
  <pubDate>Mon, 17 Mar 2026 12:00:00 GMT</pubDate>
</item>
</channel>
</rss>`;

const RSS_HTML_SUMMARY = `<?xml version="1.0"?>
<rss version="2.0">
<channel>
<item>
  <title>HTML Summary Article</title>
  <link>https://example.com/html</link>
  <description>&lt;p&gt;Some &lt;strong&gt;bold&lt;/strong&gt; text here&lt;/p&gt;</description>
  <pubDate>Mon, 17 Mar 2026 12:00:00 GMT</pubDate>
</item>
</channel>
</rss>`;

function makeRssFeed(items: string[]): string {
  return `<?xml version="1.0"?><rss version="2.0"><channel>${items.join('')}</channel></rss>`;
}

function makeRssItem(title: string, index: number): string {
  return `<item>
    <title>${title}</title>
    <link>https://example.com/${index}</link>
    <description>Description ${index}</description>
    <pubDate>Mon, 17 Mar 2026 12:00:00 GMT</pubDate>
  </item>`;
}

describe('parseRssXml', () => {
  it('parses RSS 2.0 items with title, link, description, pubDate', () => {
    const articles = parseRssXml(RSS_BASIC, 'test-feed');
    expect(articles).toHaveLength(1);
    const article = articles[0];
    expect(article.title).toBe('Test Article');
    expect(article.link).toBe('https://example.com/1');
    expect(article.summary).toBe('Summary text here');
    expect(article.publishedAt).toEqual(new Date('Mon, 17 Mar 2026 12:00:00 GMT'));
    expect(article.source).toBe('test-feed');
  });

  it('parses Atom entries with title, link href, summary, published', () => {
    const articles = parseRssXml(ATOM_BASIC, 'atom-feed');
    expect(articles).toHaveLength(1);
    const article = articles[0];
    expect(article.title).toBe('Atom Article');
    expect(article.link).toBe('https://example.com/atom/1');
    expect(article.summary).toBe('Atom summary text');
    expect(article.publishedAt).toEqual(new Date('2026-03-17T12:00:00Z'));
    expect(article.source).toBe('atom-feed');
  });

  it('handles CDATA-wrapped content', () => {
    const articles = parseRssXml(RSS_CDATA, 'cdata-feed');
    expect(articles).toHaveLength(1);
    const article = articles[0];
    expect(article.title).toBe('CDATA Title & More');
    // CDATA description contains HTML which gets stripped
    expect(article.summary).toContain('CDATA description with');
    expect(article.summary).toContain('HTML');
    // HTML tags should be stripped
    expect(article.summary).not.toContain('<p>');
    expect(article.summary).not.toContain('<b>');
  });

  it('decodes XML entities (&amp; &lt; &gt; &quot; &apos;)', () => {
    const articles = parseRssXml(RSS_ENTITIES, 'entities-feed');
    expect(articles).toHaveLength(1);
    const article = articles[0];
    expect(article.title).toBe('Title & More <stuff>');
    expect(article.summary).toBe('Summary with "quotes" and \'apostrophes\'');
  });

  it('strips HTML from summaries', () => {
    const articles = parseRssXml(RSS_HTML_SUMMARY, 'html-feed');
    expect(articles).toHaveLength(1);
    const summary = articles[0].summary;
    expect(summary).not.toMatch(/<[^>]+>/);
    expect(summary).toContain('Some');
    expect(summary).toContain('bold');
    expect(summary).toContain('text here');
  });

  it('respects maxItems limit', () => {
    const items = Array.from({ length: 15 }, (_, i) => makeRssItem(`Article ${i + 1}`, i + 1));
    const xml = makeRssFeed(items);
    const articles = parseRssXml(xml, 'limit-feed', 5);
    expect(articles).toHaveLength(5);
  });

  it('skips items without a title', () => {
    const xmlWithNoTitle = `<?xml version="1.0"?>
<rss version="2.0">
<channel>
<item>
  <link>https://example.com/no-title</link>
  <description>No title item</description>
  <pubDate>Mon, 17 Mar 2026 12:00:00 GMT</pubDate>
</item>
<item>
  <title>Has Title</title>
  <link>https://example.com/has-title</link>
  <description>Valid item</description>
  <pubDate>Mon, 17 Mar 2026 12:00:00 GMT</pubDate>
</item>
</channel>
</rss>`;
    const articles = parseRssXml(xmlWithNoTitle, 'skip-feed');
    expect(articles).toHaveLength(1);
    expect(articles[0].title).toBe('Has Title');
  });

  it('uses current date when pubDate is invalid or missing', () => {
    const beforeTest = new Date();
    const xmlInvalidDate = `<?xml version="1.0"?>
<rss version="2.0">
<channel>
<item>
  <title>No Date Article</title>
  <link>https://example.com/nodate</link>
  <description>Article without a valid date</description>
  <pubDate>not-a-valid-date</pubDate>
</item>
</channel>
</rss>`;
    const articles = parseRssXml(xmlInvalidDate, 'nodate-feed');
    expect(articles).toHaveLength(1);
    const afterTest = new Date();
    const publishedAt = articles[0].publishedAt;
    expect(publishedAt.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
    expect(publishedAt.getTime()).toBeLessThanOrEqual(afterTest.getTime());
  });

  it('returns empty array for empty or malformed XML', () => {
    expect(parseRssXml('', 'empty-feed')).toHaveLength(0);
    expect(parseRssXml('<not-rss>garbage</not-rss>', 'garbage-feed')).toHaveLength(0);
  });

  it('sets source to feedName on all articles', () => {
    const items = Array.from({ length: 3 }, (_, i) => makeRssItem(`Article ${i + 1}`, i + 1));
    const xml = makeRssFeed(items);
    const articles = parseRssXml(xml, 'my-source');
    expect(articles.every(a => a.source === 'my-source')).toBe(true);
  });
});
