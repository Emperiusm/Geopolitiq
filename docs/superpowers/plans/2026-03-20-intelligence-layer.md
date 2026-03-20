# Intelligence Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Neo4j knowledge graph with claim-as-atom data model, a News/RSS agent pipeline powered by Claude Haiku + local embeddings, and the graph query API to serve intelligence to the frontend.

**Architecture:** Two parallel tracks — (1) Neo4j setup + migration of existing MongoDB data into graph nodes/claims/relationships, and (2) News/RSS agent pipeline with BullMQ queue, Haiku extraction, claim resolution, and local Ollama embeddings. They converge when the agent writes extracted intelligence into the same graph that holds migrated reference data. A new `/api/v1/graph/` API serves the graph to the frontend.

**Tech Stack:** Neo4j 5 Community (Cypher), BullMQ (Redis-backed queues), @anthropic-ai/sdk (Haiku), Ollama + mxbai-embed-large (local embeddings), Bun + Hono (existing API), MongoDB (existing), Redis (existing).

**Spec:** `docs/superpowers/specs/2026-03-20-intelligence-layer-design.md`

---

## File Structure

### New Files

```
api/src/
  infrastructure/
    neo4j.ts                  # Neo4j driver connection pool, typed Cypher helpers, graceful shutdown
    queue.ts                  # BullMQ queue definitions (ingest:news), rate limit config, DLQ
    graph-writer.ts           # Write claims + entities to Neo4j, claim resolution, SSE publication
    ollama.ts                 # Ollama embedding client (batch HTTP to /api/embed)

  agents/
    types.ts                  # ExtractionResult, ClaimResolution, GraphOperation interfaces
    confidence.ts             # Resolution score calculation, source tier multiplier mapping
    registry.ts               # Agent registry CRUD (MongoDB agent_registry collection)
    news-rss/
      fetcher.ts              # Refactored RSS fetch — pushes raw articles to BullMQ
      clusterer.ts            # Group articles by entity overlap within time window
      worker.ts               # BullMQ worker — orchestrates the extraction pipeline
      prompt.ts               # Haiku system prompts (single + cluster), output schema
      entity-resolver.ts      # Alias lookup → fuzzy match → vector similarity → create
      claim-generator.ts      # ExtractionResult → templated claims with fingerprints
      fallback.ts             # Regex-based extraction (same interface, lower confidence)

  modules/
    graph/
      index.ts                # Hono router mounting all graph sub-routes
      entity.ts               # GET /graph/entity/:id
      connections.ts          # GET /graph/entity/:id/connections
      claims.ts               # GET /graph/entity/:id/claims[/:topic]
      paths.ts                # GET /graph/paths
      search.ts               # GET /graph/search
      viewport.ts             # GET /graph/viewport
      recent.ts               # GET /graph/recent
      stats.ts                # GET /graph/stats
      disputed.ts             # GET /graph/claims/disputed
      scope.ts                # Team scope query builder

  seed/
    seed-neo4j-schema.ts      # Neo4j index/constraint creation (idempotent, runs on startup)
    seed-neo4j.ts             # Full migration script (phases 1-7)
    alias-map.ts              # Static entity alias definitions
    claim-templates.ts        # Claim content generation templates per topic
    claim-topics.ts           # Closed topic taxonomy

  scripts/
    init-ollama.sh            # Pull mxbai-embed-large model on first start
```

### Modified Files

```
api/package.json                              # Add neo4j-driver, bullmq, @anthropic-ai/sdk
api/src/index.ts                              # Mount /graph routes, add Neo4j/Ollama/BullMQ startup
api/src/types/index.ts                        # Add Neo4j-related type exports
api/src/infrastructure/sse.ts                 # New event types, buffer 100→1000, state:stale
api/src/infrastructure/source-tiers.ts        # Add TIER_MULTIPLIER export
api/src/modules/aggregate/graph.ts            # Rewrite to query Neo4j
api/src/modules/aggregate/bootstrap.ts        # Add graph stats + agent status
api/src/modules/aggregate/search.ts           # Delegate to Neo4j, MongoDB fallback
api/src/modules/periodic/news-aggregator.ts   # Refactor to push to BullMQ
docker-compose.yml                            # Add neo4j + ollama services
.env.example                                  # Add Neo4j, Anthropic, Ollama, agent env vars
.gitignore                                    # Ensure .env is ignored
```

---

## Task Dependency Graph

```
Task 1 (Docker + deps)
    ↓
Task 2 (Neo4j client) ──→ Task 4 (Schema)  ──→ Task 5 (Migration)
    ↓                                               ↓
Task 3 (Ollama client)                        Task 10 (Graph API) ──→ Task 12 (Bootstrap/Search)
    ↓                                               ↓
Task 6 (BullMQ + types)                       Task 11 (SSE expansion)
    ↓                                               ↓
Task 7 (Claim generator + templates)          Task 13 (Frontend wiring)
    ↓
Task 8 (Haiku extraction + prompts)
    ↓
Task 9 (Agent worker + graph writer)
    ↓
  converges with Task 5 (graph has reference data for entity resolution)
```

Tasks 1-5 (Track 1) and Tasks 6-9 (Track 2) can run in parallel after Task 1.

---

## Task 1: Docker Compose + Dependencies

**Files:**
- Modify: `docker-compose.yml`
- Modify: `api/package.json`
- Modify: `.env.example`
- Create: `api/src/scripts/init-ollama.sh`

- [ ] **Step 1: Add Neo4j and Ollama services to Docker Compose**

Add to `docker-compose.yml` after the `redis` service:

```yaml
  neo4j:
    image: neo4j:5-community
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j-data:/data
      - neo4j-backups:/backups
    environment:
      NEO4J_AUTH: neo4j/gambit-dev
      NEO4J_PLUGINS: '["apoc"]'
      NEO4J_server_memory_heap_initial__size: 512m
      NEO4J_server_memory_heap_max__size: 1g
      NEO4J_server_memory_pagecache_size: 512m
      NEO4J_db_tx__timeout: 30s

  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-models:/root/.ollama
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
    environment:
      OLLAMA_KEEP_ALIVE: "-1"
      OLLAMA_NUM_GPU: "99"

  bullmq-dashboard:
    image: taskforcesh/bullmq-dashboard
    ports:
      - "3001:3001"
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379
```

Add to `volumes:` section:

```yaml
  neo4j-data:
  ollama-models:
  neo4j-backups:
```

- [ ] **Step 2: Add dependencies to api/package.json**

Run:
```bash
cd api && bun add neo4j-driver bullmq @anthropic-ai/sdk
```

Expected: 3 packages added to `dependencies` in `package.json`.

- [ ] **Step 3: Update .env.example with new variables**

Add to `.env.example`:

```bash
# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=gambit-dev

# Anthropic
ANTHROPIC_API_KEY=

# Ollama
OLLAMA_URL=http://localhost:11434

# Agent config
AGENT_NEWS_ENABLED=true
AGENT_NEWS_RATE_LIMIT=4
AGENT_NEWS_DAILY_TOKEN_BUDGET=500000
AGENT_NEWS_CLUSTER_WINDOW_HOURS=6
AGENT_NEWS_STALE_THRESHOLD_HOURS=24

# SSE (update existing)
SSE_BUFFER_SIZE=1000
```

- [ ] **Step 4: Create Ollama init script**

Create `api/src/scripts/init-ollama.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

OLLAMA_URL="${OLLAMA_URL:-http://ollama:11434}"
MODEL="mxbai-embed-large"

echo "Checking for $MODEL on $OLLAMA_URL..."

if curl -sf "$OLLAMA_URL/api/tags" | grep -q "$MODEL"; then
  echo "$MODEL already loaded."
else
  echo "Pulling $MODEL..."
  curl -X POST "$OLLAMA_URL/api/pull" -d "{\"name\": \"$MODEL\"}" --no-buffer
  echo "$MODEL pulled successfully."
fi
```

- [ ] **Step 5: Start services and verify**

Run:
```bash
docker compose up -d neo4j redis mongo ollama
```

Verify Neo4j: `curl http://localhost:7474` → should return Neo4j browser page.
Verify Ollama: `docker compose exec ollama curl http://localhost:11434/api/tags` → should return JSON.

- [ ] **Step 6: Pull embedding model**

Run:
```bash
docker compose exec ollama ollama pull mxbai-embed-large
```

Expected: Model downloads (~670MB), then `success` message.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml api/package.json api/bun.lock .env.example api/src/scripts/init-ollama.sh
git commit -m "feat: add Neo4j, Ollama, BullMQ infrastructure"
```

---

## Task 2: Neo4j Client Module

**Files:**
- Create: `api/src/infrastructure/neo4j.ts`

- [ ] **Step 1: Create Neo4j connection module**

Create `api/src/infrastructure/neo4j.ts`:

```typescript
import neo4j, { Driver, Session, ManagedTransaction } from "neo4j-driver";

let driver: Driver | null = null;

export async function connectNeo4j(): Promise<void> {
  const uri = process.env.NEO4J_URI ?? "bolt://localhost:7687";
  const user = process.env.NEO4J_USER ?? "neo4j";
  const password = process.env.NEO4J_PASSWORD ?? "gambit-dev";

  driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
    maxConnectionPoolSize: 50,
    connectionAcquisitionTimeout: 30_000,
  });

  await driver.verifyConnectivity();
  console.log(`[neo4j] connected to ${uri}`);
}

export function getDriver(): Driver {
  if (!driver) throw new Error("Neo4j not connected. Call connectNeo4j() first.");
  return driver;
}

export function isNeo4jConnected(): boolean {
  return driver !== null;
}

/** Run a read transaction and return the result records. */
export async function readTx<T>(
  work: (tx: ManagedTransaction) => Promise<T>,
  db?: string
): Promise<T> {
  const session = getDriver().session({ database: db ?? "neo4j" });
  try {
    return await session.executeRead(work);
  } finally {
    await session.close();
  }
}

