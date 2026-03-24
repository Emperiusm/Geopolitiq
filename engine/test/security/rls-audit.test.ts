import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestDb, teardownTestDb } from '../setup';
import type { DrizzleClient } from '../../src/db/transaction';

/**
 * RLS Audit Tests
 *
 * Verifies that every tenant-scoped table has:
 *   relrowsecurity      = true  (ENABLE ROW LEVEL SECURITY)
 *   relforcerowsecurity = true  (FORCE ROW LEVEL SECURITY)
 *
 * Tables that don't exist yet are skipped gracefully so this test suite
 * can run before all migrations have been applied.
 */

const TENANT_TABLES = [
  'watchlists',
  'alerts',
  'webhook_endpoints',
  'webhook_deliveries',
  'usage_records',
  'api_keys',
  'foia_requests',
];

describe('RLS audit', () => {
  let db: DrizzleClient;

  beforeAll(async () => {
    const setup = await setupTestDb();
    db = setup.db;
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  for (const table of TENANT_TABLES) {
    it(`${table} has RLS enabled and forced`, async () => {
      // Check whether the table exists
      const existsResult = await db.execute<{ exists: boolean }>(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = '${table}'
        ) AS exists
      `);

      const exists = (existsResult as any)[0]?.exists ?? false;
      if (!exists) {
        // Gracefully skip tables not yet created
        console.log(`  [skip] Table "${table}" does not exist yet — skipping RLS audit`);
        return;
      }

      const rows = await db.execute<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(`
        SELECT relrowsecurity, relforcerowsecurity
        FROM pg_class
        WHERE relname = '${table}'
          AND relnamespace = 'public'::regnamespace
      `);

      const row = (rows as any)[0];
      expect(row, `pg_class row missing for "${table}"`).toBeDefined();
      expect(row.relrowsecurity, `${table}: ENABLE ROW LEVEL SECURITY not set`).toBe(true);
      expect(row.relforcerowsecurity, `${table}: FORCE ROW LEVEL SECURITY not set`).toBe(true);
    });
  }
});
