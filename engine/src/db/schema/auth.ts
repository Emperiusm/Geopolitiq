import { pgTable, text, timestamp, jsonb, uniqueIndex, index, boolean } from 'drizzle-orm/pg-core';
import { teamTierEnum, userRoleEnum } from './enums';

export const teams = pgTable('teams', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  tier: teamTierEnum('tier').default('free').notNull(),
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: uniqueIndex('idx_teams_slug').on(table.slug),
}));

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  role: userRoleEnum('role').default('member').notNull(),
  platformRole: text('platform_role').default('user').notNull(),
  providers: jsonb('providers').$type<any[]>().default([]),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  emailIdx: uniqueIndex('idx_users_email').on(table.email),
  teamIdx: index('idx_users_team').on(table.teamId),
}));

export const apiKeys = pgTable('api_keys', {
  id: text('id').primaryKey(),
  keyHash: text('key_hash').notNull(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  scopes: text('scopes').array().default([]),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  keyHashIdx: uniqueIndex('idx_api_keys_hash').on(table.keyHash),
  teamIdx: index('idx_api_keys_team').on(table.teamId),
}));

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_sessions_user').on(table.userId),
  expiresIdx: index('idx_sessions_expires').on(table.expiresAt),
}));

export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey(),
  teamId: text('team_id'),
  userId: text('user_id'),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  before: jsonb('before').$type<Record<string, any> | null>(),
  after: jsonb('after').$type<Record<string, any> | null>(),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  teamIdx: index('idx_audit_team').on(table.teamId),
  targetIdx: index('idx_audit_target').on(table.targetType, table.targetId),
  createdIdx: index('idx_audit_created').on(table.createdAt),
  actionIdx: index('idx_audit_action').on(table.action),
}));
