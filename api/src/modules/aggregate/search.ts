// api/src/modules/aggregate/search.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { success, validationError } from "../../helpers/response";

export const searchRouter = new Hono();

searchRouter.get("/", async (c) => {
  const q = c.req.query("q");
  if (!q || q.length < 2) return validationError(c, "q must be at least 2 characters");

  const cacheKey = `gambit:search:${q.toLowerCase()}`;
  const data = await cacheAside(cacheKey, async () => {
    const db = getDb();
    const regex = { $regex: q, $options: "i" };
    const limit = 10;

    const [countries, conflicts, bases, nsa, chokepoints] = await Promise.all([
      db.collection("countries").find({ $or: [{ name: regex }, { region: regex }] }).limit(limit).toArray(),
      db.collection("conflicts").find({ $or: [{ title: regex }, { latestUpdate: regex }] }).limit(limit).toArray(),
      db.collection("bases").find({ name: regex }).limit(limit).toArray(),
      db.collection("nonStateActors").find({ $or: [{ name: regex }, { searchTerms: regex }] }).limit(limit).toArray(),
      db.collection("chokepoints").find({ $or: [{ name: regex }, { searchTerms: regex }] }).limit(limit).toArray(),
    ]);

    const total = countries.length + conflicts.length + bases.length + nsa.length + chokepoints.length;
    return { countries, conflicts, bases, nsa, chokepoints, _total: total };
  }, 300);

  return success(c, data, { query: q, total: data._total } as any);
});