/** Run a write transaction and return the result records. */
export async function writeTx<T>(
  work: (tx: ManagedTransaction) => Promise<T>,
  db?: string
): Promise<T> {
  const session = getDriver().session({ database: db ?? "neo4j" });
  try {
    return await session.executeWrite(work);
  } finally {
    await session.close();
  }
}

export async function closeNeo4j(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
    console.log("[neo4j] connection closed");
  }
}
```

- [ ] **Step 2: Verify module compiles**

Run:
```bash
cd api && bun build src/infrastructure/neo4j.ts --no-bundle
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add api/src/infrastructure/neo4j.ts
git commit -m "feat: add Neo4j client connection module"
```

---

## Task 3: Ollama Embedding Client

**Files:**
- Create: `api/src/infrastructure/ollama.ts`

- [ ] **Step 1: Create Ollama embedding client**

Create `api/src/infrastructure/ollama.ts`:

```typescript
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://ollama:11434";
const MODEL = "mxbai-embed-large";

let available = false;

export async function checkOllama(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!res.ok) return (available = false);
    const data = (await res.json()) as { models?: { name: string }[] };
    available = data.models?.some((m) => m.name.startsWith(MODEL)) ?? false;
    if (available) console.log(`[ollama] ${MODEL} ready`);
    else console.warn(`[ollama] ${MODEL} not found — embeddings disabled`);
    return available;
  } catch {
    console.warn("[ollama] unavailable — embeddings disabled");
    return (available = false);
  }
}

export function isOllamaAvailable(): boolean {
  return available;
}

/** Embed a single text string. Returns 1024-dim float array or null if unavailable. */
export async function embed(text: string): Promise<number[] | null> {
  if (!available) return null;
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, input: text }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { embeddings: number[][] };
    return data.embeddings[0] ?? null;
  } catch {
    return null;
  }
}

/** Batch embed multiple text strings. Returns array of 1024-dim vectors (null for failures). */
export async function embedBatch(texts: string[]): Promise<(number[] | null)[]> {
  if (!available || texts.length === 0) return texts.map(() => null);
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, input: texts }),
    });
    if (!res.ok) return texts.map(() => null);
    const data = (await res.json()) as { embeddings: number[][] };
    return texts.map((_, i) => data.embeddings[i] ?? null);
  } catch {
    return texts.map(() => null);
  }
}
```

- [ ] **Step 2: Verify module compiles**

Run:
```bash
cd api && bun build src/infrastructure/ollama.ts --no-bundle
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add api/src/infrastructure/ollama.ts
git commit -m "feat: add Ollama embedding client for mxbai-embed-large"
```

---

## Task 4: Neo4j Schema Init

**Files:**
- Create: `api/src/seed/seed-neo4j-schema.ts`
- Create: `api/src/seed/claim-topics.ts`

- [ ] **Step 1: Create claim topic taxonomy**

Create `api/src/seed/claim-topics.ts`:

```typescript
/** Closed taxonomy of claim topics. Haiku extraction is constrained to this list. */
export const CLAIM_TOPICS = [
  "risk", "leadership", "status", "casualties", "population", "gdp",
  "situation", "situation_cause", "situation_forecast",
  "alliance", "hostility", "sanctions_status",
  "enrichment", "nuclear_capability", "military_activity",
  "trade_volume", "oil_volume", "gas_volume", "traffic",
  "strength", "ideology", "territory", "revenue", "funding", "activities",
  "election_result", "strategic_assessment",
  "attribution", "severity",
] as const;

export type ClaimTopic = (typeof CLAIM_TOPICS)[number];
```

- [ ] **Step 2: Create schema init script**

Create `api/src/seed/seed-neo4j-schema.ts`:

```typescript
import { writeTx } from "../infrastructure/neo4j";

/**
 * Creates all Neo4j indexes and constraints. Idempotent — safe to run on every startup.
 * Neo4j Community Edition: no composite range indexes, per-label spatial indexes.
 */
export async function ensureNeo4jSchema(): Promise<void> {
  console.log("[neo4j] ensuring schema...");

  const statements = [
    // Entity lookups (via secondary :Entity label on all entity nodes)
    `CREATE INDEX entity_id IF NOT EXISTS FOR (n:Entity) ON (n.id)`,
    `CREATE INDEX entity_type IF NOT EXISTS FOR (n:Entity) ON (n.type)`,

    // Claim queries
    `CREATE INDEX claim_fingerprint IF NOT EXISTS FOR (n:Claim) ON (n.fingerprint)`,
    `CREATE INDEX claim_topic IF NOT EXISTS FOR (n:Claim) ON (n.topic)`,
    `CREATE INDEX claim_status IF NOT EXISTS FOR (n:Claim) ON (n.status)`,
    `CREATE INDEX claim_confidence IF NOT EXISTS FOR (n:Claim) ON (n.confidence)`,

    // Alias resolution
    `CREATE INDEX alias_lookup IF NOT EXISTS FOR (n:Alias) ON (n.alias)`,

    // Event sourcing
    `CREATE INDEX event_timestamp IF NOT EXISTS FOR (n:GraphEvent) ON (n.timestamp)`,

    // Spatial (per-label for types that carry location)
    `CREATE POINT INDEX country_location IF NOT EXISTS FOR (n:Country) ON (n.location)`,
    `CREATE POINT INDEX base_location IF NOT EXISTS FOR (n:MilitaryBase) ON (n.location)`,
    `CREATE POINT INDEX conflict_location IF NOT EXISTS FOR (n:Conflict) ON (n.location)`,
    `CREATE POINT INDEX chokepoint_location IF NOT EXISTS FOR (n:Chokepoint) ON (n.location)`,
    `CREATE POINT INDEX election_location IF NOT EXISTS FOR (n:Election) ON (n.location)`,
    `CREATE POINT INDEX port_location IF NOT EXISTS FOR (n:Port) ON (n.location)`,

    // Fulltext search
    `CREATE FULLTEXT INDEX entity_search IF NOT EXISTS FOR (n:Entity) ON EACH [n.label]`,
    `CREATE FULLTEXT INDEX claim_search IF NOT EXISTS FOR (n:Claim) ON EACH [n.content]`,

    // Vector similarity
    `CREATE VECTOR INDEX claim_embedding IF NOT EXISTS FOR (n:Claim) ON (n.embedding)
     OPTIONS {indexConfig: {\`vector.dimensions\`: 1024, \`vector.similarity_function\`: 'cosine'}}`,
  ];

  for (const stmt of statements) {
    try {
      await writeTx(async (tx) => { await tx.run(stmt); });
    } catch (err: any) {
      // Ignore "already exists" errors, log others
      if (!err.message?.includes("already exists")) {
        console.warn(`[neo4j] schema warning: ${err.message}`);
      }
    }
  }

  console.log("[neo4j] schema ready");
}
```

- [ ] **Step 3: Verify modules compile**

Run:
```bash
cd api && bun build src/seed/seed-neo4j-schema.ts --no-bundle && bun build src/seed/claim-topics.ts --no-bundle
```

Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add api/src/seed/seed-neo4j-schema.ts api/src/seed/claim-topics.ts
git commit -m "feat: add Neo4j schema init + claim topic taxonomy"
```

---

## Task 5: Migration Script

**Files:**
- Create: `api/src/seed/alias-map.ts`
- Create: `api/src/seed/claim-templates.ts`
- Create: `api/src/seed/seed-neo4j.ts`

This is a large task. Each phase of the migration is a step.

- [ ] **Step 1: Create alias map**

Create `api/src/seed/alias-map.ts`:

```typescript
/**
 * Static alias map for entity resolution. Maps alternate names to canonical IDs.
 * Extended by agents over time.
 */
export const ALIAS_MAP: Record<string, string[]> = {
  // Countries — key is canonical ID (country:{slug}), values are aliases
  "country:united-states": ["United States", "United States of America", "USA", "US", "America"],
  "country:iran": ["Iran", "Islamic Republic of Iran", "IR", "Persia"],
  "country:russia": ["Russia", "Russian Federation", "RU"],
  "country:china": ["China", "People's Republic of China", "PRC", "CN"],
  "country:israel": ["Israel", "IL", "State of Israel"],
  "country:ukraine": ["Ukraine", "UA"],
  "country:north-korea": ["North Korea", "DPRK", "KP"],
  "country:south-korea": ["South Korea", "ROK", "KR"],
  "country:united-kingdom": ["United Kingdom", "UK", "GB", "Britain", "Great Britain"],
  "country:saudi-arabia": ["Saudi Arabia", "SA", "KSA", "Kingdom of Saudi Arabia"],
  "country:turkey": ["Turkey", "Turkiye", "TR", "Republic of Turkey"],
  "country:india": ["India", "IN", "Republic of India"],
  "country:pakistan": ["Pakistan", "PK"],
  "country:japan": ["Japan", "JP"],
  "country:germany": ["Germany", "DE", "Federal Republic of Germany"],
  "country:france": ["France", "FR"],
  "country:syria": ["Syria", "SY", "Syrian Arab Republic"],
  "country:iraq": ["Iraq", "IQ"],
  "country:yemen": ["Yemen", "YE"],
  "country:lebanon": ["Lebanon", "LB"],
  "country:egypt": ["Egypt", "EG"],
  "country:taiwan": ["Taiwan", "TW", "Republic of China", "ROC"],

  // Organizations
  "org:hezbollah": ["Hezbollah", "Hizballah", "Hizbollah", "Party of God"],
  "org:hamas": ["Hamas", "Islamic Resistance Movement"],
  "org:isis": ["ISIS", "ISIL", "Islamic State", "Daesh", "IS"],
  "org:houthis": ["Houthis", "Ansar Allah", "Houthi"],
  "org:taliban": ["Taliban", "Islamic Emirate of Afghanistan"],
  "org:nato": ["NATO", "North Atlantic Treaty Organization"],
  "org:opec": ["OPEC", "Organization of Petroleum Exporting Countries"],
  "org:eu": ["EU", "European Union"],
  "org:un": ["UN", "United Nations"],
  "org:iaea": ["IAEA", "International Atomic Energy Agency"],
  "org:wagner": ["Wagner", "Wagner Group", "PMC Wagner"],
};
```

