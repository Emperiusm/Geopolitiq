import { Hono } from "hono";
import { getPluginManifests, getPlugin } from "../../infrastructure/plugin-registry";
import { getDb } from "../../infrastructure/mongo";
import { success, notFound, apiError } from "../../helpers/response";
import type { PluginSourceHandler } from "../../types";

export const pluginRoutes = new Hono();

pluginRoutes.get("/manifest", (c) => {
  const manifests = getPluginManifests();
  return success(c, manifests, { total: manifests.length } as any);
});

pluginRoutes.get("/:id/status", async (c) => {
  const id = c.req.param("id");
  const plugin = getPlugin(id);
  if (!plugin) return notFound(c, "Plugin", id);

  const docCount = plugin.manifest.collection
    ? await getDb().collection(`plugin_${plugin.manifest.collection}`).countDocuments().catch(() => 0)
    : 0;

  return success(c, {
    id: plugin.manifest.id,
    name: plugin.manifest.name,
    type: plugin.manifest.type,
    status: plugin.status,
    lastPolled: plugin.lastPolled?.toISOString() ?? null,
    docCount,
  });
});

pluginRoutes.post("/:id/poll", async (c) => {
  if (process.env.NODE_ENV === "production") {
    return apiError(c, "UNAUTHORIZED", "Manual poll disabled in production", 403);
  }

  const id = c.req.param("id");
  const plugin = getPlugin(id);
  if (!plugin) return notFound(c, "Plugin", id);

  if (plugin.manifest.type !== "source" || !plugin.handler) {
    return apiError(c, "INVALID_OPERATION", "Only source plugins with handlers can be polled", 400);
  }

  try {
    const handler = plugin.handler as PluginSourceHandler;
    const docs = await handler.fetch();
    const col = getDb().collection(`plugin_${plugin.manifest.collection}`);

    let inserted = 0;
    for (const doc of docs) {
      const result = await col.updateOne(
        { _id: doc._id },
        { $set: { ...doc, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true },
      );
      if (result.upsertedCount > 0) inserted++;
    }

    plugin.lastPolled = new Date();
    return success(c, { fetched: docs.length, inserted });
  } catch (err: any) {
    return apiError(c, "POLL_ERROR", err.message ?? "Poll failed", 500);
  }
});
