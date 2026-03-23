import { createHmac } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { createLogger, recordId } from '@gambit/common';
import { webhookEndpoints, webhookDeliveries } from '../db';
import type { SSEEvent } from './event-types';
import type { DrizzleClient } from '../db/transaction';

const logger = createLogger('webhook-publisher');

export class WebhookPublisher {
  constructor(private db: DrizzleClient) {}

  /**
   * Signs a JSON payload string with HMAC-SHA256 using the provided secret.
   * Returns a hex digest.
   */
  sign(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * Finds active webhook endpoints for the given team that match the event type,
   * signs the payload, and inserts a webhook_deliveries record for each.
   */
  async enqueue(event: SSEEvent, teamId: string): Promise<void> {
    let endpoints: Array<typeof webhookEndpoints.$inferSelect>;

    try {
      endpoints = await (this.db as any)
        .select()
        .from(webhookEndpoints)
        .where(
          and(
            eq(webhookEndpoints.teamId, teamId),
            eq(webhookEndpoints.active, true),
          ),
        );
    } catch (err) {
      logger.error({ err, teamId }, 'Failed to fetch webhook endpoints');
      return;
    }

    // Filter by event type subscription
    const matching = endpoints.filter(
      (ep) => ep.eventTypes.includes(event.type) || ep.eventTypes.includes('*'),
    );

    if (matching.length === 0) return;

    const payloadStr = JSON.stringify(event);

    const deliveries = matching.map((ep) => ({
      id: recordId('wh', crypto.randomUUID()),
      teamId,
      url: ep.url,
      event: event.type,
      payload: event as any,
      statusCode: null,
      responseBody: null,
      attemptCount: 0,
      deliveredAt: null,
      nextRetryAt: null,
    }));

    // Attach HMAC signatures to metadata via payload envelope
    const signedDeliveries = matching.map((ep, i) => ({
      ...deliveries[i],
      payload: {
        event,
        signature: this.sign(payloadStr, ep.secret),
      } as any,
    }));

    try {
      await (this.db as any)
        .insert(webhookDeliveries)
        .values(signedDeliveries);

      logger.debug({ count: signedDeliveries.length, teamId, event: event.type }, 'Webhook deliveries enqueued');
    } catch (err) {
      logger.error({ err, teamId, event: event.type }, 'Failed to insert webhook deliveries');
    }
  }
}
