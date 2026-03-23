// event-schemas.ts — DomainEvent type, stream definitions, event type constants

// ── DomainEvent ───────────────────────────────────────────────────────

export interface DomainEventMetadata {
  traceId: string;
  teamId?: string;
  causationId?: string;
}

export interface DomainEvent<T = unknown> {
  /** ULID — globally unique, lexicographically sortable */
  id: string;
  /** Dot-namespaced event type, e.g. "signals.ingested" */
  type: string;
  /** Schema version for this event shape */
  version: number;
  /** Service that produced this event */
  source: string;
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Typed payload */
  data: T;
  /** Tracing & correlation metadata */
  metadata: DomainEventMetadata;
}

// ── Stream names ─────────────────────────────────────────────────────

export const STREAMS = {
  SIGNALS: 'SIGNALS',
  ENTITIES: 'ENTITIES',
  GAP_SCORES: 'GAP_SCORES',
  ALERTS: 'ALERTS',
  DLQ: 'DLQ',
  SYSTEM: 'SYSTEM',
} as const;

export type StreamName = (typeof STREAMS)[keyof typeof STREAMS];

// ── Stream configuration ──────────────────────────────────────────────

export interface StreamConfig {
  name: StreamName;
  subjects: string[];
  /** Retention in seconds */
  maxAge: number;
  storage: 'file' | 'memory';
}

const DAY = 86_400;
const HOUR = 3_600;

export const STREAM_CONFIGS: StreamConfig[] = [
  {
    name: STREAMS.SIGNALS,
    subjects: ['signals.>'],
    maxAge: 7 * DAY,
    storage: 'file',
  },
  {
    name: STREAMS.ENTITIES,
    subjects: ['entities.>'],
    maxAge: 7 * DAY,
    storage: 'file',
  },
  {
    name: STREAMS.GAP_SCORES,
    subjects: ['gaps.>'],
    maxAge: 7 * DAY,
    storage: 'file',
  },
  {
    name: STREAMS.ALERTS,
    subjects: ['alerts.>'],
    maxAge: 7 * DAY,
    storage: 'file',
  },
  {
    name: STREAMS.DLQ,
    subjects: ['dlq.>'],
    maxAge: 30 * DAY,
    storage: 'file',
  },
  {
    name: STREAMS.SYSTEM,
    subjects: ['system.>'],
    maxAge: 1 * DAY,
    storage: 'memory',
  },
];

// ── Event type constants ──────────────────────────────────────────────

export const EVENT_TYPES = {
  // Signals
  SIGNAL_INGESTED: 'signals.ingested',
  SIGNAL_PARSED: 'signals.parsed',
  SIGNAL_ENRICHED: 'signals.enriched',
  SIGNAL_DEDUPLICATED: 'signals.deduplicated',

  // Entities
  ENTITY_CREATED: 'entities.created',
  ENTITY_UPDATED: 'entities.updated',
  ENTITY_MERGED: 'entities.merged',
  ENTITY_RESOLVED: 'entities.resolved',

  // Gap scores
  GAP_SCORE_COMPUTED: 'gaps.score_computed',
  GAP_SCORE_DEGRADED: 'gaps.score_degraded',

  // Alerts
  ALERT_TRIGGERED: 'alerts.triggered',
  ALERT_RESOLVED: 'alerts.resolved',

  // System
  SYSTEM_HEALTH: 'system.health',
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',

  // DLQ
  DLQ_MESSAGE: 'dlq.message',
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];
