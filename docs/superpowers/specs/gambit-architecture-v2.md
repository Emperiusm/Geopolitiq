# Gambit v2 — Intelligence Platform Architecture

> **Revision:** Replaces `gambit-frontend-prompt.md`. This document defines the complete architecture for Gambit as a graph-first intelligence platform with autonomous agent analysis.

---

## 1. Vision

Gambit is a geopolitical intelligence platform built on a knowledge graph. Every data source — news, shipping, satellite, financial, conflict, cyber — feeds into a unified graph of entities and relationships. An autonomous agent system ingests data, builds the graph, and surfaces intelligence. Analysts interact through a 3D globe (spatial view) and a GPU-accelerated graph explorer (relational view), with an LLM-powered chat + proactive alerting system.

**Three pillars, one graph:**

```
┌──────────────────────────────────────────────────────────────┐
│                    KNOWLEDGE GRAPH (Neo4j)                    │
│              The single source of intelligence                │
├──────────────┬──────────────────────┬────────────────────────┤
│  GLOBE VIEW  │  GRAPH EXPLORER VIEW │  LLM AGENT LAYER       │
│  Deck.GL +   │  Cosmograph (full    │  Chat + proactive       │
│  Mapbox      │  dataset + focused   │  alerts + autonomous    │
│  (spatial)   │  subgraph)           │  monitoring             │
└──────────────┴──────────────────────┴────────────────────────┘
```

---

## 2. System Architecture

```
                         ┌──────────────────────────────┐
                         │        FRONTEND              │
                         │  Preact + Vite               │
                         │  ┌────────┐ ┌────────────┐   │
                         │  │Deck.GL │ │ Cosmograph  │   │
                         │  │Globe + │ │ Full graph  │   │
                         │  │Mapbox  │ │ + subgraph  │   │
                         │  └────────┘ └────────────┘   │
                         │  ┌────────────────────────┐   │
                         │  │ LLM Chat + Alert UI    │   │
                         │  └────────────────────────┘   │
                         └──────────────┬───────────────┘
                                        │ REST + SSE + WebSocket
                         ┌──────────────┴───────────────┐
                         │       BACKEND API             │
                         │       Bun + Hono              │
                         │  ┌──────────────────────┐     │
                         │  │  Auth (RBAC + OAuth)  │     │
                         │  │  API Gateway          │     │
                         │  │  SSE Event Bus        │     │
                         │  └──────────────────────┘     │
                         └──┬─────────┬─────────┬───────┘
                            │         │         │
                   ┌────────┴──┐ ┌────┴────┐ ┌──┴───────┐
                   │  Neo4j    │ │ MongoDB │ │  Redis   │
                   │  (graph + │ │ (raw    │ │  (cache +│
                   │  vectors) │ │  docs)  │ │  BullMQ) │
                   └───────────┘ └─────────┘ └──────────┘
                            │
                   ┌────────┴──────────────────────────┐
                   │       AGENT PROCESSING LAYER       │
                   │                                    │
                   │  ┌────────────────────────────┐    │
                   │  │      ORCHESTRATOR           │    │
                   │  │  (Sonnet / Opus)            │    │
                   │  │  routing · lifecycle ·       │    │
                   │  │  cost · QA · agent creation  │    │
                   │  └─────────────┬──────────────┘    │
                   │                │                    │
                   │  ┌─────────────┴──────────────┐    │
                   │  │      AGENT REGISTRY         │    │
                   │  │  Built-in (10 V1)           │    │
                   │  │  Stubbed (20 V2+)           │    │
                   │  │  Dynamic (runtime-created)  │    │
                   │  └─────────────┬──────────────┘    │
                   │                │                    │
                   │  ┌─────────────┴──────────────┐    │
                   │  │    SPECIALIZED AGENTS        │    │
                   │  │  Ingestion · Monitoring ·    │    │
                   │  │  Chat · Synthesis            │    │
                   │  └────────────────────────────┘    │
                   │                │                    │
                   │  ┌─────────────┴──────────────┐    │
                   │  │    EXTERNAL SERVICES         │    │
                   │  │  Anthropic (Claude)          │    │
                   │  │  Voyage AI (embeddings)      │    │
                   │  │  Data source APIs            │    │
                   │  └────────────────────────────┘    │
                   └───────────────────────────────────┘
```

---

## 3. Data Stores

### 3.1 Neo4j — Knowledge Graph + Vectors

The core intelligence layer. All entities, relationships, and their embeddings.

**Node schema:**

```
(:Entity {
  id:           String,          // canonical ID: "country:iran", "org:hezbollah"
  type:         String,          // country, organization, person, conflict, vessel,
                                 // flight, facility, event, article, sanction, election,
                                 // cyber_incident, satellite_observation
  label:        String,          // human-readable name
  lat:          Float?,          // nullable — not all entities are spatial
  lng:          Float?,
  embedding:    Float[1024],     // Voyage AI embedding vector
  confidence:   Float,           // 0.0-1.0, how certain we are this entity is real/correct
  firstSeen:    DateTime,
  lastUpdated:  DateTime,
  properties:   Map              // type-specific fields (risk, status, leader, flag, etc.)
})
```

**Edge schema:**

```
[:RELATES_TO {
  relation:     String,          // SUPPLIES, ALLIES_WITH, SANCTIONS, OPERATES_IN,
                                 // MENTIONS, CONNECTED_TO, ATTACKS, TRADES_WITH, etc.
  weight:       Float,           // 0.0-1.0, relationship strength
  confidence:   Float,           // 0.0-1.0, how certain we are this relationship exists
  firstSeen:    DateTime,
  lastUpdated:  DateTime,
  sourceCount:  Integer,         // how many sources corroborate this edge
  provenance:   List<String>     // source IDs that created/confirmed this edge
}]
```

**Indexes:**

- Fulltext index on `label` for search
- Vector index on `embedding` (cosine similarity, 1024 dimensions)
- Composite index on `type + properties.risk` for filtered queries
- Spatial index on `lat, lng` for viewport queries

**Temporal versioning (event sourcing):**

All graph mutations are recorded as an append-only event log:

