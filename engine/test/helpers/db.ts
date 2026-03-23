import { sql } from 'drizzle-orm';
import type { DrizzleClient } from '../../src/db/transaction';

const TABLES_TO_TRUNCATE = [
  'audit_log',
  'search_analytics',
  'webhook_deliveries',
  'usage_records',
  'sync_dlq',
  'signal_dlq',
  'pipeline_runs',
  'extraction_samples',
  'memory_token_versions',
  'memory_tokens',
  'foia_requests',
  'foia_agencies',
  'watchlists',
  'alerts',
  'gap_scores',
  'domain_taxonomy',
  'signals',
  'sources',
  'resolution_feedback',
  'resolution_aliases',
  'entity_edges',
  'sessions',
  'api_keys',
  'users',
  'teams',
  'entities',
];

export async function resetDb(db: DrizzleClient) {
  // Truncate in reverse dependency order
  for (const table of TABLES_TO_TRUNCATE) {
    try {
      await db.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE`));
    } catch {
      // Table may not exist yet
    }
  }
}
