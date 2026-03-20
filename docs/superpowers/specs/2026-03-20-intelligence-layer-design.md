# Gambit Intelligence Layer — Design Spec

> **Date:** 2026-03-20
> **Status:** Approved design, pending implementation
> **Replaces:** Portions of `gambit-architecture-v2.md` (Sections 3–6, 12)
> **Scope:** Neo4j knowledge graph, claim-as-atom data model, News/RSS agent pipeline, graph query API, SSE expansion, infrastructure changes

---

## 1. Context

Gambit is a geopolitical intelligence platform. The frontend (Deck.GL globe, MapLibre, interactive panels) and API layer (Bun/Hono, MongoDB, Redis, SSE) are substantially built. What's missing is the intelligence layer: the knowledge graph, autonomous agent extraction, and the pipeline that turns raw data into structured intelligence.

This spec defines the first vertical of that intelligence layer: a Neo4j knowledge graph with a claim-as-atom data model, a News/RSS ingestion agent powered by Claude Haiku, local embeddings via Ollama, and the API/SSE infrastructure to serve it to the frontend.

### 1.1 Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Graph database | Neo4j Community 5.x | Purpose-built for graphs. 1M+ nodes is within sweet spot. Cypher is expressive. Battle-tested. |
| Data model | Claim-as-atom | Atomic assertions enable provenance, contradiction detection, temporal tracking, and combinatorial discovery. Inspired by Zettelkasten/SRP principles. |
| First agent | News/RSS | Free data source (RSS), high volume, exercises full pipeline, well-understood extraction task. |
| LLM extraction | Claude Haiku (free tier) | 5 req/min, 10K input tokens/min. Sufficient for ~200 articles/hour with rate-limited queue. |
| Local model | Ollama + mxbai-embed-large | 1024-dim embeddings, runs on 1080 Ti (1.2GB VRAM), enables semantic search and vector dedup from day one at zero API cost. |
| Approach | Parallel tracks | Migrate existing data into Neo4j AND build agent pipeline simultaneously. They converge when the agent writes into a graph that already contains reference entities. |

### 1.2 What This Spec Does NOT Cover

- Cosmograph / GPU graph visualization (frontend concern, later phase)
- Agents 2–10 (same pipeline interfaces, different extraction prompts and data sources)
- Orchestrator beyond skeleton (expanded when multiple agents exist)
- Voyage AI embeddings (upgrade path from local embeddings)
- Multi-user collaboration (WebSocket presence, shared annotations)
- Report generation / PDF export

---

## 2. Neo4j Schema (Claim-as-Atom Model)

### 2.1 Design Principle

Entities are stable identity anchors with immutable properties. All mutable assertions — risk levels, leadership, statuses, casualties, anything that could change or be disputed — are stored as first-class Claim nodes. This enables:

- **Provenance:** Every fact traces to its source article(s) and extracting agent
- **Contradiction detection:** Two claims about the same topic on the same entity can coexist as "disputed"
- **Temporal tracking:** Claims form chains via `:SUPERSEDES` edges — full history without snapshots
- **Combinatorial discovery:** Atomic claims connect in unexpected ways across entities
- **Better RAG retrieval:** Embedding "Iran enriched uranium to 90%" is precise; embedding a country node with 15 properties is a blurred average

### 2.2 Entity Nodes (Tier 1 — Stable Anchors)

Only immutable and display properties live on entity nodes.

| Label | ID Pattern | Properties |
|---|---|---|
| `:Country` | `country:{slug}` | id, label, iso2, flag, lat, lng, location |
| `:MilitaryBase` | `base:{slug}` | id, label, lat, lng, location, branch, type |
| `:Conflict` | `conflict:{slug}` | id, label, lat, lng, location, startDate |
| `:Chokepoint` | `choke:{slug}` | id, label, lat, lng, location, type |
| `:Organization` | `org:{slug}` | id, label, type |
| `:Election` | `election:{slug}` | id, label, lat, lng, location, date, electionType |
| `:TradeRoute` | `route:{slug}` | id, label, category |
| `:Port` | `port:{slug}` | id, label, lat, lng, location |
| `:Article` | `article:{hash}` | id, title, source, sourceTier, publishedAt, titleHash |
| `:Person` | `person:{slug}` | id, label (agent-created) |
| `:Sanction` | `sanction:{slug}` | id, label (agent-created) |
| `:Treaty` | `treaty:{slug}` | id, label (agent-created) |
| `:Event` | `event:{slug}` | id, label, lat?, lng? (agent-created) |

All entity nodes also carry: `firstSeen`, `lastUpdated`, `confidence`, `source`.

### 2.3 Claim Nodes (Tier 2 — Atomic Assertions)

```
(:Claim {
  id:           String,          // UUID
  fingerprint:  String,          // hash(topic + normalizedContent + aboutEntity)
  content:      String,          // human-readable assertion
  topic:        String,          // from closed taxonomy (see §2.7)
  confidence:   Float,           // 0.0-1.0
  status:       String,          // "active", "superseded", "disputed", "retracted"
  sourceCount:  Integer,         // how many sources corroborate
  embedding:    Float[1024],     // local mxbai-embed-large vector
  extractedAt:  DateTime,
  agentId:      String           // which agent produced this
})
```

