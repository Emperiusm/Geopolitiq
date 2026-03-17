import { getDb } from "./mongo";
import { getDecryptedLLMKey, decrypt } from "./user-settings";
import { publishEvent } from "./sse";
import type { LLMProvider, NewsAnalysis } from "../types";

const ANALYSIS_COLLECTION = "newsAnalysis";
const MAX_CLUSTERS_PER_CYCLE = Number(process.env.AI_MAX_CLUSTERS_PER_CYCLE ?? 10);

export interface ArticleCluster {
  articleIds: string[];
  titles: string[];
  summaries: string[];
  sources: string[];
  conflictId: string | null;
  relatedCountries: string[];
}

/** Group recent articles into clusters based on shared conflict or country overlap */
export function clusterArticles(articles: any[]): ArticleCluster[] {
  const clusters: ArticleCluster[] = [];
  const assigned = new Set<string>();

  for (const article of articles) {
    const id = String(article._id);
    if (assigned.has(id)) continue;

    const cluster: ArticleCluster = {
      articleIds: [id],
      titles: [article.title],
      summaries: [article.summary || ""],
      sources: [article.source || article.dataSource || "unknown"],
      conflictId: article.conflictId || null,
      relatedCountries: [...(article.relatedCountries || [])],
    };
    assigned.add(id);

    // Find related articles
    for (const other of articles) {
      const otherId = String(other._id);
      if (assigned.has(otherId)) continue;

      const sameConflict = cluster.conflictId && other.conflictId === cluster.conflictId;
      const sharedCountries = (other.relatedCountries || [])
        .filter((c: string) => cluster.relatedCountries.includes(c));

      if (sameConflict || sharedCountries.length >= 2) {
        cluster.articleIds.push(otherId);
        cluster.titles.push(other.title);
        cluster.summaries.push(other.summary || "");
        cluster.sources.push(other.source || other.dataSource || "unknown");
        for (const c of other.relatedCountries || []) {
          if (!cluster.relatedCountries.includes(c)) cluster.relatedCountries.push(c);
        }
        assigned.add(otherId);
      }
    }

    // Only keep clusters with 2+ articles
    if (cluster.articleIds.length >= 2) {
      clusters.push(cluster);
    }
  }

  return clusters.slice(0, MAX_CLUSTERS_PER_CYCLE);
}

/** Build the analysis prompt for an LLM */
export function buildAnalysisPrompt(cluster: ArticleCluster): string {
  const articles = cluster.titles.map((title, i) =>
    `[${i + 1}] "${title}" (${cluster.sources[i]})\n${cluster.summaries[i]}`
  ).join("\n\n");

  return `Analyze these ${cluster.articleIds.length} news articles covering the same event. Provide an unbiased multi-source analysis.

Articles:
${articles}

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "summary": "2-3 sentence unbiased summary synthesizing all sources",
  "perspectives": [
    { "source": "source name", "label": "brief bias/perspective description", "sentiment": "positive|negative|neutral" }
  ],
  "relevanceScore": 0.0-1.0,
  "escalationSignal": "escalating|de-escalating|stable"
}`;
}

/** Call an LLM API (Anthropic or OpenAI) */
export async function callLLM(
  provider: LLMProvider,
  apiKey: string,
  model: string,
  prompt: string,
): Promise<string | null> {
  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.content?.[0]?.text ?? null;
    } else {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? null;
    }
  } catch {
    return null;
  }
}

/** Parse LLM response JSON, with fallback for malformed output */
export function parseAnalysisResponse(raw: string): {
  summary: string;
  perspectives: Array<{ source: string; label: string; sentiment: "positive" | "negative" | "neutral" }>;
  relevanceScore: number;
  escalationSignal: "escalating" | "de-escalating" | "stable";
} | null {
  try {
    // Strip markdown code fences if present
    const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.summary) return null;
    return {
      summary: parsed.summary,
      perspectives: parsed.perspectives || [],
      relevanceScore: Math.max(0, Math.min(1, Number(parsed.relevanceScore) || 0.5)),
      escalationSignal: ["escalating", "de-escalating", "stable"].includes(parsed.escalationSignal)
        ? parsed.escalationSignal
        : "stable",
    };
  } catch {
    return null;
  }
}

/** Run Tier 2 analysis for a user on a set of article clusters */
export async function analyzeForUser(
  userId: string,
  teamId: string,
  clusters: ArticleCluster[],
): Promise<number> {
  const credentials = await getDecryptedLLMKey(userId);
  if (!credentials) return 0;

  const db = getDb();
  const col = db.collection(ANALYSIS_COLLECTION);
  let analyzed = 0;

  for (const cluster of clusters) {
    // Check if already analyzed (keyed by sorted articleIds)
    const sortedIds = [...cluster.articleIds].sort();
    const existing = await col.findOne({ articleIds: sortedIds });
    if (existing) continue;

    const prompt = buildAnalysisPrompt(cluster);
    const raw = await callLLM(credentials.provider, credentials.apiKey, credentials.model, prompt);
    if (!raw) continue;

    const parsed = parseAnalysisResponse(raw);
    if (!parsed) continue;

    const analysis: NewsAnalysis = {
      articleIds: sortedIds,
      summary: parsed.summary,
      perspectives: parsed.perspectives,
      relevanceScore: parsed.relevanceScore,
      escalationSignal: parsed.escalationSignal,
      relatedCountries: cluster.relatedCountries,
      conflictId: cluster.conflictId,
      provider: credentials.provider,
      model: credentials.model,
      userId,
      teamId,
      analyzedAt: new Date(),
    };

    await col.insertOne(analysis);
    await publishEvent("news-analysis", {
      articleIds: sortedIds,
      summary: parsed.summary,
      escalationSignal: parsed.escalationSignal,
      teamId,
    });

    analyzed++;
  }

  return analyzed;
}

/** Resolve the BYOK API key to use for analysis, following priority order */
export async function resolveBYOKKey(
  userId: string,
  teamId: string,
  trigger: "user" | "team",
): Promise<{ provider: string; apiKey: string; model: string } | null> {
  if (trigger === "team") {
    const db = getDb();
    const teamSettings = await db.collection("teamSettings").findOne({ _id: teamId });
    if (teamSettings?.llmApiKey && teamSettings?.aiAnalysisEnabled) {
      try {
        return {
          provider: teamSettings.llmProvider,
          apiKey: decrypt(teamSettings.llmApiKey),
          model: teamSettings.llmModel || (teamSettings.llmProvider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o"),
        };
      } catch { return null; }
    }
    return null;
  }

  // User-triggered: personal key → team key → null
  const personal = await getDecryptedLLMKey(userId);
  if (personal) return personal;

  const db = getDb();
  const teamSettings = await db.collection("teamSettings").findOne({ _id: teamId });
  if (teamSettings?.llmApiKey && teamSettings?.aiAnalysisEnabled) {
    try {
      return {
        provider: teamSettings.llmProvider,
        apiKey: decrypt(teamSettings.llmApiKey),
        model: teamSettings.llmModel || (teamSettings.llmProvider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o"),
      };
    } catch { return null; }
  }

  return null;
}

/** Get all users with AI analysis enabled */
export async function getAIEnabledUsers(): Promise<string[]> {
  const db = getDb();
  const users = await db.collection("userSettings")
    .find({ aiAnalysisEnabled: true }, { projection: { _id: 1 } })
    .toArray();
  return users.map((u) => u._id as string);
}