- [ ] **Step 2: Create claim templates**

Create `api/src/seed/claim-templates.ts`:

```typescript
import type { ClaimTopic } from "./claim-topics";

type TemplateArgs = { entity: string; value: string; party?: string };

const templates: Record<ClaimTopic, (a: TemplateArgs) => string> = {
  risk: ({ entity, value }) => `${entity} risk level is ${value}`,
  leadership: ({ entity, value }) => `${value} is leader of ${entity}`,
  status: ({ entity, value }) => `${entity} status is ${value}`,
  casualties: ({ entity, value, party }) =>
    party ? `${entity}: ${party} casualties are ${value}` : `${entity} casualties: ${value}`,
  population: ({ entity, value }) => `${entity} population is ${value}`,
  gdp: ({ entity, value }) => `${entity} GDP is ${value}`,
  situation: ({ entity, value }) => `${entity} situation: ${value}`,
  situation_cause: ({ entity, value }) => `${entity} situation cause: ${value}`,
  situation_forecast: ({ entity, value }) => `${entity} forecast: ${value}`,
  alliance: ({ entity, value }) => `${entity} is allied with ${value}`,
  hostility: ({ entity, value }) => `${entity} is hostile to ${value}`,
  sanctions_status: ({ entity, value }) => `${entity} sanctions status: ${value}`,
  enrichment: ({ entity, value }) => `${entity} enrichment level: ${value}`,
  nuclear_capability: ({ entity, value }) => `${entity} nuclear capability: ${value}`,
  military_activity: ({ entity, value }) => `${entity} military activity: ${value}`,
  trade_volume: ({ entity, value }) => `${entity} trade volume: ${value}`,
  oil_volume: ({ entity, value }) => `${entity} oil volume: ${value}`,
  gas_volume: ({ entity, value }) => `${entity} gas volume: ${value}`,
  traffic: ({ entity, value }) => `${entity} traffic: ${value}`,
  strength: ({ entity, value }) => `${entity} strength: ${value}`,
  ideology: ({ entity, value }) => `${entity} ideology: ${value}`,
  territory: ({ entity, value }) => `${entity} territory: ${value}`,
  revenue: ({ entity, value }) => `${entity} revenue: ${value}`,
  funding: ({ entity, value }) => `${entity} funding: ${value}`,
  activities: ({ entity, value }) => `${entity} activities: ${value}`,
  election_result: ({ entity, value }) => `${entity} election result: ${value}`,
  strategic_assessment: ({ entity, value }) => `${entity} strategic assessment: ${value}`,
  attribution: ({ entity, value }) => `${entity} attribution: ${value}`,
  severity: ({ entity, value }) => `${entity} severity: ${value}`,
};

export function generateClaimContent(topic: ClaimTopic, args: TemplateArgs): string {
  const fn = templates[topic];
  return fn(args);
}

export function claimFingerprint(topic: string, content: string, aboutEntity: string): string {
  const normalized = content.toLowerCase().trim();
  const raw = `${topic}:${normalized}:${aboutEntity}`;
  return new Bun.CryptoHasher("sha256").update(raw).digest("hex").slice(0, 16);
}
```

- [ ] **Step 3: Create the migration script**

Create `api/src/seed/seed-neo4j.ts`. This is the largest single file. It implements Phases 1–7 from the spec.

```typescript
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
    lookup.set(c._id, canonical);                              // slug
    lookup.set(c.name?.toLowerCase(), canonical);               // full name
    if (c.iso2) {
      lookup.set(c.iso2.toLowerCase(), canonical);              // ISO2
      lookup.set(c.iso2.toUpperCase(), canonical);
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
async function phase1(): Promise<void> {
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
    color: null, // will be set from countryColors
    confidence: 1.0,
    source: "seed",
    firstSeen: now,
    lastUpdated: now,
  }));

  // Load country colors
  const colorDocs = await db.collection("countryColors").find({}).toArray();
  const colorMap = new Map(colorDocs.map((d) => [d._id, d.color]));
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
      lat: c.lat, lng: c.lng, startDate: c.startDate?.toISOString() ?? null,
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
}

// ─── Phase 2: Seed Claims ──────────────────────────────────────
async function phase2(): Promise<{ claims: { content: string; id: string }[] }> {
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
    if (c.risk) makeClaim(eid, "risk", c.name, c.risk);
    if (c.leader) makeClaim(eid, "leadership", c.name, c.leader);
    if (c.pop) makeClaim(eid, "population", c.name, c.pop);
    if (c.gdp) makeClaim(eid, "gdp", c.name, c.gdp);
    if (c.analysis?.what) makeClaim(eid, "situation", c.name, c.analysis.what);
    if (c.analysis?.why) makeClaim(eid, "situation_cause", c.name, c.analysis.why);
    if (c.analysis?.next) makeClaim(eid, "situation_forecast", c.name, c.analysis.next);
  }

  // Conflicts
  const conflicts = await db.collection("conflicts").find({}).toArray();
  for (const c of conflicts) {
    const eid = `conflict:${c._id}`;
    if (c.status) makeClaim(eid, "status", c.title, c.status);
    if (c.latestUpdate) makeClaim(eid, "situation", c.title, c.latestUpdate);
    if (c.casualties) {
      for (const cas of c.casualties) {
        if (cas.party && cas.figure) {
          makeClaim(eid, "casualties", c.title, cas.figure, { party: cas.party });
        }
      }
    }
  }

  // Chokepoints
  const chokepoints = await db.collection("chokepoints").find({}).toArray();
  for (const c of chokepoints) {
    const eid = `choke:${c._id}`;
    if (c.status) makeClaim(eid, "status", c.name, c.status);
    if (c.dailyVessels) makeClaim(eid, "traffic", c.name, c.dailyVessels);
    if (c.oilVolume) makeClaim(eid, "oil_volume", c.name, c.oilVolume);
    if (c.gasVolume) makeClaim(eid, "gas_volume", c.name, c.gasVolume);
    if (c.strategicSummary) makeClaim(eid, "strategic_assessment", c.name, c.strategicSummary);
  }

  // NSA
  const nsa = await db.collection("nonStateActors").find({}).toArray();
  for (const o of nsa) {
    const eid = `org:${o._id}`;
    if (o.status) makeClaim(eid, "status", o.name, o.status);
    if (o.strength) makeClaim(eid, "strength", o.name, o.strength);
    if (o.ideology) makeClaim(eid, "ideology", o.name, o.ideology);
    if (o.revenue) makeClaim(eid, "revenue", o.name, o.revenue);
    if (o.activities) makeClaim(eid, "activities", o.name, o.activities);
    if (o.territory) makeClaim(eid, "territory", o.name, o.territory);
    if (o.funding) makeClaim(eid, "funding", o.name, o.funding);
    if (o.leaders) makeClaim(eid, "leadership", o.name, o.leaders);
  }

  // Trade routes
  const routes = await db.collection("tradeRoutes").find({}).toArray();
  for (const r of routes) {
    const eid = `route:${r._id}`;
    if (r.status) makeClaim(eid, "status", r.name, r.status);
    if (r.volumeDesc) makeClaim(eid, "trade_volume", r.name, r.volumeDesc);
  }

  // Elections
  const elections = await db.collection("elections").find({}).toArray();
  for (const e of elections) {
    const eid = `election:${e._id}`;
    if (e.winner) makeClaim(eid, "election_result", `${e.country} election`, e.winner);
    if (e.result) makeClaim(eid, "election_result", `${e.country} election`, e.result);
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
  return { claims: allClaims.map((c) => ({ content: c.content, id: c.id })) };
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
    for (const ref of c.relatedCountries ?? []) {
      const target = resolveCountry(lookup, ref);
      if (target) rels.push({ from: `conflict:${c._id}`, to: target, relation: "PARTY_TO", weight: 1.0 });
    }
  }

  // Bases → Countries
  const bases = await db.collection("bases").find({}).toArray();
  for (const b of bases) {
    if (b.operatingCountry || b.country) {
      const op = resolveCountry(lookup, b.operatingCountry ?? b.country);
      if (op) rels.push({ from: `base:${b._id}`, to: op, relation: "OPERATED_BY", weight: 1.0 });
    }
    if (b.hostNation) {
      const host = resolveCountry(lookup, b.hostNation);
      if (host) rels.push({ from: `base:${b._id}`, to: host, relation: "LOCATED_IN", weight: 1.0 });
    }
  }

  // NSA → Countries (allies/rivals)
  const nsa = await db.collection("nonStateActors").find({}).toArray();
  for (const o of nsa) {
    for (const ally of o.allies ?? []) {
      const target = resolveCountry(lookup, ally);
      if (target) rels.push({ from: `org:${o._id}`, to: target, relation: "ALLIES_WITH", weight: 0.8 });
    }
    for (const rival of o.rivals ?? []) {
      const target = resolveCountry(lookup, rival);
      if (target) rels.push({ from: `org:${o._id}`, to: target, relation: "HOSTILE_TO", weight: 0.8 });
    }
  }

  // Trade routes → Ports, Chokepoints
  const routes = await db.collection("tradeRoutes").find({}).toArray();
  for (const r of routes) {
    if (r.from) rels.push({ from: `route:${r._id}`, to: `port:${r.from}`, relation: "CONNECTS", weight: 1.0 });
    if (r.to) rels.push({ from: `route:${r._id}`, to: `port:${r.to}`, relation: "CONNECTS", weight: 1.0 });
    for (const wp of r.waypoints ?? []) {
      rels.push({ from: `route:${r._id}`, to: `choke:${wp}`, relation: "TRANSITS", weight: 1.0 });
    }
  }

  // Chokepoints → Countries (dependentCountries)
  const chokepoints = await db.collection("chokepoints").find({}).toArray();
  for (const c of chokepoints) {
    for (const dep of c.dependentCountries ?? []) {
      const target = resolveCountry(lookup, dep);
      if (target) rels.push({ from: target, to: `choke:${c._id}`, relation: "DEPENDS_ON", weight: 0.7 });
    }
  }

  // Elections → Countries
  const elections = await db.collection("elections").find({}).toArray();
  for (const e of elections) {
    const target = resolveCountry(lookup, e.countryISO2 ?? e.country);
    if (target) rels.push({ from: `election:${e._id}`, to: target, relation: "HELD_IN", weight: 1.0 });
  }

  // Ports → Countries
  const ports = await db.collection("ports").find({}).toArray();
  for (const p of ports) {
    if (p.country) {
      const target = resolveCountry(lookup, p.country);
      if (target) rels.push({ from: `port:${p._id}`, to: target, relation: "LOCATED_IN", weight: 1.0 });
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
      const relation = relationMap[e.relation] ?? e.relation?.toUpperCase();
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
    aliases.push({ alias: c.name, canonical });
    if (c.iso2) {
      aliases.push({ alias: c.iso2, canonical });
      aliases.push({ alias: c.iso2.toLowerCase(), canonical });
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

  await phase1();
  const { claims } = await phase2();
  await phase2_5(claims);
  await phase3();
  await phase4();
  await phase5();
  // Phase 6 (indexes) handled by seed-neo4j-schema.ts on startup
  await phase7();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[migration] Complete in ${elapsed}s`);
}
```

- [ ] **Step 4: Verify migration script compiles**

Run:
```bash
cd api && bun build src/seed/seed-neo4j.ts --no-bundle
```

Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add api/src/seed/alias-map.ts api/src/seed/claim-templates.ts api/src/seed/seed-neo4j.ts
git commit -m "feat: add Neo4j migration script with claim-as-atom model"
```

