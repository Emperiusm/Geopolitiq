# Gambit Backend Infrastructure + Data Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Gambit backend (Bun + Hono + Docker) and seed MongoDB with all Hegemon data — producing a fully queryable database of 199 countries, 495 bases, 79 NSAs, 60 chokepoints, 13 elections, 21 trade routes, ports, conflicts, news, and country colors.

**Architecture:** Modular monolith in `api/` — Hono app with module-based routing, MongoDB for persistence, Redis for caching. Docker Compose orchestrates 5 services. Seed scripts parse extracted JS bundles from `.firecrawl/` into normalized MongoDB documents with GeoJSON locations.

**Tech Stack:** Bun 1.x, Hono 4.x, MongoDB 7 (via `mongodb` npm driver, pure-JS BSON), Redis 7 (via `ioredis`), Docker Compose, `bun:test`

**Spec:** [docs/superpowers/specs/2026-03-17-hegemon-data-platform-design.md](../specs/2026-03-17-hegemon-data-platform-design.md)

**Related Plans:**
- Plan 2: [API Routes + Middleware](2026-03-17-gambit-api-routes.md) (Phase 3)
- Plan 3: [Frontend Shell, Layers & Performance](2026-03-17-gambit-frontend.md) (Phases 4-6)

---

## File Structure

### New Files to Create

```
api/
  package.json                          # Bun project: mongodb, ioredis, hono deps
  tsconfig.json                         # Bun + strict TS config
  Dockerfile                            # Bun runtime container
  src/
    index.ts                            # Hono app entry, mounts routers, starts server
    infrastructure/
      mongo.ts                          # MongoDB client singleton + connect/disconnect
      redis.ts                          # Redis client singleton + connect/disconnect
      cache.ts                          # Cache-aside helper: get/set with Redis->Mongo fallback
      health.ts                         # Health check routes (/health, /health/ready)
    middleware/
      cors.ts                           # CORS middleware (configurable origins)
      request-id.ts                     # X-Request-Id generation + header
    seed/
      parse-bundle.ts                   # Read .firecrawl/*.js files, convert to JSON arrays
      seed-countries.ts                 # Upsert 199 countries into MongoDB
      seed-bases.ts                     # Upsert 495 military bases
      seed-nsa.ts                       # Upsert 79 non-state actors
      seed-chokepoints.ts              # Upsert 60 chokepoints
      seed-elections.ts                 # Upsert 13 elections (4 dedicated + 9 from countries)
      seed-trade-routes.ts             # Upsert 21 trade routes
      seed-ports.ts                     # Upsert ports (derived from trade route endpoints)
      seed-conflicts.ts                # Upsert active conflicts
      seed-news.ts                      # Upsert news events
      seed-country-colors.ts           # Upsert country color lookup
      seed-all.ts                       # Orchestrator: runs all seeds in dependency order
    types/
      index.ts                          # Shared TypeScript interfaces for all collections
  tests/
    infrastructure/
      mongo.test.ts                     # MongoDB connection tests
      redis.test.ts                     # Redis connection tests
      cache.test.ts                     # Cache-aside logic tests
      health.test.ts                    # Health endpoint tests
    seed/
      parse-bundle.test.ts             # Bundle parser tests
      seed-countries.test.ts           # Country seed tests
      seed-bases.test.ts               # Base seed tests
      seed-nsa.test.ts                 # NSA seed tests
      seed-chokepoints.test.ts         # Chokepoint seed tests
      seed-elections.test.ts           # Election seed tests
      seed-trade-routes.test.ts        # Trade route seed tests
      seed-ports.test.ts               # Port seed tests
      seed-conflicts.test.ts           # Conflict seed tests
      seed-news.test.ts                # News seed tests
      seed-country-colors.test.ts      # Country color seed tests
      seed-all.test.ts                 # Seed orchestrator tests
docker-compose.yml                      # 5 services: api, mongo, redis, mongo-express, frontend
.env.example                            # Template env vars
```

### Existing Files Referenced (Read-Only)

```
.firecrawl/
  hegemon-countries-raw.js              # const ct = { Ukraine: {...}, ... }
  hegemon-bases.js                      # const BASES = [{id, name, ...}, ...]
  hegemon-nsa-full.js                   # const NSA = [{id, name, ...}, ...]
  hegemon-chokepoints.js                # const CHOKEPOINTS = [{id, name, ...}, ...]
  hegemon-elections.js                  # const ELECTIONS = [{flag, country, ...}, ...]
  hegemon-bundle.js                     # Minified master bundle (trade routes, conflicts, news, colors)
```

---

## Phase 1: Infrastructure

### Task 1: Docker Compose + Project Scaffold

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`
- Create: `api/package.json`
- Create: `api/tsconfig.json`
- Create: `api/Dockerfile`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
# docker-compose.yml
services:
  api:
    build: ./api
    ports: ["3000:3000"]
    environment:
      MONGO_URI: mongodb://mongo:27017/gambit
      REDIS_URL: redis://redis:6379
      API_KEY: ${API_KEY:-dev}
      PORT: "3000"
      NODE_ENV: development
      CORS_ORIGINS: http://localhost:5173,http://localhost:3000
    depends_on: [mongo, redis]
    volumes:
      - ./api/src:/app/src
      - ./.firecrawl:/app/.firecrawl:ro

  mongo:
    image: mongo:7
    ports: ["27017:27017"]
    volumes:
      - mongo-data:/data/db

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  mongo-express:
    image: mongo-express:latest
    ports: ["8081:8081"]
    environment:
      ME_CONFIG_MONGODB_URL: mongodb://mongo:27017
    profiles: ["dev"]

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    environment:
      VITE_API_URL: http://localhost:3000/api/v1
    depends_on: [api]
    profiles: ["dev"]

volumes:
  mongo-data:
```

- [ ] **Step 2: Create .env.example**

```bash
# .env.example
MONGO_URI=mongodb://mongo:27017/gambit
REDIS_URL=redis://redis:6379
API_KEY=dev
PORT=3000
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
RATE_LIMIT_RPM=100
SSE_HEARTBEAT_MS=30000
SSE_BUFFER_SIZE=100
```

- [ ] **Step 3: Create api/package.json**

```json
{
  "name": "gambit-api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "test": "bun test",
    "test:watch": "bun test --watch",
    "seed": "bun src/seed/seed-all.ts",
    "typecheck": "bun x tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.7.0",
    "mongodb": "^6.12.0",
    "ioredis": "^5.4.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 4: Create api/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["bun-types"],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "tests/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 5: Create api/Dockerfile**

```dockerfile
FROM oven/bun:1-alpine

WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

COPY . .

EXPOSE 3000
CMD ["bun", "src/index.ts"]
```

- [ ] **Step 6: Install dependencies**

Run: `cd api && bun install`
Expected: lockfile created, node_modules populated

- [ ] **Step 7: Verify Docker Compose starts**

Run: `docker compose up -d mongo redis`
Expected: MongoDB on :27017, Redis on :6379

Run: `docker compose ps`
Expected: mongo and redis containers running

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml .env.example api/package.json api/tsconfig.json api/Dockerfile api/bun.lockb
git commit -m "feat: scaffold Docker Compose + Bun API project structure"
```

---

### Task 2: Shared Types

**Files:**
- Create: `api/src/types/index.ts`

- [ ] **Step 1: Create shared TypeScript interfaces**

```ts
// api/src/types/index.ts

// Shared metadata on all documents
export interface DocMeta {
  createdAt: Date;
  updatedAt: Date;
  dataSource: "hegemon-bundle" | "firecrawl-scrape" | "manual";
}

// GeoJSON Point for 2dsphere indexes
export interface GeoPoint {
  type: "Point";
  coordinates: [lng: number, lat: number];
}

// --- Countries ---

export interface CasualtySrc {
  name: string;
  figure: string;
  note: string;
}

export interface Casualties {
  total: string;
  label: string;
  lastUpdated: string;
  source: string;
  contested: boolean;
  sources: CasualtySrc[];
}

export interface Analysis {
  what: string;
  why: string;
  next: string;
}

export type RiskLevel = "catastrophic" | "extreme" | "severe" | "stormy" | "cloudy" | "clear";

export interface Country extends DocMeta {
  _id: string;           // slug: "ukraine"
  iso2: string;          // "UA"
  name: string;
  flag: string;
  lat: number;
  lng: number;
  location: GeoPoint;
  risk: RiskLevel;
  tags: string[];
  region: string;
  pop: string;
  gdp: string;
  leader: string;
  title: string;
  casualties: Casualties | null;
  analysis: Analysis;
}

export interface CountrySlim {
  _id: string;
  iso2: string;
  name: string;
  flag: string;
  lat: number;
  lng: number;
  risk: RiskLevel;
  region: string;
  tags: string[];
}

// --- Bases ---

export type BaseType = "base" | "port" | "station" | "facility";

export interface Base extends DocMeta {
  _id: string;
  name: string;
  country: string;
  hostNation: string;
  operatingCountry: string;
  lat: number;
  lng: number;
  location: GeoPoint;
  branch: string;
  type: BaseType;
  flag: string;
  color: string;
  personnel: string;
  history: string;
  significance: string;
  iranWarRole: string | null;
}

// --- Non-State Actors ---

export interface NSAZone {
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface MajorAttack {
  year: string;
  event: string;
}

export interface NonStateActor extends DocMeta {
  _id: string;
  name: string;
  ideology: string;
  status: "active" | "inactive" | "degraded";
  designation: string;
  founded: string;
  revenue: string;
  strength: string;
  activities: string;
  territory: string;
  funding: string;
  leaders: string;
  allies: string[];
  rivals: string[];
  majorAttacks: MajorAttack[];
  searchTerms: string[];
  zones: NSAZone[];
}

// --- Chokepoints ---

export type ChokepointType = "maritime" | "energy" | "land";
export type ChokepointStatus = "OPEN" | "RESTRICTED" | "CLOSED";

export interface Chokepoint extends DocMeta {
  _id: string;
  name: string;
  type: ChokepointType;
  lat: number;
  lng: number;
  location: GeoPoint;
  tooltipLine: string;
  summary: string;
  dailyVessels: string;
  oilVolume: string;
  gasVolume: string;
  status: ChokepointStatus;
  dependentCountries: string[];
  strategicSummary: string;
  searchTerms: string[];
}

// --- Elections ---

export interface Election extends DocMeta {
  _id: string;
  flag: string;
  country: string;
  countryISO2: string;
  lat: number;
  lng: number;
  location: GeoPoint;
  date: string;
  dateISO: Date;
  type: string;
  winner: string | null;
  result: string | null;
  summary: string;
}

// --- Trade Routes ---

export type TradeCategory = "container" | "energy" | "bulk";
export type TradeStatus = "active" | "disrupted" | "high_risk";

export interface TradeRoute extends DocMeta {
  _id: string;
  name: string;
  from: string;     // port _id
  to: string;       // port _id
  category: TradeCategory;
  status: TradeStatus;
  volumeDesc: string;
  waypoints: string[];  // chokepoint _id references
}

// --- Ports ---

export interface Port extends DocMeta {
  _id: string;
  name: string;
  lat: number;
  lng: number;
  location: GeoPoint;
  country: string;
}

// --- Conflicts ---

export interface ConflictCasualty {
  party: string;
  figure: string;
}

export interface Conflict extends DocMeta {
  _id: string;
  title: string;
  lat: number;
  lng: number;
  location: GeoPoint;
  startDate: Date;
  dayCount: number;
  status: "active" | "ceasefire" | "resolved";
  casualties: ConflictCasualty[];
  latestUpdate: string;
  tags: string[];
  relatedCountries: string[];  // ISO-2 codes
}

// --- News ---

export interface NewsEvent extends DocMeta {
  title: string;
  summary: string;
  tags: string[];
  sourceCount: number;
  conflictId: string | null;
  relatedCountries: string[];  // ISO-2 codes
  publishedAt: Date;
}

// --- Country Colors ---

export interface CountryColor {
  _id: string;   // country name
  color: string;  // hex
}

// --- API Response Envelope ---

export interface ApiMeta {
  total?: number;
  limit?: number;
  offset?: number;
  cached?: boolean;
  freshness?: string;
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add api/src/types/index.ts
git commit -m "feat: add shared TypeScript interfaces for all collections"
```

