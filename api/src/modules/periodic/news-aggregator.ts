import { getDb } from "../../infrastructure/mongo";
import { getFeedsByTier, type FeedConfig, type FeedTier } from "../../infrastructure/feed-registry";
import { fetchFeed, type ParsedArticle } from "../../infrastructure/rss-parser";
import { enrichNewsItem } from "../../infrastructure/enrichment";
import { publishEvent } from "../../infrastructure/sse";
import { captureSnapshot } from "../../infrastructure/snapshots";
import { clusterArticles, analyzeForUser, getAIEnabledUsers } from "../../infrastructure/ai-analysis";
import { recordAndDetect } from "../../infrastructure/anomaly-detector";
import { buildStandaloneProvenance } from "../../infrastructure/provenance";
import type { GraphEdge } from "../../types";

const BATCH_CONCURRENCY = Number(process.env.NEWS_BATCH_CONCURRENCY ?? 15);
const FEED_TIMEOUT_MS = Number(process.env.NEWS_FEED_TIMEOUT_MS ?? 8000);
const OVERALL_DEADLINE_MS = Number(process.env.NEWS_OVERALL_DEADLINE_MS ?? 25000);

// Keyword classifier — maps keywords to uppercase tags
const TAG_KEYWORDS: Array<{ pattern: RegExp; tag: string; priority: number }> = [
  // Critical (priority 3)
  { pattern: /\bnuclear\s+(?:strike|attack)\b/i, tag: "BREAKING", priority: 3 },
  { pattern: /\b(?:invasion|declaration\s+of\s+war)\b/i, tag: "CONFLICT", priority: 3 },
  { pattern: /\b(?:martial\s+law|coup)\b/i, tag: "BREAKING", priority: 3 },
  { pattern: /\bgenocide\b/i, tag: "CONFLICT", priority: 3 },
  { pattern: /\bchemical\s+attack\b/i, tag: "SECURITY", priority: 3 },
  { pattern: /\bpandemic\s+declared\b/i, tag: "HUMANITARIAN", priority: 3 },
  // High (priority 2)
  { pattern: /\b(?:war|airstrike|drone\s+strike|bombing|casualties)\b/i, tag: "CONFLICT", priority: 2 },
  { pattern: /\b(?:missile|troops\s+deployed)\b/i, tag: "SECURITY", priority: 2 },
  { pattern: /\b(?:hostage|terrorist)\b/i, tag: "SECURITY", priority: 2 },
  { pattern: /\b(?:cyber\s*attack|ransomware)\b/i, tag: "CYBER", priority: 2 },
  { pattern: /\b(?:sanctions|embargo)\b/i, tag: "ECONOMIC", priority: 2 },
  { pattern: /\b(?:earthquake|tsunami|hurricane|flood)\b/i, tag: "HUMANITARIAN", priority: 2 },
  // Medium (priority 1)
  { pattern: /\b(?:protest|riot|unrest)\b/i, tag: "SECURITY", priority: 1 },
  { pattern: /\b(?:military\s+exercise|arms\s+deal)\b/i, tag: "SECURITY", priority: 1 },
  { pattern: /\b(?:diplomatic\s+crisis|peace\s+talks|ceasefire)\b/i, tag: "DIPLOMACY", priority: 1 },
  { pattern: /\b(?:trade\s+war)\b/i, tag: "ECONOMIC", priority: 1 },
  { pattern: /\b(?:election|referendum)\b/i, tag: "SECURITY", priority: 1 },
];

/** Classify article text into tags */
export function classifyTags(title: string, summary: string): string[] {
  const text = `${title} ${summary}`;
  const tags = new Set<string>();
  for (const kw of TAG_KEYWORDS) {
    if (kw.pattern.test(text)) {
      tags.add(kw.tag);
    }
  }
  return [...tags];
}

/** Generate a dedup key from title */
export function titleHash(title: string): string {
  return title.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
}

/** Process a batch of feeds with concurrency limit */
async function fetchFeedsBatch(
  feeds: FeedConfig[],
  concurrency: number,
  timeoutMs: number,
): Promise<ParsedArticle[]> {
  const results: ParsedArticle[] = [];
  for (let i = 0; i < feeds.length; i += concurrency) {
    const batch = feeds.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((f) => fetchFeed(f.url, f.name, timeoutMs, 10)),
    );
    for (const articles of batchResults) {
      results.push(...articles);
    }
  }
  return results;
}

