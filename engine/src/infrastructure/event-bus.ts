// event-bus.ts — EventBus interface, NatsEventBus, NoopEventBus

import { monotonicFactory } from 'ulid';
import { StorageType, RetentionPolicy, headers } from 'nats';
import type { Logger } from '@gambit/common';
import type { NatsContext } from './nats';
import {
  type DomainEvent,
  type StreamName,
  STREAM_CONFIGS,
} from './event-schemas';

const ulid = monotonicFactory();

// ── Dedup window: 10 minutes in nanoseconds (nats Nanos = number) ─────

const DEDUP_WINDOW_NS = 10 * 60 * 1_000_000_000;

// ── EventBus interface ────────────────────────────────────────────────

export interface EventBus {
  publish<T>(stream: StreamName, subject: string, event: DomainEvent<T>): Promise<void>;
  publishBatch<T>(stream: StreamName, subject: string, events: DomainEvent<T>[]): Promise<void>;
  ensureStreams(): Promise<void>;
}

// ── Helper: build DomainEvent ─────────────────────────────────────────

export function buildEvent<T>(
  type: string,
  source: string,
  data: T,
  metadata: { traceId: string; teamId?: string; causationId?: string },
  version = 1,
): DomainEvent<T> {
  return {
    id: ulid(),
    type,
    version,
    source,
    timestamp: new Date().toISOString(),
    data,
    metadata,
  };
}

// ── NatsEventBus ──────────────────────────────────────────────────────

export class NatsEventBus implements EventBus {
  constructor(
    private readonly ctx: NatsContext,
    private readonly logger: Logger,
  ) {}

  async ensureStreams(): Promise<void> {
    for (const cfg of STREAM_CONFIGS) {
      const maxAgeNs = cfg.maxAge * 1_000_000_000; // seconds → nanoseconds
      const storage = cfg.storage === 'file' ? StorageType.File : StorageType.Memory;

      try {
        // Try to get the stream info — update if it exists, create if not
        try {
          await this.ctx.jsm.streams.info(cfg.name);
          await this.ctx.jsm.streams.update(cfg.name, {
            subjects: cfg.subjects,
            max_age: maxAgeNs,
            storage,
          });
          this.logger.debug({ stream: cfg.name }, 'NATS stream updated');
        } catch {
          // Stream doesn't exist — create it
          await this.ctx.jsm.streams.add({
            name: cfg.name,
            subjects: cfg.subjects,
            max_age: maxAgeNs,
            storage,
            retention: RetentionPolicy.Limits,
            num_replicas: 1,
            duplicate_window: DEDUP_WINDOW_NS,
          });
          this.logger.info({ stream: cfg.name }, 'NATS stream created');
        }
      } catch (err) {
        this.logger.warn({ err, stream: cfg.name }, 'Failed to ensure NATS stream');
      }
    }
  }

  async publish<T>(stream: StreamName, subject: string, event: DomainEvent<T>): Promise<void> {
    const h = headers();
    h.set('Nats-Msg-Id', event.id);
    h.set('Gambit-Trace-Id', event.metadata.traceId);
    if (event.metadata.teamId) {
      h.set('Gambit-Team-Id', event.metadata.teamId);
    }

    const payload = new TextEncoder().encode(JSON.stringify(event));

    try {
      await this.ctx.js.publish(subject, payload, { headers: h });
    } catch (err) {
      this.logger.warn({ err, stream, subject, eventId: event.id }, 'Failed to publish event');
      throw err;
    }
  }

  async publishBatch<T>(
    stream: StreamName,
    subject: string,
    events: DomainEvent<T>[],
  ): Promise<void> {
    // Publish sequentially to preserve ordering guarantees within a subject
    for (const event of events) {
      await this.publish(stream, subject, event);
    }
  }
}

// ── NoopEventBus ──────────────────────────────────────────────────────

export class NoopEventBus implements EventBus {
  async publish<T>(_stream: StreamName, _subject: string, _event: DomainEvent<T>): Promise<void> {
    // No-op: NATS not available
  }

  async publishBatch<T>(
    _stream: StreamName,
    _subject: string,
    _events: DomainEvent<T>[],
  ): Promise<void> {
    // No-op
  }

  async ensureStreams(): Promise<void> {
    // No-op
  }
}

// ── Factory ───────────────────────────────────────────────────────────

export function createEventBus(ctx: NatsContext | null, logger: Logger): EventBus {
  if (!ctx) {
    logger.warn('Using NoopEventBus — NATS not available');
    return new NoopEventBus();
  }
  return new NatsEventBus(ctx, logger);
}
