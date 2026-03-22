import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type DrizzleClient = PostgresJsDatabase<Record<string, never>>;
export type DrizzleTransaction = Parameters<Parameters<DrizzleClient['transaction']>[0]>[0];

export async function withTransaction<T>(
  db: DrizzleClient,
  work: (tx: DrizzleTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => work(tx));
}
