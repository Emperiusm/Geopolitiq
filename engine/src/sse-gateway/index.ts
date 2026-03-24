// sse-gateway/index.ts — Dedicated SSE Gateway (port 3002)
//
// Separate Hono app that scales independently from the main API.
// Subscribes to NATS JetStream streams and fans events out to watching SSE clients.

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { StringCodec, DeliverPolicy } from 'nats';
import { createLogger, loadConfig } from '@gambit/common';
import { connectNats } from '../infrastructure/nats';
import { STREAMS, type DomainEvent } from '../infrastructure/event-schemas';
import { SSEFanout } from './fanout';
import { ConnectionManager } from './connection-manager';

// ── Bootstrap ─────────────────────────────────────────────────────────

const logger = createLogger('sse-gateway');
const config = loadConfig();

const fanout = new SSEFanout();
const connections = new ConnectionManager();

// ── NATS fan-out subscriptions ────────────────────────────────────────

/**
 * Extract the primary entityId from an event.
 * Convention: prefer metadata.teamId or the first segment of the subject,
 * but events carry their entity id in data.entityId.
 */
function extractEntityId(event: DomainEvent<unknown>): string | null {
  const d = event.data as Record<string, unknown>;
  if (typeof d?.entityId === 'string' && d.entityId) return d.entityId;
  if (typeof d?.entity_id === 'string' && d.entity_id) return d.entity_id;
  return null;
}

type StreamEntry = { stream: string; subject: string };

const SUBSCRIPTIONS: StreamEntry[] = [
  { stream: STREAMS.SIGNALS, subject: 'signals.>' },
  { stream: STREAMS.GAP_SCORES, subject: 'gaps.>' },
  { stream: STREAMS.ALERTS, subject: 'alerts.>' },
];

async function startNatsFanout(): Promise<void> {
  const natsCtx = await connectNats(config, logger);
  if (!natsCtx) {
    logger.warn('NATS unavailable — SSE gateway will serve connections but deliver no events');
    return;
  }

  const { js } = natsCtx;
  const sc = StringCodec();

  for (const entry of SUBSCRIPTIONS) {
    // Ephemeral consumer — no durable_name; SSE doesn't need replay on reconnect.
    const sub = await js.subscribe(entry.subject, {
      stream: entry.stream,
      config: { deliver_policy: DeliverPolicy.New },
    });

    (async () => {
      for await (const msg of sub) {
        try {
          const event = JSON.parse(sc.decode(msg.data)) as DomainEvent<unknown>;
          const entityId = extractEntityId(event);
          if (entityId) {
            fanout.broadcast(entityId, {
              id: event.id,
              event: event.type,
              data: JSON.stringify(event.data),
            });
          }
        } catch (err) {
          logger.warn({ err, stream: entry.stream }, 'Failed to decode NATS message');
        } finally {
          msg.ack();
        }
      }
    })().catch((err) => {
      logger.error({ err, stream: entry.stream }, 'NATS subscription loop terminated');
    });

    logger.info({ stream: entry.stream, subject: entry.subject }, 'NATS subscription active');
  }
}

// ── Hono app ──────────────────────────────────────────────────────────

const app = new Hono();

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', connections: connections.getTotalCount() });
});

// SSE stream endpoint
app.get('/stream', (c) => {
  const teamId = c.req.header('X-Team-Id');
  const tier = c.req.header('X-Tier') ?? 'free';

  if (!teamId) {
    return c.json({ error: 'X-Team-Id header required' }, 400);
  }

  // Reject free tier
  if (tier.toLowerCase() === 'free') {
    return c.json({ error: 'SSE streaming not available on free tier' }, 403);
  }

  // Check connection limit
  if (!connections.canConnect(teamId, tier)) {
    return c.json({ error: 'Connection limit reached for your plan' }, 429);
  }

  // Parse requested entity IDs from query param: ?entities=id1,id2,...
  const entitiesParam = c.req.query('entities') ?? '';
  const entityIds = entitiesParam
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  return streamSSE(c, async (stream) => {
    // Build SSEConnection
    const entitySet = new Set<string>(entityIds);
    const conn = {
      write(data: { id: string; event: string; data: string }) {
        stream.writeSSE(data).catch(() => {
          // ignore — client likely disconnected
        });
      },
      teamId,
      entityIds: entitySet,
    };

    // Register with fanout for each requested entity
    for (const entityId of entitySet) {
      fanout.register(entityId, conn);
    }
    connections.onConnect(teamId);

    logger.info({ teamId, tier, entities: entityIds.length }, 'SSE client connected');

    // Send connected confirmation
    await stream.writeSSE({ event: 'connected', data: JSON.stringify({ teamId, entities: entityIds }) });

    // Heartbeat every 15 seconds to keep the connection alive
    const heartbeat = setInterval(() => {
      stream.writeSSE({ event: 'heartbeat', data: '' }).catch(() => {
        clearInterval(heartbeat);
      });
    }, 15_000);

    // Cleanup on disconnect
    stream.onAbort(() => {
      clearInterval(heartbeat);
      fanout.unregisterAll(conn);
      connections.onDisconnect(teamId);
      logger.info({ teamId }, 'SSE client disconnected');
    });

    // Keep the stream open indefinitely
    await stream.sleep(Number.MAX_SAFE_INTEGER);
  });
});

// ── Start ─────────────────────────────────────────────────────────────

const PORT = Number(process.env.SSE_GATEWAY_PORT ?? 3002);

// Start NATS subscriptions (non-blocking; gateway works without NATS)
startNatsFanout().catch((err) => {
  logger.error({ err }, 'Failed to start NATS fan-out subscriptions');
});

export default {
  port: PORT,
  fetch: app.fetch,
};

logger.info({ port: PORT }, 'SSE Gateway starting');
