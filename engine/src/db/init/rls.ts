import { sql } from 'drizzle-orm';
import type { DrizzleClient } from '../transaction';

const RLS_TABLES = [
  'watchlists', 'alerts', 'foia_requests',
  'usage_records', 'webhook_endpoints', 'webhook_deliveries', 'api_keys',
];

export async function createRlsPolicies(db: DrizzleClient) {
  for (const table of RLS_TABLES) {
    await db.execute(sql.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`));
    // FORCE RLS ensures table owner connections also obey policies
    await db.execute(sql.raw(`ALTER TABLE ${table} FORCE ROW LEVEL SECURITY`));
    await db.execute(sql.raw(`
      DROP POLICY IF EXISTS ${table}_team_isolation ON ${table};
      CREATE POLICY ${table}_team_isolation ON ${table}
        USING (team_id = current_setting('app.team_id', true));
    `));
  }
}
