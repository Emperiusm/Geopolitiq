import type { ParsedSignal } from '../types';

/**
 * Dedup activity — computes content hashes for each signal, checks DB for existing hashes,
 * and returns only signals that haven't been seen before.
 */
export async function dedupActivity(signals: ParsedSignal[]): Promise<ParsedSignal[]> {
  if (signals.length === 0) return [];

  const { computeContentHash } = await import('../../dedup/content-hash');
  const { connectPostgres } = await import('../../infrastructure/postgres');

  // Build hash → signal map
  const hashToSignal = new Map<string, ParsedSignal>();
  for (const signal of signals) {
    const hash = computeContentHash(
      signal.headline,
      signal.url ?? '',
      signal.publishedAt,
    );
    // Annotate signal with its computed hash for downstream use
    (signal as any)._contentHash = hash;
    // Within-batch dedup: first occurrence wins
    if (!hashToSignal.has(hash)) {
      hashToSignal.set(hash, signal);
    }
  }

  const hashes = Array.from(hashToSignal.keys());
  if (hashes.length === 0) return [];

  // Check DB for existing hashes
  const { getDb } = await import('../../infrastructure/postgres');
  let db: any;
  try {
    db = getDb();
  } catch {
    // Not connected yet — connect fresh (worker context)
    const config = {
      postgres: { url: process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? 'postgres://localhost/gambit' },
    };
    const { createLogger } = await import('@gambit/common');
    db = await connectPostgres(config as any, createLogger('dedup-activity'));
  }

  // Query for existing content hashes using raw SQL via drizzle
  const { sql } = await import('drizzle-orm');
  const { signals: signalsTable } = await import('../../db');

  const existingRows: Array<{ content_hash: string }> = await (db as any)
    .select({ content_hash: signalsTable.contentHash })
    .from(signalsTable)
    .where(sql`${signalsTable.contentHash} = ANY(${hashes})`);

  const existingHashes = new Set(existingRows.map((r) => r.content_hash));

  // Return only new signals
  const newSignals: ParsedSignal[] = [];
  for (const [hash, signal] of hashToSignal) {
    if (!existingHashes.has(hash)) {
      newSignals.push(signal);
    }
  }

  return newSignals;
}
