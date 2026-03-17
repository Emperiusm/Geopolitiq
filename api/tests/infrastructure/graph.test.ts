import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../src/infrastructure/redis";
import { seedAll } from "../../src/seed/seed-all";
import { rebuildGraph } from "../../src/infrastructure/graph";
import { graphRouter } from "../../src/modules/aggregate/graph";

const app = new Hono().route("/graph", graphRouter);

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  await connectRedis("redis://localhost:6380");
  await seedAll();
  await rebuildGraph();
}, 30000);

afterAll(async () => {
  await getDb().collection("edges").deleteMany({});
  await disconnectRedis();
  await disconnectMongo();
});

describe("Graph builder", () => {
  it("creates edges from seed data", async () => {
    const count = await getDb().collection("edges").countDocuments();
    // Should have hundreds of edges from all the relationships
    expect(count).toBeGreaterThan(100);
  });

  it("creates conflict-involves-country edges", async () => {
    const edges = await getDb().collection("edges")
      .find({ "from.type": "conflict", relation: "involves" }).toArray();
    expect(edges.length).toBeGreaterThan(0);
  });

  it("creates base-hosted-by-country edges", async () => {
    const edges = await getDb().collection("edges")
      .find({ "from.type": "base", relation: "hosted-by" }).toArray();
    expect(edges.length).toBeGreaterThan(0);
  });

  it("creates inferred nsa-participates-in-conflict edges", async () => {
    const edges = await getDb().collection("edges")
      .find({ relation: "participates-in", source: "inferred" }).toArray();
    expect(edges.length).toBeGreaterThan(0);
    for (const e of edges) {
      expect(e.weight).toBeLessThanOrEqual(0.9);
    }
  });

  it("creates trade-route edges (passes-through chokepoints)", async () => {
    const edges = await getDb().collection("edges")
      .find({ "from.type": "trade-route", relation: "passes-through" }).toArray();
    expect(edges.length).toBeGreaterThan(0);
  });
});

describe("Graph API — connections", () => {
  it("GET /graph/connections?entity=country:iran returns connected entities", async () => {
    // Find Iran's _id
    const iran = await getDb().collection("countries").findOne({ iso2: "IR" });
    const res = await app.request(`/graph/connections?entity=country:${iran!._id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.nodes.length).toBeGreaterThan(1);
    expect(body.data.edges.length).toBeGreaterThan(0);
    expect(body.data.seed.type).toBe("country");
  });

  it("GET /graph/connections with depth=2 returns more nodes", async () => {
    const iran = await getDb().collection("countries").findOne({ iso2: "IR" });
    const res1 = await app.request(`/graph/connections?entity=country:${iran!._id}&depth=1`);
    const res2 = await app.request(`/graph/connections?entity=country:${iran!._id}&depth=2`);
    const body1 = await res1.json();
    const body2 = await res2.json();
    expect(body2.data.nodes.length).toBeGreaterThanOrEqual(body1.data.nodes.length);
  });

  it("GET /graph/connections with minWeight filters low-confidence edges", async () => {
    const iran = await getDb().collection("countries").findOne({ iso2: "IR" });
    const resAll = await app.request(`/graph/connections?entity=country:${iran!._id}`);
    const resHigh = await app.request(`/graph/connections?entity=country:${iran!._id}&minWeight=0.9`);
    const bodyAll = await resAll.json();
    const bodyHigh = await resHigh.json();
    expect(bodyHigh.data.edges.length).toBeLessThanOrEqual(bodyAll.data.edges.length);
  });

  it("returns 400 without entity param", async () => {
    const res = await app.request("/graph/connections");
    expect(res.status).toBe(400);
  });
});

describe("Graph API — path", () => {
  it("finds path between connected entities", async () => {
    const iran = await getDb().collection("countries").findOne({ iso2: "IR" });
    const conflict = await getDb().collection("conflicts").findOne({ _id: "us-iran-war" });
    if (!iran || !conflict) return; // skip if data missing

    const res = await app.request(
      `/graph/path?from=country:${iran._id}&to=conflict:${conflict._id}`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.hops).toBeGreaterThan(0);
    expect(body.data.path.length).toBe(body.data.hops);
  });

  it("returns empty path for unconnected entities", async () => {
    const res = await app.request(
      "/graph/path?from=country:nonexistent&to=conflict:nonexistent",
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.hops).toBe(-1);
    expect(body.data.path).toEqual([]);
  });

  it("returns 400 without params", async () => {
    const res = await app.request("/graph/path");
    expect(res.status).toBe(400);
  });
});