### 2.4 Relationship Types

**Claim relationships:**

| Relationship | Pattern | Purpose |
|---|---|---|
| `:ABOUT` | `(:Claim)->(:Entity)` | What entity a claim concerns |
| `:SOURCED_FROM` | `(:Claim)->(:Article)` | Provenance — which article(s) |
| `:CURRENT_BELIEF` | `(:Entity)->(:Claim)` | Fast lookup — current winning claim per topic |
| `:SUPERSEDES` | `(:Claim)->(:Claim)` | Temporal chain — newer replaces older |
| `:CONTRADICTS` | `(:Claim)->(:Claim)` | Competing assertions |
| `:SUPPORTS` | `(:Claim)->(:Claim)` | Corroboration |

`CURRENT_BELIEF` edges carry a `topic` property (indexed) for queries like "current belief about Iran's risk."

**Structural relationships:**

| Relationship | Pattern | Purpose |
|---|---|---|
| `:MENTIONS` | `(:Article)->(:Entity)` | Article references entity |
| `:PARTY_TO` | `(:Entity)->(:Conflict)` | Country/org in conflict |
| `:LOCATED_IN` | `(:Entity)->(:Country)` | Geographic containment |
| `:OPERATED_BY` | `(:MilitaryBase)->(:Country)` | Base operator |
| `:ALLIES_WITH` | `(:Entity)->(:Entity)` | Alliance |
| `:HOSTILE_TO` | `(:Entity)->(:Entity)` | Hostility |
| `:SANCTIONS` | `(:Entity)->(:Entity)` | Sanctions relationship |
| `:CONNECTS` | `(:TradeRoute)->(:Port)` | Route endpoints |
| `:TRANSITS` | `(:TradeRoute)->(:Chokepoint)` | Route waypoints |
| `:DEPENDS_ON` | `(:Country)->(:Chokepoint)` | Economic dependency |
| `:HELD_IN` | `(:Election)->(:Country)` | Election location |

All structural relationships carry: `weight`, `confidence`, `source`, `sourceCount`, `firstSeen`, `lastUpdated`.

### 2.5 Alias Nodes (Entity Resolution)

```
(:Alias {
  alias:     String,     // "Islamic Republic of Iran", "IR", "Iran"
  canonical: String      // "country:iran"
})
```

Accumulated over time as agents encounter new references to known entities.

### 2.6 GraphEvent Nodes (Event Sourcing)

```
(:GraphEvent {
  id:          String,       // UUID
  timestamp:   DateTime,
  operation:   String,       // CREATE_NODE, CREATE_CLAIM, UPDATE_BELIEF,
                             // CREATE_EDGE, SUPERSEDE_CLAIM, DISPUTE_CLAIM
  entityId:    String,
  claimId:     String?,
  before:      Map?,
  after:       Map?,
  agentId:     String,
  sourceId:    String,
  confidence:  Float,
  migration:   Boolean       // true for seed data, filterable
})
```

### 2.7 Claim Topic Taxonomy (Closed, V1)

The agent and migration both use this same set. Haiku is instructed to only use these topics.

```
risk, leadership, status, casualties, population, gdp,
situation, situation_cause, situation_forecast,
alliance, hostility, sanctions_status,
enrichment, nuclear_capability, military_activity,
trade_volume, oil_volume, gas_volume, traffic,
strength, ideology, territory, revenue, funding, activities,
election_result, strategic_assessment,
attribution, severity
```

~30 topics. Expandable by adding to the taxonomy file and updating the Haiku prompt.

### 2.8 Index Strategy

```cypher
// Entity lookups
CREATE INDEX entity_id IF NOT EXISTS FOR (n:Entity) ON (n.id);
CREATE INDEX entity_type IF NOT EXISTS FOR (n:Entity) ON (n.type);

// Claim queries (the hot path)
CREATE INDEX claim_fingerprint IF NOT EXISTS FOR (n:Claim) ON (n.fingerprint);
CREATE INDEX claim_topic IF NOT EXISTS FOR (n:Claim) ON (n.topic);
CREATE INDEX claim_status IF NOT EXISTS FOR (n:Claim) ON (n.status);
CREATE COMPOSITE INDEX claim_lookup IF NOT EXISTS FOR (n:Claim) ON (n.topic, n.status, n.confidence);

// Alias resolution
CREATE INDEX alias_lookup IF NOT EXISTS FOR (n:Alias) ON (n.alias);

// Event sourcing
CREATE INDEX event_timestamp IF NOT EXISTS FOR (n:GraphEvent) ON (n.timestamp);

// Spatial
CREATE POINT INDEX entity_location IF NOT EXISTS FOR (n:Entity) ON (n.location);

// Fulltext search
CREATE FULLTEXT INDEX entity_search IF NOT EXISTS FOR (n:Entity) ON EACH [n.label];
CREATE FULLTEXT INDEX claim_search IF NOT EXISTS FOR (n:Claim) ON EACH [n.content];

// Vector similarity (populated by Ollama mxbai-embed-large)
CREATE VECTOR INDEX claim_embedding IF NOT EXISTS FOR (n:Claim) ON (n.embedding)
  OPTIONS {indexConfig: {`vector.dimensions`: 1024, `vector.similarity_function`: 'cosine'}};
```

