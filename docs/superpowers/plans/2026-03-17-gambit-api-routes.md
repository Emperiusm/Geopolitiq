# Gambit API Routes + Middleware — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all REST API endpoints for the Gambit platform — reference data (countries, bases, NSA, chokepoints, elections, trade routes, ports, conflicts), aggregation (bootstrap, viewport, search, compare), realtime (news, SSE), binary layer endpoints, and all middleware (auth, rate limiting, compression, logging).

**Architecture:** Hono module-based routing. Each domain gets a `router.ts` in its module directory. Middleware chain: request-id -> CORS -> compression -> api-key -> rate-limit -> cache-headers -> route handler. Cache-aside pattern for all read endpoints. SSE via Redis pub/sub.

**Tech Stack:** Bun 1.x, Hono 4.x, MongoDB 7, Redis 7 (ioredis), `bun:test`

**Spec:** [docs/superpowers/specs/2026-03-17-hegemon-data-platform-design.md](../specs/2026-03-17-hegemon-data-platform-design.md)

**Depends On:** [Plan 1: Backend Infrastructure + Data Pipeline](2026-03-17-gambit-backend-infra-pipeline.md) (must be completed first)

**Related Plans:**
- Plan 1: [Backend Infrastructure + Data Pipeline](2026-03-17-gambit-backend-infra-pipeline.md) (Phases 1-2)
- Plan 3: [Frontend Shell, Layers & Performance](2026-03-17-gambit-frontend.md) (Phases 4-6)

---

## File Structure

### New Files to Create

```
api/src/
  modules/
    reference/
      countries.ts                      # GET /countries, /countries/:id, /countries/risks
      bases.ts                          # GET /bases, /bases/:id, /bases/nearby
      nsa.ts                            # GET /nsa, /nsa/:id
      chokepoints.ts                    # GET /chokepoints, /chokepoints/:id
      elections.ts                      # GET /elections, /elections/upcoming
      trade-routes.ts                   # GET /trade-routes, /trade-routes/:id
      ports.ts                          # GET /ports
      conflicts.ts                      # GET /conflicts, /conflicts/:id, /conflicts/:id/timeline
    realtime/
      news.ts                           # GET /news
      sse.ts                            # GET /events/stream
    aggregate/
      bootstrap.ts                      # GET /bootstrap
      viewport.ts                       # GET /viewport
      search.ts                         # GET /search
      compare.ts                        # GET /compare, /compare/colors
    binary/
      layers.ts                         # GET /layers/:layer/binary
    system/
      seed-routes.ts                    # POST /seed/run, GET /seed/status
    periodic/
      conflict-counter.ts              # Hourly conflict dayCount updater
  middleware/
    api-key.ts                          # X-API-Key authentication
    rate-limit.ts                       # Sliding window rate limiter
    cache-headers.ts                    # Cache-Control header injection
    compression.ts                      # Gzip/Brotli response compression
    logger.ts                           # Structured JSON request logging
  infrastructure/
    sse.ts                              # SSE connection manager + Redis pub/sub bridge
  helpers/
    query.ts                            # Shared query param parsing (pagination, fields, filters)
    response.ts                         # API envelope helpers (success, error, paginated)
api/tests/
  modules/
    reference/
      countries.test.ts
      bases.test.ts
      nsa.test.ts
      chokepoints.test.ts
      elections.test.ts
      trade-routes.test.ts
      conflicts.test.ts
    realtime/
      news.test.ts
      sse.test.ts
    aggregate/
      bootstrap.test.ts
      viewport.test.ts
      search.test.ts
      compare.test.ts
    binary/
      layers.test.ts
  middleware/
    api-key.test.ts
    rate-limit.test.ts
```

---

## Phase 3: API Routes

### Task 1: Query & Response Helpers

**Files:**
- Create: `api/src/helpers/query.ts`
- Create: `api/src/helpers/response.ts`

- [ ] **Step 1: Write failing test for query helpers**

```ts
// api/tests/helpers/query.test.ts
import { describe, it, expect } from "bun:test";
import { parseListParams, parseSparseFields } from "../../src/helpers/query";

describe("Query helpers", () => {
  it("parses pagination defaults", () => {
    const params = parseListParams(new URLSearchParams());
    expect(params.limit).toBe(50);
    expect(params.offset).toBe(0);
  });

  it("parses pagination from query", () => {
    const params = parseListParams(new URLSearchParams("limit=10&offset=20"));
    expect(params.limit).toBe(10);
    expect(params.offset).toBe(20);
  });

  it("caps limit at 200", () => {
    const params = parseListParams(new URLSearchParams("limit=999"));
    expect(params.limit).toBe(200);
  });

  it("parses sparse fields", () => {
    const fields = parseSparseFields("name,lat,lng,risk");
    expect(fields).toEqual({ name: 1, lat: 1, lng: 1, risk: 1 });
  });

  it("returns null for empty fields param", () => {
    const fields = parseSparseFields(undefined);
    expect(fields).toBeNull();
  });
});
```

- [ ] **Step 2: Implement query helpers**

```ts
// api/src/helpers/query.ts
export interface ListParams {
  limit: number;
  offset: number;
  q?: string;
  filters: Record<string, string>;
}

export function parseListParams(searchParams: URLSearchParams): ListParams {
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
  const q = searchParams.get("q") || undefined;

  const filterKeys = ["region", "risk", "tag", "status", "country", "type", "category", "conflict"];
  const filters: Record<string, string> = {};
  for (const key of filterKeys) {
    const val = searchParams.get(key);
    if (val) filters[key] = val;
  }

  return { limit, offset, q, filters };
}

export function parseSparseFields(fieldsParam: string | null | undefined): Record<string, 1> | null {
  if (!fieldsParam) return null;
  const obj: Record<string, 1> = {};
  for (const f of fieldsParam.split(",")) {
    const trimmed = f.trim();
    if (trimmed) obj[trimmed] = 1;
  }
  return Object.keys(obj).length > 0 ? obj : null;
}

export function buildMongoFilter(filters: Record<string, string>): Record<string, any> {
  const mongoFilter: Record<string, any> = {};
  for (const [key, val] of Object.entries(filters)) {
    if (key === "tag") {
      mongoFilter.tags = val;
    } else if (key === "conflict") {
      mongoFilter.conflictId = val;
    } else {
      mongoFilter[key] = val;
    }
  }
  return mongoFilter;
}
```

- [ ] **Step 3: Implement response helpers**

```ts
// api/src/helpers/response.ts
import type { Context } from "hono";
import type { ApiMeta } from "../types";

export function success<T>(c: Context, data: T, meta: ApiMeta = {}, status = 200) {
  return c.json({ data, meta }, status);
}

export function paginated<T>(c: Context, data: T[], total: number, limit: number, offset: number, extra: Partial<ApiMeta> = {}) {
  return c.json({
    data,
    meta: { total, limit, offset, ...extra },
  });
}

export function apiError(c: Context, code: string, message: string, status: number) {
  return c.json({ error: { code, message } }, status);
}

export function notFound(c: Context, resource: string, id: string) {
  return apiError(c, "NOT_FOUND", `${resource} '${id}' not found`, 404);
}

export function validationError(c: Context, message: string) {
  return apiError(c, "VALIDATION_ERROR", message, 400);
}
```

- [ ] **Step 4: Run tests, verify pass, commit**

