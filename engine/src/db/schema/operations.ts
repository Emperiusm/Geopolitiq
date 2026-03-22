import { pgTable, text, numeric, timestamp, jsonb, integer, index, boolean } from 'drizzle-orm/pg-core';
import { teams } from './auth';

export const pipelineRuns = pgTable('pipeline_runs', {
  id: text('id').primaryKey(),
  pipelineName: text('pipeline_name').notNull(),
  status: text('status').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  itemsProcessed: integer('items_processed').default(0),
  itemsFailed: integer('items_failed').default(0),
  error: text('error'),
  meta: jsonb('meta').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pipelineIdx: index('idx_pipeline_runs_pipeline').on(table.pipelineName),
  statusIdx: index('idx_pipeline_runs_status').on(table.status),
  startedIdx: index('idx_pipeline_runs_started').on(table.startedAt),
}));

export const signalDlq = pgTable('signal_dlq', {
  id: text('id').primaryKey(),
  sourceId: text('source_id'),
  rawPayload: jsonb('raw_payload').$type<Record<string, any>>().notNull(),
  error: text('error').notNull(),
  attemptCount: integer('attempt_count').default(1),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolution: text('resolution'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index('idx_signal_dlq_source').on(table.sourceId),
  resolvedIdx: index('idx_signal_dlq_resolved').on(table.resolvedAt),
}));

export const syncDlq = pgTable('sync_dlq', {
  id: text('id').primaryKey(),
  collection: text('collection').notNull(),
  documentId: text('document_id').notNull(),
  operationType: text('operation_type').notNull(),
  error: text('error').notNull(),
  document: jsonb('document').$type<Record<string, any>>(),
  attemptCount: integer('attempt_count').default(1),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolution: text('resolution'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  collectionIdx: index('idx_sync_dlq_collection').on(table.collection),
  documentIdx: index('idx_sync_dlq_document').on(table.documentId),
  resolvedIdx: index('idx_sync_dlq_resolved').on(table.resolvedAt),
}));

export const usageRecords = pgTable('usage_records', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  resource: text('resource').notNull(),
  quantity: integer('quantity').default(1).notNull(),
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  meta: jsonb('meta').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  teamIdx: index('idx_usage_records_team').on(table.teamId),
  resourceIdx: index('idx_usage_records_resource').on(table.resource),
  periodIdx: index('idx_usage_records_period').on(table.periodStart, table.periodEnd),
}));

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  event: text('event').notNull(),
  payload: jsonb('payload').$type<Record<string, any>>().notNull(),
  statusCode: integer('status_code'),
  responseBody: text('response_body'),
  attemptCount: integer('attempt_count').default(1),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  teamIdx: index('idx_webhook_deliveries_team').on(table.teamId),
  eventIdx: index('idx_webhook_deliveries_event').on(table.event),
  retryIdx: index('idx_webhook_deliveries_retry').on(table.nextRetryAt),
}));
