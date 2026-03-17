import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { scopeCheck } from "../../src/middleware/scope-check";

function setApiKeyContext(scope: string) {
  return async (c: any, next: any) => {
    c.set("authMethod", "apikey");
    c.set("scope", scope);
    c.set("userId", "u1");
    c.set("teamId", "t1");
    c.set("role", "member");
    c.set("platformRole", "user");
    await next();
  };
}

function setJwtContext() {
  return async (c: any, next: any) => {
    c.set("authMethod", "jwt");
    c.set("userId", "u1");
    c.set("teamId", "t1");
    c.set("role", "member");
    c.set("platformRole", "user");
    await next();
  };
}

describe("scopeCheck", () => {
  it("allows GET requests with read scope", async () => {
    const app = new Hono();
    app.use("*", setApiKeyContext("read"));
    app.use("*", scopeCheck);
    app.get("/test", (c) => c.json({ ok: true }));
    const res = await app.request("/test");
    expect(res.status).toBe(200);
  });

  it("blocks POST requests with read scope", async () => {
    const app = new Hono();
    app.use("*", setApiKeyContext("read"));
    app.use("*", scopeCheck);
    app.post("/test", (c) => c.json({ ok: true }));
    const res = await app.request("/test", { method: "POST" });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("SCOPE_INSUFFICIENT");
  });

  it("allows POST requests with read-write scope", async () => {
    const app = new Hono();
    app.use("*", setApiKeyContext("read-write"));
    app.use("*", scopeCheck);
    app.post("/test", (c) => c.json({ ok: true }));
    const res = await app.request("/test", { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("skips check for JWT auth", async () => {
    const app = new Hono();
    app.use("*", setJwtContext());
    app.use("*", scopeCheck);
    app.post("/test", (c) => c.json({ ok: true }));
    const res = await app.request("/test", { method: "POST" });
    expect(res.status).toBe(200);
  });

  it("blocks PUT requests with read scope", async () => {
    const app = new Hono();
    app.use("*", setApiKeyContext("read"));
    app.use("*", scopeCheck);
    app.put("/test", (c) => c.json({ ok: true }));
    const res = await app.request("/test", { method: "PUT" });
    expect(res.status).toBe(403);
  });

  it("blocks DELETE requests with read scope", async () => {
    const app = new Hono();
    app.use("*", setApiKeyContext("read"));
    app.use("*", scopeCheck);
    app.delete("/test", (c) => c.json({ ok: true }));
    const res = await app.request("/test", { method: "DELETE" });
    expect(res.status).toBe(403);
  });
});
