import type { Context, Next } from 'hono';
import type { DegradationRegistry } from '../infrastructure/degradation';

/**
 * Appends X-Gambit-Degraded header listing unhealthy services after
 * each response when at least one service is degraded.
 */
export function degradationHeader(registry: DegradationRegistry) {
  return async (c: Context, next: Next) => {
    await next();
    const degraded = registry.getDegradedServices();
    if (degraded.length > 0) c.header('X-Gambit-Degraded', degraded.join(','));
  };
}
