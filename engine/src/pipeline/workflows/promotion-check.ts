/**
 * PromotionCheckWorkflow — daily Temporal workflow that checks all agent-mode sources
 * for promotion eligibility and notifies when eligible.
 *
 * IMPORTANT: This file must ONLY use @temporalio/workflow APIs.
 * No direct DB access or imports of non-workflow modules.
 */

import { proxyActivities } from '@temporalio/workflow';
import type { PromotionEligibility } from '../../learning/promotion-checker';

// ── Activity proxies ────────────────────────────────────────────────────────

const { checkAllSources } = proxyActivities<{
  checkAllSources(): Promise<Array<{ sourceId: string; result: PromotionEligibility }>>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '30 minutes',
});

const { notifyPromotion } = proxyActivities<{
  notifyPromotion(sourceId: string, result: PromotionEligibility): Promise<void>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '1 minute',
});

// ── Workflow ────────────────────────────────────────────────────────────────

export interface PromotionCheckResult {
  sourcesChecked: number;
  sourcesEligible: number;
  notified: string[];
}

export async function promotionCheckWorkflow(): Promise<PromotionCheckResult> {
  const results = await checkAllSources();

  const eligible = results.filter(r => r.result.eligible);

  for (const { sourceId, result } of eligible) {
    await notifyPromotion(sourceId, result);
  }

  return {
    sourcesChecked: results.length,
    sourcesEligible: eligible.length,
    notified: eligible.map(r => r.sourceId),
  };
}
