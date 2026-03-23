import { pgTable, text, numeric, timestamp, jsonb, integer, index, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { polarityEnum, verificationEnum } from './enums';
import { entities } from './entities';

export const sources = pgTable('sources', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  url: text('url'),
  tier: integer('tier').default(3).notNull(),
  sourceType: text('source_type').notNull(),
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
