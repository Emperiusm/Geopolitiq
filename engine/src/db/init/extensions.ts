import { sql } from 'drizzle-orm';
import type { DrizzleClient } from '../transaction';

export async function createExtensions(db: DrizzleClient) {
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
  // PostGIS deferred — add when geo queries needed
}
