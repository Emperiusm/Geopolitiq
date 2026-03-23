import type { FetchResult, FetchedItem, SourceConfig } from '../pipeline/types';
import { BaseFetcher } from './base';

/**
 * Splits a text corpus into record blocks delimited by a given XML/SGML tag.
 * e.g. tag = 'DOCUMENT' extracts all `<DOCUMENT>...</DOCUMENT>` blocks.
 */
function splitByTag(text: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, 'gi');
  return text.match(re) ?? [];
}

/**
 * Extracts the text content of the first occurrence of an XML tag within a block.
 */
function extractTagText(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const match = block.match(re);
  return match ? match[1].trim() : undefined;
}

/**
 * BulkDownloadFetcher downloads a single (potentially large) file and splits it
 * into individual records by a configured XML/SGML record tag.
 *
 * Configuration (via source.meta):
 *   recordTag  — XML tag name that delimits records (e.g. "DOCUMENT", "item", "row")
 *   urlField   — optional field name inside each record to use as the item URL
 *   dateField  — optional field name inside each record to use as publishedAt
 */
export class BulkDownloadFetcher extends BaseFetcher {
  type = 'bulk-download';

  async fetch(source: SourceConfig): Promise<FetchResult> {
    const url = source.fetcherUrl;
    if (!url) throw new Error(`BulkDownloadFetcher: source ${source.id} has no fetcherUrl`);

    const recordTag: string = source.meta?.recordTag;
    if (!recordTag) {
      throw new Error(`BulkDownloadFetcher: source ${source.id} missing meta.recordTag`);
    }

    const urlField: string | undefined = source.meta?.urlField;
    const dateField: string | undefined = source.meta?.dateField;

    const headers = this.buildHeaders(source);
    const authToken = this.resolveAuth(source);
    if (authToken) {
      const authType = source.fetcherAuth?.type ?? 'Bearer';
      headers['Authorization'] = `${authType} ${authToken}`;
    }

    const response = await fetch(url, { headers });

    if (response.status === 304) {
      return {
        items: [],
        fetchState: source.fetcherState ?? {},
        metadata: { itemCount: 0, httpStatus: 304 },
      };
    }

    if (!response.ok) {
      throw new Error(`BulkDownloadFetcher: HTTP ${response.status} for ${url}`);
    }

    // Use ArrayBuffer + TextDecoder to handle the response body generically
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(buffer);

    const blocks = splitByTag(text, recordTag);

    const items: FetchedItem[] = blocks.map((block) => {
      const itemUrl = urlField ? extractTagText(block, urlField) : undefined;
      const publishedAt = dateField
        ? (() => {
            const raw = extractTagText(block, dateField);
            if (!raw) return undefined;
            const d = new Date(raw);
            return isNaN(d.getTime()) ? raw : d.toISOString();
          })()
        : undefined;

      return {
        raw: block,
        url: itemUrl,
        publishedAt,
        meta: {
          recordTag,
          source: url,
        },
      };
    });

    const etag = response.headers.get('etag') ?? undefined;
    const lastModified = response.headers.get('last-modified') ?? undefined;

    return {
      items,
      fetchState: {
        lastETag: etag,
        lastModified,
        lastFetchedAt: new Date().toISOString(),
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
