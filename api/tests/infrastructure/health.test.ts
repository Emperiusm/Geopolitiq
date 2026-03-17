import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { healthRoutes } from "../../src/infrastructure/health";

describe("Health endpoints", () => {
  const app = new Hono().route("/health", healthRoutes);

  it("GET /health returns 200 with ok status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });

  it("GET /health/ready returns status of services", async () => {
    const res = await app.request("/health/ready");
    const body = await res.json();
    expect(body.mongo).toBeDefined();
    expect(body.redis).toBeDefined();
  });
});