Schema init runs on every API startup via `seed-neo4j-schema.ts` (idempotent).

---

## 3. Migration Pipeline (MongoDB → Neo4j)

### 3.1 Overview

One-time idempotent migration script (`api/src/seed/seed-neo4j.ts`). Reads all existing MongoDB collections, writes them as graph nodes + claims + relationships. All phases use `MERGE` (safe to re-run). Batched at 500 per transaction via `UNWIND`.

### 3.2 Phase 1: Create Entity Nodes (Immutable Properties Only)

```
countries      → :Country {id, label, iso2, flag, lat, lng, location}
ports          → :Port {id, label, lat, lng, location}
chokepoints    → :Chokepoint {id, label, lat, lng, location, type}
bases          → :MilitaryBase {id, label, lat, lng, location, branch, type}
nonStateActors → :Organization {id, label, type}
conflicts      → :Conflict {id, label, lat, lng, location, startDate}
elections      → :Election {id, label, lat, lng, location, date, electionType}
tradeRoutes    → :TradeRoute {id, label, category}
news           → :Article {id, title, source, sourceTier, publishedAt, titleHash}
```

All nodes: `confidence: 1.0`, `source: "seed"`, `firstSeen: migrationTimestamp`.

Display metadata (`countryColors`, `flag`, entity `color`) stays as entity node properties.

### 3.3 Phase 2: Create Seed Claims from Mutable Properties

Every mutable field becomes a claim node with `CURRENT_BELIEF` edge.

| Collection | Field | Claim Topic | Example Content |
|---|---|---|---|
| countries | risk | `risk` | "Iran risk level is catastrophic" |
| countries | leader | `leadership` | "Khamenei is Supreme Leader of Iran" |
| countries | pop | `population` | "Iran population is 88 million" |
| countries | gdp | `gdp` | "Iran GDP is $388 billion" |
| countries | analysis.what | `situation` | "Iran is under heavy US-led sanctions..." |
| countries | analysis.why | `situation_cause` | "..." |
| countries | analysis.next | `situation_forecast` | "..." |
| conflicts | status | `status` | "US-Iran conflict status is active" |
| conflicts | casualties[] | `casualties` | "Iran: 6,000+ killed" (one claim per party) |
| conflicts | latestUpdate | `situation` | "Iran strikes US-owned tanker..." |
| chokepoints | status | `status` | "Strait of Hormuz is RESTRICTED" |
| chokepoints | dailyVessels | `traffic` | "Hormuz daily vessel traffic: 80+" |
| chokepoints | oilVolume | `oil_volume` | "Hormuz oil volume: 21M bbl/day" |
| chokepoints | gasVolume | `gas_volume` | "Hormuz gas volume: ..." |
| chokepoints | strategicSummary | `strategic_assessment` | "..." |
| nonStateActors | status | `status` | "Hezbollah status is active" |
| nonStateActors | strength | `strength` | "Hezbollah estimated strength: 100,000" |
| nonStateActors | ideology | `ideology` | "Hezbollah ideology: Shia Islamism" |
| nonStateActors | revenue | `revenue` | "..." |
| nonStateActors | activities | `activities` | "..." |
| nonStateActors | territory | `territory` | "..." |
| nonStateActors | funding | `funding` | "..." |
| nonStateActors | leaders | `leadership` | "..." |
| tradeRoutes | status | `status` | "Hormuz-Suez route status is disrupted" |
| tradeRoutes | volumeDesc | `trade_volume` | "..." |
| elections | winner | `election_result` | "..." |
| elections | result | `election_result` | "..." |

Claim content generated via consistent templates (`api/src/seed/claim-templates.ts`):

```typescript
const claimTemplates = {
  risk: (entity, value) => `${entity} risk level is ${value}`,
  leadership: (entity, value) => `${value} is leader of ${entity}`,
  casualties: (entity, party, figure) => `${entity}: ${party} casualties are ${figure}`,
  status: (entity, value) => `${entity} status is ${value}`,
  // ... all ~30 topics
};
```

Each seed claim: `confidence: 1.0`, `status: "active"`, `source: "seed"`, `agentId: "migration"`, `sourceCount: 1`.

### 3.4 Phase 2.5: Batch Embed All Claims

After claim creation, batch-embed all claims via Ollama `mxbai-embed-large`:

- Ollama `/api/embed` endpoint accepts batch input
- On a 1080 Ti: ~100-200 embeddings/second
- ~5000 seed claims → ~30 seconds
- Updates claim nodes with `embedding` vectors

