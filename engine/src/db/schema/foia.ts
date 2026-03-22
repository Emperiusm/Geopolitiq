import { pgTable, text, timestamp, jsonb, integer, index, boolean } from 'drizzle-orm/pg-core';
import { teams } from './auth';
import { entities } from './entities';

export const foiaAgencies = pgTable('foia_agencies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  abbreviation: text('abbreviation'),
  jurisdiction: text('jurisdiction').notNull(),
  contactEmail: text('contact_email'),
  portalUrl: text('portal_url'),
  averageResponseDays: integer('average_response_days'),
  meta: jsonb('meta').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('idx_foia_agencies_name').on(table.name),
  jurisdictionIdx: index('idx_foia_agencies_jurisdiction').on(table.jurisdiction),
}));

export const foiaRequests = pgTable('foia_requests', {
  id: text('id').primaryKey(),
  teamId: text('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  agencyId: text('agency_id').notNull().references(() => foiaAgencies.id),
  entityId: text('entity_id').references(() => entities.id),
  status: text('status').notNull().default('draft'),
  subject: text('subject').notNull(),
  body: text('body').notNull(),
  trackingNumber: text('tracking_number'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  responseAt: timestamp('response_at', { withTimezone: true }),
  dueAt: timestamp('due_at', { withTimezone: true }),
  documents: jsonb('documents').$type<any[]>().default([]),
  meta: jsonb('meta').$type<Record<string, any>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  teamIdx: index('idx_foia_requests_team').on(table.teamId),
  agencyIdx: index('idx_foia_requests_agency').on(table.agencyId),
  entityIdx: index('idx_foia_requests_entity').on(table.entityId),
  statusIdx: index('idx_foia_requests_status').on(table.status),
}));
