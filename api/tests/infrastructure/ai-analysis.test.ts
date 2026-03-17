import { describe, it, expect } from "bun:test";
import { clusterArticles, buildAnalysisPrompt, parseAnalysisResponse } from "../../src/infrastructure/ai-analysis";

describe("AI analysis", () => {
  it("clusters articles by shared conflictId", () => {
    const articles = [
      { _id: "1", title: "A", summary: "s1", conflictId: "us-iran-war", relatedCountries: ["US", "IR"] },
      { _id: "2", title: "B", summary: "s2", conflictId: "us-iran-war", relatedCountries: ["US"] },
      { _id: "3", title: "C", summary: "s3", conflictId: null, relatedCountries: ["GB"] },
    ];
    const clusters = clusterArticles(articles);
    expect(clusters.length).toBe(1);
    expect(clusters[0].articleIds).toContain("1");
    expect(clusters[0].articleIds).toContain("2");
  });

  it("clusters articles by 2+ shared countries", () => {
    const articles = [
      { _id: "1", title: "A", summary: "s1", conflictId: null, relatedCountries: ["US", "IR", "SA"] },
      { _id: "2", title: "B", summary: "s2", conflictId: null, relatedCountries: ["US", "IR"] },
    ];
    const clusters = clusterArticles(articles);
    expect(clusters.length).toBe(1);
  });

  it("does not cluster articles with only 1 shared country", () => {
    const articles = [
      { _id: "1", title: "A", summary: "s1", conflictId: null, relatedCountries: ["US"] },
      { _id: "2", title: "B", summary: "s2", conflictId: null, relatedCountries: ["US", "GB"] },
    ];
    const clusters = clusterArticles(articles);
    expect(clusters.length).toBe(0);
  });

  it("builds analysis prompt with all articles", () => {
    const cluster = {
      articleIds: ["1", "2"],
      titles: ["Title A", "Title B"],
      summaries: ["Summary A", "Summary B"],
      sources: ["BBC", "CNN"],
      conflictId: "test",
      relatedCountries: ["US"],
    };
    const prompt = buildAnalysisPrompt(cluster);
    expect(prompt).toContain("Title A");
    expect(prompt).toContain("Title B");
    expect(prompt).toContain("BBC");
    expect(prompt).toContain("CNN");
  });

  it("parses valid JSON response", () => {
    const raw = JSON.stringify({
      summary: "Test summary",
      perspectives: [{ source: "BBC", label: "neutral", sentiment: "neutral" }],
      relevanceScore: 0.8,
      escalationSignal: "escalating",
    });
    const parsed = parseAnalysisResponse(raw);
    expect(parsed).toBeDefined();
    expect(parsed!.summary).toBe("Test summary");
    expect(parsed!.escalationSignal).toBe("escalating");
    expect(parsed!.relevanceScore).toBe(0.8);
  });

  it("handles markdown code fences in response", () => {
    const raw = '```json\n{"summary":"Test","perspectives":[],"relevanceScore":0.5,"escalationSignal":"stable"}\n```';
    const parsed = parseAnalysisResponse(raw);
    expect(parsed).toBeDefined();
    expect(parsed!.summary).toBe("Test");
  });

  it("returns null for invalid JSON", () => {
    expect(parseAnalysisResponse("not json")).toBeNull();
    expect(parseAnalysisResponse('{"no_summary": true}')).toBeNull();
  });

  it("clamps relevanceScore to 0-1", () => {
    const raw = JSON.stringify({
      summary: "Test",
      perspectives: [],
      relevanceScore: 5.0,
      escalationSignal: "stable",
    });
    const parsed = parseAnalysisResponse(raw);
    expect(parsed!.relevanceScore).toBe(1.0);
  });
});
