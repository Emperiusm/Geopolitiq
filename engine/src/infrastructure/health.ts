import { sql } from 'drizzle-orm';
import type { DrizzleClient } from '../db/transaction';
import type { TypesenseClient } from './typesense';
import type { ClickhouseClient } from './clickhouse';
import type { MinioClient } from './minio';

export async function checkPostgres(db: DrizzleClient): Promise<string> {
  try { await db.execute(sql`SELECT 1`); return 'ok'; }
  catch { return 'down'; }
}

export async function checkTypesense(client: TypesenseClient): Promise<string> {
  try { await client.health.retrieve(); return 'ok'; }
  catch { return 'down'; }
}

export async function checkClickhouse(client: ClickhouseClient): Promise<string> {
  try { await client.ping(); return 'ok'; }
  catch { return 'down'; }
}

export async function checkMinio(client: MinioClient): Promise<string> {
  try { await client.listBuckets(); return 'ok'; }
  catch { return 'down'; }
}

export async function checkRedis(client: any): Promise<string> {
  try { await client.ping(); return 'ok'; }
  catch { return 'down'; }
}
