import type { SourceConfig, PipelineRunCounters, ParsedSignal } from '../types';

/** Returns the full SourceConfig for a given sourceId from DB. */
export async function getSourceConfig(sourceId: string): Promise<SourceConfig> {
  const { getDb } = await import('../../infrastructure/postgres');
  const { sources } = await import('../../db');
  const { eq } = await import('drizzle-orm');

  let db: any;
  try {
    db = getDb();
  } catch {
    const { connectPostgres } = await import('../../infrastructure/postgres');
    const { createLogger } = await import('@gambit/common');
    const config = {
      postgres: { url: process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? 'postgres://localhost/gambit' },
    };
    db = await connectPostgres(config as any, createLogger('system-activity'));
  }

  const rows = await db.select().from(sources).where(eq(sources.id, sourceId));
  if (!rows || rows.length === 0) {
    throw new Error(`Source not found: ${sourceId}`);
  }
  const row = rows[0];

  return {
    id: row.id,
    name: row.name,
    fetcherType: row.fetcherType,
    fetcherUrl: row.fetcherUrl ?? undefined,
    fetcherSchedule: row.fetcherSchedule ?? undefined,
    fetcherPagination: row.fetcherPagination ?? 'none',
    fetcherAuth: row.fetcherAuth ?? undefined,
    fetcherRateLimitMs: row.fetcherRateLimitMs ?? 1000,
    fetcherState: row.fetcherState ?? {},
    parserMode: row.parserMode ?? 'structured',
    parserRef: row.parserRef ?? undefined,
    parserPrompt: row.parserPrompt ?? undefined,
    parserResponseSchema: row.parserResponseSchema ?? undefined,
    parserModel: row.parserModel ?? undefined,
    parserMaxInputTokens: row.parserMaxInputTokens ?? 4000,
    parserRouting: row.parserRouting ?? undefined,
    polarity: row.polarity ?? undefined,
    category: row.category ?? undefined,
    domains: row.domains ?? [],
    dependencies: row.dependencies ?? [],
    upstreamGroup: row.upstreamGroup ?? undefined,
    enabled: row.enabled ?? true,
    tier: row.tier ?? 3,
    meta: row.meta ?? {},
  };
}

/** Creates a new pipeline_run record and returns its ID. */
export async function createPipelineRun(sourceId: string): Promise<string> {
  const { getDb } = await import('../../infrastructure/postgres');
  const { pipelineRuns } = await import('../../db');
  const { recordId } = await import('@gambit/common');

  let db: any;
  try {
    db = getDb();
  } catch {
    const { connectPostgres } = await import('../../infrastructure/postgres');
    const { createLogger } = await import('@gambit/common');
    const config = {
      postgres: { url: process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? 'postgres://localhost/gambit' },
    };
    db = await connectPostgres(config as any, createLogger('system-activity'));
  }

  const id = recordId('run', crypto.randomUUID());
  await db.insert(pipelineRuns).values({
    id,
    pipelineName: 'source-ingestion',
    status: 'running',
    sourceId,
    startedAt: new Date(),
  });

  return id;
}

/** Marks a pipeline_run as complete with final counters. */
export async function completePipelineRun(
  runId: string,
  counters: PipelineRunCounters,
  error?: string,
): Promise<void> {
  const { getDb } = await import('../../infrastructure/postgres');
  const { pipelineRuns } = await import('../../db');
  const { eq } = await import('drizzle-orm');

  let db: any;
  try {
    db = getDb();
  } catch {
    const { connectPostgres } = await import('../../infrastructure/postgres');
    const { createLogger } = await import('@gambit/common');
    const config = {
      postgres: { url: process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? 'postgres://localhost/gambit' },
    };
    db = await connectPostgres(config as any, createLogger('system-activity'));
  }

  await db
    .update(pipelineRuns)
    .set({
      status: error ? 'failed' : 'complete',
      finishedAt: new Date(),
      error: error ?? null,
      fetched: counters.fetched,
      parsed: counters.parsed,
      deduplicated: counters.deduplicated,
      classified: counters.classified,
      resolved: counters.resolved,
      written: counters.written,
      graphed: counters.graphed,
      published: counters.published,
      dlqd: counters.dlqd,
      itemsProcessed: counters.written,
      itemsFailed: counters.failed,
      costTokensIn: counters.costTokensIn,
      costTokensOut: counters.costTokensOut,
    })
    .where(eq(pipelineRuns.id, runId));
}

