import { getDb } from "../infrastructure/mongo";
import { writeTx } from "../infrastructure/neo4j";
import { embedBatch, isOllamaAvailable } from "../infrastructure/ollama";
import { generateClaimContent, claimFingerprint } from "./claim-templates";
import { ALIAS_MAP } from "./alias-map";
import type { ClaimTopic } from "./claim-topics";

import { ensureNeo4jSchema } from "./seed-neo4j-schema";

const BATCH_SIZE = 500;
const MIGRATION_AGENT = "migration";

// ─── Country Name Resolver ──────────────────────────────────────
type CountryLookup = Map<string, string>; // any variant → canonical country:{slug}

async function buildCountryResolver(): Promise<CountryLookup> {
  const db = getDb();
  const countries = await db.collection("countries").find({}).toArray();
  const lookup = new Map<string, string>();

  for (const c of countries) {
    const canonical = `country:${c._id}`;
    lookup.set(c._id as string, canonical);                     // slug
    lookup.set((c.name as string)?.toLowerCase(), canonical);    // full name
    if (c.iso2) {
      lookup.set((c.iso2 as string).toLowerCase(), canonical);   // ISO2
      lookup.set((c.iso2 as string).toUpperCase(), canonical);
    }
  }

  // Add static aliases
  for (const [canonical, aliases] of Object.entries(ALIAS_MAP)) {
    if (canonical.startsWith("country:")) {
      for (const alias of aliases) {
        lookup.set(alias.toLowerCase(), canonical);
      }
    }
  }

  return lookup;
}

function resolveCountry(lookup: CountryLookup, ref: string): string | null {
  return lookup.get(ref) ?? lookup.get(ref.toLowerCase()) ?? null;
}

// ─── Batch Helper ───────────────────────────────────────────────
async function batchWrite(items: Record<string, any>[], cypher: string): Promise<number> {
  let written = 0;
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    await writeTx(async (tx) => {
      await tx.run(cypher, { batch });
    });
    written += batch.length;
  }
  return written;
}