Run: `cd api && bun test tests/helpers/query.test.ts`

```bash
git add api/src/helpers/query.ts api/src/helpers/response.ts api/tests/helpers/query.test.ts
git commit -m "feat: add query parsing and response envelope helpers"
```

---

### Task 2: Countries Endpoints

**Files:**
- Create: `api/src/modules/reference/countries.ts`
- Test: `api/tests/modules/reference/countries.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// api/tests/modules/reference/countries.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { seedCountries } from "../../../src/seed/seed-countries";
import { countriesRouter } from "../../../src/modules/reference/countries";

describe("Countries API", () => {
  const app = new Hono().route("/countries", countriesRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6379");
    await getDb().collection("countries").deleteMany({});
    await seedCountries();
  });

  afterAll(async () => {
    await getDb().collection("countries").deleteMany({});
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /countries returns paginated list", async () => {
    const res = await app.request("/countries");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.meta.total).toBeGreaterThanOrEqual(190);
    expect(body.meta.limit).toBe(50);
  });

  it("GET /countries?risk=catastrophic filters by risk", async () => {
    const res = await app.request("/countries?risk=catastrophic");
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    for (const c of body.data) {
      expect(c.risk).toBe("catastrophic");
    }
  });

  it("GET /countries?fields=name,lat,lng returns sparse fields", async () => {
    const res = await app.request("/countries?fields=name,lat,lng&limit=5");
    const body = await res.json();
    expect(body.data[0].name).toBeDefined();
    expect(body.data[0].lat).toBeDefined();
    expect(body.data[0].analysis).toBeUndefined();
  });

  it("GET /countries/:id returns single country", async () => {
    const res = await app.request("/countries/ukraine");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Ukraine");
    expect(body.data.iso2).toBe("UA");
  });

  it("GET /countries/:id returns 404 for unknown", async () => {
    const res = await app.request("/countries/nonexistent");
    expect(res.status).toBe(404);
  });

  it("GET /countries/risks returns risk counts", async () => {
    const res = await app.request("/countries/risks");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    // Should have aggregated risk counts
  });

  it("GET /countries?q=ukraine does text search", async () => {
    const res = await app.request("/countries?q=ukraine");
    const body = await res.json();
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].name).toBe("Ukraine");
  });
});
```

- [ ] **Step 2: Implement countries router**

```ts
// api/src/modules/reference/countries.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, parseSparseFields, buildMongoFilter } from "../../helpers/query";
import { success, paginated, notFound } from "../../helpers/response";

export const countriesRouter = new Hono();

const CACHE_TTL = 3600; // 1 hour

countriesRouter.get("/risks", async (c) => {
  const data = await cacheAside("gambit:countries:risks", async () => {
    const col = getDb().collection("countries");
    return col.aggregate([
      { $group: { _id: "$risk", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();
  }, CACHE_TTL);

  return success(c, data, { cached: !!data._cached });
});

countriesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const cacheKey = `gambit:countries:${id}`;

  const data = await cacheAside(cacheKey, async () => {
    return getDb().collection("countries").findOne({ _id: id });
  }, CACHE_TTL);

  if (!data || (data && !data.name)) {
    return notFound(c, "Country", id);
  }

  return success(c, data, { cached: !!data._cached });
});

countriesRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, q, filters } = parseListParams(searchParams);
  const fields = parseSparseFields(searchParams.get("fields"));

  const mongoFilter = buildMongoFilter(filters);
  if (q) {
    mongoFilter.$text = { $search: q };
  }

  const cacheKey = `gambit:countries:all:${JSON.stringify({ filters, q, fields, limit, offset })}`;

  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("countries");
    const [data, total] = await Promise.all([
      col.find(mongoFilter, { projection: fields ?? undefined })
        .skip(offset)
        .limit(limit)
        .toArray(),
      col.countDocuments(mongoFilter),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset, { cached: !!result._cached });
});
```

- [ ] **Step 3: Run tests, verify pass, commit**

Run: `cd api && bun test tests/modules/reference/countries.test.ts`

```bash
git add api/src/modules/reference/countries.ts api/tests/modules/reference/countries.test.ts
git commit -m "feat: add countries API endpoints (list, detail, risks, search)"
```

---

### Task 3: Bases Endpoints

**Files:**
- Create: `api/src/modules/reference/bases.ts`
- Test: `api/tests/modules/reference/bases.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// api/tests/modules/reference/bases.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { seedBases } from "../../../src/seed/seed-bases";
import { basesRouter } from "../../../src/modules/reference/bases";

describe("Bases API", () => {
  const app = new Hono().route("/bases", basesRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6379");
    await getDb().collection("bases").deleteMany({});
    await seedBases();
  });

  afterAll(async () => {
    await getDb().collection("bases").deleteMany({});
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /bases returns paginated list", async () => {
    const res = await app.request("/bases");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.meta.total).toBeGreaterThanOrEqual(490);
  });

  it("GET /bases/:id returns single base", async () => {
    const res = await app.request("/bases/us-al-udeid");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Al Udeid Air Base");
  });

  it("GET /bases/nearby?lat=25&lng=51&radius=100 returns nearby bases", async () => {
    const res = await app.request("/bases/nearby?lat=25&lng=51&radius=100");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    // Al Udeid at 25.1, 51.3 should be within 100km of 25, 51
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("GET /bases?country=United+States filters by country", async () => {
    const res = await app.request("/bases?country=United+States");
    const body = await res.json();
    for (const b of body.data) {
      expect(b.country).toBe("United States");
    }
  });
});
```

- [ ] **Step 2: Implement bases router**

```ts
// api/src/modules/reference/bases.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, parseSparseFields, buildMongoFilter } from "../../helpers/query";
import { success, paginated, notFound, validationError } from "../../helpers/response";

export const basesRouter = new Hono();

const CACHE_TTL = 3600;

basesRouter.get("/nearby", async (c) => {
  const lat = Number(c.req.query("lat"));
  const lng = Number(c.req.query("lng"));
  const radius = Number(c.req.query("radius") ?? 200); // km

  if (isNaN(lat) || isNaN(lng)) {
    return validationError(c, "lat and lng are required numeric parameters");
  }

  const cacheKey = `gambit:bases:nearby:${lat},${lng},${radius}`;
  const data = await cacheAside(cacheKey, async () => {
    return getDb().collection("bases").find({
      location: {
        $nearSphere: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radius * 1000, // meters
        },
      },
    }).limit(50).toArray();
  }, CACHE_TTL);

  return success(c, data);
});

basesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const data = await cacheAside(`gambit:bases:${id}`, async () => {
    return getDb().collection("bases").findOne({ _id: id });
  }, CACHE_TTL);

  if (!data || !data.name) return notFound(c, "Base", id);
  return success(c, data);
});

basesRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, filters } = parseListParams(searchParams);
  const fields = parseSparseFields(searchParams.get("fields"));
  const mongoFilter = buildMongoFilter(filters);

  const cacheKey = `gambit:bases:all:${JSON.stringify({ filters, fields, limit, offset })}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("bases");
    const [data, total] = await Promise.all([
      col.find(mongoFilter, { projection: fields ?? undefined }).skip(offset).limit(limit).toArray(),
      col.countDocuments(mongoFilter),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
git add api/src/modules/reference/bases.ts api/tests/modules/reference/bases.test.ts
git commit -m "feat: add bases API endpoints (list, detail, nearby geospatial)"
```

---

### Task 4: NSA + Chokepoints + Elections Endpoints

**Files:**
- Create: `api/src/modules/reference/nsa.ts`
- Create: `api/src/modules/reference/chokepoints.ts`
- Create: `api/src/modules/reference/elections.ts`
- Test: `api/tests/modules/reference/nsa.test.ts`
- Test: `api/tests/modules/reference/chokepoints.test.ts`
- Test: `api/tests/modules/reference/elections.test.ts`

These three follow the same list/detail pattern as countries/bases with minor variations.

- [ ] **Step 1: Implement nsa.ts**

```ts
// api/src/modules/reference/nsa.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, parseSparseFields, buildMongoFilter } from "../../helpers/query";
import { success, paginated, notFound } from "../../helpers/response";

export const nsaRouter = new Hono();
const CACHE_TTL = 3600;

nsaRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const data = await cacheAside(`gambit:nsa:${id}`, async () => {
    return getDb().collection("nonStateActors").findOne({ _id: id });
  }, CACHE_TTL);
  if (!data || !data.name) return notFound(c, "Non-state actor", id);
  return success(c, data);
});

nsaRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, q, filters } = parseListParams(searchParams);
  const fields = parseSparseFields(searchParams.get("fields"));
  const mongoFilter = buildMongoFilter(filters);
  if (q) mongoFilter.$text = { $search: q };

  const cacheKey = `gambit:nsa:all:${JSON.stringify({ filters, q, fields, limit, offset })}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("nonStateActors");
    const [data, total] = await Promise.all([
      col.find(mongoFilter, { projection: fields ?? undefined }).skip(offset).limit(limit).toArray(),
      col.countDocuments(mongoFilter),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
```

- [ ] **Step 2: Implement chokepoints.ts**

```ts
// api/src/modules/reference/chokepoints.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, parseSparseFields, buildMongoFilter } from "../../helpers/query";
import { success, paginated, notFound } from "../../helpers/response";

export const chokepointsRouter = new Hono();
const CACHE_TTL = 3600;

chokepointsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const data = await cacheAside(`gambit:chokepoints:${id}`, async () => {
    return getDb().collection("chokepoints").findOne({ _id: id });
  }, CACHE_TTL);
  if (!data || !data.name) return notFound(c, "Chokepoint", id);
  return success(c, data);
});

chokepointsRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, filters } = parseListParams(searchParams);
  const fields = parseSparseFields(searchParams.get("fields"));
  const mongoFilter = buildMongoFilter(filters);

  const cacheKey = `gambit:chokepoints:all:${JSON.stringify({ filters, fields, limit, offset })}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("chokepoints");
    const [data, total] = await Promise.all([
      col.find(mongoFilter, { projection: fields ?? undefined }).skip(offset).limit(limit).toArray(),
      col.countDocuments(mongoFilter),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
```

- [ ] **Step 3: Implement elections.ts**

```ts
// api/src/modules/reference/elections.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams } from "../../helpers/query";
import { success, paginated, notFound } from "../../helpers/response";

export const electionsRouter = new Hono();
const CACHE_TTL = 3600;

electionsRouter.get("/upcoming", async (c) => {
  const data = await cacheAside("gambit:elections:upcoming", async () => {
    return getDb().collection("elections")
      .find({ dateISO: { $gte: new Date() } })
      .sort({ dateISO: 1 })
      .toArray();
  }, CACHE_TTL);
  return success(c, data);
});

electionsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const data = await cacheAside(`gambit:elections:${id}`, async () => {
    return getDb().collection("elections").findOne({ _id: id });
  }, CACHE_TTL);
  if (!data || !data.country) return notFound(c, "Election", id);
  return success(c, data);
});

electionsRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset } = parseListParams(searchParams);

  const cacheKey = `gambit:elections:all:${limit}:${offset}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("elections");
    const [data, total] = await Promise.all([
      col.find({}).sort({ dateISO: 1 }).skip(offset).limit(limit).toArray(),
      col.countDocuments(),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
```

- [ ] **Step 4: Write tests for all three, run, verify pass**

Tests follow the countries/bases pattern: mount router, seed data, test GET list, GET /:id, GET with filters. Elections test additionally covers GET /elections/upcoming.

- [ ] **Step 5: Commit**

```bash
git add api/src/modules/reference/nsa.ts api/src/modules/reference/chokepoints.ts api/src/modules/reference/elections.ts
git add api/tests/modules/reference/nsa.test.ts api/tests/modules/reference/chokepoints.test.ts api/tests/modules/reference/elections.test.ts
git commit -m "feat: add API endpoints for NSA, chokepoints, and elections"
```

---

### Task 4b: Trade Routes + Ports + Conflicts Endpoints

These three have non-trivial logic beyond standard list/detail.

**Files:**
- Create: `api/src/modules/reference/trade-routes.ts`
- Create: `api/src/modules/reference/ports.ts`
- Create: `api/src/modules/reference/conflicts.ts`
- Test: `api/tests/modules/reference/trade-routes.test.ts`
- Test: `api/tests/modules/reference/ports.test.ts`
- Test: `api/tests/modules/reference/conflicts.test.ts`

- [ ] **Step 1: Implement trade-routes.ts with resolve support**

The `?resolve=true` query param works on both the list (`GET /trade-routes?resolve=true`) and detail (`GET /trade-routes/:id`) endpoints. It looks up `from`/`to` ports and `waypoints` chokepoints, attaching their coordinates to the response.

```ts
// api/src/modules/reference/trade-routes.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, buildMongoFilter } from "../../helpers/query";
import { success, paginated, notFound } from "../../helpers/response";

export const tradeRoutesRouter = new Hono();
const CACHE_TTL = 3600;

/** Look up ports and chokepoints to build resolved segments with coordinates */
async function resolveRoute(route: any): Promise<any> {
  const db = getDb();
  const [fromPort, toPort, waypointDocs] = await Promise.all([
    db.collection("ports").findOne({ _id: route.from }),
    db.collection("ports").findOne({ _id: route.to }),
    route.waypoints?.length
      ? db.collection("chokepoints").find({ _id: { $in: route.waypoints } }).toArray()
      : Promise.resolve([]),
  ]);

  // Build ordered segments: from -> waypoint1 -> waypoint2 -> ... -> to
  const waypointMap = new Map(waypointDocs.map((w: any) => [w._id, w]));
  const orderedWaypoints = (route.waypoints ?? [])
    .map((id: string) => waypointMap.get(id))
    .filter(Boolean)
    .map((w: any) => ({ _id: w._id, name: w.name, lat: w.lat, lng: w.lng, status: w.status }));

  return {
    ...route,
    resolved: {
      from: fromPort ? { _id: fromPort._id, name: fromPort.name, lat: fromPort.lat, lng: fromPort.lng } : null,
      to: toPort ? { _id: toPort._id, name: toPort.name, lat: toPort.lat, lng: toPort.lng } : null,
      waypoints: orderedWaypoints,
    },
  };
}

tradeRoutesRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const resolve = c.req.query("resolve") === "true";
  const cacheKey = `gambit:trade-routes:${id}:${resolve}`;

  const data = await cacheAside(cacheKey, async () => {
    const route = await getDb().collection("tradeRoutes").findOne({ _id: id });
    if (!route) return null;
    return resolve ? resolveRoute(route) : route;
  }, CACHE_TTL);

  if (!data) return notFound(c, "Trade route", id);
  return success(c, data);
});

tradeRoutesRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, filters } = parseListParams(searchParams);
  const mongoFilter = buildMongoFilter(filters);
  const resolve = searchParams.get("resolve") === "true";

  const cacheKey = `gambit:trade-routes:all:${JSON.stringify({ filters, limit, offset, resolve })}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("tradeRoutes");
    const [routes, total] = await Promise.all([
      col.find(mongoFilter).skip(offset).limit(limit).toArray(),
      col.countDocuments(mongoFilter),
    ]);
    const data = resolve ? await Promise.all(routes.map(resolveRoute)) : routes;
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
```

- [ ] **Step 2: Implement ports.ts**

```ts
// api/src/modules/reference/ports.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams } from "../../helpers/query";
import { paginated } from "../../helpers/response";

