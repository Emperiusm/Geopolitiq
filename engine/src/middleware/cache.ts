import { createMiddleware } from 'hono/factory';

export interface CacheOptions {
  ttlSeconds: number;
  prefix?: string;
}

export function responseCache(redis: any | null, options: CacheOptions = { ttlSeconds: 30 }) {
  const { ttlSeconds, prefix = 'response-cache' } = options;

  return createMiddleware(async (c, next) => {
    // Only cache GET requests
    if (c.req.method !== 'GET') {
      await next();
      return;
    }

    const cacheKey = `${prefix}:${c.req.url}`;

    // Try to serve from cache
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const { body, contentType, status } = JSON.parse(cached);
          c.header('X-Cache', 'HIT');
          c.header('Content-Type', contentType || 'application/json');
          return c.body(body, status);
        }
      } catch {
        // Redis unavailable — proceed without cache
      }
    }

    c.header('X-Cache', 'MISS');
    await next();

    // Cache successful responses
    if (c.res.status === 200 && redis) {
      try {
        const cloned = c.res.clone();
        const body = await cloned.text();
        const contentType = cloned.headers.get('content-type') ?? 'application/json';
        const cachePayload = JSON.stringify({
          body,
          contentType,
          status: 200,
        });
        await redis.set(cacheKey, cachePayload, 'EX', ttlSeconds);
      } catch {
        // Non-fatal — cache write failure
      }
    }
  });
}
