// api/src/modules/system/team-routes.ts
// Team CRUD, invite codes, join/leave, member management, watchlist, saved views, audit log.

import { Hono } from "hono";
import { randomBytes, randomUUID } from "crypto";
import { getDb } from "../../infrastructure/mongo";
import {
  signAccessToken,
  hashToken,
  generateRefreshToken,
  generateUniqueSlug,
  logAudit,
} from "../../infrastructure/auth";
import { getRedis, isRedisConnected } from "../../infrastructure/redis";
import { success, apiError, validationError } from "../../helpers/response";
import { requireRole } from "../../middleware/require-role";
import type { UserRole } from "../../types/auth";

export const teamRoutes = new Hono();

// ---- Helpers ----

function getIp(c: any): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown"
  );
}

async function getTeamPlan(teamId: string): Promise<"free" | "pro"> {
  const db = getDb();
  const team = await db.collection("teams").findOne({ _id: teamId });
  return (team?.plan as "free" | "pro") ?? "free";
}

function invalidateUserRedisCache(userId: string): void {
  if (isRedisConnected()) {
    getRedis().del(`gambit:user:${userId}:rv`).catch(() => {});
  }
}

// Set refresh cookie with 7-day sliding window
const SESSION_SLIDING_DAYS = 7;
const SESSION_HARD_CAP_DAYS = 30;
const REFRESH_COOKIE = "refreshToken";
const REFRESH_COOKIE_PATH = "/api/v1/auth";

