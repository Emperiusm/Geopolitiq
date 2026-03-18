import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import type { AppVariables } from "../../src/types/auth";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { signAccessToken, hashToken } from "../../src/infrastructure/auth";
import { adminRoutes } from "../../src/modules/system/admin-routes";
import { randomUUID } from "crypto";

const BASE_URL = "http://localhost";

function createApp() {
  const app = new Hono<{ Variables: AppVariables }>();

  // Add platform admin middleware
  app.use("/*", async (c, next) => {
    const token = c.req.header("Authorization")?.replace("Bearer ", "");
    if (token) {
      try {
        const payload = token.split(".")[1];
        const decoded = JSON.parse(Buffer.from(payload, "base64").toString());
        c.set("userId", decoded.userId);
        c.set("teamId", decoded.teamId);
        c.set("role", decoded.role);
        c.set("platformRole", decoded.platformRole);
        c.set("roleVersion", decoded.roleVersion);
        c.set("authMethod", "jwt");
      } catch (e) {
        // Invalid token
      }
    }
    return next();
  });

  app.route("/admin", adminRoutes);
  return app;
}

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
  const db = getDb();
  await db.collection("users").deleteMany({});
  await db.collection("teams").deleteMany({});
  await db.collection("recoveryTokens").deleteMany({});
  await db.collection("auditEvents").deleteMany({});
});

afterAll(async () => {
  const db = getDb();
  await db.collection("users").deleteMany({});
  await db.collection("teams").deleteMany({});
  await db.collection("recoveryTokens").deleteMany({});
  await db.collection("auditEvents").deleteMany({});
  await disconnectMongo();
});

