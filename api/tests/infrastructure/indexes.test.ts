import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { ensureAuthIndexes } from "../../src/infrastructure/indexes";

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
});

afterAll(async () => {
  await disconnectMongo();
});

describe("ensureAuthIndexes", () => {
  it("creates all required indexes without errors", async () => {
    await ensureAuthIndexes();
  });

  it("creates unique email index on users", async () => {
    const db = getDb();
    const indexes = await db.collection("users").indexes();
    const emailIdx = indexes.find((i: any) =>
      i.key?.email !== undefined && i.unique === true,
    );
    expect(emailIdx).toBeTruthy();
  });

  it("creates TTL index on authCodes", async () => {
    const db = getDb();
    const indexes = await db.collection("authCodes").indexes();
    const ttlIdx = indexes.find((i: any) =>
      i.key?.expiresAt !== undefined && i.expireAfterSeconds !== undefined,
    );
    expect(ttlIdx).toBeTruthy();
  });

  it("creates TTL index on sessions", async () => {
    const db = getDb();
    const indexes = await db.collection("sessions").indexes();
    const ttlIdx = indexes.find((i: any) =>
      i.key?.absoluteExpiresAt !== undefined && i.expireAfterSeconds !== undefined,
    );
    expect(ttlIdx).toBeTruthy();
  });

  it("creates unique keyHash index on apiKeys", async () => {
    const db = getDb();
    const indexes = await db.collection("apiKeys").indexes();
    const hashIdx = indexes.find((i: any) =>
      i.key?.keyHash !== undefined && i.unique === true,
    );
    expect(hashIdx).toBeTruthy();
  });

  it("is idempotent — runs twice without error", async () => {
    await ensureAuthIndexes();
    await ensureAuthIndexes();
  });
});
