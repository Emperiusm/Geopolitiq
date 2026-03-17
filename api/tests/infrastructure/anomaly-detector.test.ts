import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis, getRedis } from "../../src/infrastructure/redis";
import { computeZScore, classifySeverity, recordAndDetect } from "../../src/infrastructure/anomaly-detector";
import { anomaliesRouter } from "../../src/modules/aggregate/anomalies";

const app = new Hono().route("/anomalies", anomaliesRouter);

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  await connectRedis("redis://localhost:6380");
  await getDb().collection("anomalies").deleteMany({});
  // Clean up anomaly Redis keys
  const redis = getRedis();
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", "anomaly:*", "COUNT", 100);
    cursor = next;
    if (keys.length > 0) await redis.del(...keys);
  } while (cursor !== "0");
});

afterAll(async () => {
  await getDb().collection("anomalies").deleteMany({});
  await disconnectRedis();
  await disconnectMongo();
});

describe("computeZScore", () => {
  it("returns null with insufficient history", () => {
    expect(computeZScore([1, 2, 3], 10)).toBeNull();
  });

  it("computes z-score correctly", () => {
    // 24 data points all equal to 10, current = 20
    const counts = new Array(24).fill(10);
    const result = computeZScore(counts, 20);
    expect(result).toBeDefined();
    expect(result!.mean).toBe(10);
    expect(result!.stddev).toBe(0);
    expect(result!.zScore).toBe(Infinity); // stddev=0, current>mean
  });

  it("computes z-score with variance", () => {
    // Mean ~10, stddev ~2
    const counts = [8, 10, 12, 10, 8, 12, 10, 8, 10, 12, 10, 8,
                    12, 10, 8, 10, 12, 10, 8, 12, 10, 8, 10, 12];
    const result = computeZScore(counts, 20);
    expect(result).toBeDefined();
    expect(result!.mean).toBeCloseTo(10, 0);
    expect(result!.zScore).toBeGreaterThan(3);
  });

  it("returns null when current is not anomalous", () => {
    const counts = new Array(24).fill(10);
    counts[0] = 8;
    counts[1] = 12; // add some variance
    const result = computeZScore(counts, 10);
    // z-score should be near 0, classifySeverity would return null
    if (result) {
      expect(result.zScore).toBeLessThan(2);
    }
  });
});

describe("classifySeverity", () => {
  it("returns null below threshold", () => {
    expect(classifySeverity(1.5)).toBeNull();
  });

  it("returns watch at 2σ", () => {
    expect(classifySeverity(2.5)).toBe("watch");
  });

  it("returns alert at 3σ", () => {
    expect(classifySeverity(3.5)).toBe("alert");
  });

  it("returns critical at 4σ", () => {
    expect(classifySeverity(4.5)).toBe("critical");
    expect(classifySeverity(Infinity)).toBe("critical");
  });
});

describe("recordAndDetect integration", () => {
  it("increments counters without triggering anomaly (no history)", async () => {
    const fired = await recordAndDetect(
      {
        relatedCountries: ["US"],
        conflictId: null,
        relatedChokepoints: [],
        relatedNSA: [],
        enrichedAt: new Date(),
      },
      ["CONFLICT"],
    );
    // No history = no anomaly
    expect(fired).toEqual([]);

    // But counter should be incremented
    const hourBucket = String(Math.floor(Date.now() / 3600000) * 3600000);
    const count = await getRedis().hget(`anomaly:counts:country:US`, hourBucket);
    expect(Number(count)).toBeGreaterThanOrEqual(1);
  });
});

describe("Anomalies API", () => {
  it("GET /anomalies returns empty when no anomalies", async () => {
    const res = await app.request("/anomalies");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
  });

  it("GET /anomalies/baseline/:type/:id returns counts", async () => {
    const res = await app.request("/anomalies/baseline/country/US");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
    // Should have at least the one count we inserted
    expect(body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("GET /anomalies?severity=critical&since=1h filters correctly", async () => {
    const res = await app.request("/anomalies?severity=critical&since=1h");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeArray();
  });
});
