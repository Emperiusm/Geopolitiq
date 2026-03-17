import { getRedis, isRedisConnected } from "../../infrastructure/redis";

let interval: ReturnType<typeof setInterval> | null = null;

async function cleanup(): Promise<void> {
  if (!isRedisConnected()) return;

  try {
    const redis = getRedis();
    const cutoff = String(Date.now() - 7 * 24 * 3600000);

    let cursor = "0";
    let cleaned = 0;
    do {
      const [next, keys] = await redis.scan(
        cursor, "MATCH", "anomaly:counts:*", "COUNT", 100,
      );
      cursor = next;

      for (const key of keys) {
        const fields = await redis.hkeys(key);
        const toDelete = fields.filter((f) => f < cutoff);
        if (toDelete.length > 0) {
          await redis.hdel(key, ...toDelete);
          cleaned += toDelete.length;
        }
        const remaining = await redis.hlen(key);
        if (remaining === 0) await redis.del(key);
      }
    } while (cursor !== "0");

    if (cleaned > 0) {
      console.log(`[periodic] Anomaly cleanup: removed ${cleaned} old hour buckets`);
    }
  } catch (err) {
    console.error("[periodic] Anomaly cleanup error:", err);
  }
}

export function startAnomalyCleanup(): void {
  // Run every 6 hours
  interval = setInterval(cleanup, 6 * 3600000);
  console.log("[periodic] Anomaly cleanup started (every 6 hours)");
}

export function stopAnomalyCleanup(): void {
  if (interval) clearInterval(interval);
  interval = null;
}
