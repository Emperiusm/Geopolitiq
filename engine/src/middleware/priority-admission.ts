import { createMiddleware } from 'hono/factory';
import type { TeamTier } from '@gambit/common';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Utilization threshold (0–1) above which a tier's requests are shed.
 * Enterprise is never shed (threshold = 1, i.e. never reached by definition).
 */
const SHED_THRESHOLD: Record<TeamTier, number> = {
  enterprise: 1.0,  // never shed
  pro:        0.90,
  free:       0.80,
};

/**
 * Per-pod hard cap.  Tune via env var ADMISSION_MAX_REQUESTS.
 */
const MAX_CONCURRENT = parseInt(process.env.ADMISSION_MAX_REQUESTS ?? '500', 10);

// ---------------------------------------------------------------------------
// Pod-local counter
// ---------------------------------------------------------------------------

let activeRequests = 0;

/** Exposed for testing. */
export function getActiveRequests(): number {
  return activeRequests;
}

/** Reset counter — only for test use. */
export function resetActiveRequests(): void {
  activeRequests = 0;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Tier-based load shedding.
 *
 * Tracks the number of in-flight requests for this pod.  When utilization
 * exceeds a tier's threshold the request is rejected with HTTP 503 and a
 * Retry-After header.
 *
 * Enterprise tenants are never shed.
 * Pro tenants are shed when utilization ≥ 90 %.
 * Free tenants are shed when utilization ≥ 80 %.
 */
export function priorityAdmission() {
  return createMiddleware(async (c, next) => {
    const tier = (c.get('tier') as TeamTier | undefined) ?? 'free';
    const threshold = SHED_THRESHOLD[tier] ?? SHED_THRESHOLD.free;

    const utilization = activeRequests / MAX_CONCURRENT;

    if (utilization >= threshold) {
      const retryAfter = 5; // seconds
      c.header('Retry-After', String(retryAfter));
      return c.json(
        {
          error: {
            code: 'SERVICE_OVERLOADED',
            message: `Server is under high load. ${tier} tier requests are being shed. Please retry after ${retryAfter} seconds.`,
          },
        },
        503 as any,
      );
    }

    activeRequests++;
    try {
      await next();
    } finally {
      activeRequests--;
    }
  });
}
