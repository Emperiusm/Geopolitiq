import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { createLogger } from '@gambit/common';
import type { SSEManager } from '../events/sse-manager';
import { SSE_CHANNELS } from '../events/event-types';

const logger = createLogger('stream-route');

const HEARTBEAT_INTERVAL_MS = 30_000;

export function createStreamRoutes(sseManager: SSEManager) {
  const app = new Hono();

  app.get('/stream', (c) => {
    const channel = c.req.query('channel') ?? SSE_CHANNELS.global;
    const filter = c.req.query('filter');

    return streamSSE(c, async (stream) => {
      // Send connected confirmation event
      await stream.writeSSE({
        event: 'connected',
        data: JSON.stringify({
          channel,
          filter: filter ?? null,
          timestamp: new Date().toISOString(),
        }),
      });

      let closed = false;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

      // Subscribe to Redis channel via the SSEManager's subscriber connection
      const subscriber = sseManager.getSubscriber();

      const messageHandler = async (ch: string, message: string) => {
        if (closed) return;
        if (ch !== channel) return;

        try {
          const event = JSON.parse(message);

          // Apply client-side filter if provided
          if (filter && event.data?.category !== filter && event.type !== filter) {
            return;
          }

          await stream.writeSSE({
            id: event.id,
            event: event.type,
            data: JSON.stringify(event.data),
          });
        } catch (err) {
          logger.warn({ err }, 'SSE stream: failed to forward message');
        }
      };

      await subscriber.subscribe(channel);
      subscriber.on('message', messageHandler);

      // Heartbeat ping every 30 seconds
      heartbeatTimer = setInterval(async () => {
        if (closed) return;
        try {
          await stream.writeSSE({
            event: 'ping',
            data: JSON.stringify({ timestamp: new Date().toISOString() }),
          });
        } catch {
          closed = true;
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Cleanup on disconnect
      stream.onAbort(async () => {
        closed = true;
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        subscriber.off('message', messageHandler);
        try {
          await subscriber.unsubscribe(channel);
        } catch (err) {
          logger.warn({ err }, 'SSE stream: error unsubscribing');
        }
        logger.debug({ channel }, 'SSE client disconnected');
      });

      // Keep the stream open
      await stream.sleep(Number.MAX_SAFE_INTEGER);
    });
  });

  return app;
}
