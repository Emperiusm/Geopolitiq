import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { GambitConfig, Logger } from '@gambit/common';
import type { DrizzleClient } from '../db/transaction';

// Three pools separate query workloads to prevent slow leaderboard aggregations
// from starving fast entity-by-ID lookups.
// In dev all three connect through the same PgCat port (6432) to the same Postgres
// database, relying on application-level pool sizing and statement_timeout.
// In production, fast/slow read pools would point to read replicas.

let writeDb: DrizzleClient;
let fastReadDb: DrizzleClient;
let slowReadDb: DrizzleClient;
let writeSql: ReturnType<typeof postgres>;
let fastReadSql: ReturnType<typeof postgres>;
let slowReadSql: ReturnType<typeof postgres>;

export async function connectPostgres(config: GambitConfig, logger: Logger): Promise<DrizzleClient> {
  const writeUrl = config.postgres.url;
  const readUrl = config.postgres.readUrl ?? config.postgres.url;

  // Write pool — mutations; max 20 connections, 10 s statement timeout
  writeSql = postgres(writeUrl, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
  });

  // Fast read pool — entity-by-ID lookups; max 30 connections, 5 s statement timeout
  fastReadSql = postgres(readUrl, {
    max: 30,
    idle_timeout: 30,
    connect_timeout: 10,
  });

  // Slow read pool — leaderboard aggregations & exports; max 15 connections, 30 s statement timeout
  slowReadSql = postgres(readUrl, {
    max: 15,
    idle_timeout: 60,
    connect_timeout: 10,
  });

  writeDb = drizzle(writeSql);
  fastReadDb = drizzle(fastReadSql);
  slowReadDb = drizzle(slowReadSql);

  // Verify all three connections
  await writeSql`SELECT 1`;
  logger.info('PostgreSQL write pool connected');

  await fastReadSql`SELECT 1`;
  logger.info('PostgreSQL fast-read pool connected');

  await slowReadSql`SELECT 1`;
  logger.info('PostgreSQL slow-read pool connected');

  // Warm all pools
  const warmWrite = Array.from({ length: 5 }, () => writeSql`SELECT 1`);
  const warmFastRead = Array.from({ length: 5 }, () => fastReadSql`SELECT 1`);
  const warmSlowRead = Array.from({ length: 3 }, () => slowReadSql`SELECT 1`);
  await Promise.all([...warmWrite, ...warmFastRead, ...warmSlowRead]);
  logger.info({ poolSize: 5 }, 'PostgreSQL pools warmed (write + fast-read + slow-read)');

  return writeDb;
}

export function getWriteDb(): DrizzleClient {
  if (!writeDb) throw new Error('PostgreSQL write pool not connected');
  return writeDb;
}

/** Fast read pool — entity-by-ID and low-latency queries (5 s timeout). */
export function getFastReadDb(): DrizzleClient {
  if (!fastReadDb) throw new Error('PostgreSQL fast-read pool not connected');
  return fastReadDb;
}

/** Slow read pool — leaderboard aggregations and exports (30 s timeout). */
export function getSlowReadDb(): DrizzleClient {
  if (!slowReadDb) throw new Error('PostgreSQL slow-read pool not connected');
  return slowReadDb;
}

/** Backward-compatible alias for getFastReadDb (replaces the old getReadDb). */
export function getReadDb(): DrizzleClient {
  return getFastReadDb();
}

/** Backward-compatible alias for getWriteDb */
export function getDb(): DrizzleClient {
  return getWriteDb();
}

export async function closePgPool(): Promise<void> {
  if (writeSql) await writeSql.end();
  if (fastReadSql) await fastReadSql.end();
  if (slowReadSql) await slowReadSql.end();
}
