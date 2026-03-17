import { Hono } from "hono";
import { getDb } from "./mongo";
import { isRedisConnected, getRedis } from "./redis";

export const healthRoutes = new Hono();

const startTime = Date.now();

healthRoutes.get("/", (c) => {
  return c.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

healthRoutes.get("/ready", async (c) => {
  let mongoOk = false;
  let redisOk = false;

  try {
    const db = getDb();
    const result = await db.command({ ping: 1 });
    mongoOk = result.ok === 1;
  } catch {
    mongoOk = false;
  }

  try {
    if (isRedisConnected()) {
      const redis = getRedis();
      const pong = await redis.ping();
      redisOk = pong === "PONG";
    }
  } catch {
    redisOk = false;
  }

  const allHealthy = mongoOk && redisOk;
  const status = allHealthy ? 200 : 503;

  return c.json({
    status: allHealthy ? "ready" : "degraded",
    mongo: mongoOk ? "connected" : "disconnected",
    redis: redisOk ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  }, status);
});
