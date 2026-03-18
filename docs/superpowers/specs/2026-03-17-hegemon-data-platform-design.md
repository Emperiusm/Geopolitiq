# Gambit Platform — Hegemon Data Integration & Missing Features

**Date:** 2026-03-17
**Status:** Draft
**Scope:** Backend API, data pipeline, frontend features, infrastructure
**Product Name:** Gambit (formerly Geopolitiq)

---

## 1. Overview

Rebuild the intelligence platform as **Gambit** — a new backend (Bun + Hono) and frontend (Preact + Deck.GL), ingesting scraped Hegemon Global data into MongoDB and exposing it through a high-performance API. The existing `Monitor/` folder is reference only — this is a clean-slate build. Gambit will later expand into a fantasy league / prediction market for geopolitical events (scope TBD in a future spec).

### Goals
- Ingest all Hegemon bundle data: 199 countries, 495 military bases, ~79 non-state actors, 60 chokepoints, 13 elections (4 from dedicated array + 9 embedded in country data), 21 trade routes, active conflicts, news events
- Build four missing features: Trade Routes, Compare Mode, Military overlay, Non-State Actors overlay
- Add three additional layers: Chokepoints, Conflicts, Elections
- Achieve sub-200ms perceived load time on repeat visits, sub-500ms on first visit

### Tech Stack
- **Backend:** Bun + Hono (modular monolith)
- **Database:** MongoDB 7 (persistent data) — uses official `mongodb` npm driver with pure-JS BSON parser (Bun does not support native BSON addon)
- **Cache:** Redis 7 (hot cache, pub/sub for SSE) — uses `ioredis` npm package (TCP, not Upstash REST)
- **Frontend:** Preact + Vite + Deck.GL (GlobeView + MapView)
- **Base Map:** PMTiles (self-hosted OSM vector tiles) + MapLibre dark style
- **Containers:** Docker Compose (5 services: API, MongoDB, Redis, Mongo Express, Frontend dev server)
- **CDN:** Cloudflare (free tier) in production

---

## 2. Infrastructure & Docker

### 2.1 Project Structure

```
Geopolitiq/
  api/                              # Bun + Hono API (the backend)
    src/
      index.ts                      # Hono app entry, mounts all module routers
      modules/
        reference/                  # countries, bases, nsa, chokepoints, elections, trade-routes, ports, conflicts
        realtime/                   # news, SSE event stream
        aggregate/
          timeline.ts               # GET /timeline/at, /timeline/range
          graph.ts                  # GET /graph/connections, /graph/path
          anomalies.ts              # GET /anomalies, /anomalies/baseline/:type/:id
        periodic/                   # scheduled fetchers (see Section 4.14)
          news-aggregator.ts        # Tiered RSS poller + dedup + enrich pipeline
          anomaly-cleanup.ts        # Prune Redis counter hashes older than 7 days
        system/
          settings-routes.ts        # PUT/GET/DELETE /settings/ai
          plugin-routes.ts          # GET /plugins/manifest, /plugins/:id/status
        compute/                    # future: correlation, ML, forecasting (see Section 4.15)
      infrastructure/
        mongo.ts                    # MongoDB client + connection pool
        redis.ts                    # Redis client + pub/sub
        cache.ts                    # Cache-aside (Redis -> Mongo fallback)
        binary-cache.ts             # Buffer-native Redis cache for binary layers
        sse.ts                       # SSE stream manager (connection pool, pub/sub bridge)
        health.ts                   # Health check endpoint (readiness + liveness)
        snapshots.ts                # Temporal snapshot capture + retrieval
        entity-dictionary.ts        # Dictionary-based NER from Mongo collections
        enrichment.ts               # enrichNewsItem() — entity linking pipeline
        graph.ts                    # Graph edge builder + query helpers
        feed-registry.ts            # 220+ RSS feeds with tier/category metadata
        rss-parser.ts               # Zero-dep regex RSS/Atom XML parser
        plugin-registry.ts          # Plugin discovery, validation, auto-wiring
        anomaly-detector.ts         # Z-score spike detection on Redis counters
        user-settings.ts            # Encrypted BYOK API key storage (AES-256-GCM)
        ai-analysis.ts              # Tier 2 LLM analysis (Anthropic + OpenAI)
        provenance.ts               # Source provenance scoring + trust assessment
        citation-extractor.ts       # Citation chain extraction from article text
        source-tiers.ts             # Static trust tier registry per feed domain
      middleware/
        cors.ts
        rate-limit.ts
        cache-headers.ts
        compression.ts              # gzip/Brotli compression
        api-key.ts                  # X-API-Key header check (optional dev, required prod)
      seed/
        parse-bundle.ts             # Extract datasets from hegemon-bundle.js
        seed-countries.ts           # Load 199 country profiles
        seed-bases.ts               # Load 495 military bases
        seed-nsa.ts                 # Load 79 non-state actor groups
        seed-chokepoints.ts         # Load 60 chokepoints/infrastructure
        seed-elections.ts           # Load 13 elections
        seed-trade-routes.ts        # Load 21 trade routes
        seed-ports.ts               # Load ports (extracted from trade route references)
        seed-conflicts.ts           # Load active conflicts
        seed-news.ts                # Load news events from scrape
        seed-all.ts                 # Run all seeds in order
    Dockerfile                      # Bun runtime
    package.json
    tsconfig.json
  frontend/                         # Preact + Vite + Deck.GL
    src/
      ...                           # See Section 6
    Dockerfile
    package.json
  docker-compose.yml                # 4 containers
  .firecrawl/                       # Existing scraped data (source for seeding)
  Monitor/                          # Reference only
```

### 2.2 Docker Compose

```yaml
services:
  api:
    build: ./api
    ports: ["3000:3000"]
    environment:
      MONGO_URI: mongodb://mongo:27017/gambit
      REDIS_URL: redis://redis:6379
      API_KEY: ${API_KEY:-dev}
    depends_on: [mongo, redis]

  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    # Ephemeral — cache only, no persistence

  mongo-express:
    image: mongo-express:latest
    ports: ["8081:8081"]
    environment:
      ME_CONFIG_MONGODB_URL: mongodb://mongo:27017
    profiles: ["dev"]                # Only starts with: docker compose --profile dev up

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    environment:
      VITE_API_URL: http://localhost:3000/api/v1
    depends_on: [api]
    profiles: ["dev"]                   # In production, frontend is built as static files behind CDN

volumes:
  mongo-data:
```

### 2.3 Environment Variables

