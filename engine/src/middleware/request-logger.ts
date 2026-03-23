import { createMiddleware } from 'hono/factory';
import type { Logger } from '@gambit/common';

const SLOW_REQUEST_THRESHOLD_MS = 2000;

export function requestLogger(logger: Logger) {
  return createMiddleware(async (c, next) => {
    const start = performance.now();
    const method = c.req.method;
    const path = c.req.path;
    const requestId = c.get('requestId') as string | undefined;

    logger.info(
      { method, path, requestId },
      `${method} ${path}`,
    );

    await next();

    const durationMs = Math.round(performance.now() - start);
    const status = c.res.status;

    const logData = { method, path, status, durationMs, requestId };

    if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn(logData, `Slow request: ${method} ${path} took ${durationMs}ms`);
    } else if (status >= 500) {
      logger.error(logData, `${method} ${path} ${status} (${durationMs}ms)`);
    } else if (status >= 400) {
      logger.warn(logData, `${method} ${path} ${status} (${durationMs}ms)`);
    } else {
      logger.info(logData, `${method} ${path} ${status} (${durationMs}ms)`);
    }
  });
}
