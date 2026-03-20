import type { SourceTier } from "../types";

export const TIER_MULTIPLIER: Record<SourceTier, number> = {
  primary: 1.0,
  established: 0.9,
  specialized: 0.85,
  regional: 0.75,
  aggregator: 0.5,
  unknown: 0.4,
};

export function adjustConfidence(rawConfidence: number, tier: SourceTier): number {
  return Math.min(1.0, Math.max(0.0, rawConfidence * TIER_MULTIPLIER[tier]));
}

export function resolutionScore(confidence: number, tier: SourceTier, sourceCount: number): number {
  return confidence * TIER_MULTIPLIER[tier] * Math.log2(sourceCount + 1);
}
