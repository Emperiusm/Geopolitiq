// api/src/modules/realtime/sse.ts
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getRedis, isRedisConnected } from "../../infrastructure/redis";
import { getBufferedEvents, getChannel } from "../../infrastructure/sse";
import { verifyAccessToken } from "../../infrastructure/auth";

export const sseRouter = new Hono();

sseRouter.get("/stream", async (c) => {
  const token = c.req.query("token");
  let userId: string;
  let teamId: string;

  if (token) {
    try {
      const payload = await verifyAccessToken(token);
      userId = payload.userId;
      teamId = payload.teamId;
    } catch {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid token" } }, 401);
    }
  } else {
    userId = c.get("userId") as string;
    teamId = c.get("teamId") as string;
    if (!userId) {
      return c.json({ error: { code: "UNAUTHORIZED", message: "Token required" } }, 401);
    }
  }

  const lastEventId = c.req.header("last-event-id");

  return streamSSE(c, async (stream) => {
    if (lastEventId) {
      const missed = await getBufferedEvents(lastEventId);
      for (const evt of missed) {
        if (shouldSendEvent(evt, teamId)) {
          await stream.writeSSE({ id: evt.id, event: evt.event, data: evt.data });
        }
      }
    }

    if (!isRedisConnected()) {
      await stream.writeSSE({ event: "error", data: "Redis unavailable" });
      return;
    }

    const subscriber = getRedis().duplicate();
    await subscriber.subscribe(getChannel());

    const heartbeatMs = Number(process.env.SSE_HEARTBEAT_MS ?? 30000);
    const heartbeat = setInterval(async () => {
      try {
        await stream.writeSSE({ event: "heartbeat", data: "" });
      } catch {
        clearInterval(heartbeat);
      }
    }, heartbeatMs);

    // Periodic auth revalidation (every 5 minutes)
    const revalidateMs = 5 * 60 * 1000;
    const revalidate = setInterval(async () => {
      try {
        if (!isRedisConnected()) return;
        const { getDb } = await import("../../infrastructure/mongo");
        const user = await getDb().collection("users").findOne({ _id: userId });
        if (!user || user.deletedAt) {
          await stream.writeSSE({ event: "auth-expired", data: "Session invalidated" });
          clearInterval(heartbeat);
          clearInterval(revalidate);
          subscriber.unsubscribe();
          subscriber.quit();
        }
      } catch {
        // Fail open
      }
    }, revalidateMs);

    subscriber.on("message", async (_channel, message) => {
      try {
        const evt = JSON.parse(message);
        if (shouldSendEvent(evt, teamId)) {
          await stream.writeSSE({ id: evt.id, event: evt.event, data: JSON.stringify(evt.data) });
        }
      } catch {
        // ignore parse errors
      }
    });

    stream.onAbort(() => {
      clearInterval(heartbeat);
      clearInterval(revalidate);
      subscriber.unsubscribe();
      subscriber.quit();
    });

    await new Promise(() => {});
  });
});

function shouldSendEvent(evt: any, teamId: string): boolean {
  if (evt.teamId && evt.teamId !== teamId) return false;
  return true;
}
