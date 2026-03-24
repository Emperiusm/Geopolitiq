// nats.ts — NATS JetStream connection

import type { NatsConnection, JetStreamClient, JetStreamManager } from 'nats';
import type { GambitConfig, Logger } from '@gambit/common';

// ── Types ─────────────────────────────────────────────────────────────

export interface NatsContext {
  nc: NatsConnection;
  js: JetStreamClient;
  jsm: JetStreamManager;
}

// ── Connection ────────────────────────────────────────────────────────

export async function connectNats(
  config: GambitConfig,
  logger: Logger,
): Promise<NatsContext | null> {
  if (!config.nats.url) {
    logger.warn('NATS URL not configured — event bus disabled');
    return null;
  }

  try {
    const { connect } = await import('nats');

    const nc = await connect({
      servers: config.nats.url,
      reconnect: true,
      maxReconnectAttempts: -1,
      reconnectTimeWait: 2_000,
      timeout: 5_000,
      name: 'gambit-engine',
    });

    const js = nc.jetstream();
    const jsm = await nc.jetstreamManager();

    logger.info({ server: config.nats.url }, 'NATS JetStream connected');
    return { nc, js, jsm };
  } catch (err) {
    logger.warn({ err }, 'NATS not available — event bus disabled');
    return null;
  }
}

// ── Graceful drain ────────────────────────────────────────────────────

export async function drainNats(ctx: NatsContext, logger: Logger): Promise<void> {
  try {
    await ctx.nc.drain();
    logger.info('NATS drained');
  } catch (err) {
    logger.warn({ err }, 'Error draining NATS');
  }
}
