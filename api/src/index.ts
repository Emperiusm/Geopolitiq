// api/src/index.ts — updated to mount all routes
import { Hono } from "hono";
import { connectMongo } from "./infrastructure/mongo";
import { connectRedis } from "./infrastructure/redis";
import { healthRoutes } from "./infrastructure/health";
import { createCorsMiddleware } from "./middleware/cors";
import { requestId } from "./middleware/request-id";
import { rateLimit } from "./middleware/rate-limit";
import { cacheHeaders } from "./middleware/cache-headers";
import { compression } from "./middleware/compression";
import { requestLogger } from "./middleware/logger";
import { authenticate } from "./middleware/authenticate";
import { authRateLimit } from "./middleware/auth-rate-limit";
import { impersonation } from "./middleware/impersonation";
import { scopeCheck } from "./middleware/scope-check";
import { requirePlatformAdmin } from "./middleware/require-platform-admin";
import { ensureAuthIndexes } from "./infrastructure/indexes";

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
import { authRoutes } from "./modules/system/auth-routes";
import { apiKeyRoutes } from "./modules/system/api-key-routes";
import { teamRoutes } from "./modules/system/team-routes";
import { teamSettingsRoutes } from "./modules/system/team-settings-routes";
import { notificationRoutes } from "./modules/system/notification-routes";
import { adminRoutes } from "./modules/system/admin-routes";
import { startAccountCleanup } from "./modules/periodic/account-cleanup";
import { connectNeo4j, isNeo4jConnected, closeNeo4j } from "./infrastructure/neo4j";
import { checkOllama } from "./infrastructure/ollama";
import { closeAllQueues } from "./infrastructure/queue";
import { ensureNeo4jSchema } from "./seed/seed-neo4j-schema";
import { ensureAgentRegistered, NEWS_RSS_AGENT } from "./agents/registry";
import { startNewsWorker } from "./agents/news-rss/worker";
import type { AppVariables } from "./types/auth";

const app = new Hono<{ Variables: AppVariables }>();

// Global middleware (order matters)
// 1. CORS
app.use("*", createCorsMiddleware());
// 2. Request ID
app.use("*", requestId);
// 3. Logger
app.use("*", requestLogger);
// 4. Compression
app.use("*", compression);
// 5. Auth rate limit (auth endpoints only)
app.use("/api/v1/auth/*", authRateLimit);
// 6. Authenticate (all API routes)
app.use("/api/*", authenticate);
// 7. Post-auth log enrichment (inline)
app.use("/api/*", async (c, next) => {
  await next();
  // Enrich structured log output after authentication sets context
  const userId = c.get("userId") as string | undefined;
  const teamId = c.get("teamId") as string | undefined;
  const authMethod = c.get("authMethod") as string | undefined;
  if (userId) {
    c.set("logUserId", userId);
  }
  if (teamId) {
    c.set("logTeamId", teamId);
  }
  if (authMethod) {
    c.set("logAuthMethod", authMethod);
  }
});
// 8. Impersonation (all API routes)
app.use("/api/*", impersonation);
// 9. General rate limit (all API routes)
app.use("/api/*", rateLimit);
// 10. Scope check (all API routes)
app.use("/api/*", scopeCheck);
// 11. Cache headers (all API routes)
app.use("/api/*", cacheHeaders);

// Mount routes
const api = new Hono<{ Variables: AppVariables }>();
api.route("/health", healthRoutes);

// Auth routes
api.route("/auth", authRoutes);
api.route("/auth/keys", apiKeyRoutes);

// Team routes
api.route("/team", teamRoutes);
api.route("/team/settings", teamSettingsRoutes);

// Settings & notifications
api.route("/settings", settingsRoutes);
api.route("/settings", notificationRoutes);

// Admin (platform admin only)
api.route("/admin", adminRoutes);

// Reference data
api.route("/countries", countriesRouter);
api.route("/bases", basesRouter);
api.route("/nsa", nsaRouter);
api.route("/chokepoints", chokepointsRouter);
api.route("/elections", electionsRouter);
api.route("/trade-routes", tradeRoutesRouter);
api.route("/ports", portsRouter);
api.route("/conflicts", conflictsRouter);

// Realtime
api.route("/news", newsRouter);
api.route("/events", sseRouter);

// Aggregate
api.route("/bootstrap", bootstrapRouter);
api.route("/viewport", viewportRouter);
api.route("/search", searchRouter);
api.route("/compare", compareRouter);
api.route("/timeline", timelineRouter);
api.route("/graph", graphRouter);
api.route("/anomalies", anomaliesRouter);

// Binary layers
api.route("/layers", binaryLayersRouter);

// Platform admin only routes
const adminOnly = new Hono<{ Variables: AppVariables }>();
adminOnly.use("*", requirePlatformAdmin());
adminOnly.route("/seed", seedRoutes);
adminOnly.route("/plugins", pluginRoutes);
api.route("/", adminOnly);

app.route("/api/v1", api);

// Root
app.get("/", (c) => c.json({ message: "Gambit API", version: "0.2.0" }));

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
  console.log("[gambit] Routes: /api/v1/{auth,auth/keys,team,team/settings,settings,admin,countries,bases,nsa,chokepoints,elections,trade-routes,ports,conflicts,news,events/stream,bootstrap,viewport,search,compare,layers,seed,timeline,graph,anomalies}");

  // Create indexes, build NLP dictionary, start periodic tasks
  await ensureAuthIndexes();
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
  startAccountCleanup();

  // Neo4j + Ollama (non-fatal — warn on failure)
  let neo4jReady = false;
  try {
    await connectNeo4j();
    await ensureNeo4jSchema();
    neo4jReady = true;
    console.log("[gambit] Neo4j connected + schema ensured");
  } catch (err) {
    console.warn("[gambit] Neo4j unavailable (graph features disabled):", err);
  }

  try {
    await checkOllama();
  } catch (err) {
    console.warn("[gambit] Ollama unavailable (embeddings disabled):", err);
  }

  // Start news agent worker if Neo4j is connected and agent is enabled
  if (neo4jReady && process.env.AGENT_NEWS_ENABLED === "true") {
    try {
      await ensureAgentRegistered(NEWS_RSS_AGENT.id, NEWS_RSS_AGENT);
      startNewsWorker();
      console.log("[gambit] News agent worker started");
    } catch (err) {
      console.warn("[gambit] News agent startup failed:", err);
    }
  }
}

// Graceful shutdown
async function shutdown() {
  console.log("[gambit] Shutting down...");
  try { await closeAllQueues(); } catch {}
  try { await closeNeo4j(); } catch {}
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start();

export default { port, fetch: app.fetch };
export { app };
