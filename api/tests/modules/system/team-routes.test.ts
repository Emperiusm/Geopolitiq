// api/tests/modules/system/team-routes.test.ts
// Tests for team routes: CRUD, invite codes, join/leave, members, watchlist, saved views, audit.

import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { Hono } from "hono";
import type { AppVariables } from "../../../src/types/auth";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import { teamRoutes } from "../../../src/modules/system/team-routes";
import { randomUUID } from "crypto";

const BASE_URL = "http://localhost";

// Test identity constants
const OWNER_ID = randomUUID();
const ADMIN_ID = randomUUID();
const MEMBER_ID = randomUUID();
const VIEWER_ID = randomUUID();
const TEAM_ID = randomUUID();

type Role = "owner" | "admin" | "member" | "viewer";

function createApp(
  userId = OWNER_ID,
  role: Role = "owner",
  teamId = TEAM_ID,
) {
  const app = new Hono<{ Variables: AppVariables }>();

  // Mock auth context
  app.use("*", async (c, next) => {
    c.set("userId", userId);
    c.set("teamId", teamId);
    c.set("role", role);
    c.set("platformRole", "user");
    c.set("roleVersion", 0);
    await next();
  });

  app.route("/team", teamRoutes);
  return app;
}

async function seedTeam(overrides: Record<string, any> = {}) {
  const db = getDb();
  await db.collection("teams").deleteMany({ _id: TEAM_ID });
  await db.collection("teams").insertOne({
    _id: TEAM_ID,
    name: "Test Team",
    slug: "test-team-" + randomUUID().slice(0, 8),
    plan: "free",
    ownerId: OWNER_ID,
    watchlist: ["country:US", "country:CN"],
    inviteCodes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

async function seedUsers() {
  const db = getDb();
  await db.collection("users").deleteMany({ teamId: TEAM_ID });

  const users = [
    {
      _id: OWNER_ID,
      email: "owner@test.com",
      name: "Owner User",
      role: "owner",
      platformRole: "user",
      teamId: TEAM_ID,
      roleVersion: 0,
      customAvatar: false,
      providers: [{ provider: "github", providerId: `gh-owner-${OWNER_ID}`, email: "owner@test.com", verified: true, linkedAt: new Date() }],
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: ADMIN_ID,
      email: "admin@test.com",
      name: "Admin User",
      role: "admin",
      platformRole: "user",
      teamId: TEAM_ID,
      roleVersion: 0,
      customAvatar: false,
      providers: [{ provider: "github", providerId: `gh-admin-${ADMIN_ID}`, email: "admin@test.com", verified: true, linkedAt: new Date() }],
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: MEMBER_ID,
      email: "member@test.com",
      name: "Member User",
      role: "member",
      platformRole: "user",
      teamId: TEAM_ID,
      roleVersion: 0,
      customAvatar: false,
      providers: [{ provider: "github", providerId: `gh-member-${MEMBER_ID}`, email: "member@test.com", verified: true, linkedAt: new Date() }],
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: VIEWER_ID,
      email: "viewer@test.com",
      name: "Viewer User",
      role: "viewer",
      platformRole: "user",
      teamId: TEAM_ID,
      roleVersion: 0,
      customAvatar: false,
      providers: [{ provider: "github", providerId: `gh-viewer-${VIEWER_ID}`, email: "viewer@test.com", verified: true, linkedAt: new Date() }],
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  for (const u of users) {
    await db.collection("users").insertOne(u);
  }
}

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
});

beforeEach(async () => {
  const db = getDb();
  await db.collection("teams").deleteMany({});
  await db.collection("users").deleteMany({});
  await db.collection("savedViews").deleteMany({});
  await db.collection("auditEvents").deleteMany({});
  await db.collection("apiKeys").deleteMany({});
  await db.collection("sessions").deleteMany({});
  await seedTeam();
  await seedUsers();
});

afterAll(async () => {
  const db = getDb();
  await db.collection("teams").deleteMany({});
  await db.collection("users").deleteMany({});
  await db.collection("savedViews").deleteMany({});
  await db.collection("auditEvents").deleteMany({});
  await db.collection("apiKeys").deleteMany({});
  await db.collection("sessions").deleteMany({});
  await disconnectMongo();
});

// ============================
// GET /team — team info + members
// ============================

describe("GET /team — team info + members", () => {
  it("returns team and member list", async () => {
    const app = createApp();
    const res = await app.request("/team");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.data.team).toBeDefined();
    expect(body.data.team._id).toBe(TEAM_ID);
    expect(body.data.team.name).toBe("Test Team");
    expect(Array.isArray(body.data.members)).toBe(true);
    expect(body.data.members.length).toBe(4);
    expect(body.meta.total).toBe(4);
  });

  it("paginates members", async () => {
    const app = createApp();
    const res = await app.request("/team?limit=2&offset=0");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.members.length).toBe(2);
    expect(body.meta.total).toBe(4);
    expect(body.meta.limit).toBe(2);
  });

  it("filters members by search query", async () => {
    const app = createApp();
    const res = await app.request("/team?search=owner");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.members.length).toBe(1);
    expect(body.data.members[0].email).toBe("owner@test.com");
  });

  it("does not expose keyHash or providers in member list", async () => {
    const app = createApp();
    const res = await app.request("/team");
    expect(res.status).toBe(200);
    const body = await res.json();
    for (const member of body.data.members) {
      expect(member.providers).toBeUndefined();
      expect(member.roleVersion).toBeUndefined();
    }
  });

  it("returns 404 for deleted team", async () => {
    const db = getDb();
    await db.collection("teams").updateOne({ _id: TEAM_ID }, { $set: { deletedAt: new Date() } });
    const app = createApp();
    const res = await app.request("/team");
    expect(res.status).toBe(404);
  });
});

