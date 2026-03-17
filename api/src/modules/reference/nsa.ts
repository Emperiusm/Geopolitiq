// api/src/modules/reference/nsa.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, parseSparseFields, buildMongoFilter } from "../../helpers/query";
import { success, paginated, notFound } from "../../helpers/response";

export const nsaRouter = new Hono();
const CACHE_TTL = 3600;

nsaRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const data = await cacheAside(`gambit:nsa:${id}`, async () => {
    return getDb().collection("nonStateActors").findOne({ _id: id });
  }, CACHE_TTL);
  if (!data || !data.name) return notFound(c, "Non-state actor", id);
  return success(c, data);
});

nsaRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, q, filters } = parseListParams(searchParams);
  const fields = parseSparseFields(searchParams.get("fields"));
  const mongoFilter = buildMongoFilter(filters);
  if (q) {
    mongoFilter.$or = [
      { name: { $regex: q, $options: "i" } },
      { searchTerms: { $regex: q, $options: "i" } },
    ];
  }

  const cacheKey = `gambit:nsa:all:${JSON.stringify({ filters, q, fields, limit, offset })}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("nonStateActors");
    const [data, total] = await Promise.all([
      col.find(mongoFilter, { projection: fields ?? undefined }).skip(offset).limit(limit).toArray(),
      col.countDocuments(mongoFilter),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
