import { createMiddleware } from 'hono/factory';

export function etag() {
  return createMiddleware(async (c, next) => {
    await next();

    // Only generate ETags for 200 responses with a body
    if (c.res.status !== 200) return;

    const body = await c.res.clone().text();
    if (!body) return;

    const hash = await hashBody(body);
    const etagValue = `"${hash}"`;

    // Check If-None-Match header
    const ifNoneMatch = c.req.header('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etagValue) {
      c.res = new Response(null, {
        status: 304,
        headers: c.res.headers,
      });
      c.res.headers.set('ETag', etagValue);
      return;
    }

    c.res.headers.set('ETag', etagValue);
  });
}

async function hashBody(body: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Use first 16 bytes (32 hex chars) for a shorter but still unique ETag
  return hashArray.slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}
