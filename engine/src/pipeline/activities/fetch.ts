import type { FetchResult, SourceConfig } from '../types';

/**
 * Fetch activity — dispatches to the appropriate fetcher based on source.fetcherType.
 * Dynamically imports fetcher classes to keep the activity self-contained for Temporal workers.
 */
export async function fetchActivity(source: SourceConfig, input?: any): Promise<FetchResult> {
  const { FetcherRegistry } = await import('../../fetchers/base');
  const { RssFetcher } = await import('../../fetchers/rss');
  const { ApiFetcher } = await import('../../fetchers/api');
  const { BulkDownloadFetcher } = await import('../../fetchers/bulk-download');

  const registry = new FetcherRegistry();
  registry.register(new RssFetcher());
  registry.register(new ApiFetcher());
  registry.register(new BulkDownloadFetcher());

  const fetcher = registry.get(source.fetcherType);
  return fetcher.fetch(source, input);
}
