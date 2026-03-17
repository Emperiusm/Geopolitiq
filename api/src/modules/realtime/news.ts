// api/src/modules/realtime/news.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, buildMongoFilter } from "../../helpers/query";
import { paginated, success, apiError } from "../../helpers/response";

export const newsRouter = new Hono();

newsRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, filters } = parseListParams(searchParams);
  const mongoFilter = buildMongoFilter(filters);

  const cacheKey = `gambit:news:${JSON.stringify({ filters, limit, offset })}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("news");
    const [data, total] = await Promise.all([
      col.find(mongoFilter).sort({ publishedAt: -1 }).skip(offset).limit(limit).toArray(),
      col.countDocuments(mongoFilter),
    ]);
    return { data, total };
  }, 30); // 30s cache for news

  return paginated(c, result.data, result.total, limit, offset);
});

// GET /news/analysis — team-scoped analyses
newsRouter.get("/analysis", async (c) => {
  const teamId = c.get("teamId") as string;
  const db = getDb();
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 200);
  const offset = Number(c.req.query("offset") ?? 0);

  const filter = { teamId };
  const [data, total] = await Promise.all([
    db.collection("newsAnalysis")
      .find(filter)
      .sort({ analyzedAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection("newsAnalysis").countDocuments(filter),
  ]);

  return paginated(c, data, total, limit, offset);
});

// POST /news/analyze — trigger analysis with BYOK key resolution
newsRouter.post("/analyze", async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;

  const { resolveBYOKKey } = await import("../../infrastructure/ai-analysis");
  const credentials = await resolveBYOKKey(userId, teamId, "user");
  if (!credentials) {
    return apiError(c, "NO_AI_KEY", "Configure an AI key in settings", 400);
  }

  const { clusterArticles, analyzeForUser } = await import("../../infrastructure/ai-analysis");
  const db = getDb();

  const recentArticles = await db.collection("news")
    .find({})
    .sort({ publishedAt: -1 })
    .limit(100)
    .toArray();

  const clusters = clusterArticles(recentArticles);
  if (clusters.length === 0) {
    return success(c, { analyzed: 0, message: "No article clusters to analyze" });
  }

  const analyzed = await analyzeForUser(userId, teamId, clusters);
  return success(c, { analyzed });
});