| Variable | Service | Required | Default | Description |
|----------|---------|----------|---------|-------------|
| `MONGO_URI` | api | Yes | `mongodb://mongo:27017/gambit` | MongoDB connection string |
| `REDIS_URL` | api | Yes | `redis://redis:6379` | Redis connection string |
| `API_KEY` | api | No | `dev` | API key for `X-API-Key` auth |
| `PORT` | api | No | `3000` | API listen port |
| `NODE_ENV` | api | No | `development` | `development` or `production` |
| `CORS_ORIGINS` | api | No | `http://localhost:5173` | Comma-separated allowed origins |
| `RATE_LIMIT_RPM` | api | No | `100` | Requests per minute per IP |
| `SSE_HEARTBEAT_MS` | api | No | `30000` | SSE keepalive interval |
| `SSE_BUFFER_SIZE` | api | No | `100` | Max events buffered for reconnect replay |
| `PMTILES_PATH` | api | No | `./data/tiles.pmtiles` | Path to PMTiles file for static serving |
| `VITE_API_URL` | frontend | Yes | `http://localhost:3000/api/v1` | API base URL |
| `NEWS_POLL_FAST_MS` | api | No | `900000` | Fast-tier RSS poll interval (15 min) |
| `NEWS_POLL_STANDARD_MS` | api | No | `3600000` | Standard-tier RSS poll interval (1 hr) |
| `NEWS_POLL_SLOW_MS` | api | No | `14400000` | Slow-tier RSS poll interval (4 hr) |
| `NEWS_BATCH_CONCURRENCY` | api | No | `15` | Max concurrent RSS feed fetches per batch |
| `NEWS_FEED_TIMEOUT_MS` | api | No | `8000` | Per-feed fetch timeout |
| `NEWS_OVERALL_DEADLINE_MS` | api | No | `25000` | Overall deadline per poll batch |
| `SETTINGS_ENCRYPTION_KEY` | api | Yes (prod) | — | 32-byte hex string for AES-256-GCM user settings encryption |
| `AI_MAX_CLUSTERS_PER_CYCLE` | api | No | `10` | Max event clusters analyzed per AI cycle |
| `ANOMALY_THRESHOLD_WATCH` | api | No | `2` | Z-score threshold for watch severity |
| `ANOMALY_THRESHOLD_ALERT` | api | No | `3` | Z-score threshold for alert severity |
| `ANOMALY_THRESHOLD_CRITICAL` | api | No | `4` | Z-score threshold for critical severity |
| `ANOMALY_BASELINE_HOURS` | api | No | `168` | Sliding window size for anomaly baselines (7 days) |

### 2.4 CORS Configuration

- **Development:** Allow `http://localhost:5173` (Vite dev server) and `http://localhost:3000` (API direct)
- **Production:** Allow the production frontend domain only (configured via `CORS_ORIGINS` env var)
- SSE endpoints must include `Access-Control-Allow-Origin` for EventSource to work cross-origin

---

## 3. Data Model (MongoDB Collections)

**Database:** `gambit`

All collections include shared metadata fields:
```ts
{
  createdAt: Date,
  updatedAt: Date,
  dataSource: string    // "hegemon-bundle" | "firecrawl-scrape" | "manual" | "rss-feed"
}
```

### 3.1 `countries` (199 docs)

```ts
{
  _id: "ukraine",
  iso2: "UA",                            // ISO 3166-1 alpha-2 (canonical short code)
  name: "Ukraine",
  flag: "\u{1f1fa}\u{1f1e6}",
  lat: 48.38,
  lng: 31.17,
  location: { type: "Point", coordinates: [31.17, 48.38] },
  risk: "catastrophic",               // catastrophic|extreme|severe|stormy|cloudy|clear
  tags: ["Armed Conflict", "Territorial Dispute"],
  region: "Eastern Europe",
  pop: "39.5M",
  gdp: "$191B",
  leader: "Volodymyr Zelenskyy",
  title: "War & Peace Talks",
  casualties: {
    total: "~1.8M",
    label: "Combined casualties since Feb 2022",
    lastUpdated: "Jan 2026",
    source: "CSIS Report",
    contested: true,
    sources: [
      { name: "CSIS (combined estimate)", figure: "~1.8M total casualties", note: "..." }
    ]
  },
  analysis: {
    what: "...",
    why: "...",
    next: "..."
  },
  createdAt: Date,
  updatedAt: Date,
  dataSource: "hegemon-bundle"
}
```

**Indexes:** `{ risk: 1 }`, `{ region: 1 }`, `{ location: "2dsphere" }`, `{ tags: 1 }`, `{ iso2: 1 }` (unique), text index on `{ name }`

**Note:** The `iso2` field is the canonical short identifier used by `relatedCountries` in conflicts, news, and the `/compare` endpoint. The `_id` slug is used for URL-friendly routes (e.g., `/countries/ukraine`).

### 3.2 `bases` (495 docs)

```ts
{
  _id: "us-incirlik",
  name: "Incirlik Air Base",
  country: "Turkey",
  hostNation: "Turkey",
  operatingCountry: "United States",   // explicit — used for countryColors lookup
  lat: 37.0,
  lng: 35.43,
  location: { type: "Point", coordinates: [35.43, 37.0] },
  branch: "US Air Force",
  type: "base",                       // base|port|station|facility
  flag: "\u{1f1fa}\u{1f1f8}",
  color: "#3b82f6",
  personnel: "~5,000",
  history: "...",
  significance: "...",
  iranWarRole: "..." | null,
  createdAt: Date,
  updatedAt: Date,
  dataSource: "hegemon-bundle"
}
```

**Indexes:** `{ location: "2dsphere" }`, `{ country: 1 }`, `{ branch: 1 }`, `{ type: 1 }`, `{ operatingCountry: 1 }`

### 3.3 `nonStateActors` (79 docs)

```ts
{
  _id: "hezbollah",
  name: "Hezbollah",
  ideology: "Shia Islamism",
  status: "active",
  designation: "US/EU/Arab League designated terrorist organization",
  founded: "1982",
  revenue: "$700M-1B annually",
  strength: "30,000-50,000 fighters",
  activities: "Militia, political party, social services",
  territory: "Southern Lebanon, Bekaa Valley, Beirut suburbs",
  funding: "Iran (~$700M/year), taxation, businesses",
  leaders: "Naim Qassem (post-Nasrallah)",
  allies: ["Iran", "Syria", "Hamas", "PMF"],
  rivals: ["Israel", "US", "Saudi Arabia", "SDF"],
  majorAttacks: [
    { year: "1983", event: "Beirut barracks bombing killing 241 US Marines" }
  ],
  searchTerms: ["hezbollah", "hizballah", "party of god"],
  zones: [
    { lat: 33.5, lng: 35.5, radiusKm: 40 },
    { lat: 33.9, lng: 35.8, radiusKm: 30 }
  ],
  createdAt: Date,
  updatedAt: Date,
  dataSource: "hegemon-bundle"
}
```

**Indexes:** `{ status: 1 }`, `{ ideology: 1 }`, text index on `{ name, searchTerms }`

### 3.4 `chokepoints` (60 docs)

```ts
{
  _id: "hormuz",
  name: "Strait of Hormuz",
  type: "maritime",                   // maritime|energy|land (matches source data: energy covers pipelines + terminals)
  lat: 26.56,
  lng: 56.25,
  location: { type: "Point", coordinates: [56.25, 26.56] },
  tooltipLine: "21% of global oil passes through daily",
  summary: "...",
  dailyVessels: "~150 (pre-crisis; currently near zero)",
  oilVolume: "21 million bbl/day",
  gasVolume: "~6 Bcf/day (LNG)",
  status: "CLOSED",                   // OPEN|RESTRICTED|CLOSED
  dependentCountries: ["Japan", "South Korea", "China", "India", "EU"],
  strategicSummary: "...",
  searchTerms: ["hormuz", "strait of hormuz", "persian gulf"],
  createdAt: Date,
  updatedAt: Date,
  dataSource: "hegemon-bundle"
}
```

