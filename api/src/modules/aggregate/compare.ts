// api/src/modules/aggregate/compare.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { success, validationError } from "../../helpers/response";

export const compareRouter = new Hono();

compareRouter.get("/colors", async (c) => {
  const data = await cacheAside("gambit:compare:colors", async () => {
    const docs = await getDb().collection("countryColors").find({}).toArray();
    const colors: Record<string, string> = {};
    for (const doc of docs) colors[doc._id as string] = doc.color;
    return colors;
  }, 3600);

  return success(c, data);
});

compareRouter.get("/", async (c) => {
  const countriesParam = c.req.query("countries");
  if (!countriesParam) return validationError(c, "countries parameter required (comma-separated ISO2 codes)");

  const iso2Codes = countriesParam.split(",").map(s => s.trim().toUpperCase()).slice(0, 3);
  if (iso2Codes.length === 0) return validationError(c, "At least one country code required");

  const cacheKey = `gambit:compare:${iso2Codes.join(",")}`;
  const data = await cacheAside(cacheKey, async () => {
    const db = getDb();

    const countries = await db.collection("countries").find({ iso2: { $in: iso2Codes } }).toArray();
    const countryNames = countries.map(c => c.name);

    const [conflicts, nsa, bases] = await Promise.all([
      db.collection("conflicts").find({ relatedCountries: { $in: iso2Codes } }).toArray(),
      db.collection("nonStateActors").find({
        $or: [
          { allies: { $in: countryNames } },
          { rivals: { $in: countryNames } },
        ],
      }).toArray(),
      db.collection("bases").find({ country: { $in: countryNames } }).toArray(),
    ]);

    return { countries, conflicts, nsa, bases };
  }, 3600);

  return success(c, data);
});
