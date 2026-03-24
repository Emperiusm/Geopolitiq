import { Hono } from 'hono';
import type { ServiceContainer } from '../services/container';
import type { DegradationRegistry, ServiceName, ServiceStatus } from '../infrastructure/degradation';
import { checkPostgres } from '../infrastructure/health';

const startedAt = Date.now();

export function healthRoutes(container: ServiceContainer, degradation?: DegradationRegistry) {
  const app = new Hono();

  // ── K8s liveness ──────────────────────────────────────────────────
  // Never returns 5xx — if the process is alive, this returns 200.
  app.get('/health/live', (c) => {
    const uptimeMs = Date.now() - startedAt;
    return c.json({ alive: true, uptime: `${Math.floor(uptimeMs / 1000)}s` });
  });

  // ── K8s readiness ────────────────────────────────────────────────
  // Returns 503 when PostgreSQL (the critical dependency) is unreachable.
  app.get('/health/ready', async (c) => {
    const pgStatus = await checkPostgres(container.db);
    const ready = pgStatus === 'ok';
    return c.json(
      { ready, postgres: pgStatus },
      (ready ? 200 : 503) as any,
    );
  });

  // ── Dependency status ────────────────────────────────────────────
  // Returns statuses for all 7 tracked services via DegradationRegistry.
  // HTTP 200 when all healthy, 207 when any is degraded/down.
  app.get('/health/deps', (c) => {
    if (!degradation) {
      return c.json(
        { error: 'DegradationRegistry not available' },
        503 as any,
      );
    }

    const statuses = degradation.getAllStatuses();
    const degradedServices = degradation.getDegradedServices();
    const allHealthy = degradedServices.length === 0;

    return c.json(
      {
        healthy: allHealthy,
        services: statuses as Record<ServiceName, ServiceStatus>,
        degraded: degradedServices,
      },
      (allHealthy ? 200 : 207) as any,
    );
  });

  // ── Backward-compatible /health ───────────────────────────────────
  // Kept for any existing clients; equivalent to /health/ready but also
  // includes optional service checks and the previous response shape.
  app.get('/health', async (c) => {
    const pgStatus = await checkPostgres(container.db);

    // Build per-service degradation info if registry is available
    let degradedServices: string[] = [];
    let serviceStatuses: Record<string, string> = {};

    if (degradation) {
      serviceStatuses = degradation.getAllStatuses() as Record<string, string>;
      degradedServices = degradation.getDegradedServices();
    }

    // Sync health (if sync service is attached)
    if (container.sync) {
      try {
        const syncHealth =
          typeof container.sync.health === 'function'
            ? await container.sync.health()
            : 'not_available';
        serviceStatuses.sync = syncHealth;
      } catch {
        serviceStatuses.sync = 'error';
      }
    }

    const uptimeMs = Date.now() - startedAt;

    let status: 'ok' | 'degraded' | 'down' = 'ok';
    if (pgStatus === 'down') {
      status = 'down';
    } else if (degradedServices.length > 0) {
      status = 'degraded';
    }

    return c.json(
      {
        status,
        version: process.env.ENGINE_VERSION ?? '0.1.0',
        uptime: `${Math.floor(uptimeMs / 1000)}s`,
        services: serviceStatuses,
        timestamp: new Date().toISOString(),
      },
      (status === 'down' ? 503 : 200) as any,
    );
  });

  return app;
}
