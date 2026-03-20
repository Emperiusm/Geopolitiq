import type { ExtractionResult } from "../types";

export function regexExtract(
  title: string,
  _summary: string,
  relatedCountries: string[],
  _relatedChokepoints: string[],
  relatedNSA: string[]
): ExtractionResult {
  const entities = [
    ...relatedCountries.map((c) => ({
      type: "country" as const,
      name: c,
      confidence: 0.6,
    })),
    ...relatedNSA.map((o) => ({
      type: "organization" as const,
      name: o,
      confidence: 0.5,
    })),
  ];

  const claims = relatedCountries.map((c) => ({
    content: `${c} mentioned in: ${title}`,
    topic: "situation" as const,
    aboutEntity: c,
    confidence: 0.4,
  }));

  return {
    entities,
    claims,
    relationships: [],
    eventSummary: title,
    escalationSignal: "stable",
  };
}
