import type { MiddlewareHandler } from "hono";

export const apiKeyAuth: MiddlewareHandler = async (c, next) => {
  const isDev = (process.env.NODE_ENV ?? "development") !== "production";
  if (isDev) return next();

  const key = c.req.header("x-api-key");
  const expected = process.env.API_KEY;

  if (!expected || key === expected) return next();

  return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid or missing API key" } }, 401);
};
