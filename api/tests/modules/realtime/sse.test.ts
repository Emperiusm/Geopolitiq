// api/tests/modules/realtime/sse.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { publishEvent, getBufferedEvents } from "../../../src/infrastructure/sse";

describe("SSE Infrastructure", () => {
  beforeAll(async () => {
    await connectRedis("redis://localhost:6380");
  });

  afterAll(async () => {
    await disconnectRedis();
  });

  it("publishEvent stores events in buffer", async () => {
    await publishEvent("test-event", { message: "hello" });
    const events = await getBufferedEvents();
    expect(events.length).toBeGreaterThan(0);
    const last = events[events.length - 1];
    expect(last.event).toBe("test-event");
  });

  it("getBufferedEvents returns events after given ID", async () => {
    await publishEvent("evt-a", { a: 1 });
    await publishEvent("evt-b", { b: 2 });
    const allEvents = await getBufferedEvents();
    const firstId = allEvents[0].id;
    const afterFirst = await getBufferedEvents(firstId);
    expect(afterFirst.length).toBe(allEvents.length - 1);
  });
});
