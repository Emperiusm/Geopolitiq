// api/src/modules/graph/paths.ts — GET /paths?from=X&to=Y
import { Hono } from "hono";
import { readTx, isNeo4jConnected } from "../../infrastructure/neo4j";
import { cacheAside } from "../../infrastructure/cache";
import { success, apiError, validationError } from "../../helpers/response";
import type { AppVariables } from "../../types/auth";

export const pathsRouter = new Hono<{ Variables: AppVariables }>();

// GET /paths?from=X&to=Y&maxHops=4&minConfidence=0.7
pathsRouter.get("/", async (c) => {
  if (!isNeo4jConnected()) {
    return apiError(c, "SERVICE_UNAVAILABLE", "Neo4j is not connected", 503);
  }

  const from = c.req.query("from");
  const to = c.req.query("to");

  if (!from || !to) {
    return validationError(c, "Both 'from' and 'to' query params are required");
  }

  const maxHops = Math.min(Math.max(Number(c.req.query("maxHops")) || 4, 1), 6);
  const minConfidence = Number(c.req.query("minConfidence")) || 0;
  const start = performance.now();

  const cacheKey = `graph:paths:${from}:${to}:h${maxHops}:c${minConfidence}`;

  const data = await cacheAside(
    cacheKey,
    async () => {
      // Build optional WHERE for confidence filtering
      const whereClause =
        minConfidence > 0
          ? `WHERE ALL(r IN relationships(path) WHERE r.confidence >= $minConfidence)`
          : "";

      return readTx(async (tx) => {
        const res = await tx.run(
          `MATCH (a:Entity {id: $from}), (b:Entity {id: $to})
           MATCH path = shortestPath((a)-[*..${maxHops}]-(b))
           ${whereClause}
           RETURN [n IN nodes(path) | n {.*}] AS nodes,
                  [r IN relationships(path) | {
                    type: type(r),
                    props: r {.*},
                    startId: startNode(r).id,
                    endId: endNode(r).id
                  }] AS edges,
                  length(path) AS hops`,
          { from, to, minConfidence },
        );

        if (res.records.length === 0) {
          return { found: false, nodes: [], edges: [], hops: -1 };
        }

        const record = res.records[0];
        return {
          found: true,
          nodes: record.get("nodes"),
          edges: record.get("edges"),
          hops: record.get("hops"),
        };
      });
    },
    30,
  );

  const queryTimeMs = Math.round(performance.now() - start);

  return success(c, { from, to, ...data }, { queryTimeMs } as any);
});
