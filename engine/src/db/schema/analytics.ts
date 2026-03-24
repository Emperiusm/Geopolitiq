import { pgTable, text, integer, timestamp, index, boolean } from 'drizzle-orm/pg-core';
import { teams } from './auth';

export const searchAnalytics = pgTable('search_analytics', {
  id: text('id').primaryKey(),
  query: text('query').notNull(),
  resultsReturned: integer('results_returned').default(0).notNull(),
  resultClicked: text('result_clicked'),
  noResults: boolean('no_results').default(false).notNull(),
  source: text('source').notNull(),
  teamId: text('team_id').references(() => teams.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  queryIdx: index('idx_search_analytics_query').on(table.query),
  teamIdx: index('idx_search_analytics_team').on(table.teamId),
  createdIdx: index('idx_search_analytics_created').on(table.createdAt),
  noResultsIdx: index('idx_search_analytics_no_results').on(table.noResults),
}));