### 3.5 Phase 3: Create Structural Relationships

From embedded arrays in MongoDB documents:

```
conflicts.relatedCountries      → (:Conflict)-[:PARTY_TO]->(:Country)
bases.country                   → (:MilitaryBase)-[:OPERATED_BY]->(:Country)
bases.hostNation                → (:MilitaryBase)-[:LOCATED_IN]->(:Country)
nonStateActors.allies           → (:Organization)-[:ALLIES_WITH]->(:Country)
nonStateActors.rivals           → (:Organization)-[:HOSTILE_TO]->(:Country)
tradeRoutes.from/to             → (:TradeRoute)-[:CONNECTS]->(:Port)
tradeRoutes.waypoints           → (:TradeRoute)-[:TRANSITS]->(:Chokepoint)
chokepoints.dependentCountries  → (:Country)-[:DEPENDS_ON]->(:Chokepoint)
elections by ISO2               → (:Election)-[:HELD_IN]->(:Country)
ports.country                   → (:Port)-[:LOCATED_IN]->(:Country)
news.relatedCountries/etc       → (:Article)-[:MENTIONS]->(:Country|Chokepoint|Organization)
```

**Country name resolver:** Built before Phase 3. Lookup table mapping ISO2, full name, and slug to canonical `country:{_id}`. Applied to every relationship creation. Handles the inconsistency across collections (ISO2 in `conflicts.relatedCountries`, full names in `nonStateActors.allies`, etc.).

### 3.6 Phase 4: Migrate Existing Edges Collection

Direct mapping: `edges.from/to/relation/weight` → Neo4j relationships with `confidence: 1.0`, `source: "seed"`.

### 3.7 Phase 5: Create Aliases

Static alias map (`api/src/seed/alias-map.ts`):

- Countries: full name, ISO2, common short names, demonyms
- Organizations: formal name, abbreviations, transliteration variants (e.g., "Hezbollah", "Hizballah", "Party of God")
- Chokepoints: full name, common abbreviations

### 3.8 Phase 6: Create Indexes

All indexes from §2.8. Runs via `seed-neo4j-schema.ts` (also runs on every API startup).

### 3.9 Phase 7: Validation

- Count nodes per label vs MongoDB document counts
- Count claims vs expected (mutable fields per entity)
- Count relationships vs expected (embedded array lengths)
- Verify every entity has `CURRENT_BELIEF` edges for its mutable topics
- Verify alias coverage for all countries
- Log discrepancies

### 3.10 Migration Metadata

All GraphEvents created with `migration: true` for filtering.

`--clean` flag available to drop all Neo4j data and re-run from scratch.

---

## 4. News/RSS Agent Pipeline

### 4.1 Pipeline Overview

```
RSS Feeds (220+ sources)
    ↓
  Fetcher (refactored news-aggregator.ts → agents/news-rss/fetcher.ts)
    → pushes raw articles to BullMQ
    ↓
  BullMQ: ingest:news queue
    ↓
  Dedup by title hash (MongoDB check, existing logic)
    ↓
  Regex pre-filter
    → keyword scan against geopolitical entity dictionary
    → discard sports, entertainment, lifestyle (~30-40% filtered)
    → err on side of inclusion (must contain ≥1 known entity to pass)
    ↓
  Article clustering
    → regex pre-scan for entity mentions
    → group articles sharing 2+ entities within 6hr window
    → clusters → single jobs; solo articles → individual jobs
    ↓
  Haiku extraction (BullMQ worker, rate-limited)
    → input: article cluster or single article (titles + summaries + source tiers + entity context)
    → output: structured ExtractionResult
    → fallback: regex extraction if Haiku unavailable
    ↓
  Claim generation
    → each extracted fact → templated claim with fingerprint
    ↓
  Local embedding (Ollama mxbai-embed-large)
    → batch embed all claims from extraction
    ↓
  Claim resolution (per claim)
    → fingerprint dedup → vector similarity → belief update
    ↓
  Neo4j batch write (single UNWIND transaction)
    ↓
  SSE publication (graph:batch + agent:extraction)
    ↓
  Agent metrics update (MongoDB agent_registry)
```

### 4.2 Haiku Extraction

**Two prompt templates:**

- **Single article:** "Analyze this article. Extract entities, claims, and relationships."
- **Cluster:** "These N articles cover the same event from different sources. Synthesize a unified extraction. Higher confidence where sources agree. Note where they disagree."

**Known entity context included in every call (~1100 tokens):**

```typescript
const entityContext = {
  countries: ["Iran (IR)", "United States (US)", ...],
  organizations: ["Hezbollah", "Hamas", "OPEC", ...],
  activeConflicts: ["US-Iran War", "Russia-Ukraine", ...],
  claimTopics: ["risk", "leadership", "casualties", ...]  // closed taxonomy
};
```

**Structured output schema:**

