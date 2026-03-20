// api/src/infrastructure/sse.ts
import { getRedis, isRedisConnected } from "./redis";

const CHANNEL = "gambit:events:new";
const BUFFER_KEY = "gambit:events:buffer";
const MAX_BUFFER = Number(process.env.SSE_BUFFER_SIZE ?? 1000);

let eventCounter = 0;

export interface SSEEvent {
  id: string;
  event: string;
  data: string;
}

export async function publishEvent(event: string, data: any): Promise<void> {
  if (!isRedisConnected()) return;
  const redis = getRedis();
  const id = String(++eventCounter);
  const payload = JSON.stringify({ id, event, data });

  await redis.publish(CHANNEL, payload);
  await redis.lpush(BUFFER_KEY, payload);
  await redis.ltrim(BUFFER_KEY, 0, MAX_BUFFER - 1);
}

export async function getBufferedEvents(afterId?: string): Promise<SSEEvent[]> {
  if (!isRedisConnected()) return [];
  const redis = getRedis();
  const raw = await redis.lrange(BUFFER_KEY, 0, MAX_BUFFER - 1);

  const events = raw.map((r) => JSON.parse(r)).reverse(); // oldest first

  if (afterId) {
    const idx = events.findIndex((e) => e.id === afterId);
    if (idx >= 0) return events.slice(idx + 1);
    // afterId not found in buffer — client's cursor is too old
    return [
      {
        id: "0",
        event: "state:stale",
        data: JSON.stringify({ reason: "Events older than buffer" }),
      },
      ...events,
    ];
  }

  return events;
}

export function getChannel(): string {
  return CHANNEL;
}