```
(:GraphEvent {
  id:           String,          // UUID
  timestamp:    DateTime,
  operation:    String,          // CREATE_NODE, UPDATE_NODE, DELETE_NODE,
                                 // CREATE_EDGE, UPDATE_EDGE, DELETE_EDGE,
                                 // MERGE_NODES
  entityId:     String,          // affected node/edge ID
  before:       Map?,            // previous state (null for creates)
  after:        Map?,            // new state (null for deletes)
  agentId:      String,          // which agent produced this operation
  sourceId:     String,          // which data source triggered it
  confidence:   Float            // agent's confidence in this operation
})
```

To reconstruct graph state at time T: replay events up to T. Materialized snapshots created every 6 hours for fast historical queries.

### 3.2 MongoDB — Raw Documents + Agent State

Stores raw ingested data, agent configurations, user data.

**Collections:**

| Collection | Purpose |
|---|---|
| `raw_articles` | Original news/RSS items as received |
| `raw_events` | Raw data from structured sources (ACLED, AIS, etc.) |
| `agent_registry` | Agent definitions (built-in, stubbed, dynamic) |
| `agent_memory` | Procedural memory per agent (lessons learned) |
| `agent_runs` | Execution logs, token usage, performance metrics |
| `users` | User profiles, roles, team membership |
| `teams` | Team definitions, data access scopes |
| `annotations` | Analyst-created nodes/edges (manual intelligence) |
| `reports` | Generated intelligence briefs and exports |
| `settings` | System config, API keys (encrypted), feature flags |
| `alert_rules` | User-defined alerting conditions |
| `alert_history` | Delivered alerts log |

### 3.3 Redis — Cache + Queue

| Function | Key pattern | TTL |
|---|---|---|
| API response cache | `cache:api:{route}:{hash}` | 5m-1h by route |
| Session tokens | `session:{token}` | 24h |
| Rate limit counters | `ratelimit:{source}:{window}` | per window |
| SSE channel pub/sub | `sse:{channel}` | — |
| BullMQ job queues | `bull:{queueName}:*` | — |

**BullMQ queues:**

| Queue | Purpose | Concurrency |
|---|---|---|
| `ingest:news` | News/RSS article processing | 10 |
| `ingest:conflict` | ACLED/conflict data | 5 |
| `ingest:sanctions` | Sanctions data | 3 |
| `ingest:maritime` | AIS/shipping data | 10 |
| `ingest:satellite` | Satellite observation data | 3 |
| `ingest:flights` | ADS-B flight data | 10 |
| `ingest:financial` | Market/financial data | 5 |
| `ingest:cyber` | Cyber threat data | 3 |
| `ingest:osint` | Social media/OSINT | 5 |
| `ingest:elections` | Election/political data | 3 |
| `orchestrator` | Orchestrator decisions | 1 |
| `monitoring` | Pattern detection runs | 3 |
| `synthesis` | Report/brief generation | 2 |
| `embedding` | Voyage AI embedding calls | 5 |
| `alerts` | Alert delivery (email/Slack/webhook) | 5 |

---

## 4. Knowledge Graph Data Model

### 4.1 Entity Types

Every entity in the graph is a node. Entity types determine available properties and visualization behavior.

**Geopolitical:**

| Type | Example ID | Key Properties | Spatial |
|---|---|---|---|
| `country` | `country:iran` | risk, leader, iso2, flag, region, gdp, population | Yes |
| `person` | `person:khamenei` | role, nationality, organization, status | Sometimes |
| `organization` | `org:hezbollah` | type (state/non-state/corporate), ideology, status | Sometimes |
| `conflict` | `conflict:us-iran` | status, dayCount, casualties, parties | Yes |
| `election` | `election:iran-2025` | date, type, candidates, status | Yes |
| `treaty` | `treaty:jcpoa` | status, signatories, effectiveDate | No |
| `sanction` | `sanction:us-iran-2024` | type, issuer, targets, effectiveDate | No |

**Economic:**

| Type | Example ID | Key Properties | Spatial |
|---|---|---|---|
| `vessel` | `vessel:imo-9349466` | name, flag, type, mmsi, destination | Yes (moving) |
| `port` | `port:bandar-abbas` | country, capacity, status, throughput | Yes |
| `trade_route` | `route:hormuz-suez` | category, volume, status | Yes (arc) |
| `chokepoint` | `choke:hormuz` | status, dailyTraffic, controllingEntity | Yes |
| `commodity` | `commodity:crude-oil` | price, trend, majorProducers | No |
| `company` | `company:sinopec` | sector, country, revenue, sanctioned | Sometimes |

**Security:**

| Type | Example ID | Key Properties | Spatial |
|---|---|---|---|
| `military_base` | `base:diego-garcia` | country, type, branch, personnel | Yes |
| `cyber_incident` | `cyber:solarwinds` | type, severity, attribution, targets | No |
| `flight` | `flight:rsd091` | callsign, aircraft, origin, destination | Yes (moving) |
| `satellite_obs` | `satobs:202503-hormuz-1` | source, type, coordinates, captureDate | Yes |

**Information:**

| Type | Example ID | Key Properties | Spatial |
|---|---|---|---|
| `article` | `article:reuters-2025-abc` | title, source, publishedAt, trustScore | No |
| `event` | `event:attack-aden-2025` | type, date, description, severity | Yes |
| `claim` | `claim:iran-enrichment-90` | content, source, verificationStatus | No |

### 4.2 Relationship Types

Edges carry semantic meaning, weight, confidence, and provenance.

| Relation | Example | Typical weight |
|---|---|---|
| `ALLIES_WITH` | country:us → country:uk | 0.9 |
| `HOSTILE_TO` | country:iran → country:israel | 0.95 |
| `SUPPLIES` | country:iran → org:hezbollah | 0.8 |
| `SANCTIONS` | country:us → country:iran | 1.0 |
| `OPERATES_IN` | org:hezbollah → country:lebanon | 0.95 |
| `LEADS` | person:khamenei → country:iran | 1.0 |
| `MEMBER_OF` | country:iran → org:opec | 1.0 |
| `TRADES_WITH` | country:china → country:iran | 0.7 |
| `MENTIONS` | article:xyz → country:iran | 1.0 |
| `LOCATED_AT` | base:diego-garcia → country:uk | 1.0 |
| `CONTROLS` | country:iran → choke:hormuz | 0.6 |
| `CONNECTED_VIA` | port:bandar-abbas → route:hormuz-suez | 1.0 |
| `ATTRIBUTED_TO` | cyber:incident → country:russia | 0.6 |
| `OBSERVED_AT` | vessel:imo-123 → port:bandar-abbas | 1.0 |
| `RELATED_TO` | (generic fallback) | varies |

