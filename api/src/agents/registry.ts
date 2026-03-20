import { getDb } from "../infrastructure/mongo";

export async function ensureAgentRegistered(id: string, definition: Record<string, any>): Promise<void> {
  const db = getDb();
  await db.collection("agent_registry").updateOne(
    { id },
    { $setOnInsert: definition, $set: { lastStarted: new Date() } },
    { upsert: true },
  );
}

export const NEWS_RSS_AGENT = {
  id: "news-rss",
  name: "News/RSS Analyst",
  status: "active",
  created: "built-in",
  model: "haiku",
  trigger: "data_arrival",
  sources: ["rss:*"],
  allowedOperations: ["upsert_node", "upsert_edge", "create_claim", "update_belief"],
  costBudget: { dailyMaxTokens: 500000, maxTokensPerCall: 4000 },
  performance: {
    avgConfidence: 0,
    entitiesPerDoc: 0,
    claimsPerDoc: 0,
    avgLatencyMs: 0,
    errorRate: 0,
    tokensUsedToday: 0,
    totalProcessed: 0,
    lastProcessedAt: null,
  },
};
