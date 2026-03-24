import { Registry, Counter, Histogram, Gauge } from 'prom-client';

export const registry = new Registry();

// ── API metrics ──────────────────────────────────────────────────────

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});

// ── Database metrics ──────────────────────────────────────────────────

export const pgQueryDuration = new Histogram({
  name: 'pg_query_duration_seconds',
  help: 'Duration of PostgreSQL queries in seconds',
  labelNames: ['query_name', 'status'] as const,
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [registry],
});

// ── NATS metrics ──────────────────────────────────────────────────────

export const natsConsumerLag = new Gauge({
  name: 'nats_consumer_lag',
  help: 'Number of pending messages in a NATS consumer',
  labelNames: ['stream', 'consumer'] as const,
  registers: [registry],
});

export const natsPublishErrorsTotal = new Counter({
  name: 'nats_publish_errors_total',
  help: 'Total number of NATS publish errors',
  registers: [registry],
});

// ── SSE metrics ───────────────────────────────────────────────────────

export const sseActiveConnections = new Gauge({
  name: 'sse_active_connections',
  help: 'Number of active SSE connections',
  labelNames: ['tier'] as const,
  registers: [registry],
});

// ── Ingestion metrics ─────────────────────────────────────────────────

export const ingestionDlqDepth = new Gauge({
  name: 'ingestion_dlq_depth',
  help: 'Number of messages in the dead-letter queue',
  labelNames: ['source', 'stage'] as const,
  registers: [registry],
});

// ── Degradation metric ────────────────────────────────────────────────

export const apiDegradedServices = new Gauge({
  name: 'api_degraded_services',
  help: 'Number of degraded API dependencies',
  registers: [registry],
});
