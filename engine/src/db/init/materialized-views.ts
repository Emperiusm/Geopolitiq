import { sql } from 'drizzle-orm';
import type { DrizzleClient } from '../transaction';

export async function createMaterializedViews(db: DrizzleClient) {
  await db.execute(sql`
    CREATE MATERIALIZED VIEW IF NOT EXISTS entity_listing AS
    SELECT
      e.id, e.type, e.name, e.status, e.risk, e.ticker, e.iso2,
      e.lat, e.lng, e.tags, e.domains, e.sector, e.jurisdiction,
      e.signal_count_declarative, e.signal_count_behavioral,
      e.reality_score, e.updated_at
    FROM entities e
    WHERE e.status = 'active'
  `);

  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_listing_id ON entity_listing (id)
  `);
}
