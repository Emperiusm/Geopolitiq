// api/src/modules/graph/connections.ts — GET /connections/:id
import { Hono } from "hono";
import { readTx, isNeo4jConnected } from "../../infrastructure/neo4j";
import { cacheAside } from "../../infrastructure/cache";
import { success, notFound, apiError, validationError } from "../../helpers/response";
import type { AppVariables } from "../../types/auth";

export const connectionsRouter = new Hono<{ Variables: AppVariables }>();

connectionsRouter.get("/:id", async (c) => {
  if (!isNeo4jConnected()) {
    return apiError(c, "SERVICE_UNAVAILABLE", "Neo4j is not connected", 503);
  }

  const id = c.req.param("id");
  const depth = Math.min(Math.max(Number(c.req.query("depth")) || 2, 1), 4);
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 200, 1), 1000);
  const minConfidence = Number(c.req.query("minConfidence")) || 0;
  const types = c.req.query("types")?.split(",").filter(Boolean) ?? [];

  const start = performance.now();
  const cacheKey = `graph:connections:${id}:d${depth}:l${limit}:c${minConfidence}:t${types.join(",")}`;

  const data = await cacheAside(
    cacheKey,
    async () => {
      // Build WHERE clause fragments
      const whereFragments = [
        "NOT n:Claim",
        "NOT n:Alias",
        "NOT n:GraphEvent",
        "n <> e",
      ];
      if (minConfidence > 0) {
        whereFragments.push(
          "ALL(r IN relationships(path) WHERE r.confidence >= $minConfidence)",
        );
      }
      if (types.length > 0) {
        whereFragments.push("n.type IN $types");
      }

      const whereClause = whereFragments.join(" AND ");

      const result = await readTx(async (tx) => {
        const res = await tx.run(
          `MATCH (e:Entity {id: $id})
           MATCH path = (e)-[*1..${depth}]-(n:Entity)
           WHERE ${whereClause}
           WITH DISTINCT n, path
           LIMIT $limit
           RETURN n {.*} AS node,
                  [r IN relationships(path) | {
                    type: type(r),
                    props: r {.*},
                    startId: startNode(r).id,
                    endId: endNode(r).id
                  }] AS rels`,
          {
            id,
            minConfidence,
            types: types.length > 0 ? types : null,
            limit: Number(limit),
          },
        );
        return res.records.map((r) => ({
          node: r.get("node"),
          rels: r.get("rels"),
        }));
      });

      return { nodes: result, seed: id, depth };
    },
    30,
  );

  const queryTimeMs = Math.round(performance.now() - start);
  const truncated = data.nodes.length >= limit;

  return success(c, data, { queryTimeMs, truncated } as any);
});
