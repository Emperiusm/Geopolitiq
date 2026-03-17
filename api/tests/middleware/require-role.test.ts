import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { requireRole } from "../../src/middleware/require-role";
import { requirePlatformAdmin } from "../../src/middleware/require-platform-admin";

function setAuthContext(role: string, platformRole = "user") {
  return async (c: any, next: any) => {
    c.set("userId", "u1");
    c.set("role", role);
    c.set("teamId", "t1");
    c.set("platformRole", platformRole);
    c.set("authMethod", "jwt");
    await next();
  };
}

describe("requireRole", () => {
  it("allows owner when admin+ required", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("owner"));
    app.get("/test", requireRole("admin"), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("allows admin when admin+ required", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("admin"));
    app.get("/test", requireRole("admin"), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("rejects member when admin+ required", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("member"));
    app.get("/test", requireRole("admin"), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows viewer when any role required", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("viewer"));
    app.get("/test", requireRole("viewer"), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("allows member when member+ required", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("member"));
    app.get("/test", requireRole("member"), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });
});

describe("requirePlatformAdmin", () => {
  it("allows platform admin", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("member", "admin"));
    app.get("/test", requirePlatformAdmin(), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("rejects non-admin", async () => {
    const app = new Hono();
    app.use("*", setAuthContext("owner", "user"));
    app.get("/test", requirePlatformAdmin(), (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
