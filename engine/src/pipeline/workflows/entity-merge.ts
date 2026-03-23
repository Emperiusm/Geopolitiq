/**
 * EntityMergeWorkflow — on-demand workflow that merges a loser entity into a
 * winner: reassigns signals, transfers aliases, updates Redis cache, tombstones
 * the loser, recomputes signal counts, and updates Neo4j and ClickHouse.
 *
 * IMPORTANT: This file must ONLY use @temporalio/workflow APIs.
 * No direct DB access or imports of non-workflow modules.
 */

import { proxyActivities } from '@temporalio/workflow';

// ── Activity proxies ────────────────────────────────────────────────────────

const { reassignSignals } = proxyActivities<{
  reassignSignals(loserId: string, winnerId: string): Promise<{ updated: number }>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '5 minutes',
});

const { transferAliases } = proxyActivities<{
  transferAliases(loserId: string, winnerId: string): Promise<{ transferred: number }>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '2 minutes',
});

const { updateResolutionCache } = proxyActivities<{
  updateResolutionCache(loserName: string, winnerId: string): Promise<void>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '1 minute',
});

const { tombstoneEntity } = proxyActivities<{
  tombstoneEntity(loserId: string, winnerId: string): Promise<void>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '1 minute',
});

const { recomputeSignalCounts } = proxyActivities<{
  recomputeSignalCounts(entityId: string): Promise<{ count: number }>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '3 minutes',
});

const { mergeNeo4jNodes } = proxyActivities<{
  mergeNeo4jNodes(loserId: string, winnerId: string): Promise<{ edgesReassigned: number }>;
}>({
  taskQueue: 'graph',
  startToCloseTimeout: '5 minutes',
});

const { redenormalizeClickHouse } = proxyActivities<{
  redenormalizeClickHouse(loserId: string, winnerId: string): Promise<{ rowsUpdated: number }>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '10 minutes',
});

// ── Workflow ────────────────────────────────────────────────────────────────

export interface EntityMergeInput {
  loserId: string;
  loserName: string;
  winnerId: string;
}

export interface EntityMergeResult {
  loserId: string;
  winnerId: string;
  signalsReassigned: number;
  aliasesTransferred: number;
  winnerSignalCount: number;
  neo4jEdgesReassigned: number;
  clickhouseRowsUpdated: number;
}

export async function entityMergeWorkflow(input: EntityMergeInput): Promise<EntityMergeResult> {
  const { loserId, loserName, winnerId } = input;

  // 1. Reassign all signals from loser to winner entity
  const signalReassign = await reassignSignals(loserId, winnerId);

  // 2. Move all resolution aliases from loser to winner
  const aliasTransfer = await transferAliases(loserId, winnerId);

  // 3. Update Redis resolution cache so loser name resolves to winner
  await updateResolutionCache(loserName, winnerId);

  // 4. Tombstone the loser entity (status=merged, meta.merged_into=winnerId)
  await tombstoneEntity(loserId, winnerId);

  // 5. Recompute signal count counter on the winner
  const countResult = await recomputeSignalCounts(winnerId);

  // 6. Merge Neo4j nodes — DETACH DELETE loser after reassigning all edges
  const neo4jResult = await mergeNeo4jNodes(loserId, winnerId);

  // 7. Redenormalize ClickHouse rows that reference the loser entity
  const chResult = await redenormalizeClickHouse(loserId, winnerId);

  return {
    loserId,
    winnerId,
    signalsReassigned: signalReassign.updated,
    aliasesTransferred: aliasTransfer.transferred,
    winnerSignalCount: countResult.count,
    neo4jEdgesReassigned: neo4jResult.edgesReassigned,
    clickhouseRowsUpdated: chResult.rowsUpdated,
  };
}