**Indexes:** `{ location: "2dsphere" }`, `{ type: 1 }`, `{ status: 1 }`

### 3.5 `elections` (13 docs)

**Source note:** 4 elections come from a dedicated array in the bundle; the remaining 9 are embedded in country-level data and must be extracted by the seed script.

```ts
{
  _id: "us-2026-midterm",
  flag: "\u{1f1fa}\u{1f1f8}",
  country: "United States",
  countryISO2: "US",                   // for joins
  lat: 38.9,                           // capital coordinates (for map marker)
  lng: -77.04,
  location: { type: "Point", coordinates: [-77.04, 38.9] },
  date: "Nov 2026",
  dateISO: ISODate("2026-11-03"),
  type: "Midterm Elections",
  winner: null,
  result: null,
  summary: "...",
  createdAt: Date,
  updatedAt: Date,
  dataSource: "hegemon-bundle"
}
```

**Indexes:** `{ dateISO: 1 }`, `{ country: 1 }`, `{ location: "2dsphere" }`

### 3.6 `tradeRoutes` (21 docs)

```ts
{
  _id: "china-europe-suez",
  name: "China -> Europe (Suez)",
  from: "shanghai",
  to: "rotterdam",
  category: "container",              // container|energy|bulk
  status: "active",                   // active|disrupted|high_risk
  volumeDesc: "47M+ TEU/year",
  waypoints: ["malacca", "bab-el-mandeb", "suez"],  // chokepoint _id references
  createdAt: Date,
  updatedAt: Date,
  dataSource: "hegemon-bundle"
}
```

**Indexes:** `{ category: 1 }`, `{ status: 1 }`

**Waypoint ID mapping:** Trade route source data uses underscore IDs (e.g., `malacca_strait`) while chokepoint source data uses hyphenated IDs (e.g., `malacca`). The seed script must normalize waypoint IDs to match chokepoint `_id` values. A mapping table in `parse-bundle.ts` handles this translation.

### 3.7 `ports` (derived from trade route references + chokepoints)

```ts
{
  _id: "shanghai",
  name: "Shanghai",
  lat: 31.23,
  lng: 121.47,
  location: { type: "Point", coordinates: [121.47, 31.23] },
  country: "China",
  createdAt: Date,
  updatedAt: Date,
  dataSource: "hegemon-bundle"
}
```

**Indexes:** `{ location: "2dsphere" }`, `{ country: 1 }`

### 3.8 `conflicts` (active ongoing conflicts)

```ts
{
  _id: "us-iran-war",
  title: "US and Israel at War with Iran",
  lat: 32.0,                           // conflict epicenter (for map rendering)
  lng: 53.0,
  location: { type: "Point", coordinates: [53.0, 32.0] },
  startDate: ISODate("2026-02-27"),
  dayCount: 18,
  status: "active",                   // active|ceasefire|resolved
  casualties: [
    { party: "Iran", figure: "6,000+ killed" },
    { party: "Israel", figure: "14 killed" },
    { party: "US", figure: "13 killed" }
  ],
  latestUpdate: "Iran strikes U.S.-owned oil tanker in Strait of Hormuz",
  tags: ["BREAKING", "CONFLICT"],
  relatedCountries: ["US", "IL", "IR"],  // ISO-2 codes, join via countries.iso2
  createdAt: Date,
  updatedAt: Date,
  dataSource: "hegemon-bundle"
}
```

**Indexes:** `{ status: 1 }`, `{ relatedCountries: 1 }`, `{ startDate: 1 }`, `{ location: "2dsphere" }`

### 3.9 `news` (events/articles)

```ts
{
  _id: ObjectId,
  title: "Trump's War Stalls Diplomacy...",
  summary: "Diplomatic channels between...",
  tags: ["CONFLICT"],
  sourceCount: 8,
  conflictId: "us-iran-war",
  relatedCountries: ["US", "IR"],      // ISO-2 codes, join via countries.iso2
  relatedChokepoints: ["hormuz"],      // chokepoint _id references (NLP enrichment)
  relatedNSA: ["hezbollah"],           // NSA _id references (NLP enrichment)
  sources: ["Reuters", "AP"],          // source names for dedup
  enrichedAt: Date | null,             // timestamp of NLP enrichment pass
  provenance: {                        // source provenance scoring (see Section 5.8)
    trustScore: number,                // 0-1 composite trust score
    sourceTier: string,                // primary|established|specialized|regional|aggregator|unknown
    citations: Array<{ type: string, source: string, confidence: number }>,
    corroborationCount: number,
    isFirstMover: boolean,
    redFlags: string[],
  } | null,
  publishedAt: ISODate("2026-03-16T20:00:00Z"),
  createdAt: Date,
  updatedAt: Date,
  dataSource: "hegemon-bundle"
}
```

**Indexes:** `{ publishedAt: -1 }`, `{ tags: 1 }`, `{ conflictId: 1 }`, `{ relatedCountries: 1 }`, text index on `{ title, summary }`

### 3.10 `countryColors` (lookup collection)

```ts
{
  _id: "United States",
  color: "#3b82f6"
}
```

Used by Military and Compare overlays to assign consistent colors per country.

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

## 4. API Routes

**Base URL:** `http://localhost:3000/api/v1`

### 4.1 Response Envelope

```ts
// Success
{
  data: T | T[],
  meta: {
    total: 199,
    limit: 50,
    offset: 0,
    cached: true,
    freshness: "2026-03-17T02:00:00Z"
  }
}

// Error
{
  error: {
    code: "NOT_FOUND",
    message: "Country 'xyz' not found"
  }
}
```

### 4.2 Common Query Params (all list endpoints)

- `?region=Eastern+Europe` — filter by region
- `?risk=catastrophic` — filter by risk level
- `?tag=Armed+Conflict` — filter by tag
- `?status=active` — filter by status
- `?country=Turkey` — filter by country
- `?type=maritime` — filter by type
- `?category=energy` — filter by category
- `?q=hezbollah` — text search (MongoDB text indexes)
- `?fields=name,lat,lng,risk` — sparse fieldset (reduce payload for map layers)
- `?limit=50&offset=0` — pagination

### 4.3 Reference Module

