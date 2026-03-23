import { pgTable, text, numeric, timestamp, jsonb, integer, index, boolean } from 'drizzle-orm/pg-core';
import { parserModeEnum } from './enums';
import { sources } from './signals';

export const memoryTokens = pgTable('memory_tokens', {
  id: text('id').primaryKey(),
  sourceId: text('source_id').notNull().references(() => sources.id),
  parserMode: parserModeEnum('parser_mode').notNull(),
  tokenKey: text('token_key').notNull(),
  embedding: jsonb('embedding').$type<number[]>().default([]),
  accuracy: numeric('accuracy').default('0'),
  sampleCount: integer('sample_count').default(0),
  active: boolean('active').default(true).notNull(),
  meta: jsonb('meta').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  sourceIdx: index('idx_memory_tokens_source').on(table.sourceId),
  tokenKeyIdx: index('idx_memory_tokens_key').on(table.tokenKey),
  modeIdx: index('idx_memory_tokens_mode').on(table.parserMode),
}));

export const memoryTokenVersions = pgTable('memory_token_versions', {
  id: text('id').primaryKey(),
  tokenId: text('token_id').notNull().references(() => memoryTokens.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  embedding: jsonb('embedding').$type<number[]>().default([]),
  accuracy: numeric('accuracy').default('0'),
  sampleCount: integer('sample_count').default(0),
  promotedAt: timestamp('promoted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index('idx_memory_versions_token').on(table.tokenId),
  versionIdx: index('idx_memory_versions_version').on(table.tokenId, table.version),
}));

export const extractionSamples = pgTable('extraction_samples', {
  id: text('id').primaryKey(),
  tokenId: text('token_id').notNull().references(() => memoryTokens.id, { onDelete: 'cascade' }),
  inputText: text('input_text').notNull(),
  expectedOutput: jsonb('expected_output').$type<Record<string, any>>().notNull(),
  actualOutput: jsonb('actual_output').$type<Record<string, any>>(),
  correct: boolean('correct'),
  feedback: text('feedback'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index('idx_extraction_samples_token').on(table.tokenId),
  correctIdx: index('idx_extraction_samples_correct').on(table.correct),
}));
