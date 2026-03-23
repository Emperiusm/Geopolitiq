import { pgTable, text, numeric, timestamp, jsonb, integer, index, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { teams } from './auth';
import { sources } from './signals';

export const pipelineRuns = pgTable('pipeline_runs', {
  id: text('id').primaryKey(),
  pipelineName: text('pipeline_name').notNull(),
  status: text('status').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  itemsProcessed: integer('items_processed').default(0),
  itemsFailed: integer('items_failed').default(0),
  error: text('error'),
  sourceId: text('source_id').references(() => sources.id),
  fetched: integer('fetched').default(0),
  parsed: integer('parsed').default(0),
  deduplicated: integer('deduplicated').default(0),
  classified: integer('classified').default(0),
  resolved: integer('resolved').default(0),
  written: integer('written').default(0),
  graphed: integer('graphed').default(0),
  published: integer('published').default(0),
  dlqd: integer('dlqd').default(0),
  costTokensIn: integer('cost_tokens_in').default(0),
  costTokensOut: integer('cost_tokens_out').default(0),
  costEstimatedUsd: numeric('cost_estimated_usd').default('0'),
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

export const parserPromptVersions = pgTable('parser_prompt_versions', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => sources.id),
  version: integer('version').notNull(),
  prompt: text('prompt').notNull(),
  responseSchema: jsonb('response_schema').$type<Record<string, any>>().notNull(),
  accuracyAtRotation: numeric('accuracy_at_rotation'),
  dlqRateAtRotation: numeric('dlq_rate_at_rotation'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sourceVersionIdx: uniqueIndex('idx_prompt_versions_source_version').on(table.sourceId, table.version),
}));

export const sourceConfigAudit = pgTable('source_config_audit', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => sources.id),
  changedBy: text('changed_by').notNull(),
  field: text('field').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index('idx_config_audit_source').on(table.sourceId),
}));

export const clickhouseSyncDlq = pgTable('clickhouse_sync_dlq', {
  id: text('id').primaryKey(),
  signalId: text('signal_id').notNull(),
  error: text('error').notNull(),
  attemptCount: integer('attempt_count').default(1),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }).defaultNow().notNull(),
  resolution: text('resolution'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const webhookEndpoints = pgTable('webhook_endpoints', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id),
  url: text('url').notNull(),
  secret: text('secret').notNull(),
  eventTypes: text('event_types').array().notNull(),
  active: boolean('active').default(true),
  failureCount: integer('failure_count').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  teamIdx: index('idx_webhook_endpoints_team').on(table.teamId),
}));
