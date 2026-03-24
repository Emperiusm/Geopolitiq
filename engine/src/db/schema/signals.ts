import { pgTable, text, numeric, timestamp, jsonb, integer, index, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { polarityEnum, verificationEnum, parserModeEnum } from './enums';
import { entities } from './entities';

export const sources = pgTable('sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url'),
  tier: integer('tier').default(3).notNull(),
  sourceType: text('source_type').notNull(),
  enabled: boolean('enabled').default(true).notNull(),

  // Fetcher config
  fetcherType: text('fetcher_type').notNull().default('rss'),
  fetcherUrl: text('fetcher_url'),
  fetcherSchedule: text('fetcher_schedule'),
  fetcherPagination: text('fetcher_pagination').default('none'),
  fetcherAuth: jsonb('fetcher_auth').$type<{ type: string; keyRef?: string }>(),
  fetcherRateLimitMs: integer('fetcher_rate_limit_ms').default(1000),
  fetcherState: jsonb('fetch_state').$type<Record<string, any>>().default({}),
  fetcherScheduleOptimized: text('fetcher_schedule_optimized'),

  // Parser config
  parserMode: parserModeEnum('parser_mode').default('structured'),
  parserRef: text('parser_ref'),
  parserPrompt: text('parser_prompt'),
  parserResponseSchema: jsonb('parser_response_schema').$type<Record<string, any>>(),
  parserModel: text('parser_model'),
  parserMaxInputTokens: integer('parser_max_input_tokens').default(4000),
  parserRouting: jsonb('parser_routing').$type<Record<string, any>>(),

  // Classification
  polarity: polarityEnum('polarity'),
  category: text('category'),
  domains: text('domains').array().default([]),

  // Dependencies
  dependencies: jsonb('dependencies').$type<Array<{ sourceId: string; requirement: string }>>().default([]),
  upstreamGroup: text('upstream_group'),

  // Health
  healthConsecutiveFailures: integer('health_consecutive_failures').default(0),
  healthCircuitState: text('health_circuit_state').default('closed'),
  healthCircuitBackoffMs: integer('health_circuit_backoff_ms').default(900000),
  healthLastSuccessAt: timestamp('health_last_success_at', { withTimezone: true }),
  healthLastFailureAt: timestamp('health_last_failure_at', { withTimezone: true }),

  // Cost tracking
  costTotalTokensIn: integer('cost_total_tokens_in').default(0),
  costTotalTokensOut: integer('cost_total_tokens_out').default(0),
  costPerSignal: numeric('cost_per_signal'),
  costBudgetUsd: numeric('cost_budget_usd'),

  // Learning
  learningExtractionCount: integer('learning_extraction_count').default(0),
  learningAccuracy: numeric('learning_accuracy'),
  learningPromoted: boolean('learning_promoted').default(false),
  learningPromotionStage: text('learning_promotion_stage').default('none'),
  learningShadowSampleRate: numeric('learning_shadow_sample_rate').default('0.05'),

  // Backfill
  backfill: jsonb('backfill').$type<Record<string, any>>(),

  // Legacy compat
  parser: text('parser'),
  schedule: text('schedule'),
  lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
  lastError: text('last_error'),
  active: boolean('active').default(true).notNull(),
  meta: jsonb('meta').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('idx_sources_name').on(table.name),
  typeIdx: index('idx_sources_type').on(table.sourceType),
  activeIdx: index('idx_sources_active').on(table.active),
  enabledIdx: index('idx_sources_enabled').on(table.enabled),
  upstreamGroupIdx: index('idx_sources_upstream_group').on(table.upstreamGroup),
  circuitStateIdx: index('idx_sources_circuit_state').on(table.healthCircuitState),
}));

export const signals = pgTable('signals', {
  id: text('id').primaryKey(),
  entityId: text('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  sourceId: text('source_id').notNull().references(() => sources.id),
  polarity: polarityEnum('polarity').notNull(),
  category: text('category').notNull(),
  headline: text('headline').notNull(),
  body: text('body'),
  url: text('url'),
  intensity: numeric('intensity').default('0.5'),
  confidence: numeric('confidence').default('0.5'),
  domains: text('domains').array().default([]),
  tags: text('tags').array().default([]),
  contentHash: text('content_hash').notNull(),
  verification: verificationEnum('verification').default('unverified').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
  isBackfill: boolean('is_backfill').default(false),
  simhash: text('simhash'),
  eventFingerprint: text('event_fingerprint'),
  corroborationCount: integer('corroboration_count').default(0),
  secondaryEntities: text('secondary_entities').array().default([]),
  relatedSignals: jsonb('related_signals').$type<Array<{ signalId: string; relation: string }>>().default([]),
  extractedClaims: jsonb('extracted_claims').$type<Array<Record<string, any>>>().default([]),
  financialWeight: jsonb('financial_weight').$type<{ amount?: number; currency?: string; magnitude?: string }>(),
  rawPayload: jsonb('raw_payload').$type<Record<string, any>>(),
  meta: jsonb('meta').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  entityPolarityIdx: index('idx_signals_entity_polarity').on(table.entityId, table.polarity),
  sourceIdx: index('idx_signals_source').on(table.sourceId),
  categoryIdx: index('idx_signals_category').on(table.category),
  contentHashIdx: uniqueIndex('idx_signals_content_hash').on(table.contentHash),
  expiresIdx: index('idx_signals_expires').on(table.expiresAt),
  publishedIdx: index('idx_signals_published').on(table.publishedAt),
}));