// ─── Phase 1: Entity Nodes ─────────────────────────────────────
async function phase1(now: string): Promise<void> {
  console.log("[migration] Phase 1: Creating entity nodes...");
  const db = getDb();

  // Countries
  const countries = await db.collection("countries").find({}).toArray();
  const countryNodes = countries.map((c) => ({
    id: `country:${c._id}`,
    label: c.name,
    type: "country",
    iso2: c.iso2 ?? null,
    flag: c.flag ?? null,
    lat: c.lat ?? null,
    lng: c.lng ?? null,
    color: null as string | null,
    confidence: 1.0,
    source: "seed",
    firstSeen: now,
    lastUpdated: now,
  }));

  // Load country colors
  const colorDocs = await db.collection("countryColors").find({}).toArray();
  const colorMap = new Map(colorDocs.map((d) => [d._id, d.color as string]));
  for (const node of countryNodes) {
    const slug = node.id.replace("country:", "");
    node.color = colorMap.get(slug) ?? null;
  }

  await batchWrite(countryNodes, `
    UNWIND $batch AS n
    MERGE (e:Country:Entity {id: n.id})
    ON CREATE SET e += n, e.location = CASE WHEN n.lat IS NOT NULL THEN point({latitude: n.lat, longitude: n.lng}) ELSE null END
    ON MATCH SET e.lastUpdated = n.lastUpdated
  `);
  console.log(`  Countries: ${countryNodes.length}`);

  // Ports
  const ports = await db.collection("ports").find({}).toArray();
  await batchWrite(
    ports.map((p) => ({
      id: `port:${p._id}`, label: p.name, type: "port",
      lat: p.lat, lng: p.lng, country: p.country ?? null,
      confidence: 1.0, source: "seed", firstSeen: now, lastUpdated: now,
    })),
    `UNWIND $batch AS n
     MERGE (e:Port:Entity {id: n.id})
     ON CREATE SET e += n, e.location = point({latitude: n.lat, longitude: n.lng})
     ON MATCH SET e.lastUpdated = n.lastUpdated`
  );
  console.log(`  Ports: ${ports.length}`);

  // Chokepoints
  const chokepoints = await db.collection("chokepoints").find({}).toArray();
  await batchWrite(
    chokepoints.map((c) => ({
      id: `choke:${c._id}`, label: c.name, type: "chokepoint", chokeType: c.type ?? "maritime",
      lat: c.lat, lng: c.lng,
      confidence: 1.0, source: "seed", firstSeen: now, lastUpdated: now,
    })),
    `UNWIND $batch AS n
     MERGE (e:Chokepoint:Entity {id: n.id})
     ON CREATE SET e += n, e.location = point({latitude: n.lat, longitude: n.lng})
     ON MATCH SET e.lastUpdated = n.lastUpdated`
  );
  console.log(`  Chokepoints: ${chokepoints.length}`);

  // Bases
  const bases = await db.collection("bases").find({}).toArray();
  await batchWrite(
    bases.map((b) => ({
      id: `base:${b._id}`, label: b.name, type: "military_base",
      lat: b.lat, lng: b.lng, branch: b.branch ?? null, baseType: b.type ?? "base",
      confidence: 1.0, source: "seed", firstSeen: now, lastUpdated: now,
    })),
    `UNWIND $batch AS n
     MERGE (e:MilitaryBase:Entity {id: n.id})
     ON CREATE SET e += n, e.location = point({latitude: n.lat, longitude: n.lng})
     ON MATCH SET e.lastUpdated = n.lastUpdated`
  );
  console.log(`  Bases: ${bases.length}`);

  // Non-state actors
  const nsa = await db.collection("nonStateActors").find({}).toArray();
  await batchWrite(
    nsa.map((o) => ({
      id: `org:${o._id}`, label: o.name, type: "organization", orgType: "non-state",
      confidence: 1.0, source: "seed", firstSeen: now, lastUpdated: now,
    })),
    `UNWIND $batch AS n
     MERGE (e:Organization:Entity {id: n.id})
     ON CREATE SET e += n
     ON MATCH SET e.lastUpdated = n.lastUpdated`
  );
  console.log(`  Organizations: ${nsa.length}`);

  // Conflicts
  const conflicts = await db.collection("conflicts").find({}).toArray();
  await batchWrite(
    conflicts.map((c) => ({
      id: `conflict:${c._id}`, label: c.title, type: "conflict",
      lat: c.lat, lng: c.lng, startDate: c.startDate?.toISOString?.() ?? null,
      confidence: 1.0, source: "seed", firstSeen: now, lastUpdated: now,
    })),
    `UNWIND $batch AS n
     MERGE (e:Conflict:Entity {id: n.id})
     ON CREATE SET e += n, e.location = CASE WHEN n.lat IS NOT NULL THEN point({latitude: n.lat, longitude: n.lng}) ELSE null END
     ON MATCH SET e.lastUpdated = n.lastUpdated`
  );
  console.log(`  Conflicts: ${conflicts.length}`);

  // Elections
  const elections = await db.collection("elections").find({}).toArray();
  await batchWrite(
    elections.map((el) => ({
      id: `election:${el._id}`, label: `${el.country} ${el.type ?? "election"} ${el.date ?? ""}`.trim(),
      type: "election", lat: el.lat, lng: el.lng, date: el.date ?? null, electionType: el.type ?? null,
      confidence: 1.0, source: "seed", firstSeen: now, lastUpdated: now,
    })),
    `UNWIND $batch AS n
     MERGE (e:Election:Entity {id: n.id})
     ON CREATE SET e += n, e.location = CASE WHEN n.lat IS NOT NULL THEN point({latitude: n.lat, longitude: n.lng}) ELSE null END
     ON MATCH SET e.lastUpdated = n.lastUpdated`
  );
  console.log(`  Elections: ${elections.length}`);

  // Trade routes
  const routes = await db.collection("tradeRoutes").find({}).toArray();
  await batchWrite(
    routes.map((r) => ({
      id: `route:${r._id}`, label: r.name, type: "trade_route", category: r.category ?? null,
      confidence: 1.0, source: "seed", firstSeen: now, lastUpdated: now,
    })),
    `UNWIND $batch AS n
     MERGE (e:TradeRoute:Entity {id: n.id})
     ON CREATE SET e += n
     ON MATCH SET e.lastUpdated = n.lastUpdated`
  );
  console.log(`  Trade routes: ${routes.length}`);

  // News articles
  const articles = await db.collection("news").find({}).toArray();
  await batchWrite(
    articles.map((a) => ({
      id: `article:${a._id}`, label: a.title, type: "article",
      publishedAt: a.publishedAt?.toISOString?.() ?? null,
      confidence: 1.0, source: "seed", firstSeen: now, lastUpdated: now,
    })),
    `UNWIND $batch AS n
     MERGE (e:Article:Entity {id: n.id})
     ON CREATE SET e += n
     ON MATCH SET e.lastUpdated = n.lastUpdated`
  );
  console.log(`  Articles: ${articles.length}`);
}

