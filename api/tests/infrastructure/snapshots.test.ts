import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../src/infrastructure/redis";
import { seedAll } from "../../src/seed/seed-all";
import {
  captureSnapshot,
  getSnapshotAt,
  getSnapshotRange,
  ensureSnapshotIndexes,
} from "../../src/infrastructure/snapshots";

describe("Temporal snapshots", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await getDb().collection("snapshots").deleteMany({});
    await seedAll();
    await ensureSnapshotIndexes();
  }, 30000);

  afterAll(async () => {
    await getDb().collection("snapshots").deleteMany({});
    await disconnectRedis();
    await disconnectMongo();
  });

  it("captureSnapshot stores mutable state", async () => {
    await captureSnapshot("scheduled");

    const snapshots = await getDb().collection("snapshots").find({}).toArray();
    expect(snapshots.length).toBe(1);

    const snap = snapshots[0];
    expect(snap.trigger).toBe("scheduled");
    expect(snap.timestamp).toBeDefined();
    expect(snap.conflicts).toBeArray();
    expect(snap.conflicts.length).toBeGreaterThan(0);
    expect(snap.chokepoints).toBeArray();
    expect(snap.chokepoints.length).toBeGreaterThan(0);
    expect(snap.countries).toBeArray();
    expect(snap.countries.length).toBeGreaterThan(0);
    expect(snap.nsa).toBeArray();
    expect(snap.nsa.length).toBeGreaterThan(0);

    // Verify only mutable fields are captured (not full docs)
    const country = snap.countries[0];
    expect(country._id).toBeDefined();
    expect(country.risk).toBeDefined();
    expect(country.name).toBeUndefined(); // not a mutable field
    expect(country.lat).toBeUndefined();  // not a mutable field
  });

  it("captureSnapshot with event trigger stores detail", async () => {
    await captureSnapshot("event", "chokepoint-status-change:hormuz");

    const snap = await getDb().collection("snapshots")
      .findOne({ trigger: "event" });
    expect(snap).toBeDefined();
    expect(snap!.triggerDetail).toBe("chokepoint-status-change:hormuz");
  });

  it("getSnapshotAt returns most recent snapshot before time", async () => {
    const future = new Date(Date.now() + 60000);
    const snap = await getSnapshotAt(future);
    expect(snap).toBeDefined();
    expect(snap!.conflicts).toBeArray();
  });

  it("getSnapshotAt returns null if no snapshots before time", async () => {
    const past = new Date("2020-01-01");
    const snap = await getSnapshotAt(past);
    expect(snap).toBeNull();
  });

  it("getSnapshotRange returns snapshots in time window", async () => {
    const from = new Date(Date.now() - 60000);
    const to = new Date(Date.now() + 60000);
    const snapshots = await getSnapshotRange(from, to);
    expect(snapshots.length).toBe(2); // scheduled + event
    // Sorted ascending
    expect(snapshots[0].timestamp.getTime()).toBeLessThanOrEqual(
      snapshots[1].timestamp.getTime(),
    );
  });
});
