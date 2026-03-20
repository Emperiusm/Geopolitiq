// api/src/modules/graph/entity.ts — GET /entity/:id
import { Hono } from "hono";
import { readTx, isNeo4jConnected } from "../../infrastructure/neo4j";
import { cacheAside } from "../../infrastructure/cache";
import { success, notFound, apiError } from "../../helpers/response";
import type { AppVariables } from "../../types/auth";

export const entityRouter = new Hono<{ Variables: AppVariables }>();

entityRouter.get("/:id", async (c) => {
  if (!isNeo4jConnected()) {
    return apiError(c, "SERVICE_UNAVAILABLE", "Neo4j is not connected", 503);
  }

  const id = c.req.param("id");
  const start = performance.now();

  const data = await cacheAside(
    `graph:entity:${id}`,
    async () => {
      // 1. Get entity
      const entity = await readTx(async (tx) => {
        const res = await tx.run(
          `MATCH (e:Entity {id: $id}) RETURN e {.*} AS entity`,
          { id },
        );
        return res.records.length > 0
          ? res.records[0].get("entity")
          : null;
      });

      if (!entity) return null;

      // 2. Get current beliefs
      const beliefs = await readTx(async (tx) => {
        const res = await tx.run(
          `MATCH (e:Entity {id: $id})-[r:CURRENT_BELIEF]->(c:Claim)
           RETURN r.topic AS topic, c {.*} AS claim`,
          { id },
        );
        return res.records.map((r) => ({
          topic: r.get("topic"),
          claim: r.get("claim"),
        }));
      });

      // 3. Get 1-hop neighbors
      const neighbors = await readTx(async (tx) => {
        const res = await tx.run(
          `MATCH (e:Entity {id: $id})-[r]-(n:Entity)
           WHERE NOT n:Claim AND NOT n:Alias AND NOT n:GraphEvent
           RETURN n {.*} AS node, type(r) AS rel, r {.*} AS props,
                  startNode(r) = e AS outgoing
           LIMIT 200`,
          { id },
        );
        return res.records.map((r) => ({
          node: r.get("node"),
          rel: r.get("rel"),
          props: r.get("props"),
          outgoing: r.get("outgoing"),
        }));
      });

      return { entity, beliefs, neighbors };
    },
    30,
  );

  const queryTimeMs = Math.round(performance.now() - start);

  if (!data || data.entity === null) {
    return notFound(c, "Entity", id);
  }

  return success(c, data, { queryTimeMs } as any);
});
