export interface ApiMeta {
  total?: number;
  limit?: number;
  offset?: number;
  cursor?: string | null;
  hasMore?: boolean;
  cached?: boolean;
  searchTimeMs?: number;
  computedAt?: string;
  tier?: string;
  usage?: { requestsToday: number; limit: number };
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiError {
  error: { code: string; message: string };
}
