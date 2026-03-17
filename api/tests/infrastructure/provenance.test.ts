import { describe, it, expect } from "bun:test";
import { getSourceTier, getSourceTierFromUrl, getDomainsByTier } from "../../src/infrastructure/source-tiers";
import { extractCitations, countVagueAttributions } from "../../src/infrastructure/citation-extractor";
import { buildArticleProvenance, buildStandaloneProvenance } from "../../src/infrastructure/provenance";

describe("Source tiers", () => {
  it("resolves primary tier for wire services", () => {
    expect(getSourceTier("apnews.com")).toBe("primary");
    expect(getSourceTier("reuters.com")).toBe("primary");
    expect(getSourceTier("state.gov")).toBe("primary");
  });

  it("resolves established tier for major outlets", () => {
    expect(getSourceTier("bbc.co.uk")).toBe("established");
    expect(getSourceTier("cnn.com")).toBe("established");
    expect(getSourceTier("theguardian.com")).toBe("established");
  });

  it("resolves specialized tier for domain experts", () => {
    expect(getSourceTier("bellingcat.com")).toBe("specialized");
    expect(getSourceTier("foreignpolicy.com")).toBe("specialized");
  });

  it("returns unknown for unregistered domains", () => {
    expect(getSourceTier("randomblog.xyz")).toBe("unknown");
  });

  it("resolves tier from URL", () => {
    expect(getSourceTierFromUrl("https://www.bbc.co.uk/news/world-123")).toBe("established");
    expect(getSourceTierFromUrl("https://apnews.com/article/test")).toBe("primary");
  });

  it("gets domains by tier", () => {
    const primary = getDomainsByTier("primary");
    expect(primary).toContain("apnews.com");
    expect(primary).toContain("reuters.com");
  });
});

describe("Citation extractor", () => {
  it("extracts direct attribution", () => {
    const citations = extractCitations("According to Reuters, the attack happened at dawn.");
    expect(citations.length).toBeGreaterThan(0);
    const reuters = citations.find((c) => c.citedSource.includes("Reuters"));
    expect(reuters).toBeDefined();
    expect(reuters!.citationType).toBe("direct_quote");
  });

  it("extracts paraphrase citations", () => {
    const citations = extractCitations("The report, citing Pentagon officials, detailed the strike.");
    expect(citations.length).toBeGreaterThan(0);
    expect(citations.some((c) => c.citationType === "paraphrase")).toBe(true);
  });

  it("extracts vague attributions", () => {
    const citations = extractCitations("Sources familiar with the matter said the deal is close. Reports say an agreement is near.");
    const vague = citations.filter((c) => c.citationType === "vague_attribution");
    expect(vague.length).toBeGreaterThanOrEqual(2);
  });

  it("deduplicates citations", () => {
    const citations = extractCitations("Reuters reported the event. According to Reuters, it happened Tuesday.");
    const reutersCitations = citations.filter((c) => c.citedSource.includes("Reuters"));
    // Should have at most one per type
    const types = new Set(reutersCitations.map((c) => c.citationType));
    expect(types.size).toBe(reutersCitations.length);
  });

  it("counts vague attributions", () => {
    const citations = extractCitations("Sources say the plan failed. Officials said it was unexpected. Reports indicate more to come.");
    expect(countVagueAttributions(citations)).toBeGreaterThanOrEqual(2);
  });
});

describe("Provenance scoring", () => {
  it("builds standalone provenance for a single article", () => {
    const prov = buildStandaloneProvenance({
      title: "Iran strikes tanker",
      summary: "According to Reuters, an oil tanker was hit.",
      source: "bbc.co.uk",
      publishedAt: new Date(),
    });

    expect(prov.sourceTier).toBe("established");
    expect(prov.citations.length).toBeGreaterThan(0);
    expect(prov.trustScore).toBeGreaterThan(0);
    expect(prov.trustScore).toBeLessThanOrEqual(1);
    expect(prov.corroboration.totalSources).toBe(1);
  });

  it("scores cluster with multiple independent sources higher", () => {
    const now = new Date();
    const articles = [
      { title: "Strike reported", summary: "Pentagon confirmed the attack.", source: "apnews.com", publishedAt: new Date(now.getTime() - 3600000) },
      { title: "Strike confirmed", summary: "BBC reporters on the ground saw the damage.", source: "bbc.co.uk", publishedAt: new Date(now.getTime() - 1800000) },
      { title: "Oil tanker hit", summary: "Reuters verified the incident.", source: "reuters.com", publishedAt: now },
    ];

    const prov = buildArticleProvenance(articles[0], articles);
    expect(prov.corroboration.totalSources).toBe(3);
    expect(prov.corroboration.independentSources).toBeGreaterThanOrEqual(2);
    expect(prov.trustScore).toBeGreaterThan(0.5);
  });

  it("detects when all sources cite the same origin", () => {
    const now = new Date();
    const articles = [
      { title: "Strike hits convoy", summary: "According to Reuters, the strike occurred at dawn.", source: "Blog A", publishedAt: new Date(now.getTime() - 3600000) },
      { title: "Convoy attacked", summary: "Citing Reuters, the convoy was hit.", source: "Blog B", publishedAt: new Date(now.getTime() - 1800000) },
      { title: "Military strike", summary: "As reported by Reuters, the attack happened Tuesday.", source: "Blog C", publishedAt: now },
    ];

    const prov = buildArticleProvenance(articles[0], articles);
    // All three cite Reuters — independentSources should be 1
    expect(prov.corroboration.independentSources).toBe(1);
    expect(prov.corroboration.citationConvergence).toBe(true);
    expect(prov.redFlags.length).toBeGreaterThan(0);
  });

  it("flags unknown first-mover source", () => {
    const now = new Date();
    const articles = [
      { title: "Exclusive: secret deal", summary: "We can exclusively report a secret arms deal.", source: "Unknown Blog", publishedAt: new Date(now.getTime() - 7200000) },
      { title: "Arms deal reported", summary: "Reports say a secret deal was made.", source: "BBC World", publishedAt: now },
    ];

    const prov = buildArticleProvenance(articles[1], articles);
    expect(prov.firstMover.firstMoverTier).toBe("unknown");
    expect(prov.redFlags.some((f) => f.includes("unknown-tier"))).toBe(true);
  });

  it("gives higher trust to primary-sourced articles", () => {
    const primaryProv = buildStandaloneProvenance({
      title: "Statement released", summary: "The Pentagon released a statement.", source: "apnews.com", publishedAt: new Date(),
    });
    const unknownProv = buildStandaloneProvenance({
      title: "Statement released", summary: "Reports say something happened.", source: "randomblog.xyz", publishedAt: new Date(),
    });

    expect(primaryProv.trustScore).toBeGreaterThan(unknownProv.trustScore);
  });
});
