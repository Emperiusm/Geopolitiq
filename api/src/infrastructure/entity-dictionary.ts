import { getDb } from "./mongo";

export interface EntityMatch {
  type: "country" | "conflict" | "chokepoint" | "nsa";
  id: string;
  iso2?: string;
  confidence: number;
}

interface DictionaryEntry {
  pattern: RegExp;
  match: EntityMatch;
}

let dictionary: DictionaryEntry[] = [];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function buildEntityDictionary(): Promise<number> {
  const db = getDb();

  const [countries, conflicts, chokepoints, nsa] = await Promise.all([
    db.collection("countries").find({}, { projection: { _id: 1, name: 1, iso2: 1 } }).toArray(),
    db.collection("conflicts").find({}, { projection: { _id: 1, title: 1, relatedCountries: 1 } }).toArray(),
    db.collection("chokepoints").find({}, { projection: { _id: 1, name: 1, searchTerms: 1 } }).toArray(),
    db.collection("nonStateActors").find({}, { projection: { _id: 1, name: 1, searchTerms: 1 } }).toArray(),
  ]);

  const entries: DictionaryEntry[] = [];

  // Countries — match on name and ISO2 code
  for (const c of countries) {
    entries.push({
      pattern: new RegExp(`\\b${escapeRegex(c.name)}\\b`, "i"),
      match: { type: "country", id: c._id as string, iso2: c.iso2, confidence: 1.0 },
    });
    if (c.iso2 && c.iso2.length >= 2) {
      entries.push({
        pattern: new RegExp(`\\b${escapeRegex(c.iso2)}\\b`),
        match: { type: "country", id: c._id as string, iso2: c.iso2, confidence: 0.9 },
      });
    }
  }

  // Chokepoints — name + searchTerms
  for (const ch of chokepoints) {
    entries.push({
      pattern: new RegExp(`\\b${escapeRegex(ch.name)}\\b`, "i"),
      match: { type: "chokepoint", id: ch._id as string, confidence: 1.0 },
    });
    for (const term of ch.searchTerms ?? []) {
      entries.push({
        pattern: new RegExp(`\\b${escapeRegex(term)}\\b`, "i"),
        match: { type: "chokepoint", id: ch._id as string, confidence: 0.8 },
      });
    }
  }

  // NSA groups — name + searchTerms
  for (const a of nsa) {
    entries.push({
      pattern: new RegExp(`\\b${escapeRegex(a.name)}\\b`, "i"),
      match: { type: "nsa", id: a._id as string, confidence: 1.0 },
    });
    for (const term of a.searchTerms ?? []) {
      entries.push({
        pattern: new RegExp(`\\b${escapeRegex(term)}\\b`, "i"),
        match: { type: "nsa", id: a._id as string, confidence: 0.8 },
      });
    }
  }

  // Sort longest patterns first to avoid partial matches
  entries.sort((a, b) => b.pattern.source.length - a.pattern.source.length);

  dictionary = entries;
  return entries.length;
}

export function extractEntities(text: string): EntityMatch[] {
  const seen = new Set<string>();
  const matches: EntityMatch[] = [];

  for (const entry of dictionary) {
    if (entry.pattern.test(text)) {
      const key = `${entry.match.type}:${entry.match.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push(entry.match);
      }
    }
  }

  return matches;
}

export function getDictionarySize(): number {
  return dictionary.length;
}
