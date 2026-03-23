import { pgTable, text, numeric, timestamp, jsonb, integer, index, uniqueIndex, boolean } from 'drizzle-orm/pg-core';
import { entityTypeEnum, entityStatusEnum } from './enums';

export const entities = pgTable('entities', {
  id: text('id').primaryKey(),
  type: entityTypeEnum('type').notNull(),
  name: text('name').notNull(),
  aliases: text('aliases').array().default([]),
  parentId: text('parent_id').references((): any => entities.id),
  status: entityStatusEnum('status').default('active').notNull(),
  statusDetail: text('status_detail'),
  statusAt: timestamp('status_at', { withTimezone: true }),
  sector: text('sector'),
  jurisdiction: text('jurisdiction'),
  domains: text('domains').array().default([]),
  lat: numeric('lat'),
  lng: numeric('lng'),
  externalIds: jsonb('external_ids').$type<Record<string, string>>().default({}),
  tags: text('tags').array().default([]),
  risk: text('risk'),
  ticker: text('ticker'),
  iso2: text('iso2'),
  meta: jsonb('meta').$type<Record<string, any>>().default({}),
  signalCountDeclarative: integer('signal_count_declarative').default(0),
  signalCountBehavioral: integer('signal_count_behavioral').default(0),
  realityScore: numeric('reality_score'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  typeIdx: index('idx_entities_type').on(table.type),
  statusIdx: index('idx_entities_status').on(table.status),
  tickerIdx: index('idx_entities_ticker').on(table.ticker),
  iso2Idx: index('idx_entities_iso2').on(table.iso2),
  riskIdx: index('idx_entities_risk').on(table.risk),
  parentIdx: index('idx_entities_parent').on(table.parentId),
}));

export const entityEdges = pgTable('entity_edges', {
  id: text('id').primaryKey(),
  fromId: text('from_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  toId: text('to_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  relation: text('relation').notNull(),
  weight: numeric('weight').default('1.0'),
  source: text('source').default('seed'),
  meta: jsonb('meta').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  fromIdx: index('idx_edges_from').on(table.fromId),
  toIdx: index('idx_edges_to').on(table.toId),
  relationIdx: index('idx_edges_relation').on(table.relation),
  fromRelationIdx: index('idx_edges_from_relation').on(table.fromId, table.relation),
  uniqueEdge: uniqueIndex('idx_edges_unique').on(table.fromId, table.relation, table.toId),
}));

export const resolutionAliases = pgTable('resolution_aliases', {
  id: text('id').primaryKey(),
  entityId: text('entity_id').notNull().references(() => entities.id, { onDelete: 'cascade' }),
  alias: text('alias').notNull(),
  source: text('source').notNull(),
  confidence: numeric('confidence').default('0.5'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  aliasIdx: index('idx_res_aliases_alias').on(table.alias),
  entityIdx: index('idx_res_aliases_entity').on(table.entityId),
}));

export const resolutionFeedback = pgTable('resolution_feedback', {
  id: text('id').primaryKey(),
  rawName: text('raw_name').notNull(),
  resolvedTo: text('resolved_to').notNull().references(() => entities.id),
  correct: boolean('correct').notNull(),
  correctedTo: text('corrected_to').references(() => entities.id),
  feedbackSource: text('feedback_source').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  rawNameIdx: index('idx_res_feedback_name').on(table.rawName),
}));
