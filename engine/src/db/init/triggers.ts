import { sql } from 'drizzle-orm';
import type { DrizzleClient } from '../transaction';

const TABLES_WITH_UPDATED_AT = [
  'entities', 'teams', 'users', 'sources', 'signals',
  'gap_scores', 'alerts', 'watchlists', 'foia_requests', 'memory_tokens',
];

export async function createTriggers(db: DrizzleClient) {
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  for (const table of TABLES_WITH_UPDATED_AT) {
    await db.execute(sql.raw(`
      DROP TRIGGER IF EXISTS set_updated_at ON ${table};
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON ${table}
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at();
    `));
  }
}
