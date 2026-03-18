import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import type { AppVariables } from "../../src/types/auth";
import { rateLimit } from "../../src/middleware/rate-limit";

describe("Rate limit middleware", () => {
  it("allows requests under the rate limit (no auth = 100 RPM default)", async () => {
    const ip = `192.0.2.${Math.floor(Math.random() * 200)}`;
    const app = new Hono<{ Variables: AppVariables }>();
    app.use("*", rateLimit);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test", { headers: { "x-forwarded-for": ip } });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("100");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("99");
    expect(res.headers.get("X-RateLimit-Reset")).toBeTruthy();
  });

  it("uses role-based limits when auth context is set", async () => {
    const app = new Hono<{ Variables: AppVariables }>();
    app.use("*", async (c, next) => {
      c.set("userId", "test-viewer");
      c.set("role", "viewer");
      await next();
    });
    app.use("*", rateLimit);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(200);
    // Viewer limit is 50
    expect(res.headers.get("X-RateLimit-Limit")).toBe("50");
  });

  it("uses owner limit of 1000", async () => {
    const app = new Hono<{ Variables: AppVariables }>();
    app.use("*", async (c, next) => {
      c.set("userId", "test-owner");
      c.set("role", "owner");
      await next();
    });
    app.use("*", rateLimit);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("1000");
  });

  it("returns 429 with action field when rate limited", async () => {
    const app = new Hono<{ Variables: AppVariables }>();
    // Set viewer role (50 RPM) and a unique userId
    const uid = `rate-limit-test-${Date.now()}`;
    app.use("*", async (c, next) => {
      c.set("userId", uid);
      c.set("role", "viewer");
      await next();
    });
    app.use("*", rateLimit);
    app.get("/test", (c) => c.json({ ok: true }));

    // Exhaust 50 requests
    for (let i = 0; i < 50; i++) {
      await app.request("/test");
    }

    const res = await app.request("/test");
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.action).toBe("none");
    expect(res.headers.get("Retry-After")).toBeTruthy();
  });
});
