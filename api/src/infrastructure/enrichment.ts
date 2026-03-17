import { getDb } from "./mongo";
import { extractEntities } from "./entity-dictionary";

export interface EnrichedFields {
  relatedCountries: string[];
  conflictId: string | null;
  relatedChokepoints: string[];
  relatedNSA: string[];
  enrichedAt: Date;
}

export async function enrichNewsItem(
  title: string,
  summary: string,
): Promise<EnrichedFields> {
  const text = `${title} ${summary}`;
  const entities = extractEntities(text);

  const countries = entities
    .filter((e) => e.type === "country")
    .map((e) => e.iso2!)
    .filter(Boolean);

  const chokepoints = entities
    .filter((e) => e.type === "chokepoint")
    .map((e) => e.id);

  const nsaGroups = entities
    .filter((e) => e.type === "nsa")
    .map((e) => e.id);

  const conflictId = await inferConflict(countries);

  return {
    relatedCountries: [...new Set(countries)],
    conflictId,
    relatedChokepoints: [...new Set(chokepoints)],
    relatedNSA: [...new Set(nsaGroups)],
    enrichedAt: new Date(),
  };
}

async function inferConflict(
  detectedCountries: string[],
): Promise<string | null> {
  if (detectedCountries.length === 0) return null;

  const db = getDb();
  const conflicts = await db.collection("conflicts")
    .find({ status: "active", relatedCountries: { $in: detectedCountries } })
    .toArray();

  if (conflicts.length === 0) return null;

  let best = conflicts[0];
  let bestScore = 0;

  for (const conflict of conflicts) {
    const overlap = (conflict.relatedCountries as string[])
      .filter((c) => detectedCountries.includes(c)).length;
    if (overlap > bestScore) {
      bestScore = overlap;
      best = conflict;
    }
  }

  // Require 2+ country overlap for confident match,
  // unless the conflict only involves one country
  if (bestScore >= 2 || (best.relatedCountries as string[]).length === 1) {
    return best._id as string;
  }

  return null;
}
