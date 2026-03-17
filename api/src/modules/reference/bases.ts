// api/src/modules/reference/bases.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, parseSparseFields, buildMongoFilter } from "../../helpers/query";
import { success, paginated, notFound, validationError } from "../../helpers/response";

export const basesRouter = new Hono();

const CACHE_TTL = 3600;

basesRouter.get("/nearby", async (c) => {
  const lat = Number(c.req.query("lat"));
  const lng = Number(c.req.query("lng"));
  const radius = Number(c.req.query("radius") ?? 200); // km

  if (isNaN(lat) || isNaN(lng)) {
    return validationError(c, "lat and lng are required numeric parameters");
  }

  const cacheKey = `gambit:bases:nearby:${lat},${lng},${radius}`;
  const result = await cacheAside(cacheKey, async () => {
    const bases = await getDb().collection("bases").find({
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radius * 1000, // meters
        },
      },
    }).limit(50).toArray();
    return { bases };
  }, CACHE_TTL);

  return success(c, result.bases);
});

basesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const data = await cacheAside(`gambit:bases:${id}`, async () => {
    return getDb().collection("bases").findOne({ _id: id });
  }, CACHE_TTL);

  if (!data || !data.name) return notFound(c, "Base", id);
  return success(c, data);
});

basesRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, filters } = parseListParams(searchParams);
  const fields = parseSparseFields(searchParams.get("fields"));
  const mongoFilter = buildMongoFilter(filters);

  const cacheKey = `gambit:bases:all:${JSON.stringify({ filters, fields, limit, offset })}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("bases");
    const [data, total] = await Promise.all([
      col.find(mongoFilter, { projection: fields ?? undefined }).skip(offset).limit(limit).toArray(),
      col.countDocuments(mongoFilter),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
