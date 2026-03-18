import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis, getRedis } from "../../src/infrastructure/redis";
import { seedAll } from "../../src/seed/seed-all";
import { buildEntityDictionary } from "../../src/infrastructure/entity-dictionary";
import { rebuildGraph } from "../../src/infrastructure/graph";
import { parseRssXml } from "../../src/infrastructure/rss-parser";
import { enrichNewsItem } from "../../src/infrastructure/enrichment";
import { classifyTags, titleHash } from "../../src/modules/periodic/news-aggregator";
import { recordAndDetect } from "../../src/infrastructure/anomaly-detector";

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  await connectRedis("redis://localhost:6380");
  await seedAll();
  await buildEntityDictionary();
  await rebuildGraph();
  // Clean test artifacts
  await getDb().collection("news").deleteMany({ dataSource: "rss-feed" });
  await getDb().collection("edges").deleteMany({ source: "nlp" });
  await getDb().collection("anomalies").deleteMany({});
  // Clean anomaly Redis keys
  const redis = getRedis();
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", "anomaly:*", "COUNT", 100);
    cursor = next;
    if (keys.length > 0) await redis.del(...keys);
  } while (cursor !== "0");
}, 30000);

afterAll(async () => {
  await getDb().collection("news").deleteMany({ dataSource: "rss-feed" });
  await getDb().collection("edges").deleteMany({ source: "nlp" });
  await getDb().collection("anomalies").deleteMany({});
  await disconnectRedis();
  await disconnectMongo();
});

describe("Full ingestion pipeline", () => {
  it("processes raw RSS XML into fully enriched Mongo doc with edges", async () => {
    const xml = `<?xml version="1.0"?>
    <rss version="2.0"><channel>
      <item>
        <title>Iran Launches Missile at Oil Tanker Near Strait of Hormuz</title>
        <link>https://example.com/test-article</link>
        <description>Iranian forces fired an anti-ship missile at a commercial vessel near the Strait of Hormuz, escalating tensions with the United States.</description>
        <pubDate>${new Date().toUTCString()}</pubDate>
      </item>
    </channel></rss>`;

    // Step 1: Parse
    const articles = parseRssXml(xml, "test-feed");
    expect(articles).toHaveLength(1);
    const article = articles[0];

    // Step 2: Dedup check (should be new)
    const existingHash = await getDb().collection("news")
      .findOne({ titleHash: titleHash(article.title) });
    expect(existingHash).toBeNull();

    // Step 3: Enrich
    const enriched = await enrichNewsItem(article.title, article.summary);
    expect(enriched.relatedCountries).toContain("IR");
    expect(enriched.relatedCountries).toContain("US");
    expect(enriched.relatedChokepoints).toContain("hormuz");
    expect(enriched.conflictId).toBe("us-iran-war");

    // Step 4: Classify tags
    const tags = classifyTags(article.title, article.summary);
    expect(tags.length).toBeGreaterThan(0);

    // Step 5: Insert to Mongo
    const doc = {
      title: article.title,
      summary: article.summary,
      link: article.link,
      titleHash: titleHash(article.title),
      tags,
      sourceCount: 1,
      sources: [article.source],
      ...enriched,
      publishedAt: article.publishedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
      dataSource: "rss-feed" as const,
    };
    const insertResult = await getDb().collection("news").insertOne(doc);
    expect(insertResult.insertedId).toBeDefined();

    // Step 6: Insert graph edges
    const edges = [];
    for (const iso2 of enriched.relatedCountries) {
      const country = await getDb().collection("countries")
        .findOne({ iso2 }, { projection: { _id: 1 } });
      if (country) {
        edges.push({
          from: { type: "news", id: String(insertResult.insertedId) },
          to: { type: "country", id: country._id },
          relation: "mentions",
          weight: 0.9,
          source: "nlp",
          createdAt: new Date(),
        });
      }
    }
    if (enriched.conflictId) {
      edges.push({
        from: { type: "news", id: String(insertResult.insertedId) },
        to: { type: "conflict", id: enriched.conflictId },
        relation: "mentions",
        weight: 0.9,
        source: "nlp",
        createdAt: new Date(),
      });
    }
    if (edges.length > 0) {
      await getDb().collection("edges").insertMany(edges);
    }

    // Step 7: Record anomaly counters
    await recordAndDetect(enriched, tags);

    // VERIFY: The full chain produced correct results

    // 1. News doc exists with enriched fields
    const savedDoc = await getDb().collection("news")
      .findOne({ _id: insertResult.insertedId });
    expect(savedDoc).toBeDefined();
    expect(savedDoc!.relatedCountries).toContain("IR");
    expect(savedDoc!.conflictId).toBe("us-iran-war");
    expect(savedDoc!.relatedChokepoints).toContain("hormuz");
    expect(savedDoc!.tags.length).toBeGreaterThan(0);

    // 2. Graph edges were created
    const newsEdges = await getDb().collection("edges")
      .find({ "from.id": String(insertResult.insertedId) }).toArray();
    expect(newsEdges.length).toBeGreaterThanOrEqual(2); // at least Iran + US

    // 3. Graph query can find the article via country
    const iran = await getDb().collection("countries").findOne({ iso2: "IR" });
    const connections = await getDb().collection("edges")
      .find({ "to.id": iran!._id, "from.type": "news" }).toArray();
    expect(connections.length).toBeGreaterThanOrEqual(1);

    // 4. Anomaly counters exist in Redis
    const hourBucket = String(Math.floor(Date.now() / 3600000) * 3600000);
    const iranCount = await getRedis().hget("anomaly:counts:country:IR", hourBucket);
    expect(Number(iranCount)).toBeGreaterThanOrEqual(1);
  });
});

describe("Dedup integration", () => {
  it("second insert increments sourceCount, no duplicate", async () => {
    const title = "Unique Test Article for Dedup";
    const hash = titleHash(title);

    // First insert
    await getDb().collection("news").insertOne({
      title,
      titleHash: hash,
      sourceCount: 1,
      sources: ["feed-a"],
      dataSource: "rss-feed" as const,
      createdAt: new Date(),
    });

    // Simulate second source publishing same article
    const existing = await getDb().collection("news").findOne({ titleHash: hash });
    expect(existing).toBeDefined();

    // Dedup logic: increment instead of insert
    await getDb().collection("news").updateOne(
      { titleHash: hash },
      { $inc: { sourceCount: 1 }, $addToSet: { sources: "feed-b" } },
    );

    // Verify: one doc, sourceCount=2, two sources
    const docs = await getDb().collection("news").find({ titleHash: hash }).toArray();
    expect(docs).toHaveLength(1);
    expect(docs[0].sourceCount).toBe(2);
    expect(docs[0].sources).toContain("feed-a");
    expect(docs[0].sources).toContain("feed-b");
  });
});
