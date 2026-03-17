import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { getRedis, isRedisConnected } from "../../infrastructure/redis";
import { success, validationError } from "../../helpers/response";

export const anomaliesRouter = new Hono();

function parseDuration(s: string): number {
  const match = s.match(/^(\d+)(h|d|m)$/);
  if (!match) return 24 * 3600000;
  const n = Number(match[1]);
  if (match[2] === "h") return n * 3600000;
  if (match[2] === "d") return n * 86400000;
  if (match[2] === "m") return n * 60000;
  return 24 * 3600000;
}

anomaliesRouter.get("/", async (c) => {
  const severities = c.req.query("severity")?.split(",") ?? ["watch", "alert", "critical"];
  const since = parseDuration(c.req.query("since") ?? "24h");

  const alerts = await getDb().collection("anomalies")
    .find({
      severity: { $in: severities },
      detectedAt: { $gte: new Date(Date.now() - since) },
    })
    .sort({ detectedAt: -1 })
    .limit(100)
    .toArray();

  return success(c, alerts, { total: alerts.length } as any);
});

anomaliesRouter.get("/baseline/:type/:id", async (c) => {
  const type = c.req.param("type");
  const id = c.req.param("id");

  if (!isRedisConnected()) {
    return success(c, []);
  }

  const counts = await getRedis().hgetall(`anomaly:counts:${type}:${id}`);
  const sorted = Object.entries(counts)
    .map(([hour, count]) => ({ hour: Number(hour), count: Number(count) }))
    .sort((a, b) => a.hour - b.hour);

  return success(c, sorted);
});
