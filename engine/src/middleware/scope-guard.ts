import { createMiddleware } from 'hono/factory';
import { ForbiddenError } from '@gambit/common';

export type DataScope = 'global' | 'tenant' | 'mixed';

/**
 * Annotates the request context with the intended data scope and enforces
 * that tenant-scoped routes always have a resolved team context.
 *
 * Usage:
 *   app.get('/watchlists', scopeGuard('tenant'), handler)
 *   app.get('/entities',   scopeGuard('global'),  handler)
 */
export function scopeGuard(scope: DataScope) {
  return createMiddleware(async (c, next) => {
    c.set('dataScope', scope);

    if (scope === 'tenant' || scope === 'mixed') {
      const teamId = c.get('teamId');
      if (!teamId) {
        throw new ForbiddenError('Tenant context required');
      }
    }

    await next();
  });
}
