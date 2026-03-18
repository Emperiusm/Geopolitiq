# Gambit Platform — Backend Upgrades Addendum

**Date:** 2026-03-17
**Status:** Implemented
**Scope:** Backend intelligence pipeline, real-time processing, extensibility
**Extends:** [hegemon-data-platform-design.md](2026-03-17-hegemon-data-platform-design.md) (Sections 4, 3, 8)

---

## 1. Overview

This addendum documents seven backend upgrades implemented after the base spec was written. These upgrades transform Gambit from a static data platform into a live intelligence system with real-time ingestion, entity graph analysis, temporal scrubbing, anomaly detection, source verification, AI-enhanced analysis, and a plugin architecture for extensibility.

All upgrades are backwards-compatible with the base spec — existing API routes, data models, and frontend contracts continue to work unchanged. New capabilities are additive.

### Upgrade summary

| # | Upgrade | Key files | Impact |
|---|---------|-----------|--------|
| 1 | Binary cache optimization | `binary-cache.ts`, `layers.ts` | 5x less Redis memory, zero-copy cache path |
| 2 | Temporal snapshots | `snapshots.ts`, `timeline.ts` | Time-scrubbing, rewind world state to any point |
| 3 | NLP entity enrichment | `entity-dictionary.ts`, `enrichment.ts` | Auto-link news to countries/conflicts/chokepoints/NSA |
| 4 | Graph relationships | `graph.ts`, `graph.ts` (routes) | Entity-to-entity queryable links, connection discovery |
| 5 | Live RSS ingestion | `feed-registry.ts`, `rss-parser.ts`, `news-aggregator.ts` | 220+ feeds, tiered polling, dedup, BYOK AI analysis |
| 6 | Plugin system | `plugin-registry.ts`, `plugin-routes.ts` | Drop-in data sources, custom layers, enrichment hooks |
| 7 | Anomaly detection | `anomaly-detector.ts`, `anomalies.ts` | Z-score spike detection on entity mention frequency |
| — | Source provenance | `provenance.ts`, `citation-extractor.ts`, `source-tiers.ts` | Citation chain tracking, trust scoring, fabrication flags |
| — | BYOK user settings | `user-settings.ts`, `settings-routes.ts` | Encrypted API key storage, per-user AI analysis |

---

## 2. New project structure

These files were added to `api/src/`. Files from the base spec are omitted for clarity.

```
api/src/
  infrastructure/
    binary-cache.ts           # Buffer-native Redis cache for binary layers
    snapshots.ts              # Temporal snapshot capture + retrieval
    entity-dictionary.ts      # Dictionary-based NER from Mongo collections
    enrichment.ts             # enrichNewsItem() — entity linking pipeline
    graph.ts                  # Graph edge builder + query helpers
    feed-registry.ts          # 220+ RSS feeds with tier/category metadata
    rss-parser.ts             # Zero-dep regex RSS/Atom XML parser
    plugin-registry.ts        # Plugin discovery, validation, auto-wiring
    anomaly-detector.ts       # Z-score spike detection on Redis counters
    user-settings.ts          # Encrypted BYOK API key storage (AES-256-GCM)
    ai-analysis.ts            # Tier 2 LLM analysis (Anthropic + OpenAI)
    provenance.ts             # Source provenance scoring + trust assessment
    citation-extractor.ts     # Citation chain extraction from article text
    source-tiers.ts           # Static trust tier registry per feed domain
  modules/
    aggregate/
      timeline.ts             # GET /timeline/at, /timeline/range
      graph.ts                # GET /graph/connections, /graph/path
      anomalies.ts            # GET /anomalies, /anomalies/baseline/:type/:id
    periodic/
      news-aggregator.ts      # Tiered RSS poller + dedup + enrich pipeline
      anomaly-cleanup.ts      # Prune Redis counter hashes older than 7 days
    system/
      settings-routes.ts      # PUT/GET/DELETE /settings/ai
      plugin-routes.ts        # GET /plugins/manifest, /plugins/:id/status
  types/
    index.ts                  # Extended with 15+ new interfaces (see Section 3)
```

---

## 3. New data models (MongoDB collections)

### 3.11 `snapshots` (temporal state)

One document per snapshot. Captures only mutable fields from 4 collections. ~80KB per snapshot.

```ts
{
  _id: ObjectId,
  timestamp: Date,
  trigger: "scheduled" | "event",
  triggerDetail?: string,           // e.g. "chokepoint-status-change:hormuz"
  conflicts: Array<{ _id, status, dayCount, casualties }>,
  chokepoints: Array<{ _id, status }>,
  countries: Array<{ _id, risk, leader, tags }>,
  nsa: Array<{ _id, status, zones }>,
}
```