function setRefreshCookie(c: any, token: string) {
  const expiresAt = new Date(Date.now() + SESSION_SLIDING_DAYS * 24 * 60 * 60 * 1000);
  c.header(
    "Set-Cookie",
    `${REFRESH_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=${REFRESH_COOKIE_PATH}; Expires=${expiresAt.toUTCString()}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
}

function getRefreshTokenFromCookie(c: any): string | null {
  const cookieHeader = c.req.header("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)refreshToken=([^;]+)/);
  return match ? match[1] : null;
}

// Rotate refresh token: revoke old session, create new session, set cookie
async function rotateRefreshToken(
  c: any,
  userId: string,
  teamId: string,
  role: UserRole,
  platformRole: string,
  roleVersion: number,
): Promise<string> {
  const db = getDb();
  const now = new Date();

  // Revoke other sessions (except current)
  const currentRefreshToken = getRefreshTokenFromCookie(c);
  if (currentRefreshToken) {
    const currentHash = hashToken(currentRefreshToken);
    await db.collection("sessions").deleteMany({
      userId,
      refreshTokenHash: { $ne: currentHash },
    });
  } else {
    // Revoke all sessions if no current token
    await db.collection("sessions").deleteMany({ userId });
  }

  // Create new session
  const rawRefreshToken = generateRefreshToken();
  const refreshTokenHash = hashToken(rawRefreshToken);
  const sessionId = randomUUID();
  const expiresAt = new Date(now.getTime() + SESSION_SLIDING_DAYS * 24 * 60 * 60 * 1000);
  const absoluteExpiresAt = new Date(now.getTime() + SESSION_HARD_CAP_DAYS * 24 * 60 * 60 * 1000);

  await db.collection("sessions").insertOne({
    _id: sessionId,
    userId,
    teamId,
    refreshTokenHash,
    device: { browser: "Unknown", os: "Unknown", raw: c.req.header("user-agent") ?? "" },
    ip: getIp(c),
    isNewDevice: false,
    createdAt: now,
    lastRefreshedAt: now,
    expiresAt,
    absoluteExpiresAt,
  });

  setRefreshCookie(c, rawRefreshToken);

  // Sign and return new access token
  return signAccessToken({ userId, role, teamId, platformRole: platformRole as any, roleVersion });
}

// ============================
// GET / — team info + members
// ============================

teamRoutes.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const db = getDb();

  const searchParams = new URL(c.req.url).searchParams;
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
  const search = searchParams.get("search") ?? "";

  const team = await db.collection("teams").findOne({ _id: teamId, deletedAt: { $exists: false } });
  if (!team) {
    return apiError(c, "NOT_FOUND", "Team not found", 404);
  }

  // Build member filter
  const memberFilter: Record<string, any> = { teamId };
  if (search) {
    memberFilter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const total = await db.collection("users").countDocuments(memberFilter);
  const members = await db
    .collection("users")
    .find(memberFilter, {
      projection: { _id: 1, name: 1, email: 1, avatar: 1, role: 1, lastLoginAt: 1, createdAt: 1 },
      sort: { createdAt: 1 },
      skip: offset,
      limit,
    })
    .toArray();

  return c.json({
    data: {
      team: {
        _id: team._id,
        name: team.name,
        slug: team.slug,
        plan: team.plan,
        ownerId: team.ownerId,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      },
      members,
    },
    meta: { total, limit, offset },
  });
});

// ============================
// PUT / — update team name/slug (admin+)
// ============================

teamRoutes.put("/", requireRole("admin"), async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const db = getDb();

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, "Request body must be valid JSON");
  }

  const { name, slug } = body;

  if (!name && !slug) {
    return validationError(c, "At least one of name or slug is required");
  }

  if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
    return validationError(c, "name must be a non-empty string");
  }

  const updates: Record<string, any> = { updatedAt: new Date() };

  if (name) {
    updates.name = name.trim();
  }

  if (slug !== undefined) {
    const slugVal = typeof slug === "string" ? slug.trim() : "";
    if (!slugVal) return validationError(c, "slug must be a non-empty string");
    // Check slug uniqueness
    const existing = await db.collection("teams").findOne({ slug: slugVal, _id: { $ne: teamId } });
    if (existing) return apiError(c, "CONFLICT", "Slug is already taken", 409);
    updates.slug = slugVal;
  }

  await db.collection("teams").updateOne({ _id: teamId }, { $set: updates });

  const plan = await getTeamPlan(teamId);
  logAudit({
    teamId,
    actorId: userId,
    action: "team.updated",
    ip: getIp(c),
    plan,
    target: { type: "team", id: teamId },
    metadata: updates,
  }).catch(() => {});

  const updated = await db.collection("teams").findOne({ _id: teamId });
  return success(c, { team: updated });
});

// ============================
// DELETE / — soft delete team (owner only, no other members)
// ============================

teamRoutes.delete("/", requireRole("owner"), async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const db = getDb();

  // Check if there are other members
  const otherMembersCount = await db.collection("users").countDocuments({
    teamId,
    _id: { $ne: userId },
  });

  if (otherMembersCount > 0) {
    return apiError(c, "CONFLICT", "Cannot delete team with other members", 409);
  }

  const now = new Date();
  await db.collection("teams").updateOne({ _id: teamId }, { $set: { deletedAt: now, updatedAt: now } });

  const plan = await getTeamPlan(teamId);
  logAudit({
    teamId,
    actorId: userId,
    action: "team.updated",
    ip: getIp(c),
    plan,
    target: { type: "team", id: teamId },
    metadata: { action: "soft_delete" },
  }).catch(() => {});

  return success(c, { deleted: true, teamId });
});

// ============================
// POST /invite — generate invite code (admin+, max 50 active)
// ============================

teamRoutes.post("/invite", requireRole("admin"), async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const db = getDb();

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, "Request body must be valid JSON");
  }

  const { role = "member", label, maxUses = 10, expiresInDays = 7 } = body;

  const validRoles: UserRole[] = ["viewer", "member", "admin"];
  if (!validRoles.includes(role as UserRole)) {
    return validationError(c, `role must be one of: ${validRoles.join(", ")}`);
  }

  if (typeof maxUses !== "number" || maxUses < 1 || maxUses > 1000) {
    return validationError(c, "maxUses must be a number between 1 and 1000");
  }

  const now = new Date();

  // Count active invite codes
  const team = await db.collection("teams").findOne({ _id: teamId });
  if (!team) return apiError(c, "NOT_FOUND", "Team not found", 404);

  const activeCodes = (team.inviteCodes ?? []).filter(
    (ic: any) => new Date(ic.expiresAt) > now,
  );

  if (activeCodes.length >= 50) {
    return apiError(c, "LIMIT_EXCEEDED", "Maximum 50 active invite codes per team", 429);
  }

  const code = randomBytes(12).toString("hex");
  const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

  const inviteEntry = {
    code,
    label: label || undefined,
    role,
    createdBy: userId,
    expiresAt,
    maxUses,
    uses: 0,
    usedBy: [],
  };

  await db.collection("teams").updateOne(
    { _id: teamId },
    { $push: { inviteCodes: inviteEntry } as any, $set: { updatedAt: now } },
  );

  const plan = await getTeamPlan(teamId);
  logAudit({
    teamId,
    actorId: userId,
    action: "member.invited",
    ip: getIp(c),
    plan,
    target: { type: "invite", id: code },
    metadata: { role, label, maxUses, expiresAt },
  }).catch(() => {});

  return success(c, { code, role, label, maxUses, expiresAt, createdBy: userId }, {}, 201);
});

// ============================
// GET /invites — list invites (admin+)
// ============================

teamRoutes.get("/invites", requireRole("admin"), async (c) => {
  const teamId = c.get("teamId") as string;
  const db = getDb();
  const now = new Date();

  const team = await db.collection("teams").findOne({ _id: teamId });
  if (!team) return apiError(c, "NOT_FOUND", "Team not found", 404);

  const invites = (team.inviteCodes ?? []).map((ic: any) => ({
    ...ic,
    active: new Date(ic.expiresAt) > now && ic.uses < ic.maxUses,
  }));

  return success(c, { invites });
});

// ============================
// DELETE /invites/:code — revoke invite (admin+)
// ============================

teamRoutes.delete("/invites/:code", requireRole("admin"), async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const code = c.req.param("code");
  const db = getDb();

  const team = await db.collection("teams").findOne({ _id: teamId });
  if (!team) return apiError(c, "NOT_FOUND", "Team not found", 404);

  const invite = (team.inviteCodes ?? []).find((ic: any) => ic.code === code);
  if (!invite) return apiError(c, "NOT_FOUND", `Invite code '${code}' not found`, 404);

  await db.collection("teams").updateOne(
    { _id: teamId },
    { $pull: { inviteCodes: { code } } as any, $set: { updatedAt: new Date() } },
  );

  const plan = await getTeamPlan(teamId);
  logAudit({
    teamId,
    actorId: userId,
    action: "member.invited",
    ip: getIp(c),
    plan,
    target: { type: "invite", id: code },
    metadata: { action: "revoked" },
  }).catch(() => {});

  return success(c, { revoked: true, code });
});

// ============================
// GET /invite-info/:code — public, returns team name + inviter + role
// ============================

teamRoutes.get("/invite-info/:code", async (c) => {
  const code = c.req.param("code");
  const db = getDb();
  const now = new Date();

  const team = await db.collection("teams").findOne({
    "inviteCodes.code": code,
    deletedAt: { $exists: false },
  });

  if (!team) {
    return apiError(c, "NOT_FOUND", "Invite code not found", 404);
  }

  const invite = (team.inviteCodes ?? []).find((ic: any) => ic.code === code);
  if (!invite) {
    return apiError(c, "NOT_FOUND", "Invite code not found", 404);
  }

  // Check expiry
  if (new Date(invite.expiresAt) < now) {
    return apiError(c, "GONE", "Invite code has expired", 410);
  }

  // Check max uses
  if (invite.uses >= invite.maxUses) {
    return apiError(c, "GONE", "Invite code has been exhausted", 410);
  }

  // Get inviter info
  const inviter = await db.collection("users").findOne(
    { _id: invite.createdBy },
    { projection: { name: 1, avatar: 1 } },
  );

  return success(c, {
    teamName: team.name,
    teamSlug: team.slug,
    role: invite.role,
    inviter: inviter ? { name: inviter.name, avatar: inviter.avatar } : null,
    expiresAt: invite.expiresAt,
  });
});

// ============================
// POST /join — join via invite code
// ============================

teamRoutes.post("/join", async (c) => {
  const userId = c.get("userId") as string;
  const currentTeamId = c.get("teamId") as string;
  const platformRole = c.get("platformRole") as string;
  const db = getDb();
  const now = new Date();

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, "Request body must be valid JSON");
  }

  const { code } = body;
  if (!code || typeof code !== "string") {
    return validationError(c, "code is required");
  }

  // Atomically increment uses and check validity
  const inviteResult = await db.collection("teams").findOneAndUpdate(
    {
      "inviteCodes.code": code,
      "inviteCodes.expiresAt": { $gt: now },
      deletedAt: { $exists: false },
    },
    {
      $inc: { "inviteCodes.$.uses": 1 },
      $push: { "inviteCodes.$.usedBy": userId } as any,
    },
    { returnDocument: "after" },
  );

  if (!inviteResult) {
    // Determine reason
    const teamWithCode = await db.collection("teams").findOne({ "inviteCodes.code": code });
    if (!teamWithCode) {
      return apiError(c, "NOT_FOUND", "Invite code not found", 404);
    }
    const entry = (teamWithCode.inviteCodes ?? []).find((ic: any) => ic.code === code);
    if (entry && new Date(entry.expiresAt) < now) {
      return apiError(c, "GONE", "Invite code has expired", 410);
    }
    return apiError(c, "GONE", "Invite code is invalid or expired", 410);
  }

  const newTeamId = (inviteResult as any)._id as string;
  const inviteEntry = (inviteResult as any).inviteCodes?.find((ic: any) => ic.code === code);

  // Check uses <= maxUses after increment
  if (!inviteEntry || inviteEntry.uses > inviteEntry.maxUses) {
    // Undo the increment
    await db.collection("teams").updateOne(
      { "inviteCodes.code": code },
      {
        $inc: { "inviteCodes.$.uses": -1 },
        $pull: { "inviteCodes.$.usedBy": userId } as any,
      },
    );
    return apiError(c, "GONE", "Invite code has been exhausted", 410);
  }

  const newRole: UserRole = inviteEntry.role as UserRole;
  const teamName = (inviteResult as any).name as string;

  // Archive old team reference (store on user doc)
  const user = await db.collection("users").findOne({ _id: userId });
  if (!user) return apiError(c, "NOT_FOUND", "User not found", 404);

  // Revoke all API keys
  await db.collection("apiKeys").deleteMany({ userId });

  // Revoke other sessions (keep current)
  const currentRefreshToken = getRefreshTokenFromCookie(c);
  if (currentRefreshToken) {
    const currentHash = hashToken(currentRefreshToken);
    await db.collection("sessions").deleteMany({
      userId,
      refreshTokenHash: { $ne: currentHash },
    });
  } else {
    await db.collection("sessions").deleteMany({ userId });
  }

  // Update user: new teamId, role, increment roleVersion
  const newRoleVersion = (user.roleVersion ?? 0) + 1;
  await db.collection("users").updateOne(
    { _id: userId },
    {
      $set: {
        teamId: newTeamId,
        role: newRole,
        roleVersion: newRoleVersion,
        updatedAt: now,
      },
    },
  );

  // Invalidate Redis cache
  invalidateUserRedisCache(userId);

  // Rotate refresh token and get new access token
  const accessToken = await rotateRefreshToken(
    c,
    userId,
    newTeamId,
    newRole,
    platformRole,
    newRoleVersion,
  );

  const plan = await getTeamPlan(newTeamId);
  logAudit({
    teamId: newTeamId,
    actorId: userId,
    action: "member.joined",
    ip: getIp(c),
    plan,
    target: { type: "user", id: userId },
    metadata: { code, role: newRole, fromTeam: currentTeamId },
  }).catch(() => {});

  return success(c, { accessToken, teamId: newTeamId, teamName, role: newRole });
});

// ============================
// POST /leave — leave team
// ============================

teamRoutes.post("/leave", async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const role = c.get("role") as UserRole;
  const platformRole = c.get("platformRole") as string;
  const db = getDb();
  const now = new Date();

  // Cannot leave if owner
  if (role === "owner") {
    return apiError(c, "FORBIDDEN", "Owner cannot leave the team. Transfer ownership first.", 403);
  }

  // Get user info for personal team creation
  const user = await db.collection("users").findOne({ _id: userId });
  if (!user) return apiError(c, "NOT_FOUND", "User not found", 404);

  // Create fresh personal team
  const newTeamId = randomUUID();
  const teamName = `${user.name}'s Team`;
  const teamSlug = await generateUniqueSlug(user.name);

  await db.collection("teams").insertOne({
    _id: newTeamId,
    name: teamName,
    slug: teamSlug,
    plan: "free",
    ownerId: userId,
    watchlist: [],
    inviteCodes: [],
    createdAt: now,
    updatedAt: now,
  });

  // Revoke all API keys
  await db.collection("apiKeys").deleteMany({ userId });

  // Revoke other sessions (keep current)
  const currentRefreshToken = getRefreshTokenFromCookie(c);
  if (currentRefreshToken) {
    const currentHash = hashToken(currentRefreshToken);
    await db.collection("sessions").deleteMany({
      userId,
      refreshTokenHash: { $ne: currentHash },
    });
  } else {
    await db.collection("sessions").deleteMany({ userId });
  }

  // Update user: new personal team, owner role
  const newRoleVersion = (user.roleVersion ?? 0) + 1;
  await db.collection("users").updateOne(
    { _id: userId },
    {
      $set: {
        teamId: newTeamId,
        role: "owner",
        roleVersion: newRoleVersion,
        updatedAt: now,
      },
    },
  );

  // Invalidate Redis cache
  invalidateUserRedisCache(userId);

  // Rotate refresh token and get new access token
  const accessToken = await rotateRefreshToken(
    c,
    userId,
    newTeamId,
    "owner",
    platformRole,
    newRoleVersion,
  );

  const plan = await getTeamPlan(teamId);
  logAudit({
    teamId,
    actorId: userId,
    action: "member.removed",
    ip: getIp(c),
    plan,
    target: { type: "user", id: userId },
    metadata: { action: "left", newTeamId },
  }).catch(() => {});

  return success(c, { accessToken, teamId: newTeamId, teamName, role: "owner" });
});

