// api/src/modules/aggregate/viewport.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { success, validationError } from "../../helpers/response";

export const viewportRouter = new Hono();

viewportRouter.get("/", async (c) => {
  const bbox = c.req.query("bbox");
  const layers = c.req.query("layers")?.split(",") ?? [];

  if (!bbox) return validationError(c, "bbox is required (sw_lng,sw_lat,ne_lng,ne_lat)");

  const [swLng, swLat, neLng, neLat] = bbox.split(",").map(Number);
  if ([swLng, swLat, neLng, neLat].some(isNaN)) {
    return validationError(c, "bbox must be 4 comma-separated numbers");
  }

  const geoFilter = {
    location: {
      $geoWithin: {
        $box: [[swLng, swLat], [neLng, neLat]],
      },
    },
  };

  const db = getDb();
  const data: Record<string, any[]> = {};
  let total = 0;

  const queries = [];
  if (layers.includes("bases")) queries.push(db.collection("bases").find(geoFilter).toArray().then(r => { data.bases = r; total += r.length; }));
  if (layers.includes("nsa")) queries.push(db.collection("nonStateActors").find({}).toArray().then(r => { data.nsa = r; total += r.length; }));
  if (layers.includes("chokepoints")) queries.push(db.collection("chokepoints").find(geoFilter).toArray().then(r => { data.chokepoints = r; total += r.length; }));

  await Promise.all(queries);

  return success(c, data, { bbox: [swLng, swLat, neLng, neLat] as any, total });
});
