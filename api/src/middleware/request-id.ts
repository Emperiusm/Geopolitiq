import type { MiddlewareHandler } from "hono";

let counter = 0;

export const requestId: MiddlewareHandler = async (c, next) => {
  const id = c.req.header("x-request-id") ?? `gbt-${Date.now()}-${++counter}`;
  c.set("requestId", id);
  c.header("X-Request-Id", id);
  await next();
};