**Indexes:** `{ timestamp: -1 }`
**Growth rate:** 24/day (hourly scheduled) + event-triggered. ~56MB/month.
**Retention:** All snapshots kept. Future: thin to daily after 90 days, weekly after 1 year.

### 3.12 `edges` (entity graph)

Normalized adjacency collection. Every entity relationship stored as a uniform edge document.

```ts
{
  _id: ObjectId,
  from: { type: EntityType, id: string },
  to: { type: EntityType, id: string },
  relation: EdgeRelation,
  weight: number,           // 1.0 = explicit (seed), 0.5-0.9 = inferred
  source: "seed" | "nlp" | "inferred",
  createdAt: Date,
}
```

**Entity types:** country, conflict, chokepoint, nsa, base, trade-route, port, news
**Relation types:** involves, hosted-by, operated-by, depends-on, ally-of, rival-of, passes-through, originates-at, terminates-at, port-in, participates-in, disrupts, mentions

**Indexes:** `{ "from.type": 1, "from.id": 1 }`, `{ "to.type": 1, "to.id": 1 }`, `{ relation: 1 }`, `{ "from.id": 1, "to.id": 1 }`
**Size at seed time:** ~2,100 edges (~420KB). Grows incrementally as news is ingested (~5-10 edges per article).

### 3.13 `userSettings` (BYOK configuration)

Per-user LLM API key storage with AES-256-GCM encryption at rest.

```ts
{
  _id: string,               // user ID
  llmProvider: "anthropic" | "openai",
  llmApiKey: string,         // encrypted
  llmModel?: string,
  aiAnalysisEnabled: boolean,
  createdAt: Date,
  updatedAt: Date,
}
```

### 3.14 `newsAnalysis` (AI-generated event summaries)

Multi-source synthesis produced by Tier 2 BYOK analysis. One per event cluster.

```ts
{
  _id: ObjectId,
  articleIds: string[],
  summary: string,
  perspectives: Array<{ source, label, sentiment }>,
  relevanceScore: number,    // 0-1
  escalationSignal: "escalating" | "de-escalating" | "stable",
  relatedCountries: string[],
  conflictId: string | null,
  provider: LLMProvider,
  model: string,
  userId: string,
  analyzedAt: Date,
}
```

### 3.15 `anomalies` (spike detection log)

Persistent record of detected anomalies for the frontend timeline.

```ts
{
  _id: ObjectId,
  entityType: string,
  entityId: string,
  currentCount: number,
  baselineMean: number,
  baselineStddev: number,
  zScore: number,
  severity: "watch" | "alert" | "critical",
  hourBucket: string,
  detectedAt: Date,
}
```

**Indexes:** `{ detectedAt: -1 }`, `{ severity: 1 }`, `{ entityType: 1, entityId: 1 }`

---

## 4. New API routes

These routes are in addition to all routes defined in the base spec Section 4.

### 4.18 Timeline (temporal scrubbing)

| Method | Route | Description | Cache TTL |
|--------|-------|-------------|-----------|
| GET | `/timeline/at?t=<ISO8601>` | Nearest snapshot at or before time | — |
| GET | `/timeline/range?from=<ISO>&to=<ISO>&limit=50` | Snapshot series for scrubber animation | — |

The existing `/bootstrap` endpoint also accepts an optional `?at=<ISO8601>` parameter. When present, it returns current static data (bases, ports, trade routes, colors) with historical mutable fields overlaid from the nearest snapshot.

### 4.19 Graph (entity relationships)

| Method | Route | Description | Cache TTL |
|--------|-------|-------------|-----------|
| GET | `/graph/connections?entity=<type:id>&depth=1&minWeight=0.5` | Fan-out from entity, N hops | 5m |
| GET | `/graph/path?from=<type:id>&to=<type:id>` | Shortest path between entities (max 4 hops) | 5m |

### 4.20 Anomalies (spike detection)

| Method | Route | Description | Cache TTL |
|--------|-------|-------------|-----------|
| GET | `/anomalies?severity=alert,critical&since=24h` | Recent anomaly alerts | — |
| GET | `/anomalies/baseline/:type/:id` | 7-day hourly count history for entity | — |

### 4.21 User Settings

| Method | Route | Description |
|--------|-------|-------------|
| PUT | `/settings/ai` | Set/update LLM provider + API key (validates before storing) |
| GET | `/settings/ai` | Get settings (key masked: `sk-ant-...****7x2f`) |
| DELETE | `/settings/ai` | Remove key, disable AI analysis |