Edge weights are updated as more sources corroborate or contradict the relationship.

### 4.3 Provenance Chain

Every node and edge traces back to its origins:

```typescript
interface Provenance {
  sourceId: string;        // "rss:reuters", "api:acled", "agent:news-rss"
  sourceType: "feed" | "api" | "agent" | "analyst" | "derived";
  timestamp: DateTime;
  confidence: number;      // 0.0-1.0
  agentId: string;         // which agent created this
  rawDocId: string;        // reference to MongoDB raw document
  reasoning?: string;      // why the agent made this decision (for auditing)
}
```

Analysts can inspect any node/edge and see: which sources contributed, which agent processed it, what confidence level, and what the agent's reasoning was.

### 4.4 Entity Resolution

LLM-autonomous with feedback loops.

**At ingestion time:**

1. Agent extracts entities from incoming data
2. For each entity, agent queries Neo4j: "are there existing nodes that match this entity?"
3. Agent receives candidate matches (by label similarity, embedding proximity, or alias lookup)
4. Agent decides: create new node, merge into existing, or flag as ambiguous
5. Decision is recorded as a `GraphEvent` with confidence score

**Alias index (Neo4j):**

```
(:Alias {
  alias:    "Islamic Republic of Iran",
  canonical: "country:iran"
})
```

Aliases are accumulated over time as agents encounter new references to known entities.

**Feedback loop:**

When an analyst corrects an entity resolution decision (splits wrongly merged nodes, merges separate nodes), that correction is:
1. Applied to the graph immediately
2. Recorded as training signal in the agent's procedural memory
3. Used to update the alias index
4. Factored into future confidence scoring for similar decisions

---

## 5. Agent Architecture

### 5.1 Orchestrator

The autonomous coordinator for all agent activity.

**Runs on:** Sonnet (default), escalates to Opus for complex decisions

**Responsibilities:**

| Function | Description |
|---|---|
| **Routing** | Incoming data → determine which agent(s) process it. A news article about a cyber attack on a shipping company triggers news, cyber, and maritime agents. |
| **Lifecycle** | Start, stop, restart agents. Monitor health. Scale concurrency based on queue depth. |
| **Cost management** | Track token usage per agent per day. Enforce budgets. Decide model tier per task. |
| **Quality assurance** | Sample agent outputs. Flag low-confidence extractions. Track entity resolution accuracy. |
| **Conflict resolution** | When two agents produce contradictory graph operations, decide which to apply (or escalate to Opus / analyst). |
| **Priority management** | Crisis detection → surge relevant agents to front of queue. |
| **Dynamic agent creation** | Analyze new data sources or emerging patterns → generate new agent specs at runtime. |

**Orchestrator decision loop (runs on `orchestrator` BullMQ queue):**

```
1. Check queue depths across all ingest queues
2. Check agent health (last successful run, error rate, avg confidence)
3. Check cost budgets (daily token usage vs limits)
4. Process routing decisions for ambiguous data
5. Process conflict resolution requests
6. Check monitoring agent alerts for potential escalation
7. Evaluate if dynamic agent creation is warranted
8. Emit orchestrator metrics to SSE for dashboard
```

### 5.2 Agent Registry

Stored in MongoDB `agent_registry` collection.

```typescript
interface AgentDefinition {
  id: string;                    // "news-rss", "conflict-acled", "dynamic-arctic-shipping"
  name: string;                  // "News/RSS Analyst"
  status: "active" | "paused" | "stubbed" | "error";
  created: "built-in" | "dynamic";
  
  // Model configuration
  model: "haiku" | "sonnet" | "opus";
  systemPrompt: string;
  extractionSchema: object;      // JSON Schema for expected output
  
  // Trigger configuration
  trigger: "data_arrival" | "schedule" | "event" | "manual";
  schedule?: string;             // cron expression if trigger=schedule
  sources: string[];             // glob patterns: ["rss-*", "newsapi"]
  
  // Graph operations this agent can perform
  allowedOperations: string[];   // ["upsert_node", "upsert_edge", "merge_node"]
  
  // Cost & performance
  costBudget: {
    dailyMaxTokens: number;
    maxTokensPerCall: number;
  };
  performance: {
    avgConfidence: number;
    entitiesPerDoc: number;
    avgLatencyMs: number;
    errorRate: number;
  };
  
  // Memory
  proceduralMemory: string;      // accumulated lessons learned (evolving document)
}
```

### 5.3 Specialized Ingestion Agents

**All agents output the same graph operation format:**

```typescript
interface GraphOperationBatch {
  agentId: string;
  sourceId: string;
  rawDocId: string;
  timestamp: DateTime;
  operations: GraphOperation[];
}

type GraphOperation =
  | { op: "upsert_node"; type: string; id: string; properties: object; confidence: number; reasoning: string }
  | { op: "upsert_edge"; from: string; to: string; relation: string; weight: number; confidence: number; reasoning: string }
  | { op: "merge_node"; target: string; into: string; confidence: number; reasoning: string }
  | { op: "update_weight"; from: string; to: string; relation: string; delta: number; reasoning: string }
  | { op: "flag_ambiguous"; entityId: string; candidates: string[]; reasoning: string }
```

#### V1 Agents (10 — fully implemented)

**1. News/RSS Agent**
- **Model:** Haiku
- **Sources:** 220+ RSS feeds, NewsAPI
- **Extracts:** Countries, organizations, people, conflicts, events, claims
- **Relations:** MENTIONS, RELATED_TO, INVOLVES, ESCALATES
- **Special:** Deduplication across sources reporting the same event. Trust scoring based on source tier. Multi-article event clustering.

**2. Conflict/ACLED Agent**
- **Model:** Haiku
- **Sources:** ACLED API, UCDP
- **Extracts:** Conflict events, parties, locations, fatalities
- **Relations:** PARTY_TO, ATTACKS, OPERATES_IN, ALLIED_WITH
- **Special:** Maps ACLED event types to graph relations. Tracks escalation/de-escalation patterns.

