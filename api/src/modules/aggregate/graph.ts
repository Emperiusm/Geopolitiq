import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { success, validationError } from "../../helpers/response";
import type { GraphEdge } from "../../types";

export const graphRouter = new Hono();

// GET /graph/connections?entity=country:iran&depth=1&minWeight=0.5
graphRouter.get("/connections", async (c) => {
  const entity = c.req.query("entity");
  const depth = Math.min(Number(c.req.query("depth")) || 1, 3);
  const minWeight = Number(c.req.query("minWeight")) || 0;

  if (!entity || !entity.includes(":")) {
    return validationError(c, "entity required (e.g. country:iran)");
  }
  const [type, id] = entity.split(":", 2);

  const db = getDb();
  const col = db.collection<GraphEdge>("edges");

  const visited = new Set<string>([`${type}:${id}`]);
  let frontier = [{ type, id }];
  const allEdges: GraphEdge[] = [];
  const allNodes = new Map<string, { type: string; id: string }>();
  allNodes.set(`${type}:${id}`, { type, id });

  for (let d = 0; d < depth; d++) {
    const conditions = frontier.flatMap((f) => [
      { "from.type": f.type, "from.id": f.id },
      { "to.type": f.type, "to.id": f.id },
    ]);

    const filter: any = { $or: conditions };
    if (minWeight > 0) filter.weight = { $gte: minWeight };

    const edges = await col.find(filter).toArray();
    const nextFrontier: { type: string; id: string }[] = [];

    for (const e of edges) {
      allEdges.push(e);
      for (const end of [e.from, e.to]) {
        const key = `${end.type}:${end.id}`;
        if (!visited.has(key)) {
          visited.add(key);
          allNodes.set(key, end);
          nextFrontier.push(end);
        }
      }
    }

    frontier = nextFrontier;
  }

  return success(c, {
    seed: { type, id },
    nodes: Array.from(allNodes.values()),
    edges: allEdges,
    depth,
  }, { total: allEdges.length } as any);
});

// GET /graph/path?from=country:iran&to=chokepoint:hormuz
graphRouter.get("/path", async (c) => {
  const from = c.req.query("from");
  const to = c.req.query("to");

  if (!from || !to || !from.includes(":") || !to.includes(":")) {
    return validationError(c, "from and to required (e.g. country:iran)");
  }

  const [fromType, fromId] = from.split(":", 2);
  const [toType, toId] = to.split(":", 2);
  const target = `${toType}:${toId}`;

  const db = getDb();
  const col = db.collection<GraphEdge>("edges");

  const visited = new Map<string, { via: string | null; edge: GraphEdge | null }>();
  visited.set(`${fromType}:${fromId}`, { via: null, edge: null });
  let frontier = [{ type: fromType, id: fromId }];

  for (let d = 0; d < 4 && frontier.length > 0; d++) {
    const conditions = frontier.flatMap((f) => [
      { "from.type": f.type, "from.id": f.id },
      { "to.type": f.type, "to.id": f.id },
    ]);

    const edges = await col.find({ $or: conditions }).toArray();
    const nextFrontier: { type: string; id: string }[] = [];

    for (const e of edges) {
      for (const end of [e.from, e.to]) {
        const key = `${end.type}:${end.id}`;
        if (!visited.has(key)) {
          const source = [e.from, e.to].find((n) =>
            visited.has(`${n.type}:${n.id}`),
          )!;
          visited.set(key, { via: `${source.type}:${source.id}`, edge: e });
          nextFrontier.push(end);

          if (key === target) {
            const path: GraphEdge[] = [];
            let cur: string | null = key;
            while (cur) {
              const node = visited.get(cur)!;
              if (node.edge) path.unshift(node.edge);
              cur = node.via;
            }
            return success(c, { from, to, path, hops: path.length });
          }
        }
      }
    }

    frontier = nextFrontier;
  }

  return success(c, { from, to, path: [], hops: -1 },
    { message: "No path found within 4 hops" } as any);
});
