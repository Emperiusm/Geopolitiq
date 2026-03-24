// sse-gateway/index.ts — Dedicated SSE Gateway (port 3002)
//
// Separate Hono app that scales independently from the main API.
// Subscribes to NATS JetStream streams and fans events out to watching SSE clients.

import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { StringCodec, DeliverPolicy } from 'nats';
import { createLogger, loadConfig } from '@gambit/common';
import type { TeamTier } from '@gambit/common';
import { connectNats } from '../infrastructure/nats';
import { connectRedis } from '../infrastructure/redis';
import { connectPostgres } from '../infrastructure/postgres';
import { PostgresAuthProvider } from '../auth/postgres-auth-provider';
import { STREAMS, type DomainEvent } from '../infrastructure/event-schemas';
import { SSEFanout } from './fanout';
import { ConnectionManager } from './connection-manager';

// ── Bootstrap ─────────────────────────────────────────────────────────

const logger = createLogger('sse-gateway');
const config = loadConfig();

// Auth provider — initialised once Postgres is connected (see startup below).
// The gateway performs its own auth rather than trusting client-supplied headers.
let authProvider: PostgresAuthProvider | null = null;

// Redis client for cross-pod connection tracking (C4).
// Resolved at startup; gateway operates without it if Redis is unavailable.
let redisClient: any = null;

const fanout = new SSEFanout();
// ConnectionManager is constructed after Redis is available (see startup).
let connections: ConnectionManager;

// ── Auth helpers ───────────────────────────────────────────────────────

interface AuthResult {
  teamId: string;
  tier: TeamTier;
}

/**
 * Validate a Bearer session token.
 * Mirrors the logic in engine/src/middleware/authenticate.ts.
 */
async function validateBearer(token: string): Promise<AuthResult> {
  if (!authProvider) throw new Error('Auth provider not ready');

  const session = await authProvider.findSession(token);
  if (!session) throw new Error('Invalid or expired session token');
  if (session.expiresAt < new Date()) throw new Error('Session expired');

  const user = await authProvider.findUserById(session.userId);
  if (!user) throw new Error('User not found');
  if (user.deletedAt) throw new Error('User account is deactivated');

  const team = await authProvider.findTeamById(user.teamId);
  return { teamId: user.teamId, tier: (team?.tier ?? 'free') as TeamTier };
}

/**
 * Validate an API key supplied via X-API-Key header.
 * Mirrors the logic in engine/src/middleware/authenticate.ts.
 */
async function validateApiKey(rawKey: string): Promise<AuthResult> {
  if (!authProvider) throw new Error('Auth provider not ready');

  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const apiKey = await authProvider.findApiKeyByHash(keyHash);
  if (!apiKey) throw new Error('Invalid API key');
  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) throw new Error('API key expired');

  const user = await authProvider.findUserById(apiKey.userId);
  if (!user) throw new Error('API key owner not found');
  if (user.deletedAt) throw new Error('API key owner account is deactivated');

  const team = await authProvider.findTeamById(apiKey.teamId);
  return { teamId: apiKey.teamId, tier: (team?.tier ?? 'free') as TeamTier };
}

/**
 * Extract and validate credentials from a request.
 * Returns the resolved teamId + tier, or null if credentials are missing/invalid.
 *
 * In non-production environments a dev bypass is honoured when no real
 * credentials are present (matching the behaviour of the main API middleware).
 */
async function resolveAuth(req: Request): Promise<AuthResult | null> {
  const authHeader = req.headers.get('authorization');
  const apiKeyHeader = req.headers.get('x-api-key');

  // Dev bypass — non-production only, and only when no real creds are supplied
  if (process.env.NODE_ENV !== 'production') {
    const devBypass = req.headers.get('x-dev-bypass');
    if (devBypass === 'true' || (!authHeader && !apiKeyHeader)) {
      return { teamId: 'dev-team', tier: 'enterprise' };
    }
  }

  try {
    if (authHeader?.startsWith('Bearer ')) {
      return await validateBearer(authHeader.slice(7));
    }
    if (apiKeyHeader) {
      return await validateApiKey(apiKeyHeader);
    }
  } catch (err) {
    logger.warn({ err }, 'SSE auth validation failed');
    return null;
  }

  // No credentials at all (production)
  return null;
}

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
app.get('/stream', async (c) => {
  // ── C3: authenticate via Bearer token or API key — never trust headers ──
  const auth = await resolveAuth(c.req.raw);

  if (!auth) {
    return c.json({ error: 'Unauthorized: provide a valid Bearer token or X-API-Key' }, 401);
  }

  const { teamId, tier } = auth;

  // Reject free tier
  if (tier.toLowerCase() === 'free') {
    return c.json({ error: 'SSE streaming not available on free tier' }, 403);
  }

  // ── C4: check connection limit (async — may consult Redis) ──
  if (!(await connections.canConnect(teamId, tier))) {
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
    await connections.onConnect(teamId);

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
      connections.onDisconnect(teamId).catch((err) => {
        logger.warn({ err, teamId }, 'Error decrementing connection count on disconnect');
      });
      logger.info({ teamId }, 'SSE client disconnected');
    });

    // Keep the stream open indefinitely
    await stream.sleep(Number.MAX_SAFE_INTEGER);
  });
});

// ── Start ─────────────────────────────────────────────────────────────

const PORT = Number(process.env.SSE_GATEWAY_PORT ?? 3002);

async function start(): Promise<void> {
  // Connect to Postgres for auth validation (C3)
  try {
    const db = await connectPostgres(config, logger);
    authProvider = new PostgresAuthProvider(db);
    logger.info('SSE gateway: auth provider ready');
  } catch (err) {
    logger.error({ err }, 'SSE gateway: Postgres unavailable — authentication will fail for all requests');
  }

  // Connect to Redis for cross-pod connection tracking (C4)
  redisClient = await connectRedis(config.redis.persistentUrl, logger, 'sse-gateway');

  // Initialise ConnectionManager — with Redis if available, otherwise local-only
  connections = new ConnectionManager(redisClient ?? undefined);
  if (redisClient) {
    logger.info('SSE gateway: Redis-backed connection tracking enabled');
  } else {
    logger.warn('SSE gateway: Redis unavailable — connection tracking is local to this pod only');
  }

  // Start NATS subscriptions (non-blocking; gateway works without NATS)
  startNatsFanout().catch((err) => {
    logger.error({ err }, 'Failed to start NATS fan-out subscriptions');
  });
}

start().catch((err) => {
  logger.error({ err }, 'SSE gateway startup failed');
});

export default {
  port: PORT,
  fetch: app.fetch,
};

logger.info({ port: PORT }, 'SSE Gateway starting');