**3. Sanctions Agent**
- **Model:** Sonnet (complex legal language)
- **Sources:** OFAC SDN list, EU sanctions, UN sanctions databases
- **Extracts:** Sanctioned entities, sanctioning authorities, sanction types
- **Relations:** SANCTIONS, DESIGNATED_BY, ASSOCIATED_WITH, EVADES
- **Special:** Cross-references sanctioned entities with vessel/company nodes. Detects potential evasion networks.

**4. Elections Agent**
- **Model:** Haiku
- **Sources:** IFES, election commission feeds, news
- **Extracts:** Elections, candidates, parties, results, irregularities
- **Relations:** CANDIDATE_IN, MEMBER_OF, CONTESTED_BY, SUCCEEDS
- **Special:** Countdown tracking. Instability risk scoring based on pre-election indicators.

**5. Shipping/AIS Agent**
- **Model:** Haiku
- **Sources:** AIS transponder data, MarineTraffic API, Lloyd's List
- **Extracts:** Vessels, ports, routes, anomalous behaviors
- **Relations:** DOCKED_AT, TRANSITS, CARGO_FOR, FLAGGED_BY
- **Special:** Dark period detection (AIS off). Route deviation alerts. Sanctioned vessel proximity. Ship-to-ship transfer detection.

**6. Satellite Agent**
- **Model:** Sonnet (image analysis context)
- **Sources:** Sentinel Hub, Planet Labs, Maxar (via APIs)
- **Extracts:** Observations (construction, military activity, environmental change), facilities
- **Relations:** OBSERVED_AT, CHANGED_SINCE, CONSTRUCTED_BY, INDICATES
- **Special:** Change detection alerts. Cross-references with ground truth from other agents.

**7. Social/OSINT Agent**
- **Model:** Sonnet (nuance required)
- **Sources:** Twitter/X API, Telegram channels, Reddit, curated OSINT feeds
- **Extracts:** Claims, sentiment, narratives, disinformation signals
- **Relations:** CLAIMS, AMPLIFIES, CONTRADICTS, ORIGINATES_FROM
- **Special:** Source credibility scoring. Bot/coordination detection. Narrative tracking across platforms.

**8. Cyber Threat Agent**
- **Model:** Sonnet
- **Sources:** CISA advisories, MITRE ATT&CK, VirusTotal, threat intel feeds
- **Extracts:** Incidents, threat actors, TTPs, targets, vulnerabilities
- **Relations:** ATTRIBUTED_TO, TARGETS, EXPLOITS, USES_TTP
- **Special:** APT attribution mapping. Cross-references with nation-state actors in the graph.

**9. Financial Markets Agent**
- **Model:** Haiku
- **Sources:** Market data APIs, central bank feeds, commodity exchanges
- **Extracts:** Price movements, policy changes, trade flow data, currency events
- **Relations:** TRADES_WITH, IMPACTS, CORRELATES_WITH, DENOMINATED_IN
- **Special:** Anomalous movement detection. Sanctions impact on trade flows. Currency crisis indicators.

**10. Flight/ADS-B Agent**
- **Model:** Haiku
- **Sources:** ADS-B Exchange, FlightAware, OSINT aviation trackers
- **Extracts:** Flights, aircraft, operators, unusual patterns
- **Relations:** OPERATED_BY, FLEW_TO, DIVERTED_FROM, SHADOWED
- **Special:** Military/government aircraft tracking. Unusual routing. Correlation with diplomatic events.

#### V2+ Agents (20 — stubbed with interfaces)

Each has a defined `AgentDefinition` in the registry with `status: "stubbed"` and a placeholder system prompt. Implementing them means: writing the real system prompt, connecting the data source, and setting `status: "active"`.

| # | Agent | Category | Data Sources |
|---|---|---|---|
| 11 | Terrorism/Extremism | Security | GTD, SITE Intel |
| 12 | Military Movements | Security | OSINT, satellite, news |
| 13 | Nuclear/WMD | Security | IAEA, news, satellite |
| 14 | Law Enforcement | Security | Interpol, FBI |
| 15 | Trade Flows/Tariffs | Economic | WTO, trade databases |
| 16 | Commodities/Energy | Economic | EIA, OPEC, exchanges |
| 17 | Supply Chain | Economic | shipping + trade + news synthesis |
| 18 | Diplomatic Comms | Political | UN, state dept feeds |
| 19 | UN/Intl Org | Political | UN feeds, resolutions |
| 20 | Legislative/Regulatory | Political | Government feeds |
| 21 | NGO/Humanitarian | Political | ReliefWeb, WHO, UNHCR |
| 22 | Weather/Disasters | Environmental | NOAA, GDACS, EONET |
| 23 | Climate/Environmental | Environmental | NASA, Copernicus |
| 24 | Infrastructure Status | Environmental | port/pipeline/grid APIs |
| 25 | Disinformation Tracking | Information | EUvsDisinfo, DFRLab |
| 26 | Academic/Think Tank | Information | RSS, SSRN, think tank feeds |
| 27 | Sentiment Analysis | Information | aggregated social/news |
| 28 | RF/SIGINT (open) | Signals | WebSDR, open RF databases |
| 29 | Maritime Domain (beyond AIS) | Signals | SAR satellite, coastal radar |
| 30 | Space/Orbital | Signals | Space-Track.org, CelesTrak |

#### Dynamic Agents (runtime-created)

The orchestrator can create new agents when:

1. **New data source added** — analyst plugs in an API that doesn't fit existing agents. Orchestrator analyzes sample data (Opus call), generates system prompt and extraction schema, registers new agent, begins processing.

2. **Emerging pattern needs focus** — monitoring agent detects surge in Arctic shipping + Russian military activity + climate data. Orchestrator creates a temporary "Arctic Focus Agent" that synthesizes across those domains with enhanced extraction for Arctic-specific entities.

3. **Analyst request** — "I need an agent that watches for Chinese investment in African ports." Orchestrator creates a focused monitoring agent with appropriate graph queries and alerting thresholds.

**Dynamic agent creation flow:**

```
Trigger (new source / pattern / request)
    ↓
Orchestrator analyzes context (Opus)
    ↓
Generates AgentDefinition:
  - system prompt
  - extraction schema
  - source connections
  - graph operation permissions
  - cost budget
    ↓
Registers in agent_registry (created: "dynamic")
    ↓
Creates BullMQ queue + worker
    ↓
Begins processing
    ↓
Orchestrator monitors performance, adjusts or retires
```

