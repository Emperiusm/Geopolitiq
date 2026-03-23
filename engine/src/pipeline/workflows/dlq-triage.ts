/**
 * DlqTriageWorkflow — runs every 6 hours per source, groups DLQ items by
 * stage + error signature, canary-retries one item per group, then bulk-retries
 * or escalates to needs-review.
 *
 * IMPORTANT: This file must ONLY use @temporalio/workflow APIs.
 * No direct DB access or imports of non-workflow modules.
 */

import { proxyActivities, sleep } from '@temporalio/workflow';

// ── Activity proxies ────────────────────────────────────────────────────────

export interface DlqGroup {
  groupId: string;
  stage: string;
  errorSignature: string;
  itemIds: string[];
  oldestItemId: string;
  attemptCount: number;
}

const { groupDlqItems } = proxyActivities<{
  groupDlqItems(sourceId: string): Promise<DlqGroup[]>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '2 minutes',
});

const { retryDlqItem } = proxyActivities<{
  retryDlqItem(itemId: string): Promise<{ success: boolean; error?: string }>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '5 minutes',
});

const { bulkRetryDlqGroup } = proxyActivities<{
  bulkRetryDlqGroup(groupId: string): Promise<{ retried: number }>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '10 minutes',
});

const { markNeedsReview } = proxyActivities<{
  markNeedsReview(itemIds: string[]): Promise<void>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '1 minute',
});

const { incrementDlqAttemptCount } = proxyActivities<{
  incrementDlqAttemptCount(groupId: string): Promise<number>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '30 seconds',
});

// ── Workflow ────────────────────────────────────────────────────────────────

export interface DlqTriageResult {
  sourceId: string;
  groupsProcessed: number;
  groupsRetried: number;
  groupsEscalated: number;
  itemsMarkedForReview: number;
}

const MAX_ATTEMPTS_BEFORE_REVIEW = 5;
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export async function dlqTriageWorkflow(sourceId: string): Promise<DlqTriageResult> {
  const result: DlqTriageResult = {
    sourceId,
    groupsProcessed: 0,
    groupsRetried: 0,
    groupsEscalated: 0,
    itemsMarkedForReview: 0,
  };

  // 1. Group DLQ items by stage + error signature
  const groups = await groupDlqItems(sourceId);
  result.groupsProcessed = groups.length;

  for (const group of groups) {
    // 2. Items already past max attempts → mark for review immediately
    if (group.attemptCount >= MAX_ATTEMPTS_BEFORE_REVIEW) {
      await markNeedsReview(group.itemIds);
      result.groupsEscalated++;
      result.itemsMarkedForReview += group.itemIds.length;
      continue;
    }

    // 3. Canary retry: try the oldest item in the group
    const canary = await retryDlqItem(group.oldestItemId);

    if (canary.success) {
      // 4a. Canary succeeded → bulk retry the rest of the group
      await bulkRetryDlqGroup(group.groupId);
      result.groupsRetried++;
    } else {
      // 4b. Canary failed → increment attempt count
      const newCount = await incrementDlqAttemptCount(group.groupId);

      // 5. If now at threshold → escalate
      if (newCount >= MAX_ATTEMPTS_BEFORE_REVIEW) {
        await markNeedsReview(group.itemIds);
        result.groupsEscalated++;
        result.itemsMarkedForReview += group.itemIds.length;
      }
    }
  }

  // Schedule next run in 6 hours
  await sleep(SIX_HOURS_MS);

  return result;
}