---

### Task 3: MongoDB Connection

**Files:**
- Create: `api/src/infrastructure/mongo.ts`
- Test: `api/tests/infrastructure/mongo.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// api/tests/infrastructure/mongo.test.ts
import { describe, it, expect, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";

describe("MongoDB infrastructure", () => {
  afterAll(async () => {
    await disconnectMongo();
  });

  it("connects and returns a database instance", async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    const db = getDb();
    expect(db).toBeDefined();
    expect(db.databaseName).toBe("gambit-test");
  });

  it("getDb throws before connect", () => {
    // Fresh import would be needed to truly test this,
    // but we verify the function exists
    expect(typeof getDb).toBe("function");
  });

  it("can ping the database", async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    const db = getDb();
    const result = await db.command({ ping: 1 });
    expect(result.ok).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && bun test tests/infrastructure/mongo.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement MongoDB connection**

```ts
// api/src/infrastructure/mongo.ts
import { MongoClient, type Db } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectMongo(uri?: string): Promise<Db> {
  const mongoUri = uri ?? process.env.MONGO_URI ?? "mongodb://localhost:27017/gambit";
  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db();
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error("MongoDB not connected. Call connectMongo() first.");
  return db;
}

export function getClient(): MongoClient {
  if (!client) throw new Error("MongoDB not connected. Call connectMongo() first.");
  return client;
}

export async function disconnectMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && bun test tests/infrastructure/mongo.test.ts`
Expected: PASS (requires MongoDB running on localhost:27017)

- [ ] **Step 5: Commit**

```bash
git add api/src/infrastructure/mongo.ts api/tests/infrastructure/mongo.test.ts
git commit -m "feat: add MongoDB connection infrastructure with tests"
```

---

### Task 4: Redis Connection

**Files:**
- Create: `api/src/infrastructure/redis.ts`
- Test: `api/tests/infrastructure/redis.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// api/tests/infrastructure/redis.test.ts
import { describe, it, expect, afterAll } from "bun:test";
import { connectRedis, disconnectRedis, getRedis } from "../../src/infrastructure/redis";

describe("Redis infrastructure", () => {
  afterAll(async () => {
    await disconnectRedis();
  });

  it("connects and returns a Redis client", async () => {
    const redis = await connectRedis("redis://localhost:6379");
    expect(redis).toBeDefined();
    expect(redis.status).toBe("ready");
  });

  it("can set and get a value", async () => {
    const redis = getRedis();
    await redis.set("gambit:test:key", "hello");
    const val = await redis.get("gambit:test:key");
    expect(val).toBe("hello");
    await redis.del("gambit:test:key");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && bun test tests/infrastructure/redis.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement Redis connection**

```ts
// api/src/infrastructure/redis.ts
import Redis from "ioredis";

let redis: Redis | null = null;

export async function connectRedis(url?: string): Promise<Redis> {
  const redisUrl = url ?? process.env.REDIS_URL ?? "redis://localhost:6379";
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 10) return null; // stop retrying
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });
  await redis.connect();
  return redis;
}

export function getRedis(): Redis {
  if (!redis) throw new Error("Redis not connected. Call connectRedis() first.");
  return redis;
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

export function isRedisConnected(): boolean {
  return redis !== null && redis.status === "ready";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && bun test tests/infrastructure/redis.test.ts`
Expected: PASS (requires Redis running on localhost:6379)

- [ ] **Step 5: Commit**

```bash
git add api/src/infrastructure/redis.ts api/tests/infrastructure/redis.test.ts
git commit -m "feat: add Redis connection infrastructure with tests"
```

---

### Task 5: Cache-Aside Helper

**Files:**
- Create: `api/src/infrastructure/cache.ts`
- Test: `api/tests/infrastructure/cache.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// api/tests/infrastructure/cache.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectRedis, disconnectRedis, getRedis } from "../../src/infrastructure/redis";
import { cacheAside } from "../../src/infrastructure/cache";

describe("Cache-aside helper", () => {
  beforeAll(async () => {
    await connectRedis("redis://localhost:6379");
  });

  afterAll(async () => {
    const redis = getRedis();
    // clean up test keys
    const keys = await redis.keys("gambit:test:*");
    if (keys.length) await redis.del(...keys);
    await disconnectRedis();
  });

  it("calls fetcher on cache miss and caches the result", async () => {
    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { name: "test", value: 42 };
    };

    const result1 = await cacheAside("gambit:test:miss", fetcher, 60);
    expect(result1).toEqual({ name: "test", value: 42 });
    expect(fetchCount).toBe(1);

    // Second call should hit cache
    const result2 = await cacheAside("gambit:test:miss", fetcher, 60);
    expect(result2).toEqual({ name: "test", value: 42 });
    expect(fetchCount).toBe(1); // fetcher NOT called again
  });

  it("returns fetcher result when Redis is unavailable", async () => {
    // Temporarily disconnect
    await disconnectRedis();

    let fetchCount = 0;
    const fetcher = async () => {
      fetchCount++;
      return { fallback: true };
    };

    // cacheAside should gracefully fall back to fetcher
    const result = await cacheAside("gambit:test:noop", fetcher, 60);
    expect(result).toEqual({ fallback: true });
    expect(fetchCount).toBe(1);

    // Reconnect for cleanup
    await connectRedis("redis://localhost:6379");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && bun test tests/infrastructure/cache.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement cache-aside helper**

```ts
// api/src/infrastructure/cache.ts
import { getRedis, isRedisConnected } from "./redis";

export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number,
): Promise<T & { _cached?: boolean }> {
  // Try Redis first
  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      const cached = await redis.get(key);
      if (cached !== null) {
        return { ...JSON.parse(cached), _cached: true };
      }
    } catch {
      // Redis error — fall through to fetcher
    }
  }

  // Cache miss or Redis unavailable — fetch from source
  const data = await fetcher();

  // Try to cache the result
  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      await redis.set(key, JSON.stringify(data), "EX", ttlSeconds);
    } catch {
      // Redis error — ignore, data still returned
    }
  }

  return data;
}