- [ ] **Step 6: Wire startup + run migration**

Modify `api/src/index.ts` to add Neo4j and Ollama to the startup sequence. After the existing `connectMongo()` and `connectRedis()` calls, add:

```typescript
import { connectNeo4j, closeNeo4j, isNeo4jConnected } from "./infrastructure/neo4j";
import { checkOllama } from "./infrastructure/ollama";
import { ensureNeo4jSchema } from "./seed/seed-neo4j-schema";

// In startup sequence, after Redis:
try {
  await connectNeo4j();
  await ensureNeo4jSchema();
} catch (err) {
  console.warn("[startup] Neo4j unavailable — graph features disabled", err);
}

try {
  await checkOllama();
} catch (err) {
  console.warn("[startup] Ollama unavailable — embeddings disabled", err);
}
```

Add graceful shutdown:
```typescript
process.on("SIGTERM", async () => {
  await closeNeo4j();
  process.exit(0);
});
```

- [ ] **Step 7: Run migration manually**

Create a one-off runner script or add to seed routes. Then run:

```bash
cd api && bun run src/seed/seed-neo4j.ts
```

Or expose via the existing admin seed route. Verify in Neo4j Browser at `http://localhost:7474`:

```cypher
MATCH (n) RETURN labels(n), count(n);
MATCH ()-[r]->() RETURN type(r), count(r);
MATCH (c:Claim) RETURN c.topic, count(c);
```

Expected: Node counts match MongoDB, claims created for all mutable fields, relationships link entities.

- [ ] **Step 8: Commit startup wiring**

```bash
git add api/src/index.ts
git commit -m "feat: wire Neo4j + Ollama into API startup sequence"
```

---

## Task 6: Agent Types + BullMQ Setup

**Files:**
- Create: `api/src/agents/types.ts`
- Create: `api/src/agents/confidence.ts`
- Create: `api/src/infrastructure/queue.ts`
- Modify: `api/src/infrastructure/source-tiers.ts`

- [ ] **Step 1: Create shared agent types**

Create `api/src/agents/types.ts`:

```typescript
import type { ClaimTopic } from "../seed/claim-topics";

export interface ExtractionResult {
  entities: {
    type: "country" | "person" | "organization" | "event" |
          "sanction" | "treaty" | "military_base" | "vessel";
    name: string;
    role?: string;
    confidence: number;
  }[];
  claims: {
    content: string;
    topic: ClaimTopic;
    aboutEntity: string;
    confidence: number;
  }[];
  relationships: {
    from: string;
    to: string;
    relation: string;
    confidence: number;
  }[];
  eventSummary: string;
  escalationSignal: "escalating" | "de-escalating" | "stable";
}

export interface ClaimNode {
  id: string;
  fingerprint: string;
  content: string;
  topic: ClaimTopic;
  confidence: number;
  status: "active" | "superseded" | "disputed" | "retracted";
  sourceCount: number;
  embedding: number[] | null;
  extractedAt: string;
  agentId: string;
  aboutEntity: string;
}

export interface ClaimResolution {
  action: "created" | "merged" | "superseded" | "disputed" | "corroborated";
  claimId: string;
  aboutEntity: string;
  topic: ClaimTopic;
  oldClaimId?: string;
}

export interface GraphBatchEvent {
  agentId: string;
  entities: { id: string; type: string; label: string; action: "created" | "merged" }[];
  claims: { id: string; topic: string; aboutEntity: string; status: string; action: string }[];
  edges: { from: string; to: string; relation: string; action: "created" | "updated" }[];
  beliefChanges: { entityId: string; topic: string; oldClaimId?: string; newClaimId: string }[];
}
```

- [ ] **Step 2: Create confidence calculator**

Create `api/src/agents/confidence.ts`:

```typescript
import type { SourceTier } from "../types";

export const TIER_MULTIPLIER: Record<SourceTier, number> = {
  primary: 1.0,
  established: 0.9,
  specialized: 0.85,
  regional: 0.75,
  aggregator: 0.5,
  unknown: 0.4,
};

export function adjustConfidence(rawConfidence: number, tier: SourceTier): number {
  return Math.min(1.0, Math.max(0.0, rawConfidence * TIER_MULTIPLIER[tier]));
}

export function resolutionScore(confidence: number, tier: SourceTier, sourceCount: number): number {
  return confidence * TIER_MULTIPLIER[tier] * Math.log2(sourceCount + 1);
}
```

- [ ] **Step 3: Add TIER_MULTIPLIER export to existing source-tiers.ts**

Modify `api/src/infrastructure/source-tiers.ts` — add at the end of the file:

```typescript
export { TIER_MULTIPLIER } from "../agents/confidence";
```

- [ ] **Step 4: Create BullMQ queue setup**

Create `api/src/infrastructure/queue.ts`:

```typescript
import { Queue, Worker, type Job, type WorkerOptions } from "bullmq";
import Redis from "ioredis";

const queues = new Map<string, Queue>();
const workers = new Map<string, Worker>();

/** BullMQ requires maxRetriesPerRequest: null for blocking commands. */
function createBullMQConnection(): Redis {
  return new Redis(process.env.REDIS_URL ?? "redis://localhost:6380", {
    maxRetriesPerRequest: null,
  });
}

export function getOrCreateQueue(name: string): Queue {
  if (queues.has(name)) return queues.get(name)!;
  const queue = new Queue(name, {
    connection: createBullMQConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 86400 },
      removeOnFail: false,
    },
  });
  queues.set(name, queue);
  return queue;
}

export function registerWorker(
  queueName: string,
  processor: (job: Job) => Promise<void>,
  opts?: Partial<WorkerOptions>
): Worker {
  const worker = new Worker(queueName, processor, {
    connection: createBullMQConnection(),
    concurrency: 1,
    ...opts,
  });

  worker.on("failed", (job, err) => {
    console.error(`[queue:${queueName}] job ${job?.id} failed:`, err.message);
  });
  worker.on("completed", (job) => {
    console.log(`[queue:${queueName}] job ${job.id} completed`);
  });

  workers.set(queueName, worker);
  return worker;
}

export async function closeAllQueues(): Promise<void> {
  for (const [name, worker] of workers) {
    await worker.close();
    console.log(`[queue] worker ${name} closed`);
  }
  for (const [name, queue] of queues) {
    await queue.close();
    console.log(`[queue] queue ${name} closed`);
  }
}
```

- [ ] **Step 5: Verify all compile**

Run:
```bash
cd api && bun build src/agents/types.ts --no-bundle && bun build src/agents/confidence.ts --no-bundle && bun build src/infrastructure/queue.ts --no-bundle
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add api/src/agents/types.ts api/src/agents/confidence.ts api/src/infrastructure/queue.ts api/src/infrastructure/source-tiers.ts
git commit -m "feat: add agent types, confidence scoring, BullMQ queue setup"
```

---

## Task 7: Claim Generator + Haiku Prompts

**Files:**
- Create: `api/src/agents/news-rss/prompt.ts`
- Create: `api/src/agents/news-rss/claim-generator.ts`
- Create: `api/src/agents/news-rss/fallback.ts`

- [ ] **Step 1: Create Haiku prompt templates**

Create `api/src/agents/news-rss/prompt.ts`:

```typescript
import { CLAIM_TOPICS } from "../../seed/claim-topics";

const ENTITY_TYPES = ["country", "person", "organization", "event", "sanction", "treaty", "military_base", "vessel"];

const RESPONSE_SCHEMA = `{
  "entities": [{"type": string, "name": string, "role"?: string, "confidence": number}],
  "claims": [{"content": string, "topic": string, "aboutEntity": string, "confidence": number}],
  "relationships": [{"from": string, "to": string, "relation": string, "confidence": number}],
  "eventSummary": string,
  "escalationSignal": "escalating" | "de-escalating" | "stable"
}`;

export function buildSinglePrompt(entityContext: string): string {
  return `You are a geopolitical intelligence analyst extracting structured data from news articles.

