import { describe, it, expect, beforeEach } from "bun:test";
import { Hono } from "hono";
import { rateLimit } from "../../src/middleware/rate-limit";

describe("Rate limit middleware", () => {
  // Use a unique IP per test run to avoid cross-test state pollution
  const makeApp = (ip: string) => {
    const app = new Hono();
    app.use("*", rateLimit);
    app.get("/test", (c) => c.json({ ok: true }));
    return { app, ip };
  };

  it("allows requests under the rate limit", async () => {
    const origRpm = process.env.RATE_LIMIT_RPM;
    process.env.RATE_LIMIT_RPM = "2";

    const { app, ip } = makeApp(`192.0.2.${Math.floor(Math.random() * 200)}`);

    const res = await app.request("/test", { headers: { "x-forwarded-for": ip } });
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("1");

    process.env.RATE_LIMIT_RPM = origRpm;
  });

  it("blocks requests over the rate limit", async () => {
    const origRpm = process.env.RATE_LIMIT_RPM;
    process.env.RATE_LIMIT_RPM = "2";

    const ip = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
    const { app } = makeApp(ip);

    // First two requests should pass
    const r1 = await app.request("/test", { headers: { "x-forwarded-for": ip } });
    expect(r1.status).toBe(200);

    const r2 = await app.request("/test", { headers: { "x-forwarded-for": ip } });
    expect(r2.status).toBe(200);

    // Third request should be rate limited
    const r3 = await app.request("/test", { headers: { "x-forwarded-for": ip } });
    expect(r3.status).toBe(429);

    const body = await r3.json();
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(r3.headers.get("Retry-After")).toBe("60");

    process.env.RATE_LIMIT_RPM = origRpm;
  });
});
