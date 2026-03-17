import { describe, it, expect, beforeAll } from "bun:test";
import {
  signAccessToken,
  verifyAccessToken,
  hashToken,
  generateRefreshToken,
  generateSlug,
  roleLevel,
  generateAuthCode,
  logAudit,
} from "../../src/infrastructure/auth";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  await getDb().collection("auditEvents").deleteMany({});
});

describe("JWT", () => {
  const payload = {
    userId: "u1",
    role: "member" as const,
    teamId: "t1",
    platformRole: "user" as const,
    roleVersion: 0,
  };

  it("signs and verifies an access token", async () => {
    const token = await signAccessToken(payload);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const decoded = await verifyAccessToken(token);
    expect(decoded.userId).toBe("u1");
    expect(decoded.role).toBe("member");
    expect(decoded.teamId).toBe("t1");
    expect(decoded.platformRole).toBe("user");
    expect(decoded.roleVersion).toBe(0);
  });

  it("rejects expired tokens", async () => {
    const token = await signAccessToken(payload, "0s");
    await new Promise((r) => setTimeout(r, 50));
    await expect(verifyAccessToken(token)).rejects.toThrow();
  });

  it("rejects tampered tokens", async () => {
    const token = await signAccessToken(payload);
    const tampered = token.slice(0, -5) + "XXXXX";
    await expect(verifyAccessToken(tampered)).rejects.toThrow();
  });
});

describe("hashing", () => {
  it("produces consistent SHA-256 hex hashes", () => {
    const hash1 = hashToken("my-secret-token");
    const hash2 = hashToken("my-secret-token");
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it("produces different hashes for different inputs", () => {
    expect(hashToken("a")).not.toBe(hashToken("b"));
  });
});

describe("generateRefreshToken", () => {
  it("returns a 64-char hex string", () => {
    const token = generateRefreshToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates unique tokens", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
  });
});

describe("generateAuthCode", () => {
  it("returns a UUID-format string", () => {
    const code = generateAuthCode();
    expect(code).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});

describe("generateSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(generateSlug("John Doe")).toBe("john-doe");
  });

  it("strips non-alphanumeric characters", () => {
    expect(generateSlug("Hello, World!")).toBe("hello-world");
  });

  it("collapses multiple hyphens", () => {
    expect(generateSlug("a - - b")).toBe("a-b");
  });

  it("trims leading/trailing hyphens", () => {
    expect(generateSlug(" --test-- ")).toBe("test");
  });

  it("handles unicode by stripping diacritics", () => {
    expect(generateSlug("José García")).toBe("jose-garcia");
  });
});

describe("roleLevel", () => {
  it("assigns correct hierarchy values", () => {
    expect(roleLevel("viewer")).toBe(0);
    expect(roleLevel("member")).toBe(1);
    expect(roleLevel("admin")).toBe(2);
    expect(roleLevel("owner")).toBe(3);
  });
});

describe("logAudit", () => {
  it("inserts an audit event into MongoDB", async () => {
    await logAudit({
      teamId: "t1",
      actorId: "u1",
      action: "user.login",
      ip: "127.0.0.1",
      plan: "free",
    });

    const db = getDb();
    const event = await db.collection("auditEvents").findOne({
      teamId: "t1",
      action: "user.login",
    });
    expect(event).not.toBeNull();
    expect(event!.actorId).toBe("u1");
    expect(event!.expiresAt).toBeInstanceOf(Date);
    const daysDiff = (event!.expiresAt.getTime() - event!.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(90, 0);
  });

  it("sets 365-day expiry for pro plan", async () => {
    await logAudit({
      teamId: "t2",
      actorId: "u2",
      action: "team.updated",
      ip: "127.0.0.1",
      plan: "pro",
    });

    const db = getDb();
    const event = await db.collection("auditEvents").findOne({
      teamId: "t2",
      action: "team.updated",
    });
    const daysDiff = (event!.expiresAt.getTime() - event!.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(365, 0);
  });
});
