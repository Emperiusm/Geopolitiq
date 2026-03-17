import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { apiKeyAuth } from "../../src/middleware/api-key";

describe("API key middleware", () => {
  it("allows requests in development without key", async () => {
    const app = new Hono();
    app.use("*", apiKeyAuth);
    app.get("/test", (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("rejects requests in production without key", async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.API_KEY = "secret-key";

    const app = new Hono();
    app.use("*", apiKeyAuth);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(401);

    const resOk = await app.request("/test", { headers: { "X-API-Key": "secret-key" } });
    expect(resOk.status).toBe(200);

    process.env.NODE_ENV = origEnv;
  });
});
