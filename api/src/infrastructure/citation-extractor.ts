import { getSourceTier } from "./source-tiers";
import type { CitationLink } from "../types";

interface CitationPattern {
  regex: RegExp;
  type: "direct_quote" | "paraphrase" | "vague_attribution";
  sourceGroup: number; // which capture group contains the source name
}

const CITATION_PATTERNS: CitationPattern[] = [
  // Direct attribution: "SOURCE confirmed/reported/said"
  { regex: /(?:according to|as reported by|confirmed by)\s+([A-Z][\w\s&'-]{2,30})/gi, type: "direct_quote", sourceGroup: 1 },
  { regex: /([A-Z][\w\s&'-]{2,25})\s+(?:confirmed|reported|said|stated|announced|disclosed|revealed)\s+(?:that|on)/gi, type: "direct_quote", sourceGroup: 1 },
  { regex: /([A-Z][\w\s&'-]{2,25})\s+(?:first reported|broke the news|exclusively reported)/gi, type: "direct_quote", sourceGroup: 1 },

  // Paraphrase: "citing SOURCE", "SOURCE reports"
  { regex: /citing\s+([A-Z][\w\s&'-]{2,30})/gi, type: "paraphrase", sourceGroup: 1 },
  { regex: /([A-Z][\w\s&'-]{2,25})\s+(?:reports?|reported)\b/gi, type: "paraphrase", sourceGroup: 1 },

  // Vague attribution: "reports say", "sources say", "officials said"
  { regex: /\b(reports|sources|officials|analysts|experts)\s+(?:say|said|indicate|suggest|claim|believe)\b/gi, type: "vague_attribution", sourceGroup: 1 },
  { regex: /\b(sources?\s+familiar\s+with\s+the\s+matter)\b/gi, type: "vague_attribution", sourceGroup: 1 },
  { regex: /\b(according\s+to\s+(?:reports|sources|officials))\b/gi, type: "vague_attribution", sourceGroup: 1 },
];

// Known source names to validate extractions against
const KNOWN_SOURCES = new Set([
  "Reuters", "AP", "Associated Press", "AFP", "BBC", "CNN", "Al Jazeera",
  "The Guardian", "The New York Times", "The Washington Post", "Wall Street Journal",
  "Financial Times", "Bloomberg", "CNBC", "Fox News", "NPR", "PBS",
  "ABC News", "CBS News", "NBC News", "France 24", "DW",
  "Foreign Policy", "Foreign Affairs", "Defense One", "Defense News",
  "The War Zone", "Bellingcat", "USNI News", "The Diplomat",
  "Crisis Group", "CSIS", "Brookings", "RAND", "Atlantic Council",
  "The Hill", "Politico", "Axios", "Haaretz", "Times of Israel",
  "South China Morning Post", "Nikkei Asia", "Al Arabiya",
  "UN", "United Nations", "WHO", "IAEA", "Pentagon", "State Department",
  "White House", "NATO", "EU", "European Union",
]);

function isKnownSource(name: string): boolean {
  const trimmed = name.trim();
  if (KNOWN_SOURCES.has(trimmed)) return true;
  // Fuzzy: check if any known source starts with the extracted name
  for (const known of KNOWN_SOURCES) {
    if (known.toLowerCase().startsWith(trimmed.toLowerCase()) && trimmed.length >= 3) return true;
  }
  return false;
}

/** Extract citation links from article text */
export function extractCitations(text: string): CitationLink[] {
  const citations: CitationLink[] = [];
  const seen = new Set<string>();

  for (const pattern of CITATION_PATTERNS) {
    // Reset regex state
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const source = match[pattern.sourceGroup]?.trim();
      if (!source) continue;

      const key = `${source.toLowerCase()}:${pattern.type}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const citation: CitationLink = {
        citedSource: source,
        citationType: pattern.type,
        phrase: match[0].trim(),
      };

      // Only resolve tier for known/recognized sources
      if (isKnownSource(source)) {
        citation.citedSourceTier = getSourceTier(source);
      }

      citations.push(citation);
    }
  }

  return citations;
}

/** Count vague attributions — a high count is a red flag */
export function countVagueAttributions(citations: CitationLink[]): number {
  return citations.filter((c) => c.citationType === "vague_attribution").length;
}