| Method | Route | Description | Cache TTL |
|--------|-------|-------------|-----------|
| GET | `/countries` | All 199 countries (filterable) | 1h |
| GET | `/countries/:id` | Single country profile | 1h |
| GET | `/countries/risks` | Aggregated risk counts | 1h |
| GET | `/bases` | All 495 military bases (filterable) | 1h |
| GET | `/bases/:id` | Single base detail | 1h |
| GET | `/bases/nearby?lat=&lng=&radius=` | Geospatial query | 1h |
| GET | `/nsa` | All 79 non-state actor groups | 1h |
| GET | `/nsa/:id` | Single group detail | 1h |
| GET | `/chokepoints` | All 60 chokepoints/infrastructure | 1h |
| GET | `/chokepoints/:id` | Single chokepoint detail | 1h |
| GET | `/elections` | All elections sorted by date | 1h |
| GET | `/elections/upcoming` | Only future elections | 1h |
| GET | `/trade-routes` | All 21 trade routes | 1h |
| GET | `/trade-routes/:id` | Single route with resolved coords | 1h |
| GET | `/trade-routes?resolve=true` | All routes with resolved segments | 1h |
| GET | `/ports` | All ports | 1h |
| GET | `/conflicts` | Active conflicts with day counts | 15m |
| GET | `/conflicts/:id` | Single conflict detail | 15m |
| GET | `/conflicts/:id/timeline` | Ordered news events for a conflict | 15m |

### 4.4 Realtime Module

| Method | Route | Description | Cache TTL |
|--------|-------|-------------|-----------|
| GET | `/news` | Latest news events (paginated) | 30s |
| GET | `/news?conflict=us-iran-war` | Filter by conflict | 30s |
| GET | `/news?tag=CONFLICT` | Filter by tag | 30s |
| GET | `/events/stream` | SSE stream (typed events) | — |

**SSE event types:**
```
event: news
data: {"title": "...", "tags": [...], "publishedAt": "..."}

event: risk-change
data: {"country": "iran", "from": "extreme", "to": "catastrophic"}

event: chokepoint-status
data: {"id": "hormuz", "status": "CLOSED"}

event: conflict-update
data: {"id": "us-iran-war", "dayCount": 19, "latestUpdate": "..."}

event: news-enriched
data: {"title": "...", "conflictId": "...", "relatedCountries": [...], "relatedChokepoints": [...], "relatedNSA": [...]}

event: news-analysis
data: {"clusterId": "...", "summary": "...", "escalationSignal": "escalating"}

event: anomaly
data: {"entityType": "country", "entityId": "IR", "severity": "alert", "zScore": 3.4, "currentCount": 28, "baselineMean": 12}

event: snapshot
data: {"timestamp": "...", "trigger": "event", "triggerDetail": "chokepoint-status-change:hormuz"}

event: plugin-data
data: {"pluginId": "acled", "newDocs": 42, "totalDocs": 1200}
```

### 4.5 Aggregate & Compare

| Method | Route | Description | Cache TTL |
|--------|-------|-------------|-----------|
| GET | `/compare?countries=US,IR,RU` | Side-by-side country data with related conflicts, NSA, bases | 1h |
| GET | `/compare/colors` | Country -> hex color mapping | 1h |
| GET | `/bootstrap` | All reference data in one payload | 1h |
| GET | `/bootstrap?slim=true` | Minimal fields for map rendering (id, name, lat, lng, risk, status) | 1h |
| GET | `/viewport?bbox=sw_lng,sw_lat,ne_lng,ne_lat&layers=bases,nsa,chokepoints` | All features within bounding box | 30s |
| GET | `/search?q=iran` | Cross-collection text search | 5m |

### 4.6 Binary Layer Endpoints

| Method | Route | Description | Cache TTL |
|--------|-------|-------------|-----------|
| GET | `/layers/:layer/binary` | Flat binary arrays for Deck.GL | 1h |

Supported core layers: `bases`, `nsa-zones`, `chokepoints`, `trade-arcs`, `conflicts`

Plugin-registered layers are also available at `/layers/:pluginId/binary` (auto-wired by the plugin registry — see Section 4.22).

Returns `application/octet-stream` — `Float32Array` of [lng, lat, ...attributes] per feature. Deck.GL consumes directly without JSON parsing.

**Cache path:** Binary layers use `cacheBinaryAside()` which stores raw `Buffer` in Redis (not JSON-serialized). A 10KB Float32Array stays 10KB in Redis instead of ~50KB as a JSON number array. ~5x less Redis memory, zero-copy response path.

### 4.7 System

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Liveness (API up) |
| GET | `/health/ready` | Readiness (Mongo + Redis connected) |
| POST | `/seed/run` | Trigger full re-seed (dev only) |
| GET | `/seed/status` | Seed freshness per collection |

### 4.8 Response Shape Details

**`/bootstrap` response:**
```ts
{
  data: {
    countries: CountrySlim[],          // { _id, iso2, name, flag, lat, lng, risk, region, tags }
    bases: BaseSlim[],                 // { _id, name, lat, lng, operatingCountry, type, color }
    nsa: NsaSlim[],                    // { _id, name, ideology, status, zones }
    chokepoints: ChokepointSlim[],     // { _id, name, type, lat, lng, status, tooltipLine }
    conflicts: ConflictSlim[],         // { _id, title, lat, lng, dayCount, status, casualties }
    elections: ElectionSlim[],         // { _id, country, lat, lng, dateISO, type }
    tradeRoutes: TradeRouteResolved[], // includes resolved segments with coords
    ports: PortSlim[],                 // { _id, name, lat, lng }
    countryColors: Record<string, string>
  },
  meta: { freshness: string }
}
```

`/bootstrap?slim=true` returns only the fields shown above (no analysis, history, summary, etc.).
Full `/bootstrap` includes all fields from each collection.

**`/viewport` response:**
```ts
{
  data: {
    bases?: Base[],                    // included if "bases" in layers param
    nsa?: NonStateActor[],             // included if "nsa" in layers param
    chokepoints?: Chokepoint[]         // included if "chokepoints" in layers param
  },
  meta: { bbox: [number, number, number, number], total: number }
}
```

NSA zones use center-point matching: a group is included if any zone's center falls within the bbox OR the zone's radius extends into the bbox (calculated server-side).

**`/compare` response:**
```ts
{
  data: {
    countries: Country[],              // full profiles for requested countries
    conflicts: Conflict[],             // where relatedCountries overlaps with requested
    nsa: NonStateActor[],              // where allies/rivals arrays mention requested countries OR zones overlap country coordinates
    bases: Base[]                      // where country matches requested countries
  }
}
```

**`/search` response:**
```ts
{
  data: {
    countries: CountrySlim[],
    conflicts: ConflictSlim[],
    bases: BaseSlim[],
    nsa: NsaSlim[],
    chokepoints: ChokepointSlim[]
  },
  meta: { query: string, total: number }
}
```

Results are scored by MongoDB text search relevance, with max 10 results per collection.

**Binary layer encoding (`/layers/:layer/binary`):**

Header (first 8 bytes):
- Bytes 0-3: `uint32` record count
- Bytes 4-7: `uint32` stride (floats per record)

Body: `Float32Array` of `[field1, field2, ...]` repeated per record.

| Layer | Stride | Fields |
|-------|--------|--------|
| `bases` | 5 | lng, lat, colorR, colorG, colorB |
| `nsa-zones` | 4 | lng, lat, radiusKm, ideologyIndex |
| `chokepoints` | 4 | lng, lat, statusIndex, typeIndex |
| `trade-arcs` | 5 | srcLng, srcLat, tgtLng, tgtLat, categoryIndex |
| `conflicts` | 4 | lng, lat, dayCount, statusIndex |

Index values map to enums defined in a shared constants file.