### 5.4 Monitoring Agents

Run on schedule or graph-change events. Use Sonnet.

**Anomaly Detection Agent:**
- Watches for statistical anomalies: unusual spike in edges involving an entity, sudden confidence drops, new clusters forming
- Queries Neo4j for rolling baselines and z-score deviations
- Outputs alerts to `anomalyAlerts` SSE channel

**Pattern Recognition Agent:**
- Searches for known escalation patterns in the graph structure
- Uses vector similarity (Voyage embeddings) to find historical parallels
- "The current Iran graph structure is 87% similar to the pre-2019 Hormuz crisis pattern"

**Consistency Agent:**
- Looks for contradictions in the graph: entity A sanctions entity B but also trades with B
- Flags for analyst review or orchestrator resolution

### 5.5 Chat Agent

User-facing, runs on Sonnet with Opus escalation for complex queries.

**Tools available to the chat agent:**

| Tool | Description |
|---|---|
| `query_graph` | Execute Cypher query against Neo4j |
| `semantic_search` | Vector similarity search across node embeddings |
| `search_raw_docs` | Full-text search in MongoDB raw documents |
| `get_entity_detail` | Full entity with provenance, edges, history |
| `get_timeline` | Graph state at historical timestamp |
| `compare_entities` | Side-by-side comparison of 2-3 entities |
| `find_paths` | Shortest path between two entities (max 4 hops) |
| `highlight_on_map` | Push visualization command to frontend (highlight nodes/edges on globe + Cosmograph) |
| `create_annotation` | Add analyst note to an entity |
| `generate_report` | Trigger synthesis agent for a focused brief |

**Chat flow:**

```
Analyst: "What connects Iran's port activity to Houthi attacks?"
    ↓
Chat agent decomposes into:
  1. query_graph: Iran → ports → vessels → Red Sea region
  2. query_graph: Houthi attacks → locations → vessels targeted
  3. find_paths: from country:iran to org:houthi via maritime entities
  4. search_raw_docs: recent articles mentioning Iran + Houthi + shipping
    ↓
Synthesizes answer with citations to specific nodes/edges/articles
    ↓
highlight_on_map: lights up the relevant subgraph on globe + Cosmograph
```

### 5.6 Synthesis Agent

Generates intelligence products. Runs on Opus.

- **Daily brief:** Top 10 graph changes, emerging risks, new connections
- **Weekly report:** Trend analysis, pattern evolution, forecast
- **On-demand brief:** Analyst requests focused report on a topic/region/entity
- **Alert digest:** Summarizes all alerts from the past N hours

Output format supports export to PDF, email, Slack, webhook.

### 5.7 Agent Memory

Three tiers, all persistent:

**Factual memory** — the graph itself. Agents query Neo4j for what they know about the world. Temporal versioning means they can also query what the world looked like at any point in the past.

**Procedural memory** — stored per agent in MongoDB `agent_memory` collection. An evolving document that gets prepended to the agent's system prompt. Updated when:
- Agent makes an error that's corrected by an analyst
- Agent discovers a processing pattern that works well
- Orchestrator identifies a best practice from cross-agent analysis

Example procedural memory entry:
```
[2025-03-15] When processing ACLED data for Syria, the "admin1" field often 
contains inconsistent transliterations. Always normalize via the canonical 
country:syria → admin regions before entity resolution.
```

**Strategic memory** — vector-based pattern matching. When a monitoring agent detects a pattern, it embeds that pattern and stores it. Future patterns are compared against historical embeddings to find parallels. Stored as dedicated nodes in Neo4j with type `pattern`.

### 5.8 Confidence Thresholds & Circuit Breakers

| Confidence | Action | Review |
|---|---|---|
| > 0.9 | Agent acts autonomously | Logged, sampled by QA |
| 0.7 - 0.9 | Agent acts, flags for review | Appears in analyst review queue |
| 0.5 - 0.7 | Agent proposes, waits for approval | Analyst must approve before graph mutation |
| < 0.5 | Agent escalates to orchestrator | Orchestrator may use Opus or escalate to analyst |

**Mandatory human review regardless of confidence:**

- Merging two entity nodes with > 50 edges each
- Creating an edge that implies a new alliance or conflict
- Any operation that changes a country's risk level by 2+ tiers
- Any operation from a dynamic (runtime-created) agent in its first 24 hours
- Daily cost exceeding 120% of budget for any single agent
- Two agents producing contradictory operations that the orchestrator can't resolve

---

## 6. LLM Configuration

### 6.1 Provider

Anthropic Claude exclusively. Three model tiers:

| Tier | Model | Use Cases | Cost Sensitivity |
|---|---|---|---|
| **Haiku** | claude-haiku (latest) | Ingestion agents, high-volume extraction | High volume, low cost per call |
| **Sonnet** | claude-sonnet (latest) | Monitoring, chat, orchestration, sanctions/OSINT agents | Balanced |
| **Opus** | claude-opus (latest) | Complex analysis, synthesis, dynamic agent creation, conflict resolution | Low volume, high value per call |

### 6.2 Key Management

**Platform keys** (server-side, Anthropic direct):
- Used for all background agents (ingestion, monitoring, synthesis, orchestration)
- Managed in encrypted `settings` collection
- Usage metered per agent per day

**BYOK** (user-provided):
- Optional, configured per user in settings panel
- Used only for user-initiated actions: chat agent, on-demand reports
- Key stored encrypted, masked in UI
- Validated against Anthropic API on save

**Routing logic:**
```
if (task.type === "background") → platform key
else if (user.byokKey exists && user.byokEnabled) → user's BYOK key
else → platform key (metered against user's allocation)
```

### 6.3 Embeddings

**Provider:** Voyage AI
**Model:** `voyage-3-large` (1024 dimensions)
**Pipeline:** Every new/updated node → embedding queue → Voyage API → Neo4j vector index update

Embedding triggers:
- New node created
- Node label or key properties change significantly
- Periodic re-embedding for frequently updated nodes (e.g., countries with changing risk levels)

---

## 7. Frontend Architecture

### 7.1 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Preact 10.x + `@preact/signals` |
| Build | Vite 5.x + `@preact/preset-vite` |
| Globe/Map | Deck.GL 9.x (GlobeView + MapView + OrthographicView) |
| Base map | Mapbox GL JS + dark style |
| Graph viz | Cosmograph (full dataset + focused subgraph views) |
| State | Preact Signals |
| Styling | CSS Modules + CSS custom properties |
| Testing | Vitest |

