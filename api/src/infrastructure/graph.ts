import { getDb } from "./mongo";
import type { GraphEdge, EntityType, EdgeRelation } from "../types";

function edge(
  fromType: EntityType, fromId: string,
  toType: EntityType, toId: string,
  relation: EdgeRelation,
  weight: number,
  source: "seed" | "inferred",
  now: Date,
): GraphEdge {
  return {
    from: { type: fromType, id: fromId },
    to: { type: toType, id: toId },
    relation, weight, source, createdAt: now,
  };
}

export async function rebuildGraph(): Promise<number> {
  const db = getDb();
  const col = db.collection("edges");
  const now = new Date();

  await col.deleteMany({});

  const [countries, conflicts, bases, chokepoints, nsaGroups, routes, ports] = await Promise.all([
    db.collection("countries").find({}, { projection: { _id: 1, name: 1, iso2: 1 } }).toArray(),
    db.collection("conflicts").find({}).toArray(),
    db.collection("bases").find({}).toArray(),
    db.collection("chokepoints").find({}).toArray(),
    db.collection("nonStateActors").find({}).toArray(),
    db.collection("tradeRoutes").find({}).toArray(),
    db.collection("ports").find({}, { projection: { _id: 1, country: 1 } }).toArray(),
  ]);

  // Build lookup maps
  const nameToId = new Map<string, string>();
  const iso2ToId = new Map<string, string>();
  for (const c of countries) {
    nameToId.set((c.name as string).toLowerCase(), c._id as string);
    if (c.iso2) iso2ToId.set((c.iso2 as string).toLowerCase(), c._id as string);
  }
  const resolveCountry = (s: string): string | undefined =>
    nameToId.get(s.toLowerCase()) ?? iso2ToId.get(s.toLowerCase());

  const edges: GraphEdge[] = [];

  // Conflicts → Countries
  for (const c of conflicts) {
    for (const iso2 of c.relatedCountries ?? []) {
      const cid = resolveCountry(iso2);
      if (cid) edges.push(edge("conflict", c._id, "country", cid, "involves", 1.0, "seed", now));
    }
  }

  // Bases → Countries (host + operator)
  for (const b of bases) {
    const hostId = resolveCountry(b.hostNation ?? "");
    const opId = resolveCountry(b.operatingCountry ?? "") ?? resolveCountry(b.country ?? "");
    if (hostId) edges.push(edge("base", b._id, "country", hostId, "hosted-by", 1.0, "seed", now));
    if (opId && opId !== hostId) edges.push(edge("base", b._id, "country", opId, "operated-by", 1.0, "seed", now));
  }

  // Chokepoints → Countries (dependentCountries)
  for (const ch of chokepoints) {
    for (const name of ch.dependentCountries ?? []) {
      const cid = resolveCountry(name);
      if (cid) edges.push(edge("chokepoint", ch._id, "country", cid, "depends-on", 1.0, "seed", now));
    }
  }

  // NSA → Countries (allies + rivals)
  for (const a of nsaGroups) {
    for (const name of a.allies ?? []) {
      const cid = resolveCountry(name);
      if (cid) edges.push(edge("nsa", a._id, "country", cid, "ally-of", 1.0, "seed", now));
    }
    for (const name of a.rivals ?? []) {
      const cid = resolveCountry(name);
      if (cid) edges.push(edge("nsa", a._id, "country", cid, "rival-of", 1.0, "seed", now));
    }
  }

  // Trade routes → Ports + Chokepoints
  for (const r of routes) {
    edges.push(edge("trade-route", r._id, "port", r.from, "originates-at", 1.0, "seed", now));
    edges.push(edge("trade-route", r._id, "port", r.to, "terminates-at", 1.0, "seed", now));
    for (const wp of r.waypoints ?? []) {
      edges.push(edge("trade-route", r._id, "chokepoint", wp, "passes-through", 1.0, "seed", now));
    }
  }

  // Ports → Countries
  for (const p of ports) {
    if (p.country) {
      const cid = resolveCountry(p.country);
      if (cid) edges.push(edge("port", p._id, "country", cid, "port-in", 1.0, "seed", now));
    }
  }

  // --- Inferred edges ---

  // NSA participates-in conflict
  for (const a of nsaGroups) {
    const nsaCountryIds = new Set(
      [...(a.allies ?? []), ...(a.rivals ?? [])]
        .map((n: string) => resolveCountry(n))
        .filter(Boolean) as string[],
    );
    for (const c of conflicts) {
      if (c.status !== "active") continue;
      const conflictCountryIds = new Set(
        (c.relatedCountries ?? []).map((iso2: string) => resolveCountry(iso2)).filter(Boolean) as string[],
      );
      const overlap = [...nsaCountryIds].filter((id) => conflictCountryIds.has(id));
      if (overlap.length >= 1) {
        edges.push(edge("nsa", a._id, "conflict", c._id, "participates-in",
          Math.min(overlap.length * 0.3, 0.9), "inferred", now));
      }
    }
  }

  // Conflict disrupts chokepoint
  for (const c of conflicts) {
    if (c.status !== "active") continue;
    const conflictCountryIds = new Set(
      (c.relatedCountries ?? []).map((iso2: string) => resolveCountry(iso2)).filter(Boolean) as string[],
    );
    for (const ch of chokepoints) {
      const depIds = (ch.dependentCountries ?? [])
        .map((n: string) => resolveCountry(n))
        .filter(Boolean) as string[];
      const overlap = depIds.filter((id) => conflictCountryIds.has(id));
      if (overlap.length >= 1) {
        edges.push(edge("conflict", c._id, "chokepoint", ch._id, "disrupts",
          ch.status === "CLOSED" ? 1.0 : 0.6, "inferred", now));
      }
    }
  }

  if (edges.length > 0) {
    await col.insertMany(edges);
  }

  // Indexes
  await col.createIndex({ "from.type": 1, "from.id": 1 });
  await col.createIndex({ "to.type": 1, "to.id": 1 });
  await col.createIndex({ relation: 1 });
  await col.createIndex({ "from.id": 1, "to.id": 1 });

  return edges.length;
}

/** Query edges connected to an entity (either direction) */
export async function getConnectedEdges(
  type: string,
  id: string,
  minWeight = 0,
): Promise<GraphEdge[]> {
  const db = getDb();
  const filter: any = {
    $or: [
      { "from.type": type, "from.id": id },
      { "to.type": type, "to.id": id },
    ],
  };
  if (minWeight > 0) filter.weight = { $gte: minWeight };
  return db.collection<GraphEdge>("edges").find(filter).toArray();
}
