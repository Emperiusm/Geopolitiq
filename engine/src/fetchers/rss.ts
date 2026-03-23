import type { FetchResult, FetchedItem, SourceConfig } from '../pipeline/types';
import { BaseFetcher } from './base';

/**
 * Extracts the text content of a simple XML tag, handling CDATA blocks.
 * Works on both `<tag>value</tag>` and `<tag><![CDATA[value]]></tag>` forms.
 */
function extractTagText(xml: string, tag: string): string | undefined {
  // Try CDATA form first
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();

  // Plain text form
  const plainRe = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const plainMatch = xml.match(plainRe);
  if (plainMatch) return plainMatch[1].trim();

  return undefined;
}

/**
 * Extracts the value of an attribute from a self-closing or opening tag.
 * e.g. `<link href="https://example.com"/>` → `https://example.com`
 */
function extractAttr(xml: string, tag: string, attr: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']+)["'][^>]*>`, 'i');
  const match = xml.match(re);
  return match ? match[1] : undefined;
}

/**
 * Splits an XML string into individual item/entry blocks.
 */
function splitItems(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, 'gi');
  return xml.match(re) ?? [];
}

export class RssFetcher extends BaseFetcher {
  type = 'rss';

  /**
   * Parse raw RSS 2.0 or Atom XML into FetchedItems.
   * Public so it can be used in tests without a network call.
   */
  parseRssXml(xml: string): FetchedItem[] {
    const items: FetchedItem[] = [];

    // --- RSS 2.0: <item> elements ---
    const rssItems = splitItems(xml, 'item');
    for (const block of rssItems) {
      const title = extractTagText(block, 'title');
      const link = extractTagText(block, 'link');
      const description = extractTagText(block, 'description');
      const pubDate = extractTagText(block, 'pubDate');

      const publishedAt = pubDate ? new Date(pubDate).toISOString() : undefined;

      items.push({
        raw: block,
        url: link,
        publishedAt,
        meta: {
          title,
          description,
          format: 'rss',
        },
      });
    }

    // --- Atom: <entry> elements ---
    const atomEntries = splitItems(xml, 'entry');
    for (const block of atomEntries) {
      const title = extractTagText(block, 'title');
      // Atom <link> is typically `<link href="..."/>` — try attr first, then text content
      const link = extractAttr(block, 'link', 'href') ?? extractTagText(block, 'link');
      const summary = extractTagText(block, 'summary') ?? extractTagText(block, 'content');
      const published =
        extractTagText(block, 'published') ?? extractTagText(block, 'updated');

      const publishedAt = published ? new Date(published).toISOString() : undefined;

      items.push({
        raw: block,
        url: link,
        publishedAt,
        meta: {
          title,
          summary,
          format: 'atom',
        },
      });
    }

    return items;
  }

  async fetch(source: SourceConfig): Promise<FetchResult> {
    const url = source.fetcherUrl;
    if (!url) throw new Error(`RssFetcher: source ${source.id} has no fetcherUrl`);

    const headers = this.buildHeaders(source);
    const response = await fetch(url, { headers });

    if (response.status === 304) {
      // Not modified — return empty result preserving existing state
      return {
        items: [],
        fetchState: source.fetcherState ?? {},
        metadata: {
          itemCount: 0,
          httpStatus: 304,
        },
      };
    }

    if (!response.ok) {
      throw new Error(`RssFetcher: HTTP ${response.status} for ${url}`);
    }

    const xml = await response.text();
    const items = this.parseRssXml(xml);

    const etag = response.headers.get('etag') ?? undefined;
    const lastModified = response.headers.get('last-modified') ?? undefined;

    return {
      items,
      fetchState: {
        lastETag: etag,
        lastModified,
      },
      metadata: {
        itemCount: items.length,
        httpStatus: response.status,
        etag,
        lastModified,
      },
    };
  }
}
