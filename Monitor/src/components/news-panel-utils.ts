import type { NewsItem, ClusteredEvent } from '@/types';
import { THREAT_PRIORITY } from '@/services/threat-classifier';

export type SortMode = 'relevance' | 'newest';

/** Summary cache TTL in milliseconds (10 minutes) */
export const SUMMARY_CACHE_TTL = 10 * 60 * 1000;

/** Threshold for enabling virtual scrolling */
export const VIRTUAL_SCROLL_THRESHOLD = 15;

/** Prepared cluster data for rendering */
export interface PreparedCluster {
  cluster: ClusteredEvent;
  isNew: boolean;
  shouldHighlight: boolean;
  showNewTag: boolean;
}

/**
 * Sort news items by the given sort mode.
 */
export function sortNewsItems(items: NewsItem[], mode: SortMode): NewsItem[] {
  if (mode === 'newest') {
    return [...items].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
  }
  return items;
}

/**
 * Sort clustered events by the given sort mode.
 */
export function sortClusters(clusters: ClusteredEvent[], mode: SortMode): ClusteredEvent[] {
  return [...clusters].sort((a, b) => {
    if (mode === 'newest') {
      // Pure chronological, newest first
      return b.lastUpdated.getTime() - a.lastUpdated.getTime();
    }
    // Default: threat priority first, then recency within same level
    const pa = THREAT_PRIORITY[a.threat?.level ?? 'info'];
    const pb = THREAT_PRIORITY[b.threat?.level ?? 'info'];
    if (pb !== pa) return pb - pa;
    return b.lastUpdated.getTime() - a.lastUpdated.getTime();
  });
}

/**
 * Extract top headlines from sorted clusters (capped to reduce entity conflation).
 */
export function extractHeadlines(sortedClusters: ClusteredEvent[], max = 5): string[] {
  return sortedClusters.slice(0, max).map(c => c.primaryTitle);
}

/**
 * Extract headlines from flat news items.
 */
export function extractFlatHeadlines(items: NewsItem[], max = 5): string[] {
  return items
    .slice(0, max)
    .map(item => item.title)
    .filter((title): title is string => typeof title === 'string' && title.trim().length > 0);
}

/**
 * Compute a stable headline signature for cache invalidation.
 */
export function getHeadlineSignature(headlines: string[]): string {
  return JSON.stringify(headlines.slice(0, 5).sort());
}

/**
 * Read a cached summary from localStorage.
 */
export function getCachedSummary(key: string, headlineSignature: string): string | null {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    const parsed = JSON.parse(cached);
    if (!parsed.headlineSignature) { localStorage.removeItem(key); return null; }
    if (parsed.headlineSignature !== headlineSignature) return null;
    if (Date.now() - parsed.timestamp > SUMMARY_CACHE_TTL) { localStorage.removeItem(key); return null; }
    return parsed.summary;
  } catch {
    return null;
  }
}

/**
 * Write a summary to localStorage cache.
 */
export function setCachedSummary(key: string, headlineSignature: string, summary: string): void {
  try {
    localStorage.setItem(key, JSON.stringify({
      headlineSignature,
      summary,
      timestamp: Date.now(),
    }));
  } catch { /* storage full */ }
}