describe("Admin Routes", () => {
  describe("GET /admin/users — list all users with platform admin", () => {
    it("lists users with pagination and search", async () => {
      const db = getDb();
      const adminUserId = randomUUID();
      const teamId = randomUUID();

      // Create admin user
      await db.collection("users").insertOne({
        _id: adminUserId,
        email: "admin@example.com",
        name: "Admin User",
        customAvatar: false,
        role: "owner",
        platformRole: "admin",
        teamId,
        roleVersion: 0,
        providers: [
          {
            provider: "github",
            providerId: "admin-gh-1",
            email: "admin@example.com",
            verified: true,
            linkedAt: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create test users
      const user1Id = randomUUID();
      const user2Id = randomUUID();
      const user3Id = randomUUID();

      await db.collection("users").insertMany([
        {
          _id: user1Id,
          email: "alice@example.com",
          name: "Alice User",
          customAvatar: false,
          role: "member",
          platformRole: "user",
          teamId: randomUUID(),
          roleVersion: 0,
          providers: [
            {
              provider: "github",
              providerId: "alice-gh-1",
              email: "alice@example.com",
              verified: true,
              linkedAt: new Date(),
            },
          ],
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: user2Id,
          email: "bob@example.com",
          name: "Bob User",
          customAvatar: false,
          role: "member",
          platformRole: "user",
          teamId: randomUUID(),
          roleVersion: 0,
          providers: [
            {
              provider: "github",
              providerId: "bob-gh-1",
              email: "bob@example.com",
              verified: true,
              linkedAt: new Date(),
            },
          ],
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: user3Id,
          email: "charlie@example.com",
          name: "Charlie User",
          customAvatar: false,
          role: "member",
          platformRole: "user",
          teamId: randomUUID(),
          roleVersion: 0,
          providers: [
            {
              provider: "github",
              providerId: "charlie-gh-1",
              email: "charlie@example.com",
              verified: true,
              linkedAt: new Date(),
            },
          ],
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      // Create access token for admin
      const token = await signAccessToken({
        userId: adminUserId,
        role: "owner",
        teamId,
        platformRole: "admin",
        roleVersion: 0,
      });

      const app = createApp();
      const res = await app.request("/admin/users?limit=2&offset=0", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeArray();
      expect(body.data.length).toBe(2);
      expect(body.meta.total).toBeGreaterThanOrEqual(4);
      expect(body.meta.limit).toBe(2);
      expect(body.meta.offset).toBe(0);
      expect(body.data[0].roleVersion).toBeUndefined();
    });

    it("searches users by name", async () => {
      const db = getDb();
      const adminUserId = randomUUID();
      const teamId = randomUUID();

      // Create admin user
      await db.collection("users").insertOne({
        _id: adminUserId,
        email: "admin2@example.com",
        name: "Admin Search",
        customAvatar: false,
        role: "owner",
        platformRole: "admin",
        teamId,
        roleVersion: 0,
        providers: [
          {
            provider: "github",
            providerId: "admin2-gh-1",
            email: "admin2@example.com",
            verified: true,
            linkedAt: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create test users
      await db.collection("users").insertMany([
        {
          _id: randomUUID(),
          email: "alice2@example.com",
          name: "Alice Search",
          customAvatar: false,
          role: "member",
          platformRole: "user",
          teamId: randomUUID(),
          roleVersion: 0,
          providers: [
            {
              provider: "github",
              providerId: "alice2-gh-1",
              email: "alice2@example.com",
              verified: true,
              linkedAt: new Date(),
            },
          ],
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: randomUUID(),
          email: "bob2@example.com",
          name: "Bob Other",
          customAvatar: false,
          role: "member",
          platformRole: "user",
          teamId: randomUUID(),
          roleVersion: 0,
          providers: [
            {
              provider: "github",
              providerId: "bob2-gh-1",
              email: "bob2@example.com",
              verified: true,
              linkedAt: new Date(),
            },
          ],
          lastLoginAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const token = await signAccessToken({
        userId: adminUserId,
        role: "owner",
        teamId,
        platformRole: "admin",
        roleVersion: 0,
      });

      const app = createApp();
      const res = await app.request("/admin/users?search=Alice", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeArray();
      expect(body.data.some((u: any) => u.name === "Alice Search")).toBe(true);
    });

    it("rejects non-admin with 403", async () => {
      const db = getDb();
      const userId = randomUUID();
      const teamId = randomUUID();

      await db.collection("users").insertOne({
        _id: userId,
        email: "user@example.com",
        name: "Regular User",
        customAvatar: false,
        role: "member",
        platformRole: "user",
        teamId,
        roleVersion: 0,
        providers: [
          {
            provider: "github",
            providerId: "user-gh-1",
            email: "user@example.com",
            verified: true,
            linkedAt: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = await signAccessToken({
        userId,
        role: "member",
        teamId,
        platformRole: "user",
        roleVersion: 0,
      });

      const app = createApp();
      const res = await app.request("/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("GET /admin/teams — list all teams with platform admin", () => {
    it("lists teams with pagination and search", async () => {
      const db = getDb();
      const adminUserId = randomUUID();
      const teamId = randomUUID();

      // Create admin user
      await db.collection("users").insertOne({
        _id: adminUserId,
        email: "admin3@example.com",
        name: "Admin Teams",
        customAvatar: false,
        role: "owner",
        platformRole: "admin",
        teamId,
        roleVersion: 0,
        providers: [
          {
            provider: "github",
            providerId: "admin3-gh-1",
            email: "admin3@example.com",
            verified: true,
            linkedAt: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create test teams
      const team1Id = randomUUID();
      const team2Id = randomUUID();
      const team3Id = randomUUID();

      await db.collection("teams").insertMany([
        {
          _id: team1Id,
          name: "Team Alpha",
          slug: "team-alpha",
          plan: "free",
          ownerId: randomUUID(),
          watchlist: [],
          inviteCodes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: team2Id,
          name: "Team Beta",
          slug: "team-beta",
          plan: "pro",
          ownerId: randomUUID(),
          watchlist: [],
          inviteCodes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: team3Id,
          name: "Team Gamma",
          slug: "team-gamma",
          plan: "free",
          ownerId: randomUUID(),
          watchlist: [],
          inviteCodes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const token = await signAccessToken({
        userId: adminUserId,
        role: "owner",
        teamId,
        platformRole: "admin",
        roleVersion: 0,
      });

      const app = createApp();
      const res = await app.request("/admin/teams?limit=2&offset=0", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeArray();
      expect(body.data.length).toBe(2);
      expect(body.meta.total).toBeGreaterThanOrEqual(3);
      expect(body.meta.limit).toBe(2);
      expect(body.meta.offset).toBe(0);
    });

    it("searches teams by name", async () => {
      const db = getDb();
      const adminUserId = randomUUID();
      const teamId = randomUUID();

      // Create admin user
      await db.collection("users").insertOne({
        _id: adminUserId,
        email: "admin4@example.com",
        name: "Admin Search Teams",
        customAvatar: false,
        role: "owner",
        platformRole: "admin",
        teamId,
        roleVersion: 0,
        providers: [
          {
            provider: "github",
            providerId: "admin4-gh-1",
            email: "admin4@example.com",
            verified: true,
            linkedAt: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create test teams
      await db.collection("teams").insertMany([
        {
          _id: randomUUID(),
          name: "Acme Corp",
          slug: "acme-corp",
          plan: "free",
          ownerId: randomUUID(),
          watchlist: [],
          inviteCodes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          _id: randomUUID(),
          name: "Beta Inc",
          slug: "beta-inc",
          plan: "free",
          ownerId: randomUUID(),
          watchlist: [],
          inviteCodes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const token = await signAccessToken({
        userId: adminUserId,
        role: "owner",
        teamId,
        platformRole: "admin",
        roleVersion: 0,
      });

      const app = createApp();
      const res = await app.request("/admin/teams?search=acme", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeArray();
      expect(body.data.some((t: any) => t.name === "Acme Corp")).toBe(true);
    });
  });

  describe("POST /admin/recovery — send recovery email", () => {
    it("creates recovery token and sends email", async () => {
      const db = getDb();
      const adminUserId = randomUUID();
      const adminTeamId = randomUUID();
      const userId = randomUUID();
      const userTeamId = randomUUID();

      // Create admin user
      await db.collection("users").insertOne({
        _id: adminUserId,
        email: "admin5@example.com",
        name: "Admin Recovery",
        customAvatar: false,
        role: "owner",
        platformRole: "admin",
        teamId: adminTeamId,
        roleVersion: 0,
        providers: [
          {
            provider: "github",
            providerId: "admin5-gh-1",
            email: "admin5@example.com",
            verified: true,
            linkedAt: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create target user
      const targetEmail = "recover@example.com";
      await db.collection("users").insertOne({
        _id: userId,
        email: targetEmail,
        name: "Recovery Target",
        customAvatar: false,
        role: "member",
        platformRole: "user",
        teamId: userTeamId,
        roleVersion: 0,
        providers: [
          {
            provider: "github",
            providerId: "recovery-gh-1",
            email: targetEmail,
            verified: true,
            linkedAt: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = await signAccessToken({
        userId: adminUserId,
        role: "owner",
        teamId: adminTeamId,
        platformRole: "admin",
        roleVersion: 0,
      });

      const app = createApp();
      const res = await app.request("/admin/recovery", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: targetEmail }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toBeDefined();
      expect(body.data.message).toContain("Recovery email sent");
      expect(body.data.expiresAt).toBeDefined();

      // Verify recovery token was created
      const recoveryToken = await db.collection("recoveryTokens").findOne({ userId });
      expect(recoveryToken).toBeDefined();
      expect(recoveryToken!.expiresAt).toBeDefined();
      expect(recoveryToken!.hash).toBeDefined();

      // Verify audit log was created
      const auditLog = await db.collection("auditEvents").findOne({
        action: "user.recovery_initiated",
        target: { type: "user", id: userId },
      });
      expect(auditLog).toBeDefined();
    });

    it("returns 404 if user not found", async () => {
      const db = getDb();
      const adminUserId = randomUUID();
      const adminTeamId = randomUUID();

      // Create admin user
      await db.collection("users").insertOne({
        _id: adminUserId,
        email: "admin6@example.com",
        name: "Admin NotFound",
        customAvatar: false,
        role: "owner",
        platformRole: "admin",
        teamId: adminTeamId,
        roleVersion: 0,
        providers: [
          {
            provider: "github",
            providerId: "admin6-gh-1",
            email: "admin6@example.com",
            verified: true,
            linkedAt: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = await signAccessToken({
        userId: adminUserId,
        role: "owner",
        teamId: adminTeamId,
        platformRole: "admin",
        roleVersion: 0,
      });

      const app = createApp();
      const res = await app.request("/admin/recovery", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: "nonexistent@example.com" }),
      });

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 409 if recovery token already exists and not expired", async () => {
      const db = getDb();
      const adminUserId = randomUUID();
      const adminTeamId = randomUUID();
      const userId = randomUUID();
      const userTeamId = randomUUID();

      // Create admin user
      await db.collection("users").insertOne({
        _id: adminUserId,
        email: "admin7@example.com",
        name: "Admin Cooldown",
        customAvatar: false,
        role: "owner",
        platformRole: "admin",
        teamId: adminTeamId,
        roleVersion: 0,
        providers: [
          {
            provider: "github",
            providerId: "admin7-gh-1",
            email: "admin7@example.com",
            verified: true,
            linkedAt: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create target user
      const targetEmail = "cooldown@example.com";
      await db.collection("users").insertOne({
        _id: userId,
        email: targetEmail,
        name: "Cooldown Target",
        customAvatar: false,
        role: "member",
        platformRole: "user",
        teamId: userTeamId,
        roleVersion: 0,
        providers: [
          {
            provider: "github",
            providerId: "cooldown-gh-1",
            email: targetEmail,
            verified: true,
            linkedAt: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create existing recovery token that hasn't expired
      await db.collection("recoveryTokens").insertOne({
        _id: randomUUID(),
        userId,
        hash: hashToken("existing-token"),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour from now
        createdAt: new Date(),
      });

      const token = await signAccessToken({
        userId: adminUserId,
        role: "owner",
        teamId: adminTeamId,
        platformRole: "admin",
        roleVersion: 0,
      });

      const app = createApp();
      const res = await app.request("/admin/recovery", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: targetEmail }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe("CONFLICT");
    });

    it("finds soft-deleted users by email", async () => {
      const db = getDb();
      const adminUserId = randomUUID();
      const adminTeamId = randomUUID();
      const userId = randomUUID();
      const userTeamId = randomUUID();

      // Create admin user
      await db.collection("users").insertOne({
        _id: adminUserId,
        email: "admin8@example.com",
        name: "Admin Softdelete",
        customAvatar: false,
        role: "owner",
        platformRole: "admin",
        teamId: adminTeamId,
        roleVersion: 0,
        providers: [
          {
            provider: "github",
            providerId: "admin8-gh-1",
            email: "admin8@example.com",
            verified: true,
            linkedAt: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Create soft-deleted user
      const targetEmail = "deleted@example.com";
      await db.collection("users").insertOne({
        _id: userId,
        email: targetEmail,
        name: "Deleted Target",
        customAvatar: false,
        role: "member",
        platformRole: "user",
        teamId: userTeamId,
        roleVersion: 0,
        providers: [
          {
            provider: "github",
            providerId: "deleted-gh-1",
            email: targetEmail,
            verified: true,
            linkedAt: new Date(),
          },
        ],
        lastLoginAt: new Date(),
        deletedAt: new Date(Date.now() - 1000 * 60 * 60), // deleted 1 hour ago
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const token = await signAccessToken({
        userId: adminUserId,
        role: "owner",
        teamId: adminTeamId,
        platformRole: "admin",
        roleVersion: 0,
      });

      const app = createApp();
      const res = await app.request("/admin/recovery", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: targetEmail }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.message).toContain("Recovery email sent");
    });
  });
});