export const portsRouter = new Hono();
const CACHE_TTL = 3600;

portsRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset } = parseListParams(searchParams);

  const cacheKey = `gambit:ports:all:${limit}:${offset}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("ports");
    const [data, total] = await Promise.all([
      col.find({}).skip(offset).limit(limit).toArray(),
      col.countDocuments(),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
```

- [ ] **Step 3: Implement conflicts.ts with timeline**

```ts
// api/src/modules/reference/conflicts.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, buildMongoFilter } from "../../helpers/query";
import { success, paginated, notFound } from "../../helpers/response";

export const conflictsRouter = new Hono();
const CACHE_TTL = 900; // 15 min for conflicts

conflictsRouter.get("/:id/timeline", async (c) => {
  const id = c.req.param("id");
  const cacheKey = `gambit:conflicts:${id}:timeline`;

  const data = await cacheAside(cacheKey, async () => {
    const db = getDb();
    // Verify conflict exists
    const conflict = await db.collection("conflicts").findOne({ _id: id });
    if (!conflict) return null;
    // Get related news ordered by date
    const news = await db.collection("news")
      .find({ conflictId: id })
      .sort({ publishedAt: -1 })
      .limit(50)
      .toArray();
    return { conflict, timeline: news };
  }, CACHE_TTL);

  if (!data) return notFound(c, "Conflict", id);
  return success(c, data);
});

conflictsRouter.get("/:id", async (c) => {
  const id = c.req.param("id");
  const data = await cacheAside(`gambit:conflicts:${id}`, async () => {
    return getDb().collection("conflicts").findOne({ _id: id });
  }, CACHE_TTL);
  if (!data || !data.title) return notFound(c, "Conflict", id);
  return success(c, data);
});

conflictsRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, filters } = parseListParams(searchParams);
  const mongoFilter = buildMongoFilter(filters);

  const cacheKey = `gambit:conflicts:all:${JSON.stringify({ filters, limit, offset })}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("conflicts");
    const [data, total] = await Promise.all([
      col.find(mongoFilter).sort({ dayCount: -1 }).skip(offset).limit(limit).toArray(),
      col.countDocuments(mongoFilter),
    ]);
    return { data, total };
  }, CACHE_TTL);

  return paginated(c, result.data, result.total, limit, offset);
});
```

- [ ] **Step 4: Write tests**

Key test cases beyond standard list/detail:
- **Trade routes:** `GET /trade-routes?resolve=true` returns `resolved.from`, `resolved.to`, `resolved.waypoints` with coordinates
- **Trade routes:** `GET /trade-routes/:id` without `resolve` returns raw waypoint IDs
- **Conflicts:** `GET /conflicts/:id/timeline` returns `{ conflict, timeline: NewsEvent[] }` sorted by date descending
- **Conflicts:** `GET /conflicts/:id/timeline` returns 404 for unknown conflict

- [ ] **Step 5: Run all tests, verify pass**

Run: `cd api && bun test tests/modules/reference/`
Expected: All PASS

- [ ] **Step 6: Commit**

```bash
git add api/src/modules/reference/trade-routes.ts api/src/modules/reference/ports.ts api/src/modules/reference/conflicts.ts
git add api/tests/modules/reference/trade-routes.test.ts api/tests/modules/reference/ports.test.ts api/tests/modules/reference/conflicts.test.ts
git commit -m "feat: add trade routes (with resolve), ports, and conflicts (with timeline) endpoints"
```

---

### Task 5: Bootstrap + Viewport + Search + Compare

**Files:**
- Create: `api/src/modules/aggregate/bootstrap.ts`
- Create: `api/src/modules/aggregate/viewport.ts`
- Create: `api/src/modules/aggregate/search.ts`
- Create: `api/src/modules/aggregate/compare.ts`
- Test: one test per file

- [ ] **Step 1: Write failing tests**

```ts
// api/tests/modules/aggregate/bootstrap.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { seedAll } from "../../../src/seed/seed-all";
import { bootstrapRouter } from "../../../src/modules/aggregate/bootstrap";

describe("Bootstrap API", () => {
  const app = new Hono().route("/bootstrap", bootstrapRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6379");
    await seedAll();
  }, 30000);

  afterAll(async () => {
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /bootstrap returns all reference data", async () => {
    const res = await app.request("/bootstrap");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.countries).toBeArray();
    expect(body.data.bases).toBeArray();
    expect(body.data.nsa).toBeArray();
    expect(body.data.chokepoints).toBeArray();
    expect(body.data.conflicts).toBeArray();
    expect(body.data.elections).toBeArray();
    expect(body.data.tradeRoutes).toBeArray();
    expect(body.data.ports).toBeArray();
    expect(body.data.countryColors).toBeDefined();
    expect(body.meta.freshness).toBeDefined();
  });

  it("GET /bootstrap?slim=true returns minimal fields", async () => {
    const res = await app.request("/bootstrap?slim=true");
    const body = await res.json();
    // Slim countries should not have analysis
    if (body.data.countries.length > 0) {
      expect(body.data.countries[0].analysis).toBeUndefined();
      expect(body.data.countries[0].name).toBeDefined();
    }
  });
});
```

- [ ] **Step 2: Implement bootstrap router**

```ts
// api/src/modules/aggregate/bootstrap.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { success } from "../../helpers/response";

export const bootstrapRouter = new Hono();

const SLIM_PROJECTIONS = {
  countries: { _id: 1, iso2: 1, name: 1, flag: 1, lat: 1, lng: 1, risk: 1, region: 1, tags: 1 },
  bases: { _id: 1, name: 1, lat: 1, lng: 1, operatingCountry: 1, type: 1, color: 1 },
  nsa: { _id: 1, name: 1, ideology: 1, status: 1, zones: 1 },
  chokepoints: { _id: 1, name: 1, type: 1, lat: 1, lng: 1, status: 1, tooltipLine: 1 },
  conflicts: { _id: 1, title: 1, lat: 1, lng: 1, dayCount: 1, status: 1, casualties: 1 },
  elections: { _id: 1, country: 1, lat: 1, lng: 1, dateISO: 1, type: 1, flag: 1 },
  tradeRoutes: {}, // all fields needed for resolved segments
  ports: { _id: 1, name: 1, lat: 1, lng: 1 },
};

