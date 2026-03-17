import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { authRateLimit } from "../../src/middleware/auth-rate-limit";

describe("auth rate limit middleware", () => {
  it("allows requests under the limit", async () => {
    const app = new Hono();
    app.use("*", authRateLimit);
    app.get("/auth/test", (c) => c.json({ ok: true }));

    const res = await app.request("/auth/test");
    expect(res.status).toBe(200);
  });

  it("returns 429 after exceeding 10 requests", async () => {
    const app = new Hono();
    app.use("*", authRateLimit);
    app.get("/auth/test", (c) => c.json({ ok: true }));

    for (let i = 0; i < 10; i++) {
      await app.request("/auth/test");
    }
    const res = await app.request("/auth/test");
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.action).toBe("none");
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
