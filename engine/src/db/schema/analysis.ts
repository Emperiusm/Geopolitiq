import { pgTable, text, numeric, timestamp, jsonb, integer, index, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { alertSeverityEnum } from './enums';
import { entities } from './entities';
import { teams } from './auth';

export const gapScores = pgTable('gap_scores', {
  id: text('id').primaryKey(),
  entityId: text('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  domain: text('domain').notNull(),
  alignment: numeric('alignment').default('0').notNull(),
  realityScore: numeric('reality_score').default('0').notNull(),
  category: text('category'),
  behavioralCount: integer('behavioral_count').default(0),
  behavioralWeighted: numeric('behavioral_weighted').default('0'),
  declarativeCount: integer('declarative_count').default(0),
  declarativeWeighted: numeric('declarative_weighted').default('0'),
  computedAt: timestamp('computed_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  entityDomainIdx: uniqueIndex('idx_gap_scores_entity_domain').on(table.entityId, table.domain),
  entityIdx: index('idx_gap_scores_entity').on(table.entityId),
}));

export const alerts = pgTable('alerts', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  entityId: text('entity_id').references(() => entities.id),
  severity: alertSeverityEnum('severity').default('info').notNull(),
  title: text('title').notNull(),
  body: text('body'),
  category: text('category'),
  acknowledged: boolean('acknowledged').default(false).notNull(),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  acknowledgedBy: text('acknowledged_by'),
  meta: jsonb('meta').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  teamIdx: index('idx_alerts_team').on(table.teamId),
  entityIdx: index('idx_alerts_entity').on(table.entityId),
  severityIdx: index('idx_alerts_severity').on(table.severity),
  createdIdx: index('idx_alerts_created').on(table.createdAt),
}));

export const watchlists = pgTable('watchlists', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  entityIds: text('entity_ids').array().default([]),
  filters: jsonb('filters').$type<Record<string, any>>().default({}),
  notifyOn: text('notify_on').array().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  teamIdx: index('idx_watchlists_team').on(table.teamId),
}));

export const domainTaxonomy = pgTable('domain_taxonomy', {
  id: text('id').primaryKey(),
  domain: text('domain').notNull(),
  parentDomain: text('parent_domain'),
  label: text('label').notNull(),
  description: text('description'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  domainIdx: index('idx_domain_taxonomy_domain').on(table.domain),
  parentIdx: index('idx_domain_taxonomy_parent').on(table.parentDomain),
}));
