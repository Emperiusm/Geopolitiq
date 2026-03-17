// api/src/helpers/query.ts
export interface ListParams {
  limit: number;
  offset: number;
  q?: string;
  filters: Record<string, string>;
}

export function parseListParams(searchParams: URLSearchParams): ListParams {
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
  const q = searchParams.get("q") || undefined;

  const filterKeys = ["region", "risk", "tag", "status", "country", "type", "category", "conflict"];
  const filters: Record<string, string> = {};
  for (const key of filterKeys) {
    const val = searchParams.get(key);
    if (val) filters[key] = val;
  }

  return { limit, offset, q, filters };
}

export function parseSparseFields(fieldsParam: string | null | undefined): Record<string, 1> | null {
  if (!fieldsParam) return null;
  const obj: Record<string, 1> = {};
  for (const f of fieldsParam.split(",")) {
    const trimmed = f.trim();
    if (trimmed) obj[trimmed] = 1;
  }
  return Object.keys(obj).length > 0 ? obj : null;
}

export function buildMongoFilter(filters: Record<string, string>): Record<string, any> {
  const mongoFilter: Record<string, any> = {};
  for (const [key, val] of Object.entries(filters)) {
    if (key === "tag") {
      mongoFilter.tags = val;
    } else if (key === "conflict") {
      mongoFilter.conflictId = val;
    } else {
      mongoFilter[key] = val;
    }
  }
  return mongoFilter;
}
