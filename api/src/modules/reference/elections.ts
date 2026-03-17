// api/src/modules/reference/elections.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams } from "../../helpers/query";
import { success, paginated, notFound } from "../../helpers/response";

export const electionsRouter = new Hono();
const CACHE_TTL = 3600;

electionsRouter.get("/upcoming", async (c) => {
  const data = await cacheAside("gambit:elections:upcoming", async () => {
    return getDb().collection("elections")
      .find({ dateISO: { $gte: new Date() } })
      .sort({ dateISO: 1 })
      .toArray();
  }, CACHE_TTL);
  return success(c, data);
});

electionsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const data = await cacheAside(`gambit:elections:${id}`, async () => {
    return getDb().collection("elections").findOne({ _id: id });
  }, CACHE_TTL);
  if (!data || !data.country) return notFound(c, "Election", id);
  return success(c, data);
});

electionsRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset } = parseListParams(searchParams);

  const cacheKey = `gambit:elections:all:${limit}:${offset}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("elections");
    const [data, total] = await Promise.all([
      col.find({}).sort({ dateISO: 1 }).skip(offset).limit(limit).toArray(),
      col.countDocuments(),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
