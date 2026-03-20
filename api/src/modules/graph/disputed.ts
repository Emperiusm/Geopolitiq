// api/src/modules/graph/disputed.ts — GET /disputed
import { Hono } from "hono";
import { readTx, isNeo4jConnected } from "../../infrastructure/neo4j";
import { cacheAside } from "../../infrastructure/cache";
import { success, apiError } from "../../helpers/response";
import type { AppVariables } from "../../types/auth";

export const disputedRouter = new Hono<{ Variables: AppVariables }>();

disputedRouter.get("/", async (c) => {
  if (!isNeo4jConnected()) {
    return apiError(c, "SERVICE_UNAVAILABLE", "Neo4j is not connected", 503);
  }

  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 50, 1), 500);
  const start = performance.now();

  const data = await cacheAside(
    `graph:disputed:l${limit}`,
    async () => {
      return readTx(async (tx) => {
        const res = await tx.run(
          `MATCH (e:Entity)-[r:DISPUTED_BELIEF]->(c:Claim)
           RETURN e {.*} AS entity, c {.*} AS claim, r {.*} AS rel
           ORDER BY c.confidence DESC
           LIMIT $limit`,
          { limit: Number(limit) },
        );
        return res.records.map((r) => ({
          entity: r.get("entity"),
          claim: r.get("claim"),
          rel: r.get("rel"),
        }));
      });
    },
    30,
  );

  const queryTimeMs = Math.round(performance.now() - start);
  const truncated = data.length >= limit;

  return success(c, { disputed: data }, { queryTimeMs, truncated, total: data.length } as any);
});