bootstrapRouter.get("/", async (c) => {
  const slim = c.req.query("slim") === "true";
  const cacheKey = slim ? "gambit:bootstrap:slim" : "gambit:bootstrap:full";

  const data = await cacheAside(cacheKey, async () => {
    const db = getDb();
    const proj = slim ? SLIM_PROJECTIONS : {};

    const [countries, bases, nsa, chokepoints, conflicts, elections, tradeRoutes, ports, colorDocs] = await Promise.all([
      db.collection("countries").find({}, { projection: (proj as any).countries }).toArray(),
      db.collection("bases").find({}, { projection: (proj as any).bases }).toArray(),
      db.collection("nonStateActors").find({}, { projection: (proj as any).nsa }).toArray(),
      db.collection("chokepoints").find({}, { projection: (proj as any).chokepoints }).toArray(),
      db.collection("conflicts").find({}, { projection: (proj as any).conflicts }).toArray(),
      db.collection("elections").find({}, { projection: (proj as any).elections }).toArray(),
      db.collection("tradeRoutes").find({}).toArray(),
      db.collection("ports").find({}, { projection: (proj as any).ports }).toArray(),
      db.collection("countryColors").find({}).toArray(),
    ]);

    const countryColors: Record<string, string> = {};
    for (const doc of colorDocs) {
      countryColors[doc._id as string] = doc.color;
    }

    return { countries, bases, nsa, chokepoints, conflicts, elections, tradeRoutes, ports, countryColors };
  }, 3600);

  return success(c, data, { freshness: new Date().toISOString(), cached: !!data._cached });
});
```

- [ ] **Step 3: Implement viewport router**

```ts
// api/src/modules/aggregate/viewport.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { success, validationError } from "../../helpers/response";

export const viewportRouter = new Hono();

viewportRouter.get("/", async (c) => {
  const bbox = c.req.query("bbox");
  const layers = c.req.query("layers")?.split(",") ?? [];

  if (!bbox) return validationError(c, "bbox is required (sw_lng,sw_lat,ne_lng,ne_lat)");

  const [swLng, swLat, neLng, neLat] = bbox.split(",").map(Number);
  if ([swLng, swLat, neLng, neLat].some(isNaN)) {
    return validationError(c, "bbox must be 4 comma-separated numbers");
  }

  const geoFilter = {
    location: {
      $geoWithin: {
        $box: [[swLng, swLat], [neLng, neLat]],
      },
    },
  };

  const db = getDb();
  const data: Record<string, any[]> = {};
  let total = 0;

  const queries = [];
  if (layers.includes("bases")) queries.push(db.collection("bases").find(geoFilter).toArray().then(r => { data.bases = r; total += r.length; }));
  if (layers.includes("nsa")) queries.push(db.collection("nonStateActors").find({}).toArray().then(r => { data.nsa = r; total += r.length; }));
  if (layers.includes("chokepoints")) queries.push(db.collection("chokepoints").find(geoFilter).toArray().then(r => { data.chokepoints = r; total += r.length; }));

  await Promise.all(queries);

  return success(c, data, { bbox: [swLng, swLat, neLng, neLat] as any, total });
});
```

- [ ] **Step 4: Implement search router**

```ts
// api/src/modules/aggregate/search.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { success, validationError } from "../../helpers/response";

export const searchRouter = new Hono();

searchRouter.get("/", async (c) => {
  const q = c.req.query("q");
  if (!q || q.length < 2) return validationError(c, "q must be at least 2 characters");

  const cacheKey = `gambit:search:${q.toLowerCase()}`;
  const data = await cacheAside(cacheKey, async () => {
    const db = getDb();
    const textQuery = { $text: { $search: q } };
    const limit = 10;

    const [countries, conflicts, bases, nsa, chokepoints] = await Promise.all([
      db.collection("countries").find(textQuery).limit(limit).toArray(),
      db.collection("conflicts").find({ $or: [textQuery, { title: { $regex: q, $options: "i" } }] }).limit(limit).toArray(),
      db.collection("bases").find({ name: { $regex: q, $options: "i" } }).limit(limit).toArray(),
      db.collection("nonStateActors").find(textQuery).limit(limit).toArray(),
      db.collection("chokepoints").find({ name: { $regex: q, $options: "i" } }).limit(limit).toArray(),
    ]);

    const total = countries.length + conflicts.length + bases.length + nsa.length + chokepoints.length;
    return { countries, conflicts, bases, nsa, chokepoints, _total: total };
  }, 300); // 5min cache

  return success(c, data, { query: q, total: data._total } as any);
});
```

- [ ] **Step 5: Implement compare router**

```ts
// api/src/modules/aggregate/compare.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { success, validationError } from "../../helpers/response";

export const compareRouter = new Hono();

compareRouter.get("/colors", async (c) => {
  const data = await cacheAside("gambit:compare:colors", async () => {
    const docs = await getDb().collection("countryColors").find({}).toArray();
    const colors: Record<string, string> = {};
    for (const doc of docs) colors[doc._id as string] = doc.color;
    return colors;
  }, 3600);

  return success(c, data);
});

compareRouter.get("/", async (c) => {
  const countriesParam = c.req.query("countries");
  if (!countriesParam) return validationError(c, "countries parameter required (comma-separated ISO2 codes)");

  const iso2Codes = countriesParam.split(",").map(s => s.trim().toUpperCase()).slice(0, 3);
  if (iso2Codes.length === 0) return validationError(c, "At least one country code required");

  const cacheKey = `gambit:compare:${iso2Codes.join(",")}`;
  const data = await cacheAside(cacheKey, async () => {
    const db = getDb();

    const countries = await db.collection("countries").find({ iso2: { $in: iso2Codes } }).toArray();
    const countryNames = countries.map(c => c.name);

    const [conflicts, nsa, bases] = await Promise.all([
      db.collection("conflicts").find({ relatedCountries: { $in: iso2Codes } }).toArray(),
      db.collection("nonStateActors").find({
        $or: [
          { allies: { $in: countryNames } },
          { rivals: { $in: countryNames } },
        ],
      }).toArray(),
      db.collection("bases").find({ country: { $in: countryNames } }).toArray(),
    ]);

    return { countries, conflicts, nsa, bases };
  }, 3600);

  return success(c, data);
});
```

- [ ] **Step 6: Run all aggregate tests, verify pass, commit**

```bash
git add api/src/modules/aggregate/ api/tests/modules/aggregate/
git commit -m "feat: add bootstrap, viewport, search, and compare aggregate endpoints"
```

---

### Task 6: News Endpoints + SSE

**Files:**
- Create: `api/src/modules/realtime/news.ts`
- Create: `api/src/infrastructure/sse.ts`
- Create: `api/src/modules/realtime/sse.ts`
- Test: `api/tests/modules/realtime/news.test.ts`
- Test: `api/tests/modules/realtime/sse.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// api/tests/modules/realtime/news.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { seedNews } from "../../../src/seed/seed-news";
import { newsRouter } from "../../../src/modules/realtime/news";

