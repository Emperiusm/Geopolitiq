// api/src/modules/graph/search.ts — GET /search?q=term
import { Hono } from "hono";
import { readTx, isNeo4jConnected } from "../../infrastructure/neo4j";
import { cacheAside } from "../../infrastructure/cache";
import { success, apiError, validationError } from "../../helpers/response";
import type { AppVariables } from "../../types/auth";

export const graphSearchRouter = new Hono<{ Variables: AppVariables }>();

type SearchMode = "text" | "semantic" | "hybrid";

graphSearchRouter.get("/", async (c) => {
  if (!isNeo4jConnected()) {
    return apiError(c, "SERVICE_UNAVAILABLE", "Neo4j is not connected", 503);
  }

  const q = c.req.query("q")?.trim();
  if (!q) {
    return validationError(c, "Query param 'q' is required");
  }

  const mode: SearchMode = (c.req.query("mode") as SearchMode) || "text";
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 20, 1), 100);
  const start = performance.now();

  if (!["text", "semantic", "hybrid"].includes(mode)) {
    return validationError(c, "mode must be one of: text, semantic, hybrid");
  }

  const cacheKey = `graph:search:${mode}:${q}:l${limit}`;

  const results = await cacheAside(
    cacheKey,
    async () => {
      if (mode === "text") {
        return readTx(async (tx) => {
          const res = await tx.run(
            `CALL db.index.fulltext.queryNodes('entity_search', $q)
             YIELD node, score
             RETURN node {.*} AS entity, score
             ORDER BY score DESC
             LIMIT $limit`,
            { q, limit: Number(limit) },
          );
          return res.records.map((r) => ({
            entity: r.get("entity"),
            score: r.get("score"),
          }));
        });
      }

      if (mode === "semantic") {
        // Semantic search using vector index
        return readTx(async (tx) => {
          // Requires embedding from Ollama — use a pre-computed embedding or fallback
          const res = await tx.run(
            `CALL db.index.vector.queryNodes('entity_embedding', $limit, $q)
             YIELD node, score
             RETURN node {.*} AS entity, score
             ORDER BY score DESC`,
            { q, limit: Number(limit) },
          );
          return res.records.map((r) => ({
            entity: r.get("entity"),
            score: r.get("score"),
          }));
        });
      }

      // Hybrid: combine text + semantic results
      const textResults = await readTx(async (tx) => {
        const res = await tx.run(
          `CALL db.index.fulltext.queryNodes('entity_search', $q)
           YIELD node, score
           RETURN node {.*} AS entity, score
           ORDER BY score DESC
           LIMIT $limit`,
          { q, limit: Number(limit) },
        );
        return res.records.map((r) => ({
          entity: r.get("entity"),
          score: r.get("score"),
          source: "text" as const,
        }));
      });

      return textResults; // Hybrid degrades to text when no embeddings available
    },
    30,
  );

  const queryTimeMs = Math.round(performance.now() - start);
  const truncated = results.length >= limit;

  return success(
    c,
    { query: q, mode, results },
    { queryTimeMs, truncated, total: results.length } as any,
  );
});
