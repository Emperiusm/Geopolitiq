/**
 * ClickHouseReconciliationWorkflow — runs hourly, finds signals written to
 * Postgres in the last 2 hours that are missing from ClickHouse, backfills them,
 * and fixes stale entity-version rows via redenormalization.
 *
 * IMPORTANT: This file must ONLY use @temporalio/workflow APIs.
 * No direct DB access or imports of non-workflow modules.
 */

import { proxyActivities, sleep } from '@temporalio/workflow';

// ── Activity proxies ────────────────────────────────────────────────────────

const { findMissingSignals } = proxyActivities<{
  findMissingSignals(): Promise<string[]>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '5 minutes',
});

const { backfillClickHouse } = proxyActivities<{
  backfillClickHouse(missingSignalIds: string[]): Promise<{ written: number }>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '10 minutes',
});

const { checkEntityVersionDrift } = proxyActivities<{
  checkEntityVersionDrift(): Promise<string[]>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '5 minutes',
});

const { redenormalizeEntities } = proxyActivities<{
  redenormalizeEntities(staleEntityIds: string[]): Promise<{ updated: number }>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '10 minutes',
});

// ── Workflow ────────────────────────────────────────────────────────────────

export interface ClickHouseReconciliationResult {
  missingSignalsFound: number;
  signalsBackfilled: number;
  staleEntitiesFound: number;
  entitiesRedenormalized: number;
}

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function clickhouseReconciliationWorkflow(): Promise<ClickHouseReconciliationResult> {
  const result: ClickHouseReconciliationResult = {
    missingSignalsFound: 0,
    signalsBackfilled: 0,
    staleEntitiesFound: 0,
    entitiesRedenormalized: 0,
  };

  // 1. Find signals in PG (last 2h) that are absent from CH
  const missingSignalIds = await findMissingSignals();
  result.missingSignalsFound = missingSignalIds.length;

  // 2. Backfill missing rows into ClickHouse
  if (missingSignalIds.length > 0) {
    const backfillResult = await backfillClickHouse(missingSignalIds);
    result.signalsBackfilled = backfillResult.written;
  }

  // 3. Find entity rows in CH with stale version numbers
  const staleEntityIds = await checkEntityVersionDrift();
  result.staleEntitiesFound = staleEntityIds.length;

  // 4. Redenormalize stale entity rows in ClickHouse
  if (staleEntityIds.length > 0) {
    const redenormResult = await redenormalizeEntities(staleEntityIds);
    result.entitiesRedenormalized = redenormResult.updated;
  }

  // Schedule next run in 1 hour
  await sleep(ONE_HOUR_MS);

  return result;
}