describe("News API", () => {
  const app = new Hono().route("/news", newsRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6379");
    await getDb().collection("news").deleteMany({});
    await seedNews();
  });

  afterAll(async () => {
    await getDb().collection("news").deleteMany({});
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /news returns latest news sorted by date", async () => {
    const res = await app.request("/news");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("GET /news?conflict=us-iran-war filters by conflict", async () => {
    const res = await app.request("/news?conflict=us-iran-war");
    const body = await res.json();
    for (const n of body.data) {
      expect(n.conflictId).toBe("us-iran-war");
    }
  });

  it("GET /news?tag=CONFLICT filters by tag", async () => {
    const res = await app.request("/news?tag=CONFLICT");
    const body = await res.json();
    for (const n of body.data) {
      expect(n.tags).toContain("CONFLICT");
    }
  });
});
```

- [ ] **Step 2: Implement news router**

```ts
// api/src/modules/realtime/news.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
import { parseListParams, buildMongoFilter } from "../../helpers/query";
import { paginated } from "../../helpers/response";

export const newsRouter = new Hono();

newsRouter.get("/", async (c) => {
  const searchParams = new URL(c.req.url).searchParams;
  const { limit, offset, filters } = parseListParams(searchParams);
  const mongoFilter = buildMongoFilter(filters);

  const cacheKey = `gambit:news:${JSON.stringify({ filters, limit, offset })}`;
  const result = await cacheAside(cacheKey, async () => {
    const col = getDb().collection("news");
    const [data, total] = await Promise.all([
      col.find(mongoFilter).sort({ publishedAt: -1 }).skip(offset).limit(limit).toArray(),
      col.countDocuments(mongoFilter),
    ]);
    return { data, total };
  }, 30); // 30s cache for news

  return paginated(c, result.data, result.total, limit, offset);
});
```

- [ ] **Step 3: Implement SSE infrastructure**

```ts
// api/src/infrastructure/sse.ts
import { getRedis, isRedisConnected } from "./redis";

const CHANNEL = "gambit:events:new";
const BUFFER_KEY = "gambit:events:buffer";
const MAX_BUFFER = Number(process.env.SSE_BUFFER_SIZE ?? 100);

let eventCounter = 0;

export interface SSEEvent {
  id: string;
  event: string;
  data: string;
}

export async function publishEvent(event: string, data: any): Promise<void> {
  if (!isRedisConnected()) return;
  const redis = getRedis();
  const id = String(++eventCounter);
  const payload = JSON.stringify({ id, event, data });

  await redis.publish(CHANNEL, payload);
  // Buffer for reconnect replay
  await redis.lpush(BUFFER_KEY, payload);
  await redis.ltrim(BUFFER_KEY, 0, MAX_BUFFER - 1);
}

export async function getBufferedEvents(afterId?: string): Promise<SSEEvent[]> {
  if (!isRedisConnected()) return [];
  const redis = getRedis();
  const raw = await redis.lrange(BUFFER_KEY, 0, MAX_BUFFER - 1);

  const events = raw.map((r) => JSON.parse(r)).reverse(); // oldest first

  if (afterId) {
    const idx = events.findIndex((e) => e.id === afterId);
    return idx >= 0 ? events.slice(idx + 1) : events;
  }

  return events;
}

export function getChannel(): string {
  return CHANNEL;
}
```

- [ ] **Step 4: Implement SSE stream endpoint**

```ts
// api/src/modules/realtime/sse.ts
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { getRedis, isRedisConnected } from "../../infrastructure/redis";
import { getBufferedEvents, getChannel } from "../../infrastructure/sse";
import Redis from "ioredis";

export const sseRouter = new Hono();

sseRouter.get("/stream", async (c) => {
  const lastEventId = c.req.header("last-event-id");

  return streamSSE(c, async (stream) => {
    // Replay missed events if reconnecting
    if (lastEventId) {
      const missed = await getBufferedEvents(lastEventId);
      for (const evt of missed) {
        await stream.writeSSE({ id: evt.id, event: evt.event, data: evt.data });
      }
    }

    // Subscribe to new events via Redis pub/sub
    if (!isRedisConnected()) {
      await stream.writeSSE({ event: "error", data: "Redis unavailable" });
      return;
    }

    const subscriber = getRedis().duplicate();
    await subscriber.subscribe(getChannel());

    // Heartbeat
    const heartbeatMs = Number(process.env.SSE_HEARTBEAT_MS ?? 30000);
    const heartbeat = setInterval(async () => {
      try {
        await stream.writeSSE({ event: "heartbeat", data: "" });
      } catch {
        clearInterval(heartbeat);
      }
    }, heartbeatMs);

    subscriber.on("message", async (_channel, message) => {
      try {
        const evt = JSON.parse(message);
        await stream.writeSSE({ id: evt.id, event: evt.event, data: JSON.stringify(evt.data) });
      } catch {
        // ignore parse errors
      }
    });

    // Cleanup on disconnect
    stream.onAbort(() => {
      clearInterval(heartbeat);
      subscriber.unsubscribe();
      subscriber.quit();
    });

    // Keep stream alive until client disconnects
    await new Promise(() => {}); // never resolves — stream stays open
  });
});
```

- [ ] **Step 5: Run tests, verify pass, commit**

```bash
git add api/src/modules/realtime/ api/src/infrastructure/sse.ts api/tests/modules/realtime/
git commit -m "feat: add news endpoints and SSE event stream with Redis pub/sub"
```

---

### Task 7: Binary Layer Endpoints

**Files:**
- Create: `api/src/modules/binary/layers.ts`
- Test: `api/tests/modules/binary/layers.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// api/tests/modules/binary/layers.test.ts
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo } from "../../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../../src/infrastructure/redis";
import { seedAll } from "../../../src/seed/seed-all";
import { binaryLayersRouter } from "../../../src/modules/binary/layers";

