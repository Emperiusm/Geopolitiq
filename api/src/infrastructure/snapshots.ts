import { getDb } from "./mongo";
import { publishEvent } from "./sse";
import type { TemporalSnapshot } from "../types";

const COLLECTION = "snapshots";

export async function ensureSnapshotIndexes(): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTION).createIndex({ timestamp: -1 });
}

export async function captureSnapshot(
  trigger: "scheduled" | "event",
  triggerDetail?: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();

  const [conflicts, chokepoints, countries, nsa] = await Promise.all([
    db.collection("conflicts")
      .find({}, { projection: { _id: 1, status: 1, dayCount: 1, casualties: 1 } })
      .toArray(),
    db.collection("chokepoints")
      .find({}, { projection: { _id: 1, status: 1 } })
      .toArray(),
    db.collection("countries")
      .find({}, { projection: { _id: 1, risk: 1, leader: 1, tags: 1 } })
      .toArray(),
    db.collection("nonStateActors")
      .find({}, { projection: { _id: 1, status: 1, zones: 1 } })
      .toArray(),
  ]);

  const snapshot: TemporalSnapshot = {
    timestamp: now,
    trigger,
    triggerDetail,
    conflicts,
    chokepoints,
    countries,
    nsa,
  };

  await db.collection(COLLECTION).insertOne(snapshot);
  await publishEvent("snapshot", { timestamp: now.toISOString(), trigger, triggerDetail });
}

export async function getSnapshotAt(at: Date): Promise<TemporalSnapshot | null> {
  const db = getDb();
  return db.collection<TemporalSnapshot>(COLLECTION)
    .findOne(
      { timestamp: { $lte: at } },
      { sort: { timestamp: -1 } },
    );
}

export async function getSnapshotRange(
  from: Date,
  to: Date,
  maxResults = 100,
): Promise<TemporalSnapshot[]> {
  const db = getDb();
  return db.collection<TemporalSnapshot>(COLLECTION)
    .find({ timestamp: { $gte: from, $lte: to } })
    .sort({ timestamp: 1 })
    .limit(maxResults)
    .toArray();
}
