import type { FetchResult, FetchedItem, SourceConfig } from '../pipeline/types';
import { BaseFetcher } from './base';

type PaginationStrategy = 'none' | 'offset' | 'cursor' | 'date-range';

/**
 * Builds the paginated URL for a given strategy and current fetch state.
 */
function buildPaginatedUrl(
  baseUrl: string,
  strategy: PaginationStrategy,
  state: Record<string, any>,
  pageSize = 100,
): string {
  const url = new URL(baseUrl);

  switch (strategy) {
    case 'offset': {
      const offset = state.nextOffset ?? 0;
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('limit', String(pageSize));
      break;
    }
    case 'cursor': {
      if (state.nextCursor) {
        url.searchParams.set('cursor', state.nextCursor);
      }
      url.searchParams.set('limit', String(pageSize));
      break;
    }
    case 'date-range': {
      if (state.lastFetchedAt) {
        url.searchParams.set('since', state.lastFetchedAt);
      }
      break;
    }
    case 'none':
    default:
      break;
  }

  return url.toString();
}

/**
 * Extracts the next pagination token/offset from a JSON API response body.
 * Supports common conventions: `next_cursor`, `nextCursor`, `next_offset`, `nextOffset`.
 */
function extractNextPage(
  body: any,
  strategy: PaginationStrategy,
  currentOffset: number,
  pageSize: number,
): { hasMore: boolean; nextOffset?: number; nextCursor?: string } {
  switch (strategy) {
    case 'offset': {
      const returned = Array.isArray(body?.data)
        ? body.data.length
        : Array.isArray(body?.items)
          ? body.items.length
          : Array.isArray(body)
            ? body.length
            : 0;
      const hasMore = returned === pageSize;
      return { hasMore, nextOffset: hasMore ? currentOffset + pageSize : undefined };
    }
    case 'cursor': {
      const nextCursor = body?.next_cursor ?? body?.nextCursor ?? undefined;
      return { hasMore: Boolean(nextCursor), nextCursor };
    }
    case 'date-range':
    case 'none':
    default:
      return { hasMore: false };
  }
}

/**
 * Extracts the array of records from a JSON API response.
 * Tries `body.data`, `body.items`, `body.results`, and bare array.
 */
function extractRecords(body: any): any[] {
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.results)) return body.results;
  return [];
}

export class ApiFetcher extends BaseFetcher {
  type = 'api';

  async fetch(source: SourceConfig): Promise<FetchResult> {
    const baseUrl = source.fetcherUrl;
    if (!baseUrl) throw new Error(`ApiFetcher: source ${source.id} has no fetcherUrl`);

    const strategy = (source.fetcherPagination ?? 'none') as PaginationStrategy;
    const pageSize: number = source.meta?.pageSize ?? 100;
    const state = source.fetcherState ?? {};

    const headers = this.buildHeaders(source);

    // Inject auth token if configured
    const authToken = this.resolveAuth(source);
    if (authToken) {
      const authType = source.fetcherAuth?.type ?? 'Bearer';
      headers['Authorization'] = `${authType} ${authToken}`;
    }

    const currentOffset: number = state.nextOffset ?? 0;
    const paginatedUrl = buildPaginatedUrl(baseUrl, strategy, state, pageSize);

    const response = await fetch(paginatedUrl, {
      method: 'GET',
      headers,
    });

    if (response.status === 304) {
      return {
        items: [],
        fetchState: state,
        metadata: { itemCount: 0, httpStatus: 304 },
      };
    }

    if (!response.ok) {
      throw new Error(`ApiFetcher: HTTP ${response.status} for ${paginatedUrl}`);
    }

    const body = await response.json();
    const records = extractRecords(body);

    const items: FetchedItem[] = records.map((record) => ({
      raw: JSON.stringify(record),
      url: record.url ?? record.link ?? record.uri ?? undefined,
      publishedAt:
        record.publishedAt ??
        record.published_at ??
        record.date ??
        record.created_at ??
        undefined,
      meta: record,
    }));

    const { hasMore, nextOffset, nextCursor } = extractNextPage(
      body,
      strategy,
      currentOffset,
      pageSize,
    );

    const etag = response.headers.get('etag') ?? undefined;
    const lastModified = response.headers.get('last-modified') ?? undefined;

    const newState: Record<string, any> = {
      lastETag: etag,
      lastModified,
      lastFetchedAt: new Date().toISOString(),
    };
    if (nextOffset !== undefined) newState.nextOffset = nextOffset;
    if (nextCursor !== undefined) newState.nextCursor = nextCursor;

    return {
      items,
      fetchState: newState,
      metadata: {
        itemCount: items.length,
        httpStatus: response.status,
        etag,
        lastModified,
        hasMore,
      },
    };
  }
}
