// api/src/modules/realtime/news.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, buildMongoFilter } from "../../helpers/query";
import { paginated } from "../../helpers/response";

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