// ============================
// DELETE /members/:userId — remove member (admin+)
// ============================

teamRoutes.delete("/members/:memberId", requireRole("admin"), async (c) => {
  const actorId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const memberId = c.req.param("memberId");
  const db = getDb();
  const now = new Date();

  if (memberId === actorId) {
    return apiError(c, "FORBIDDEN", "Cannot remove yourself. Use POST /leave instead.", 403);
  }

  // Look up target user
  const targetUser = await db.collection("users").findOne({ _id: memberId, teamId });
  if (!targetUser) {
    return apiError(c, "NOT_FOUND", "Member not found in this team", 404);
  }

  if (targetUser.role === "owner") {
    return apiError(c, "FORBIDDEN", "Cannot remove the team owner", 403);
  }

  // Create personal team for removed user
  const newTeamId = randomUUID();
  const teamName = `${targetUser.name}'s Team`;
  const teamSlug = await generateUniqueSlug(targetUser.name);

  await db.collection("teams").insertOne({
    _id: newTeamId,
    name: teamName,
    slug: teamSlug,
    plan: "free",
    ownerId: memberId,
    watchlist: [],
    inviteCodes: [],
    createdAt: now,
    updatedAt: now,
  });

  // Revoke removed user's API keys
  await db.collection("apiKeys").deleteMany({ userId: memberId });

  // Revoke removed user's sessions
  await db.collection("sessions").deleteMany({ userId: memberId });

  // Update user: move to personal team, owner role
  const newRoleVersion = (targetUser.roleVersion ?? 0) + 1;
  await db.collection("users").updateOne(
    { _id: memberId },
    {
      $set: {
        teamId: newTeamId,
        role: "owner",
        roleVersion: newRoleVersion,
        updatedAt: now,
      },
    },
  );

  // Invalidate Redis cache for removed user
  invalidateUserRedisCache(memberId);

  const plan = await getTeamPlan(teamId);
  logAudit({
    teamId,
    actorId,
    action: "member.removed",
    ip: getIp(c),
    plan,
    target: { type: "user", id: memberId },
    metadata: { newTeamId },
  }).catch(() => {});

  return success(c, { removed: true, userId: memberId });
});

