import { readdir, readFile } from "fs/promises";
import { join, resolve } from "path";
import { getDb } from "./mongo";
import { publishEvent } from "./sse";
import type {
  PluginManifest,
  PluginSourceHandler,
  PluginEnrichmentHandler,
  RegisteredPlugin,
  GraphEdge,
} from "../types";

const PLUGINS_DIR = resolve(join(import.meta.dir, "../../plugins"));

const plugins = new Map<string, RegisteredPlugin>();
const pluginIntervals: ReturnType<typeof setInterval>[] = [];

export async function discoverPlugins(): Promise<PluginManifest[]> {
  const manifests: PluginManifest[] = [];
  let dirs: string[];
  try {
    dirs = await readdir(PLUGINS_DIR);
  } catch {
    // No plugins directory — that's fine
    return [];
  }

  for (const dir of dirs) {
    try {
      const manifestPath = join(PLUGINS_DIR, dir, "manifest.json");
      const raw = await readFile(manifestPath, "utf-8");
      const manifest: PluginManifest = JSON.parse(raw);

      if (!manifest.id || !manifest.type || !manifest.name) {
        console.warn(`[plugins] Invalid manifest in ${dir}: missing id/type/name`);
        continue;
      }

      manifests.push(manifest);
    } catch {
      // Skip directories without manifest.json
    }
  }

  return manifests;
}

async function loadHandler(pluginId: string): Promise<PluginSourceHandler | PluginEnrichmentHandler | null> {
  try {
    const handlerPath = join(PLUGINS_DIR, pluginId, "handler.ts");
    const module = await import(handlerPath);
    return module.default ?? null;
  } catch {
    try {
      const handlerPath = join(PLUGINS_DIR, pluginId, "handler.js");
      const module = await import(handlerPath);
      return module.default ?? null;
    } catch {
      return null;
    }
  }
}

async function setupSourcePlugin(plugin: RegisteredPlugin): Promise<void> {
  const { manifest, handler } = plugin;
  if (!manifest.collection) return;

  const db = getDb();
  const colName = `plugin_${manifest.collection}`;
  const col = db.collection(colName);

  // Create indexes
  if (manifest.entityLinks?.locationField) {
    await col.createIndex({ [manifest.entityLinks.locationField]: "2dsphere" }).catch(() => {});
  }
  await col.createIndex({ _id: 1 }).catch(() => {});

  // Set up periodic polling
  if (handler && "fetch" in handler && manifest.pollInterval) {
    const poll = async () => {
      try {
        const sourceHandler = handler as PluginSourceHandler;
        const docs = await sourceHandler.fetch();
        if (!docs || docs.length === 0) return;

        let inserted = 0;
        for (const doc of docs) {
          try {
            await col.updateOne(
              { _id: doc._id },
              { $set: { ...doc, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
              { upsert: true },
            );
            inserted++;
          } catch {
            // Skip duplicate
          }
        }

        // Generate graph edges
        if (manifest.entityLinks?.countryField) {
          // Build iso2 → slug lookup so plugins can provide ISO2 codes
          const countries = await db.collection("countries")
            .find({}, { projection: { _id: 1, iso2: 1 } })
            .toArray();
          const iso2ToSlug = new Map<string, string>();
          const slugSet = new Set<string>();
          for (const c of countries) {
            slugSet.add(c._id as string);
            if (c.iso2) iso2ToSlug.set((c.iso2 as string).toUpperCase(), c._id as string);
          }

          const edges: GraphEdge[] = [];
          const docIds: string[] = [];
          const now = new Date();
          for (const doc of docs) {
            const countryVal = doc[manifest.entityLinks.countryField!];
            docIds.push(String(doc._id));
            if (!countryVal) continue;
            // Resolve: try as iso2 first, then as slug directly
            const resolved = iso2ToSlug.get(String(countryVal).toUpperCase())
              ?? (slugSet.has(countryVal) ? countryVal : null);
            if (!resolved) continue;
            edges.push({
              from: { type: "news", id: String(doc._id) },
              to: { type: "country", id: resolved },
              relation: "mentions",
              weight: 0.8,
              source: "nlp",
              createdAt: now,
            });
          }
          if (edges.length > 0) {
            // Remove stale edges for these docs before reinserting
            await db.collection("edges").deleteMany({
              "from.id": { $in: docIds },
              relation: "mentions",
              source: "nlp",
            }).catch(() => {});
            await db.collection("edges").insertMany(edges).catch(() => {});
          }
        }

        plugin.lastPolled = new Date();
        plugin.docCount = await col.countDocuments();

        await publishEvent("plugin-poll", {
          pluginId: manifest.id,
          inserted,
          total: plugin.docCount,
        });

        console.log(`[plugins] ${manifest.id}: polled ${docs.length} docs, inserted ${inserted}`);
      } catch (err) {
        console.error(`[plugins] ${manifest.id} poll error:`, err);
        plugin.status = "error";
      }
    };

    // Initial poll after 10s
    setTimeout(poll, 10000);
    // Recurring polls
    pluginIntervals.push(setInterval(poll, manifest.pollInterval));
  }
}

export async function mountPlugins(): Promise<number> {
  const manifests = await discoverPlugins();
  let mounted = 0;

  for (const manifest of manifests) {
    try {
      const handler = await loadHandler(manifest.id);

      const plugin: RegisteredPlugin = {
        manifest,
        handler: handler ?? undefined,
        status: "active",
      };

      plugins.set(manifest.id, plugin);

      if (manifest.type === "source") {
        await setupSourcePlugin(plugin);
      }

      mounted++;
      console.log(`[plugins] Mounted: ${manifest.id} (${manifest.type})`);
    } catch (err) {
      console.error(`[plugins] Failed to mount ${manifest.id}:`, err);
    }
  }

  return mounted;
}

export function getPluginManifests(): PluginManifest[] {
  return Array.from(plugins.values()).map((p) => p.manifest);
}

export function getPlugin(id: string): RegisteredPlugin | undefined {
  return plugins.get(id);
}

export function getPluginsByType(type: PluginManifest["type"]): RegisteredPlugin[] {
  return Array.from(plugins.values()).filter((p) => p.manifest.type === type);
}

/** Get binary layer config for a plugin (used by layers.ts fallback) */
export function getPluginLayerConfig(layerId: string): {
  collection: string;
  stride: number;
  query?: Record<string, any>;
  handler?: PluginSourceHandler;
} | null {
  const plugin = plugins.get(layerId);
  if (!plugin) return null;

  if (plugin.manifest.type === "source" && plugin.manifest.binaryLayer) {
    return {
      collection: `plugin_${plugin.manifest.collection}`,
      stride: plugin.manifest.binaryLayer.stride,
      handler: plugin.handler as PluginSourceHandler | undefined,
    };
  }

  if (plugin.manifest.type === "layer" && plugin.manifest.dataSource) {
    return {
      collection: plugin.manifest.dataSource,
      stride: plugin.manifest.binaryLayer?.stride ?? 3,
      query: plugin.manifest.query,
    };
  }

  return null;
}

export function stopPlugins(): void {
  for (const i of pluginIntervals) clearInterval(i);
  pluginIntervals.length = 0;
}
