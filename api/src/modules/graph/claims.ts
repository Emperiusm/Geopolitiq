// api/src/modules/graph/claims.ts — Claim endpoints
import { Hono } from "hono";
import { readTx, isNeo4jConnected } from "../../infrastructure/neo4j";
import { cacheAside } from "../../infrastructure/cache";
import { success, apiError } from "../../helpers/response";
import type { AppVariables } from "../../types/auth";

export const claimsRouter = new Hono<{ Variables: AppVariables }>();

// GET /claims/:entityId — all claims about an entity, ordered by extractedAt desc
claimsRouter.get("/:entityId", async (c) => {
  if (!isNeo4jConnected()) {
    return apiError(c, "SERVICE_UNAVAILABLE", "Neo4j is not connected", 503);
  }

  const entityId = c.req.param("entityId");
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 50, 1), 500);
  const start = performance.now();

  const claims = await cacheAside(
    `graph:claims:${entityId}:l${limit}`,
    async () => {
      return readTx(async (tx) => {
        const res = await tx.run(
          `MATCH (e:Entity {id: $entityId})-[r]->(c:Claim)
           RETURN c {.*} AS claim, type(r) AS relType, r {.*} AS relProps
           ORDER BY c.extractedAt DESC
           LIMIT $limit`,
          { entityId, limit: Number(limit) },
        );
        return res.records.map((r) => ({
          claim: r.get("claim"),
          relType: r.get("relType"),
          relProps: r.get("relProps"),
        }));
      });
    },
    30,
  );

  const queryTimeMs = Math.round(performance.now() - start);
  const truncated = claims.length >= limit;

  return success(c, { entityId, claims }, { queryTimeMs, truncated, total: claims.length } as any);
});

// GET /claims/:entityId/:topic — claim chain for one topic
claimsRouter.get("/:entityId/:topic", async (c) => {
  if (!isNeo4jConnected()) {
    return apiError(c, "SERVICE_UNAVAILABLE", "Neo4j is not connected", 503);
  }

  const entityId = c.req.param("entityId");
  const topic = c.req.param("topic");
  const start = performance.now();

  const chain = await cacheAside(
    `graph:claims:${entityId}:${topic}`,
    async () => {
      // Get active claim
      const active = await readTx(async (tx) => {
        const res = await tx.run(
          `MATCH (e:Entity {id: $entityId})-[r:CURRENT_BELIEF {topic: $topic}]->(c:Claim)
           RETURN c {.*} AS claim, r {.*} AS rel`,
          { entityId, topic },
        );
        return res.records.map((r) => ({
          claim: r.get("claim"),
          rel: r.get("rel"),
          status: "active" as const,
        }));
      });

      // Get superseded claims
      const superseded = await readTx(async (tx) => {
        const res = await tx.run(
          `MATCH (e:Entity {id: $entityId})-[r:SUPERSEDED_BELIEF {topic: $topic}]->(c:Claim)
           RETURN c {.*} AS claim, r {.*} AS rel
           ORDER BY c.extractedAt DESC`,
          { entityId, topic },
        );
        return res.records.map((r) => ({
          claim: r.get("claim"),
          rel: r.get("rel"),
          status: "superseded" as const,
        }));
      });

      // Get disputed claims
      const disputed = await readTx(async (tx) => {
        const res = await tx.run(
          `MATCH (e:Entity {id: $entityId})-[r:DISPUTED_BELIEF {topic: $topic}]->(c:Claim)
           RETURN c {.*} AS claim, r {.*} AS rel
           ORDER BY c.confidence DESC`,
          { entityId, topic },
        );
        return res.records.map((r) => ({
          claim: r.get("claim"),
          rel: r.get("rel"),
          status: "disputed" as const,
        }));
      });

      return { active, superseded, disputed };
    },
    30,
  );

  const queryTimeMs = Math.round(performance.now() - start);

  return success(c, { entityId, topic, chain }, { queryTimeMs } as any);
});