// ============================
// PUT /members/:userId/role — change role (owner only)
// ============================

teamRoutes.put("/members/:memberId/role", requireRole("owner"), async (c) => {
  const actorId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const memberId = c.req.param("memberId");
  const db = getDb();
  const now = new Date();

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, "Request body must be valid JSON");
  }

  const { role } = body;
  const validRoles: UserRole[] = ["viewer", "member", "admin"];
  if (!role || !validRoles.includes(role as UserRole)) {
    return validationError(c, `role must be one of: ${validRoles.join(", ")}`);
  }

  const targetUser = await db.collection("users").findOne({ _id: memberId, teamId });
  if (!targetUser) {
    return apiError(c, "NOT_FOUND", "Member not found in this team", 404);
  }

  if (targetUser.role === "owner") {
    return apiError(c, "FORBIDDEN", "Cannot change owner role. Use POST /transfer-ownership instead.", 403);
  }

  const newRoleVersion = (targetUser.roleVersion ?? 0) + 1;
  await db.collection("users").updateOne(
    { _id: memberId },
    {
      $set: {
        role,
        roleVersion: newRoleVersion,
        updatedAt: now,
      },
    },
  );

  // Invalidate Redis cache for affected user
  invalidateUserRedisCache(memberId);

  const plan = await getTeamPlan(teamId);
  logAudit({
    teamId,
    actorId,
    action: "role.changed",
    ip: getIp(c),
    plan,
    target: { type: "user", id: memberId },
    metadata: { oldRole: targetUser.role, newRole: role },
  }).catch(() => {});

  return success(c, { userId: memberId, role });
});

