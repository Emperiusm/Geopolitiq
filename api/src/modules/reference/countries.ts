// api/src/modules/reference/countries.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, parseSparseFields, buildMongoFilter } from "../../helpers/query";
import { success, paginated, notFound } from "../../helpers/response";

export const countriesRouter = new Hono();

const CACHE_TTL = 3600; // 1 hour

countriesRouter.get("/risks", async (c) => {
  const result = await cacheAside("gambit:countries:risks", async () => {
    const col = getDb().collection("countries");
    const risks = await col.aggregate([
      { $group: { _id: "$risk", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();
    return { risks };
  }, CACHE_TTL);

  return success(c, result.risks, { cached: !!result._cached });
});

countriesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const cacheKey = `gambit:countries:${id}`;

  const data = await cacheAside(cacheKey, async () => {
    return getDb().collection("countries").findOne({ _id: id });
  }, CACHE_TTL);

  if (!data || (data && !data.name)) {
    return notFound(c, "Country", id);
  }

  return success(c, data, { cached: !!data._cached });
});

countriesRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, q, filters } = parseListParams(searchParams);
  const fields = parseSparseFields(searchParams.get("fields"));

  const mongoFilter = buildMongoFilter(filters);
  if (q) {
    mongoFilter.$or = [
      { name: { $regex: q, $options: "i" } },
      { region: { $regex: q, $options: "i" } },
    ];
  }

  const cacheKey = `gambit:countries:all:${JSON.stringify({ filters, q, fields, limit, offset })}`;

  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("countries");
    const [data, total] = await Promise.all([
      col.find(mongoFilter, { projection: fields ?? undefined })
        .skip(offset)
        .limit(limit)
        .toArray(),
      col.countDocuments(mongoFilter),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset, { cached: !!result._cached });
});