// ─── Phase 2: Seed Claims ──────────────────────────────────────
async function phase2(now: string): Promise<{ claims: { content: string; id: string }[] }> {
  console.log("[migration] Phase 2: Creating seed claims...");
  const db = getDb();
  const allClaims: Record<string, any>[] = [];

  function makeClaim(
    aboutEntity: string,
    topic: ClaimTopic,
    entityLabel: string,
    value: string,
    extra?: { party?: string }
  ) {
    if (!value || value === "null" || value === "undefined") return;
    const content = generateClaimContent(topic, { entity: entityLabel, value, party: extra?.party });
    const fp = claimFingerprint(topic, content, aboutEntity);
    allClaims.push({
      id: crypto.randomUUID(),
      fingerprint: fp,
      content,
      topic,
      confidence: 1.0,
      status: "active",
      sourceCount: 1,
      extractedAt: now,
      agentId: MIGRATION_AGENT,
      aboutEntity,
    });
  }

  // Countries
  const countries = await db.collection("countries").find({}).toArray();
  for (const c of countries) {
    const eid = `country:${c._id}`;
    if (c.risk) makeClaim(eid, "risk", c.name as string, c.risk as string);
    if (c.leader) makeClaim(eid, "leadership", c.name as string, c.leader as string);
    if (c.pop) makeClaim(eid, "population", c.name as string, c.pop as string);
    if (c.gdp) makeClaim(eid, "gdp", c.name as string, c.gdp as string);
    if (c.analysis?.what) makeClaim(eid, "situation", c.name as string, c.analysis.what as string);
    if (c.analysis?.why) makeClaim(eid, "situation_cause", c.name as string, c.analysis.why as string);
    if (c.analysis?.next) makeClaim(eid, "situation_forecast", c.name as string, c.analysis.next as string);
  }

  // Conflicts
  const conflicts = await db.collection("conflicts").find({}).toArray();
  for (const c of conflicts) {
    const eid = `conflict:${c._id}`;
    if (c.status) makeClaim(eid, "status", c.title as string, c.status as string);
    if (c.latestUpdate) makeClaim(eid, "situation", c.title as string, c.latestUpdate as string);
    if (c.casualties) {
      for (const cas of c.casualties as any[]) {
        if (cas.party && cas.figure) {
          makeClaim(eid, "casualties", c.title as string, cas.figure as string, { party: cas.party as string });
        }
      }
    }
  }

  // Chokepoints
  const chokepoints = await db.collection("chokepoints").find({}).toArray();
  for (const c of chokepoints) {
    const eid = `choke:${c._id}`;
    if (c.status) makeClaim(eid, "status", c.name as string, c.status as string);
    if (c.dailyVessels) makeClaim(eid, "traffic", c.name as string, c.dailyVessels as string);
    if (c.oilVolume) makeClaim(eid, "oil_volume", c.name as string, c.oilVolume as string);
    if (c.gasVolume) makeClaim(eid, "gas_volume", c.name as string, c.gasVolume as string);
    if (c.strategicSummary) makeClaim(eid, "strategic_assessment", c.name as string, c.strategicSummary as string);
  }

  // NSA
  const nsa = await db.collection("nonStateActors").find({}).toArray();
  for (const o of nsa) {
    const eid = `org:${o._id}`;
    if (o.status) makeClaim(eid, "status", o.name as string, o.status as string);
    if (o.strength) makeClaim(eid, "strength", o.name as string, o.strength as string);
    if (o.ideology) makeClaim(eid, "ideology", o.name as string, o.ideology as string);
    if (o.revenue) makeClaim(eid, "revenue", o.name as string, o.revenue as string);
    if (o.activities) makeClaim(eid, "activities", o.name as string, o.activities as string);
    if (o.territory) makeClaim(eid, "territory", o.name as string, o.territory as string);
    if (o.funding) makeClaim(eid, "funding", o.name as string, o.funding as string);
    if (o.leaders) makeClaim(eid, "leadership", o.name as string, o.leaders as string);
  }

  // Trade routes
  const routes = await db.collection("tradeRoutes").find({}).toArray();
  for (const r of routes) {
    const eid = `route:${r._id}`;
    if (r.status) makeClaim(eid, "status", r.name as string, r.status as string);
    if (r.volumeDesc) makeClaim(eid, "trade_volume", r.name as string, r.volumeDesc as string);
  }

  // Elections
  const elections = await db.collection("elections").find({}).toArray();
  for (const el of elections) {
    const eid = `election:${el._id}`;
    if (el.winner) makeClaim(eid, "election_result", `${el.country} election`, el.winner as string);
    if (el.result) makeClaim(eid, "election_result", `${el.country} election`, el.result as string);
  }

  // Write claims to Neo4j
  await batchWrite(allClaims, `
    UNWIND $batch AS c
    MERGE (cl:Claim {fingerprint: c.fingerprint})
    ON CREATE SET cl += c
    WITH cl, c
    MATCH (e:Entity {id: c.aboutEntity})
    MERGE (cl)-[:ABOUT]->(e)
    MERGE (e)-[:CURRENT_BELIEF {topic: c.topic}]->(cl)
  `);

  console.log(`  Claims created: ${allClaims.length}`);
  return { claims: allClaims.map((c) => ({ content: c.content as string, id: c.id as string })) };
}

