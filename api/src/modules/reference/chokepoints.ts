// api/src/modules/reference/chokepoints.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, parseSparseFields, buildMongoFilter } from "../../helpers/query";
import { success, paginated, notFound } from "../../helpers/response";

export const chokepointsRouter = new Hono();
const CACHE_TTL = 3600;

chokepointsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const data = await cacheAside(`gambit:chokepoints:${id}`, async () => {
    return getDb().collection("chokepoints").findOne({ _id: id });
  }, CACHE_TTL);
  if (!data || !data.name) return notFound(c, "Chokepoint", id);
  return success(c, data);
});

chokepointsRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, filters } = parseListParams(searchParams);
  const fields = parseSparseFields(searchParams.get("fields"));
  const mongoFilter = buildMongoFilter(filters);

  const cacheKey = `gambit:chokepoints:all:${JSON.stringify({ filters, fields, limit, offset })}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("chokepoints");
    const [data, total] = await Promise.all([
      col.find(mongoFilter, { projection: fields ?? undefined }).skip(offset).limit(limit).toArray(),
      col.countDocuments(mongoFilter),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
