import { CLAIM_TOPICS } from "../../seed/claim-topics";

const ENTITY_TYPES = ["country", "person", "organization", "event", "sanction", "treaty", "military_base", "vessel"];

const RESPONSE_SCHEMA = `{
  "entities": [{"type": string, "name": string, "role"?: string, "confidence": number}],
  "claims": [{"content": string, "topic": string, "aboutEntity": string, "confidence": number}],
  "relationships": [{"from": string, "to": string, "relation": string, "confidence": number}],
  "eventSummary": string,
  "escalationSignal": "escalating" | "de-escalating" | "stable"
}`;

export function buildSinglePrompt(entityContext: string): string {
  return `You are a geopolitical intelligence analyst extracting structured data from news articles.

ENTITY TYPES: ${ENTITY_TYPES.join(", ")}
CLAIM TOPICS (use ONLY these): ${CLAIM_TOPICS.join(", ")}
KNOWN ENTITIES:
${entityContext}

INSTRUCTIONS:
1. Extract all geopolitically relevant entities mentioned in the article.
2. For each factual assertion, create a CLAIM with:
   - content: a clear, self-contained statement (one idea only)
   - topic: from the allowed list above
   - aboutEntity: the entity name this claim is about
   - confidence: 0.0-1.0
3. Extract relationships between entities (SANCTIONS, ATTACKS, ALLIES_WITH, SUPPLIES, etc.)
4. Provide a one-line event summary and escalation signal.

Match entity names against KNOWN ENTITIES where possible.
Output ONLY valid JSON matching this schema:
${RESPONSE_SCHEMA}`;
}

export function buildClusterPrompt(entityContext: string): string {
  return `You are a geopolitical intelligence analyst synthesizing intelligence from multiple news sources covering the same event.

ENTITY TYPES: ${ENTITY_TYPES.join(", ")}
CLAIM TOPICS (use ONLY these): ${CLAIM_TOPICS.join(", ")}
KNOWN ENTITIES:
${entityContext}

INSTRUCTIONS:
1. These articles cover the same event from different sources. Synthesize a unified extraction.
2. Where sources agree, assign higher confidence.
3. Where sources disagree, note both claims with appropriate confidence.
4. Extract entities, claims, and relationships as a unified view across all sources.
5. Match entity names against KNOWN ENTITIES where possible.

Output ONLY valid JSON matching this schema:
${RESPONSE_SCHEMA}`;
}

export function buildEntityContext(
  countries: { name: string; iso2: string }[],
  orgs: { name: string }[],
  conflicts: { title: string }[]
): string {
  const lines: string[] = [];
  lines.push("Countries: " + countries.map((c) => `${c.name} (${c.iso2})`).join(", "));
  lines.push("Organizations: " + orgs.map((o) => o.name).join(", "));
  lines.push("Active conflicts: " + conflicts.map((c) => c.title).join(", "));
  return lines.join("\n");
}
