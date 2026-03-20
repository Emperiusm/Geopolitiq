// api/src/modules/graph/viewport.ts — GET /viewport?sw_lng=X&sw_lat=X&ne_lng=X&ne_lat=X
import { Hono } from "hono";
import { readTx, isNeo4jConnected } from "../../infrastructure/neo4j";
import { cacheAside } from "../../infrastructure/cache";
import { success, apiError, validationError } from "../../helpers/response";
import type { AppVariables } from "../../types/auth";

export const graphViewportRouter = new Hono<{ Variables: AppVariables }>();

graphViewportRouter.get("/", async (c) => {
  if (!isNeo4jConnected()) {
    return apiError(c, "SERVICE_UNAVAILABLE", "Neo4j is not connected", 503);
  }

  const swLng = Number(c.req.query("sw_lng"));
  const swLat = Number(c.req.query("sw_lat"));
  const neLng = Number(c.req.query("ne_lng"));
  const neLat = Number(c.req.query("ne_lat"));

  if ([swLng, swLat, neLng, neLat].some(Number.isNaN)) {
    return validationError(
      c,
      "All bounding box params required: sw_lng, sw_lat, ne_lng, ne_lat",
    );
  }

  const types = c.req.query("types")?.split(",").filter(Boolean) ?? [];
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 200, 1), 1000);
  const start = performance.now();

  // Round coords for cache key stability
  const rnd = (n: number) => Math.round(n * 100) / 100;
  const cacheKey = `graph:viewport:${rnd(swLng)}:${rnd(swLat)}:${rnd(neLng)}:${rnd(neLat)}:t${types.join(",")}:l${limit}`;

  const data = await cacheAside(
    cacheKey,
    async () => {
      const typeFilter = types.length > 0 ? "AND e.type IN $types" : "";

      return readTx(async (tx) => {
        const res = await tx.run(
          `MATCH (e:Entity)
           WHERE point.withinBBox(
             e.location,
             point({latitude: $swLat, longitude: $swLng}),
             point({latitude: $neLat, longitude: $neLng})
           )
           ${typeFilter}
           RETURN e {.*} AS entity
           LIMIT $limit`,
          {
            swLng,
            swLat,
            neLng,
            neLat,
            types: types.length > 0 ? types : null,
            limit: Number(limit),
          },
        );
        return res.records.map((r) => r.get("entity"));
      });
    },
    15, // shorter TTL for viewport queries — they vary with map panning
  );

  const queryTimeMs = Math.round(performance.now() - start);
  const truncated = data.length >= limit;

  return success(
    c,
    { entities: data, bbox: { swLng, swLat, neLng, neLat } },
    { queryTimeMs, truncated, total: data.length } as any,
  );
});
