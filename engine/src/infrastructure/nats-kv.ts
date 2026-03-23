// nats-kv.ts — NATS KV for feature flags with local cache + watch

import type { KV, KVWatcher } from 'nats';
import type { Logger } from '@gambit/common';
import type { NatsContext } from './nats';

const KV_BUCKET = 'gambit-flags';

const decoder = new TextDecoder();
const encoder = new TextEncoder();

// ── NatsFeatureFlags ──────────────────────────────────────────────────

export class NatsFeatureFlags {
  private kv!: KV;
  private cache = new Map<string, boolean>();
  private watcher?: KVWatcher;

  private constructor(
    private readonly ctx: NatsContext,
    private readonly logger: Logger,
  ) {}

  static async create(ctx: NatsContext, logger: Logger): Promise<NatsFeatureFlags> {
    const instance = new NatsFeatureFlags(ctx, logger);
    await instance.init();
    return instance;
  }

  private async init(): Promise<void> {
    // Open or create the KV bucket (history=5 retains last 5 values per key)
    this.kv = await this.ctx.js.views.kv(KV_BUCKET, { history: 5 });

    // Seed initial cache from existing keys
    try {
      const iter = await this.kv.history();
      for await (const entry of iter) {
        if (entry.value && entry.value.length > 0) {
          const val = decoder.decode(entry.value);
          this.cache.set(entry.key, val === 'true');
        }
      }
      this.logger.debug({ count: this.cache.size }, 'Feature flags loaded from NATS KV');
    } catch (err) {
      this.logger.warn({ err }, 'Could not seed feature flag cache');
    }

    // Watch for changes
    this.startWatch();
  }

  private startWatch(): void {
    this.kv!.watch()
      .then((watcher) => {
        this.watcher = watcher;
        (async () => {
          for await (const entry of this.watcher!) {
            const val = decoder.decode(entry.value);
            this.cache.set(entry.key, val === 'true');
            this.logger.debug({ key: entry.key, value: val }, 'Feature flag updated');
          }
        })().catch((err) => {
          this.logger.warn({ err }, 'Feature flag watcher closed');
        });
      })
      .catch((err) => {
        this.logger.warn({ err }, 'Could not start feature flag watcher');
      });
  }

  /** Check if a feature flag is enabled (uses local cache, never blocks) */
  isEnabled(flag: string, defaultValue = false): boolean {
    return this.cache.get(flag) ?? defaultValue;
  }

  /** Set a feature flag in NATS KV (propagates to all instances) */
  async setFlag(flag: string, enabled: boolean): Promise<void> {
    const payload = encoder.encode(String(enabled));
    await this.kv.put(flag, payload);
  }

  /** Stop the watcher */
  async stop(): Promise<void> {
    if (this.watcher) {
      this.watcher.stop();
      this.watcher = undefined;
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────

export async function createFeatureFlags(
  ctx: NatsContext | null,
  logger: Logger,
): Promise<NatsFeatureFlags | null> {
  if (!ctx) {
    logger.warn('Feature flags disabled — NATS not available');
    return null;
  }

  try {
    return await NatsFeatureFlags.create(ctx, logger);
  } catch (err) {
    logger.warn({ err }, 'Failed to initialise feature flags');
    return null;
  }
}