// ============================
// PUT /team — update team name/slug (admin+)
// ============================

describe("PUT /team — update team", () => {
  it("owner can update team name", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Team Name" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.team.name).toBe("New Team Name");
  });

  it("admin can update team name", async () => {
    const app = createApp(ADMIN_ID, "admin");
    const res = await app.request("/team", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Admin Updated Name" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.team.name).toBe("Admin Updated Name");
  });

  it("member cannot update team (403)", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request("/team", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Unauthorized Update" }),
    });
    expect(res.status).toBe(403);
  });

  it("viewer cannot update team (403)", async () => {
    const app = createApp(VIEWER_ID, "viewer");
    const res = await app.request("/team", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Viewer Update" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when neither name nor slug provided", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("returns 409 if slug is already taken by another team", async () => {
    const db = getDb();
    const otherTeamId = randomUUID();
    await db.collection("teams").insertOne({
      _id: otherTeamId,
      name: "Other Team",
      slug: "taken-slug",
      plan: "free",
      ownerId: randomUUID(),
      watchlist: [],
      inviteCodes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "taken-slug" }),
    });
    expect(res.status).toBe(409);
  });
});

// ============================
// DELETE /team — soft delete (owner only)
// ============================

describe("DELETE /team — soft delete", () => {
  it("owner can delete team with no other members", async () => {
    // Remove other members
    const db = getDb();
    await db.collection("users").deleteMany({ teamId: TEAM_ID, _id: { $ne: OWNER_ID } });

    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);

    const team = await db.collection("teams").findOne({ _id: TEAM_ID });
    expect(team?.deletedAt).toBeDefined();
  });

  it("cannot delete team with other members (409)", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team", { method: "DELETE" });
    expect(res.status).toBe(409);
  });

  it("admin cannot delete team (403)", async () => {
    const app = createApp(ADMIN_ID, "admin");
    const res = await app.request("/team", { method: "DELETE" });
    expect(res.status).toBe(403);
  });
});

// ============================
// POST /invite — generate invite code (admin+)
// ============================

