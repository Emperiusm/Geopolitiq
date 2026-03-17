// api/src/modules/aggregate/bootstrap.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { getSnapshotAt } from "../../infrastructure/snapshots";
import { success, validationError } from "../../helpers/response";
import type { TemporalSnapshot } from "../../types";

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

async function fetchBootstrapData(db: any, slim: boolean) {
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
}

/** Overlay snapshot mutable fields onto current bootstrap data */
function applySnapshot(
  data: Awaited<ReturnType<typeof fetchBootstrapData>>,
  snapshot: TemporalSnapshot,
) {
  const conflictMap = new Map(snapshot.conflicts.map((c) => [c._id, c]));
  const chokepointMap = new Map(snapshot.chokepoints.map((c) => [c._id, c]));
  const countryMap = new Map(snapshot.countries.map((c) => [c._id, c]));
  const nsaMap = new Map(snapshot.nsa.map((n) => [n._id, n]));

  data.conflicts = data.conflicts.map((doc: any) => {
    const snap = conflictMap.get(doc._id);
    return snap ? { ...doc, status: snap.status, dayCount: snap.dayCount, casualties: snap.casualties } : doc;
  });

  data.chokepoints = data.chokepoints.map((doc: any) => {
    const snap = chokepointMap.get(doc._id);
    return snap ? { ...doc, status: snap.status } : doc;
  });

  data.countries = data.countries.map((doc: any) => {
    const snap = countryMap.get(doc._id);
    return snap ? { ...doc, risk: snap.risk, leader: snap.leader, tags: snap.tags } : doc;
  });

  data.nsa = data.nsa.map((doc: any) => {
    const snap = nsaMap.get(doc._id);
    return snap ? { ...doc, status: snap.status, zones: snap.zones } : doc;
  });

  return data;
}

bootstrapRouter.get("/", async (c) => {
  const slim = c.req.query("slim") === "true";
  const at = c.req.query("at");

  // Temporal bootstrap — merge snapshot over current static data
  if (at) {
    const atDate = new Date(at);
    if (isNaN(atDate.getTime())) return validationError(c, "at must be valid ISO 8601");

    const snapshot = await getSnapshotAt(atDate);
    if (!snapshot) return validationError(c, "No snapshots available before requested time");

    const db = getDb();
    const data = await fetchBootstrapData(db, slim);
    applySnapshot(data, snapshot);

    return success(c, data, {
      freshness: snapshot.timestamp.toISOString(),
      at,
      snapshotAt: snapshot.timestamp.toISOString(),
    } as any);
  }

  // Standard bootstrap — cached
  const cacheKey = slim ? "gambit:bootstrap:slim" : "gambit:bootstrap:full";

  const data = await cacheAside(cacheKey, async () => {
    const db = getDb();
    return fetchBootstrapData(db, slim);
  }, 3600);

  return success(c, data, { freshness: new Date().toISOString(), cached: !!data._cached });
});
