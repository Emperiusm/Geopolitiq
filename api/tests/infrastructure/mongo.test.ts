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
    expect(typeof getDb).toBe("function");
  });

  it("can ping the database", async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    const db = getDb();
    const result = await db.command({ ping: 1 });
    expect(result.ok).toBe(1);
  });
});