// ─── Phase 2.5: Batch Embed Claims ─────────────────────────────
async function phase2_5(claims: { content: string; id: string }[]): Promise<void> {
  console.log("[migration] Phase 2.5: Embedding claims...");
  if (!isOllamaAvailable()) {
    console.warn("  Ollama unavailable — skipping embeddings (will backfill later)");
    return;
  }

  for (let i = 0; i < claims.length; i += BATCH_SIZE) {
    const batch = claims.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.content);
    const embeddings = await embedBatch(texts);

    const updates = batch
      .map((c, j) => ({ id: c.id, embedding: embeddings[j] }))
      .filter((u) => u.embedding !== null);

    if (updates.length > 0) {
      await writeTx(async (tx) => {
        await tx.run(
          `UNWIND $updates AS u
           MATCH (c:Claim {id: u.id})
           SET c.embedding = u.embedding`,
          { updates }
        );
      });
    }
  }

  console.log(`  Embedded: ${claims.length} claims`);
}

// ─── Phase 3: Structural Relationships ─────────────────────────
async function phase3(): Promise<void> {
  console.log("[migration] Phase 3: Creating structural relationships...");
  const db = getDb();
  const lookup = await buildCountryResolver();
  const rels: { from: string; to: string; relation: string; weight: number }[] = [];

  // Conflicts → Countries
  const conflicts = await db.collection("conflicts").find({}).toArray();
  for (const c of conflicts) {
    for (const ref of (c.relatedCountries ?? []) as string[]) {
      const target = resolveCountry(lookup, ref);
      if (target) rels.push({ from: `conflict:${c._id}`, to: target, relation: "PARTY_TO", weight: 1.0 });
    }
  }

  // Bases → Countries
  const bases = await db.collection("bases").find({}).toArray();
  for (const b of bases) {
    if (b.operatingCountry || b.country) {
      const op = resolveCountry(lookup, (b.operatingCountry ?? b.country) as string);
      if (op) rels.push({ from: `base:${b._id}`, to: op, relation: "OPERATED_BY", weight: 1.0 });
    }
    if (b.hostNation) {
      const host = resolveCountry(lookup, b.hostNation as string);
      if (host) rels.push({ from: `base:${b._id}`, to: host, relation: "LOCATED_IN", weight: 1.0 });
    }
  }

  // NSA → Countries (allies/rivals)
  const nsa = await db.collection("nonStateActors").find({}).toArray();
  for (const o of nsa) {
    for (const ally of (o.allies ?? []) as string[]) {
      const target = resolveCountry(lookup, ally);
      if (target) rels.push({ from: `org:${o._id}`, to: target, relation: "ALLIES_WITH", weight: 0.8 });
    }
    for (const rival of (o.rivals ?? []) as string[]) {
      const target = resolveCountry(lookup, rival);
      if (target) rels.push({ from: `org:${o._id}`, to: target, relation: "HOSTILE_TO", weight: 0.8 });
    }
  }

  // Trade routes → Ports, Chokepoints
  const routes = await db.collection("tradeRoutes").find({}).toArray();
  for (const r of routes) {
    if (r.from) rels.push({ from: `route:${r._id}`, to: `port:${r.from}`, relation: "CONNECTS", weight: 1.0 });
    if (r.to) rels.push({ from: `route:${r._id}`, to: `port:${r.to}`, relation: "CONNECTS", weight: 1.0 });
    for (const wp of (r.waypoints ?? []) as string[]) {
      rels.push({ from: `route:${r._id}`, to: `choke:${wp}`, relation: "TRANSITS", weight: 1.0 });
    }
  }

  // Chokepoints → Countries (dependentCountries)
  const chokepoints = await db.collection("chokepoints").find({}).toArray();
  for (const c of chokepoints) {
    for (const dep of (c.dependentCountries ?? []) as string[]) {
      const target = resolveCountry(lookup, dep);
      if (target) rels.push({ from: target, to: `choke:${c._id}`, relation: "DEPENDS_ON", weight: 0.7 });
    }
  }

  // Elections → Countries
  const elections = await db.collection("elections").find({}).toArray();
  for (const e of elections) {
    const target = resolveCountry(lookup, (e.countryISO2 ?? e.country) as string);
    if (target) rels.push({ from: `election:${e._id}`, to: target, relation: "HELD_IN", weight: 1.0 });
  }

  // Ports → Countries
  const ports = await db.collection("ports").find({}).toArray();
  for (const p of ports) {
    if (p.country) {
      const target = resolveCountry(lookup, p.country as string);
      if (target) rels.push({ from: `port:${p._id}`, to: target, relation: "LOCATED_IN", weight: 1.0 });
    }
  }

  // News articles → Entities (MENTIONS)
  const articles = await db.collection("news").find({}).toArray();
  for (const a of articles) {
    for (const ref of (a.relatedCountries ?? []) as string[]) {
      const target = resolveCountry(lookup, ref);
      if (target) rels.push({ from: `article:${a._id}`, to: target, relation: "MENTIONS", weight: 0.5 });
    }
    for (const ref of (a.relatedChokepoints ?? []) as string[]) {
      rels.push({ from: `article:${a._id}`, to: `choke:${ref}`, relation: "MENTIONS", weight: 0.5 });
    }
    for (const ref of (a.relatedNSA ?? []) as string[]) {
      rels.push({ from: `article:${a._id}`, to: `org:${ref}`, relation: "MENTIONS", weight: 0.5 });
    }
  }

  await batchWrite(rels, `
    UNWIND $batch AS r
    MATCH (a:Entity {id: r.from})
    MATCH (b:Entity {id: r.to})
    CALL apoc.merge.relationship(a, r.relation, {weight: r.weight, confidence: 1.0, source: "seed", sourceCount: 1, firstSeen: datetime(), lastUpdated: datetime()}, {}, b, {}) YIELD rel
    RETURN count(rel)
  `);

  console.log(`  Relationships: ${rels.length}`);
}

