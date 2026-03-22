import { createMiddleware } from 'hono/factory';
import { GambitError } from '@gambit/common';
import type { Logger } from '@gambit/common';

export function errorHandler(logger: Logger) {
  return createMiddleware(async (c, next) => {
    try {
      await next();
    } catch (err) {
      if (err instanceof GambitError) {
        logger.warn(
          { code: err.code, status: err.status, context: err.context },
          err.message,
        );
        return c.json(
          {
            error: {
              code: err.code,
              message: err.message,
              ...(err.context ? { context: err.context } : {}),
            },
          },
          err.status as any,
        );
      }

      // Unexpected error
      const message = err instanceof Error ? err.message : 'Internal server error';
      const stack = err instanceof Error ? err.stack : undefined;
      logger.error({ err, stack }, `Unhandled error: ${message}`);

      return c.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: process.env.NODE_ENV === 'production'
              ? 'Internal server error'
              : message,
          },
        },
        500,
      );
    }
  });
}
