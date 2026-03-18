import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../src/infrastructure/redis";
import { seedAll } from "../../src/seed/seed-all";
import { buildEntityDictionary } from "../../src/infrastructure/entity-dictionary";
import { rebuildGraph } from "../../src/infrastructure/graph";
import { enrichNewsItem } from "../../src/infrastructure/enrichment";
import { graphRouter } from "../../src/modules/aggregate/graph";

const app = new Hono().route("/graph", graphRouter);

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  await connectRedis("redis://localhost:6380");
  await seedAll();
  await buildEntityDictionary();
  await rebuildGraph();
  // Clean test-specific data
  await getDb().collection("news").deleteMany({ dataSource: "rss-feed" });
  await getDb().collection("edges").deleteMany({ source: "nlp" });
}, 30000);

afterAll(async () => {
  await getDb().collection("news").deleteMany({ dataSource: "rss-feed" });
  await getDb().collection("edges").deleteMany({ source: "nlp" });
  await disconnectRedis();
  await disconnectMongo();
});

describe("Graph + news integration", () => {
  it("discovers news articles through entity connections", async () => {
    const iran = await getDb().collection("countries").findOne({ iso2: "IR" });

    // Count edges before ingestion
    const edgesBefore = await getDb().collection("edges")
      .countDocuments({ "to.id": iran!._id, "from.type": "news" });

    // Ingest a new article about Iran
    const enriched = await enrichNewsItem(
      "Iran test-fires ballistic missile",
      "Iran conducted a ballistic missile test in defiance of international pressure.",
    );

    const insertResult = await getDb().collection("news").insertOne({
      title: "Iran test-fires ballistic missile",
      ...enriched,
      dataSource: "rss-feed" as const,
      createdAt: new Date(),
    });

    // Add graph edges
    for (const iso2 of enriched.relatedCountries) {
      const country = await getDb().collection("countries")
        .findOne({ iso2 }, { projection: { _id: 1 } });
      if (country) {
        await getDb().collection("edges").insertOne({
          from: { type: "news", id: String(insertResult.insertedId) },
          to: { type: "country", id: country._id },
          relation: "mentions",
          weight: 0.9,
          source: "nlp",
          createdAt: new Date(),
        });
      }
    }

    // Verify: graph connections for Iran now includes the new article
    const edgesAfter = await getDb().collection("edges")
      .countDocuments({ "to.id": iran!._id, "from.type": "news" });
    expect(edgesAfter).toBeGreaterThan(edgesBefore);

    // Verify via API: /graph/connections returns news edges
    const res = await app.request(`/graph/connections?entity=country:${iran!._id}`);
    const body = await res.json();
    const newsNodes = body.data.nodes.filter((n: any) => n.type === "news");
    expect(newsNodes.length).toBeGreaterThan(0);
  });
});