describe("POST /team/invite — generate invite code", () => {
  it("admin can generate an invite code", async () => {
    const app = createApp(ADMIN_ID, "admin");
    const res = await app.request("/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "member", maxUses: 5, expiresInDays: 7 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.code).toBeDefined();
    expect(body.data.role).toBe("member");
    expect(body.data.maxUses).toBe(5);
    expect(body.data.expiresAt).toBeDefined();
  });

  it("owner can generate an invite code with defaults", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.code).toBeDefined();
    expect(body.data.role).toBe("member"); // default
    expect(body.data.maxUses).toBe(10); // default
  });

  it("member cannot generate invite code (403)", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request("/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "member" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid role", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "superadmin" }),
    });
    expect(res.status).toBe(400);
  });

  it("cannot invite with owner role", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "owner" }),
    });
    expect(res.status).toBe(400);
  });

  it("enforces max 50 active invite codes", async () => {
    const db = getDb();
    const now = new Date();
    const futureCodes = Array.from({ length: 50 }, (_, i) => ({
      code: `testcode${i.toString().padStart(3, "0")}`,
      role: "member",
      createdBy: OWNER_ID,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      maxUses: 10,
      uses: 0,
      usedBy: [],
    }));

    await db.collection("teams").updateOne(
      { _id: TEAM_ID },
      { $set: { inviteCodes: futureCodes } },
    );

    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "member" }),
    });
    expect(res.status).toBe(429);
  });
});

// ============================
// GET /team/invites — list invites (admin+)
// ============================

describe("GET /team/invites — list invites", () => {
  it("returns invite list with active status", async () => {
    const db = getDb();
    const now = new Date();
    const futureExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const pastExpiry = new Date(now.getTime() - 1000);

    await db.collection("teams").updateOne(
      { _id: TEAM_ID },
      {
        $set: {
          inviteCodes: [
            {
              code: "active-code",
              role: "member",
              createdBy: OWNER_ID,
              expiresAt: futureExpiry,
              maxUses: 10,
              uses: 0,
              usedBy: [],
            },
            {
              code: "expired-code",
              role: "viewer",
              createdBy: OWNER_ID,
              expiresAt: pastExpiry,
              maxUses: 10,
              uses: 0,
              usedBy: [],
            },
          ],
        },
      },
    );

    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team/invites");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data.invites)).toBe(true);
    expect(body.data.invites.length).toBe(2);

    const active = body.data.invites.find((ic: any) => ic.code === "active-code");
    const expired = body.data.invites.find((ic: any) => ic.code === "expired-code");
    expect(active.active).toBe(true);
    expect(expired.active).toBe(false);
  });

  it("member cannot list invites (403)", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request("/team/invites");
    expect(res.status).toBe(403);
  });
});

// ============================
// DELETE /team/invites/:code — revoke invite (admin+)
// ============================

