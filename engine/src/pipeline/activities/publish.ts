import type { ResolvedSignal, SourceConfig } from '../types';

/**
 * Publish activity — publishes a signal-ingested event via SSEManager.
 */
export async function publishActivity(signal: ResolvedSignal, source: SourceConfig): Promise<void> {
  const { SSEManager } = await import('../../events/sse-manager');

  let redis: any = null;

  try {
    const Redis = (await import('ioredis')).default;
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  } catch {
    // Redis unavailable — SSE publish will fail silently (non-critical)
    return;
  }

  const sseManager = new SSEManager(redis);

  try {
    await sseManager.publishSignalIngested(signal, source);
  } finally {
    await sseManager.shutdown().catch(() => {});
  }
}
