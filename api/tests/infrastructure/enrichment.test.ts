import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo } from "../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../src/infrastructure/redis";
import { seedAll } from "../../src/seed/seed-all";
import { buildEntityDictionary, extractEntities, getDictionarySize } from "../../src/infrastructure/entity-dictionary";
import { enrichNewsItem } from "../../src/infrastructure/enrichment";

// Shared setup — runs once for both describe blocks
beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  await connectRedis("redis://localhost:6380");
  await seedAll();
  await buildEntityDictionary();
}, 30000);

afterAll(async () => {
  await disconnectRedis();
  await disconnectMongo();
});

describe("Entity dictionary", () => {

  it("builds dictionary with patterns from all collections", () => {
    const size = getDictionarySize();
    // Countries (~199 names + ~199 ISO2) + chokepoints + NSA + searchTerms
    expect(size).toBeGreaterThan(400);
  });

  it("extracts country from text by name", () => {
    const matches = extractEntities("Fighting intensifies in Ukraine as winter sets in");
    const countries = matches.filter((m) => m.type === "country");
    expect(countries.length).toBeGreaterThan(0);
    expect(countries.some((c) => c.iso2 === "UA")).toBe(true);
  });

  it("extracts country from text by ISO2 code", () => {
    const matches = extractEntities("US deploys carrier group to Persian Gulf");
    const countries = matches.filter((m) => m.type === "country");
    expect(countries.some((c) => c.iso2 === "US")).toBe(true);
  });

  it("extracts chokepoint from text", () => {
    const matches = extractEntities("Oil tanker struck in Strait of Hormuz");
    const chokepoints = matches.filter((m) => m.type === "chokepoint");
    expect(chokepoints.length).toBeGreaterThan(0);
  });

  it("extracts NSA group from text", () => {
    const matches = extractEntities("Hezbollah launches rocket barrage into northern Israel");
    const nsa = matches.filter((m) => m.type === "nsa");
    expect(nsa.length).toBeGreaterThan(0);
  });

  it("extracts multiple entity types from one text", () => {
    const matches = extractEntities(
      "Iran strikes US-owned oil tanker in Strait of Hormuz as Hezbollah fires rockets",
    );
    const types = new Set(matches.map((m) => m.type));
    expect(types.has("country")).toBe(true);
    expect(types.has("chokepoint")).toBe(true);
    expect(types.has("nsa")).toBe(true);
  });

  it("deduplicates entities", () => {
    const matches = extractEntities("Iran and Iran again, Iran keeps appearing");
    const iranMatches = matches.filter((m) => m.type === "country" && m.iso2 === "IR");
    expect(iranMatches.length).toBe(1);
  });
});

describe("News enrichment", () => {
  it("enriches article with entity links and conflict inference", async () => {
    const result = await enrichNewsItem(
      "Iran Strikes U.S.-Owned Oil Tanker in Strait of Hormuz",
      "An Iranian anti-ship missile struck a US-flagged commercial tanker transiting the Strait of Hormuz.",
    );

    expect(result.relatedCountries).toContain("IR");
    expect(result.relatedCountries).toContain("US");
    expect(result.relatedChokepoints.length).toBeGreaterThan(0);
    expect(result.conflictId).toBe("us-iran-war");
    expect(result.enrichedAt).toBeDefined();
  });

  it("returns null conflictId when no conflict matches", async () => {
    const result = await enrichNewsItem(
      "New Zealand launches sustainable energy initiative",
      "The New Zealand government announced a major renewable energy investment.",
    );

    expect(result.conflictId).toBeNull();
  });

  it("matches single-country conflicts", async () => {
    const result = await enrichNewsItem(
      "UN Emergency Session on Sudan Humanitarian Crisis",
      "The UN Security Council convened on the worsening situation in Sudan.",
    );

    expect(result.relatedCountries).toContain("SD");
    expect(result.conflictId).toBe("sudan-civil-war");
  });
});
