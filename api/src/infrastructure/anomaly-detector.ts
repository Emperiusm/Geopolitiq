import { getRedis, isRedisConnected } from "./redis";
import { getDb } from "./mongo";
import { publishEvent } from "./sse";
import { captureSnapshot } from "./snapshots";
import type { EnrichedFields } from "./enrichment";

export type AnomalySeverity = "watch" | "alert" | "critical";

export interface AnomalySignal {
  entityType: string;
  entityId: string;
  currentCount: number;
  baselineMean: number;
  baselineStddev: number;
  zScore: number;
  severity: AnomalySeverity;
  hourBucket: string;
}

const WATCH_THRESHOLD = 2;
const ALERT_THRESHOLD = 3;
const CRITICAL_THRESHOLD = 4;
const MIN_HISTORY_HOURS = 24;

function getHourBucket(now = Date.now()): string {
  return String(Math.floor(now / 3600000) * 3600000);
}

async function incrementCounter(type: string, id: string, hourBucket: string): Promise<void> {
  await getRedis().hincrby(`anomaly:counts:${type}:${id}`, hourBucket, 1);
}

export function computeZScore(counts: number[], current: number): {
  mean: number;
  stddev: number;
  zScore: number;
} | null {
  if (counts.length < MIN_HISTORY_HOURS) return null;

  const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
  const variance = counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / counts.length;
  const stddev = Math.sqrt(variance);

  if (stddev === 0) {
    if (current > mean) return { mean, stddev: 0, zScore: Infinity };
    return null;
  }

  const zScore = (current - mean) / stddev;
  return { mean, stddev, zScore };
}

export function classifySeverity(zScore: number): AnomalySeverity | null {
  if (zScore >= CRITICAL_THRESHOLD) return "critical";
  if (zScore >= ALERT_THRESHOLD) return "alert";
  if (zScore >= WATCH_THRESHOLD) return "watch";
  return null;
}

async function checkAnomaly(
  entityType: string,
  entityId: string,
  currentHour: string,
): Promise<AnomalySignal | null> {
  const redis = getRedis();
  const key = `anomaly:counts:${entityType}:${entityId}`;
  const allCounts = await redis.hgetall(key);

  const currentCount = Number(allCounts[currentHour] ?? 0);

  const historicalCounts: number[] = [];
  for (const [hour, count] of Object.entries(allCounts)) {
    if (hour !== currentHour) {
      historicalCounts.push(Number(count));
    }
  }

  const result = computeZScore(historicalCounts, currentCount);
  if (!result) return null;

  const severity = classifySeverity(result.zScore);
  if (!severity) return null;

  return {
    entityType,
    entityId,
    currentCount,
    baselineMean: result.mean,
    baselineStddev: result.stddev,
    zScore: result.zScore,
    severity,
    hourBucket: currentHour,
  };
}

/** Record entity mentions and detect anomalies. Called after NLP enrichment. */
export async function recordAndDetect(
  enriched: EnrichedFields,
  tags: string[],
): Promise<AnomalySignal[]> {
  if (!isRedisConnected()) return [];

  const hourBucket = getHourBucket();
  const anomalies: AnomalySignal[] = [];

  // Increment counters for all detected entities
  for (const iso2 of enriched.relatedCountries) {
    await incrementCounter("country", iso2, hourBucket);
    const signal = await checkAnomaly("country", iso2, hourBucket);
    if (signal) anomalies.push(signal);
  }

  if (enriched.conflictId) {
    await incrementCounter("conflict", enriched.conflictId, hourBucket);
    const signal = await checkAnomaly("conflict", enriched.conflictId, hourBucket);
    if (signal) anomalies.push(signal);
  }

  for (const cp of enriched.relatedChokepoints) {
    await incrementCounter("chokepoint", cp, hourBucket);
    const signal = await checkAnomaly("chokepoint", cp, hourBucket);
    if (signal) anomalies.push(signal);
  }

  for (const tag of tags) {
    await incrementCounter("tag", tag, hourBucket);
    const signal = await checkAnomaly("tag", tag, hourBucket);
    if (signal) anomalies.push(signal);
  }

  // Deduplicate — only fire each anomaly once per hour per entity
  const redis = getRedis();
  const fired: AnomalySignal[] = [];

  for (const anomaly of anomalies) {
    const dedupeKey = `anomaly:fired:${anomaly.entityType}:${anomaly.entityId}:${anomaly.hourBucket}`;
    const alreadyFired = await redis.get(dedupeKey);
    if (alreadyFired) continue;

    await redis.set(dedupeKey, "1", "EX", 3600);

    await getDb().collection("anomalies").insertOne({
      ...anomaly,
      detectedAt: new Date(),
    });

    await publishEvent("anomaly", {
      entityType: anomaly.entityType,
      entityId: anomaly.entityId,
      severity: anomaly.severity,
      zScore: Math.round(anomaly.zScore * 10) / 10,
      currentCount: anomaly.currentCount,
      baselineMean: Math.round(anomaly.baselineMean * 10) / 10,
    });

    if (anomaly.severity !== "watch") {
      await captureSnapshot(
        "event",
        `anomaly:${anomaly.severity}:${anomaly.entityType}:${anomaly.entityId}`,
      );
    }

    fired.push(anomaly);
  }

  return fired;
}
