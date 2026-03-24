import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { GambitConfig, Logger } from '@gambit/common';
import type { DrizzleClient } from '../db/transaction';

let writeDb: DrizzleClient;
let readDb: DrizzleClient;
let writeSql: ReturnType<typeof postgres>;
let readSql: ReturnType<typeof postgres>;

export async function connectPostgres(config: GambitConfig, logger: Logger): Promise<DrizzleClient> {
  const writeUrl = config.postgres.url;
  const readUrl = config.postgres.readUrl ?? config.postgres.url;

  writeSql = postgres(writeUrl, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
  });

  readSql = postgres(readUrl, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
  });

  writeDb = drizzle(writeSql);
  readDb = drizzle(readSql);

  // Verify both connections
  await writeSql`SELECT 1`;
  logger.info('PostgreSQL write pool connected');

  await readSql`SELECT 1`;
  logger.info('PostgreSQL read pool connected');

  // Warm both pools
  const warmWrite = Array.from({ length: 5 }, () => writeSql`SELECT 1`);
  const warmRead = Array.from({ length: 5 }, () => readSql`SELECT 1`);
  await Promise.all([...warmWrite, ...warmRead]);
  logger.info({ poolSize: 5 }, 'PostgreSQL pools warmed (write + read)');

  return writeDb;
}

export function getWriteDb(): DrizzleClient {
  if (!writeDb) throw new Error('PostgreSQL write pool not connected');
  return writeDb;
}

export function getReadDb(): DrizzleClient {
  if (!readDb) throw new Error('PostgreSQL read pool not connected');
  return readDb;
}

/** Backward-compatible alias for getWriteDb */
export function getDb(): DrizzleClient {
  return getWriteDb();
}

export async function closePgPool(): Promise<void> {
  if (writeSql) await writeSql.end();
  if (readSql) await readSql.end();
}
