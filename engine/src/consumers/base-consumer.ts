// base-consumer.ts — Abstract pull-based NATS JetStream consumer with circuit breaker + DLQ

import { AckPolicy, DeliverPolicy, StringCodec } from 'nats';
import type { Logger } from '@gambit/common';
import type { NatsContext } from '../infrastructure/nats';
import type { EventBus } from '../infrastructure/event-bus';
import { buildEvent } from '../infrastructure/event-bus';
import type { DomainEvent } from '../infrastructure/event-schemas';
import { STREAMS, EVENT_TYPES } from '../infrastructure/event-schemas';
import { CircuitBreaker } from '../health/circuit-breaker';

// ── ConsumerConfig ────────────────────────────────────────────────────

export interface ConsumerConfig {
  nats: NatsContext;
  bus: EventBus;
  logger: Logger;
  /** NATS stream name (e.g. 'SIGNALS') */
  stream: string;
  /** Durable consumer name */
  consumerName: string;
  /** Subject filter for the consumer (e.g. 'signals.ingested') */
  filterSubject: string;
  /** Maximum messages per fetch batch */
  batchSize: number;
  /** Max wait time per fetch in milliseconds */
  batchWindowMs: number;
  /** Max redelivery attempts before sending to DLQ (currently informational) */
  maxRetries: number;
}

const sc = StringCodec();

// ── BaseConsumer ──────────────────────────────────────────────────────

/**
 * Abstract base class for all Gambit NATS JetStream pull consumers.
 *
 * Subclasses must implement `handleBatch(events)` which is called with a
 * parsed batch of DomainEvents. All ACK/NAK/DLQ routing and circuit-breaker
 * logic is handled here.
 *
 * Pull loop behaviour:
 *  - Fetches up to `batchSize` messages per iteration with `batchWindowMs` timeout
 *  - Successfully parsed messages are collected into a batch for `handleBatch`
 *  - Parse errors → message is sent to DLQ and term-ack'd (no redeliver)
 *  - `handleBatch` errors → circuit breaker failure recorded, messages remain
 *    pending for NATS redelivery
 *  - Circuit open → consumer sleeps for `backoffMs`, then checks `shouldProbe()`
 *    before resuming; transitions to half-open when probing succeeds
 */
export abstract class BaseConsumer {
  protected readonly logger: Logger;
  private readonly breaker: CircuitBreaker;
  /** Set to true while the pull loop is active; set to false by stop(). */
  private running = false;
  /** Set to true once stop() has been called; prevents start() from (re)starting. */
  private stopped = false;

  constructor(protected readonly config: ConsumerConfig) {
    this.logger = config.logger;
    this.breaker = new CircuitBreaker();
  }

  /** Subclasses implement domain-specific processing here. */
  abstract handleBatch(events: DomainEvent[]): Promise<void>;