describe("Binary layers API", () => {
  const app = new Hono().route("/layers", binaryLayersRouter);

  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6379");
    await seedAll();
  }, 30000);

  afterAll(async () => {
    await disconnectRedis();
    await disconnectMongo();
  });

  it("GET /layers/bases/binary returns octet-stream", async () => {
    const res = await app.request("/layers/bases/binary");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/octet-stream");
    const buf = await res.arrayBuffer();
    expect(buf.byteLength).toBeGreaterThan(8); // at least header
    // Check header: first 4 bytes = record count, next 4 = stride
    const view = new DataView(buf);
    const count = view.getUint32(0, true);
    const stride = view.getUint32(4, true);
    expect(count).toBeGreaterThan(0);
    expect(stride).toBe(5); // bases stride: lng, lat, R, G, B
  });

  it("GET /layers/nonexistent/binary returns 404", async () => {
    const res = await app.request("/layers/nonexistent/binary");
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Implement binary layers router**

```ts
// api/src/modules/binary/layers.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { cacheAside } from "../../infrastructure/cache";
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

const LAYER_CONFIGS: Record<string, { collection: string; stride: number; encode: (doc: any) => number[] }> = {
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
    encode: (doc) => {
      // Flatten zones — one record per zone
      return []; // handled specially
    },
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
    encode: (doc) => {
      return []; // handled specially — needs port lookups
    },
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

binaryLayersRouter.get("/:layer/binary", async (c) => {
  const layer = c.req.param("layer");
  const config = LAYER_CONFIGS[layer];

  if (!config) return notFound(c, "Layer", layer);

  const cacheKey = `gambit:binary:${layer}`;
  const buffer = await cacheAside(cacheKey, async () => {
    const docs = await getDb().collection(config.collection).find({}).toArray();

    let records: number[][] = [];

    if (layer === "nsa-zones") {
      // Flatten: one record per zone
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
      // Need port lookups for from/to coordinates
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

    return { _buffer: Array.from(new Uint8Array(buf)) };
  }, 3600);

  // Reconstruct buffer from cached array
  const uint8 = new Uint8Array(buffer._buffer);

  return new Response(uint8.buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
git add api/src/modules/binary/ api/tests/modules/binary/
git commit -m "feat: add binary layer endpoints for Deck.GL data transfer"
```

---

### Task 8: Middleware — Auth, Rate Limit, Compression, Logging

**Files:**
- Create: `api/src/middleware/api-key.ts`
- Create: `api/src/middleware/rate-limit.ts`
- Create: `api/src/middleware/cache-headers.ts`
- Create: `api/src/middleware/compression.ts`
- Create: `api/src/middleware/logger.ts`
- Test: `api/tests/middleware/api-key.test.ts`
- Test: `api/tests/middleware/rate-limit.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// api/tests/middleware/api-key.test.ts
import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { apiKeyAuth } from "../../src/middleware/api-key";

describe("API key middleware", () => {
  it("allows requests in development without key", async () => {
    const app = new Hono();
    app.use("*", apiKeyAuth);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    // In dev mode (default), no key required
    expect(res.status).toBe(200);
  });

  it("rejects requests in production without key", async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    process.env.API_KEY = "secret-key";

    const app = new Hono();
    app.use("*", apiKeyAuth);
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request("/test");
    expect(res.status).toBe(401);

    const resOk = await app.request("/test", { headers: { "X-API-Key": "secret-key" } });
    expect(resOk.status).toBe(200);

    process.env.NODE_ENV = origEnv;
  });
});
```

- [ ] **Step 2: Implement all middleware**

```ts
// api/src/middleware/api-key.ts
import type { MiddlewareHandler } from "hono";

export const apiKeyAuth: MiddlewareHandler = async (c, next) => {
  const isDev = (process.env.NODE_ENV ?? "development") !== "production";
  if (isDev) return next();

  const key = c.req.header("x-api-key");
  const expected = process.env.API_KEY;

  if (!expected || key === expected) return next();

  return c.json({ error: { code: "UNAUTHORIZED", message: "Invalid or missing API key" } }, 401);
};
```

```ts
// api/src/middleware/rate-limit.ts
import type { MiddlewareHandler } from "hono";
import { getRedis, isRedisConnected } from "../infrastructure/redis";

// In-memory fallback when Redis is down
const memoryCounters = new Map<string, { count: number; resetAt: number }>();

export const rateLimit: MiddlewareHandler = async (c, next) => {
  const rpm = Number(process.env.RATE_LIMIT_RPM ?? 100);
  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const minute = Math.floor(Date.now() / 60000);
  const key = `gambit:ratelimit:${ip}:${minute}`;

  let count = 0;

  if (isRedisConnected()) {
    try {
      const redis = getRedis();
      count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 60);
    } catch {
      // Fall through to memory counter
      count = incrementMemory(ip, minute);
    }
  } else {
    count = incrementMemory(ip, minute);
  }

  if (count > rpm) {
    c.header("Retry-After", "60");
    return c.json({ error: { code: "RATE_LIMITED", message: "Too many requests" } }, 429);
  }

  c.header("X-RateLimit-Limit", String(rpm));
  c.header("X-RateLimit-Remaining", String(Math.max(0, rpm - count)));

  return next();
};

function incrementMemory(ip: string, minute: number): number {
  const key = `${ip}:${minute}`;
  const entry = memoryCounters.get(key);
  if (entry && entry.resetAt === minute) {
    entry.count++;
    return entry.count;
  }
  // Clean old entries periodically
  if (memoryCounters.size > 10000) {
    for (const [k, v] of memoryCounters) {
      if (v.resetAt < minute) memoryCounters.delete(k);
    }
  }
  memoryCounters.set(key, { count: 1, resetAt: minute });
  return 1;
}
```

```ts
// api/src/middleware/cache-headers.ts
import type { MiddlewareHandler } from "hono";

const CACHE_TTLS: Record<string, number> = {
  "/api/v1/countries": 3600,
  "/api/v1/bases": 3600,
  "/api/v1/nsa": 3600,
  "/api/v1/chokepoints": 3600,
  "/api/v1/elections": 3600,
  "/api/v1/trade-routes": 3600,
  "/api/v1/ports": 3600,
  "/api/v1/conflicts": 900,
  "/api/v1/news": 30,
  "/api/v1/bootstrap": 3600,
  "/api/v1/compare": 3600,
  "/api/v1/search": 300,
  "/api/v1/viewport": 30,
};

export const cacheHeaders: MiddlewareHandler = async (c, next) => {
  await next();

  // Only cache GET requests with 200 status
  if (c.req.method !== "GET" || c.res.status !== 200) return;

  // Match longest prefix
  const path = new URL(c.req.url).pathname;
  let maxAge = 0;
  for (const [prefix, ttl] of Object.entries(CACHE_TTLS)) {
    if (path.startsWith(prefix) && prefix.length > maxAge) {
      maxAge = ttl;
    }
  }

  if (maxAge > 0) {
    c.header("Cache-Control", `public, max-age=${maxAge}, stale-while-revalidate=${Math.floor(maxAge / 12)}`);
  }
};
```

```ts
// api/src/middleware/compression.ts
import { compress } from "hono/compress";

export const compression = compress({ encoding: "gzip" });
```

```ts
// api/src/middleware/logger.ts
import type { MiddlewareHandler } from "hono";

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;

  const level = c.res.status >= 500 ? "error" : c.res.status >= 400 ? "warn" : "info";

  const log = {
    level,
    timestamp: new Date().toISOString(),
    requestId: c.get("requestId") ?? "-",
    method: c.req.method,
    path: new URL(c.req.url).pathname,
    status: c.res.status,
    durationMs: ms,
  };

  if (level === "error") {
    console.error(JSON.stringify(log));
  } else if (process.env.NODE_ENV !== "test") {
    console.log(JSON.stringify(log));
  }
};
```

- [ ] **Step 3: Run tests, verify pass, commit**

```bash
git add api/src/middleware/ api/tests/middleware/
git commit -m "feat: add API middleware — auth, rate limiting, compression, cache headers, logging"
```

---

### Task 8b: Seed Routes + Periodic Module

**Files:**
- Create: `api/src/modules/system/seed-routes.ts`
- Create: `api/src/modules/periodic/conflict-counter.ts`
- Test: `api/tests/modules/system/seed-routes.test.ts`

The spec (section 4.7) defines dev-only seed endpoints. The periodic module (section 4.14) runs background tasks via `setInterval`.

- [ ] **Step 1: Implement seed routes**

```ts
// api/src/modules/system/seed-routes.ts
import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { seedAll } from "../../seed/seed-all";
import { apiError, success } from "../../helpers/response";

export const seedRoutes = new Hono();

seedRoutes.post("/run", async (c) => {
  if (process.env.NODE_ENV === "production") {
    return apiError(c, "UNAUTHORIZED", "Seed endpoint disabled in production", 403);
  }
  try {
    const results = await seedAll();
    return success(c, results);
  } catch (err: any) {
    return apiError(c, "INTERNAL_ERROR", err.message ?? "Seed failed", 500);
  }
});

seedRoutes.get("/status", async (c) => {
  const db = getDb();
  const collections = ["countries", "bases", "nonStateActors", "chokepoints",
    "elections", "tradeRoutes", "ports", "conflicts", "news", "countryColors"];

  const status: Record<string, { count: number; lastUpdated: string | null }> = {};
  for (const name of collections) {
    const col = db.collection(name);
    const count = await col.countDocuments();
    const latest = await col.findOne({}, { sort: { updatedAt: -1 }, projection: { updatedAt: 1 } });
    status[name] = {
      count,
      lastUpdated: latest?.updatedAt?.toISOString() ?? null,
    };
  }

  return success(c, status);
});
```

- [ ] **Step 2: Implement periodic conflict day counter**

```ts
// api/src/modules/periodic/conflict-counter.ts
import { getDb } from "../../infrastructure/mongo";
import { publishEvent } from "../../infrastructure/sse";

/** Increment dayCount on active conflicts based on startDate. Runs hourly. */
async function updateConflictDayCounts() {
  try {
    const col = getDb().collection("conflicts");
    const conflicts = await col.find({ status: "active" }).toArray();
    const now = new Date();

    for (const conflict of conflicts) {
      const dayCount = Math.floor((now.getTime() - new Date(conflict.startDate).getTime()) / (1000 * 60 * 60 * 24));
      if (dayCount !== conflict.dayCount) {
        await col.updateOne({ _id: conflict._id }, { $set: { dayCount, updatedAt: now } });
        await publishEvent("conflict-update", {
          id: conflict._id,
          dayCount,
          latestUpdate: conflict.latestUpdate,
        });
      }
    }
  } catch (err) {
    console.error("[periodic] Conflict day counter error:", err);
  }
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startConflictCounter() {
  // Run immediately, then every hour
  updateConflictDayCounts();
  interval = setInterval(updateConflictDayCounts, 60 * 60 * 1000);
  console.log("[periodic] Conflict day counter started (hourly)");
}

export function stopConflictCounter() {
  if (interval) clearInterval(interval);
  interval = null;
}
```

- [ ] **Step 3: Write tests, run, verify pass**

Test seed routes: POST /seed/run returns results in dev mode, returns 403 in production. GET /seed/status returns per-collection counts and lastUpdated.

- [ ] **Step 4: Commit**

```bash
git add api/src/modules/system/seed-routes.ts api/src/modules/periodic/conflict-counter.ts
git add api/tests/modules/system/seed-routes.test.ts
git commit -m "feat: add seed routes (dev-only) and periodic conflict day counter"
```

---

### Task 9: Mount All Routes in App Entry

**Files:**
- Modify: `api/src/index.ts`

- [ ] **Step 1: Update index.ts to mount all routers and middleware**

```ts
// api/src/index.ts — updated to mount all routes
import { Hono } from "hono";
import { connectMongo } from "./infrastructure/mongo";
import { connectRedis } from "./infrastructure/redis";
import { healthRoutes } from "./infrastructure/health";
import { createCorsMiddleware } from "./middleware/cors";
import { requestId } from "./middleware/request-id";
import { apiKeyAuth } from "./middleware/api-key";
import { rateLimit } from "./middleware/rate-limit";
import { cacheHeaders } from "./middleware/cache-headers";
import { compression } from "./middleware/compression";
import { requestLogger } from "./middleware/logger";

// Module routers
import { countriesRouter } from "./modules/reference/countries";
import { basesRouter } from "./modules/reference/bases";
import { nsaRouter } from "./modules/reference/nsa";
import { chokepointsRouter } from "./modules/reference/chokepoints";
import { electionsRouter } from "./modules/reference/elections";
import { tradeRoutesRouter } from "./modules/reference/trade-routes";
import { portsRouter } from "./modules/reference/ports";
import { conflictsRouter } from "./modules/reference/conflicts";
import { newsRouter } from "./modules/realtime/news";
import { sseRouter } from "./modules/realtime/sse";
import { bootstrapRouter } from "./modules/aggregate/bootstrap";
import { viewportRouter } from "./modules/aggregate/viewport";
import { searchRouter } from "./modules/aggregate/search";
import { compareRouter } from "./modules/aggregate/compare";
import { binaryLayersRouter } from "./modules/binary/layers";
import { seedRoutes } from "./modules/system/seed-routes";
import { startConflictCounter } from "./modules/periodic/conflict-counter";

const app = new Hono();

// Global middleware (order matters)
app.use("*", createCorsMiddleware());
app.use("*", requestId);
app.use("*", requestLogger);
app.use("*", compression);
app.use("/api/*", apiKeyAuth);
app.use("/api/*", rateLimit);
app.use("/api/*", cacheHeaders);

// Mount routes
const api = new Hono();
api.route("/health", healthRoutes);
api.route("/countries", countriesRouter);
api.route("/bases", basesRouter);
api.route("/nsa", nsaRouter);
api.route("/chokepoints", chokepointsRouter);
api.route("/elections", electionsRouter);
api.route("/trade-routes", tradeRoutesRouter);
api.route("/ports", portsRouter);
api.route("/conflicts", conflictsRouter);
api.route("/news", newsRouter);
api.route("/events", sseRouter);
api.route("/bootstrap", bootstrapRouter);
api.route("/viewport", viewportRouter);
api.route("/search", searchRouter);
api.route("/compare", compareRouter);
api.route("/layers", binaryLayersRouter);
api.route("/seed", seedRoutes);

app.route("/api/v1", api);

// Root
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
  console.log("[gambit] Routes: /api/v1/{countries,bases,nsa,chokepoints,elections,trade-routes,ports,conflicts,news,events/stream,bootstrap,viewport,search,compare,layers,seed}");

  // Start periodic tasks
  startConflictCounter();
}

start();

export default { port, fetch: app.fetch };
export { app };
```

- [ ] **Step 2: Run full test suite**

Run: `cd api && bun test`
Expected: All tests PASS

- [ ] **Step 3: Smoke test the running API**

Run: `cd api && bun src/index.ts &`
Then test each endpoint group:

```bash
curl http://localhost:3000/api/v1/health
curl http://localhost:3000/api/v1/countries?limit=3
curl http://localhost:3000/api/v1/bases?limit=3
curl http://localhost:3000/api/v1/bootstrap?slim=true | head -c 500
curl http://localhost:3000/api/v1/search?q=iran
curl http://localhost:3000/api/v1/compare?countries=US,IR,RU
curl http://localhost:3000/api/v1/layers/bases/binary --output /dev/null -w "%{http_code}"
```

- [ ] **Step 4: Commit**

```bash
git add api/src/index.ts
git commit -m "feat: mount all API routes with full middleware chain"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `cd api && bun test` — all tests pass
- [ ] `cd api && bun src/index.ts` — API starts and connects to MongoDB + Redis
- [ ] Reference endpoints return correct data with pagination, filtering, sparse fields
- [ ] `/bootstrap` returns all 10 data types in a single payload
- [ ] `/bootstrap?slim=true` returns minimal fields
- [ ] `/viewport?bbox=...&layers=bases` returns geospatial results
- [ ] `/search?q=iran` returns cross-collection results
- [ ] `/compare?countries=US,IR,RU` returns enriched profiles
- [ ] `/events/stream` opens an SSE connection
- [ ] `/layers/bases/binary` returns `application/octet-stream`
- [ ] Rate limiting returns 429 after exceeding limit
- [ ] API key required in production mode
- [ ] Response headers include `X-Request-Id`, `Cache-Control`
- [ ] Structured JSON logs in console
- [ ] `POST /seed/run` triggers re-seed in dev mode, returns 403 in production
- [ ] `GET /seed/status` returns per-collection counts and freshness
- [ ] Conflict day counter runs hourly, publishes SSE `conflict-update` events