// ─── Phase 4: Migrate Existing Edges ───────────────────────────
async function phase4(): Promise<void> {
  console.log("[migration] Phase 4: Migrating existing edges...");
  const db = getDb();
  const edges = await db.collection("edges").find({}).toArray();

  const typePrefix: Record<string, string> = {
    country: "country:", conflict: "conflict:", chokepoint: "choke:",
    nsa: "org:", base: "base:", "trade-route": "route:", port: "port:", news: "article:",
  };
  const relationMap: Record<string, string> = {
    involves: "PARTY_TO", "hosted-by": "LOCATED_IN", "operated-by": "OPERATED_BY",
    "depends-on": "DEPENDS_ON", "ally-of": "ALLIES_WITH", "rival-of": "HOSTILE_TO",
    "passes-through": "TRANSITS", "originates-at": "CONNECTS", "terminates-at": "CONNECTS",
    "port-in": "LOCATED_IN", "participates-in": "PARTY_TO", disrupts: "DISRUPTS",
    mentions: "MENTIONS",
  };

  const mappedEdges = edges
    .map((e) => {
      const fromPrefix = typePrefix[e.from?.type] ?? "";
      const toPrefix = typePrefix[e.to?.type] ?? "";
      const relation = relationMap[e.relation] ?? (e.relation as string)?.toUpperCase();
      if (!fromPrefix || !toPrefix || !relation) return null;
      return { from: `${fromPrefix}${e.from.id}`, to: `${toPrefix}${e.to.id}`, relation, weight: e.weight ?? 0.5 };
    })
    .filter(Boolean) as { from: string; to: string; relation: string; weight: number }[];

  await batchWrite(mappedEdges, `
    UNWIND $batch AS r
    MATCH (a:Entity {id: r.from})
    MATCH (b:Entity {id: r.to})
    CALL apoc.merge.relationship(a, r.relation, {weight: r.weight, confidence: 1.0, source: "seed", sourceCount: 1, firstSeen: datetime(), lastUpdated: datetime()}, {}, b, {}) YIELD rel
    RETURN count(rel)
  `);

  console.log(`  Edges migrated: ${mappedEdges.length}`);
}