### 4.22 Plugin System

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/plugins/manifest` | All registered plugins with manifests |
| GET | `/plugins/:id/status` | Plugin health, last poll, doc count |
| POST | `/plugins/:id/poll` | Manual poll trigger (dev only) |
| GET | `/layers/:pluginId/binary` | Auto-registered binary layer for source plugins |

---

## 5. New infrastructure systems

### 5.1 Binary cache (`binary-cache.ts`)

**Replaces:** The JSON-serialization path in the original `cacheAside()` for binary layer endpoints.

**Change:** Binary layers now use `cacheBinaryAside()` which stores raw `Buffer` in Redis via `redis.set(key, buf)` and retrieves via `redis.getBuffer(key)`. No JSON serialization anywhere in the binary path. A 10KB Float32Array stays 10KB in Redis instead of ballooning to ~50KB as a JSON number array.

**Impact:** ~5x less Redis memory for binary layers, ~80% fewer allocations per cache hit, zero-copy response path.

### 5.2 Entity dictionary (`entity-dictionary.ts`)

**Purpose:** Dictionary-based named entity recognition using Gambit's own Mongo collections as the gazetteer.

At startup, `buildEntityDictionary()` scans countries (name, ISO2), chokepoints (name, searchTerms), NSA groups (name, searchTerms), and builds a sorted array of regex patterns. `extractEntities(text)` scans any text against the dictionary and returns typed entity matches with confidence scores.

~500-700 patterns. Builds in <100ms, scans a headline in <1ms.

### 5.3 Enrichment pipeline (`enrichment.ts`)

**Purpose:** Auto-link incoming news articles to existing entities.

`enrichNewsItem(title, summary)` runs entity extraction, then infers the most likely conflict match by overlapping detected country ISO2 codes against active conflicts' `relatedCountries` arrays.

**Output fields added to NewsEvent:** `relatedCountries`, `conflictId`, `relatedChokepoints`, `relatedNSA`, `enrichedAt`.

### 5.4 Graph builder (`graph.ts`)

**Purpose:** Normalize all implicit entity relationships into a queryable adjacency collection.

`rebuildGraph()` runs after seeding. Extracts explicit edges from seed data (conflict → country via `relatedCountries`, base → country via `hostNation`/`operatingCountry`, chokepoint → country via `dependentCountries`, NSA → country via `allies`/`rivals`, trade-route → chokepoint via `waypoints`) and inferred edges (NSA → conflict via country overlap, conflict → chokepoint via dependency overlap).

News articles add edges incrementally via `insertMany` after NLP enrichment.

### 5.5 RSS ingestion pipeline

**Architecture:** Two-tier processing.

**Tier 1 (free, all users):** Poll all 220+ feeds → regex RSS/Atom parse → title-hash dedup → NLP enrichment → keyword tag classification → graph edge insertion → Mongo insert → SSE publish → anomaly detection → provenance scoring.

**Tier 2 (BYOK, per-user opt-in):** Event clustering (shared entities within time window) → LLM analysis via user's API key → unbiased summary, bias labeling, relevance scoring, escalation signal → stored in `newsAnalysis` collection.

**Feed tiers (by publication cadence, not editorial importance):**
- `fast` — 15 min: wire services, 24hr news, Google News queries (~40 feeds)
- `standard` — 60 min: regional dailies, defense, economics, energy (~120 feeds)
- `slow` — 4 hr: think tanks, research orgs, institutional/gov (~60 feeds)

**Concurrency:** 15-20 feeds per batch, 8s per-feed timeout, 25s overall deadline per batch.

### 5.6 Plugin system (`plugin-registry.ts`)

**Three plugin types:**

**Source plugins** — bring new data in (e.g., ACLED, OpenSky, AIS). Manifest declares: collection name, poll interval, binary layer stride, entity link fields, Deck.GL layer config, panel config. Registry auto-wires: Mongo collection with indexes, periodic poller, binary layer endpoint, graph edge generation, SSE events.

**Layer plugins** — custom visualizations over existing data (e.g., sanctions heatmap). Manifest declares: data source collection, query filter, Deck.GL layer type. No handler needed.

**Enrichment plugins** — process data after ingestion (e.g., sentiment analysis, translation). Manifest declares: target collection, required user key flag, output fields. Handler receives doc + LLM call function.

**Plugin directory:** `plugins/<plugin-id>/manifest.json` + optional `handler.ts`.

### 5.7 Anomaly detection (`anomaly-detector.ts`)

**Method:** Z-score spike detection against 7-day rolling baselines.

**Signals tracked:** Entity mention frequency (per country, conflict, chokepoint, NSA), tag frequency, regional activity. Counters stored in Redis hashes, bucketed by hour.

**Thresholds:** 2σ = watch, 3σ = alert, 4σ = critical. Self-calibrating — baselines shift as patterns change.

**Outputs:** SSE `anomaly` event, Mongo alert log, temporal snapshot (on alert/critical).

**Dedup:** One alert per entity per severity per hour (Redis key with 1hr TTL).

**Redis memory:** ~1.2MB total for ~350 entities × 168 hourly buckets.

### 5.8 Source provenance (`provenance.ts`, `citation-extractor.ts`, `source-tiers.ts`)

**Five defense layers:**

1. **Source tier registry** — static trust score per feed domain (primary → established → specialized → regional → aggregator → unknown)
2. **Citation chain extraction** — regex patterns for "according to [SOURCE]", "[SOURCE] reported", etc. Classifies as direct_quote, paraphrase, or vague_attribution
3. **Cross-source corroboration** — within event clusters, count independently-sourced articles vs citation-chain rewrites. Detects citation convergence (many outlets, one origin)
4. **First-mover detection** — identify which source published first per event cluster. Low-tier first mover → high-tier pickup without independent verification = red flag
5. **AI provenance analysis** (Tier 2) — LLM evaluates the full citation chain for information laundering signatures

**Output:** `ArticleProvenance` object stored on each `NewsEvent` with `trustScore` (0-1) and `redFlags` array.

---

## 6. New environment variables

Add to `.env.example`:

```
# RSS Ingestion
NEWS_POLL_FAST_MS=900000          # 15 min
NEWS_POLL_STANDARD_MS=3600000     # 1 hr
NEWS_POLL_SLOW_MS=14400000        # 4 hr
NEWS_BATCH_CONCURRENCY=15
NEWS_FEED_TIMEOUT_MS=8000
NEWS_OVERALL_DEADLINE_MS=25000