describe("DELETE /team/invites/:code — revoke invite", () => {
  it("admin can revoke an invite code", async () => {
    const db = getDb();
    const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.collection("teams").updateOne(
      { _id: TEAM_ID },
      {
        $set: {
          inviteCodes: [
            {
              code: "revoke-me",
              role: "member",
              createdBy: OWNER_ID,
              expiresAt: futureExpiry,
              maxUses: 10,
              uses: 0,
              usedBy: [],
            },
          ],
        },
      },
    );

    const app = createApp(ADMIN_ID, "admin");
    const res = await app.request("/team/invites/revoke-me", { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.revoked).toBe(true);

    const team = await db.collection("teams").findOne({ _id: TEAM_ID });
    expect(team?.inviteCodes?.length).toBe(0);
  });

  it("returns 404 for non-existent invite code", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team/invites/nonexistent", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});

// ============================
// GET /team/invite-info/:code — public endpoint
// ============================

describe("GET /team/invite-info/:code — public info", () => {
  it("returns team name, inviter, and role for valid code", async () => {
    const db = getDb();
    const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.collection("teams").updateOne(
      { _id: TEAM_ID },
      {
        $set: {
          inviteCodes: [
            {
              code: "info-code",
              role: "member",
              createdBy: OWNER_ID,
              expiresAt: futureExpiry,
              maxUses: 10,
              uses: 0,
              usedBy: [],
            },
          ],
        },
      },
    );

    const app = createApp();
    const res = await app.request("/team/invite-info/info-code");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.teamName).toBe("Test Team");
    expect(body.data.role).toBe("member");
    expect(body.data.inviter).toBeDefined();
    expect(body.data.inviter.name).toBe("Owner User");
    expect(body.data.expiresAt).toBeDefined();
  });

  it("returns 404 for non-existent code", async () => {
    const app = createApp();
    const res = await app.request("/team/invite-info/bogusCodeXYZ");
    expect(res.status).toBe(404);
  });

  it("returns 410 for expired code", async () => {
    const db = getDb();
    const pastExpiry = new Date(Date.now() - 1000);
    await db.collection("teams").updateOne(
      { _id: TEAM_ID },
      {
        $set: {
          inviteCodes: [
            {
              code: "expired-info",
              role: "member",
              createdBy: OWNER_ID,
              expiresAt: pastExpiry,
              maxUses: 10,
              uses: 0,
              usedBy: [],
            },
          ],
        },
      },
    );

    const app = createApp();
    const res = await app.request("/team/invite-info/expired-info");
    expect(res.status).toBe(410);
  });

  it("returns 410 for exhausted code", async () => {
    const db = getDb();
    const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db.collection("teams").updateOne(
      { _id: TEAM_ID },
      {
        $set: {
          inviteCodes: [
            {
              code: "exhausted-code",
              role: "member",
              createdBy: OWNER_ID,
              expiresAt: futureExpiry,
              maxUses: 5,
              uses: 5,
              usedBy: [],
            },
          ],
        },
      },
    );

    const app = createApp();
    const res = await app.request("/team/invite-info/exhausted-code");
    expect(res.status).toBe(410);
  });
});

// ============================
// POST /team/join — join via invite code
// ============================

describe("POST /team/join — join via invite code", () => {
  it("successfully joins a team via invite code", async () => {
    const db = getDb();
    const newTeamId = randomUUID();
    const joiningUserId = randomUUID();
    const futureExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Create target team
    await db.collection("teams").insertOne({
      _id: newTeamId,
      name: "Target Team",
      slug: "target-team-" + randomUUID().slice(0, 8),
      plan: "free",
      ownerId: OWNER_ID,
      watchlist: [],
      inviteCodes: [
        {
          code: "join-code",
          role: "member",
          createdBy: OWNER_ID,
          expiresAt: futureExpiry,
          maxUses: 10,
          uses: 0,
          usedBy: [],
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create personal team for joining user
    const personalTeamId = randomUUID();
    await db.collection("teams").insertOne({
      _id: personalTeamId,
      name: "Joining User's Team",
      slug: "joining-user-team-" + randomUUID().slice(0, 8),
      plan: "free",
      ownerId: joiningUserId,
      watchlist: [],
      inviteCodes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create joining user
    await db.collection("users").insertOne({
      _id: joiningUserId,
      email: "joinme@test.com",
      name: "Joining User",
      role: "owner",
      platformRole: "user",
      teamId: personalTeamId,
      roleVersion: 0,
      customAvatar: false,
      providers: [{ provider: "github", providerId: `gh-joining-${joiningUserId}`, email: "joinme@test.com", verified: true, linkedAt: new Date() }],
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp(joiningUserId, "owner", personalTeamId);
    const res = await app.request("/team/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "join-code" }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.teamId).toBe(newTeamId);
    expect(body.data.teamName).toBe("Target Team");
    expect(body.data.role).toBe("member");

    // Verify user was updated in DB
    const updatedUser = await db.collection("users").findOne({ _id: joiningUserId });
    expect(updatedUser?.teamId).toBe(newTeamId);
    expect(updatedUser?.role).toBe("member");
    expect(updatedUser?.roleVersion).toBe(1);
  });

  it("returns 400 when code is missing", async () => {
    const app = createApp();
    const res = await app.request("/team/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent code", async () => {
    const app = createApp();
    const res = await app.request("/team/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "doesnotexist" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 410 for expired code", async () => {
    const db = getDb();
    const targetTeamId = randomUUID();
    await db.collection("teams").insertOne({
      _id: targetTeamId,
      name: "Expired Code Team",
      slug: "expired-code-team",
      plan: "free",
      ownerId: OWNER_ID,
      watchlist: [],
      inviteCodes: [
        {
          code: "expired-join-code",
          role: "member",
          createdBy: OWNER_ID,
          expiresAt: new Date(Date.now() - 1000),
          maxUses: 10,
          uses: 0,
          usedBy: [],
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/team/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "expired-join-code" }),
    });
    expect(res.status).toBe(410);
  });

  it("returns 410 for exhausted code", async () => {
    const db = getDb();
    const targetTeamId = randomUUID();
    await db.collection("teams").insertOne({
      _id: targetTeamId,
      name: "Exhausted Team",
      slug: "exhausted-team-" + randomUUID().slice(0, 8),
      plan: "free",
      ownerId: OWNER_ID,
      watchlist: [],
      inviteCodes: [
        {
          code: "maxed-out",
          role: "member",
          createdBy: OWNER_ID,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          maxUses: 1,
          uses: 1,
          usedBy: [],
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = createApp();
    const res = await app.request("/team/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "maxed-out" }),
    });
    expect(res.status).toBe(410);
  });
});

// ============================
// POST /team/leave — leave team
// ============================

describe("POST /team/leave — leave team", () => {
  it("member can leave team and gets new personal team", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request("/team/leave", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.accessToken).toBeDefined();
    expect(body.data.teamId).toBeDefined();
    expect(body.data.teamId).not.toBe(TEAM_ID);
    expect(body.data.role).toBe("owner");

    // Verify user has new team
    const db = getDb();
    const user = await db.collection("users").findOne({ _id: MEMBER_ID });
    expect(user?.teamId).not.toBe(TEAM_ID);
    expect(user?.role).toBe("owner");
  });

  it("owner cannot leave team (403)", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team/leave", { method: "POST" });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("viewer can leave team", async () => {
    const app = createApp(VIEWER_ID, "viewer");
    const res = await app.request("/team/leave", { method: "POST" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.role).toBe("owner");
  });
});

// ============================
// DELETE /team/members/:userId — remove member (admin+)
// ============================

describe("DELETE /team/members/:userId — remove member", () => {
  it("owner can remove a member", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request(`/team/members/${MEMBER_ID}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.removed).toBe(true);

    // Verify member now has a personal team
    const db = getDb();
    const user = await db.collection("users").findOne({ _id: MEMBER_ID });
    expect(user?.teamId).not.toBe(TEAM_ID);
    expect(user?.role).toBe("owner");
  });

  it("admin can remove a member", async () => {
    const app = createApp(ADMIN_ID, "admin");
    const res = await app.request(`/team/members/${VIEWER_ID}`, { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("cannot remove the owner (403)", async () => {
    const app = createApp(ADMIN_ID, "admin");
    const res = await app.request(`/team/members/${OWNER_ID}`, { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("member cannot remove others (403)", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request(`/team/members/${VIEWER_ID}`, { method: "DELETE" });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent member", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request(`/team/members/${randomUUID()}`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});

// ============================
// PUT /team/members/:userId/role — change role (owner only)
// ============================

describe("PUT /team/members/:userId/role — change role", () => {
  it("owner can change a member role", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request(`/team/members/${MEMBER_ID}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.role).toBe("admin");

    // Verify in DB
    const db = getDb();
    const user = await db.collection("users").findOne({ _id: MEMBER_ID });
    expect(user?.role).toBe("admin");
    expect(user?.roleVersion).toBe(1);
  });

  it("admin cannot change roles (403)", async () => {
    const app = createApp(ADMIN_ID, "admin");
    const res = await app.request(`/team/members/${MEMBER_ID}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "viewer" }),
    });
    expect(res.status).toBe(403);
  });

  it("cannot change owner role (403)", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request(`/team/members/${OWNER_ID}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid role", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request(`/team/members/${MEMBER_ID}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "superadmin" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 for owner role assignment", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request(`/team/members/${MEMBER_ID}/role`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "owner" }),
    });
    expect(res.status).toBe(400);
  });
});

// ============================
// POST /team/transfer-ownership
// ============================

describe("POST /team/transfer-ownership — transfer ownership", () => {
  it("owner can transfer ownership", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team/transfer-ownership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: ADMIN_ID }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.transferred).toBe(true);
    expect(body.data.newOwnerId).toBe(ADMIN_ID);

    // Verify roles in DB
    const db = getDb();
    const newOwner = await db.collection("users").findOne({ _id: ADMIN_ID });
    const oldOwner = await db.collection("users").findOne({ _id: OWNER_ID });
    expect(newOwner?.role).toBe("owner");
    expect(oldOwner?.role).toBe("admin");

    // Verify team ownerId updated
    const team = await db.collection("teams").findOne({ _id: TEAM_ID });
    expect(team?.ownerId).toBe(ADMIN_ID);
  });

  it("admin cannot transfer ownership (403)", async () => {
    const app = createApp(ADMIN_ID, "admin");
    const res = await app.request("/team/transfer-ownership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: MEMBER_ID }),
    });
    expect(res.status).toBe(403);
  });

  it("cannot transfer to self (409)", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team/transfer-ownership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: OWNER_ID }),
    });
    expect(res.status).toBe(409);
  });

  it("returns 400 when userId is missing", async () => {
    const app = createApp(OWNER_ID, "owner");
    const res = await app.request("/team/transfer-ownership", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

// ============================
// GET /team/watchlist
// ============================

describe("GET /team/watchlist — return team watchlist", () => {
  it("returns team watchlist", async () => {
    const app = createApp();
    const res = await app.request("/team/watchlist");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data.watchlist)).toBe(true);
    expect(body.data.watchlist).toContain("country:US");
    expect(body.data.watchlist).toContain("country:CN");
  });

  it("viewer can view watchlist", async () => {
    const app = createApp(VIEWER_ID, "viewer");
    const res = await app.request("/team/watchlist");
    expect(res.status).toBe(200);
  });
});

// ============================
// PUT /team/watchlist — replace watchlist
// ============================

describe("PUT /team/watchlist — replace watchlist", () => {
  it("member can replace watchlist", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request("/team/watchlist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchlist: ["country:RU", "country:DE"] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.watchlist).toEqual(["country:RU", "country:DE"]);

    // Verify in DB
    const db = getDb();
    const team = await db.collection("teams").findOne({ _id: TEAM_ID });
    expect(team?.watchlist).toEqual(["country:RU", "country:DE"]);
  });

  it("viewer cannot replace watchlist (403)", async () => {
    const app = createApp(VIEWER_ID, "viewer");
    const res = await app.request("/team/watchlist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchlist: ["country:RU"] }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when watchlist is not an array", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request("/team/watchlist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchlist: "not-an-array" }),
    });
    expect(res.status).toBe(400);
  });
});

// ============================
// PATCH /team/watchlist — add/remove entities
// ============================

describe("PATCH /team/watchlist — add/remove entities", () => {
  it("member can add entities to watchlist", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request("/team/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ add: ["country:FR", "country:GB"] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.watchlist).toContain("country:FR");
    expect(body.data.watchlist).toContain("country:GB");
    expect(body.data.watchlist).toContain("country:US"); // original entries preserved
  });

  it("member can remove entities from watchlist", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request("/team/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remove: ["country:US"] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.watchlist).not.toContain("country:US");
    expect(body.data.watchlist).toContain("country:CN"); // still present
  });

  it("can add and remove in the same request", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request("/team/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ add: ["country:JP"], remove: ["country:CN"] }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.watchlist).toContain("country:JP");
    expect(body.data.watchlist).not.toContain("country:CN");
  });

  it("does not add duplicates", async () => {
    const app = createApp(MEMBER_ID, "member");
    await app.request("/team/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ add: ["country:US"] }), // already in watchlist
    });

    const res = await app.request("/team/watchlist");
    const body = await res.json();
    const usCount = body.data.watchlist.filter((e: string) => e === "country:US").length;
    expect(usCount).toBe(1);
  });

  it("viewer cannot patch watchlist (403)", async () => {
    const app = createApp(VIEWER_ID, "viewer");
    const res = await app.request("/team/watchlist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ add: ["country:FR"] }),
    });
    expect(res.status).toBe(403);
  });
});

// ============================
// POST /team/views — create saved view (member+)
// ============================

describe("POST /team/views — create saved view", () => {
  it("member can create a saved view", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request("/team/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "My View",
        layers: ["conflicts", "bases"],
        viewport: { longitude: 0, latitude: 0, zoom: 3, viewMode: "globe" },
      }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data._id).toBeDefined();
    expect(body.data.name).toBe("My View");
    expect(body.data.layers).toEqual(["conflicts", "bases"]);
    expect(body.data.teamId).toBe(TEAM_ID);
    expect(body.data.createdBy).toBe(MEMBER_ID);
  });

  it("viewer cannot create saved view (403)", async () => {
    const app = createApp(VIEWER_ID, "viewer");
    const res = await app.request("/team/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Viewer View",
        layers: [],
        viewport: { longitude: 0, latitude: 0, zoom: 3, viewMode: "globe" },
      }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 400 when name is missing", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request("/team/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layers: [], viewport: {} }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when layers is not an array", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request("/team/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", layers: "notarray", viewport: {} }),
    });
    expect(res.status).toBe(400);
  });
});

// ============================
// GET /team/views — list team's views
// ============================

describe("GET /team/views — list team views", () => {
  it("returns all team views", async () => {
    const app = createApp(MEMBER_ID, "member");

    // Create two views
    await app.request("/team/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "View 1", layers: [], viewport: { longitude: 0, latitude: 0, zoom: 2, viewMode: "flat" } }),
    });
    await app.request("/team/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "View 2", layers: ["bases"], viewport: { longitude: 10, latitude: 20, zoom: 5, viewMode: "globe" } }),
    });

    const res = await app.request("/team/views");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data.views)).toBe(true);
    expect(body.data.views.length).toBe(2);
  });

  it("viewer can list views", async () => {
    const app = createApp(VIEWER_ID, "viewer");
    const res = await app.request("/team/views");
    expect(res.status).toBe(200);
  });
});