/** Updates the fetcherState on a source record after a successful fetch. */
export async function updateFetchState(
  sourceId: string,
  fetchState: Record<string, any>,
): Promise<void> {
  const { getDb } = await import('../../infrastructure/postgres');
  const { sources } = await import('../../db');
  const { eq } = await import('drizzle-orm');

  let db: any;
  try {
    db = getDb();
  } catch {
    const { connectPostgres } = await import('../../infrastructure/postgres');
    const { createLogger } = await import('@gambit/common');
    const config = {
      postgres: { url: process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? 'postgres://localhost/gambit' },
    };
    db = await connectPostgres(config as any, createLogger('system-activity'));
  }

  await db
    .update(sources)
    .set({
      fetcherState: fetchState,
      lastFetchedAt: new Date(),
    })
    .where(eq(sources.id, sourceId));
}

/** Writes a failed signal to the signal_dlq table. */
export async function dlqSignalActivity(
  signal: ParsedSignal,
  source: SourceConfig,
  error: string,
  stage: string,
): Promise<void> {
  const { getDb } = await import('../../infrastructure/postgres');
  const { signalDlq } = await import('../../db');
  const { recordId } = await import('@gambit/common');

  let db: any;
  try {
    db = getDb();
  } catch {
    const { connectPostgres } = await import('../../infrastructure/postgres');
    const { createLogger } = await import('@gambit/common');
    const config = {
      postgres: { url: process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? 'postgres://localhost/gambit' },
    };
    db = await connectPostgres(config as any, createLogger('system-activity'));
  }

  const id = recordId('dlq', crypto.randomUUID());
  await db.insert(signalDlq).values({
    id,
    sourceId: source.id,
    rawPayload: { signal, stage, error } as any,
    error: `[${stage}] ${error}`,
    attemptCount: 1,
    lastAttemptAt: new Date(),
  });
}

/** Wraps SignalWriter.writeSignal as a Temporal activity. */
export async function writeSignalActivity(
  signal: import('../types').ResolvedSignal,
  source: SourceConfig,
): Promise<{ written: boolean; deduplicated: boolean; signalId?: string }> {
  const { SignalWriter } = await import('./write');
  const { getDb } = await import('../../infrastructure/postgres');

  let db: any;
  try {
    db = getDb();
  } catch {
    const { connectPostgres } = await import('../../infrastructure/postgres');
    const { createLogger } = await import('@gambit/common');
    const config = {
      postgres: { url: process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? 'postgres://localhost/gambit' },
    };
    db = await connectPostgres(config as any, createLogger('write-activity'));
  }

  let clickhouse: any = null;
  try {
    const { connectClickhouse } = await import('../../infrastructure/clickhouse');
    const { createLogger } = await import('@gambit/common');
    const config = {
      clickhouse: {
        url: process.env.CLICKHOUSE_URL ?? 'http://localhost:8123',
        database: process.env.CLICKHOUSE_DATABASE ?? 'gambit',
      },
    };
    clickhouse = await connectClickhouse(config as any, createLogger('write-activity')).catch(() => null);
  } catch {
    // ClickHouse optional
  }

  // Lazy-init NATS deps once per worker process (singleton in nats-deps module)
  const { getNatsDeps } = await import('./nats-deps');
  const { featureFlags } = await getNatsDeps();

  const writer = new SignalWriter(db, clickhouse, featureFlags);
  return writer.writeSignal(signal, source);
}
