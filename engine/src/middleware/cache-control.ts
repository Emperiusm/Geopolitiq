import { createMiddleware } from 'hono/factory';

export interface CacheControlOptions {
  public?: boolean;
  maxAge: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
}

/**
 * Sets Cache-Control headers appropriate for CDN caching.
 *
 * Public endpoints: Vary: Accept-Encoding
 * Private endpoints: Vary: Authorization, Accept-Encoding
 */
export function cacheControl(opts: CacheControlOptions) {
  return createMiddleware(async (c, next) => {
    await next();

    const parts: string[] = [];

    if (opts.public) {
      parts.push('public');
    } else {
      parts.push('private');
    }

    parts.push(`max-age=${opts.maxAge}`);

    if (opts.sMaxAge !== undefined) {
      parts.push(`s-maxage=${opts.sMaxAge}`);
    }

    if (opts.staleWhileRevalidate !== undefined) {
      parts.push(`stale-while-revalidate=${opts.staleWhileRevalidate}`);
    }

    c.res.headers.set('Cache-Control', parts.join(', '));

    if (opts.public) {
      c.res.headers.set('Vary', 'Accept-Encoding');
    } else {
      c.res.headers.set('Vary', 'Authorization, Accept-Encoding');
    }
  });
}
