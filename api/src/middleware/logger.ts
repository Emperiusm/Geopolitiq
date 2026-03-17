import type { MiddlewareHandler } from "hono";

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;

  const level = c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "info";

  const log = {
    level,
    timestamp: new Date().toISOString(),
    requestId: c.get("requestId") ?? "-",
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    durationMs: ms,
  };

  if (level === "error") {
    console.error(JSON.stringify(log));
  } else if (process.env.NODE_ENV !== "test") {
    console.log(JSON.stringify(log));
  }
};
