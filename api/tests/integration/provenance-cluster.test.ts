import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../src/infrastructure/redis";
import { seedAll } from "../../src/seed/seed-all";
import { buildEntityDictionary } from "../../src/infrastructure/entity-dictionary";
import { enrichNewsItem } from "../../src/infrastructure/enrichment";
import { titleHash } from "../../src/modules/periodic/news-aggregator";
import { buildArticleProvenance } from "../../src/infrastructure/provenance";

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  await connectRedis("redis://localhost:6380");
  await seedAll();
  await buildEntityDictionary();
  // Clean test artifacts
  await getDb().collection("news").deleteMany({ dataSource: "rss-feed" });
}, 30000);

afterAll(async () => {
  await getDb().collection("news").deleteMany({ dataSource: "rss-feed" });
  await disconnectRedis();
  await disconnectMongo();
});

describe("Provenance cluster integration", () => {
  it("computes provenance across multi-source event cluster", async () => {
    const now = new Date();
    const articles = [
      { title: "Major Earthquake Strikes Turkey", source: "Reuters", tier: "primary" as const, offset: 0 },
      { title: "Powerful Quake Hits Eastern Turkey", source: "BBC", tier: "established" as const, offset: 5 },
      { title: "Turkey Earthquake Death Toll Rises", source: "Regional Blog", tier: "regional" as const, offset: 15 },
    ];

    // Insert 3 articles about the same event from different sources
    const inserted = [];
    for (const a of articles) {
      const enriched = await enrichNewsItem(a.title, `Earthquake details for ${a.title}`);
      const doc = {
        title: a.title,
        titleHash: titleHash(a.title),
        summary: `Earthquake details for ${a.title}`,
        source: a.source,
        sourceTier: a.tier,
        ...enriched,
        sourceCount: 1,
        sources: [a.source],
        dataSource: "rss-feed" as const,
        publishedAt: new Date(now.getTime() + a.offset * 60000),
        createdAt: new Date(),
      };
      await getDb().collection("news").insertOne(doc);
      inserted.push(doc);
    }

    // Cluster these articles (shared relatedCountries: TR)
    const cluster = await getDb().collection("news")
      .find({ relatedCountries: "TR", dataSource: "rss-feed" }).toArray();
    expect(cluster.length).toBeGreaterThanOrEqual(3);

    // Verify multi-source corroboration
    const sources = cluster.map((a) => a.source);
    const uniqueSources = [...new Set(sources)];
    const primaryCount = cluster.filter((a) => a.sourceTier === "primary").length;

    expect(uniqueSources.length).toBeGreaterThanOrEqual(3);
    expect(primaryCount).toBeGreaterThanOrEqual(1);

    // Compute provenance for the primary source article
    const clusterForProvenance = cluster.map((a) => ({
      title: a.title,
      summary: a.summary || "",
      source: a.source,
      publishedAt: a.publishedAt,
    }));
    const provenance = buildArticleProvenance(clusterForProvenance[0], clusterForProvenance);

    // Trust score should reflect multiple independent sources + primary tier
    expect(provenance.sourceTier).toBeDefined();
    expect(provenance.corroboration.totalSources).toBeGreaterThanOrEqual(3);
    expect(provenance.corroboration.primarySourceCount).toBeGreaterThanOrEqual(1);
    expect(provenance.trustScore).toBeGreaterThan(0.5);

    // First mover analysis
    expect(provenance.firstMover.firstMoverSource).toBeDefined();
  });
});
