import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { runAccountCleanup } from "../../src/modules/periodic/account-cleanup";
import { randomUUID } from "crypto";

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
});

beforeEach(async () => {
  const db = getDb();
  await db.collection("users").deleteMany({});
  await db.collection("teams").deleteMany({});
  await db.collection("sessions").deleteMany({});
  await db.collection("apiKeys").deleteMany({});
  await db.collection("userPreferences").deleteMany({});
  await db.collection("notificationPreferences").deleteMany({});
  await db.collection("userSettings").deleteMany({});
});

afterAll(async () => {
  await disconnectMongo();
});

describe("runAccountCleanup", () => {
  it("hard-deletes users past their deletedAt date", async () => {
    const db = getDb();
    const userId = randomUUID();
    const teamId = randomUUID();

    await db.collection("users").insertOne({
      _id: userId, email: "delete@test.com", name: "Delete Me",
      role: "owner", platformRole: "user", teamId,
      roleVersion: 0, providers: [], customAvatar: false,
      lastLoginAt: new Date(),
      deletionRequestedAt: new Date(Date.now() - 31 * 86400000),
      deletedAt: new Date(Date.now() - 1 * 86400000),
      createdAt: new Date(), updatedAt: new Date(),
    });
    await db.collection("teams").insertOne({
      _id: teamId, name: "Gone", slug: "gone", plan: "free",
      ownerId: userId, watchlist: [], inviteCodes: [],
      createdAt: new Date(), updatedAt: new Date(),
    });
    await db.collection("sessions").insertOne({ _id: randomUUID(), userId, teamId, refreshTokenHash: "x", device: { browser: "Chrome", os: "Windows", raw: "" }, ip: "1", isNewDevice: false, createdAt: new Date(), lastRefreshedAt: new Date(), expiresAt: new Date(), absoluteExpiresAt: new Date() });
    await db.collection("apiKeys").insertOne({ _id: randomUUID(), keyHash: "x", keyPrefix: "gbt_", userId, teamId, name: "k", scope: "read", disabled: true, lastUsedAt: null, createdAt: new Date() });

    const count = await runAccountCleanup();
    expect(count).toBe(1);

    expect(await db.collection("users").findOne({ _id: userId })).toBeNull();
    expect(await db.collection("sessions").findOne({ userId })).toBeNull();
    expect(await db.collection("apiKeys").findOne({ userId })).toBeNull();
  });

  it("does not delete users before their deletedAt date", async () => {
    const db = getDb();
    const userId = randomUUID();

    await db.collection("users").insertOne({
      _id: userId, email: "notyet@test.com", name: "Not Yet",
      role: "owner", platformRole: "user", teamId: "t1",
      roleVersion: 0, providers: [], customAvatar: false,
      lastLoginAt: new Date(),
      deletionRequestedAt: new Date(),
      deletedAt: new Date(Date.now() + 30 * 86400000),
      createdAt: new Date(), updatedAt: new Date(),
    });

    const count = await runAccountCleanup();
    expect(count).toBe(0);
    expect(await db.collection("users").findOne({ _id: userId })).not.toBeNull();
  });
});