ENTITY TYPES: ${ENTITY_TYPES.join(", ")}
CLAIM TOPICS (use ONLY these): ${CLAIM_TOPICS.join(", ")}
KNOWN ENTITIES:
${entityContext}

INSTRUCTIONS:
1. Extract all geopolitically relevant entities mentioned in the article.
2. For each factual assertion in the article, create a CLAIM with:
   - content: a clear, self-contained statement (one idea only)
   - topic: from the allowed list above
   - aboutEntity: the entity name this claim is about
   - confidence: 0.0-1.0 based on how clearly the article states this
3. Extract relationships between entities (SANCTIONS, ATTACKS, ALLIES_WITH, SUPPLIES, etc.)
4. Provide a one-line event summary and escalation signal.

Match entity names against KNOWN ENTITIES where possible.
Output ONLY valid JSON matching this schema:
${RESPONSE_SCHEMA}`;
}

export function buildClusterPrompt(entityContext: string): string {
  return `You are a geopolitical intelligence analyst synthesizing intelligence from multiple news sources covering the same event.

ENTITY TYPES: ${ENTITY_TYPES.join(", ")}
CLAIM TOPICS (use ONLY these): ${CLAIM_TOPICS.join(", ")}
KNOWN ENTITIES:
${entityContext}

INSTRUCTIONS:
1. These articles cover the same event from different sources. Synthesize a unified extraction.
2. Where sources agree, assign higher confidence.
3. Where sources disagree, note both claims with appropriate confidence.
4. Extract entities, claims, and relationships as a unified view across all sources.
5. Match entity names against KNOWN ENTITIES where possible.

Output ONLY valid JSON matching this schema:
${RESPONSE_SCHEMA}`;
}

export function buildEntityContext(
  countries: { name: string; iso2: string }[],
  orgs: { name: string }[],
  conflicts: { title: string }[]
): string {
  const lines: string[] = [];
  lines.push("Countries: " + countries.map((c) => `${c.name} (${c.iso2})`).join(", "));
  lines.push("Organizations: " + orgs.map((o) => o.name).join(", "));
  lines.push("Active conflicts: " + conflicts.map((c) => c.title).join(", "));
  return lines.join("\n");
}
```

- [ ] **Step 2: Create claim generator**

Create `api/src/agents/news-rss/claim-generator.ts`:

```typescript
import type { ExtractionResult, ClaimNode } from "../types";
import type { ClaimTopic } from "../../seed/claim-topics";
import { CLAIM_TOPICS } from "../../seed/claim-topics";
import { claimFingerprint } from "../../seed/claim-templates";

const validTopics = new Set<string>(CLAIM_TOPICS);

export function generateClaims(
  extraction: ExtractionResult,
  agentId: string,
  articleIds: string[]
): ClaimNode[] {
  const claims: ClaimNode[] = [];

  for (const raw of extraction.claims) {
    // Validate topic against closed taxonomy
    if (!validTopics.has(raw.topic)) continue;

    const fp = claimFingerprint(raw.topic, raw.content, raw.aboutEntity);

    claims.push({
      id: crypto.randomUUID(),
      fingerprint: fp,
      content: raw.content,
      topic: raw.topic as ClaimTopic,
      confidence: raw.confidence,
      status: "active",
      sourceCount: articleIds.length,
      embedding: null, // populated later by Ollama
      extractedAt: new Date().toISOString(),
      agentId,
      aboutEntity: raw.aboutEntity,
    });
  }

  return claims;
}
```

- [ ] **Step 3: Create regex fallback extraction**

Create `api/src/agents/news-rss/fallback.ts`:

```typescript
import type { ExtractionResult } from "../types";

/**
 * Regex-based extraction fallback when Haiku is unavailable.
 * Uses the existing entity dictionary patterns. Confidence capped at 0.6.
 */
export function regexExtract(
  title: string,
  summary: string,
  relatedCountries: string[],
  relatedChokepoints: string[],
  relatedNSA: string[]
): ExtractionResult {
  const entities = [
    ...relatedCountries.map((c) => ({
      type: "country" as const,
      name: c,
      confidence: 0.6,
    })),
    ...relatedNSA.map((o) => ({
      type: "organization" as const,
      name: o,
      confidence: 0.5,
    })),
  ];

  const claims = relatedCountries.map((c) => ({
    content: `${c} mentioned in: ${title}`,
    topic: "situation" as const,
    aboutEntity: c,
    confidence: 0.4,
  }));

  return {
    entities,
    claims,
    relationships: [],
    eventSummary: title,
    escalationSignal: "stable",
  };
}
```

- [ ] **Step 4: Commit**

```bash
git add api/src/agents/news-rss/prompt.ts api/src/agents/news-rss/claim-generator.ts api/src/agents/news-rss/fallback.ts
git commit -m "feat: add Haiku prompts, claim generator, regex fallback"
```

---

## Task 8: Haiku Extraction + Article Clustering

**Files:**
- Create: `api/src/agents/news-rss/clusterer.ts`
- Create: `api/src/agents/news-rss/entity-resolver.ts`

- [ ] **Step 1: Create article clusterer**

Create `api/src/agents/news-rss/clusterer.ts`:

```typescript
interface ArticleForClustering {
  _id: string;
  title: string;
  summary: string;
  relatedCountries: string[];
  relatedChokepoints: string[];
  relatedNSA: string[];
  publishedAt: Date;
  source?: string;
}

interface ArticleCluster {
  articles: ArticleForClustering[];
  sharedEntities: string[];
}

const CLUSTER_WINDOW_HOURS = Number(process.env.AGENT_NEWS_CLUSTER_WINDOW_HOURS ?? 6);

/**
 * Group articles sharing 2+ entity mentions within a time window.
 * Returns clusters (2+ articles) and solo articles (no cluster match).
 */
export function clusterArticles(
  articles: ArticleForClustering[]
): { clusters: ArticleCluster[]; solos: ArticleForClustering[] } {
  const windowMs = CLUSTER_WINDOW_HOURS * 60 * 60 * 1000;
  const used = new Set<string>();
  const clusters: ArticleCluster[] = [];

  for (let i = 0; i < articles.length; i++) {
    if (used.has(articles[i]._id)) continue;
    const a = articles[i];
    const aEntities = new Set([
      ...(a.relatedCountries ?? []),
      ...(a.relatedChokepoints ?? []),
      ...(a.relatedNSA ?? []),
    ]);

    const cluster: ArticleForClustering[] = [a];
    const shared = new Set<string>();

    for (let j = i + 1; j < articles.length; j++) {
      if (used.has(articles[j]._id)) continue;
      const b = articles[j];

      // Time window check
      const timeDiff = Math.abs(a.publishedAt.getTime() - b.publishedAt.getTime());
      if (timeDiff > windowMs) continue;

      // Entity overlap check
      const bEntities = [...(b.relatedCountries ?? []), ...(b.relatedChokepoints ?? []), ...(b.relatedNSA ?? [])];
      const overlap = bEntities.filter((e) => aEntities.has(e));
      if (overlap.length >= 2) {
        cluster.push(b);
        overlap.forEach((e) => shared.add(e));
        used.add(b._id);
      }
    }

    if (cluster.length > 1) {
      used.add(a._id);
      clusters.push({ articles: cluster, sharedEntities: [...shared] });
    }
  }

  const solos = articles.filter((a) => !used.has(a._id));
  return { clusters, solos };
}
```

- [ ] **Step 2: Create entity resolver**

Create `api/src/agents/news-rss/entity-resolver.ts`:

```typescript
import { readTx, writeTx } from "../../infrastructure/neo4j";

interface ResolvedEntity {
  id: string;
  label: string;
  isNew: boolean;
}

/**
 * Resolve an extracted entity name to an existing Neo4j node or create a new one.
 * Resolution order: alias exact match → fuzzy label match → create new.
 */
export async function resolveEntity(
  name: string,
  type: string,
  confidence: number,
  agentId: string
): Promise<ResolvedEntity> {
  // Step 1: Exact alias lookup
  const aliasResult = await readTx(async (tx) => {
    const res = await tx.run(
      `MATCH (a:Alias {alias: $name}) RETURN a.canonical AS canonical`,
      { name }
    );
    return res.records[0]?.get("canonical") as string | undefined;
  });

  if (aliasResult) {
    // Fetch the label for the resolved entity
    const label = await readTx(async (tx) => {
      const res = await tx.run(
        `MATCH (e:Entity {id: $id}) RETURN e.label AS label`,
        { id: aliasResult }
      );
      return res.records[0]?.get("label") as string ?? name;
    });
    return { id: aliasResult, label, isNew: false };
  }

  // Step 2: Fuzzy label match (case-insensitive)
  const fuzzyResult = await readTx(async (tx) => {
    const res = await tx.run(
      `MATCH (e:Entity)
       WHERE toLower(e.label) = toLower($name)
       RETURN e.id AS id, e.label AS label
       LIMIT 1`,
      { name }
    );
    if (res.records.length === 0) return null;
    return { id: res.records[0].get("id") as string, label: res.records[0].get("label") as string };
  });

  if (fuzzyResult) {
    // Create alias for future lookups
    await writeTx(async (tx) => {
      await tx.run(`MERGE (a:Alias {alias: $name}) ON CREATE SET a.canonical = $canonical`, {
        name,
        canonical: fuzzyResult.id,
      });
    });
    return { ...fuzzyResult, isNew: false };
  }

  // Step 3: Create new entity
  const labelMap: Record<string, string> = {
    country: "Country", person: "Person", organization: "Organization",
    event: "Event", sanction: "Sanction", treaty: "Treaty",
    military_base: "MilitaryBase", vessel: "Vessel",
  };
  const neoLabel = labelMap[type] ?? "Entity";
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const prefix = type === "organization" ? "org" : type;
  const id = `${prefix}:${slug}`;

  await writeTx(async (tx) => {
    await tx.run(
      `MERGE (e:${neoLabel}:Entity {id: $id})
       ON CREATE SET e.label = $label, e.type = $type, e.confidence = $confidence,
         e.source = "agent", e.firstSeen = datetime(), e.lastUpdated = datetime()`,
      { id, label: name, type, confidence }
    );
    // Create alias
    await tx.run(`MERGE (a:Alias {alias: $name}) ON CREATE SET a.canonical = $id`, { name, id });
  });

  return { id, label: name, isNew: true };
}
```

