import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { seedRoutes } from "../../../src/modules/system/seed-routes";

describe("Seed routes", () => {
  const app = new Hono().route("/seed", seedRoutes);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
  });

  afterAll(async () => {
    await disconnectMongo();
  });

  it("POST /seed/run returns seed results in dev mode", async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const res = await app.request("/seed/run", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    // Should have the well-known seed result keys
    expect(typeof body.data.countries).toBe("number");
    expect(typeof body.data.conflicts).toBe("number");

    process.env.NODE_ENV = origEnv;
  });

  it("POST /seed/run returns 403 in production", async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const res = await app.request("/seed/run", { method: "POST" });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("UNAUTHORIZED");

    process.env.NODE_ENV = origEnv;
  });

  it("GET /seed/status returns per-collection counts", async () => {
    const res = await app.request("/seed/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();

    const expectedCollections = ["countries", "bases", "nonStateActors", "chokepoints",
      "elections", "tradeRoutes", "ports", "conflicts", "news", "countryColors"];

    for (const name of expectedCollections) {
      expect(body.data[name]).toBeDefined();
      expect(typeof body.data[name].count).toBe("number");
    }
  });
});