```typescript
interface ExtractionResult {
  entities: {
    type: "country" | "person" | "organization" | "event" |
          "sanction" | "treaty" | "military_base" | "vessel";
    name: string;
    role?: string;           // "aggressor", "target", "mediator", "source"
    confidence: number;
  }[];
  claims: {
    content: string;         // natural language assertion
    topic: string;           // from closed taxonomy
    aboutEntity: string;     // entity name from entities array
    confidence: number;
  }[];
  relationships: {
    from: string;            // entity name
    to: string;              // entity name
    relation: string;        // SANCTIONS, ATTACKS, ALLIES_WITH, SUPPLIES, etc.
    confidence: number;
  }[];
  eventSummary: string;      // one-line summary
  escalationSignal: "escalating" | "de-escalating" | "stable";
}
```

### 4.3 Source Trust Tiers

Applied to claim confidence as a multiplier:

```typescript
const SOURCE_TIERS = {
  1: { multiplier: 1.0,  sources: ["reuters", "ap", "bbc", "afp"] },
  2: { multiplier: 0.9,  sources: ["nytimes", "guardian", "aljazeera"] },
  3: { multiplier: 0.75, sources: ["regional outlets, named sources"] },
  4: { multiplier: 0.5,  sources: ["unvetted, anonymous, blog"] },
};
// claim.confidence = extraction.confidence * tier.multiplier
```

### 4.4 Entity Resolution Flow

Per extracted entity:

1. **Exact alias lookup** in Neo4j (`:Alias.alias` index) → found? Use canonical entity ID
2. **Fuzzy label match** (existing entity labels, Levenshtein distance < 3) → match? Use existing, create new alias
3. **Vector similarity** on entity label embedding vs existing → similarity > 0.9? Use existing, create alias
4. **No match** → create new entity node with extraction confidence. Agent creates new `:Alias` entries for future lookups
5. Log decision as GraphEvent with reasoning

### 4.5 Claim Resolution Flow

Per generated claim:

1. **Fingerprint check:** `hash(topic + normalizedContent + aboutEntity)` exists?
   - YES: add `:SOURCED_FROM` edge to new article, increment `sourceCount`. Done.
   - NO: proceed

2. **Vector similarity** against existing claims for same entity + topic:
   - cosine > 0.95: treat as semantic duplicate, merge (add source, increment count)
   - cosine 0.7–0.95: related but different claim, create new
   - cosine < 0.7: novel claim, create new

3. **Check `CURRENT_BELIEF`** for same entity + topic:
   - New claim has higher resolution score → move `CURRENT_BELIEF`, mark old as `"superseded"`, create `:SUPERSEDES` edge
   - New claim contradicts current belief (both high confidence) → mark as `"disputed"`, create `:CONTRADICTS` edge, flag for analyst review
   - New claim corroborates → create `:SUPPORTS` edge, boost confidence on existing

**Resolution score** (not just raw confidence):

```typescript
const resolutionScore = claim.confidence * sourceTier.multiplier * Math.log2(sourceCount + 1);
```

Corroboration from multiple quality sources outweighs a single high-confidence junk source.

### 4.6 BullMQ Configuration

```typescript
const newsQueue = new Queue('ingest:news', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { age: 86400 },
    removeOnFail: false,       // failed jobs stay in DLQ
  }
});

const newsWorker = new Worker('ingest:news', processArticle, {
  connection: redis,
  concurrency: 1,
  limiter: {
    max: 4,
    duration: 60000,           // 4 jobs/min (Haiku free tier headroom)
  }
});
```

**Rate limit handling (429):** Does NOT count as a failure attempt. Re-queues with `retry-after` delay:

```typescript
if (error.status === 429) {
  const retryAfter = error.headers?.['retry-after'] || 30;
  throw new DelayedError(retryAfter * 1000);
}
```

**Stale job handling:** Articles in queue > 24 hours are still processed but tagged `stale: true` with confidence penalty (`* 0.8`).

### 4.7 Regex Fallback

When Haiku is unavailable or rate-limited, the existing regex/keyword extraction runs. Produces the same `ExtractionResult` shape but with confidence capped at 0.6. Articles tagged `enrichment: "regex"`. BullMQ re-queues for Haiku processing when the API is available.

### 4.8 Agent Definition

Stored in MongoDB `agent_registry`:

```typescript
{
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
    tokensUsedToday: 0
  }
}
```

Performance metrics updated after each job.

---

## 5. Graph Query API

### 5.1 New Routes: `/api/v1/graph/`

| Endpoint | Purpose |
|---|---|
| `GET /entity/:id` | Full entity with current beliefs + 1-hop neighbors |
| `GET /entity/:id/connections` | N-hop neighborhood (depth 2 default, max 4) |
| `GET /entity/:id/claims` | All claims about this entity |
| `GET /entity/:id/claims/:topic` | Claim chain for one topic (active + superseded + disputed) |
| `GET /paths?from=X&to=Y` | Shortest paths (max 4 hops) |
| `GET /search?q=term&mode=text\|semantic\|hybrid` | Fulltext + alias + vector search |
| `GET /viewport?bbox=...` | Spatial entities in bounding box |
| `GET /recent?since=ISO8601` | Recently created/updated nodes and claims |
| `GET /stats` | Node/edge/claim counts, agent activity |
| `GET /claims/disputed` | Analyst review queue |
| `GET /claims/search?q=...` | Semantic claim search via vector similarity |

