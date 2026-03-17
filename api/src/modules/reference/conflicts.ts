// api/src/modules/reference/conflicts.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, buildMongoFilter } from "../../helpers/query";
import { success, paginated, notFound } from "../../helpers/response";

export const conflictsRouter = new Hono();
const CACHE_TTL = 900; // 15 min for conflicts

conflictsRouter.get("/:id/timeline", async (c) => {
  const id = c.req.param("id");
  const cacheKey = `gambit:conflicts:${id}:timeline`;

  const data = await cacheAside(cacheKey, async () => {
    const db = getDb();
    const conflict = await db.collection("conflicts").findOne({ _id: id });
    if (!conflict) return null;
    const news = await db.collection("news")
      .find({ conflictId: id })
      .sort({ publishedAt: -1 })
      .limit(50)
      .toArray();
    return { conflict, timeline: news };
  }, CACHE_TTL);

  if (!data) return notFound(c, "Conflict", id);
  return success(c, data);
});

conflictsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const data = await cacheAside(`gambit:conflicts:${id}`, async () => {
    return getDb().collection("conflicts").findOne({ _id: id });
  }, CACHE_TTL);
  if (!data || !data.title) return notFound(c, "Conflict", id);
  return success(c, data);
});

conflictsRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, filters } = parseListParams(searchParams);
  const mongoFilter = buildMongoFilter(filters);

  const cacheKey = `gambit:conflicts:all:${JSON.stringify({ filters, limit, offset })}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("conflicts");
    const [data, total] = await Promise.all([
      col.find(mongoFilter).sort({ dayCount: -1 }).skip(offset).limit(limit).toArray(),
      col.countDocuments(mongoFilter),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
