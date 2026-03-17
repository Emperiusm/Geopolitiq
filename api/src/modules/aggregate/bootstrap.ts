// api/src/modules/aggregate/bootstrap.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { success } from "../../helpers/response";

export const bootstrapRouter = new Hono();

const SLIM_PROJECTIONS = {
  countries: { _id: 1, iso2: 1, name: 1, flag: 1, lat: 1, lng: 1, risk: 1, region: 1, tags: 1 },
  bases: { _id: 1, name: 1, lat: 1, lng: 1, operatingCountry: 1, type: 1, color: 1 },
  nsa: { _id: 1, name: 1, ideology: 1, status: 1, zones: 1 },
  chokepoints: { _id: 1, name: 1, type: 1, lat: 1, lng: 1, status: 1, tooltipLine: 1 },
  conflicts: { _id: 1, title: 1, lat: 1, lng: 1, dayCount: 1, status: 1, casualties: 1 },
  elections: { _id: 1, country: 1, lat: 1, lng: 1, dateISO: 1, type: 1, flag: 1 },
  tradeRoutes: {},
  ports: { _id: 1, name: 1, lat: 1, lng: 1 },
};

bootstrapRouter.get("/", async (c) => {
  const slim = c.req.query("slim") === "true";
  const cacheKey = slim ? "gambit:bootstrap:slim" : "gambit:bootstrap:full";

  const data = await cacheAside(cacheKey, async () => {
    const db = getDb();
    const proj = slim ? SLIM_PROJECTIONS : {};

    const [countries, bases, nsa, chokepoints, conflicts, elections, tradeRoutes, ports, colorDocs] = await Promise.all([
      db.collection("countries").find({}, { projection: (proj as any).countries }).toArray(),
      db.collection("bases").find({}, { projection: (proj as any).bases }).toArray(),
      db.collection("nonStateActors").find({}, { projection: (proj as any).nsa }).toArray(),
      db.collection("chokepoints").find({}, { projection: (proj as any).chokepoints }).toArray(),
      db.collection("conflicts").find({}, { projection: (proj as any).conflicts }).toArray(),
      db.collection("elections").find({}, { projection: (proj as any).elections }).toArray(),
      db.collection("tradeRoutes").find({}).toArray(),
      db.collection("ports").find({}, { projection: (proj as any).ports }).toArray(),
      db.collection("countryColors").find({}).toArray(),
    ]);

    const countryColors: Record<string, string> = {};
    for (const doc of colorDocs) {
      countryColors[doc._id as string] = doc.color;
    }

    return { countries, bases, nsa, chokepoints, conflicts, elections, tradeRoutes, ports, countryColors };
  }, 3600);

  return success(c, data, { freshness: new Date().toISOString(), cached: !!data._cached });
});