# User Settings Encryption
SETTINGS_ENCRYPTION_KEY=          # 32-byte hex string for AES-256-GCM

# AI Analysis
AI_MAX_CLUSTERS_PER_CYCLE=10

# Anomaly Detection
ANOMALY_THRESHOLD_WATCH=2         # z-score for watch
ANOMALY_THRESHOLD_ALERT=3         # z-score for alert  
ANOMALY_THRESHOLD_CRITICAL=4      # z-score for critical
ANOMALY_BASELINE_HOURS=168        # 7 days
```

---

## 7. Updated SSE event types

The base spec defines SSE events for `conflict-update` and `snapshot`. The following event types are now also published:

| Event type | Trigger | Data |
|------------|---------|------|
| `news-enriched` | Article ingested + enriched | `{ title, conflictId, relatedCountries, relatedChokepoints, relatedNSA }` |
| `news-analysis` | Tier 2 AI analysis complete | `{ clusterId, summary, escalationSignal }` |
| `anomaly` | Spike detected | `{ entityType, entityId, severity, zScore, currentCount, baselineMean }` |
| `snapshot` | Temporal snapshot captured | `{ timestamp, trigger, triggerDetail }` |
| `plugin-data` | Plugin source poll complete | `{ pluginId, newDocs, totalDocs }` |

---

## 8. Startup sequence

Updated `api/src/index.ts` startup order:

```
1. connectMongo()
2. connectRedis()
3. ensureSnapshotIndexes()
4. buildEntityDictionary()        — NLP patterns from Mongo collections
5. rebuildGraph()                 — edge collection from seed data
6. mountPlugins()                 — discover + wire plugins
7. startConflictCounter()         — hourly conflict day counts + snapshots
8. startAnomalyCleanup()          — 6-hourly Redis counter pruning
9. startNewsAggregator()          — tiered RSS polling pipeline
```

---

## 9. Updated build sequence

The base spec Section 8 defines 6 phases. These upgrades add a new phase between the original Phases 3 and 4:

### Phase 3.5: Intelligence pipeline (NEW)

This phase was fully implemented. All items are complete.

39. Binary cache optimization — `cacheBinaryAside()` with raw Buffer
40. Temporal snapshot infrastructure — `captureSnapshot()`, `/timeline` routes, `/bootstrap?at=` parameter
41. Entity dictionary — `buildEntityDictionary()` from Mongo collections at startup
42. NLP enrichment — `enrichNewsItem()` with entity extraction + conflict inference
43. Graph edge system — `rebuildGraph()` + `/graph/connections` + `/graph/path`
44. RSS feed registry — 220+ feeds with tier/category metadata
45. RSS parser — zero-dep regex XML parser for RSS 2.0 and Atom
46. News aggregator — tiered polling + dedup + enrich + graph + SSE pipeline
47. BYOK user settings — encrypted API key storage + `/settings/ai` routes
48. AI analysis module — event clustering + LLM summary/bias/escalation
49. Plugin registry — manifest-based discovery + auto-wiring (source, layer, enrichment)
50. Plugin API routes — `/plugins/manifest`, `/plugins/:id/status`
51. Anomaly detector — z-score spike detection with Redis sliding windows
52. Anomaly API routes — `/anomalies`, `/anomalies/baseline/:type/:id`
53. Source provenance — tier registry, citation extraction, corroboration, first-mover
54. Keyword classifier — tag inference from article title/summary

---

## 10. Corrections to base spec

The following sections of `hegemon-data-platform-design.md` need updates:

**Section 2.1 (Project Structure):** Add `infrastructure/` entries for all new files listed in Section 2 above. Add `modules/aggregate/timeline.ts`, `modules/aggregate/graph.ts`, `modules/aggregate/anomalies.ts`, `modules/periodic/news-aggregator.ts`, `modules/periodic/anomaly-cleanup.ts`, `modules/system/settings-routes.ts`, `modules/system/plugin-routes.ts`.

**Section 2.3 (Environment Variables):** Add all variables from Section 6 above.

**Section 3 (Data Model):** The `news` collection now includes `relatedChokepoints`, `relatedNSA`, `enrichedAt`, `sources` (array of source names for dedup), and `provenance` (ArticleProvenance object). The `dataSource` field on DocMeta should be extended to include `"rss-feed"`. Add new collections from Section 3 above (snapshots, edges, userSettings, newsAnalysis, anomalies).

**Section 4.6 (Binary Layer Endpoints):** Note that the binary layer endpoint now supports plugin-registered layers in addition to the 5 core layers. The cache path uses `cacheBinaryAside()` with raw Buffer instead of JSON-serialized `cacheAside()`.

**Section 4.10 (SSE Implementation):** Add new event types from Section 7 above.

**Section 4.14 (Periodic Module):** Add news aggregator (3 tiered intervals) and anomaly cleanup (6-hourly). Update conflict counter to note it also captures temporal snapshots.

**Section 4.15 (Compute Module):** This is no longer "deferred to post-launch." The correlation engine is partially implemented via the graph relationship system. Sentiment analysis is available via the BYOK AI analysis module. Risk forecasting remains deferred.

**Section 8 (Build Sequence):** Insert Phase 3.5 from Section 9 above between Phase 3 (API Routes) and Phase 4 (Frontend Shell). All items in Phase 3.5 are complete.

**Section 9 (Open Questions):** Questions 1 and 2 are now answered:
- Q1 (Re-scraping cadence): The Hegemon re-scraper is a future periodic task. RSS ingestion provides continuous fresh data.
- Q2 (Additional data sources): The plugin system provides the architecture. Individual sources (ACLED, Finnhub, OpenSky, etc.) can be added as plugins without modifying core code.

---

## 11. Frontend implications

The frontend plan (Plan 3: `2026-03-17-gambit-frontend.md`) should be updated to include:

**New UI components needed:**
- **Timeline scrubber** — slider control at bottom of map, calls `/timeline/range` for scrubbing, `/bootstrap?at=` for full state at a point
- **Graph explorer** — panel or modal showing entity connections from `/graph/connections`, clickable to navigate between entities
- **Anomaly alert banner** — notification toast + map marker pulse when SSE `anomaly` event arrives
- **Provenance trust badge** — per-article indicator showing source tier, corroboration count, and any red flags
- **BYOK settings panel** — UI for `/settings/ai` to enter/update/remove LLM API key
- **AI analysis card** — event cluster summary card showing the LLM-generated synthesis, perspective labels, escalation signal
- **Plugin layer toggles** — layer menu dynamically discovers plugins via `/plugins/manifest` and renders toggles alongside core layers

**New SSE event handlers:**
- `news-enriched` — update news feed panel in real-time
- `news-analysis` — show AI synthesis card when Tier 2 completes
- `anomaly` — trigger alert banner + map pulse
- `plugin-data` — refresh plugin layer data

**Updated bootstrap response:**
- Now includes a `plugins` key with registered plugin manifests
- Supports `?at=` parameter for temporal scrubbing
