// api/src/modules/realtime/sse.ts
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getRedis, isRedisConnected } from "../../infrastructure/redis";
import { getBufferedEvents, getChannel } from "../../infrastructure/sse";

export const sseRouter = new Hono();

sseRouter.get("/stream", async (c) => {
  const lastEventId = c.req.header("last-event-id");

  return streamSSE(c, async (stream) => {
    // Replay missed events if reconnecting
    if (lastEventId) {
      const missed = await getBufferedEvents(lastEventId);
      for (const evt of missed) {
        await stream.writeSSE({ id: evt.id, event: evt.event, data: evt.data });
      }
    }

    // Subscribe to new events via Redis pub/sub
    if (!isRedisConnected()) {
      await stream.writeSSE({ event: "error", data: "Redis unavailable" });
      return;
    }

    const subscriber = getRedis().duplicate();
    await subscriber.subscribe(getChannel());

    // Heartbeat
    const heartbeatMs = Number(process.env.SSE_HEARTBEAT_MS ?? 30000);
    const heartbeat = setInterval(async () => {
      try {
        await stream.writeSSE({ event: "heartbeat", data: "" });
      } catch {
        clearInterval(heartbeat);
      }
    }, heartbeatMs);

    subscriber.on("message", async (_channel, message) => {
      try {
        const evt = JSON.parse(message);
        await stream.writeSSE({ id: evt.id, event: evt.event, data: JSON.stringify(evt.data) });
      } catch {
        // ignore parse errors
      }
    });

    // Cleanup on disconnect
    stream.onAbort(() => {
      clearInterval(heartbeat);
      subscriber.unsubscribe();
      subscriber.quit();
    });

    // Keep stream alive until client disconnects
    await new Promise(() => {}); // never resolves — stream stays open
  });
});