// ============================
// PUT /team/views/:id — update saved view
// ============================

describe("PUT /team/views/:id — update saved view", () => {
  it("creator can update their own view", async () => {
    const memberApp = createApp(MEMBER_ID, "member");
    const createRes = await memberApp.request("/team/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Original Name", layers: ["conflicts"], viewport: { longitude: 0, latitude: 0, zoom: 3, viewMode: "globe" } }),
    });
    const createBody = await createRes.json();
    const viewId = createBody.data._id;

    const res = await memberApp.request(`/team/views/${viewId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Updated Name" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe("Updated Name");
  });

  it("admin can update any view", async () => {
    const memberApp = createApp(MEMBER_ID, "member");
    const createRes = await memberApp.request("/team/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Member View", layers: [], viewport: { longitude: 0, latitude: 0, zoom: 3, viewMode: "globe" } }),
    });
    const createBody = await createRes.json();
    const viewId = createBody.data._id;

    const adminApp = createApp(ADMIN_ID, "admin");
    const res = await adminApp.request(`/team/views/${viewId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Admin Updated" }),
    });
    expect(res.status).toBe(200);
  });

  it("non-creator non-admin cannot update view (403)", async () => {
    const memberApp = createApp(MEMBER_ID, "member");
    const createRes = await memberApp.request("/team/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Member View", layers: [], viewport: { longitude: 0, latitude: 0, zoom: 3, viewMode: "globe" } }),
    });
    const createBody = await createRes.json();
    const viewId = createBody.data._id;

    // Viewer tries to update
    const viewerApp = createApp(VIEWER_ID, "viewer");
    const res = await viewerApp.request(`/team/views/${viewId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Viewer Hack" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 for non-existent view", async () => {
    const app = createApp();
    const res = await app.request(`/team/views/${randomUUID()}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test" }),
    });
    expect(res.status).toBe(404);
  });
});