### 4.9 Error Handling

**Error codes and HTTP status mapping:**

| Code | HTTP Status | When |
|------|-------------|------|
| `NOT_FOUND` | 404 | Resource ID doesn't exist |
| `VALIDATION_ERROR` | 400 | Bad query params, invalid bbox, etc. |
| `RATE_LIMITED` | 429 | Too many requests (include `Retry-After` header) |
| `UNAUTHORIZED` | 401 | Missing or invalid `X-API-Key` |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | MongoDB or Redis down |

**Resilience patterns:**
- **Redis down:** Bypass cache, query MongoDB directly. Log warning. Response `meta.cached` = false.
- **MongoDB down:** Return 503 with `SERVICE_UNAVAILABLE`. Health endpoint `/health/ready` returns unhealthy.
- **Rate limiting:** 100 req/min per IP (configurable via env). Returns `429` with `Retry-After` header.

### 4.10 SSE Implementation Details

**`/events/stream` behavior:**
- Uses `text/event-stream` content type
- Heartbeat: sends `:keepalive\n\n` comment every 30 seconds to prevent connection timeout
- Supports `Last-Event-Id` header: each event includes an `id:` field (monotonic counter stored in Redis). On reconnect, client sends `Last-Event-Id` and server replays missed events from a Redis list (last 100 events buffered).
- Backpressure: if a client falls behind, server drops oldest undelivered events and sends a `event: sync` message telling the client to re-fetch via `/bootstrap`.
- **Trigger mechanism:** Any write to MongoDB (seed, scraper, manual update) publishes to Redis pub/sub channel `gambit:events:new`. The SSE handler subscribes to this channel and broadcasts to all connected clients.

### 4.11 Auth

- `X-API-Key` header check in middleware
- Optional in dev (any key or none accepted)
- Required in production
- No user auth — this is a data API, not a user-facing auth system

### 4.12 Compression

- Gzip for all JSON and binary responses (Bun native support, stable)
- Brotli used where Bun version supports it; gzip as fallback
- `Content-Encoding: gzip` or `br` header
- Pre-compressed static assets with `.gz`/`.br` sidecar files

### 4.13 Cache Strategy

- Request arrives -> check Redis (`gambit:{collection}:{id}` or `gambit:{collection}:all`)
- Cache hit -> return immediately (<5ms)
- Cache miss -> query MongoDB -> store in Redis with TTL -> return
- `?fields=` sparse queries get own cache keys (`gambit:countries:all:name,lat,lng,risk`)
- SSE uses Redis pub/sub: seeds/scrapers publish to `gambit:events:new`, SSE connections subscribe
- CDN layer (Cloudflare) caches reference endpoints with `Cache-Control: public, max-age=3600, stale-while-revalidate=300`

### 4.14 Periodic Module

The periodic module runs scheduled background tasks within the Bun process using `setInterval` (no external cron needed).

**Initial implementation (Phase 1-3):**
- **Conflict day counter:** Every hour, increment `dayCount` on active conflicts based on `startDate`. Publishes `conflict-update` SSE event. Also captures temporal snapshots on each run.
- **Chokepoint status poller:** Placeholder. Initially manual-only (update via seed or future admin endpoint). When a source is identified, poll on a configurable interval.

**Implemented (Phase 3.5):**
- **News aggregator:** Three-tier RSS polling pipeline (220+ feeds). Fast tier (15 min): wire services, 24hr news, Google News queries (~40 feeds). Standard tier (60 min): regional dailies, defense, economics, energy (~120 feeds). Slow tier (4 hr): think tanks, research orgs, institutional/gov (~60 feeds). Pipeline: poll → regex RSS/Atom parse → title-hash dedup → NLP enrichment → keyword tag classification → graph edge insertion → Mongo insert → SSE publish → anomaly detection → provenance scoring. Concurrency: 15-20 feeds per batch, 8s per-feed timeout, 25s overall deadline per batch.
- **Anomaly cleanup:** Every 6 hours, prune Redis counter hashes older than 7 days to bound memory usage (~1.2MB total for ~350 entities × 168 hourly buckets).

**Future additions (post-launch):**
- **Hegemon re-scraper:** Use Firecrawl to re-scrape hegemonglobal.com on a schedule (daily/weekly, configurable). Parse new bundle, diff against existing data, upsert changes. Publishes SSE events for any risk-level or status changes.
- **Election countdown:** Daily check to update election status (upcoming -> active -> past) based on `dateISO`.

Each periodic task runs in its own `setInterval` with independent error handling. Failures are logged but do not crash the process or affect other tasks.

### 4.15 Compute Module

**Partially implemented.** The compute module was originally a placeholder for CPU-intensive features. Two of the three planned capabilities are now partially available via the intelligence pipeline (Phase 3.5):

- **Correlation engine:** Partially implemented via the graph relationship system (`rebuildGraph()` + `/graph/connections` + `/graph/path`). Entity-to-entity links are queryable. Full event-level correlation (e.g., oil price spike correlated with Hormuz closure) remains deferred.
- **Sentiment analysis:** Available via the BYOK AI analysis module (Tier 2). Users with their own LLM API keys get per-cluster sentiment, bias labeling, and escalation signals. No built-in sentiment model yet.
- **Risk forecasting:** ML-based prediction of risk level changes. **Still deferred to post-launch.**

When fully implemented, each capability runs as a Bun `Worker` thread with message-passing to the main process.

### 4.16 Logging & Observability

**Structured JSON logging** via a lightweight logger (e.g., `pino` or custom):

```ts
{
  level: "info",
  timestamp: "2026-03-17T02:15:00.000Z",
  requestId: "abc-123",              // generated per request, included in all logs + response headers
  method: "GET",
  path: "/api/v1/countries",
  status: 200,
  durationMs: 12,
  cached: true,
  userAgent: "...",
  ip: "..."
}
```

- **Request ID:** Generated in middleware, passed via `X-Request-Id` response header. Included in all downstream logs (Mongo queries, Redis ops, errors).
- **Log levels:** `error` (failures), `warn` (degraded state like Redis down), `info` (request/response), `debug` (query details, cache hits/misses — dev only).
- **Error logging:** Stack traces included for 500s. Sanitized (no API keys, no user data).
- **Startup log:** Lists loaded modules, connected services, environment.

### 4.17 Rate Limiting Storage

Rate limit counters stored in **Redis** using sliding window counters:
- Key pattern: `gambit:ratelimit:{ip}:{minute}`
- TTL: 60 seconds (auto-expires, no cleanup needed)
- Uses `INCR` + `EXPIRE` atomically
- **Redis down fallback:** Switch to in-memory `Map` with periodic cleanup. Log warning. Limits may be less accurate (per-process, not shared) but the API stays functional.

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

## 5. Data Pipeline (Seeding)

### 5.1 Source Data

All seed data extracted from `.firecrawl/hegemon-bundle.js` (1.8MB minified JavaScript):