### 7.2 Design Direction

**Dark intelligence command center.** Near-black backgrounds (#0a0a0f to #12121a), electric blue/cyan accents for active elements, amber for warnings, red for critical. Translucent glass-morphism panels. Monospace for data values. Subtle, purposeful animation.

### 7.3 View Architecture

Three peer views of the same knowledge graph, all driven by the same data signals:

**Globe View (Deck.GL + Mapbox):**
- Primary operational view
- Nodes with lat/lng rendered as points on the globe
- Edges rendered as arcs across the globe surface (ArcLayer)
- Mapbox dark base tiles for geographic context
- GlobeView for zoomed out, MapView (flat) for zoomed in
- Handles millions of points via typed arrays and GPU instancing

**Graph Explorer View (Cosmograph):**
- Full dataset visualization: all nodes and edges rendered force-directed
- GPU-accelerated for large graphs
- Focused subgraph mode: select an entity → Cosmograph shows its N-hop neighborhood
- Nodes colored by entity type, sized by edge count or importance
- Interactive: click node → detail panel, drag to explore, zoom clusters

**Orthographic View (Deck.GL OrthographicView):**
- Force-directed layout computed by D3-force, rendered by Deck.GL
- For analysts who want graph structure without geographic constraints
- Lightweight alternative to Cosmograph for smaller subgraphs

**View transitions:**
- Globe ↔ Cosmograph: smooth data handoff, selected entity persists
- Globe ↔ Flat (Mapbox): zoom-based automatic transition
- Any view: clicking an entity highlights it across all open views

### 7.4 Frontend File Structure

```
frontend/
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  src/
    main.tsx                              # Preact render entry
    app.tsx                               # Root layout: views + panels + alerts
    
    api/
      client.ts                           # fetch wrapper, auth headers, base URL
      graph.ts                            # Neo4j query proxy endpoints
      stream.ts                           # SSE + WebSocket connections
      agents.ts                           # Agent status, registry endpoints
      settings.ts                         # User settings, BYOK config
      alerts.ts                           # Alert rules, delivery config
      reports.ts                          # Report generation + export
      
    state/
      store.ts                            # Core signals: view mode, selected entity, auth
      graph.ts                            # Graph data signals: nodes, edges, filters
      agents.ts                           # Agent status, orchestrator metrics
      alerts.ts                           # Active alerts, dismissed alerts
      timeline.ts                         # Time position, historical mode
      annotations.ts                      # Analyst annotations
      settings.ts                         # User preferences, BYOK state
      
    views/
      globe/
        deck-map.tsx                      # Deck.GL canvas (GlobeView + MapView)
        mapbox-base.ts                    # Mapbox dark base tiles
        globe-layers.ts                   # Node points, edge arcs, clusters
        view-transition.ts                # Globe ↔ flat transition
      graph/
        cosmograph-view.tsx               # Cosmograph full + subgraph view
        cosmograph-config.ts              # Layout, colors, sizing rules
      orthographic/
        ortho-view.tsx                    # Deck.GL OrthographicView + D3-force layout
        
    panels/
      entity-detail.tsx                   # Universal detail panel (any entity type)
      entity-connections.tsx              # Connections tab (N-hop graph)
      entity-timeline.tsx                 # Entity history over time
      chat.tsx                            # LLM chat interface
      news-feed.tsx                       # Real-time news with provenance
      alert-banner.tsx                    # Top notification bar
      alert-history.tsx                   # Alert log
      sidebar.tsx                         # Watchlist + layer toggles + agent status
      search.tsx                          # Global search
      annotations.tsx                     # Analyst annotation panel
      compare.tsx                         # Side-by-side entity comparison
      settings.tsx                        # User settings + BYOK config
      reports.tsx                         # Report viewer + export
      agent-monitor.tsx                   # Agent health dashboard
      
    components/
      badge.tsx                           # Risk/status/severity badges
      tooltip.tsx                         # Map hover tooltip
      sparkline.tsx                       # Tiny inline chart
      trust-badge.tsx                     # Provenance indicator
      confidence-meter.tsx                # Visual confidence display
      
    styles/
      variables.css                       # Design tokens
      app.css                             # Root layout
      
    workers/
      data-worker.ts                      # Binary ArrayBuffer parsing
```

### 7.5 Real-Time Data Flow

**SSE events from backend:**

| Event | Action |
|---|---|
| `graph:node-created` | Add node to active views |
| `graph:node-updated` | Update node properties + re-render |
| `graph:edge-created` | Add edge arc to globe + line to Cosmograph |
| `graph:edge-updated` | Update edge weight/color |
| `alert:anomaly` | Show alert banner + pulse affected node |
| `alert:pattern` | Show pattern detection notification |
| `agent:status` | Update agent health in sidebar |
| `agent:insight` | Show proactive insight card |
| `news:article` | Add to news feed |
| `news:analysis` | Show AI synthesis card |
| `chat:response` | Stream LLM response to chat panel |
| `report:ready` | Notify report generation complete |

### 7.6 Multi-User Collaboration

- WebSocket-based presence: see who's viewing what
- Shared annotations: analyst A's annotation visible to team
- Shared views: "share this graph view" → generates a URL with view state
- Role-based visibility: viewer sees graph, analyst can annotate, admin can configure agents

---

## 8. Auth & Multi-Tenancy

### 8.1 Authentication

**OAuth/SSO providers:**
- Google Workspace
- GitHub
- Microsoft Entra ID
- SAML 2.0 (enterprise)

**Session management:** JWT tokens, stored in Redis, 24h TTL, refresh rotation.

### 8.2 Authorization (RBAC)

| Role | Permissions |
|---|---|
| **Viewer** | Read graph, view alerts, use chat, view reports |
| **Analyst** | All viewer + create annotations, export reports, configure personal alerts |
| **Team Lead** | All analyst + manage team members, configure team alert rules |
| **Admin** | All team lead + configure agents, manage BYOK keys, manage teams, view cost metrics |
| **System** | Internal only — agent operations, orchestrator actions |

### 8.3 Team-Level Data Isolation

Each team has a `dataScope` that defines which entity types and regions they can access:

```typescript
interface TeamScope {
  entityTypes: string[] | "*";           // ["country", "conflict", "vessel"] or all
  regions: string[] | "*";              // ["Middle East", "East Asia"] or all
  classifications: string[] | "*";      // data sensitivity levels
  agentAccess: string[] | "*";         // which agents' outputs they can see
}
```

All graph queries are filtered through team scope before returning results.

---

## 9. External Alerting

### 9.1 Alert Rules

Analysts define rules that trigger external notifications:

```typescript
interface AlertRule {
  id: string;
  userId: string;
  teamId: string;
  condition: {
    type: "anomaly" | "pattern" | "threshold" | "entity_change" | "custom_cypher";
    parameters: object;   // severity >= "alert", entity = "country:iran", etc.
  };
  channels: ("email" | "slack" | "webhook")[];
  channelConfig: {
    email?: string;
    slackWebhook?: string;
    webhookUrl?: string;
  };
  cooldown: number;        // minimum seconds between alerts
  active: boolean;
}
```

### 9.2 Delivery

Processed via `alerts` BullMQ queue. Each delivery is logged in `alert_history` with status (delivered, failed, throttled).

---

## 10. Export & Reporting

### 10.1 Report Types

| Type | Trigger | Content |
|---|---|---|
| Daily brief | Scheduled (06:00 UTC) | Top graph changes, new risks, alerts summary |
| Weekly report | Scheduled (Monday 08:00 UTC) | Trend analysis, pattern evolution, forecasts |
| Entity dossier | On-demand | Complete entity profile with connections, history, analysis |
| Situation report | On-demand | Focused analysis of a region/topic/crisis |
| Custom query report | On-demand | Chat agent produces a report from any analytical question |

### 10.2 Export Formats

- PDF (styled, with embedded graph visualizations)
- Markdown
- JSON (raw data for programmatic consumption)
- Email (HTML formatted)

---

## 11. Analyst Annotation Layer

Analysts can manually contribute intelligence that no automated feed captures.

**Annotation types:**

| Type | Description |
|---|---|
| `note` | Free-text note attached to any node or edge |
| `manual_node` | Analyst creates a new entity manually |
| `manual_edge` | Analyst creates a new relationship manually |
| `correction` | Analyst corrects an agent's entity resolution or classification |
| `assessment` | Analyst provides a subjective assessment (e.g., "this conflict is likely to escalate") |
| `classification` | Analyst tags an entity with a sensitivity level |

All annotations carry the analyst's identity and timestamp. They are first-class citizens in the graph — query-able, visible in detail panels, and factored into agent analysis.

---

## 12. Infrastructure

### 12.1 Local Development

```yaml
# docker-compose.yml
services:
  api:
    build: ./api
    ports: ["3000:3000"]
    depends_on: [neo4j, mongo, redis]
    
  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    
  neo4j:
    image: neo4j:5
    ports: ["7474:7474", "7687:7687"]
    volumes: [neo4j-data:/data]
    environment:
      NEO4J_PLUGINS: '["apoc", "graph-data-science"]'
      
  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes: [mongo-data:/data/db]
    
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    
  bullmq-dashboard:
    image: taskforcesh/bullmq-dashboard
    ports: ["3001:3001"]
```

### 12.2 Production (Managed Cloud)

| Service | Provider | Notes |
|---|---|---|
| API + Workers | Railway or Fly.io | Auto-scaling, deploy from Git |
| Neo4j | Neo4j Aura | Managed graph DB, vector index support |
| MongoDB | Atlas | Managed, automated backups |
| Redis | Upstash or Railway Redis | Managed, persistence enabled |
| Frontend | Vercel or Cloudflare Pages | CDN, edge deployment |
| Secrets | Provider vault | Encrypted API keys |

### 12.3 API Gateway & Rate Limiting

External data source connections managed by a gateway layer:

```typescript
interface SourceConnection {
  sourceId: string;           // "acled", "marinetraffic", "newsapi"
  baseUrl: string;
  auth: { type: "apikey" | "oauth" | "basic"; credentials: encrypted };
  rateLimit: { requests: number; window: "second" | "minute" | "hour" };
  circuitBreaker: { failureThreshold: 5; resetTimeout: 60000 };
  retryPolicy: { maxRetries: 3; backoff: "exponential" };
  status: "active" | "degraded" | "down";
}
```

---

## 13. Build Phases

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Core infrastructure running, graph accepting data, one agent working.

| Task | Description | Priority |
|---|---|---|
| 1.1 | Docker Compose setup (Neo4j + Mongo + Redis + API) | P0 |
| 1.2 | Neo4j schema: node/edge definitions, indexes, constraints | P0 |
| 1.3 | Graph mutation API: create/update/merge nodes and edges | P0 |
| 1.4 | Event sourcing: append-only event log for all graph mutations | P0 |
| 1.5 | Agent registry + orchestrator skeleton (routing, lifecycle) | P0 |
| 1.6 | BullMQ queue setup for all ingest queues | P0 |
| 1.7 | News/RSS ingestion agent (fully functional) | P0 |
| 1.8 | Voyage AI embedding pipeline (embed on node create/update) | P1 |
| 1.9 | SSE event bus for graph changes | P1 |
| 1.10 | Auth: OAuth (Google) + JWT sessions + basic RBAC | P1 |

**Milestone:** News articles flowing in → agent extracts entities → graph populated → SSE events emitting.

### Phase 2: Frontend Core (Weeks 2-3)

**Goal:** Globe + Cosmograph rendering the graph, basic interaction.

| Task | Description | Priority |
|---|---|---|
| 2.1 | Vite + Preact scaffold, design tokens (CSS variables) | P0 |
| 2.2 | Deck.GL globe with Mapbox dark base tiles | P0 |
| 2.3 | Globe layers: render graph nodes as points, edges as arcs | P0 |
| 2.4 | Cosmograph integration: full graph view | P0 |
| 2.5 | View switching: globe ↔ Cosmograph ↔ flat | P0 |
| 2.6 | Entity detail panel (universal, any type) | P1 |
| 2.7 | Sidebar: entity watchlist + agent status | P1 |
| 2.8 | SSE integration: live graph updates in views | P1 |
| 2.9 | Search bar: full-text + semantic search | P1 |
| 2.10 | Dark intelligence theme + glass-morphism panels | P1 |

**Milestone:** Analyst can see the knowledge graph on a globe, switch to Cosmograph, click entities, search, watch live updates.

### Phase 3: Intelligence Layer (Weeks 3-5)

**Goal:** Remaining V1 agents, monitoring, chat, alerts.

| Task | Description | Priority |
|---|---|---|
| 3.1 | Conflict/ACLED agent | P0 |
| 3.2 | Sanctions agent | P0 |
| 3.3 | Elections agent | P0 |
| 3.4 | Shipping/AIS agent | P0 |
| 3.5 | Satellite agent | P1 |
| 3.6 | Social/OSINT agent | P1 |
| 3.7 | Cyber threat agent | P1 |
| 3.8 | Financial markets agent | P1 |
| 3.9 | Flight/ADS-B agent | P1 |
| 3.10 | Monitoring agents (anomaly + pattern + consistency) | P0 |
| 3.11 | Chat agent with tool use | P0 |
| 3.12 | Alert banner + notification system | P0 |
| 3.13 | External alerting (email/Slack/webhook) | P1 |

**Milestone:** 10 agents feeding the graph, monitoring detecting anomalies, chat answering questions, alerts firing.

### Phase 4: Analyst Tools (Weeks 5-7)

**Goal:** Annotation, collaboration, reporting, timeline.

| Task | Description | Priority |
|---|---|---|
| 4.1 | Annotation layer (notes, manual nodes/edges, corrections) | P0 |
| 4.2 | Timeline scrubber (historical graph state via event sourcing) | P0 |
| 4.3 | Compare mode (side-by-side entities with shared connections) | P1 |
| 4.4 | News feed panel with provenance badges | P1 |
| 4.5 | Synthesis agent + daily/weekly briefs | P1 |
| 4.6 | Report generation + PDF export | P1 |
| 4.7 | Multi-user presence (WebSocket) | P1 |
| 4.8 | Shared annotations + view sharing | P2 |
| 4.9 | Agent monitor dashboard | P2 |
| 4.10 | Settings panel (BYOK, alert rules, preferences) | P1 |

**Milestone:** Full analyst workflow — ingest, explore, annotate, collaborate, report.

### Phase 5: Autonomy + Scale (Weeks 7-9)

**Goal:** Dynamic agents, advanced orchestration, performance.

| Task | Description | Priority |
|---|---|---|
| 5.1 | Dynamic agent creation (orchestrator + Opus) | P1 |
| 5.2 | Agent procedural memory (learning from corrections) | P1 |
| 5.3 | Strategic memory (pattern embeddings + historical parallels) | P2 |
| 5.4 | Orchestrator cost management + budget enforcement | P1 |
| 5.5 | Full RBAC + team data isolation | P1 |
| 5.6 | Materialized snapshots for fast historical queries | P2 |
| 5.7 | Performance: typed arrays for Deck.GL, Web Workers for parsing | P1 |
| 5.8 | Service worker + offline shell caching | P2 |
| 5.9 | Stub all 20 remaining V2 agents with interfaces | P2 |
| 5.10 | Production deployment (managed cloud) | P1 |

**Milestone:** Platform is autonomous, scalable, and deployed.

---

## 14. Cost Management

### 14.1 LLM Cost Model

| Agent tier | Model | Est. tokens/call | Est. calls/day | Daily cost est. |
|---|---|---|---|---|
| News ingestion | Haiku | ~2K | 500-1000 | $0.50-1.00 |
| Conflict/ACLED | Haiku | ~1.5K | 50-100 | $0.05-0.10 |
| Sanctions | Sonnet | ~3K | 20-50 | $0.20-0.50 |
| Shipping/AIS | Haiku | ~1K | 200-500 | $0.20-0.50 |
| Other ingestion (6) | Haiku/Sonnet | ~2K | 50-200 each | $0.50-2.00 |
| Monitoring (3) | Sonnet | ~5K | 50-100 | $0.75-1.50 |
| Orchestrator | Sonnet | ~3K | 100-200 | $0.30-0.60 |
| Chat (user-initiated) | Sonnet | ~5K | varies | per-usage |
| Synthesis | Opus | ~10K | 2-5 | $0.50-1.00 |
| Embeddings (Voyage) | voyage-3-large | ~500 | 500-1000 | $0.05-0.10 |
| **Total platform cost** | | | | **~$3-8/day baseline** |

These are rough estimates. Actual costs depend on data volume and will need tuning.

### 14.2 Budget Controls

- Per-agent daily token limits in `AgentDefinition.costBudget`
- Orchestrator tracks cumulative usage and can pause non-critical agents
- Dashboard shows real-time cost breakdown by agent
- Alerts when any agent exceeds 80% of daily budget

---

## 15. Verification Checklist

### Foundation
- [ ] Docker Compose starts all services (Neo4j, Mongo, Redis, API)
- [ ] Neo4j schema created with all indexes
- [ ] Graph mutation API creates/updates/merges nodes and edges
- [ ] Event sourcing records all graph mutations
- [ ] News/RSS agent processes articles into graph operations

### Frontend
- [ ] Globe renders with Mapbox dark tiles + graph nodes as points
- [ ] Graph edges arc across globe surface
- [ ] Cosmograph renders full graph + focused subgraph
- [ ] View switching (globe ↔ Cosmograph ↔ flat) works smoothly
- [ ] Entity detail panel shows for any clicked entity
- [ ] SSE updates reflected in real-time on both views
- [ ] Search returns results across all entity types

### Intelligence
- [ ] All 10 V1 agents processing data into the graph
- [ ] Monitoring agents detect anomalies and fire alerts
- [ ] Chat agent answers questions with graph queries + citations
- [ ] Alert banner appears on anomaly SSE events
- [ ] External alerts deliver via email/Slack/webhook

### Analyst Tools
- [ ] Annotations persist and display for team members
- [ ] Timeline scrubber shows historical graph state
- [ ] Reports generate and export as PDF
- [ ] Multi-user presence shows who's online
- [ ] BYOK configuration saves and validates

### Autonomy
- [ ] Orchestrator routes data to correct agents
- [ ] Dynamic agent creation works from orchestrator
- [ ] Agent procedural memory updates on analyst corrections
- [ ] Cost dashboard shows per-agent usage
- [ ] Team data isolation enforced on all queries
