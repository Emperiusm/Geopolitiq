// api/src/modules/reference/trade-routes.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, buildMongoFilter } from "../../helpers/query";
import { success, paginated, notFound } from "../../helpers/response";

export const tradeRoutesRouter = new Hono();
const CACHE_TTL = 3600;

/** Look up ports and chokepoints to build resolved segments with coordinates */
async function resolveRoute(route: any): Promise<any> {
  const db = getDb();
  const [fromPort, toPort, waypointDocs] = await Promise.all([
    db.collection("ports").findOne({ _id: route.from }),
    db.collection("ports").findOne({ _id: route.to }),
    route.waypoints?.length
      ? db.collection("chokepoints").find({ _id: { $in: route.waypoints } }).toArray()
      : Promise.resolve([]),
  ]);

  const waypointMap = new Map(waypointDocs.map((w: any) => [w._id, w]));
  const orderedWaypoints = (route.waypoints ?? [])
    .map((id: string) => waypointMap.get(id))
    .filter(Boolean)
    .map((w: any) => ({ _id: w._id, name: w.name, lat: w.lat, lng: w.lng, status: w.status }));

  return {
    ...route,
    resolved: {
      from: fromPort ? { _id: fromPort._id, name: fromPort.name, lat: fromPort.lat, lng: fromPort.lng } : null,
      to: toPort ? { _id: toPort._id, name: toPort.name, lat: toPort.lat, lng: toPort.lng } : null,
      waypoints: orderedWaypoints,
    },
  };
}

tradeRoutesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const resolve = c.req.query("resolve") === "true";
  const cacheKey = `gambit:trade-routes:${id}:${resolve}`;

  const data = await cacheAside(cacheKey, async () => {
    const route = await getDb().collection("tradeRoutes").findOne({ _id: id });
    if (!route) return null;
    return resolve ? resolveRoute(route) : route;
  }, CACHE_TTL);

  if (!data) return notFound(c, "Trade route", id);
  return success(c, data);
});

tradeRoutesRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, filters } = parseListParams(searchParams);
  const mongoFilter = buildMongoFilter(filters);
  const resolve = searchParams.get("resolve") === "true";

  const cacheKey = `gambit:trade-routes:all:${JSON.stringify({ filters, limit, offset, resolve })}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("tradeRoutes");
    const [routes, total] = await Promise.all([
      col.find(mongoFilter).skip(offset).limit(limit).toArray(),
      col.countDocuments(mongoFilter),
    ]);
    const data = resolve ? await Promise.all(routes.map(resolveRoute)) : routes;
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
