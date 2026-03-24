import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { DrizzleClient } from '../src/db/transaction';

const TEST_DB_URL = process.env.TEST_POSTGRES_URL ?? 'postgresql://gambit_test:gambit_test@localhost:5433/gambit_test';

let sql: ReturnType<typeof postgres>;
let db: DrizzleClient;

export async function setupTestDb() {
  sql = postgres(TEST_DB_URL, { max: 5 });
  db = drizzle(sql);

  // Run a basic health check
  await sql`SELECT 1`;

  return { db, sql };
}

export async function teardownTestDb() {
  if (sql) await sql.end();
}

export function getTestDb(): DrizzleClient {
  if (!db) throw new Error('Test DB not initialized — call setupTestDb() first');
  return db;
}

export function getTestSql() {
  if (!sql) throw new Error('Test SQL not initialized');
  return sql;
}