/** Process a single article: dedup, enrich, insert, publish */
async function processArticle(article: ParsedArticle): Promise<boolean> {
  const db = getDb();
  const col = db.collection("news");
  const hash = titleHash(article.title);

  // Dedup check
  const existing = await col.findOne({ _titleHash: hash });
  if (existing) {
    // Increment source count
    await col.updateOne(
      { _id: existing._id },
      { $inc: { sourceCount: 1 } },
    );
    return false; // deduplicated
  }

  // NLP enrichment
  const enriched = await enrichNewsItem(article.title, article.summary);

  // Keyword classification
  const tags = classifyTags(article.title, article.summary);

  const now = new Date();
  // Source provenance (Tier 1 — standalone, updated with cluster context in Tier 2)
  const provenance = buildStandaloneProvenance({
    title: article.title,
    summary: article.summary,
    source: article.source,
    publishedAt: article.publishedAt,
  });

  const doc = {
    title: article.title,
    summary: article.summary,
    tags,
    sourceCount: 1,
    ...enriched,
    provenance,
    publishedAt: article.publishedAt,
    _titleHash: hash,
    createdAt: now,
    updatedAt: now,
    dataSource: "rss-feed" as const,
  };

  const result = await col.insertOne(doc);
  const newsId = String(result.insertedId);

  // Insert graph edges for enriched links
  const edges: GraphEdge[] = [];
  for (const iso2 of enriched.relatedCountries) {
    edges.push({
      from: { type: "news", id: newsId },
      to: { type: "country", id: iso2 },
      relation: "mentions",
      weight: 0.9,
      source: "nlp",
      createdAt: now,
    });
  }
  if (enriched.conflictId) {
    edges.push({
      from: { type: "news", id: newsId },
      to: { type: "conflict", id: enriched.conflictId },
      relation: "mentions",
      weight: 0.9,
      source: "nlp",
      createdAt: now,
    });
  }
  for (const chId of enriched.relatedChokepoints) {
    edges.push({
      from: { type: "news", id: newsId },
      to: { type: "chokepoint", id: chId },
      relation: "mentions",
      weight: 0.8,
      source: "nlp",
      createdAt: now,
    });
  }
  for (const nsaId of enriched.relatedNSA) {
    edges.push({
      from: { type: "news", id: newsId },
      to: { type: "nsa", id: nsaId },
      relation: "mentions",
      weight: 0.8,
      source: "nlp",
      createdAt: now,
    });
  }
  if (edges.length > 0) {
    await db.collection("edges").insertMany(edges);
  }

  // Anomaly detection
  await recordAndDetect(enriched, tags).catch((err) =>
    console.error("[news] Anomaly detection error:", err),
  );

  // Publish SSE event
  await publishEvent("news-enriched", {
    title: doc.title,
    conflictId: doc.conflictId,
    relatedCountries: doc.relatedCountries,
    tags: doc.tags,
  });

  // Capture snapshot if conflict-linked
  if (enriched.conflictId) {
    await captureSnapshot("event", `news-linked:${enriched.conflictId}`);
  }

  return true; // new article inserted
}

/** Poll a single tier of feeds */
async function pollTier(tier: FeedTier): Promise<{ fetched: number; inserted: number; deduped: number }> {
  const feeds = getFeedsByTier(tier);
  if (feeds.length === 0) return { fetched: 0, inserted: 0, deduped: 0 };

  try {
    const articles = await fetchFeedsBatch(feeds, BATCH_CONCURRENCY, FEED_TIMEOUT_MS);
    let inserted = 0;
    let deduped = 0;

    for (const article of articles) {
      try {
        const isNew = await processArticle(article);
        if (isNew) inserted++;
        else deduped++;
      } catch (err) {
        console.error(`[news] Error processing article "${article.title}":`, err);
      }
    }

    // Tier 2: AI analysis for enabled users
    if (inserted > 0) {
      try {
        const userIds = await getAIEnabledUsers();
        if (userIds.length > 0) {
          const recentArticles = await getDb().collection("news")
            .find({ dataSource: "rss-feed" })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();
          const clusters = clusterArticles(recentArticles);
          if (clusters.length > 0) {
            for (const userId of userIds) {
              const userDoc = await getDb().collection("users").findOne({ _id: userId }, { projection: { teamId: 1 } });
              const teamId = (userDoc?.teamId as string) ?? "";
              await analyzeForUser(userId, teamId, clusters).catch((err) =>
                console.error(`[news] AI analysis error for ${userId}:`, err),
              );
            }
          }
        }
      } catch (err) {
        console.error("[news] Tier 2 analysis error:", err);
      }
    }

    console.log(`[news] ${tier}: fetched=${articles.length} inserted=${inserted} deduped=${deduped}`);
    return { fetched: articles.length, inserted, deduped };
  } catch (err) {
    console.error(`[news] ${tier} poll error:`, err);
    return { fetched: 0, inserted: 0, deduped: 0 };
  }
}

// Interval handles
const intervals: ReturnType<typeof setInterval>[] = [];

export function startNewsAggregator(): void {
  const fastMs = Number(process.env.NEWS_POLL_FAST_MS ?? 900000);      // 15 min
  const standardMs = Number(process.env.NEWS_POLL_STANDARD_MS ?? 3600000); // 1 hour
  const slowMs = Number(process.env.NEWS_POLL_SLOW_MS ?? 14400000);    // 4 hours

  // Create title hash index
  getDb().collection("news").createIndex({ _titleHash: 1 }, { unique: true, sparse: true }).catch(() => {});

  // Initial polls (staggered)
  setTimeout(() => pollTier("fast"), 5000);
  setTimeout(() => pollTier("standard"), 15000);
  setTimeout(() => pollTier("slow"), 30000);

  // Recurring polls
  intervals.push(setInterval(() => pollTier("fast"), fastMs));
  intervals.push(setInterval(() => pollTier("standard"), standardMs));
  intervals.push(setInterval(() => pollTier("slow"), slowMs));

  console.log(`[news] Aggregator started — fast:${fastMs/1000}s standard:${standardMs/1000}s slow:${slowMs/1000}s`);
}

export function stopNewsAggregator(): void {
  for (const i of intervals) clearInterval(i);
  intervals.length = 0;
}

// Export for testing
export { pollTier, processArticle };