- [ ] **Step 3: Commit**

```bash
git add api/src/agents/news-rss/clusterer.ts api/src/agents/news-rss/entity-resolver.ts
git commit -m "feat: add article clusterer and entity resolver"
```

---

## Task 9: Graph Writer + Agent Worker

**Files:**
- Create: `api/src/infrastructure/graph-writer.ts`
- Create: `api/src/agents/news-rss/worker.ts`
- Create: `api/src/agents/news-rss/fetcher.ts`
- Create: `api/src/agents/registry.ts`

- [ ] **Step 1: Create graph writer (core claim resolution + SSE publication)**

Create `api/src/infrastructure/graph-writer.ts`:

```typescript
import { writeTx, readTx } from "./neo4j";
import { publishEvent } from "./sse";
import { embed } from "./ollama";
import type { ClaimNode, ClaimResolution, GraphBatchEvent } from "../agents/types";
import { resolutionScore } from "../agents/confidence";
import type { SourceTier } from "../types";

/**
 * Write a batch of claims to Neo4j with full claim resolution.
 * Handles dedup, supersession, contradiction, corroboration.
 * Publishes SSE events for all mutations.
 */
export async function writeClaimBatch(
  claims: ClaimNode[],
  articleIds: string[],
  agentId: string,
  sourceTier: SourceTier
): Promise<ClaimResolution[]> {
  const resolutions: ClaimResolution[] = [];
  const batchEvent: GraphBatchEvent = {
    agentId,
    entities: [],
    claims: [],
    edges: [],
    beliefChanges: [],
  };

  for (const claim of claims) {
    // Embed claim content
    const embedding = await embed(claim.content);
    claim.embedding = embedding;

    // Step 1: Fingerprint dedup
    const existing = await readTx(async (tx) => {
      const res = await tx.run(
        `MATCH (c:Claim {fingerprint: $fp}) RETURN c.id AS id, c.sourceCount AS sc`,
        { fp: claim.fingerprint }
      );
      return res.records[0] ?? null;
    });

    if (existing) {
      // Duplicate — increment source count, add SOURCED_FROM edges
      await writeTx(async (tx) => {
        await tx.run(
          `MATCH (c:Claim {fingerprint: $fp})
           SET c.sourceCount = c.sourceCount + $newSources`,
          { fp: claim.fingerprint, newSources: articleIds.length }
        );
        for (const artId of articleIds) {
          await tx.run(
            `MATCH (c:Claim {fingerprint: $fp})
             MATCH (a:Article:Entity {id: $artId})
             MERGE (c)-[:SOURCED_FROM]->(a)`,
            { fp: claim.fingerprint, artId: `article:${artId}` }
          );
        }
      });

      resolutions.push({
        action: "merged",
        claimId: existing.get("id"),
        aboutEntity: claim.aboutEntity,
        topic: claim.topic,
      });
      batchEvent.claims.push({
        id: existing.get("id"),
        topic: claim.topic,
        aboutEntity: claim.aboutEntity,
        status: "active",
        action: "merged",
      });
      continue;
    }

    // Step 2: Write new claim
    await writeTx(async (tx) => {
      await tx.run(
        `CREATE (c:Claim {
           id: $id, fingerprint: $fp, content: $content, topic: $topic,
           confidence: $conf, status: "active", sourceCount: $sc,
           embedding: $emb, extractedAt: datetime(), agentId: $agent
         })
         WITH c
         MATCH (e:Entity {id: $entity})
         MERGE (c)-[:ABOUT]->(e)`,
        {
          id: claim.id, fp: claim.fingerprint, content: claim.content,
          topic: claim.topic, conf: claim.confidence, sc: claim.sourceCount,
          emb: claim.embedding, agent: agentId, entity: claim.aboutEntity,
        }
      );

      // Add SOURCED_FROM edges
      for (const artId of articleIds) {
        await tx.run(
          `MATCH (c:Claim {id: $cid})
           MATCH (a:Article:Entity {id: $aid})
           MERGE (c)-[:SOURCED_FROM]->(a)`,
          { cid: claim.id, aid: `article:${artId}` }
        );
      }
    });

    // Step 3: Check CURRENT_BELIEF
    const currentBelief = await readTx(async (tx) => {
      const res = await tx.run(
        `MATCH (e:Entity {id: $entity})-[r:CURRENT_BELIEF {topic: $topic}]->(old:Claim)
         RETURN old.id AS oldId, old.confidence AS oldConf, old.sourceCount AS oldSc`,
        { entity: claim.aboutEntity, topic: claim.topic }
      );
      return res.records[0] ?? null;
    });

    if (!currentBelief) {
      // No existing belief — this claim becomes current
      await writeTx(async (tx) => {
        await tx.run(
          `MATCH (e:Entity {id: $entity})
           MATCH (c:Claim {id: $cid})
           MERGE (e)-[:CURRENT_BELIEF {topic: $topic}]->(c)`,
          { entity: claim.aboutEntity, cid: claim.id, topic: claim.topic }
        );
      });

      resolutions.push({ action: "created", claimId: claim.id, aboutEntity: claim.aboutEntity, topic: claim.topic });
      batchEvent.claims.push({ id: claim.id, topic: claim.topic, aboutEntity: claim.aboutEntity, status: "active", action: "created" });
      batchEvent.beliefChanges.push({ entityId: claim.aboutEntity, topic: claim.topic, newClaimId: claim.id });
    } else {
      const oldScore = resolutionScore(
        currentBelief.get("oldConf") ?? 0,
        sourceTier,
        currentBelief.get("oldSc")?.toNumber?.() ?? 1
      );
      const newScore = resolutionScore(claim.confidence, sourceTier, claim.sourceCount);

      if (newScore > oldScore) {
        // Supersede
        const oldId = currentBelief.get("oldId");
        await writeTx(async (tx) => {
          await tx.run(
            `MATCH (e:Entity {id: $entity})-[r:CURRENT_BELIEF {topic: $topic}]->()
             DELETE r
             WITH e
             MATCH (c:Claim {id: $cid})
             MERGE (e)-[:CURRENT_BELIEF {topic: $topic}]->(c)`,
            { entity: claim.aboutEntity, topic: claim.topic, cid: claim.id }
          );
          await tx.run(
            `MATCH (old:Claim {id: $oldId}) SET old.status = "superseded"
             WITH old
             MATCH (new:Claim {id: $newId})
             MERGE (new)-[:SUPERSEDES]->(old)`,
            { oldId, newId: claim.id }
          );
        });

        resolutions.push({ action: "superseded", claimId: claim.id, aboutEntity: claim.aboutEntity, topic: claim.topic, oldClaimId: oldId });
        batchEvent.claims.push({ id: claim.id, topic: claim.topic, aboutEntity: claim.aboutEntity, status: "active", action: "superseded" });
        batchEvent.beliefChanges.push({ entityId: claim.aboutEntity, topic: claim.topic, oldClaimId: oldId, newClaimId: claim.id });
      } else {
        // Corroborate — add SUPPORTS edge
        await writeTx(async (tx) => {
          await tx.run(
            `MATCH (old:Claim {id: $oldId})
             MATCH (new:Claim {id: $newId})
             MERGE (new)-[:SUPPORTS]->(old)`,
            { oldId: currentBelief.get("oldId"), newId: claim.id }
          );
        });

        resolutions.push({ action: "corroborated", claimId: claim.id, aboutEntity: claim.aboutEntity, topic: claim.topic });
        batchEvent.claims.push({ id: claim.id, topic: claim.topic, aboutEntity: claim.aboutEntity, status: "active", action: "corroborated" });
      }
    }
  }

  // Publish SSE batch event
  await publishEvent("graph:batch", batchEvent);

  // Publish belief change events individually (high-signal)
  for (const bc of batchEvent.beliefChanges) {
    // Fetch entity context for the SSE event
    const entityCtx = await readTx(async (tx) => {
      const res = await tx.run(
        `MATCH (e:Entity {id: $id}) RETURN e.label AS label, e.type AS type, e.lat AS lat, e.lng AS lng`,
        { id: bc.entityId }
      );
      return res.records[0] ?? null;
    });

    if (entityCtx) {
      await publishEvent("graph:belief-updated", {
        entityId: bc.entityId,
        entityLabel: entityCtx.get("label"),
        entityType: entityCtx.get("type"),
        lat: entityCtx.get("lat"),
        lng: entityCtx.get("lng"),
        topic: bc.topic,
        newClaimId: bc.newClaimId,
        oldClaimId: bc.oldClaimId,
        agentId,
      });
    }
  }

  return resolutions;
}
```

- [ ] **Step 2: Create the BullMQ worker**