| Dataset | Records | Extracted File | Size |
|---------|---------|----------------|------|
| Countries | 199 | `hegemon-countries-raw.js` | 225KB |
| Military Bases | 495 | `hegemon-bases.js` | 320KB |
| Non-State Actors | 79 | `hegemon-nsa-full.js` | 98KB |
| Chokepoints | 60 | `hegemon-chokepoints.js` | 49KB |
| Elections | 13 | Embedded in bundle | ~5KB |
| Trade Routes | 21 | Existing `trade-routes.ts` | 7KB |
| News Events | 40+ | `hegemon-full.md` | 11KB |
| Conflicts | 4+ | Embedded in countries | ~8KB |
| Country Colors | ~30 | Embedded in bundle | ~1KB |

### 5.2 Seed Process

1. `parse-bundle.ts` reads the raw extracted JS files and converts minified object notation to valid JSON
2. Individual seed scripts (`seed-countries.ts`, etc.) validate, transform, and insert into MongoDB
3. Each seed adds `createdAt`, `updatedAt`, `dataSource` fields
4. Each seed converts `lat/lng` to GeoJSON `location` fields for 2dsphere indexing
5. `seed-all.ts` runs all seeds in dependency order: ports first (trade routes reference them), then everything else
6. After seeding, warm Redis cache by reading all collections and caching with TTLs

**Idempotency:** All seed scripts use `bulkWrite` with upsert operations (match on `_id`, update if exists, insert if not). Running `seed-all.ts` multiple times is safe — it overwrites existing data with the latest parsed values and updates the `updatedAt` timestamp. Collections are never dropped.

**Index creation:** Seed scripts create indexes after upserting data. MongoDB's `createIndex` is idempotent — calling it when the index already exists is a no-op.

### 5.3 Seed Dependency Order

```
1. ports (no deps)
2. chokepoints (no deps)
3. countries (no deps)
4. countryColors (no deps)
5. bases (no deps)
6. nonStateActors (no deps)
7. elections (no deps)
8. tradeRoutes (references ports + chokepoints)
9. conflicts (references countries)
10. news (references conflicts + countries)
```

---

## 6. Frontend Architecture

### 6.1 Tech Stack

- **Framework:** Preact + Vite
- **Map:** Deck.GL with `GlobeView` (overview) and `MapView` (detail)
- **Base Map:** PMTiles (self-hosted OSM vector tiles) + MapLibre with custom dark style
- **State:** Preact Signals or lightweight store (no Redux)
- **Styling:** CSS Modules or vanilla CSS (dark intelligence theme)

### 6.2 Loading Waterfall (Performance Target)

**First visit:**
```
0ms      HTML arrives (CDN edge cached)
50ms     App shell renders (inline critical CSS, system font)
100ms    Globe renders with baked dark earth texture + static bootstrap snapshot
200ms    Service worker installed, PMTiles metadata preloaded
300ms    Bootstrap slim arrives from API (or CDN edge) -> real data replaces snapshot
500ms    Full interactive — layers toggle, search works, SSE connected
1s+      Background: full bootstrap, PMTiles tiles, lazy layer chunks preloaded
```

**Repeat visit:**
```
0ms      HTML from service worker cache
50ms     Full app renders from IndexedDB cached data
200ms    Background refresh from API
```

### 6.3 Performance Strategies

- **Static bootstrap snapshot** baked into the build — first-ever visit renders immediately with slightly stale data while real fetch completes
- **IndexedDB persistence** — last bootstrap response cached locally for instant repeat-visit rendering
- **Service worker** — caches app shell, earth texture, PMTiles metadata, fonts
- **Binary data transfer** — map layer data served as `Float32Array`, skips JSON parsing
- **Web Workers** — parse API responses and compute derived data (arc segments, zone circles, clusters) off main thread
- **Bundle splitting** — core (globe + risk heatmap) is initial chunk (~150KB), each layer panel lazy-loaded when toggled
- **Font loading** — `font-display: swap` + `<link rel="preload">` for primary font weight
- **Brotli compression** — all API responses compressed
- **CDN edge caching** — reference data served from nearest Cloudflare edge

### 6.4 Globe / Map Views

- **Globe view:** Deck.GL `GlobeView` + dark earth texture (baked ~200KB) + data layers on top. Visual overview mode.
- **Flat view:** Deck.GL `MapView` + MapLibre GL JS + PMTiles vector tiles with dark styling. Full interaction mode.
- **Transition:** View switches at ~zoom level 4-5 when user zooms past threshold. A brief crossfade masks the swap.
- **Both views** share the same Deck.GL data layers — no duplicate rendering code.

**Technical notes:**
- Deck.GL `GlobeView` does not support MapLibre as a base map. Globe view uses the baked earth texture only; vector tiles appear only in flat view.
- Smooth animated interpolation between `GlobeView` and `MapView` is not natively supported by Deck.GL. The transition is a discrete swap with a camera animation and brief crossfade (~200ms) to mask the switch.
- **Alternative considered:** MapLibre GL JS v4+ has a native `globe` projection that could unify both views. However, Deck.GL layer rendering (arcs, scatterplots, icons) is significantly faster than MapLibre's native layers for this data volume. The Deck.GL approach is chosen for performance; the globe-to-flat transition is an acceptable UX tradeoff.
- **Risk heatmap in globe view:** Country polygons are not available from PMTiles in globe view. Instead, render risk dots (colored by risk level) at country center points using a Deck.GL `ScatterplotLayer`. Full polygon heatmap appears only in flat view where PMTiles provides country boundaries via MapLibre feature-state coloring.
- **Country boundary source (flat view):** Natural Earth boundaries included in the PMTiles regional extract. MapLibre `setFeatureState()` colors each country polygon by risk level without additional GeoJSON downloads.

### 6.5 PMTiles Setup

- Self-hosted `.pmtiles` file containing OSM vector tiles
- Regional extract (conflict zones + major powers) not planet-wide
- Served by Bun API as static file with HTTP range request support
- PMTiles metadata preloaded in HTML `<head>`: `<link rel="preload">`
- CartoDB Dark Matter raster tiles as fallback during early development

