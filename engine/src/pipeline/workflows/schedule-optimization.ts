/**
 * ScheduleOptimizationWorkflow — runs weekly, analyses schedule efficiency for
 * all sources and applies updated cron schedules to under- or over-polled sources.
 *
 * IMPORTANT: This file must ONLY use @temporalio/workflow APIs.
 * No direct DB access or imports of non-workflow modules.
 */

import { proxyActivities, sleep } from '@temporalio/workflow';

// ── Activity proxies ────────────────────────────────────────────────────────

export interface ScheduleAdjustment {
  sourceId: string;
  currentSchedule: string;
  recommendedSchedule: string;
  reason: string;
}

const { analyzeScheduleEfficiency } = proxyActivities<{
  analyzeScheduleEfficiency(): Promise<ScheduleAdjustment[]>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '10 minutes',
});

const { updateSchedule } = proxyActivities<{
  updateSchedule(sourceId: string, newSchedule: string): Promise<void>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '1 minute',
});

// ── Workflow ────────────────────────────────────────────────────────────────

export interface ScheduleOptimizationResult {
  sourcesAnalyzed: number;
  schedulesUpdated: number;
  adjustments: Array<{ sourceId: string; from: string; to: string }>;
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function scheduleOptimizationWorkflow(): Promise<ScheduleOptimizationResult> {
  const result: ScheduleOptimizationResult = {
    sourcesAnalyzed: 0,
    schedulesUpdated: 0,
    adjustments: [],
  };

  // 1. Identify sources needing schedule adjustment
  const adjustments = await analyzeScheduleEfficiency();
  result.sourcesAnalyzed = adjustments.length;

  // 2. Apply each recommended schedule update
  for (const adj of adjustments) {
    await updateSchedule(adj.sourceId, adj.recommendedSchedule);
    result.schedulesUpdated++;
    result.adjustments.push({
      sourceId: adj.sourceId,
      from: adj.currentSchedule,
      to: adj.recommendedSchedule,
    });
  }

  // Schedule next run in 1 week
  await sleep(ONE_WEEK_MS);

  return result;
}