Create `api/src/agents/news-rss/worker.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";
import { DelayedError, type Job } from "bullmq";
import { registerWorker } from "../../infrastructure/queue";
import { writeClaimBatch } from "../../infrastructure/graph-writer";
import { publishEvent } from "../../infrastructure/sse";
import { buildSinglePrompt, buildClusterPrompt, buildEntityContext } from "./prompt";
import { generateClaims } from "./claim-generator";
import { resolveEntity } from "./entity-resolver";
import { regexExtract } from "./fallback";
import { adjustConfidence } from "../confidence";
import type { ExtractionResult } from "../types";
import type { SourceTier } from "../../types";
import { getDb } from "../../infrastructure/mongo";

const AGENT_ID = "news-rss";
const RATE_LIMIT = Number(process.env.AGENT_NEWS_RATE_LIMIT ?? 4);

let anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!anthropic) anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic;
}

interface NewsJob {
  type: "single" | "cluster";
  articles: {
    _id: string;
    title: string;
    summary: string;
    source?: string;
    sourceTier?: SourceTier;
    relatedCountries?: string[];
    relatedChokepoints?: string[];
    relatedNSA?: string[];
  }[];
}

async function loadEntityContext(): Promise<string> {
  const db = getDb();
  const countries = await db.collection("countries")
    .find({}, { projection: { name: 1, iso2: 1 } }).toArray();
  const orgs = await db.collection("nonStateActors")
    .find({}, { projection: { name: 1 } }).toArray();
  const conflicts = await db.collection("conflicts")
    .find({ status: "active" }, { projection: { title: 1 } }).toArray();
  return buildEntityContext(
    countries.map((c) => ({ name: c.name, iso2: c.iso2 })),
    orgs.map((o) => ({ name: o.name })),
    conflicts.map((c) => ({ title: c.title }))
  );
}

async function processJob(job: Job<NewsJob>): Promise<void> {
  const { type, articles } = job.data;
  const sourceTier: SourceTier = articles[0]?.sourceTier ?? "unknown";
  const articleIds = articles.map((a) => a._id);

  let extraction: ExtractionResult;

  const client = getAnthropic();
  if (client) {
    try {
      const context = await loadEntityContext();
      const systemPrompt = type === "cluster"
        ? buildClusterPrompt(context)
        : buildSinglePrompt(context);

      const userContent = articles
        .map((a) => `TITLE: ${a.title}\nSUMMARY: ${a.summary ?? ""}\nSOURCE: ${a.source ?? "unknown"}`)
        .join("\n---\n");

      const response = await client.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
      });

      const text = response.content[0]?.type === "text" ? response.content[0].text : "";
      extraction = JSON.parse(text);
    } catch (err: any) {
      if (err?.status === 429) {
        const retryAfter = Number(err?.headers?.["retry-after"] ?? 30);
        await job.changeDelay(retryAfter * 1000);
        throw new DelayedError(`Rate limited, retry after ${retryAfter}s`);
      }
      console.warn(`[${AGENT_ID}] Haiku failed, using regex fallback:`, err.message);
      const a = articles[0];
      extraction = regexExtract(
        a.title, a.summary ?? "",
        a.relatedCountries ?? [], a.relatedChokepoints ?? [], a.relatedNSA ?? []
      );
    }
  } else {
    // No API key — use regex fallback
    const a = articles[0];
    extraction = regexExtract(
      a.title, a.summary ?? "",
      a.relatedCountries ?? [], a.relatedChokepoints ?? [], a.relatedNSA ?? []
    );
  }

  // Adjust confidence by source tier
  for (const entity of extraction.entities) {
    entity.confidence = adjustConfidence(entity.confidence, sourceTier);
  }
  for (const claim of extraction.claims) {
    claim.confidence = adjustConfidence(claim.confidence, sourceTier);
  }

  // Resolve entities
  for (const entity of extraction.entities) {
    await resolveEntity(entity.name, entity.type, entity.confidence, AGENT_ID);
  }

  // Generate claim nodes
  const claims = generateClaims(extraction, AGENT_ID, articleIds);

  // Resolve entity IDs for claims (match name → ID)
  for (const claim of claims) {
    const resolved = await resolveEntity(claim.aboutEntity, "country", claim.confidence, AGENT_ID);
    claim.aboutEntity = resolved.id;
  }

  // Write to graph
  const resolutions = await writeClaimBatch(claims, articleIds, AGENT_ID, sourceTier);

  // Publish extraction summary
  await publishEvent("agent:extraction", {
    agentId: AGENT_ID,
    articleCount: articles.length,
    entitiesFound: extraction.entities.length,
    claimsCreated: resolutions.filter((r) => r.action === "created").length,
    edgesCreated: 0,
    duplicatesCaught: resolutions.filter((r) => r.action === "merged").length,
    avgConfidence: claims.length > 0
      ? claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length
      : 0,
  });

  // Update agent metrics in MongoDB
  const db = getDb();
  await db.collection("agent_registry").updateOne(
    { id: AGENT_ID },
    {
      $inc: { "performance.totalProcessed": articles.length },
      $set: { "performance.lastProcessedAt": new Date() },
    },
    { upsert: true }
  );
}

export function startNewsWorker(): void {
  registerWorker("ingest:news", processJob, {
    concurrency: 1,
    limiter: { max: RATE_LIMIT, duration: 60_000 },
  });
  console.log(`[${AGENT_ID}] worker started (rate limit: ${RATE_LIMIT}/min)`);
}
```

- [ ] **Step 3: Create fetcher (refactored from news-aggregator)**

Create `api/src/agents/news-rss/fetcher.ts`:

```typescript
import { getDb } from "../../infrastructure/mongo";
import { getOrCreateQueue } from "../../infrastructure/queue";
import { clusterArticles } from "./clusterer";
import { publishEvent } from "../../infrastructure/sse";
import type { SourceTier } from "../../types";

const AGENT_ENABLED = process.env.AGENT_NEWS_ENABLED === "true";

/**
 * Fetch recent unprocessed articles from MongoDB and push to BullMQ.
 * Called by the existing news-aggregator periodic task after it stores articles.
 */
export async function enqueueNewArticles(): Promise<void> {
  if (!AGENT_ENABLED) return;

  const db = getDb();
  const queue = getOrCreateQueue("ingest:news");

  // Find articles not yet processed by the agent
  const articles = await db.collection("news")
    .find({ agentProcessed: { $ne: true } })
    .sort({ publishedAt: -1 })
    .limit(100)
    .toArray();

  if (articles.length === 0) return;

  // Cluster articles
  const { clusters, solos } = clusterArticles(
    articles.map((a) => ({
      _id: a._id as string,
      title: a.title,
      summary: a.summary,
      relatedCountries: a.relatedCountries ?? [],
      relatedChokepoints: a.relatedChokepoints ?? [],
      relatedNSA: a.relatedNSA ?? [],
      publishedAt: a.publishedAt ?? new Date(),
      source: a.dataSource,
    }))
  );

  // Enqueue clusters
  for (const cluster of clusters) {
    await queue.add("cluster", {
      type: "cluster",
      articles: cluster.articles.map((a) => ({
        _id: a._id,
        title: a.title,
        summary: a.summary,
        source: a.source,
        sourceTier: "unknown" as SourceTier, // will be looked up by worker
        relatedCountries: a.relatedCountries,
        relatedChokepoints: a.relatedChokepoints,
        relatedNSA: a.relatedNSA,
      })),
    });

    await publishEvent("news:cluster", {
      clusterSize: cluster.articles.length,
      sharedEntities: cluster.sharedEntities,
      representativeTitle: cluster.articles[0].title,
    });
  }

  // Enqueue solos
  for (const solo of solos) {
    await queue.add("single", {
      type: "single",
      articles: [{
        _id: solo._id,
        title: solo.title,
        summary: solo.summary,
        source: solo.source,
        sourceTier: "unknown" as SourceTier,
        relatedCountries: solo.relatedCountries,
        relatedChokepoints: solo.relatedChokepoints,
        relatedNSA: solo.relatedNSA,
      }],
    });
  }

  // Mark articles as enqueued
  const ids = articles.map((a) => a._id);
  await db.collection("news").updateMany(
    { _id: { $in: ids } },
    { $set: { agentProcessed: true } }
  );

  console.log(`[news-rss] enqueued: ${clusters.length} clusters + ${solos.length} solos from ${articles.length} articles`);
}
```

- [ ] **Step 4: Create agent registry helper**

Create `api/src/agents/registry.ts`:

```typescript
import { getDb } from "../infrastructure/mongo";

export async function ensureAgentRegistered(id: string, definition: Record<string, any>): Promise<void> {
  const db = getDb();
  await db.collection("agent_registry").updateOne(
    { id },
    { $setOnInsert: definition, $set: { lastStarted: new Date() } },
    { upsert: true }
  );
}

export const NEWS_RSS_AGENT = {
  id: "news-rss",
  name: "News/RSS Analyst",
  status: "active",
  created: "built-in",
  model: "haiku",
  trigger: "data_arrival",
  sources: ["rss:*"],
  allowedOperations: ["upsert_node", "upsert_edge", "create_claim", "update_belief"],
  costBudget: { dailyMaxTokens: 500000, maxTokensPerCall: 4000 },
  performance: {
    avgConfidence: 0,
    entitiesPerDoc: 0,
    claimsPerDoc: 0,
    avgLatencyMs: 0,
    errorRate: 0,
    tokensUsedToday: 0,
    totalProcessed: 0,
    lastProcessedAt: null,
  },
};
```

- [ ] **Step 5: Commit**

```bash
git add api/src/infrastructure/graph-writer.ts api/src/agents/news-rss/worker.ts api/src/agents/news-rss/fetcher.ts api/src/agents/registry.ts
git commit -m "feat: add graph writer, news agent worker, fetcher, registry"
```

- [ ] **Step 6: Wire agent into startup and news-aggregator**

Modify `api/src/index.ts` — add after BullMQ/Neo4j init:

```typescript
import { startNewsWorker } from "./agents/news-rss/worker";
import { ensureAgentRegistered } from "./agents/registry";
import { NEWS_RSS_AGENT } from "./agents/registry";

// After Neo4j + Ollama init:
if (isNeo4jConnected() && process.env.AGENT_NEWS_ENABLED === "true") {
  await ensureAgentRegistered(NEWS_RSS_AGENT.id, NEWS_RSS_AGENT);
  startNewsWorker();
}
```