// ============================
// POST /transfer-ownership — transfer ownership (owner only)
// ============================

teamRoutes.post("/transfer-ownership", requireRole("owner"), async (c) => {
  const actorId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const db = getDb();
  const now = new Date();

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, "Request body must be valid JSON");
  }

  const { userId: targetId } = body;
  if (!targetId || typeof targetId !== "string") {
    return validationError(c, "userId is required");
  }

  if (targetId === actorId) {
    return apiError(c, "CONFLICT", "Cannot transfer ownership to yourself", 409);
  }

  const targetUser = await db.collection("users").findOne({ _id: targetId, teamId });
  if (!targetUser) {
    return apiError(c, "NOT_FOUND", "Target user not found in this team", 404);
  }

  // New owner: increment roleVersion
  const targetNewRoleVersion = (targetUser.roleVersion ?? 0) + 1;
  await db.collection("users").updateOne(
    { _id: targetId },
    { $set: { role: "owner", roleVersion: targetNewRoleVersion, updatedAt: now } },
  );

  // Current owner: demote to admin, increment roleVersion
  const currentOwner = await db.collection("users").findOne({ _id: actorId });
  const actorNewRoleVersion = ((currentOwner?.roleVersion) ?? 0) + 1;
  await db.collection("users").updateOne(
    { _id: actorId },
    { $set: { role: "admin", roleVersion: actorNewRoleVersion, updatedAt: now } },
  );

  // Update team ownerId
  await db.collection("teams").updateOne(
    { _id: teamId },
    { $set: { ownerId: targetId, updatedAt: now } },
  );

  // Invalidate Redis for both users
  invalidateUserRedisCache(targetId);
  invalidateUserRedisCache(actorId);

  const plan = await getTeamPlan(teamId);
  logAudit({
    teamId,
    actorId,
    action: "team.ownership_transferred",
    ip: getIp(c),
    plan,
    target: { type: "user", id: targetId },
    metadata: { from: actorId, to: targetId },
  }).catch(() => {});

  return success(c, { transferred: true, newOwnerId: targetId });
});

