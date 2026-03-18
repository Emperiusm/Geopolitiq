/**
 * GAMBIT — API client
 *
 * Fetch wrapper with base URL, auth header support,
 * response envelope unwrapping, and error handling.
 */

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    cached?: boolean;
    freshness?: string;
  };
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Internal fetch with auth + envelope unwrap */
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  // Add auth header if we have a token
  const token = sessionStorage.getItem('gambit-token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    throw new ApiError(res.status, `API ${res.status}: ${res.statusText}`);
  }

  const json: ApiResponse<T> = await res.json();
  return json.data;
}

/** Fetch binary ArrayBuffer (for layer endpoints) */
async function requestBinary(path: string): Promise<ArrayBuffer> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {};

  const token = sessionStorage.getItem('gambit-token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (!res.ok) throw new ApiError(res.status, `Binary API ${res.status}`);
  return res.arrayBuffer();
}

// ── Public API ───────────────────────────────────────────────

export const api = {
  // Core data
  bootstrap: (slim = true, at?: string) => {
    let path = `/bootstrap?slim=${slim}`;
    if (at) path += `&at=${encodeURIComponent(at)}`;
    return request<any>(path);
  },
  countries: () => request<any[]>('/countries'),
  country: (id: string) => request<any>(`/countries/${id}`),
  bases: () => request<any[]>('/bases'),
  nsa: () => request<any[]>('/nsa'),
  chokepoints: () => request<any[]>('/chokepoints'),
  elections: () => request<any[]>('/elections'),
  tradeRoutes: () => request<any[]>('/trade-routes'),
  ports: () => request<any[]>('/ports'),
  conflicts: () => request<any[]>('/conflicts'),
  news: (limit = 50) => request<any[]>(`/news?limit=${limit}`),
  search: (q: string) => request<any[]>(`/search?q=${encodeURIComponent(q)}`),
  compare: (ids: string[]) => request<any>(`/compare?ids=${ids.join(',')}`),
  viewport: (bbox: [number, number, number, number]) =>
    request<any>(`/viewport?bbox=${bbox.join(',')}`),

  // Binary layers
  binaryBases: () => requestBinary('/layers/bases/binary'),
  binaryNsaZones: () => requestBinary('/layers/nsa-zones/binary'),
  binaryChokepoints: () => requestBinary('/layers/chokepoints/binary'),
  binaryTradeArcs: () => requestBinary('/layers/trade-arcs/binary'),
  binaryConflicts: () => requestBinary('/layers/conflicts/binary'),
  binaryPlugin: (id: string) => requestBinary(`/layers/${id}/binary`),

  // Intelligence pipeline
  timelineAt: (t: string) => request<any>(`/timeline/at?t=${encodeURIComponent(t)}`),
  timelineRange: (from: string, to: string, limit = 50) =>
    request<any[]>(`/timeline/range?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&limit=${limit}`),
  graphConnections: (entity: string, depth = 1, minWeight = 0.5) =>
    request<any>(`/graph/connections?entity=${encodeURIComponent(entity)}&depth=${depth}&minWeight=${minWeight}`),
  graphPath: (from: string, to: string) =>
    request<any>(`/graph/path?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  anomalies: (severity?: string, since?: string) => {
    const params = new URLSearchParams();
    if (severity) params.set('severity', severity);
    if (since) params.set('since', since);
    return request<any[]>(`/anomalies?${params}`);
  },
  anomalyBaseline: (type: string, id: string) =>
    request<any>(`/anomalies/baseline/${type}/${id}`),
  pluginManifests: () => request<any[]>('/plugins/manifest'),
  pluginStatus: (id: string) => request<any>(`/plugins/${id}/status`),

  // Settings
  getAiSettings: () => request<any>('/settings/ai'),
  putAiSettings: (body: any) =>
    request<any>('/settings/ai', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  deleteAiSettings: () => request<void>('/settings/ai', { method: 'DELETE' }),
};

/** Parse binary layer response: 8-byte header + Float32Array */
export function parseBinaryLayer(buffer: ArrayBuffer): {
  count: number;
  stride: number;
  data: Float32Array;
} {
  const header = new DataView(buffer);
  const count = header.getUint32(0, true);
  const stride = header.getUint32(4, true);
  const data = new Float32Array(buffer, 8);
  return { count, stride, data };
}
