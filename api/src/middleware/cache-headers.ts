import type { MiddlewareHandler } from "hono";

const CACHE_TTLS: Record<string, number> = {
  "/api/v1/countries": 3600,
  "/api/v1/bases": 3600,
  "/api/v1/nsa": 3600,
  "/api/v1/chokepoints": 3600,
  "/api/v1/elections": 3600,
  "/api/v1/trade-routes": 3600,
  "/api/v1/ports": 3600,
  "/api/v1/conflicts": 900,
  "/api/v1/news": 30,
  "/api/v1/bootstrap": 3600,
  "/api/v1/compare": 3600,
  "/api/v1/search": 300,
  "/api/v1/viewport": 30,
};

export const cacheHeaders: MiddlewareHandler = async (c, next) => {
  await next();

  if (c.req.method !== "GET" || c.res.status !== 200) return;

  const path = new URL(c.req.url).pathname;
  let maxAge = 0;
  for (const [prefix, ttl] of Object.entries(CACHE_TTLS)) {
    if (path.startsWith(prefix) && prefix.length > maxAge) {
      maxAge = ttl;
    }
  }

  if (maxAge > 0) {
    c.header("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${Math.floor(maxAge / 12)}`);
  }
};