// ============================
// GET /watchlist — return team watchlist
// ============================

teamRoutes.get("/watchlist", async (c) => {
  const teamId = c.get("teamId") as string;
  const db = getDb();

  const team = await db.collection("teams").findOne(
    { _id: teamId },
    { projection: { watchlist: 1 } },
  );

  if (!team) return apiError(c, "NOT_FOUND", "Team not found", 404);

  return success(c, { watchlist: team.watchlist ?? [] });
});

// ============================
// PUT /watchlist — replace watchlist (member+)
// ============================

teamRoutes.put("/watchlist", requireRole("member"), async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const db = getDb();

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, "Request body must be valid JSON");
  }

  const { watchlist } = body;
  if (!Array.isArray(watchlist)) {
    return validationError(c, "watchlist must be an array");
  }

  const now = new Date();
  await db.collection("teams").updateOne(
    { _id: teamId },
    { $set: { watchlist, updatedAt: now } },
  );

  return success(c, { watchlist });
});

// ============================
// PATCH /watchlist — add/remove entities (member+)
// ============================

teamRoutes.patch("/watchlist", requireRole("member"), async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const db = getDb();

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, "Request body must be valid JSON");
  }

  const { add, remove } = body;
  const now = new Date();

  // Handle add and remove in separate operations
  if (add && Array.isArray(add) && add.length > 0) {
    await db.collection("teams").updateOne(
      { _id: teamId },
      { $addToSet: { watchlist: { $each: add } } as any, $set: { updatedAt: now } },
    );
  }

  if (remove && Array.isArray(remove) && remove.length > 0) {
    await db.collection("teams").updateOne(
      { _id: teamId },
      { $pull: { watchlist: { $in: remove } } as any, $set: { updatedAt: now } },
    );
  }

  const team = await db.collection("teams").findOne(
    { _id: teamId },
    { projection: { watchlist: 1 } },
  );

  return success(c, { watchlist: team?.watchlist ?? [] });
});

