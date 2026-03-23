import type { ParsedSignal, ResolvedSignal, ResolvedEntity, SourceConfig } from '../types';

export interface ResolveActivityResult {
  signals: ResolvedSignal[];
}

/**
 * Resolve activity — resolves entity names in each signal to canonical entity IDs.
 * Creates EntityResolver with ResolutionCache + BloomFilter.
 */
export async function resolveActivity(
  signals: ParsedSignal[],
  source: SourceConfig,
): Promise<ResolveActivityResult> {
  if (signals.length === 0) return { signals: [] };

  const { EntityResolver } = await import('../../resolver/entity-resolver');
  const { ResolutionCache } = await import('../../resolver/cache');
  const { BloomFilter } = await import('../../resolver/bloom');
  const { computeContentHash } = await import('../../dedup/content-hash');
  const { computeSimHash } = await import('../../dedup/simhash');
  const { computeEventFingerprint } = await import('../../dedup/event-fingerprint');

  // Acquire DB and Redis connections
  let db: any;
  let redis: any;
  let typesense: any = null;

  try {
    const { getDb } = await import('../../infrastructure/postgres');
    db = getDb();
  } catch {
    const { connectPostgres } = await import('../../infrastructure/postgres');
    const { createLogger } = await import('@gambit/common');
    const config = {
      postgres: { url: process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? 'postgres://localhost/gambit' },
    };
    db = await connectPostgres(config as any, createLogger('resolve-activity'));
  }

  try {
    const Redis = (await import('ioredis')).default;
    redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');
  } catch {
    // Redis unavailable — ResolutionCache will fail gracefully
  }

  try {
    const { connectTypesense } = await import('../../infrastructure/typesense');
    const { createLogger } = await import('@gambit/common');
    const config = {
      typesense: {
        host: process.env.TYPESENSE_HOST ?? 'localhost',
        port: parseInt(process.env.TYPESENSE_PORT ?? '8108'),
        apiKey: process.env.TYPESENSE_API_KEY ?? 'xyz',
      },
    };
    typesense = await connectTypesense(config as any, createLogger('resolve-activity')).catch(() => null);
  } catch {
    // Typesense optional
  }

  const cache = new ResolutionCache(redis);
  const bloom = new BloomFilter();
  const resolver = new EntityResolver(cache, db, typesense, bloom);

  const resolvedSignals: ResolvedSignal[] = [];

  for (const signal of signals) {
    const context = {
      domains: source.domains ?? [],
      sourceConfidenceBoost: source.tier === 1 ? 0.1 : 0,
    };

    // Collect all entity names (primary + secondary)
    const allNames = [
      ...signal.entityNames,
      ...(signal.secondaryEntityNames ?? []),
    ];

    const resolvedMap = await resolver.resolveBatch(allNames, context);

    // Primary entity: first resolved name
    const primaryName = signal.entityNames[0] ?? 'Unknown';
    const primaryResolved: ResolvedEntity = resolvedMap.get(primaryName) ?? {
      entityId: `unknown:${primaryName}`,
      entityName: primaryName,
      method: 'new' as const,
      confidence: 0,
    };

    // Secondary entities
    const secondaryEntities: ResolvedEntity[] = (signal.secondaryEntityNames ?? [])
      .map((name) => resolvedMap.get(name))
      .filter((r): r is ResolvedEntity => r !== undefined);

    // Compute content hash (use pre-computed if available from dedup)
    const contentHash =
      (signal as any)._contentHash ??
      computeContentHash(signal.headline, signal.url ?? '', signal.publishedAt);

    // Compute simhash on headline + body for near-dup detection
    const simhashBigInt = computeSimHash(`${signal.headline} ${signal.body ?? ''}`);
    const simhash = simhashBigInt.toString(16).padStart(4, '0');

    // Compute event fingerprint
    const eventFingerprint = computeEventFingerprint(
      primaryResolved.entityId,
      signal.category,
      signal.publishedAt,
    );

    const resolvedSignal: ResolvedSignal = {
      ...signal,
      entityId: primaryResolved.entityId,
      resolvedEntity: primaryResolved,
      secondaryEntities,
      contentHash,
      simhash,
      eventFingerprint,
    };

    resolvedSignals.push(resolvedSignal);
  }

  // Close Redis connection if we opened one
  if (redis) {
    redis.disconnect().catch(() => {});
  }

  return { signals: resolvedSignals };
}
