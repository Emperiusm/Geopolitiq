import { describe, it, expect } from "bun:test";
import { classifyTags, titleHash } from "../../../src/modules/periodic/news-aggregator";

describe("News aggregator — classifyTags", () => {
  it("tags conflict articles", () => {
    const tags = classifyTags("Airstrike hits convoy", "Multiple casualties reported");
    expect(tags).toContain("CONFLICT");
  });

  it("tags cyber articles", () => {
    const tags = classifyTags("Ransomware attack", "Major infrastructure hit by cyber attack");
    expect(tags).toContain("CYBER");
  });

  it("tags economic articles", () => {
    const tags = classifyTags("New sanctions imposed", "EU approves embargo");
    expect(tags).toContain("ECONOMIC");
  });

  it("tags diplomatic articles", () => {
    const tags = classifyTags("Peace talks resume", "Ceasefire negotiations underway");
    expect(tags).toContain("DIPLOMACY");
  });

  it("returns empty tags for unclassifiable text", () => {
    const tags = classifyTags("Weather forecast", "It will be sunny tomorrow");
    expect(tags).toEqual([]);
  });

  it("returns multiple tags for multi-topic articles", () => {
    const tags = classifyTags("Sanctions and airstrike", "Economic embargo after bombing");
    expect(tags.length).toBeGreaterThan(1);
  });
});

describe("News aggregator — titleHash", () => {
  it("normalizes titles for dedup", () => {
    expect(titleHash("Hello World!")).toBe("helloworld");
    expect(titleHash("  HELLO world  ")).toBe("helloworld");
  });

  it("strips special characters", () => {
    expect(titleHash("Iran's War: A 'New' Chapter")).toBe("iranswaranewchapter");
  });

  it("matches similar titles", () => {
    expect(titleHash("Breaking: War erupts")).toBe(titleHash("breaking: war erupts"));
  });
});