**Generation:**
- Tool: [Planetiler](https://github.com/onthegomap/planetiler) (Java, fastest OSM-to-tiles converter)
- Source: OSM planet PBF from [download.geofabrik.de](https://download.geofabrik.de)
- Regions to include: Europe, Middle East, Central/South Asia, East Asia, Africa, Americas — effectively global but at lower zoom levels for less-relevant areas
- Must include **Natural Earth** boundaries layer (country polygons for risk heatmap feature-state coloring)
- Output: single `.pmtiles` file, expected ~3-8GB depending on max zoom level
- Max zoom: 10 for global coverage, 14 for conflict hotspot regions (configurable in Planetiler profile)
- Store in `api/data/tiles.pmtiles` for local dev, Cloudflare R2 or S3 for production

### 6.6 Design System

**Aesthetic:** Dark intelligence/command-center theme inspired by Hegemon's design language but distinct.

**Color palette:**
```
Background:
  --bg-primary:     #0a0a1a    (deep navy black)
  --bg-secondary:   #111128    (panel backgrounds)
  --bg-tertiary:    #1a1a3e    (elevated surfaces, cards)

Text:
  --text-primary:   #e8e8f0    (headings, important text)
  --text-secondary: #8888aa    (labels, metadata)
  --text-muted:     #555577    (disabled, tertiary info)

Borders:
  --border-default: #2a2a4a
  --border-hover:   #3a3a6a

Semantic (risk levels):
  --risk-catastrophic: #ef4444  (red)
  --risk-extreme:      #f97316  (orange)
  --risk-severe:       #eab308  (yellow)
  --risk-stormy:       #d97706  (amber)
  --risk-cloudy:       #6b7280  (grey-blue)
  --risk-clear:        #22c55e  (green)

Accents:
  --accent-primary:    #00d4ff  (cyan — primary interactive elements)
  --accent-conflict:   #ef4444  (red — conflict/breaking badges)
  --accent-security:   #eab308  (yellow — security badges)
  --accent-diplomacy:  #8b5cf6  (purple — diplomacy badges)
  --accent-economic:   #3b82f6  (blue — economic badges)
```

**Typography:**
```
--font-mono:    'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', monospace
--font-sans:    'Inter', -apple-system, system-ui, sans-serif

Body text:        --font-sans, 13px
Panel headers:    --font-mono, 10px, uppercase, letter-spacing 0.1em
Badges:           --font-mono, 9px, uppercase, bold
Map labels:       --font-mono, 11px
```

**Spacing:** 4px base unit. Padding: 8px (tight), 12px (default), 16px (loose). Panel gaps: 8px.

**Component patterns:**
- Cards: `--bg-tertiary` background, `--border-default` border, 6px radius, hover brightness +3%
- Badges: Pill shape, semantic color background, white text, 2px radius
- Buttons: Ghost style (transparent bg, border, hover fill), no rounded-full
- Scrollbars: 6px thin, `--bg-tertiary` thumb, transparent track

### 6.7 Day/Night Dynamic Map Theme

The base map style adapts based on the user's local time, matching real-world lighting conditions.

**Implementation:**
- Detect user's timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Calculate local sunrise/sunset using a lightweight solar calculation (no external API needed — formulas based on latitude + date)
- User's latitude derived from: (a) browser Geolocation API if permitted, (b) fallback to timezone-based latitude estimate

**Theme states:**

| Time | Map Style | Globe Texture |
|------|-----------|---------------|
| Day (sunrise to golden hour) | Light-tinted dark theme — slightly brighter land masses, cooler ocean tones | Day earth texture with cloud overlay |
| Golden hour (1h before sunset) | Warm amber tint on horizon, land masses slightly orange-shifted | Blended day/night |
| Night (sunset to sunrise) | Full dark theme — darkest land, minimal labels, high contrast data layers | Night earth texture (NASA Black Marble — city lights visible) |
| Dawn (1h before sunrise) | Cool blue tint, gradually brightening | Blended night/day |

**Map style switching:**
- MapLibre style spec supports runtime property changes — adjust `fill-color`, `line-color`, `text-color` expressions based on a `dayNight` state variable
- Transitions between states use CSS-style easing over 60 seconds (not instant swap)
- Land fill: day = `#1a1a3e`, night = `#0d0d1a`
- Water fill: day = `#0a1628`, night = `#050d18`
- Labels: day = `#8888aa`, night = `#555577`
- Road lines: day = `#2a2a4a`, night = `#1a1a2e`

**Globe textures:**
- Day: Custom dark-tinted Blue Marble (~300KB, baked into build)
- Night: NASA Black Marble with city lights (~300KB, baked into build)
- Transition: WebGL shader blend between day/night textures based on solar position
- Bonus: The terminator line (day/night boundary) can be rendered as a subtle gradient arc on the globe, showing real-time global illumination

**User override:**
- Settings panel includes: `Auto (follow sun)` | `Always dark` | `Always light`
- Default: `Auto (follow sun)`

**Performance:** Solar calculation runs once per minute (not per frame). Style changes are batched. Texture blending uses GPU shader — zero CPU overhead.

---

## 7. Frontend Features

### 7.1 Layer Toggle System

**Layer menu** (bottom-left of map):

```
[ Layers 3 ] [ Compare ]
```

Badge count shows active layers. Clicking opens dropdown:

```
+---------------------------------------+
|                                       |
|  PRESETS                              |
|  [ Conflict Zone ]  [ Trade Risk ]    |
|  [ Full Intel ]     [ Minimal ]       |
|                                       |
|  ECONOMIC                             |
|  [x] Trade Routes        ---         |
|  [x] Chokepoints         ---         |
|                                       |
|  SECURITY                             |
|  [ ] Military Bases      ---         |
|  [x] Non-State Actors    ---         |
|  [ ] Conflicts           ---         |
|                                       |
|  POLITICAL                            |
|  [ ] Elections           ---          |
|                                       |
|  ----------------------------------  |
|  Risk Heatmap          [====--] 60%   |
|                                       |
+---------------------------------------+
```

- Group headers clickable to toggle all in group
- Risk heatmap opacity slider always visible
- Small icon per layer showing what it looks like on the map

**Presets:**
- **Conflict Zone:** Military + Actors + Conflicts on
- **Trade Risk:** Trade Routes + Chokepoints on
- **Full Intel:** Everything on
- **Minimal:** Only risk heatmap

**Compare button states:**
- Default: `[ Compare ]`
- Active: `[ Compare x ]` (highlighted, click to exit)
- Selecting: `[ Compare 1/3 ]` (shows selection count)

**Keyboard shortcuts:**
- `1-6` toggles each layer
- `C` toggles compare mode
- `Esc` exits compare mode
- `L` opens layers menu

**Mobile:** Layers menu becomes a bottom sheet. Compare mode goes full-screen with swipeable cards.

### 7.2 Trade Routes Layer

**Map rendering:** Deck.GL `ArcLayer`
- Routes rendered as arc segments between resolved waypoints
- Color by category: container = blue, energy = amber, bulk = green
- Width scaled by volume (thicker = higher throughput)
- Disrupted/high-risk routes get pulsing animation
- Click arc -> tooltip with route name, volume, status, chokepoints

**Sidebar panel:**
- List of 21 routes grouped by category
- Each row: name, status badge, volume
- Click route -> highlight on map + fly camera to frame it
- Filter by category and status

**Data:** Loaded via `/bootstrap?slim=true` with resolved segments. No additional requests.

### 7.3 Chokepoints Layer

**Map rendering:** Deck.GL `ScatterplotLayer` + `TextLayer`
- Status-colored markers: OPEN = green, RESTRICTED = amber, CLOSED = red
- CLOSED chokepoints get pulsing animation
- Size scaled by strategic importance (oil volume / vessel count)
- Type-based icons: maritime = wave, energy = bolt, land = road
- Click -> tooltip with name, status, volumes, dependent countries, strategic summary

**Sidebar panel:**
- List of 60 chokepoints grouped by type
- Status badge per entry
- Click -> fly camera to chokepoint
- Filter by type and status

### 7.4 Military Bases Layer

**Map rendering:** Deck.GL `ScatterplotLayer` + `IconLayer`
- Colored dots (color = operating country from `countryColors`)
- Size by personnel count
- Icon by type: base = shield, port = anchor, station = tower, facility = gear
- Click -> tooltip with name, branch, personnel, significance, iranWarRole
- Clustering at low zoom (cluster badges with count)
- Zoom in -> clusters break apart into individual bases

**Sidebar panel:**
- Searchable list of 495 bases
- Filter by country, branch, type
- Group by country or region
- "Nearby" button sorts by proximity to map center

**Data:** Uses `/viewport?bbox=...&layers=bases` for viewport-based loading as user pans/zooms.

### 7.5 Non-State Actors Layer

**Map rendering:** Deck.GL `ScatterplotLayer` with semi-transparent circles
- Each group's `zones[]` rendered as filled circles (lat/lng + radiusKm)
- Color by ideology: Jihadist = red, Nationalist/separatist = orange, Criminal/cartel = purple, State-proxy/militia = yellow, Cyber = cyan
- Opacity by status: active = 0.4, inactive = 0.15
- Overlapping zones show conflict density (darker = more groups)
- Click zone -> group profile

**Sidebar panel:**
- All 79 groups, sortable by name, status, strength
- Filter by ideology, status, region
- Each row: name, aka, sponsor, strength badge
- Click -> fly camera to primary zone, highlight all zones
- Expandable: funding, allies, rivals, major attacks timeline

### 7.6 Conflicts Layer

**Map rendering:** Animated pulse rings at conflict epicenters
- Ring size by severity/casualty count
- Color: red for active, amber for ceasefire
- Day count label next to ring
- Click -> conflict detail with casualties, latest update, timeline

**Sidebar panel:**
- Active conflicts sorted by severity
- Each row: title, day count, casualty summary, status badge
- Click -> fly camera to conflict region

### 7.7 Elections Layer

**Map rendering:** Markers at country capitals with countdown badges
- Color: upcoming = blue, past = grey
- Countdown shows days until election
- Click -> election detail with type, candidates, summary

**Sidebar panel:**
- Timeline view: elections sorted chronologically
- Each entry: flag, country, date, type, result (if past)

### 7.8 Compare Mode

**Activation:**
1. Click "Compare" button
2. Map enters selection mode — click countries to add (max 3)
3. Selected countries highlight with assigned color
4. Comparison panel opens in sidebar

**Comparison panel:**

```
+-------------------------------------------------+
|  US            |  IR             |  RU           |
+-------------------------------------------------+
|  Risk: STORMY  | CATASTROPHIC    | CATASTROPHIC  |
|  Pop: 331M     | 87M             | 144M          |
|  GDP: $25.5T   | $388B           | $1.8T         |
|  Leader: Trump | Khamenei        | Putin         |
|  Region: N.Am  | Middle East     | E. Europe     |
|  Tags: ...     | ...             | ...           |
+-------------------------------------------------+
|  Analysis (tabbed per country)                  |
+-------------------------------------------------+
|  Related Conflicts (merged list)                |
|  Related NSA Groups (merged list)               |
|  Nearby Bases (merged list)                     |
+-------------------------------------------------+
```

**Data:** `GET /compare?countries=US,IR,RU` returns enriched profiles with related data resolved server-side.

**Mobile:** Full-screen with swipeable cards instead of side-by-side columns.

### 7.9 Always-On Features

**Risk heatmap:**
- Country polygons colored by risk level
- Catastrophic = deep red, Extreme = orange, Severe = yellow, Stormy = amber, Cloudy = grey-blue, Clear = green
- Opacity adjustable via layers menu slider

**Critical watchlist sidebar (always visible):**
- Top 13 catastrophic + 11 extreme countries
- Click any country -> fly to it, show profile

**News feed panel:**
- Connected via SSE (`/events/stream`)
- Events appear in real-time with tag badges
- Click news item -> highlight related countries/conflicts on map

**Global search bar:**
- Uses `/search?q=...`
- Results grouped by type (countries, conflicts, bases, groups, chokepoints)
- Select result -> fly camera to location, open detail panel

---

## 8. Build Sequence

### Phase 1: Infrastructure
1. Docker Compose with Bun API, MongoDB, Redis, Mongo Express
2. Hono app skeleton with health endpoints
3. MongoDB connection + Redis connection
4. Cache-aside middleware

### Phase 2: Data Pipeline
5. Bundle parser (`parse-bundle.ts`)
6. Individual seed scripts for all 10 collections
7. `seed-all.ts` orchestrator
8. Verify all data in Mongo Express

### Phase 3: API Routes
9. Reference endpoints (countries, bases, nsa, chokepoints, elections, trade-routes, ports, conflicts)
10. Bootstrap + viewport + search + compare endpoints
11. SSE event stream
12. Binary layer endpoints
13. Auth, rate limiting, compression middleware

### Phase 3.5: Intelligence Pipeline

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

### Phase 4: Frontend Shell
14. Preact + Vite project scaffold
15. Deck.GL globe view with dark earth texture
16. Globe/flat view toggle with smooth transition
17. PMTiles + MapLibre integration for flat view
18. Service worker + IndexedDB caching
19. Bootstrap fetch from API on load (static snapshot deferred to Phase 6 step 38)

### Phase 5: Layers & Features

**Note:** All layers initially use JSON endpoints. Binary endpoints (Phase 6) are a performance upgrade applied after layers work correctly with JSON.

20. Risk heatmap — globe view: risk-colored dots at country centers; flat view: polygon fill via MapLibre feature-state (requires PMTiles with Natural Earth boundaries from step 17)
21. Critical watchlist sidebar
22. Layers menu + presets
23. Trade Routes layer + panel
24. Chokepoints layer + panel
25. Military Bases layer + panel (uses `/viewport` for viewport-based loading)
26. Non-State Actors layer + panel
27. Conflicts layer + panel
28. Elections layer + panel
29. Compare Mode
30. Global search
31. News feed panel + SSE connection
32. Keyboard shortcuts

### Phase 6: Performance
33. Binary data endpoints + Deck.GL integration (upgrade layers from JSON to binary)
34. Web Workers for data processing
35. Bundle splitting + lazy loading
36. CDN configuration (Cloudflare)
37. Loading states + error handling + offline graceful degradation
38. Static bootstrap snapshot baked into build (requires API to be running at frontend build time — CI must start API + seed before building frontend)

---

## 9. Open Questions

1. **Re-scraping cadence:** ~~How often should Hegemon data be refreshed? Manual trigger only, or scheduled (daily/weekly)?~~ **Answered:** The Hegemon re-scraper is a future periodic task. RSS ingestion (Phase 3.5) provides continuous fresh data in the meantime.
2. **Additional data sources:** ~~Should the periodic module integrate any of the existing Monitor API sources (ACLED, Finnhub, OpenSky, etc.) from the start, or add them incrementally?~~ **Answered:** The plugin system (Phase 3.5) provides the architecture. Individual sources (ACLED, Finnhub, OpenSky, etc.) can be added as plugins without modifying core code.
3. **Deployment target:** Where will the Docker Compose stack run in production? VPS, AWS, Railway, or self-hosted?
4. **Map tile hosting:** Where will the PMTiles file be hosted? Same server as the API, a CDN, or object storage (S3/R2)?