// ============================
// DELETE /team/views/:id — delete saved view
// ============================

describe("DELETE /team/views/:id — delete saved view", () => {
  it("creator can delete their view", async () => {
    const memberApp = createApp(MEMBER_ID, "member");
    const createRes = await memberApp.request("/team/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Delete Me View", layers: [], viewport: { longitude: 0, latitude: 0, zoom: 3, viewMode: "globe" } }),
    });
    const createBody = await createRes.json();
    const viewId = createBody.data._id;

    const res = await memberApp.request(`/team/views/${viewId}`, { method: "DELETE" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.deleted).toBe(true);

    const db = getDb();
    const view = await db.collection("savedViews").findOne({ _id: viewId });
    expect(view).toBeNull();
  });

  it("admin can delete any view", async () => {
    const memberApp = createApp(MEMBER_ID, "member");
    const createRes = await memberApp.request("/team/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Admin Will Delete", layers: [], viewport: { longitude: 0, latitude: 0, zoom: 3, viewMode: "globe" } }),
    });
    const createBody = await createRes.json();
    const viewId = createBody.data._id;

    const adminApp = createApp(ADMIN_ID, "admin");
    const res = await adminApp.request(`/team/views/${viewId}`, { method: "DELETE" });
    expect(res.status).toBe(200);
  });

  it("non-creator non-admin cannot delete view (403)", async () => {
    const memberApp = createApp(MEMBER_ID, "member");
    const createRes = await memberApp.request("/team/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Protected View", layers: [], viewport: { longitude: 0, latitude: 0, zoom: 3, viewMode: "globe" } }),
    });
    const createBody = await createRes.json();
    const viewId = createBody.data._id;

    const viewerApp = createApp(VIEWER_ID, "viewer");
    const res = await viewerApp.request(`/team/views/${viewId}`, { method: "DELETE" });
    expect(res.status).toBe(403);
  });
});