### 5.2 Common Query Parameters

| Param | Type | Default | Purpose |
|---|---|---|---|
| `limit` | int | 200 | Max nodes returned (max 1000) |
| `minConfidence` | float | 0.0 | Filter low-confidence entities and edges |
| `types` | string | all | Comma-separated entity types |
| `since` | ISO8601 | — | Only include after this date |
| `includeBeliefs` | boolean | true | Attach current beliefs to entity nodes |

### 5.3 Entity Detail Response

```typescript
interface EntityDetailResponse {
  entity: {
    id: string;
    label: string;
    type: string;
    lat?: number;
    lng?: number;
    confidence: number;
    firstSeen: string;
    lastUpdated: string;
  };
  currentBeliefs: {
    [topic: string]: {
      claimId: string;
      content: string;
      confidence: number;
      sourceCount: number;
      extractedAt: string;
      agentId: string;
    };
  };
  neighbors: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  meta: {
    queryTimeMs: number;
    claimCount: number;
    disputedCount: number;
  };
}
```

### 5.4 Graph Response (connections, paths, viewport)

```typescript
interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
  claims?: ClaimSummary[];
  meta: {
    queryTimeMs: number;
    nodeCount: number;
    edgeCount: number;
    truncated: boolean;
    maxDepth: number;
  };
}
```

### 5.5 Existing Endpoints That Change

| Endpoint | Change |
|---|---|
| `/bootstrap` | Adds graph stats + agent status summary |
| `/search` | Delegates to Neo4j fulltext + alias + vector. MongoDB fallback for raw article text |
| `/compare` | Neo4j: shared neighbors, common claims, divergent beliefs |
| `/graph` (existing) | Rewritten to query Neo4j |
| `/anomalies` | Enriched with claim context from Neo4j |

### 5.6 Existing Endpoints Unchanged

All reference data (`/countries`, `/bases`, etc.), `/news`, auth, teams, settings, admin. Still work, still cached, not broken.

### 5.7 Team Scope Enforcement

Middleware injects team `dataScope` into every Neo4j query as `WHERE` clause:

```typescript
function applyScope(cypher: string, scope: TeamScope): string {
  if (scope.entityTypes !== "*") {
    cypher += ` AND n.type IN $allowedTypes`;
  }
  if (scope.regions !== "*") {
    cypher += ` AND n.region IN $allowedRegions`;
  }
  return cypher;
}
```

### 5.8 Caching

Redis cache-aside, same pattern as existing endpoints:

| Endpoint | TTL | Reason |
|---|---|---|
| `/entity/:id` | 30s | Beliefs change on agent extraction |
| `/entity/:id/connections` | 2min | Structural edges change less often |
| `/entity/:id/claims` | 30s | New claims arrive frequently |
| `/paths` | 2min | Path structure stable |
| `/viewport` | 1min | Freshness vs load balance |
| `/search` | 30s | Results change as claims arrive |
| `/stats` | 5min | Aggregate, not time-critical |
| `/claims/disputed` | 15s | Review queue, near-real-time |

Cache invalidation: `graph:batch` SSE event → bust cache entries for affected entity IDs.

---

## 6. SSE Event Expansion

### 6.1 New Events

| Event | Trigger | Payload |
|---|---|---|
| `graph:batch` | Agent completes extraction | `{ agentId, entities: [{id, type, label, action}], claims: [{id, topic, aboutEntity, status, action}], edges: [{from, to, relation, action}], beliefChanges: [{entityId, topic, oldClaimId, newClaimId}] }` |
| `graph:belief-updated` | CURRENT_BELIEF moves | `{ entityId, entityLabel, entityType, lat, lng, topic, oldContent, newContent, newConfidence, sourceCount, agentId }` |
| `graph:claim-disputed` | Two high-confidence claims contradict | `{ entityId, entityLabel, entityType, lat, lng, topic, claimA: {id, content, confidence}, claimB: {id, content, confidence}, agentId }` |
| `agent:status` | Periodic (30s) | `{ agents: [{id, status, queueDepth, processedToday, claimsCreatedToday, avgConfidence, errorRate, tokensUsedToday, lastProcessedAt}] }` |
| `agent:extraction` | Job completes | `{ agentId, articleCount, entitiesFound, claimsCreated, edgesCreated, duplicatesCaught, avgConfidence }` |
| `news:cluster` | Cluster formed | `{ clusterSize, sharedEntities, representativeTitle }` |

`graph:belief-updated` and `graph:claim-disputed` include entity context (label, type, lat, lng) so the frontend can highlight on the map without a follow-up API call.

### 6.2 Existing Events Unchanged