  /**
   * Ensures the durable NATS consumer exists, then enters the pull loop.
   * Returns only after `stop()` is called.
   */
  async start(): Promise<void> {
    const { nats, stream, consumerName, filterSubject, batchSize, batchWindowMs } = this.config;
    const { js, jsm } = nats;

    // If stop() was called before start(), exit immediately
    if (this.stopped) {
      return;
    }
    this.running = true;

    // ── Ensure durable consumer ──────────────────────────────────────
    try {
      await jsm.consumers.info(stream, consumerName);
      this.logger.debug({ stream, consumerName }, 'Durable consumer already exists');
    } catch (err: any) {
      // 404-style: consumer doesn't exist — create it
      if (err?.code === '404' || err?.message?.includes('not found') || err?.message?.includes('consumer not found')) {
        await jsm.consumers.add(stream, {
          durable_name: consumerName,
          ack_policy: AckPolicy.Explicit,
          deliver_policy: DeliverPolicy.New,
          filter_subject: filterSubject,
        });
        this.logger.info({ stream, consumerName, filterSubject }, 'Durable consumer created');
      } else {
        this.logger.warn({ err, stream, consumerName }, 'Could not verify consumer existence — proceeding anyway');
      }
    }

    // ── Pull-subscribe ────────────────────────────────────────────────
    const sub = await js.pullSubscribe(filterSubject, {
      stream,
      config: { durable_name: consumerName },
    });

    this.logger.info({ stream, consumerName, filterSubject }, 'BaseConsumer started');

    // ── Pull loop ─────────────────────────────────────────────────────
    while (this.running) {
      const state = this.breaker.getState();

      // ── Circuit open: sleep for backoff, then check shouldProbe ──────
      if (state === 'open' || state === 'cost-hold') {
        const backoffMs = this.breaker.getBackoffMs();
        this.logger.warn({ state, backoffMs, consumerName }, 'Circuit open — backing off');
        const deadline = Date.now() + backoffMs;
        while (this.running && Date.now() < deadline) {
          await sleep(Math.min(1_000, deadline - Date.now()));
        }
        if (!this.running) break;

        if (this.breaker.shouldProbe()) {
          this.breaker.setState('half-open');
          this.logger.info({ consumerName }, 'Circuit transitioning to half-open for probe');
        }
        continue;
      }

      // ── Fetch a batch ─────────────────────────────────────────────────
      let msgs;
      try {
        msgs = await sub.fetch({ batch: batchSize, expires: batchWindowMs });
      } catch (err: any) {
        if (!this.running) break;
        this.logger.warn({ err, consumerName }, 'fetch() error — skipping iteration');
        await sleep(1_000);
        continue;
      }

      // ── Collect parsed events ─────────────────────────────────────────
      const batch: DomainEvent[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawMsgs: any[] = [];

      for await (const msg of msgs) {
        let event: DomainEvent;
        try {
          const text = sc.decode(msg.data);
          event = JSON.parse(text) as DomainEvent;
        } catch (parseErr) {
          this.logger.warn(
            { err: parseErr, subject: msg.subject, consumerName },
            'Failed to parse message — routing to DLQ',
          );
          await this.sendToDlq(msg, null, parseErr);
          msg.term();
          continue;
        }

        batch.push(event);
        rawMsgs.push(msg);
      }

      if (batch.length === 0) {
        // Empty fetch window — yield to the event loop to prevent spin
        await sleep(0);
        continue;
      }

      // ── handleBatch ───────────────────────────────────────────────────
      try {
        await this.handleBatch(batch);

        // ACK all messages on success
        for (const msg of rawMsgs) {
          msg.ack();
        }

        // Record success for circuit breaker
        this.breaker.recordSuccess();

        this.logger.debug({ count: batch.length, consumerName }, 'Batch processed');
      } catch (err) {
        // Record failure — messages will be redelivered by NATS (no explicit NAK needed)
        this.breaker.recordFailure('transient');

        this.logger.warn(
          { err, count: batch.length, consumerName, state: this.breaker.getState() },
          'handleBatch error — messages will be redelivered',
        );
      }
    }

    // ── Cleanup ───────────────────────────────────────────────────────
    try {
      sub.unsubscribe();
    } catch {
      // Ignore unsubscribe errors on shutdown
    }

    this.logger.info({ consumerName }, 'BaseConsumer stopped');
  }

  /**
   * Signals the consumer to exit the pull loop after the current iteration.
   * Also prevents start() from beginning if called before start().
   */
  stop(): void {
    this.stopped = true;
    this.running = false;
  }

  /**
   * Exposes the circuit breaker for monitoring and testing.
   */
  getCircuitBreaker(): CircuitBreaker {
    return this.breaker;
  }

  // ── DLQ routing ───────────────────────────────────────────────────────

  private async sendToDlq(msg: any, event: DomainEvent | null, cause: unknown): Promise<void> {
    const { bus, stream, consumerName } = this.config;
    const dlqSubject = `dlq.${stream}.${consumerName}`;

    const dlqEvent = buildEvent(
      EVENT_TYPES.DLQ_MESSAGE,
      consumerName,
      {
        originalSubject: msg.subject,
        originalData: event ?? sc.decode(msg.data),
        cause: cause instanceof Error ? cause.message : String(cause),
        redeliveryCount: msg.info?.redeliveryCount ?? 0,
        traceId: msg.headers?.get('Gambit-Trace-Id') ?? 'unknown',
      },
      { traceId: msg.headers?.get('Gambit-Trace-Id') ?? 'unknown' },
    );

    try {
      await bus.publish(STREAMS.DLQ, dlqSubject, dlqEvent);
    } catch (err) {
      this.logger.warn({ err, dlqSubject }, 'Failed to publish to DLQ');
    }
  }
}

// ── Utility ───────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
