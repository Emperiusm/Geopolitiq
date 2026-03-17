import { Hono } from "hono";
import { connectMongo } from "./infrastructure/mongo";
import { connectRedis } from "./infrastructure/redis";
import { healthRoutes } from "./infrastructure/health";
import { createCorsMiddleware } from "./middleware/cors";
import { requestId } from "./middleware/request-id";

const app = new Hono();

// Global middleware
app.use("*", createCorsMiddleware());
app.use("*", requestId);

// Mount routes
app.route("/api/v1/health", healthRoutes);

// Root redirect
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
}

start();

export default {
  port,
  fetch: app.fetch,
};

export { app };