Modify `api/src/modules/periodic/news-aggregator.ts` — at the end of the aggregation cycle, after articles are stored, add:

```typescript
import { enqueueNewArticles } from "../../agents/news-rss/fetcher";

// At end of aggregation cycle:
await enqueueNewArticles();
```

- [ ] **Step 7: Commit**

```bash
git add api/src/index.ts api/src/modules/periodic/news-aggregator.ts
git commit -m "feat: wire news agent into startup and aggregation cycle"
```

---

## Task 10: Graph Query API

**Files:**
- Create: `api/src/modules/graph/index.ts`
- Create: `api/src/modules/graph/entity.ts`
- Create: `api/src/modules/graph/connections.ts`
- Create: `api/src/modules/graph/claims.ts`
- Create: `api/src/modules/graph/paths.ts`
- Create: `api/src/modules/graph/search.ts`
- Create: `api/src/modules/graph/viewport.ts`
- Create: `api/src/modules/graph/stats.ts`
- Create: `api/src/modules/graph/disputed.ts`
- Create: `api/src/modules/graph/scope.ts`

This task creates all graph API endpoints. Each file is a focused Hono router.

- [ ] **Step 1: Create scope middleware**

Create `api/src/modules/graph/scope.ts`:

```typescript
export interface TeamScope {
  entityTypes: string[] | "*";
  regions: string[] | "*";
}

export function buildScopeClause(scope: TeamScope, varName: string = "n"): string {
  const conditions: string[] = [];
  if (scope.entityTypes !== "*") {
    conditions.push(`${varName}.type IN $allowedTypes`);
  }
  if (scope.regions !== "*") {
    conditions.push(`${varName}.region IN $allowedRegions`);
  }
  return conditions.length > 0 ? conditions.join(" AND ") : "";
}

export function defaultScope(): TeamScope {
  return { entityTypes: "*", regions: "*" };
}
```

- [ ] **Step 2: Create entity endpoint**

Create `api/src/modules/graph/entity.ts`:

```typescript
import { Hono } from "hono";
import { readTx } from "../../infrastructure/neo4j";
import { cacheAside } from "../../infrastructure/cache";
import type { AppVariables } from "../../types";

export const entityRouter = new Hono<{ Variables: AppVariables }>();

entityRouter.get("/:id", async (c) => {
  const id = decodeURIComponent(c.req.param("id"));
  const includeBeliefs = c.req.query("includeBeliefs") !== "false";

  const result = await cacheAside(`graph:entity:${id}`, async () => {
    const entity = await readTx(async (tx) => {
      const res = await tx.run(
        `MATCH (e:Entity {id: $id})
         RETURN e {.*} AS entity`,
        { id }
      );
      return res.records[0]?.get("entity") ?? null;
    });

    if (!entity) return null;

    let currentBeliefs: Record<string, any> = {};
    if (includeBeliefs) {
      const beliefs = await readTx(async (tx) => {
        const res = await tx.run(
          `MATCH (e:Entity {id: $id})-[r:CURRENT_BELIEF]->(c:Claim)
           RETURN r.topic AS topic, c {.*} AS claim`,
          { id }
        );
        return res.records.map((r) => ({
          topic: r.get("topic"),
          claim: r.get("claim"),
        }));
      });
      for (const b of beliefs) {
        currentBeliefs[b.topic] = {
          claimId: b.claim.id,
          content: b.claim.content,
          confidence: b.claim.confidence,
          sourceCount: b.claim.sourceCount,
          extractedAt: b.claim.extractedAt,
          agentId: b.claim.agentId,
        };
      }
    }

    // 1-hop neighbors
    const neighbors = await readTx(async (tx) => {
      const res = await tx.run(
        `MATCH (e:Entity {id: $id})-[r]-(n:Entity)
         WHERE NOT n:Claim AND NOT n:Alias AND NOT n:GraphEvent
         RETURN n {.*} AS node, type(r) AS rel, r {.*} AS props, startNode(r) = e AS outgoing
         LIMIT 200`,
        { id }
      );
      return {
        nodes: res.records.map((r) => r.get("node")),
        edges: res.records.map((r) => ({
          from: r.get("outgoing") ? id : r.get("node").id,
          to: r.get("outgoing") ? r.get("node").id : id,
          relation: r.get("rel"),
          ...r.get("props"),
        })),
      };
    });

    return { entity, currentBeliefs, neighbors };
  });

  if (!result) return c.json({ error: "Entity not found" }, 404);
  return c.json(result);
});
```

- [ ] **Step 3: Create remaining graph endpoints**

Create `api/src/modules/graph/connections.ts`, `claims.ts`, `paths.ts`, `search.ts`, `viewport.ts`, `stats.ts`, `disputed.ts` following the same pattern — each a focused Hono router with Cypher queries, caching, and limit/minConfidence/types params.

*(These follow the same pattern as entity.ts — focused Cypher queries per endpoint. Implementer should reference the spec §5 for each endpoint's expected query pattern and response shape.)*

- [ ] **Step 4: Create router index**

Create `api/src/modules/graph/index.ts`:

```typescript
import { Hono } from "hono";
import { entityRouter } from "./entity";
import type { AppVariables } from "../../types";

export const graphApiRouter = new Hono<{ Variables: AppVariables }>();

graphApiRouter.route("/entity", entityRouter);
// Mount remaining routers as they're built:
// graphApiRouter.route("/paths", pathsRouter);
// graphApiRouter.route("/search", searchRouter);
// graphApiRouter.route("/viewport", viewportRouter);
// graphApiRouter.route("/stats", statsRouter);
// graphApiRouter.route("/claims", disputedRouter);
// graphApiRouter.route("/recent", recentRouter);
```

- [ ] **Step 5: Mount in index.ts**

Modify `api/src/index.ts` — add to route mounting:

```typescript
import { graphApiRouter } from "./modules/graph/index";

// In the route registration section, replace existing graph route:
api.route("/graph", graphApiRouter);
```

- [ ] **Step 6: Commit**

```bash
git add api/src/modules/graph/
git commit -m "feat: add graph query API endpoints"
```

---

## Task 11: SSE Event Expansion

**Files:**
- Modify: `api/src/infrastructure/sse.ts`

- [ ] **Step 1: Update SSE buffer size and add state:stale support**

Modify `api/src/infrastructure/sse.ts`:

- Change `MAX_BUFFER` default from 100 to 1000
- In `getBufferedEvents()`, if the requested `afterId` is not found in the buffer, return a special marker indicating the client should re-fetch via API

The new event types (`graph:batch`, `graph:belief-updated`, `graph:claim-disputed`, `agent:status`, `agent:extraction`, `news:cluster`) don't require changes to `sse.ts` — they're published via the existing `publishEvent()` function from `graph-writer.ts` and agent code.

- [ ] **Step 2: Commit**

```bash
git add api/src/infrastructure/sse.ts
git commit -m "feat: expand SSE buffer to 1000, add state:stale support"
```

---

## Task 12: Update Bootstrap + Search

**Files:**
- Modify: `api/src/modules/aggregate/bootstrap.ts`
- Modify: `api/src/modules/aggregate/search.ts`

- [ ] **Step 1: Add graph stats to bootstrap**

Modify `api/src/modules/aggregate/bootstrap.ts` — add a `graphStats` section to the bootstrap response by querying Neo4j for node/edge/claim counts and agent status from MongoDB `agent_registry`.

- [ ] **Step 2: Delegate search to Neo4j**

Modify `api/src/modules/aggregate/search.ts` — when Neo4j is connected, delegate text search to the `entity_search` fulltext index. Fall back to existing MongoDB text search if Neo4j is unavailable.

- [ ] **Step 3: Commit**

```bash
git add api/src/modules/aggregate/bootstrap.ts api/src/modules/aggregate/search.ts
git commit -m "feat: add graph stats to bootstrap, Neo4j search delegation"
```

---

## Task 13: Minimal Frontend Wiring

**Files:**
- Modify: `frontend/src/api/sse.ts` — add handlers for new event types
- Modify: entity detail panel — consume `currentBeliefs` from graph API

This task is intentionally lightweight — just wiring, not new UI components.

- [ ] **Step 1: Add new SSE event handlers**

Modify `frontend/src/api/sse.ts` — add handlers for:
- `graph:batch` → update local state with new entities/claims
- `graph:belief-updated` → highlight affected entity on map
- `graph:claim-disputed` → show alert notification
- `agent:status` → update agent health in sidebar
- `state:stale` → trigger full bootstrap re-fetch

- [ ] **Step 2: Update entity detail panel data source**

The entity detail panel should call `/api/v1/graph/entity/:id` when available and display `currentBeliefs` as the entity's properties (risk, status, leadership, etc.) with confidence indicators.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/sse.ts frontend/src/panels/
git commit -m "feat: wire frontend to graph API and new SSE events"
```

---

## Verification Checklist

After all tasks complete, verify:

- [ ] Docker Compose starts all services: `docker compose up -d`
- [ ] Neo4j Browser accessible at `http://localhost:7474`
- [ ] Migration runs cleanly: node counts match MongoDB
- [ ] Claims created for all mutable properties with `CURRENT_BELIEF` edges
- [ ] Aliases created for all countries and major orgs
- [ ] API starts with Neo4j + Ollama connected
- [ ] `/api/v1/graph/entity/country:iran` returns entity + beliefs + neighbors
- [ ] `/api/v1/graph/stats` returns node/edge/claim counts
- [ ] News articles flow through BullMQ → Haiku extraction → Neo4j writes
- [ ] SSE events fire on graph mutations
- [ ] Frontend displays updated entity data from graph API
