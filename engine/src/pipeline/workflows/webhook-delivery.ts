/**
 * WebhookDeliveryWorkflow — per-event workflow that POSTs to a webhook endpoint
 * with HMAC signature, retries up to 3× with exponential backoff on failure,
 * logs the result, and disables the endpoint if its 24h failure rate > 50%.
 *
 * IMPORTANT: This file must ONLY use @temporalio/workflow APIs.
 * No direct DB access or imports of non-workflow modules.
 */

import { proxyActivities, sleep } from '@temporalio/workflow';

// ── Activity proxies ────────────────────────────────────────────────────────

export interface WebhookEvent {
  type: string;
  payload: Record<string, any>;
  occurredAt: string;
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
  latencyMs?: number;
}

const { deliverWebhook } = proxyActivities<{
  deliverWebhook(endpointId: string, event: WebhookEvent): Promise<DeliveryResult>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '30 seconds',
});

const { logDelivery } = proxyActivities<{
  logDelivery(endpointId: string, result: DeliveryResult & { attempts: number }): Promise<void>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '15 seconds',
});

const { checkEndpointHealth } = proxyActivities<{
  checkEndpointHealth(endpointId: string): Promise<{ failureRate: number; disabled: boolean }>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '15 seconds',
});

const { disableEndpoint } = proxyActivities<{
  disableEndpoint(endpointId: string, reason: string): Promise<void>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '15 seconds',
});

// ── Workflow ────────────────────────────────────────────────────────────────

export interface WebhookDeliveryResult {
  endpointId: string;
  success: boolean;
  attempts: number;
  endpointDisabled: boolean;
}

const MAX_RETRIES = 3;
// Exponential backoff delays: 1s, 10s, 60s
const BACKOFF_DELAYS_MS = [1_000, 10_000, 60_000];
const FAILURE_RATE_THRESHOLD = 0.5;

export async function webhookDeliveryWorkflow(
  endpointId: string,
  event: WebhookEvent,
): Promise<WebhookDeliveryResult> {
  let lastResult: DeliveryResult = { success: false };
  let attempts = 0;

  // 1. Attempt delivery with up to MAX_RETRIES retries on failure
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff before retry (cap at last defined delay)
      const delayMs = BACKOFF_DELAYS_MS[attempt - 1] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1];
      await sleep(delayMs);
    }

    lastResult = await deliverWebhook(endpointId, event);
    attempts = attempt + 1;

    if (lastResult.success) break;
  }

  // 2. Log the final delivery outcome
  await logDelivery(endpointId, { ...lastResult, attempts });

  // 3. Check endpoint health; disable if failure rate > 50% over last 24h
  const health = await checkEndpointHealth(endpointId);
  let endpointDisabled = health.disabled;

  if (!health.disabled && health.failureRate > FAILURE_RATE_THRESHOLD) {
    await disableEndpoint(
      endpointId,
      `Failure rate ${(health.failureRate * 100).toFixed(1)}% exceeds 50% threshold over last 24h`,
    );
    endpointDisabled = true;
  }

  return {
    endpointId,
    success: lastResult.success,
    attempts,
    endpointDisabled,
  };
}
