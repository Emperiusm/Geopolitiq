// api/src/modules/graph/stats.ts — GET /stats
import { Hono } from "hono";
import { readTx, isNeo4jConnected } from "../../infrastructure/neo4j";
import { cacheAside } from "../../infrastructure/cache";
import { success, apiError } from "../../helpers/response";
import type { AppVariables } from "../../types/auth";

export const statsRouter = new Hono<{ Variables: AppVariables }>();

statsRouter.get("/", async (c) => {
  if (!isNeo4jConnected()) {
    return apiError(c, "SERVICE_UNAVAILABLE", "Neo4j is not connected", 503);
  }

  const start = performance.now();

  const data = await cacheAside(
    "graph:stats",
    async () => {
      // Node counts by label
      const nodeCounts = await readTx(async (tx) => {
        const res = await tx.run(
          `CALL db.labels() YIELD label
           CALL {
             WITH label
             CALL db.stats.retrieve("GRAPH COUNTS") YIELD data
             RETURN data
           }
           RETURN label, count { (n) WHERE label IN labels(n) } AS count
           ORDER BY count DESC`,
        );
        // Fallback: simpler approach if the above doesn't work on all Neo4j versions
        return res.records.map((r) => ({
          label: r.get("label"),
          count: r.get("count"),
        }));
      }).catch(async () => {
        // Simpler fallback query
        return readTx(async (tx) => {
          const res = await tx.run(
            `CALL db.labels() YIELD label
             RETURN label`,
          );
          const labels = res.records.map((r) => r.get("label") as string);
          const counts: Array<{ label: string; count: number }> = [];
          for (const label of labels) {
            const countRes = await tx.run(
              `MATCH (n:\`${label}\`) RETURN count(n) AS count`,
            );
            counts.push({
              label,
              count: countRes.records[0]?.get("count")?.toNumber?.() ?? countRes.records[0]?.get("count") ?? 0,
            });
          }
          return counts;
        });
      });

      // Claim counts by topic and status
      const claimStats = await readTx(async (tx) => {
        const res = await tx.run(
          `MATCH ()-[r]->(c:Claim)
           RETURN type(r) AS relType, c.topic AS topic, count(*) AS count
           ORDER BY count DESC`,
        );
        return res.records.map((r) => ({
          relType: r.get("relType"),
          topic: r.get("topic"),
          count: r.get("count")?.toNumber?.() ?? r.get("count"),
        }));
      });

      // Edge counts by type
      const edgeCounts = await readTx(async (tx) => {
        const res = await tx.run(
          `CALL db.relationshipTypes() YIELD relationshipType AS type
           RETURN type`,
        );
        const types = res.records.map((r) => r.get("type") as string);
        const counts: Array<{ type: string; count: number }> = [];
        for (const type of types) {
          const countRes = await tx.run(
            `MATCH ()-[r:\`${type}\`]->() RETURN count(r) AS count`,
          );
          counts.push({
            type,
            count: countRes.records[0]?.get("count")?.toNumber?.() ?? countRes.records[0]?.get("count") ?? 0,
          });
        }
        return counts;
      });

      return { nodeCounts, claimStats, edgeCounts };
    },
    60, // stats change slowly, cache for 60s
  );

  const queryTimeMs = Math.round(performance.now() - start);

  return success(c, data, { queryTimeMs } as any);
});
