import type { ExtractionResult, ClaimNode } from "../types";
import type { ClaimTopic } from "../../seed/claim-topics";
import { CLAIM_TOPICS } from "../../seed/claim-topics";
import { claimFingerprint } from "../../seed/claim-templates";

const validTopics = new Set<string>(CLAIM_TOPICS);

export function generateClaims(
  extraction: ExtractionResult,
  agentId: string,
  articleIds: string[]
): ClaimNode[] {
  const claims: ClaimNode[] = [];

  for (const raw of extraction.claims) {
    if (!validTopics.has(raw.topic)) continue;

    const fp = claimFingerprint(raw.topic, raw.content, raw.aboutEntity);

    claims.push({
      id: crypto.randomUUID(),
      fingerprint: fp,
      content: raw.content,
      topic: raw.topic as ClaimTopic,
      confidence: raw.confidence,
      status: "active",
      sourceCount: articleIds.length,
      embedding: null,
      extractedAt: new Date().toISOString(),
      agentId,
      aboutEntity: raw.aboutEntity,
    });
  }

  return claims;
}
