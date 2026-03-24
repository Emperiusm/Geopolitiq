import { createMiddleware } from 'hono/factory';

const API_VERSION = '1.0.0';

export function apiVersion(engineVersion?: string) {
  const version = engineVersion ?? process.env.ENGINE_VERSION ?? '0.1.0';

  return createMiddleware(async (c, next) => {
    c.header('X-API-Version', API_VERSION);
    c.header('X-Engine-Version', version);
    await next();
  });
}
