// api/src/helpers/response.ts
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiMeta } from "../types";

export function success<T>(c: Context, data: T, meta: ApiMeta = {}, status = 200) {
  return c.json({ data, meta }, status as ContentfulStatusCode);
}

export function paginated<T>(c: Context, data: T[], total: number, limit: number, offset: number, extra: Partial<ApiMeta> = {}) {
  return c.json({
    data,
    meta: { total, limit, offset, ...extra },
  });
}

export function apiError(c: Context, code: string, message: string, status: number) {
  return c.json({ error: { code, message } }, status as ContentfulStatusCode);
}

export function notFound(c: Context, resource: string, id: string) {
  return apiError(c, "NOT_FOUND", `${resource} '${id}' not found`, 404);
}

export function validationError(c: Context, message: string) {
  return apiError(c, "VALIDATION_ERROR", message, 400);
}
