import type { FetchResult, SourceConfig } from '../pipeline/types';

export abstract class BaseFetcher {
  abstract type: string;
  abstract fetch(source: SourceConfig, input?: any): Promise<FetchResult>;

  protected buildHeaders(source: SourceConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'Gambit/1.0 (https://gambit.app; contact@gambit.app)',
    };
    if (source.fetcherState?.lastETag) {
      headers['If-None-Match'] = source.fetcherState.lastETag;
    }
    if (source.fetcherState?.lastModified) {
      headers['If-Modified-Since'] = source.fetcherState.lastModified;
    }
    return headers;
  }

  protected resolveAuth(source: SourceConfig): string | undefined {
    if (!source.fetcherAuth?.keyRef) return undefined;
    const value = process.env[source.fetcherAuth.keyRef];
    if (!value) throw new Error(`Missing env var: ${source.fetcherAuth.keyRef}`);
    return value;
  }
}

export class FetcherRegistry {
  private fetchers = new Map<string, BaseFetcher>();

  register(fetcher: BaseFetcher): void {
    this.fetchers.set(fetcher.type, fetcher);
  }

  get(type: string): BaseFetcher {
    const fetcher = this.fetchers.get(type);
    if (!fetcher) throw new Error(`No fetcher registered for type: ${type}`);
    return fetcher;
  }
}
