import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../src/infrastructure/redis";
import {
  discoverPlugins,
  mountPlugins,
  getPluginManifests,
  getPlugin,
  getPluginsByType,
  getPluginLayerConfig,
} from "../../src/infrastructure/plugin-registry";
import { pluginRoutes } from "../../src/modules/system/plugin-routes";

const app = new Hono().route("/plugins", pluginRoutes);

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  await connectRedis("redis://localhost:6380");
  await mountPlugins();
});

afterAll(async () => {
  await getDb().collection("plugin_earthquakes").deleteMany({}).catch(() => {});
  await disconnectRedis();
  await disconnectMongo();
});

describe("Plugin discovery", () => {
  it("discovers plugins from plugins/ directory", async () => {
    const manifests = await discoverPlugins();
    expect(manifests.length).toBeGreaterThan(0);
    expect(manifests.some((m) => m.id === "example-earthquakes")).toBe(true);
  });

  it("mounts discovered plugins", () => {
    const manifests = getPluginManifests();
    expect(manifests.length).toBeGreaterThan(0);
  });

  it("gets plugin by id", () => {
    const plugin = getPlugin("example-earthquakes");
    expect(plugin).toBeDefined();
    expect(plugin!.manifest.type).toBe("source");
    expect(plugin!.status).toBe("active");
  });

  it("filters plugins by type", () => {
    const sources = getPluginsByType("source");
    expect(sources.length).toBeGreaterThan(0);
    for (const p of sources) {
      expect(p.manifest.type).toBe("source");
    }
  });

  it("returns layer config for source plugin", () => {
    const config = getPluginLayerConfig("example-earthquakes");
    expect(config).toBeDefined();
    expect(config!.collection).toBe("plugin_earthquakes");
    expect(config!.stride).toBe(4);
  });

  it("returns null for unknown plugin layer", () => {
    const config = getPluginLayerConfig("nonexistent");
    expect(config).toBeNull();
  });
});

describe("Plugin routes", () => {
  it("GET /plugins/manifest returns all manifests", async () => {
    const res = await app.request("/plugins/manifest");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].id).toBeDefined();
    expect(body.data[0].type).toBeDefined();
  });

  it("GET /plugins/:id/status returns plugin status", async () => {
    const res = await app.request("/plugins/example-earthquakes/status");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.id).toBe("example-earthquakes");
    expect(body.data.type).toBe("source");
    expect(body.data.status).toBe("active");
  });

  it("GET /plugins/:id/status returns 404 for unknown", async () => {
    const res = await app.request("/plugins/nonexistent/status");
    expect(res.status).toBe(404);
  });
});