`conflict-update`, `snapshot`, `anomaly`, `heartbeat`, `auth-expired`.

### 6.3 Event Volume

~4 extractions/min × ~10-15 claims each = ~50-60 claims/min = ~1 `graph:batch` event per second. Belief changes and disputes are ~5-10% of claims — high-signal, low-frequency.

### 6.4 Consumption Pattern

```
graph:batch          → update map layers + graph view (frontend debounces 2s)
graph:belief-updated → highlight entity, update detail panel, notification
graph:claim-disputed → alert banner, analyst review queue
agent:status         → sidebar agent health indicators
agent:extraction     → activity feed
news:cluster         → news feed panel
```

### 6.5 Event Filtering

Client-side filtering for V1. Event payloads include `entityId`, `entityType`, `topic` for frontend to discard irrelevant events. Server-side subscription filtering deferred until concurrent client count warrants it.

### 6.6 Buffer and Reconnection

- Buffer increased to 1000 events (covers ~15 minutes at peak volume)
- `last-event-id` replay on reconnect (existing behavior)
- If `last-event-id` is older than buffer, send `state:stale` event → frontend re-fetches via API

### 6.7 Publication Point

`graph-writer.ts` publishes all `graph:*` events. Agents don't publish directly. Any future agent writing through graph-writer gets SSE for free.

---

## 7. Infrastructure

### 7.1 Docker Compose

```yaml
services:
  api:
    build: ./api
    ports: ["3005:3005"]
    depends_on: [neo4j, mongo, redis, ollama]
    env_file: .env

  frontend:
    build: ./frontend
    ports: ["5200:5200"]

  neo4j:
    image: neo4j:5-community
    ports: ["7474:7474", "7687:7687"]
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

  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo-data:/data/db]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  ollama:
    image: ollama/ollama
    expose: ["11434"]          # internal only, not exposed to host network
    volumes: [ollama-models:/root/.ollama]
    deploy:
      resources:
        reservations:
          devices:
            - capabilities: [gpu]
    environment:
      OLLAMA_KEEP_ALIVE: -1
      OLLAMA_NUM_GPU: 99

  bullmq-dashboard:
    image: taskforcesh/bullmq-dashboard
    ports: ["3001:3001"]
    environment:
      REDIS_HOST: redis
      REDIS_PORT: 6379

volumes:
  neo4j-data:
  mongo-data:
  ollama-models:
  neo4j-backups:
```

### 7.2 New API Dependencies

| Package | Purpose |
|---|---|
| `neo4j-driver` | Official Neo4j JavaScript driver |
| `bullmq` | Job queue backed by existing Redis |
| `@anthropic-ai/sdk` | Claude Haiku extraction |

Ollama called via HTTP fetch (`ollama:11434/api/embed`), no SDK needed.

### 7.3 Environment Variables

```bash
# Existing
MONGO_URI=mongodb://localhost:27017/gambit
REDIS_URL=redis://localhost:6379
PORT=3005

# New — Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=gambit-dev

# New — Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# New — Ollama
OLLAMA_URL=http://ollama:11434

# New — Agent config
AGENT_NEWS_ENABLED=true
AGENT_NEWS_RATE_LIMIT=4
AGENT_NEWS_DAILY_TOKEN_BUDGET=500000
AGENT_NEWS_CLUSTER_WINDOW_HOURS=6
AGENT_NEWS_STALE_THRESHOLD_HOURS=24

# New — SSE
SSE_BUFFER_SIZE=1000
```

### 7.4 New File Structure (Additions Only)

```
api/src/
  infrastructure/
    neo4j.ts                  # Connection pool (50 max), Cypher helpers, shutdown
    queue.ts                  # BullMQ queue definitions, rate limits, DLQ
    graph-writer.ts           # Neo4j writes + claim resolution + SSE publication
    ollama.ts                 # Embedding client (batch fetch to /api/embed)

  agents/
    registry.ts               # Agent registry CRUD (MongoDB)
    orchestrator.ts           # Routing + lifecycle skeleton
    types.ts                  # Shared interfaces: ExtractionResult, ClaimResolution
    confidence.ts             # Resolution score, source tier weighting
    news-rss/
      fetcher.ts              # Refactored from news-aggregator → pushes to BullMQ
      clusterer.ts            # Group articles by entity overlap + time window
      worker.ts               # BullMQ worker — orchestrates extraction pipeline
      prompt.ts               # System prompt templates (single + cluster)
      entity-resolver.ts      # Alias → fuzzy → vector → create new
      claim-generator.ts      # ExtractionResult → templated claims + fingerprints
      fallback.ts             # Regex extraction (same interface, lower confidence)

  modules/
    graph/
      entity.ts               # GET /graph/entity/:id
      connections.ts           # GET /graph/entity/:id/connections
      claims.ts               # GET /graph/entity/:id/claims[/:topic]
      paths.ts                 # GET /graph/paths
      search.ts               # GET /graph/search
      viewport.ts              # GET /graph/viewport
      recent.ts                # GET /graph/recent
      stats.ts                 # GET /graph/stats
      disputed.ts              # GET /graph/claims/disputed
      scope.ts                 # Team scope middleware

  seed/
    seed-neo4j.ts              # Migration script (phases 1-7)
    seed-neo4j-schema.ts       # Index/constraint creation (runs on every startup)
    alias-map.ts               # Entity alias definitions
    source-tiers.ts            # RSS source trust scoring
    claim-templates.ts         # Claim content generation templates
    claim-topics.ts            # Closed topic taxonomy

  scripts/
    init-ollama.sh             # Pull mxbai-embed-large on first start
```

