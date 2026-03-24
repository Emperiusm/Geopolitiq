import { sql } from 'drizzle-orm';
import type { DrizzleClient } from '../transaction';

/**
 * Creates application-level PostgreSQL roles with least-privilege permissions.
 *
 * Roles:
 *   gambit_api      — The API server role.  Read-all + write on tenant tables.
 *   gambit_ingest   — The ingest pipeline role.  Read/write on shared tables only.
 *   gambit_migrate  — The migration role.  Full DDL access.
 *
 * This function is idempotent: it checks pg_roles before attempting CREATE ROLE.
 */
export async function initDatabaseRoles(db: DrizzleClient): Promise<void> {
  // ------------------------------------------------------------------
  // 1. Create roles (idempotent via pg_roles check)
  // ------------------------------------------------------------------
  const roles = ['gambit_api', 'gambit_ingest', 'gambit_migrate'] as const;

  for (const role of roles) {
    await db.execute(sql.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN
          CREATE ROLE ${role} NOLOGIN;
        END IF;
      END
      $$;
    `));
  }

  // ------------------------------------------------------------------
  // 2. gambit_api — SELECT on all tables, write on tenant-owned tables
  // ------------------------------------------------------------------
  const tenantWriteTables = [
    'watchlists',
    'alerts',
    'webhook_endpoints',
    'webhook_deliveries',
    'usage_records',
    'api_keys',
    'foia_requests',
    'sessions',
  ];

  // Blanket SELECT
  await db.execute(sql.raw(`GRANT SELECT ON ALL TABLES IN SCHEMA public TO gambit_api`));

  // INSERT / UPDATE / DELETE on tenant tables
  for (const table of tenantWriteTables) {
    await db.execute(sql.raw(`
      GRANT INSERT, UPDATE, DELETE ON TABLE ${table} TO gambit_api
    `));
  }

  // ------------------------------------------------------------------
  // 3. gambit_ingest — SELECT + INSERT + UPDATE on shared ingestion tables
  // ------------------------------------------------------------------
  const ingestTables = ['entities', 'signals', 'sources', 'pipeline_runs'];

  for (const table of ingestTables) {
    await db.execute(sql.raw(`
      GRANT SELECT, INSERT, UPDATE ON TABLE ${table} TO gambit_ingest
    `));
  }

  // ------------------------------------------------------------------
  // 4. gambit_migrate — ALL on all tables (DDL is handled via superuser
  //    connection but grant ALL for DML safety)
  // ------------------------------------------------------------------
  await db.execute(sql.raw(`GRANT ALL ON ALL TABLES IN SCHEMA public TO gambit_migrate`));
  await db.execute(sql.raw(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO gambit_migrate`));
}
