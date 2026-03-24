import { sql } from 'drizzle-orm';
import type { DrizzleClient } from '../transaction';
import type { Logger } from '@gambit/common';

export async function initPartitions(db: DrizzleClient, logger: Logger): Promise<void> {
  // Ensure pg_partman extension is available
  await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_partman SCHEMA partman`);

  // Check current state of the signals table
  const result = await db.execute<{ relkind: string }>(sql`
    SELECT relkind
    FROM pg_class
    WHERE relname = 'signals'
      AND relnamespace = 'public'::regnamespace
  `);

  const rows = result.rows ?? (result as unknown as { relkind: string }[]);
  const row = Array.isArray(rows) ? rows[0] : undefined;

  if (row?.relkind === 'p') {
    // Already a partitioned table — nothing to do
    logger.info('signals table is already partitioned, skipping pg_partman setup');
    return;
  }

  if (row?.relkind === 'r') {
    // Exists as a regular (unpartitioned) table — requires manual migration
    logger.warn(
      'signals table exists as a regular table; automatic conversion skipped. ' +
        'Run the manual migration to convert it to a partitioned table.',
    );
    return;
  }

  // No signals table yet — Drizzle migrations will create it as a regular table first.
  // pg_partman will be invoked after Drizzle runs (called again post-migration), so
  // we only proceed here if the table already exists as 'r' and was just created.
  // Log and return; the post-migration hook will call this function again.
  logger.info('signals table not found yet; pg_partman setup deferred until after Drizzle migrations');
}

export async function setupSignalsPartitioning(db: DrizzleClient, logger: Logger): Promise<void> {
  // Called explicitly after Drizzle migrations have created the signals table.
  const result = await db.execute<{ relkind: string }>(sql`
    SELECT relkind
    FROM pg_class
    WHERE relname = 'signals'
      AND relnamespace = 'public'::regnamespace
  `);

  const rows = result.rows ?? (result as unknown as { relkind: string }[]);
  const row = Array.isArray(rows) ? rows[0] : undefined;

  if (!row) {
    logger.warn('setupSignalsPartitioning: signals table still not found, skipping');
    return;
  }

  if (row.relkind === 'p') {
    logger.info('signals table already partitioned');
  } else if (row.relkind === 'r') {
    // Convert the freshly-created regular table to a partitioned table via pg_partman
    logger.info('Converting signals table to monthly range-partitioned table via pg_partman');
    await db.execute(sql`
      SELECT partman.create_parent(
        p_parent_table  := 'public.signals',
        p_control       := 'published_at',
        p_type          := 'range',
        p_interval      := '1 month',
        p_premake       := 3,
        p_start_partition := '2026-01-01'
      )
    `);
    logger.info('pg_partman partitioning applied to signals table');
  }

  // BRIN index on published_at — tiny, fast time-range scans across partitions
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS signals_published_at_brin
    ON signals USING BRIN (published_at)
  `);

  // Partial index for active signals (no expiry or not yet expired)
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS signals_active_partial
    ON signals (published_at)
    WHERE expires_at IS NULL OR expires_at > NOW()
  `);

  logger.info('BRIN and partial indexes ensured on signals table');
}
