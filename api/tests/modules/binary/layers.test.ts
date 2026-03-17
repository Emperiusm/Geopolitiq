// api/tests/modules/binary/layers.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { invalidateCache } from "../../../src/infrastructure/cache";
import { seedAll } from "../../../src/seed/seed-all";
import { binaryLayersRouter } from "../../../src/modules/binary/layers";

describe("Binary layers API", () => {
  const app = new Hono().route("/layers", binaryLayersRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await invalidateCache("gambit:binary:*");
    await seedAll();
  }, 30000);

  afterAll(async () => {
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /layers/bases/binary returns octet-stream", async () => {
    const res = await app.request("/layers/bases/binary");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(8);
    const view = new DataView(buf);
    const count = view.getUint32(0, true);
    const stride = view.getUint32(4, true);
    expect(count).toBeGreaterThan(0);
    expect(stride).toBe(5); // bases stride: lng, lat, R, G, B
  });

  it("GET /layers/chokepoints/binary returns correct stride", async () => {
    const res = await app.request("/layers/chokepoints/binary");
    expect(res.status).toBe(200);
    const buf = await res.arrayBuffer();
    const view = new DataView(buf);
    const stride = view.getUint32(4, true);
    expect(stride).toBe(4); // chokepoints stride: lng, lat, status, type
  });

  it("GET /layers/conflicts/binary returns data", async () => {
    const res = await app.request("/layers/conflicts/binary");
    expect(res.status).toBe(200);
    const buf = await res.arrayBuffer();
    const view = new DataView(buf);
    const count = view.getUint32(0, true);
    expect(count).toBeGreaterThan(0);
  });

  it("GET /layers/nonexistent/binary returns 404", async () => {
    const res = await app.request("/layers/nonexistent/binary");
    expect(res.status).toBe(404);
  });
});
