import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { GambitConfig, Logger } from '@gambit/common';
import type { DrizzleClient } from '../db/transaction';

let db: DrizzleClient;
let sql: ReturnType<typeof postgres>;

export async function connectPostgres(config: GambitConfig, logger: Logger): Promise<DrizzleClient> {
  sql = postgres(config.postgres.url, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
  });

  db = drizzle(sql);

  await sql`SELECT 1`;
  logger.info('PostgreSQL connected');

  const warmPromises = Array.from({ length: 5 }, () => sql`SELECT 1`);
  await Promise.all(warmPromises);
  logger.info({ poolSize: 5 }, 'PostgreSQL pool warmed');

  return db;
}

export function getDb(): DrizzleClient {
  if (!db) throw new Error('PostgreSQL not connected');
  return db;
}

export async function closePgPool(): Promise<void> {
  if (sql) await sql.end();
}
