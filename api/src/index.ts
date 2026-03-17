// api/src/index.ts — updated to mount all routes
import { Hono } from "hono";
import { connectMongo } from "./infrastructure/mongo";
import { connectRedis } from "./infrastructure/redis";
import { healthRoutes } from "./infrastructure/health";
import { createCorsMiddleware } from "./middleware/cors";
import { requestId } from "./middleware/request-id";
import { apiKeyAuth } from "./middleware/api-key";
import { rateLimit } from "./middleware/rate-limit";
import { cacheHeaders } from "./middleware/cache-headers";
import { compression } from "./middleware/compression";
import { requestLogger } from "./middleware/logger";

// Module routers
import { countriesRouter } from "./modules/reference/countries";
import { basesRouter } from "./modules/reference/bases";
import { nsaRouter } from "./modules/reference/nsa";
import { chokepointsRouter } from "./modules/reference/chokepoints";
import { electionsRouter } from "./modules/reference/elections";
import { tradeRoutesRouter } from "./modules/reference/trade-routes";
import { portsRouter } from "./modules/reference/ports";
import { conflictsRouter } from "./modules/reference/conflicts";
import { newsRouter } from "./modules/realtime/news";
import { sseRouter } from "./modules/realtime/sse";
import { bootstrapRouter } from "./modules/aggregate/bootstrap";
import { viewportRouter } from "./modules/aggregate/viewport";
import { searchRouter } from "./modules/aggregate/search";
import { compareRouter } from "./modules/aggregate/compare";
import { binaryLayersRouter } from "./modules/binary/layers";
import { seedRoutes } from "./modules/system/seed-routes";
import { timelineRouter } from "./modules/aggregate/timeline";
import { graphRouter } from "./modules/aggregate/graph";
import { startConflictCounter } from "./modules/periodic/conflict-counter";
import { ensureSnapshotIndexes } from "./infrastructure/snapshots";
import { buildEntityDictionary } from "./infrastructure/entity-dictionary";
import { rebuildGraph } from "./infrastructure/graph";
import { startNewsAggregator } from "./modules/periodic/news-aggregator";
import { settingsRoutes } from "./modules/system/settings-routes";
import { mountPlugins } from "./infrastructure/plugin-registry";
import { pluginRoutes } from "./modules/system/plugin-routes";
import { anomaliesRouter } from "./modules/aggregate/anomalies";
import { startAnomalyCleanup } from "./modules/periodic/anomaly-cleanup";

const app = new Hono();

// Global middleware (order matters)
app.use("*", createCorsMiddleware());
app.use("*", requestId);
app.use("*", requestLogger);
app.use("*", compression);
app.use("/api/*", apiKeyAuth);
app.use("/api/*", rateLimit);
app.use("/api/*", cacheHeaders);

// Mount routes
const api = new Hono();
api.route("/health", healthRoutes);
api.route("/countries", countriesRouter);
api.route("/bases", basesRouter);
api.route("/nsa", nsaRouter);
api.route("/chokepoints", chokepointsRouter);
api.route("/elections", electionsRouter);
api.route("/trade-routes", tradeRoutesRouter);
api.route("/ports", portsRouter);
api.route("/conflicts", conflictsRouter);
api.route("/news", newsRouter);
api.route("/events", sseRouter);
api.route("/bootstrap", bootstrapRouter);
api.route("/viewport", viewportRouter);
api.route("/search", searchRouter);
api.route("/compare", compareRouter);
api.route("/layers", binaryLayersRouter);
api.route("/seed", seedRoutes);
api.route("/timeline", timelineRouter);
api.route("/graph", graphRouter);
api.route("/settings", settingsRoutes);
api.route("/plugins", pluginRoutes);
api.route("/anomalies", anomaliesRouter);

app.route("/api/v1", api);

// Root
app.get("/", (c) => c.json({ message: "Gambit API", version: "0.1.0" }));

// Startup
const port = Number(process.env.PORT ?? 3000);

async function start() {
  console.log("[gambit] Starting API...");

  try {
    await connectMongo();
    console.log("[gambit] MongoDB connected");
  } catch (err) {
    console.error("[gambit] MongoDB connection failed:", err);
    process.exit(1);
  }

  try {
    await connectRedis();
    console.log("[gambit] Redis connected");
  } catch (err) {
    console.warn("[gambit] Redis connection failed (cache disabled):", err);
  }

  console.log(`[gambit] API listening on http://localhost:${port}`);
  console.log("[gambit] Routes: /api/v1/{countries,bases,nsa,chokepoints,elections,trade-routes,ports,conflicts,news,events/stream,bootstrap,viewport,search,compare,layers,seed,timeline}");

  // Create indexes, build NLP dictionary, start periodic tasks
  await ensureSnapshotIndexes();
  const dictSize = await buildEntityDictionary();
  console.log(`[gambit] Entity dictionary built (${dictSize} patterns)`);
  const edgeCount = await rebuildGraph();
  console.log(`[gambit] Graph built (${edgeCount} edges)`);
  const pluginCount = await mountPlugins();
  if (pluginCount > 0) console.log(`[gambit] ${pluginCount} plugins mounted`);
  startConflictCounter();
  startAnomalyCleanup();
  startNewsAggregator();
}

start();

export default { port, fetch: app.fetch };
export { app };
