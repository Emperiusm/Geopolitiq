export interface FetchedItem {
  raw: string;
  url?: string;
  publishedAt?: string;
  meta?: Record<string, any>;
}

export interface FetchResult {
  items: FetchedItem[];
  fetchState: Record<string, any>;
  metadata: {
    itemCount: number;
    httpStatus: number;
    etag?: string;
    lastModified?: string;
    hasMore?: boolean;
  };
}

export interface Claim {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  meta?: Record<string, any>;
}

export interface ParsedSignal {
  headline: string;
  body?: string;
  url?: string;
  publishedAt: string;
  category: string;
  entityNames: string[];
  secondaryEntityNames?: string[];
  domains: string[];
  intensity: number;
  confidence: number;
  claims: Claim[];
  tags?: string[];
  financialWeight?: { amount?: number; currency?: string; magnitude?: string };
  rawPayload?: Record<string, any>;
  meta?: Record<string, any>;
  language?: string;
  canonicalEnglishTitle?: string;
}

export interface ResolvedEntity {
  entityId: string;
  entityName: string;
  method: 'cache' | 'external-id' | 'alias' | 'fuzzy' | 'new';
  confidence: number;
}

export interface ResolvedSignal extends ParsedSignal {
  entityId: string;
  resolvedEntity: ResolvedEntity;
  secondaryEntities: ResolvedEntity[];
  contentHash: string;
  simhash?: string;
  eventFingerprint?: string;
}

export interface PipelineRunCounters {
  fetched: number;
  parsed: number;
  deduplicated: number;
  classified: number;
  resolved: number;
  written: number;
  graphed: number;
  published: number;
  failed: number;
  dlqd: number;
  costTokensIn: number;
  costTokensOut: number;
}

export interface SourceConfig {
  id: string;
  name: string;
  fetcherType: string;
  fetcherUrl?: string;
  fetcherSchedule?: string;
  fetcherPagination: string;
  fetcherAuth?: { type: string; keyRef?: string };
  fetcherRateLimitMs: number;
  fetcherState: Record<string, any>;
  parserMode: string;
  parserRef?: string;
  parserPrompt?: string;
  parserResponseSchema?: Record<string, any>;
  parserModel?: string;
  parserMaxInputTokens: number;
  parserRouting?: Record<string, any>;
  polarity?: string;
  category?: string;
  domains: string[];
  dependencies: Array<{ sourceId: string; requirement: string }>;
  upstreamGroup?: string;
  enabled: boolean;
  tier: number;
  meta: Record<string, any>;
}

export interface BatchResult {
  written: number;
  graphed: number;
  published: number;
  failed: number;
  dlqd: number;
  errors: Array<{ signalIndex: number; error: string; stage: string }>;
}
