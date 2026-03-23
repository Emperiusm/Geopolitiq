/**
 * SourceBackfillWorkflow — Temporal workflow that backfills historical data for a source.
 *
 * Features:
 *   - Pause/resume via Temporal signals
 *   - Reverse-chronological date iteration (most recent first)
 *   - Durable checkpoint tracking via activity
 *   - Aggregated counters across all batches
 *
 * IMPORTANT: This file must ONLY use @temporalio/workflow APIs.
 * No direct DB access or imports of non-workflow modules.
 */

import { proxyActivities, setHandler, defineSignal, sleep } from '@temporalio/workflow';
import type { PipelineRunCounters } from '../types';

// ── Signals ──────────────────────────────────────────────────────────────────

export const pauseSignal = defineSignal('pause');
export const resumeSignal = defineSignal('resume');

// ── Activity proxies ────────────────────────────────────────────────────────

const { runBackfillBatch } = proxyActivities<{
  runBackfillBatch(
    sourceId: string,
    date: string,
    batchSize: number,
  ): Promise<PipelineRunCounters>;
}>({
  taskQueue: 'fetch',
  startToCloseTimeout: '30 minutes',
});

const { updateBackfillProgress } = proxyActivities<{
  updateBackfillProgress(
    sourceId: string,
    checkpoint: { lastProcessedDate: string; counters: PipelineRunCounters },
  ): Promise<void>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '30 seconds',
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns ISO date strings from endDate down to startDate (inclusive), newest first. */
function* dateRangeReverse(startDate: string, endDate: string): Generator<string> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Clamp to date-only (strip time component)
  const current = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());

  while (current >= startDay) {
    yield current.toISOString().split('T')[0];
    current.setDate(current.getDate() - 1);
  }
}

function addCounters(acc: PipelineRunCounters, batch: PipelineRunCounters): PipelineRunCounters {
  return {
    fetched: acc.fetched + batch.fetched,
    parsed: acc.parsed + batch.parsed,
    deduplicated: acc.deduplicated + batch.deduplicated,
    classified: acc.classified + batch.classified,
    resolved: acc.resolved + batch.resolved,
    written: acc.written + batch.written,
    graphed: acc.graphed + batch.graphed,
    published: acc.published + batch.published,
    failed: acc.failed + batch.failed,
    dlqd: acc.dlqd + batch.dlqd,
    costTokensIn: acc.costTokensIn + batch.costTokensIn,
    costTokensOut: acc.costTokensOut + batch.costTokensOut,
  };
}

function emptyCounters(): PipelineRunCounters {
  return {
    fetched: 0,
    parsed: 0,
    deduplicated: 0,
    classified: 0,
    resolved: 0,
    written: 0,
    graphed: 0,
    published: 0,
    failed: 0,
    dlqd: 0,
    costTokensIn: 0,
    costTokensOut: 0,
  };
}

// ── Workflow ─────────────────────────────────────────────────────────────────

/**
 * Backfills a source over a date range in reverse chronological order.
 *
 * @param sourceId   The source to backfill
 * @param startDate  Earliest date (ISO 8601 date, e.g. "2025-01-01")
 * @param endDate    Latest date (ISO 8601 date, e.g. "2026-03-01")
 * @param batchSize  Max items per batch (default 1000)
 */
export async function sourceBackfillWorkflow(
  sourceId: string,
  startDate: string,
  endDate: string,
  batchSize = 1000,
): Promise<PipelineRunCounters> {
  // ── Pause/resume state ───────────────────────────────────────────────────
  let paused = false;

  setHandler(pauseSignal, () => {
    paused = true;
  });

  setHandler(resumeSignal, () => {
    paused = false;
  });

  // ── Accumulate counters ──────────────────────────────────────────────────
  let totals = emptyCounters();

  // ── Iterate dates newest → oldest ────────────────────────────────────────
  for (const date of dateRangeReverse(startDate, endDate)) {
    // Wait while paused (poll every 5 seconds in workflow time)
    while (paused) {
      await sleep(5_000);
    }

    // Run the backfill batch for this date
    const batchCounters = await runBackfillBatch(sourceId, date, batchSize);
    totals = addCounters(totals, batchCounters);

    // Save durable checkpoint after each batch
    await updateBackfillProgress(sourceId, {
      lastProcessedDate: date,
      counters: totals,
    });
  }

  return totals;
}