### 7.5 Refactored Files

| File | Change |
|---|---|
| `news-aggregator.ts` | RSS fetch logic → `agents/news-rss/fetcher.ts`. Periodic task pushes to BullMQ instead of inline processing |
| `modules/aggregate/graph.ts` | Rewritten to query Neo4j |
| `modules/aggregate/search.ts` | Delegates to Neo4j, MongoDB fallback |
| `modules/aggregate/compare.ts` | Uses Neo4j for shared neighbors, divergent beliefs |
| `infrastructure/sse.ts` | New event types. Buffer 100 → 1000. `state:stale` reconnection |
| `modules/aggregate/bootstrap.ts` | Add graph stats + agent status |
| `modules/aggregate/anomalies.ts` | Enrich with claim context |

### 7.6 Untouched

All auth, teams, sessions, settings, admin, API key management, reference data endpoints, existing layers, cache infrastructure, periodic tasks (conflict-counter, anomaly-cleanup, account-cleanup).

### 7.7 Startup Sequence

```
1. MongoDB connection
2. Redis connection
3. Neo4j connection + run seed-neo4j-schema.ts (idempotent indexes)
4. Ollama connection + verify mxbai-embed-large loaded (pull if missing)
5. Register BullMQ queues + workers
6. Start periodic tasks (existing + agent status emitter every 30s)
7. Mount routes (existing + new /graph/ routes)
8. Start listening on PORT
```

If Neo4j or Ollama unavailable: API still starts, existing endpoints work, graph endpoints return 503, agent pipeline pauses. Graceful degradation.

### 7.8 Neo4j Connection Pool

```typescript
const driver = neo4j.driver(uri, auth, {
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 30000
});
```

### 7.9 Batch Write Pattern

All agent graph writes use `UNWIND` for single-roundtrip batch operations:

```cypher
UNWIND $claims AS claim
MERGE (c:Claim {fingerprint: claim.fingerprint})
ON CREATE SET c += claim.properties
ON MATCH SET c.sourceCount = c.sourceCount + 1
WITH c, claim
MATCH (e:Entity {id: claim.aboutEntity})
MERGE (c)-[:ABOUT]->(e)
```

### 7.10 Data Retention

Periodic cleanup task:

| Data | Retention | Action |
|---|---|---|
| Active + disputed claims | Indefinite | Keep in Neo4j |
| Superseded claims | 30 days | Archive to MongoDB `archived_claims`, delete from Neo4j |
| Retracted claims | 7 days | Delete |
| GraphEvents | 14 days | Archive to MongoDB `archived_events`, delete from Neo4j |

### 7.11 Backup

Weekly Neo4j dump:

```bash
docker exec neo4j neo4j-admin database dump neo4j --to-path=/backups/
```

Backup volume mounted in Docker Compose. Migration script can rebuild from MongoDB, but that loses agent-extracted intelligence.

---

## 8. Minimal Frontend Changes

Not a frontend redesign — just wiring changes to make the intelligence layer visible.

| Component | Change |
|---|---|
| Entity detail panel | Show `currentBeliefs` from graph API alongside/replacing static MongoDB properties |
| News feed | Show enrichment status per article ("processed, 5 entities, 8 claims extracted") |
| Graph explorer | Point at `/graph/entity/:id/connections` instead of old edges collection |
| Alert banner | Consume `graph:claim-disputed` and `graph:belief-updated` SSE events |
| Sidebar agent status | Consume `agent:status` SSE events |

Existing components handle rendering — they just get new data sources.

---

## 9. Future Upgrade Paths

Designed for but not implemented in this spec:

| Upgrade | When | Change Required |
|---|---|---|
| Voyage AI embeddings | Budget available | Swap Ollama call for Voyage API in `ollama.ts` → rename to `embeddings.ts` |
| Cosmograph graph viz | Frontend phase | New view consuming same `GraphResponse` shape |
| Agents 2–10 | After News/RSS proven | Same pipeline interfaces, different prompts + data sources |
| Orchestrator expansion | Multiple agents exist | Expand `orchestrator.ts` skeleton with routing + conflict resolution |
| Neo4j GDS | Pattern recognition agents | Add GDS plugin to Docker Compose, ~200MB memory |
| Qwen local pre-filter | GPU upgrade | Add to pipeline before BullMQ, same `ExtractionResult` interface |
| Server-side SSE filtering | Many concurrent clients | Add subscription channels to SSE connection |
