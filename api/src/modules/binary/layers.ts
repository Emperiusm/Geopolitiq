import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheBinaryAside } from "../../infrastructure/binary-cache";
import { notFound } from "../../helpers/response";

export const binaryLayersRouter = new Hono();

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

interface LayerConfig {
  collection: string;
  stride: number;
  encode: (doc: any) => number[];
}

const LAYER_CONFIGS: Record<string, LayerConfig> = {
  bases: {
    collection: "bases",
    stride: 5,
    encode: (doc) => {
      const [r, g, b] = hexToRgb(doc.color ?? "#888888");
      return [doc.lng, doc.lat, r, g, b];
    },
  },
  "nsa-zones": {
    collection: "nonStateActors",
    stride: 4,
    encode: () => [], // handled specially
  },
  chokepoints: {
    collection: "chokepoints",
    stride: 4,
    encode: (doc) => {
      const statusMap: Record<string, number> = { OPEN: 0, RESTRICTED: 1, CLOSED: 2 };
      const typeMap: Record<string, number> = { maritime: 0, energy: 1, land: 2 };
      return [doc.lng, doc.lat, statusMap[doc.status] ?? 0, typeMap[doc.type] ?? 0];
    },
  },
  "trade-arcs": {
    collection: "tradeRoutes",
    stride: 5,
    encode: () => [], // handled specially — needs port lookups
  },
  conflicts: {
    collection: "conflicts",
    stride: 4,
    encode: (doc) => {
      const statusMap: Record<string, number> = { active: 0, ceasefire: 1, resolved: 2 };
      return [doc.lng, doc.lat, doc.dayCount ?? 0, statusMap[doc.status] ?? 0];
    },
  },
};

async function encodeBinaryLayer(layer: string, config: LayerConfig): Promise<Buffer> {
  const docs = await getDb().collection(config.collection).find({}).toArray();

  let records: number[][] = [];

  if (layer === "nsa-zones") {
    const ideologyMap: Record<string, number> = {
      "Salafi jihadism": 0, "Shia Islamism": 1, "Nationalist": 2,
      "Criminal": 3, "State-proxy": 4, "Cyber": 5,
    };
    for (const doc of docs) {
      for (const zone of doc.zones ?? []) {
        const ideologyIdx = ideologyMap[doc.ideology] ?? 6;
        records.push([zone.lng, zone.lat, zone.radiusKm ?? 50, ideologyIdx]);
      }
    }
  } else if (layer === "trade-arcs") {
    const ports = await getDb().collection("ports").find({}).toArray();
    const portMap = new Map(ports.map((p: any) => [p._id, p]));
    const categoryMap: Record<string, number> = { container: 0, energy: 1, bulk: 2 };
    for (const doc of docs) {
      const fromPort = portMap.get(doc.from);
      const toPort = portMap.get(doc.to);
      if (fromPort && toPort) {
        records.push([fromPort.lng, fromPort.lat, toPort.lng, toPort.lat, categoryMap[doc.category] ?? 0]);
      }
    }
  } else {
    records = docs.map(config.encode).filter((r) => r.length > 0);
  }

  // Build binary buffer: 8-byte header + Float32Array body
  const headerSize = 8;
  const bodySize = records.length * config.stride * 4;
  const buf = new ArrayBuffer(headerSize + bodySize);
  const header = new DataView(buf);
  header.setUint32(0, records.length, true);
  header.setUint32(4, config.stride, true);

  const body = new Float32Array(buf, headerSize);
  for (let i = 0; i < records.length; i++) {
    for (let j = 0; j < config.stride; j++) {
      body[i * config.stride + j] = records[i][j];
    }
  }

  return Buffer.from(buf);
}

binaryLayersRouter.get("/:layer/binary", async (c) => {
  const layer = c.req.param("layer");
  const config = LAYER_CONFIGS[layer];

  if (!config) return notFound(c, "Layer", layer);

  const buf = await cacheBinaryAside(
    `gambit:binary:${layer}`,
    () => encodeBinaryLayer(layer, config),
    3600,
  );

  return new Response(buf, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(buf.byteLength),
      "Cache-Control": "public, max-age=3600",
    },
  });
});