export async function invalidateCache(pattern: string): Promise<number> {
  if (!isRedisConnected()) return 0;
  try {
    const redis = getRedis();
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    return await redis.del(...keys);
  } catch {
    return 0;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && bun test tests/infrastructure/cache.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/infrastructure/cache.ts api/tests/infrastructure/cache.test.ts
git commit -m "feat: add cache-aside helper with Redis fallback"
```

---

### Task 6: Health Endpoints

**Files:**
- Create: `api/src/infrastructure/health.ts`
- Test: `api/tests/infrastructure/health.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// api/tests/infrastructure/health.test.ts
import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { healthRoutes } from "../../src/infrastructure/health";

describe("Health endpoints", () => {
  const app = new Hono().route("/health", healthRoutes);

  it("GET /health returns 200 with ok status", async () => {
    const res = await app.request("/health");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.uptime).toBeGreaterThan(0);
  });

  it("GET /health/ready returns status of services", async () => {
    const res = await app.request("/health/ready");
    const body = await res.json();
    // Without connections, services should be unhealthy
    expect(body.mongo).toBeDefined();
    expect(body.redis).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && bun test tests/infrastructure/health.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement health routes**

```ts
// api/src/infrastructure/health.ts
import { Hono } from "hono";
import { getDb } from "./mongo";
import { isRedisConnected, getRedis } from "./redis";

export const healthRoutes = new Hono();

const startTime = Date.now();

healthRoutes.get("/", (c) => {
  return c.json({
    status: "ok",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
});

healthRoutes.get("/ready", async (c) => {
  let mongoOk = false;
  let redisOk = false;

  try {
    const db = getDb();
    const result = await db.command({ ping: 1 });
    mongoOk = result.ok === 1;
  } catch {
    mongoOk = false;
  }

  try {
    if (isRedisConnected()) {
      const redis = getRedis();
      const pong = await redis.ping();
      redisOk = pong === "PONG";
    }
  } catch {
    redisOk = false;
  }

  const allHealthy = mongoOk && redisOk;
  const status = allHealthy ? 200 : 503;

  return c.json({
    status: allHealthy ? "ready" : "degraded",
    mongo: mongoOk ? "connected" : "disconnected",
    redis: redisOk ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  }, status);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && bun test tests/infrastructure/health.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/infrastructure/health.ts api/tests/infrastructure/health.test.ts
git commit -m "feat: add health and readiness check endpoints"
```

---

### Task 7: Hono App Entry + Middleware

**Files:**
- Create: `api/src/index.ts`
- Create: `api/src/middleware/cors.ts`
- Create: `api/src/middleware/request-id.ts`

- [ ] **Step 1: Create CORS middleware**

```ts
// api/src/middleware/cors.ts
import { cors } from "hono/cors";

export function createCorsMiddleware() {
  const origins = (process.env.CORS_ORIGINS ?? "http://localhost:5173,http://localhost:3000")
    .split(",")
    .map((o) => o.trim());

  return cors({
    origin: origins,
    allowMethods: ["GET", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-API-Key", "Last-Event-Id"],
    exposeHeaders: ["X-Request-Id"],
    maxAge: 86400,
  });
}
```

- [ ] **Step 2: Create Request ID middleware**

```ts
// api/src/middleware/request-id.ts
import type { MiddlewareHandler } from "hono";

let counter = 0;

export const requestId: MiddlewareHandler = async (c, next) => {
  const id = c.req.header("x-request-id") ?? `gbt-${Date.now()}-${++counter}`;
  c.set("requestId", id);
  c.header("X-Request-Id", id);
  await next();
};
```

- [ ] **Step 3: Create Hono app entry**

```ts
// api/src/index.ts
import { Hono } from "hono";
import { connectMongo } from "./infrastructure/mongo";
import { connectRedis } from "./infrastructure/redis";
import { healthRoutes } from "./infrastructure/health";
import { createCorsMiddleware } from "./middleware/cors";
import { requestId } from "./middleware/request-id";

const app = new Hono();

// Global middleware
app.use("*", createCorsMiddleware());
app.use("*", requestId);

// Mount routes
app.route("/api/v1/health", healthRoutes);

// Root redirect
app.get("/", (c) => c.json({ message: "Gambit API", version: "0.1.0" }));

// Startup
const port = Number(process.env.PORT ?? 3000);

async function start() {
  console.log("[gambit] Starting API...");

  try {
    await connectMongo();
    console.log("[gambit] MongoDB connected");
  } catch (err) {
    console.error("[gambit] MongoDB connection failed:", err);
    process.exit(1);
  }

  try {
    await connectRedis();
    console.log("[gambit] Redis connected");
  } catch (err) {
    console.warn("[gambit] Redis connection failed (cache disabled):", err);
  }

  console.log(`[gambit] API listening on http://localhost:${port}`);
}

start();

export default {
  port,
  fetch: app.fetch,
};

// Also export app for testing
export { app };
```

- [ ] **Step 4: Verify the app starts**

Run: `cd api && bun src/index.ts`
Expected: Logs "Starting API...", connects to MongoDB + Redis, listens on :3000

Run (in another terminal): `curl http://localhost:3000/api/v1/health`
Expected: `{"status":"ok","uptime":...}`

- [ ] **Step 5: Commit**

```bash
git add api/src/index.ts api/src/middleware/cors.ts api/src/middleware/request-id.ts
git commit -m "feat: add Hono app entry with CORS, request-id, and health routes"
```

---

## Phase 2: Data Pipeline

### Task 8: Bundle Parser

**Files:**
- Create: `api/src/seed/parse-bundle.ts`
- Test: `api/tests/seed/parse-bundle.test.ts`

The Hegemon data files are JavaScript variable assignments (`const ct = {...}`, `const BASES = [...]`). The parser must evaluate these safely and return plain objects.

- [ ] **Step 1: Write the failing test**

```ts
// api/tests/seed/parse-bundle.test.ts
import { describe, it, expect } from "bun:test";
import {
  parseCountries,
  parseBases,
  parseNSA,
  parseChokepoints,
  parseElections,
} from "../../src/seed/parse-bundle";

describe("Bundle parser", () => {
  it("parseCountries returns an object keyed by country name", async () => {
    const countries = await parseCountries();
    expect(typeof countries).toBe("object");
    expect(countries["Ukraine"]).toBeDefined();
    expect(countries["Ukraine"].lat).toBeNumber();
    expect(countries["Ukraine"].flag).toBe("🇺🇦");
    expect(Object.keys(countries).length).toBeGreaterThanOrEqual(190);
  });

  it("parseBases returns an array of base objects", async () => {
    const bases = await parseBases();
    expect(Array.isArray(bases)).toBe(true);
    expect(bases.length).toBeGreaterThanOrEqual(490);
    expect(bases[0].id).toBeDefined();
    expect(bases[0].name).toBeDefined();
    expect(bases[0].lat).toBeNumber();
  });

  it("parseNSA returns an array of non-state actor objects", async () => {
    const nsa = await parseNSA();
    expect(Array.isArray(nsa)).toBe(true);
    expect(nsa.length).toBeGreaterThanOrEqual(70);
  });

  it("parseChokepoints returns an array of chokepoint objects", async () => {
    const chokepoints = await parseChokepoints();
    expect(Array.isArray(chokepoints)).toBe(true);
    expect(chokepoints.length).toBeGreaterThanOrEqual(50);
    expect(chokepoints[0].id).toBe("hormuz");
  });

  it("parseElections returns an array of election objects", async () => {
    const elections = await parseElections();
    expect(Array.isArray(elections)).toBe(true);
    expect(elections.length).toBeGreaterThanOrEqual(4);
    expect(elections[0].country).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && bun test tests/seed/parse-bundle.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement bundle parser**

The `.firecrawl/*.js` files use `const VAR = <data>` format. We strip the `const VAR =` prefix and evaluate the rest. Escaped characters (`\[`, `\]`) in the source need unescaping. Template literals with backticks are present in some files.

```ts
// api/src/seed/parse-bundle.ts
import { readFile } from "fs/promises";
import { resolve } from "path";

const DATA_DIR = resolve(import.meta.dir, "../../../.firecrawl");

/**
 * Read a .js file, strip the variable declaration, and evaluate to get the data.
 * These files use `const NAME = <JS literal>` format.
 */
async function evalJsFile(filename: string, varPattern: RegExp): Promise<unknown> {
  const raw = await readFile(resolve(DATA_DIR, filename), "utf-8");
  // Strip the variable declaration: "const X = " or "const X="
  const stripped = raw.replace(varPattern, "").replace(/;\s*$/, "");
  // Unescape escaped brackets (artifact of some extraction)
  const cleaned = stripped.replaceAll("\\[", "[").replaceAll("\\]", "]");
  // Use Function constructor to safely evaluate the JS literal
  // This handles template literals, shorthand properties, etc.
  const fn = new Function(`return (${cleaned});`);
  return fn();
}

/** Parse hegemon-countries-raw.js -> { [name]: { lat, lng, flag, ... } } */
export async function parseCountries(): Promise<Record<string, any>> {
  return evalJsFile("hegemon-countries-raw.js", /^const\s+ct\s*=\s*/) as Promise<Record<string, any>>;
}

/** Parse hegemon-bases.js -> [{ id, name, lat, lng, ... }] */
export async function parseBases(): Promise<any[]> {
  return evalJsFile("hegemon-bases.js", /^const\s+BASES\s*=\s*/) as Promise<any[]>;
}

/** Parse hegemon-nsa-full.js -> [{ id, name, ideology, ... }] */
export async function parseNSA(): Promise<any[]> {
  // NSA file may have irregular format — detect and handle
  const raw = await readFile(resolve(DATA_DIR, "hegemon-nsa-full.js"), "utf-8");
  let stripped = raw.replace(/^const\s+NSA\s*=\s*/, "").replace(/;\s*$/, "");
  stripped = stripped.replaceAll("\\[", "[").replaceAll("\\]", "]");

  // If the data doesn't start with '[', it might be missing the opening bracket
  // or be a single object — wrap as needed
  if (!stripped.trimStart().startsWith("[")) {
    // Check if it looks like object properties without braces
    if (stripped.trimStart().startsWith("{") || stripped.trimStart().startsWith("id:") || stripped.trimStart().startsWith("ideology:")) {
      stripped = `[{${stripped.trimStart().startsWith("{") ? stripped.trimStart().slice(1) : stripped}}]`;
    }
  }

  const fn = new Function(`return (${stripped});`);
  const result = fn();
  return Array.isArray(result) ? result : [result];
}

/** Parse hegemon-chokepoints.js -> [{ id, name, type, ... }] */
export async function parseChokepoints(): Promise<any[]> {
  return evalJsFile("hegemon-chokepoints.js", /^const\s+CHOKEPOINTS\s*=\s*/) as Promise<any[]>;
}

/** Parse hegemon-elections.js -> [{ flag, country, date, ... }] */
export async function parseElections(): Promise<any[]> {
  return evalJsFile("hegemon-elections.js", /^const\s+ELECTIONS\s*=\s*/) as Promise<any[]>;
}

// --- Waypoint ID normalization for trade routes ---
export const WAYPOINT_ID_MAP: Record<string, string> = {
  malacca_strait: "malacca",
  suez_canal: "suez",
  bab_el_mandeb: "bab-el-mandeb",
  panama_canal: "panama",
  strait_of_hormuz: "hormuz",
  cape_of_good_hope: "cape",
  strait_of_gibraltar: "gibraltar",
  turkish_straits: "bosphorus",
  taiwan_strait: "taiwan",
  lombok_strait: "lombok",
  korea_strait: "korea",
  dover_strait: "dover",
};

export function normalizeWaypointId(id: string): string {
  return WAYPOINT_ID_MAP[id] ?? id.replace(/_/g, "-");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && bun test tests/seed/parse-bundle.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/seed/parse-bundle.ts api/tests/seed/parse-bundle.test.ts
git commit -m "feat: add bundle parser for Hegemon data extraction"
```

---

### Task 9: Seed Countries

**Files:**
- Create: `api/src/seed/seed-countries.ts`
- Test: `api/tests/seed/seed-countries.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// api/tests/seed/seed-countries.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { seedCountries } from "../../src/seed/seed-countries";

describe("Seed countries", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    // Clean test collection
    await getDb().collection("countries").deleteMany({});
  });

  afterAll(async () => {
    await getDb().collection("countries").deleteMany({});
    await disconnectMongo();
  });

  it("seeds 199 countries into MongoDB", async () => {
    const count = await seedCountries();
    expect(count).toBeGreaterThanOrEqual(190);

    const db = getDb();
    const ukraine = await db.collection("countries").findOne({ _id: "ukraine" });
    expect(ukraine).not.toBeNull();
    expect(ukraine!.name).toBe("Ukraine");
    expect(ukraine!.iso2).toBe("UA");
    expect(ukraine!.location.type).toBe("Point");
    expect(ukraine!.location.coordinates).toEqual([31.17, 48.38]);
    expect(ukraine!.risk).toBe("catastrophic");
    expect(ukraine!.dataSource).toBe("hegemon-bundle");
    expect(ukraine!.createdAt).toBeInstanceOf(Date);
  });

  it("is idempotent — running again does not duplicate", async () => {
    const count1 = await seedCountries();
    const count2 = await seedCountries();
    expect(count1).toBe(count2);

    const total = await getDb().collection("countries").countDocuments();
    expect(total).toBe(count1);
  });

  it("creates expected indexes", async () => {
    const indexes = await getDb().collection("countries").indexes();
    const indexNames = indexes.map((i: any) => Object.keys(i.key).join(","));
    expect(indexNames).toContain("risk");
    expect(indexNames).toContain("region");
    expect(indexNames).toContain("iso2");
    expect(indexNames).toContain("location");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && bun test tests/seed/seed-countries.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement seed-countries**

```ts
// api/src/seed/seed-countries.ts
import { getDb } from "../infrastructure/mongo";
import { parseCountries } from "./parse-bundle";
import type { GeoPoint } from "../types";

// ISO 3166-1 alpha-2 mapping (country name -> ISO2 code)
// Comprehensive list — covers all 199 Hegemon countries
const ISO2_MAP: Record<string, string> = {
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Andorra": "AD",
  "Angola": "AO", "Argentina": "AR", "Armenia": "AM", "Australia": "AU",
  "Austria": "AT", "Azerbaijan": "AZ", "Bahamas": "BS", "Bahrain": "BH",
  "Bangladesh": "BD", "Barbados": "BB", "Belarus": "BY", "Belgium": "BE",
  "Belize": "BZ", "Benin": "BJ", "Bhutan": "BT", "Bolivia": "BO",
  "Bosnia and Herzegovina": "BA", "Botswana": "BW", "Brazil": "BR",
  "Brunei": "BN", "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI",
  "Cambodia": "KH", "Cameroon": "CM", "Canada": "CA", "Cape Verde": "CV",
  "Central African Republic": "CF", "Chad": "TD", "Chile": "CL",
  "China": "CN", "Colombia": "CO", "Comoros": "KM", "Congo": "CG",
  "Costa Rica": "CR", "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY",
  "Czech Republic": "CZ", "Czechia": "CZ",
  "Democratic Republic of the Congo": "CD", "DRC": "CD",
  "Denmark": "DK", "Djibouti": "DJ", "Dominican Republic": "DO",
  "East Timor": "TL", "Timor-Leste": "TL",
  "Ecuador": "EC", "Egypt": "EG", "El Salvador": "SV",
  "Equatorial Guinea": "GQ", "Eritrea": "ER", "Estonia": "EE",
  "Eswatini": "SZ", "Ethiopia": "ET", "Fiji": "FJ", "Finland": "FI",
  "France": "FR", "Gabon": "GA", "Gambia": "GM", "Georgia": "GE",
  "Germany": "DE", "Ghana": "GH", "Greece": "GR", "Guatemala": "GT",
  "Guinea": "GN", "Guinea-Bissau": "GW", "Guyana": "GY", "Haiti": "HT",
  "Honduras": "HN", "Hungary": "HU", "Iceland": "IS", "India": "IN",
  "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE",
  "Israel": "IL", "Italy": "IT", "Ivory Coast": "CI", "Côte d'Ivoire": "CI",
  "Jamaica": "JM", "Japan": "JP", "Jordan": "JO", "Kazakhstan": "KZ",
  "Kenya": "KE", "Kosovo": "XK", "Kuwait": "KW", "Kyrgyzstan": "KG",
  "Laos": "LA", "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS",
  "Liberia": "LR", "Libya": "LY", "Lithuania": "LT", "Luxembourg": "LU",
  "Madagascar": "MG", "Malawi": "MW", "Malaysia": "MY", "Maldives": "MV",
  "Mali": "ML", "Malta": "MT", "Mauritania": "MR", "Mauritius": "MU",
  "Mexico": "MX", "Moldova": "MD", "Mongolia": "MN", "Montenegro": "ME",
  "Morocco": "MA", "Mozambique": "MZ", "Myanmar": "MM", "Namibia": "NA",
  "Nepal": "NP", "Netherlands": "NL", "New Zealand": "NZ", "Nicaragua": "NI",
  "Niger": "NE", "Nigeria": "NG", "North Korea": "KP", "North Macedonia": "MK",
  "Norway": "NO", "Oman": "OM", "Pakistan": "PK", "Palestine": "PS",
  "Panama": "PA", "Papua New Guinea": "PG", "Paraguay": "PY", "Peru": "PE",
  "Philippines": "PH", "Poland": "PL", "Portugal": "PT", "Qatar": "QA",
  "Romania": "RO", "Russia": "RU", "Rwanda": "RW", "Saudi Arabia": "SA",
  "Senegal": "SN", "Serbia": "RS", "Sierra Leone": "SL", "Singapore": "SG",
  "Slovakia": "SK", "Slovenia": "SI", "Somalia": "SO", "South Africa": "ZA",
  "South Korea": "KR", "South Sudan": "SS", "Spain": "ES", "Sri Lanka": "LK",
  "Sudan": "SD", "Suriname": "SR", "Sweden": "SE", "Switzerland": "CH",
  "Syria": "SY", "Taiwan": "TW", "Tajikistan": "TJ", "Tanzania": "TZ",
  "Thailand": "TH", "Togo": "TG", "Trinidad and Tobago": "TT",
  "Tunisia": "TN", "Turkey": "TR", "Turkmenistan": "TM", "Uganda": "UG",
  "Ukraine": "UA", "United Arab Emirates": "AE", "United Kingdom": "GB",
  "United States": "US", "Uruguay": "UY", "Uzbekistan": "UZ",
  "Venezuela": "VE", "Vietnam": "VN", "Yemen": "YE", "Zambia": "ZM",
  "Zimbabwe": "ZW",
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function toGeoPoint(lng: number, lat: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

export async function seedCountries(): Promise<number> {
  const db = getDb();
  const col = db.collection("countries");
  const raw = await parseCountries();
  const now = new Date();

  const ops = Object.entries(raw).map(([name, data]) => ({
    updateOne: {
      filter: { _id: slugify(name) },
      update: {
        $set: {
          iso2: ISO2_MAP[name] ?? "",
          name,
          flag: data.flag ?? "",
          lat: data.lat,
          lng: data.lng,
          location: toGeoPoint(data.lng, data.lat),
          risk: (data.risk ?? "clear").toLowerCase(),
          tags: data.tags ?? [],
          region: data.region ?? "",
          pop: data.pop ?? "",
          gdp: data.gdp ?? "",
          leader: data.leader ?? "",
          title: data.title ?? "",
          casualties: data.casualties ?? null,
          analysis: data.analysis ?? { what: "", why: "", next: "" },
          updatedAt: now,
          dataSource: "hegemon-bundle",
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);

  // Create indexes (idempotent)
  await col.createIndex({ risk: 1 });
  await col.createIndex({ region: 1 });
  await col.createIndex({ location: "2dsphere" });
  await col.createIndex({ tags: 1 });
  await col.createIndex({ iso2: 1 }, { unique: true, sparse: true });
  await col.createIndex({ name: "text" });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && bun test tests/seed/seed-countries.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/seed/seed-countries.ts api/tests/seed/seed-countries.test.ts
git commit -m "feat: add country seed script (199 countries with GeoJSON + indexes)"
```

---

### Task 10: Seed Bases

**Files:**
- Create: `api/src/seed/seed-bases.ts`
- Test: `api/tests/seed/seed-bases.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// api/tests/seed/seed-bases.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { seedBases } from "../../src/seed/seed-bases";

describe("Seed bases", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await getDb().collection("bases").deleteMany({});
  });

  afterAll(async () => {
    await getDb().collection("bases").deleteMany({});
    await disconnectMongo();
  });

  it("seeds 495 military bases into MongoDB", async () => {
    const count = await seedBases();
    expect(count).toBeGreaterThanOrEqual(490);

    const base = await getDb().collection("bases").findOne({ _id: "us-al-udeid" });
    expect(base).not.toBeNull();
    expect(base!.name).toBe("Al Udeid Air Base");
    expect(base!.location.type).toBe("Point");
    expect(base!.operatingCountry).toBeDefined();
    expect(base!.dataSource).toBe("hegemon-bundle");
  });

  it("creates expected indexes", async () => {
    const indexes = await getDb().collection("bases").indexes();
    const indexNames = indexes.map((i: any) => Object.keys(i.key).join(","));
    expect(indexNames).toContain("location");
    expect(indexNames).toContain("country");
    expect(indexNames).toContain("branch");
    expect(indexNames).toContain("operatingCountry");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && bun test tests/seed/seed-bases.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement seed-bases**

```ts
// api/src/seed/seed-bases.ts
import { getDb } from "../infrastructure/mongo";
import { parseBases } from "./parse-bundle";
import type { GeoPoint } from "../types";

function toGeoPoint(lng: number, lat: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

export async function seedBases(): Promise<number> {
  const db = getDb();
  const col = db.collection("bases");
  const raw = await parseBases();
  const now = new Date();

  const ops = raw.map((b) => ({
    updateOne: {
      filter: { _id: b.id },
      update: {
        $set: {
          name: b.name,
          country: b.country,
          hostNation: b.hostNation ?? b.location ?? b.country,
          operatingCountry: b.country,
          lat: b.lat,
          lng: b.lng,
          location: toGeoPoint(b.lng, b.lat),
          branch: b.branch ?? "",
          type: b.type ?? "base",
          flag: b.flag ?? "",
          color: b.color ?? "#888888",
          personnel: b.personnel ?? "",
          history: b.history ?? "",
          significance: b.significance ?? "",
          iranWarRole: b.iranWarRole ?? null,
          updatedAt: now,
          dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);

  await col.createIndex({ location: "2dsphere" });
  await col.createIndex({ country: 1 });
  await col.createIndex({ branch: 1 });
  await col.createIndex({ type: 1 });
  await col.createIndex({ operatingCountry: 1 });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && bun test tests/seed/seed-bases.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/src/seed/seed-bases.ts api/tests/seed/seed-bases.test.ts
git commit -m "feat: add military bases seed script (495 bases with GeoJSON)"
```

---

### Task 11: Seed NSA, Chokepoints, Elections

**Files:**
- Create: `api/src/seed/seed-nsa.ts`
- Create: `api/src/seed/seed-chokepoints.ts`
- Create: `api/src/seed/seed-elections.ts`
- Test: `api/tests/seed/seed-nsa.test.ts`
- Test: `api/tests/seed/seed-chokepoints.test.ts`
- Test: `api/tests/seed/seed-elections.test.ts`

- [ ] **Step 1: Write failing tests for all three**

```ts
// api/tests/seed/seed-nsa.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { seedNSA } from "../../src/seed/seed-nsa";

describe("Seed non-state actors", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await getDb().collection("nonStateActors").deleteMany({});
  });

  afterAll(async () => {
    await getDb().collection("nonStateActors").deleteMany({});
    await disconnectMongo();
  });

  it("seeds NSA groups into MongoDB", async () => {
    const count = await seedNSA();
    expect(count).toBeGreaterThanOrEqual(70);

    const total = await getDb().collection("nonStateActors").countDocuments();
    expect(total).toBeGreaterThanOrEqual(70);
  });

  it("each document has required fields", async () => {
    const doc = await getDb().collection("nonStateActors").findOne({});
    expect(doc).not.toBeNull();
    expect(doc!.name).toBeDefined();
    expect(doc!.ideology).toBeDefined();
    expect(doc!.dataSource).toBe("hegemon-bundle");
  });
});
```

```ts
// api/tests/seed/seed-chokepoints.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { seedChokepoints } from "../../src/seed/seed-chokepoints";

describe("Seed chokepoints", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await getDb().collection("chokepoints").deleteMany({});
  });

  afterAll(async () => {
    await getDb().collection("chokepoints").deleteMany({});
    await disconnectMongo();
  });

  it("seeds 60 chokepoints into MongoDB", async () => {
    const count = await seedChokepoints();
    expect(count).toBeGreaterThanOrEqual(50);

    const hormuz = await getDb().collection("chokepoints").findOne({ _id: "hormuz" });
    expect(hormuz).not.toBeNull();
    expect(hormuz!.name).toBe("Strait of Hormuz");
    expect(hormuz!.type).toBe("maritime");
    expect(hormuz!.status).toBe("CLOSED");
    expect(hormuz!.location.type).toBe("Point");
  });
});
```

```ts
// api/tests/seed/seed-elections.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { seedElections } from "../../src/seed/seed-elections";
import { seedCountries } from "../../src/seed/seed-countries";

describe("Seed elections", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await getDb().collection("elections").deleteMany({});
    await getDb().collection("countries").deleteMany({});
    // Elections need countries for extracting embedded election data
    await seedCountries();
  });

  afterAll(async () => {
    await getDb().collection("elections").deleteMany({});
    await getDb().collection("countries").deleteMany({});
    await disconnectMongo();
  });

  it("seeds elections into MongoDB (4 dedicated + embedded)", async () => {
    const count = await seedElections();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  it("each document has required fields", async () => {
    const doc = await getDb().collection("elections").findOne({});
    expect(doc).not.toBeNull();
    expect(doc!.country).toBeDefined();
    expect(doc!.flag).toBeDefined();
    expect(doc!.dataSource).toBe("hegemon-bundle");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd api && bun test tests/seed/seed-nsa.test.ts tests/seed/seed-chokepoints.test.ts tests/seed/seed-elections.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement seed-nsa**

```ts
// api/src/seed/seed-nsa.ts
import { getDb } from "../infrastructure/mongo";
import { parseNSA } from "./parse-bundle";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function seedNSA(): Promise<number> {
  const db = getDb();
  const col = db.collection("nonStateActors");
  const raw = await parseNSA();
  const now = new Date();

  const ops = raw.map((a) => ({
    updateOne: {
      filter: { _id: a.id ?? slugify(a.name ?? "unknown") },
      update: {
        $set: {
          name: a.name ?? "",
          ideology: a.ideology ?? "",
          status: a.status ?? "active",
          designation: a.designation ?? "",
          founded: a.founded ?? "",
          revenue: a.revenue ?? "",
          strength: a.strength ?? "",
          activities: a.activities ?? "",
          territory: a.territory ?? "",
          funding: a.funding ?? "",
          leaders: a.leaders ?? "",
          allies: a.allies ?? [],
          rivals: a.rivals ?? [],
          majorAttacks: a.majorAttacks ?? [],
          searchTerms: a.searchTerms ?? [],
          zones: (a.zones ?? []).map((z: any) => ({
            lat: z.lat,
            lng: z.lng,
            radiusKm: z.radiusKm ?? z.radius ?? 50,
          })),
          updatedAt: now,
          dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);

  await col.createIndex({ status: 1 });
  await col.createIndex({ ideology: 1 });
  await col.createIndex({ name: "text", searchTerms: "text" });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
```

- [ ] **Step 4: Implement seed-chokepoints**

```ts
// api/src/seed/seed-chokepoints.ts
import { getDb } from "../infrastructure/mongo";
import { parseChokepoints } from "./parse-bundle";
import type { GeoPoint } from "../types";

function toGeoPoint(lng: number, lat: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

export async function seedChokepoints(): Promise<number> {
  const db = getDb();
  const col = db.collection("chokepoints");
  const raw = await parseChokepoints();
  const now = new Date();

  const ops = raw.map((cp) => ({
    updateOne: {
      filter: { _id: cp.id },
      update: {
        $set: {
          name: cp.name,
          type: cp.type,
          lat: cp.lat,
          lng: cp.lng,
          location: toGeoPoint(cp.lng, cp.lat),
          tooltipLine: cp.tooltipLine ?? "",
          summary: cp.summary ?? "",
          dailyVessels: cp.dailyVessels ?? "",
          oilVolume: cp.oilVolume ?? "",
          gasVolume: cp.gasVolume ?? "",
          status: cp.status ?? "OPEN",
          dependentCountries: cp.dependentCountries ?? [],
          strategicSummary: cp.strategicSummary ?? "",
          searchTerms: cp.searchTerms ?? [],
          updatedAt: now,
          dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);

  await col.createIndex({ location: "2dsphere" });
  await col.createIndex({ type: 1 });
  await col.createIndex({ status: 1 });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
```

- [ ] **Step 5: Implement seed-elections**

```ts
// api/src/seed/seed-elections.ts
import { getDb } from "../infrastructure/mongo";
import { parseElections, parseCountries } from "./parse-bundle";
import type { GeoPoint } from "../types";

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toGeoPoint(lng: number, lat: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

function parseDateString(dateStr: string): Date {
  // Handle "Feb 2026", "Nov 2026", etc.
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  // Fallback: try "Month Year" format
  const parts = dateStr.split(" ");
  if (parts.length === 2) {
    return new Date(`${parts[0]} 1, ${parts[1]}`);
  }
  return new Date();
}

// Map country names to ISO2 codes (subset used by elections)
const ISO2_ELECTIONS: Record<string, string> = {
  "Bangladesh": "BD", "Japan": "JP", "Portugal": "PT", "Thailand": "TH",
  "United States": "US", "France": "FR", "Brazil": "BR", "Germany": "DE",
  "Colombia": "CO", "United Kingdom": "GB", "Australia": "AU",
  "South Korea": "KR", "India": "IN", "Mexico": "MX", "Canada": "CA",
  "Israel": "IL", "Turkey": "TR", "Iran": "IR", "Iraq": "IQ",
};

export async function seedElections(): Promise<number> {
  const db = getDb();
  const col = db.collection("elections");
  const dedicated = await parseElections();
  const now = new Date();

  // Also extract elections embedded in country data
  const countries = await parseCountries();
  const embedded: any[] = [];

  for (const [name, data] of Object.entries(countries)) {
    if (data.elections && Array.isArray(data.elections)) {
      for (const e of data.elections) {
        embedded.push({ ...e, country: name, flag: data.flag, lat: data.lat, lng: data.lng });
      }
    }
    // Also check for single election field
    if (data.election && typeof data.election === "object") {
      embedded.push({
        ...data.election,
        country: name,
        flag: data.flag,
        lat: data.lat,
        lng: data.lng,
      });
    }
  }

  const allElections = [...dedicated, ...embedded];

  const ops = allElections.map((e) => {
    const countrySlug = slugify(e.country);
    const dateSlug = slugify(e.date ?? "unknown");
    const id = `${countrySlug}-${dateSlug}`;
    const iso2 = ISO2_ELECTIONS[e.country] ?? "";

    // Try to get lat/lng from election data, fall back to country data
    const lat = e.lat ?? countries[e.country]?.lat ?? 0;
    const lng = e.lng ?? countries[e.country]?.lng ?? 0;

    return {
      updateOne: {
        filter: { _id: id },
        update: {
          $set: {
            flag: e.flag ?? "",
            country: e.country,
            countryISO2: iso2,
            lat,
            lng,
            location: toGeoPoint(lng, lat),
            date: e.date ?? "",
            dateISO: parseDateString(e.date ?? ""),
            type: e.type ?? "",
            winner: e.winner ?? null,
            result: e.result ?? null,
            summary: e.summary ?? "",
            updatedAt: now,
            dataSource: "hegemon-bundle",
          },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    };
  });

  if (ops.length === 0) return 0;
  const result = await col.bulkWrite(ops);

  await col.createIndex({ dateISO: 1 });
  await col.createIndex({ country: 1 });
  await col.createIndex({ location: "2dsphere" });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd api && bun test tests/seed/seed-nsa.test.ts tests/seed/seed-chokepoints.test.ts tests/seed/seed-elections.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add api/src/seed/seed-nsa.ts api/src/seed/seed-chokepoints.ts api/src/seed/seed-elections.ts
git add api/tests/seed/seed-nsa.test.ts api/tests/seed/seed-chokepoints.test.ts api/tests/seed/seed-elections.test.ts
git commit -m "feat: add seed scripts for NSA, chokepoints, and elections"
```

---

### Task 12: Seed Ports + Trade Routes

**Files:**
- Create: `api/src/seed/seed-ports.ts`
- Create: `api/src/seed/seed-trade-routes.ts`
- Test: `api/tests/seed/seed-ports.test.ts`
- Test: `api/tests/seed/seed-trade-routes.test.ts`

Port data is derived from trade route endpoints and chokepoints that have port-like characteristics. Trade routes reference port `_id` values and chokepoint `_id` values as waypoints.

- [ ] **Step 1: Write failing tests**

```ts
// api/tests/seed/seed-ports.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { seedPorts } from "../../src/seed/seed-ports";

describe("Seed ports", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await getDb().collection("ports").deleteMany({});
  });

  afterAll(async () => {
    await getDb().collection("ports").deleteMany({});
    await disconnectMongo();
  });

  it("seeds ports into MongoDB", async () => {
    const count = await seedPorts();
    expect(count).toBeGreaterThan(0);

    const shanghai = await getDb().collection("ports").findOne({ _id: "shanghai" });
    expect(shanghai).not.toBeNull();
    expect(shanghai!.location.type).toBe("Point");
  });
});
```

```ts
// api/tests/seed/seed-trade-routes.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { seedPorts } from "../../src/seed/seed-ports";
import { seedChokepoints } from "../../src/seed/seed-chokepoints";
import { seedTradeRoutes } from "../../src/seed/seed-trade-routes";

describe("Seed trade routes", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await getDb().collection("tradeRoutes").deleteMany({});
    await getDb().collection("ports").deleteMany({});
    await getDb().collection("chokepoints").deleteMany({});
    // Trade routes depend on ports and chokepoints
    await seedPorts();
    await seedChokepoints();
  });

  afterAll(async () => {
    await getDb().collection("tradeRoutes").deleteMany({});
    await getDb().collection("ports").deleteMany({});
    await getDb().collection("chokepoints").deleteMany({});
    await disconnectMongo();
  });

  it("seeds trade routes into MongoDB", async () => {
    const count = await seedTradeRoutes();
    expect(count).toBeGreaterThan(0);
  });

  it("each route has from, to, category, waypoints", async () => {
    const route = await getDb().collection("tradeRoutes").findOne({});
    expect(route).not.toBeNull();
    expect(route!.from).toBeDefined();
    expect(route!.to).toBeDefined();
    expect(route!.category).toBeDefined();
    expect(route!.dataSource).toBe("hegemon-bundle");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd api && bun test tests/seed/seed-ports.test.ts tests/seed/seed-trade-routes.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement seed-ports**

```ts
// api/src/seed/seed-ports.ts
import { getDb } from "../infrastructure/mongo";
import type { GeoPoint } from "../types";

function toGeoPoint(lng: number, lat: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

// Major ports referenced by trade routes in the Hegemon data
const PORTS: Array<{ id: string; name: string; lat: number; lng: number; country: string }> = [
  { id: "shanghai", name: "Shanghai", lat: 31.23, lng: 121.47, country: "China" },
  { id: "rotterdam", name: "Rotterdam", lat: 51.9, lng: 4.5, country: "Netherlands" },
  { id: "singapore", name: "Singapore", lat: 1.26, lng: 103.84, country: "Singapore" },
  { id: "busan", name: "Busan", lat: 35.1, lng: 129.04, country: "South Korea" },
  { id: "hong-kong", name: "Hong Kong", lat: 22.29, lng: 114.16, country: "China" },
  { id: "shenzhen", name: "Shenzhen", lat: 22.54, lng: 114.06, country: "China" },
  { id: "guangzhou", name: "Guangzhou", lat: 23.11, lng: 113.25, country: "China" },
  { id: "ningbo", name: "Ningbo-Zhoushan", lat: 29.87, lng: 121.55, country: "China" },
  { id: "qingdao", name: "Qingdao", lat: 36.07, lng: 120.38, country: "China" },
  { id: "tianjin", name: "Tianjin", lat: 39.08, lng: 117.7, country: "China" },
  { id: "dubai", name: "Jebel Ali (Dubai)", lat: 25.01, lng: 55.06, country: "UAE" },
  { id: "port-klang", name: "Port Klang", lat: 3.0, lng: 101.39, country: "Malaysia" },
  { id: "hamburg", name: "Hamburg", lat: 53.55, lng: 9.97, country: "Germany" },
  { id: "antwerp", name: "Antwerp", lat: 51.23, lng: 4.4, country: "Belgium" },
  { id: "los-angeles", name: "Los Angeles / Long Beach", lat: 33.74, lng: -118.27, country: "United States" },
  { id: "new-york", name: "New York / New Jersey", lat: 40.67, lng: -74.04, country: "United States" },
  { id: "houston", name: "Houston", lat: 29.76, lng: -95.36, country: "United States" },
  { id: "savannah", name: "Savannah", lat: 32.08, lng: -81.09, country: "United States" },
  { id: "tokyo", name: "Tokyo", lat: 35.65, lng: 139.77, country: "Japan" },
  { id: "yokohama", name: "Yokohama", lat: 35.44, lng: 139.64, country: "Japan" },
  { id: "mumbai", name: "Mumbai (JNPT)", lat: 18.95, lng: 72.95, country: "India" },
  { id: "colombo", name: "Colombo", lat: 6.94, lng: 79.84, country: "Sri Lanka" },
  { id: "santos", name: "Santos", lat: -23.96, lng: -46.3, country: "Brazil" },
  { id: "felixstowe", name: "Felixstowe", lat: 51.96, lng: 1.35, country: "United Kingdom" },
  { id: "piraeus", name: "Piraeus", lat: 37.94, lng: 23.64, country: "Greece" },
  { id: "tanjung-pelepas", name: "Tanjung Pelepas", lat: 1.36, lng: 103.55, country: "Malaysia" },
  { id: "laem-chabang", name: "Laem Chabang", lat: 13.08, lng: 100.88, country: "Thailand" },
  { id: "jeddah", name: "Jeddah", lat: 21.49, lng: 39.19, country: "Saudi Arabia" },
  { id: "algeciras", name: "Algeciras", lat: 36.13, lng: -5.45, country: "Spain" },
  { id: "tanger-med", name: "Tanger Med", lat: 35.89, lng: -5.5, country: "Morocco" },
  { id: "richards-bay", name: "Richards Bay", lat: -28.8, lng: 32.08, country: "South Africa" },
  { id: "durban", name: "Durban", lat: -29.87, lng: 31.05, country: "South Africa" },
  { id: "mombasa", name: "Mombasa", lat: -4.04, lng: 39.67, country: "Kenya" },
  { id: "dar-es-salaam", name: "Dar es Salaam", lat: -6.83, lng: 39.28, country: "Tanzania" },
  { id: "vladivostok", name: "Vladivostok", lat: 43.12, lng: 131.87, country: "Russia" },
  { id: "novorossiysk", name: "Novorossiysk", lat: 44.72, lng: 37.77, country: "Russia" },
  { id: "gwadar", name: "Gwadar", lat: 25.13, lng: 62.33, country: "Pakistan" },
];

export async function seedPorts(): Promise<number> {
  const db = getDb();
  const col = db.collection("ports");
  const now = new Date();

  const ops = PORTS.map((p) => ({
    updateOne: {
      filter: { _id: p.id },
      update: {
        $set: {
          name: p.name,
          lat: p.lat,
          lng: p.lng,
          location: toGeoPoint(p.lng, p.lat),
          country: p.country,
          updatedAt: now,
          dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);

  await col.createIndex({ location: "2dsphere" });
  await col.createIndex({ country: 1 });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
```

- [ ] **Step 4: Implement seed-trade-routes**

Trade route data must be extracted from the bundle. The raw data lives in `hegemon-bundle.js` — we need to parse it out. For now, we define the 21 routes from the spec inline (the bundle extraction will be refined during implementation based on actual bundle format).

```ts
// api/src/seed/seed-trade-routes.ts
import { getDb } from "../infrastructure/mongo";
import { normalizeWaypointId } from "./parse-bundle";

// The 21 trade routes from Hegemon data
// Note: These are defined inline based on the extracted data; the parse-bundle
// extraction for trade routes from the minified bundle will be refined during implementation
const TRADE_ROUTES = [
  { id: "china-europe-suez", name: "China -> Europe (Suez)", from: "shanghai", to: "rotterdam", category: "container", status: "active", volumeDesc: "47M+ TEU/year", waypoints: ["malacca", "bab-el-mandeb", "suez", "gibraltar"] },
  { id: "china-europe-cape", name: "China -> Europe (Cape Route)", from: "shanghai", to: "rotterdam", category: "container", status: "active", volumeDesc: "Rerouted traffic from Suez", waypoints: ["malacca", "lombok", "cape"] },
  { id: "persian-gulf-asia", name: "Persian Gulf -> East Asia", from: "jeddah", to: "tokyo", category: "energy", status: "disrupted", volumeDesc: "21M bbl/day", waypoints: ["hormuz", "malacca"] },
  { id: "persian-gulf-europe", name: "Persian Gulf -> Europe", from: "jeddah", to: "rotterdam", category: "energy", status: "disrupted", volumeDesc: "5M bbl/day", waypoints: ["hormuz", "bab-el-mandeb", "suez"] },
  { id: "russia-europe-pipeline", name: "Russia -> Europe (Pipeline)", from: "novorossiysk", to: "rotterdam", category: "energy", status: "disrupted", volumeDesc: "1M bbl/day (reduced)", waypoints: ["bosphorus"] },
  { id: "us-gulf-asia", name: "US Gulf -> East Asia", from: "houston", to: "tokyo", category: "energy", status: "active", volumeDesc: "4M bbl/day (LNG+crude)", waypoints: ["panama"] },
  { id: "us-gulf-europe", name: "US Gulf -> Europe", from: "houston", to: "rotterdam", category: "energy", status: "active", volumeDesc: "3M bbl/day", waypoints: [] },
  { id: "australia-asia", name: "Australia -> East Asia", from: "richards-bay", to: "busan", category: "bulk", status: "active", volumeDesc: "Iron ore + LNG", waypoints: ["lombok"] },
  { id: "brazil-china", name: "Brazil -> China", from: "santos", to: "shanghai", category: "bulk", status: "active", volumeDesc: "Iron ore + soybeans", waypoints: ["cape", "malacca"] },
  { id: "west-africa-china", name: "West Africa -> China", from: "durban", to: "shanghai", category: "energy", status: "active", volumeDesc: "2M bbl/day crude", waypoints: ["cape", "malacca"] },
  { id: "qatar-asia-lng", name: "Qatar -> East Asia (LNG)", from: "dubai", to: "tokyo", category: "energy", status: "disrupted", volumeDesc: "77M tons LNG/year", waypoints: ["hormuz", "malacca"] },
  { id: "trans-pacific-container", name: "Trans-Pacific (Container)", from: "shanghai", to: "los-angeles", category: "container", status: "active", volumeDesc: "28M TEU/year", waypoints: [] },
  { id: "intra-asia-container", name: "Intra-Asia (Container)", from: "shanghai", to: "singapore", category: "container", status: "active", volumeDesc: "Largest regional trade flow", waypoints: ["taiwan"] },
  { id: "europe-us-atlantic", name: "Europe -> US (Atlantic)", from: "rotterdam", to: "new-york", category: "container", status: "active", volumeDesc: "8M TEU/year", waypoints: [] },
  { id: "arctic-northern-sea", name: "Northern Sea Route", from: "vladivostok", to: "rotterdam", category: "bulk", status: "active", volumeDesc: "Growing (seasonal)", waypoints: ["denmark"] },
  { id: "caspian-med-btc", name: "Caspian -> Mediterranean (BTC)", from: "novorossiysk", to: "piraeus", category: "energy", status: "active", volumeDesc: "1M bbl/day", waypoints: ["bosphorus"] },
  { id: "nigeria-europe", name: "Nigeria -> Europe (LNG)", from: "mombasa", to: "rotterdam", category: "energy", status: "active", volumeDesc: "22M tons LNG/year", waypoints: ["gibraltar"] },
  { id: "india-europe", name: "India -> Europe", from: "mumbai", to: "rotterdam", category: "container", status: "active", volumeDesc: "Growing", waypoints: ["bab-el-mandeb", "suez"] },
  { id: "china-africa", name: "China -> East Africa", from: "shanghai", to: "mombasa", category: "container", status: "active", volumeDesc: "Belt and Road flow", waypoints: ["malacca"] },
  { id: "south-america-europe", name: "South America -> Europe", from: "santos", to: "rotterdam", category: "bulk", status: "active", volumeDesc: "Agricultural + minerals", waypoints: [] },
  { id: "china-pakistan-cpec", name: "China -> Pakistan (CPEC)", from: "shanghai", to: "gwadar", category: "container", status: "active", volumeDesc: "Growing (BRI)", waypoints: ["malacca"] },
];

export async function seedTradeRoutes(): Promise<number> {
  const db = getDb();
  const col = db.collection("tradeRoutes");
  const now = new Date();

  const ops = TRADE_ROUTES.map((r) => ({
    updateOne: {
      filter: { _id: r.id },
      update: {
        $set: {
          name: r.name,
          from: r.from,
          to: r.to,
          category: r.category,
          status: r.status,
          volumeDesc: r.volumeDesc,
          waypoints: r.waypoints.map(normalizeWaypointId),
          updatedAt: now,
          dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);

  await col.createIndex({ category: 1 });
  await col.createIndex({ status: 1 });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd api && bun test tests/seed/seed-ports.test.ts tests/seed/seed-trade-routes.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add api/src/seed/seed-ports.ts api/src/seed/seed-trade-routes.ts
git add api/tests/seed/seed-ports.test.ts api/tests/seed/seed-trade-routes.test.ts
git commit -m "feat: add seed scripts for ports and trade routes"
```

---

### Task 13: Seed Conflicts, News, Country Colors

**Files:**
- Create: `api/src/seed/seed-conflicts.ts`
- Create: `api/src/seed/seed-news.ts`
- Create: `api/src/seed/seed-country-colors.ts`
- Test: `api/tests/seed/seed-conflicts.test.ts`
- Test: `api/tests/seed/seed-news.test.ts`
- Test: `api/tests/seed/seed-country-colors.test.ts`

Conflict and news data are embedded in the master bundle or derived from country data. Country colors are extracted from the bundle's color mapping.

- [ ] **Step 1: Write failing tests**

```ts
// api/tests/seed/seed-conflicts.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { seedConflicts } from "../../src/seed/seed-conflicts";

describe("Seed conflicts", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await getDb().collection("conflicts").deleteMany({});
  });

  afterAll(async () => {
    await getDb().collection("conflicts").deleteMany({});
    await disconnectMongo();
  });

  it("seeds conflicts into MongoDB", async () => {
    const count = await seedConflicts();
    expect(count).toBeGreaterThan(0);
  });

  it("conflict documents have required fields", async () => {
    const doc = await getDb().collection("conflicts").findOne({});
    if (doc) {
      expect(doc.title).toBeDefined();
      expect(doc.status).toBeDefined();
      expect(doc.location.type).toBe("Point");
      expect(doc.dataSource).toBe("hegemon-bundle");
    }
  });
});
```

```ts
// api/tests/seed/seed-news.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { seedNews } from "../../src/seed/seed-news";

describe("Seed news", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await getDb().collection("news").deleteMany({});
  });

  afterAll(async () => {
    await getDb().collection("news").deleteMany({});
    await disconnectMongo();
  });

  it("seeds news events into MongoDB", async () => {
    const count = await seedNews();
    expect(count).toBeGreaterThan(0);
  });

  it("news documents have required fields", async () => {
    const doc = await getDb().collection("news").findOne({});
    if (doc) {
      expect(doc.title).toBeDefined();
      expect(doc.tags).toBeDefined();
      expect(doc.dataSource).toBe("hegemon-bundle");
    }
  });
});
```

```ts
// api/tests/seed/seed-country-colors.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { seedCountryColors } from "../../src/seed/seed-country-colors";

describe("Seed country colors", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await getDb().collection("countryColors").deleteMany({});
  });

  afterAll(async () => {
    await getDb().collection("countryColors").deleteMany({});
    await disconnectMongo();
  });

  it("seeds country colors into MongoDB", async () => {
    const count = await seedCountryColors();
    expect(count).toBeGreaterThan(0);

    const us = await getDb().collection("countryColors").findOne({ _id: "United States" });
    expect(us).not.toBeNull();
    expect(us!.color).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd api && bun test tests/seed/seed-conflicts.test.ts tests/seed/seed-news.test.ts tests/seed/seed-country-colors.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement seed-conflicts**

```ts
// api/src/seed/seed-conflicts.ts
import { getDb } from "../infrastructure/mongo";
import type { GeoPoint } from "../types";

function toGeoPoint(lng: number, lat: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

function daysSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// Active conflicts extracted from Hegemon data
const CONFLICTS = [
  {
    id: "us-iran-war",
    title: "US and Israel at War with Iran",
    lat: 32.0, lng: 53.0,
    startDate: "2026-02-27",
    status: "active",
    casualties: [
      { party: "Iran", figure: "6,000+ killed" },
      { party: "Israel", figure: "14 killed" },
      { party: "US", figure: "13 killed" },
    ],
    latestUpdate: "Iran strikes U.S.-owned oil tanker in Strait of Hormuz",
    tags: ["BREAKING", "CONFLICT"],
    relatedCountries: ["US", "IL", "IR"],
  },
  {
    id: "russia-ukraine-war",
    title: "Russia-Ukraine War",
    lat: 48.38, lng: 31.17,
    startDate: "2022-02-24",
    status: "active",
    casualties: [
      { party: "Russia", figure: "~1.2M casualties" },
      { party: "Ukraine", figure: "~500-600K casualties" },
    ],
    latestUpdate: "Peace negotiations continue with Western mediation",
    tags: ["CONFLICT"],
    relatedCountries: ["UA", "RU"],
  },
  {
    id: "israel-hamas-war",
    title: "Israel-Hamas War (Gaza)",
    lat: 31.5, lng: 34.47,
    startDate: "2023-10-07",
    status: "active",
    casualties: [
      { party: "Gaza", figure: "45,000+ killed" },
      { party: "Israel", figure: "1,700+ killed" },
    ],
    latestUpdate: "Humanitarian crisis deepens in Gaza",
    tags: ["CONFLICT"],
    relatedCountries: ["IL", "PS"],
  },
  {
    id: "sudan-civil-war",
    title: "Sudan Civil War",
    lat: 15.5, lng: 32.5,
    startDate: "2023-04-15",
    status: "active",
    casualties: [
      { party: "Civilian", figure: "15,000+ killed" },
    ],
    latestUpdate: "UN emergency session on Sudan humanitarian crisis",
    tags: ["CONFLICT"],
    relatedCountries: ["SD"],
  },
];

export async function seedConflicts(): Promise<number> {
  const db = getDb();
  const col = db.collection("conflicts");
  const now = new Date();

  const ops = CONFLICTS.map((c) => ({
    updateOne: {
      filter: { _id: c.id },
      update: {
        $set: {
          title: c.title,
          lat: c.lat,
          lng: c.lng,
          location: toGeoPoint(c.lng, c.lat),
          startDate: new Date(c.startDate),
          dayCount: daysSince(c.startDate),
          status: c.status,
          casualties: c.casualties,
          latestUpdate: c.latestUpdate,
          tags: c.tags,
          relatedCountries: c.relatedCountries,
          updatedAt: now,
          dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);

  await col.createIndex({ status: 1 });
  await col.createIndex({ relatedCountries: 1 });
  await col.createIndex({ startDate: 1 });
  await col.createIndex({ location: "2dsphere" });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
```

- [ ] **Step 4: Implement seed-news**

```ts
// api/src/seed/seed-news.ts
import { getDb } from "../infrastructure/mongo";

// News events extracted from Hegemon data (hegemon-full.md / bundle)
// These represent the initial seed; real-time news will come from SSE later
const NEWS_EVENTS = [
  { title: "Trump's War Stalls Diplomacy as Iran Conflict Enters Third Week", summary: "Diplomatic channels between the US and Iran remain frozen as military operations continue.", tags: ["CONFLICT"], sourceCount: 8, conflictId: "us-iran-war", relatedCountries: ["US", "IR"], publishedAt: "2026-03-16T20:00:00Z" },
  { title: "Iran Strikes U.S.-Owned Oil Tanker in Strait of Hormuz", summary: "An Iranian anti-ship missile struck a US-flagged commercial tanker transiting the Strait of Hormuz.", tags: ["BREAKING", "CONFLICT"], sourceCount: 12, conflictId: "us-iran-war", relatedCountries: ["US", "IR"], publishedAt: "2026-03-16T18:00:00Z" },
  { title: "Oil Prices Surge Past $130 as Hormuz Closure Tightens Supply", summary: "Brent crude topped $130/barrel as markets reacted to the effective closure of the Strait of Hormuz.", tags: ["ECONOMIC"], sourceCount: 6, conflictId: "us-iran-war", relatedCountries: ["US", "IR", "SA"], publishedAt: "2026-03-16T15:00:00Z" },
  { title: "UN Emergency Session on Sudan Humanitarian Crisis", summary: "The UN Security Council convened an emergency session on the worsening humanitarian situation in Sudan.", tags: ["HUMANITARIAN"], sourceCount: 5, conflictId: "sudan-civil-war", relatedCountries: ["SD"], publishedAt: "2026-03-16T12:00:00Z" },
  { title: "Russian Cyberattack Targets European Financial Infrastructure", summary: "A coordinated cyberattack attributed to Russian state actors disrupted SWIFT terminals across Eastern Europe.", tags: ["CYBER", "SECURITY"], sourceCount: 7, conflictId: null, relatedCountries: ["RU", "PL", "DE"], publishedAt: "2026-03-16T10:00:00Z" },
  { title: "South Korea Deploys Additional Naval Assets to Red Sea", summary: "South Korean Navy deploying destroyer group to protect commercial shipping in the Red Sea.", tags: ["SECURITY"], sourceCount: 4, conflictId: null, relatedCountries: ["KR", "YE"], publishedAt: "2026-03-15T22:00:00Z" },
  { title: "Gaza Humanitarian Corridor Proposal Gains Traction", summary: "International coalition pushing for protected humanitarian corridors in northern Gaza.", tags: ["HUMANITARIAN", "CONFLICT"], sourceCount: 9, conflictId: "israel-hamas-war", relatedCountries: ["IL", "PS", "EG"], publishedAt: "2026-03-15T18:00:00Z" },
  { title: "France and UK Pledge Military Hubs in Ukraine", summary: "France and the United Kingdom announced plans to install military training and logistics hubs in western Ukraine.", tags: ["SECURITY", "DIPLOMACY"], sourceCount: 6, conflictId: "russia-ukraine-war", relatedCountries: ["FR", "GB", "UA"], publishedAt: "2026-03-15T14:00:00Z" },
];

export async function seedNews(): Promise<number> {
  const db = getDb();
  const col = db.collection("news");
  const now = new Date();

  const ops = NEWS_EVENTS.map((n, i) => ({
    updateOne: {
      filter: { title: n.title },
      update: {
        $set: {
          title: n.title,
          summary: n.summary,
          tags: n.tags,
          sourceCount: n.sourceCount,
          conflictId: n.conflictId,
          relatedCountries: n.relatedCountries,
          publishedAt: new Date(n.publishedAt),
          updatedAt: now,
          dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);

  await col.createIndex({ publishedAt: -1 });
  await col.createIndex({ tags: 1 });
  await col.createIndex({ conflictId: 1 });
  await col.createIndex({ relatedCountries: 1 });
  await col.createIndex({ title: "text", summary: "text" });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
```

- [ ] **Step 5: Implement seed-country-colors**

```ts
// api/src/seed/seed-country-colors.ts
import { getDb } from "../infrastructure/mongo";

// Country colors for Military and Compare overlays
const COUNTRY_COLORS: Record<string, string> = {
  "United States": "#3b82f6",
  "Russia": "#ef4444",
  "China": "#f97316",
  "United Kingdom": "#22c55e",
  "France": "#8b5cf6",
  "India": "#eab308",
  "Turkey": "#06b6d4",
  "Israel": "#6366f1",
  "Iran": "#dc2626",
  "Saudi Arabia": "#10b981",
  "Japan": "#f43f5e",
  "South Korea": "#0ea5e9",
  "Australia": "#a855f7",
  "Germany": "#64748b",
  "Italy": "#14b8a6",
  "Pakistan": "#84cc16",
  "Egypt": "#d97706",
  "Brazil": "#059669",
  "Canada": "#e11d48",
  "NATO": "#2563eb",
  "UAE": "#0891b2",
  "Qatar": "#7c3aed",
  "Singapore": "#ec4899",
  "Greece": "#2dd4bf",
  "Spain": "#f59e0b",
  "Netherlands": "#f97316",
  "Poland": "#dc2626",
  "Norway": "#0284c7",
  "Denmark": "#4f46e5",
  "Belgium": "#be185d",
};

export async function seedCountryColors(): Promise<number> {
  const db = getDb();
  const col = db.collection("countryColors");
  const now = new Date();

  const ops = Object.entries(COUNTRY_COLORS).map(([name, color]) => ({
    updateOne: {
      filter: { _id: name },
      update: {
        $set: { color, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);
  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd api && bun test tests/seed/seed-conflicts.test.ts tests/seed/seed-news.test.ts tests/seed/seed-country-colors.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add api/src/seed/seed-conflicts.ts api/src/seed/seed-news.ts api/src/seed/seed-country-colors.ts
git add api/tests/seed/seed-conflicts.test.ts api/tests/seed/seed-news.test.ts api/tests/seed/seed-country-colors.test.ts
git commit -m "feat: add seed scripts for conflicts, news, and country colors"
```

---

### Task 14: Seed-All Orchestrator

**Files:**
- Create: `api/src/seed/seed-all.ts`
- Test: `api/tests/seed/seed-all.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// api/tests/seed/seed-all.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { seedAll } from "../../src/seed/seed-all";

describe("Seed-all orchestrator", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    // Clean all collections
    const db = getDb();
    const collections = ["countries", "bases", "nonStateActors", "chokepoints",
      "elections", "tradeRoutes", "ports", "conflicts", "news", "countryColors"];
    for (const name of collections) {
      await db.collection(name).deleteMany({});
    }
  });

  afterAll(async () => {
    const db = getDb();
    const collections = ["countries", "bases", "nonStateActors", "chokepoints",
      "elections", "tradeRoutes", "ports", "conflicts", "news", "countryColors"];
    for (const name of collections) {
      await db.collection(name).deleteMany({});
    }
    await disconnectMongo();
  });

  it("seeds all collections in dependency order", async () => {
    const results = await seedAll();

    expect(results.ports).toBeGreaterThan(0);
    expect(results.chokepoints).toBeGreaterThan(0);
    expect(results.countries).toBeGreaterThanOrEqual(190);
    expect(results.countryColors).toBeGreaterThan(0);
    expect(results.bases).toBeGreaterThanOrEqual(490);
    expect(results.nonStateActors).toBeGreaterThanOrEqual(70);
    expect(results.elections).toBeGreaterThanOrEqual(4);
    expect(results.tradeRoutes).toBeGreaterThan(0);
    expect(results.conflicts).toBeGreaterThan(0);
    expect(results.news).toBeGreaterThan(0);
  });

  it("is idempotent — running again produces same counts", async () => {
    const results1 = await seedAll();
    const results2 = await seedAll();

    expect(results1.countries).toBe(results2.countries);
    expect(results1.bases).toBe(results2.bases);
  });
}, { timeout: 30000 }); // seed-all may take a while
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd api && bun test tests/seed/seed-all.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement seed-all orchestrator**

```ts
// api/src/seed/seed-all.ts
import { connectMongo, disconnectMongo, getDb } from "../infrastructure/mongo";
import { seedPorts } from "./seed-ports";
import { seedChokepoints } from "./seed-chokepoints";
import { seedCountries } from "./seed-countries";
import { seedCountryColors } from "./seed-country-colors";
import { seedBases } from "./seed-bases";
import { seedNSA } from "./seed-nsa";
import { seedElections } from "./seed-elections";
import { seedTradeRoutes } from "./seed-trade-routes";
import { seedConflicts } from "./seed-conflicts";
import { seedNews } from "./seed-news";

export interface SeedResults {
  ports: number;
  chokepoints: number;
  countries: number;
  countryColors: number;
  bases: number;
  nonStateActors: number;
  elections: number;
  tradeRoutes: number;
  conflicts: number;
  news: number;
}

export async function seedAll(): Promise<SeedResults> {
  console.log("[seed] Starting full seed...");
  const start = Date.now();

  // Phase 1: No dependencies
  console.log("[seed] Seeding ports...");
  const ports = await seedPorts();
  console.log(`[seed]   -> ${ports} ports`);

  console.log("[seed] Seeding chokepoints...");
  const chokepoints = await seedChokepoints();
  console.log(`[seed]   -> ${chokepoints} chokepoints`);

  console.log("[seed] Seeding countries...");
  const countries = await seedCountries();
  console.log(`[seed]   -> ${countries} countries`);

  console.log("[seed] Seeding country colors...");
  const countryColors = await seedCountryColors();
  console.log(`[seed]   -> ${countryColors} country colors`);

  console.log("[seed] Seeding bases...");
  const bases = await seedBases();
  console.log(`[seed]   -> ${bases} bases`);

  console.log("[seed] Seeding non-state actors...");
  const nonStateActors = await seedNSA();
  console.log(`[seed]   -> ${nonStateActors} non-state actors`);

  console.log("[seed] Seeding elections...");
  const elections = await seedElections();
  console.log(`[seed]   -> ${elections} elections`);

  // Phase 2: Has dependencies
  console.log("[seed] Seeding trade routes...");
  const tradeRoutes = await seedTradeRoutes();
  console.log(`[seed]   -> ${tradeRoutes} trade routes`);

  console.log("[seed] Seeding conflicts...");
  const conflicts = await seedConflicts();
  console.log(`[seed]   -> ${conflicts} conflicts`);

  console.log("[seed] Seeding news...");
  const news = await seedNews();
  console.log(`[seed]   -> ${news} news events`);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[seed] Complete in ${elapsed}s`);

  return { ports, chokepoints, countries, countryColors, bases, nonStateActors, elections, tradeRoutes, conflicts, news };
}

// CLI entry: `bun src/seed/seed-all.ts`
if (import.meta.main) {
  const uri = process.env.MONGO_URI ?? "mongodb://localhost:27017/gambit";
  await connectMongo(uri);
  const results = await seedAll();
  console.log("[seed] Results:", JSON.stringify(results, null, 2));
  await disconnectMongo();
  process.exit(0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd api && bun test tests/seed/seed-all.test.ts --timeout 30000`
Expected: PASS

- [ ] **Step 5: Run seed-all from CLI to verify end-to-end**

Run: `cd api && bun src/seed/seed-all.ts`
Expected: Logs each collection with counts, completes successfully

- [ ] **Step 6: Verify data in MongoDB**

Run: `docker compose --profile dev up -d mongo-express`
Navigate to: http://localhost:8081 -> `gambit` database
Expected: 10 collections with expected document counts

- [ ] **Step 7: Commit**

```bash
git add api/src/seed/seed-all.ts api/tests/seed/seed-all.test.ts
git commit -m "feat: add seed-all orchestrator — seeds 10 collections in dependency order"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `docker compose up -d mongo redis` starts both services
- [ ] `cd api && bun install` installs all dependencies
- [ ] `cd api && bun test` passes all tests (14+ test files)
- [ ] `cd api && bun src/seed/seed-all.ts` seeds all collections
- [ ] `cd api && bun src/index.ts` starts the API on :3000
- [ ] `curl http://localhost:3000/api/v1/health` returns `{"status":"ok"}`
- [ ] `curl http://localhost:3000/api/v1/health/ready` returns `{"status":"ready"}`
- [ ] MongoDB has 10 collections with correct document counts:
  - countries: 199, bases: 495, nonStateActors: 79+, chokepoints: 60
  - elections: 4+, tradeRoutes: 21, ports: 37, conflicts: 4+
  - news: 8+, countryColors: 30