// ============================
// POST /views — create saved view (member+)
// ============================

teamRoutes.post("/views", requireRole("member"), async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const db = getDb();

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, "Request body must be valid JSON");
  }

  const { name, layers, viewport, filters } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return validationError(c, "name is required");
  }

  if (!Array.isArray(layers)) {
    return validationError(c, "layers must be an array");
  }

  if (!viewport || typeof viewport !== "object") {
    return validationError(c, "viewport is required");
  }

  const now = new Date();
  const viewId = randomUUID();

  const view = {
    _id: viewId,
    teamId,
    createdBy: userId,
    name: name.trim(),
    layers,
    viewport,
    filters: filters || undefined,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("savedViews").insertOne(view);

  return success(c, view, {}, 201);
});

// ============================
// GET /views — list team's views (member+)
// ============================

teamRoutes.get("/views", async (c) => {
  const teamId = c.get("teamId") as string;
  const db = getDb();

  const views = await db
    .collection("savedViews")
    .find({ teamId }, { sort: { createdAt: -1 } })
    .toArray();

  return success(c, { views });
});

// ============================
// PUT /views/:id — update saved view (creator or admin+)
// ============================

teamRoutes.put("/views/:id", async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const role = c.get("role") as UserRole;
  const viewId = c.req.param("id");
  const db = getDb();

  const view = await db.collection("savedViews").findOne({ _id: viewId, teamId });
  if (!view) return apiError(c, "NOT_FOUND", `Saved view '${viewId}' not found`, 404);

  // Only creator or admin+ can update
  const isAdmin = role === "admin" || role === "owner";
  if (view.createdBy !== userId && !isAdmin) {
    return apiError(c, "FORBIDDEN", "Only the creator or admin can update this view", 403);
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, "Request body must be valid JSON");
  }

  const { name, layers, viewport, filters } = body;
  const updates: Record<string, any> = { updatedAt: new Date() };

  if (name !== undefined) {
    if (typeof name !== "string" || name.trim() === "") {
      return validationError(c, "name must be a non-empty string");
    }
    updates.name = name.trim();
  }

  if (layers !== undefined) {
    if (!Array.isArray(layers)) return validationError(c, "layers must be an array");
    updates.layers = layers;
  }

  if (viewport !== undefined) updates.viewport = viewport;
  if (filters !== undefined) updates.filters = filters;

  await db.collection("savedViews").updateOne({ _id: viewId }, { $set: updates });

  const updated = await db.collection("savedViews").findOne({ _id: viewId });
  return success(c, updated);
});

// ============================
// DELETE /views/:id — delete saved view (creator or admin+)
// ============================

teamRoutes.delete("/views/:id", async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const role = c.get("role") as UserRole;
  const viewId = c.req.param("id");
  const db = getDb();

  const view = await db.collection("savedViews").findOne({ _id: viewId, teamId });
  if (!view) return apiError(c, "NOT_FOUND", `Saved view '${viewId}' not found`, 404);

  // Only creator or admin+ can delete
  const isAdmin = role === "admin" || role === "owner";
  if (view.createdBy !== userId && !isAdmin) {
    return apiError(c, "FORBIDDEN", "Only the creator or admin can delete this view", 403);
  }

  await db.collection("savedViews").deleteOne({ _id: viewId });

  return success(c, { deleted: true, _id: viewId });
});

// ============================
// GET /audit — paginated audit log (admin+)
// ============================

teamRoutes.get("/audit", requireRole("admin"), async (c) => {
  const teamId = c.get("teamId") as string;
  const db = getDb();

  const searchParams = new URL(c.req.url).searchParams;
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
  const action = searchParams.get("action") ?? undefined;
  const actorId = searchParams.get("actorId") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const filter: Record<string, any> = { teamId };

  if (action) filter.action = action;
  if (actorId) filter.actorId = actorId;

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const total = await db.collection("auditEvents").countDocuments(filter);
  const events = await db
    .collection("auditEvents")
    .find(filter, {
      sort: { createdAt: -1 },
      skip: offset,
      limit,
    })
    .toArray();

  return c.json({
    data: events,
    meta: { total, limit, offset },
  });
});
