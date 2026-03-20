import { getDb } from "../../infrastructure/mongo";
import { getOrCreateQueue } from "../../infrastructure/queue";
import { clusterArticles, type ArticleForClustering } from "./clusterer";
import type { SourceTier } from "../../types";

const QUEUE_NAME = "news-extraction";
const BATCH_LIMIT = Number(process.env.AGENT_NEWS_BATCH_LIMIT ?? 50);

/**
 * Finds unprocessed articles, clusters them, and pushes extraction jobs to BullMQ.
 * Called after the news aggregator stores new articles.
 */
export async function enqueueNewArticles(): Promise<void> {
  if (process.env.AGENT_NEWS_ENABLED !== "true") return;

  const db = getDb();
  const queue = getOrCreateQueue(QUEUE_NAME);

  // Find articles not yet processed by the agent
  const raw = await db
    .collection("news")
    .find({ agentProcessed: { $ne: true }, dataSource: "rss-feed" })
    .sort({ createdAt: -1 })
    .limit(BATCH_LIMIT)
    .toArray();

  if (raw.length === 0) return;

  // Map to clustering format
  const articles: ArticleForClustering[] = raw.map((doc) => ({
    _id: String(doc._id),
    title: doc.title as string,
    summary: (doc.summary as string) ?? "",
    relatedCountries: (doc.relatedCountries as string[]) ?? [],
    relatedChokepoints: (doc.relatedChokepoints as string[]) ?? [],
    relatedNSA: (doc.relatedNSA as string[]) ?? [],
    publishedAt: doc.publishedAt instanceof Date ? doc.publishedAt : new Date(doc.publishedAt as string),
    source: doc.dataSource as string | undefined,
  }));

  const { clusters, solos } = clusterArticles(articles);

  // Default source tier for RSS articles
  const sourceTier: SourceTier = "aggregator";

  // Enqueue cluster jobs
  for (const cluster of clusters) {
    await queue.add("extract-cluster", {
      articles: cluster.articles.map((a) => ({
        _id: a._id,
        title: a.title,
        summary: a.summary,
        source: a.source,
        relatedCountries: a.relatedCountries,
        relatedChokepoints: a.relatedChokepoints,
        relatedNSA: a.relatedNSA,
      })),
      sourceTier,
    });
  }

  // Enqueue solo article jobs
  for (const article of solos) {
    await queue.add("extract-single", {
      articles: [{
        _id: article._id,
        title: article.title,
        summary: article.summary,
        source: article.source,
        relatedCountries: article.relatedCountries,
        relatedChokepoints: article.relatedChokepoints,
        relatedNSA: article.relatedNSA,
      }],
      sourceTier,
    });
  }

  const totalJobs = clusters.length + solos.length;
  if (totalJobs > 0) {
    console.log(
      `[news-fetcher] Enqueued ${totalJobs} jobs (${clusters.length} clusters, ${solos.length} solos) from ${raw.length} articles`,
    );
  }
}