// ============================
// GET /team/audit — paginated audit log (admin+)
// ============================

describe("GET /team/audit — paginated audit log", () => {
  it("admin can get audit events", async () => {
    const db = getDb();
    const now = new Date();
    // Insert some audit events
    await db.collection("auditEvents").insertMany([
      {
        _id: randomUUID(),
        teamId: TEAM_ID,
        actorId: OWNER_ID,
        action: "team.updated",
        ip: "127.0.0.1",
        expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        createdAt: now,
      },
      {
        _id: randomUUID(),
        teamId: TEAM_ID,
        actorId: ADMIN_ID,
        action: "member.invited",
        ip: "127.0.0.1",
        expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        createdAt: now,
      },
    ]);

    const app = createApp(ADMIN_ID, "admin");
    const res = await app.request("/team/audit");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThanOrEqual(2);
    expect(body.meta.total).toBeGreaterThanOrEqual(2);
  });

  it("member cannot access audit log (403)", async () => {
    const app = createApp(MEMBER_ID, "member");
    const res = await app.request("/team/audit");
    expect(res.status).toBe(403);
  });

  it("viewer cannot access audit log (403)", async () => {
    const app = createApp(VIEWER_ID, "viewer");
    const res = await app.request("/team/audit");
    expect(res.status).toBe(403);
  });

  it("filters by action", async () => {
    const db = getDb();
    const now = new Date();
    await db.collection("auditEvents").insertMany([
      {
        _id: randomUUID(),
        teamId: TEAM_ID,
        actorId: OWNER_ID,
        action: "team.updated",
        ip: "127.0.0.1",
        expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        createdAt: now,
      },
      {
        _id: randomUUID(),
        teamId: TEAM_ID,
        actorId: ADMIN_ID,
        action: "member.removed",
        ip: "127.0.0.1",
        expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        createdAt: now,
      },
    ]);

    const app = createApp(ADMIN_ID, "admin");
    const res = await app.request("/team/audit?action=team.updated");
    expect(res.status).toBe(200);
    const body = await res.json();
    for (const event of body.data) {
      expect(event.action).toBe("team.updated");
    }
  });

  it("supports pagination", async () => {
    const db = getDb();
    const now = new Date();
    // Insert 5 audit events
    for (let i = 0; i < 5; i++) {
      await db.collection("auditEvents").insertOne({
        _id: randomUUID(),
        teamId: TEAM_ID,
        actorId: OWNER_ID,
        action: "team.updated",
        ip: "127.0.0.1",
        expiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        createdAt: new Date(now.getTime() + i * 1000),
      });
    }

    const app = createApp(ADMIN_ID, "admin");
    const res = await app.request("/team/audit?limit=2&offset=0");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.length).toBe(2);
    expect(body.meta.total).toBe(5);
    expect(body.meta.limit).toBe(2);
  });
});
