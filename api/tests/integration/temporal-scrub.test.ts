import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { connectRedis, disconnectRedis } from "../../src/infrastructure/redis";
import { seedAll } from "../../src/seed/seed-all";
import {
  captureSnapshot,
  getSnapshotAt,
  ensureSnapshotIndexes,
} from "../../src/infrastructure/snapshots";

describe("Temporal scrub integration", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await connectRedis("redis://localhost:6380");
    await getDb().collection("snapshots").deleteMany({});
    await seedAll();
    await ensureSnapshotIndexes();
  }, 30000);

  afterAll(async () => {
    // Restore conflict to original state in case of test failure
    await getDb().collection("conflicts").updateOne(
      { _id: "us-iran-war" },
      { $set: { status: "active" } },
    );
    await getDb().collection("snapshots").deleteMany({});
    await disconnectRedis();
    await disconnectMongo();
  });

  it("returns historical state after mutation", async () => {
    // Capture baseline snapshot
    await captureSnapshot("scheduled");
    const beforeMutation = new Date();

    // Wait a tick so timestamps differ
    await new Promise((r) => setTimeout(r, 50));

    // Mutate a conflict status
    await getDb().collection("conflicts").updateOne(
      { _id: "us-iran-war" },
      { $set: { status: "ceasefire" } },
    );

    // Capture post-mutation snapshot
    await captureSnapshot("event", "test-ceasefire");

    // Query historical state (before mutation)
    const oldSnapshot = await getSnapshotAt(beforeMutation);
    expect(oldSnapshot).toBeDefined();
    const iranConflict = oldSnapshot!.conflicts.find((c: any) => c._id === "us-iran-war");
    expect(iranConflict!.status).toBe("active"); // was active before mutation

    // Query current state (after mutation)
    const newSnapshot = await getSnapshotAt(new Date());
    expect(newSnapshot).toBeDefined();
    const iranConflictNew = newSnapshot!.conflicts.find((c: any) => c._id === "us-iran-war");
    expect(iranConflictNew!.status).toBe("ceasefire"); // now ceasefire

    // Restore original state
    await getDb().collection("conflicts").updateOne(
      { _id: "us-iran-war" },
      { $set: { status: "active" } },
    );
  });
});
