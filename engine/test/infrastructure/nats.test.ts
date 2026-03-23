/**
 * NATS connection tests
 *
 * These are integration tests that require a running NATS server.
 * Start it with: docker compose --profile engine up nats -d
 *
 * Unit tests (no NATS needed) verify null-return behaviour on bad URL.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createLogger } from '@gambit/common';
import { connectNats, drainNats } from '../../src/infrastructure/nats';
import type { GambitConfig } from '@gambit/common';

const logger = createLogger('test');

// ── Helpers ───────────────────────────────────────────────────────────

function makeConfig(url?: string): GambitConfig {
  return {
    engine: { port: 3001 },
    postgres: { url: 'postgresql://gambit:gambit@localhost:6432/gambit' },
    mongo: { uri: 'mongodb://localhost:27017/gambit' },
    redis: { cacheUrl: 'redis://localhost:6380', persistentUrl: 'redis://localhost:6381' },
    clickhouse: { url: undefined },
    typesense: { url: undefined, apiKey: 'gambit-dev' },
    temporal: { address: undefined },
    minio: { endpoint: undefined, accessKey: 'gambit', secretKey: 'gambit-dev' },
    nats: { url },
    auth: { jwtSecret: 'test-secret' },
    log: { level: 'info' },
  };
}

// ── Unit tests (no live NATS required) ───────────────────────────────

describe('connectNats — unit', () => {
  it('returns null when NATS URL is not configured', async () => {
    const ctx = await connectNats(makeConfig(undefined), logger);
    expect(ctx).toBeNull();
  });

  it('returns null when NATS URL is unreachable', async () => {
    // Use a port that is almost certainly not listening
    const ctx = await connectNats(makeConfig('nats://localhost:14222'), logger);
    expect(ctx).toBeNull();
  });
});

// ── Integration tests (requires live NATS) ────────────────────────────

const NATS_URL = process.env.NATS_URL ?? 'nats://localhost:4222';

describe.skipIf(!process.env.NATS_INTEGRATION)('connectNats — integration', () => {
  afterEach(async () => {
    // Ensure connections are always drained between tests
  });

  it('connects to NATS and returns a NatsContext', async () => {
    const ctx = await connectNats(makeConfig(NATS_URL), logger);
    expect(ctx).not.toBeNull();
    expect(ctx!.nc).toBeDefined();
    expect(ctx!.js).toBeDefined();
    expect(ctx!.jsm).toBeDefined();
    await drainNats(ctx!, logger);
  });

  it('drainNats closes the connection gracefully', async () => {
    const ctx = await connectNats(makeConfig(NATS_URL), logger);
    expect(ctx).not.toBeNull();
    await expect(drainNats(ctx!, logger)).resolves.toBeUndefined();
  });
});