// ─── Phase 5: Aliases ──────────────────────────────────────────
async function phase5(): Promise<void> {
  console.log("[migration] Phase 5: Creating aliases...");
  const aliases: { alias: string; canonical: string }[] = [];

  for (const [canonical, aliasList] of Object.entries(ALIAS_MAP)) {
    for (const alias of aliasList) {
      aliases.push({ alias, canonical });
    }
  }

  // Also add ISO2 and name aliases for all countries from DB
  const db = getDb();
  const countries = await db.collection("countries").find({}).toArray();
  for (const c of countries) {
    const canonical = `country:${c._id}`;
    aliases.push({ alias: c.name as string, canonical });
    if (c.iso2) {
      aliases.push({ alias: c.iso2 as string, canonical });
      aliases.push({ alias: (c.iso2 as string).toLowerCase(), canonical });
    }
  }

  await batchWrite(aliases, `
    UNWIND $batch AS a
    MERGE (al:Alias {alias: a.alias})
    ON CREATE SET al.canonical = a.canonical
  `);

  console.log(`  Aliases: ${aliases.length}`);
}

// ─── Phase 7: Validation ───────────────────────────────────────
async function phase7(): Promise<void> {
  console.log("[migration] Phase 7: Validation...");
  const db = getDb();

  const checks = [
    { label: "Country", collection: "countries" },
    { label: "Port", collection: "ports" },
    { label: "Chokepoint", collection: "chokepoints" },
    { label: "MilitaryBase", collection: "bases" },
    { label: "Organization", collection: "nonStateActors" },
    { label: "Conflict", collection: "conflicts" },
    { label: "Election", collection: "elections" },
    { label: "TradeRoute", collection: "tradeRoutes" },
    { label: "Article", collection: "news" },
  ];

  for (const { label, collection } of checks) {
    const mongoCount = await db.collection(collection).countDocuments();
    const neo4jResult = await writeTx(async (tx) => {
      const res = await tx.run(`MATCH (n:${label}) RETURN count(n) AS cnt`);
      return res.records[0]?.get("cnt")?.toNumber() ?? 0;
    });
    const status = mongoCount === neo4jResult ? "OK" : "MISMATCH";
    console.log(`  ${label}: MongoDB=${mongoCount}, Neo4j=${neo4jResult} [${status}]`);
  }

  // Claim count
  const claimCount = await writeTx(async (tx) => {
    const res = await tx.run(`MATCH (c:Claim) RETURN count(c) AS cnt`);
    return res.records[0]?.get("cnt")?.toNumber() ?? 0;
  });
  console.log(`  Claims: ${claimCount}`);

  // Relationship count
  const relCount = await writeTx(async (tx) => {
    const res = await tx.run(`MATCH ()-[r]->() RETURN count(r) AS cnt`);
    return res.records[0]?.get("cnt")?.toNumber() ?? 0;
  });
  console.log(`  Relationships: ${relCount}`);
}

// ─── Main ──────────────────────────────────────────────────────
export async function migrateToNeo4j(options?: { clean?: boolean }): Promise<void> {
  if (options?.clean) {
    console.log("[migration] --clean: wiping Neo4j data...");
    await writeTx(async (tx) => { await tx.run("MATCH (n) DETACH DELETE n"); });
  }

  // Ensure indexes exist before migration
  await ensureNeo4jSchema();

  console.log("[migration] Starting MongoDB → Neo4j migration...");
  const now = new Date().toISOString(); // capture at runtime, not import time
  const start = Date.now();

  await phase1(now);
  const { claims } = await phase2(now);
  await phase2_5(claims);
  await phase3();
  await phase4();
  await phase5();
  // Phase 6 (indexes) handled by seed-neo4j-schema.ts on startup
  await phase7();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[migration] Complete in ${elapsed}s`);
}
