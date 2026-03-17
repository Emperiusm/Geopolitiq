import { describe, it, expect } from "bun:test";
import {
  parseCountries,
  parseBases,
  parseNSA,
  parseChokepoints,
  parseElections,
} from "../../src/seed/parse-bundle";

describe("Bundle parser", () => {
  it("parseCountries returns an object keyed by country name", async () => {
    const countries = await parseCountries();
    expect(typeof countries).toBe("object");
    expect(countries["Ukraine"]).toBeDefined();
    expect(countries["Ukraine"].lat).toBeNumber();
    expect(countries["Ukraine"].flag).toBe("🇺🇦");
    expect(Object.keys(countries).length).toBeGreaterThanOrEqual(190);
  });

  it("parseBases returns an array of base objects", async () => {
    const bases = await parseBases();
    expect(Array.isArray(bases)).toBe(true);
    expect(bases.length).toBeGreaterThanOrEqual(490);
    expect(bases[0].id).toBeDefined();
    expect(bases[0].name).toBeDefined();
    expect(bases[0].lat).toBeNumber();
  });

  it("parseNSA returns an array of non-state actor objects", async () => {
    const nsa = await parseNSA();
    expect(Array.isArray(nsa)).toBe(true);
    expect(nsa.length).toBeGreaterThanOrEqual(70);
  });

  it("parseChokepoints returns an array of chokepoint objects", async () => {
    const chokepoints = await parseChokepoints();
    expect(Array.isArray(chokepoints)).toBe(true);
    expect(chokepoints.length).toBeGreaterThanOrEqual(50);
    expect(chokepoints[0].id).toBe("hormuz");
  });

  it("parseElections returns an array of election objects", async () => {
    const elections = await parseElections();
    expect(Array.isArray(elections)).toBe(true);
    expect(elections.length).toBeGreaterThanOrEqual(4);
    expect(elections[0].country).toBeDefined();
  });
});
