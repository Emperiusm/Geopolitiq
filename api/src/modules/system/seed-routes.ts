import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { seedAll } from "../../seed/seed-all";
import { buildEntityDictionary } from "../../infrastructure/entity-dictionary";
import { rebuildGraph } from "../../infrastructure/graph";
import { apiError, success } from "../../helpers/response";

export const seedRoutes = new Hono();

seedRoutes.post("/run", async (c) => {
  if (process.env.NODE_ENV === "production") {
    return apiError(c, "UNAUTHORIZED", "Seed endpoint disabled in production", 403);
  }
  try {
    const results = await seedAll();
    await buildEntityDictionary();
    await rebuildGraph();
    return success(c, results);
  } catch (err: any) {
    return apiError(c, "INTERNAL_ERROR", err.message ?? "Seed failed", 500);
  }
});

seedRoutes.get("/status", async (c) => {
  const db = getDb();
  const collections = ["countries", "bases", "nonStateActors", "chokepoints",
    "elections", "tradeRoutes", "ports", "conflicts", "news", "countryColors"];

  const status: Record<string, { count: number; lastUpdated: string | null }> = {};
  for (const name of collections) {
    const col = db.collection(name);
    const count = await col.countDocuments();
    const latest = await col.findOne({}, { sort: { updatedAt: -1 }, projection: { updatedAt: 1 } });
    status[name] = {
      count,
      lastUpdated: latest?.updatedAt?.toISOString() ?? null,
    };
  }

  return success(c, status);
});
