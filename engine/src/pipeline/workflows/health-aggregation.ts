/**
 * HealthAggregationWorkflow — runs hourly, computes per-source health metrics,
 * writes them to ClickHouse, and alerts on cost anomalies (z-score > 3).
 *
 * IMPORTANT: This file must ONLY use @temporalio/workflow APIs.
 * No direct DB access or imports of non-workflow modules.
 */

import { proxyActivities, sleep } from '@temporalio/workflow';

// ── Activity proxies ────────────────────────────────────────────────────────

export interface SourceHealthMetrics {
  sourceId: string;
  uptime: number;       // 0–1
  yield: number;        // signals produced / items fetched
  dlqRate: number;      // dlq items / items fetched
  costUsd: number;      // estimated cost in USD
  periodStart: string;  // ISO timestamp
  periodEnd: string;
}

export interface CostAnomaly {
  sourceId: string;
  zscore: number;
  costUsd: number;
}

const { computeSourceHealthMetrics } = proxyActivities<{
  computeSourceHealthMetrics(): Promise<SourceHealthMetrics[]>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '5 minutes',
});

const { writeHealthToClickHouse } = proxyActivities<{
  writeHealthToClickHouse(metrics: SourceHealthMetrics[]): Promise<void>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '2 minutes',
});

const { checkCostAnomalies } = proxyActivities<{
  checkCostAnomalies(): Promise<CostAnomaly[]>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '2 minutes',
});

const { alertCostAnomaly } = proxyActivities<{
  alertCostAnomaly(sourceId: string, zscore: number): Promise<void>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '30 seconds',
});

// ── Workflow ────────────────────────────────────────────────────────────────

export interface HealthAggregationResult {
  sourcesReported: number;
  anomaliesDetected: number;
  anomaliesAlerted: string[];
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function healthAggregationWorkflow(): Promise<HealthAggregationResult> {
  const result: HealthAggregationResult = {
    sourcesReported: 0,
    anomaliesDetected: 0,
    anomaliesAlerted: [],
  };

  // 1. Compute per-source health metrics (uptime, yield, DLQ rate, cost)
  const metrics = await computeSourceHealthMetrics();
  result.sourcesReported = metrics.length;

  // 2. Write to source_health_metrics table in ClickHouse
  await writeHealthToClickHouse(metrics);

  // 3. Detect cost anomalies (z-score > 3)
  const anomalies = await checkCostAnomalies();
  result.anomaliesDetected = anomalies.length;

  // 4. Alert on each anomaly
  for (const anomaly of anomalies) {
    await alertCostAnomaly(anomaly.sourceId, anomaly.zscore);
    result.anomaliesAlerted.push(anomaly.sourceId);
  }

  // Schedule next run in 1 hour
  await sleep(ONE_HOUR_MS);

  return result;
}
