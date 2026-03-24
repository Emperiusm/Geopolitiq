import { randomUUID } from 'crypto';

export interface FeedRegistryEntry {
  url: string;
  name?: string;
  category: string;
  tier: 'fast' | 'standard' | 'slow';
  language?: string;
}

const TIER_SCHEDULES: Record<string, string> = {
  fast: '*/60 * * * *',
  standard: '0 */6 * * *',
  slow: '0 0 * * 1',
};

export async function migrateFeedRegistry(db: any, feeds: FeedRegistryEntry[]): Promise<number> {
  let migrated = 0;
  for (const feed of feeds) {
    const sourceId = `source:${randomUUID()}`;
    await db.insert(db.schema.sources).values({
      id: sourceId,
      name: feed.name ?? feed.url,
      url: feed.url,
      sourceType: 'rss',
      fetcherType: 'rss',
      fetcherUrl: feed.url,
      fetcherSchedule: TIER_SCHEDULES[feed.tier] ?? TIER_SCHEDULES.standard,
      fetcherPagination: 'none',
      fetcherRateLimitMs: 1000,
      fetcherState: {},
      parserMode: 'structured',
      parserRef: 'rss',
      polarity: 'classify',
      category: feed.category,
      domains: [],
      tier: feed.tier === 'fast' ? 1 : feed.tier === 'standard' ? 2 : 3,
      enabled: true,
      active: true,
      meta: { language: feed.language ?? 'en', migratedFrom: 'feed-registry' },
    }).onConflictDoNothing();
    migrated++;
  }
  return migrated;
}
