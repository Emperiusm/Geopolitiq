import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { createHash, randomBytes, randomUUID } from "crypto";
import { getDb } from "./mongo";
import type { UserRole, PlatformRole, AuditAction, TeamPlan, OAuthProfile, FindOrCreateResult, User } from "../types/auth";

// --- JWT ---

const JWT_EXPIRY = "15m";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || "dev-jwt-secret-change-me-in-production-64-chars-minimum-padding!";
  return new TextEncoder().encode(secret);
}

interface AccessTokenPayload {
  userId: string;
  role: UserRole;
  teamId: string;
  platformRole: PlatformRole;
  roleVersion: number;
}

export async function signAccessToken(
  payload: AccessTokenPayload,
  expiresIn: string = JWT_EXPIRY,
): Promise<string> {
  return new SignJWT({ ...payload } as unknown as JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer("gambit")
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    issuer: "gambit",
  });
  return {
    userId: payload.userId as string,
    role: payload.role as UserRole,
    teamId: payload.teamId as string,
    platformRole: payload.platformRole as PlatformRole,
    roleVersion: payload.roleVersion as number,
  };
}

// --- Hashing ---

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// --- Token Generation ---

export function generateRefreshToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateAuthCode(): string {
  return randomUUID();
}

// --- Slug Generation ---

export function generateSlug(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateUniqueSlug(baseName: string): Promise<string> {
  const db = getDb();
  const base = generateSlug(baseName);
  const exists = await db.collection("teams").findOne({ slug: base });
  if (!exists) return base;

  for (let i = 0; i < 3; i++) {
    const suffix = randomBytes(2).toString("hex");
    const candidate = `${base}-${suffix}`;
    const taken = await db.collection("teams").findOne({ slug: candidate });
    if (!taken) return candidate;
  }

  return `${base}-${randomUUID().slice(0, 8)}`;
}

// --- Role Hierarchy ---

const ROLE_LEVELS: Record<UserRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export function roleLevel(role: UserRole): number {
  return ROLE_LEVELS[role];
}

// --- Device Parsing ---

export function parseDevice(userAgent: string): { browser: string; os: string } {
  let browser = "Unknown";
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) browser = "Chrome";
  else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
  else if (userAgent.includes("Firefox")) browser = "Firefox";
  else if (userAgent.includes("Edg")) browser = "Edge";

  let os = "Unknown";
  if (userAgent.includes("Windows NT 10")) os = "Windows";
  else if (userAgent.includes("Macintosh")) os = "macOS";
  else if (userAgent.includes("iPhone")) os = "iPhone";
  else if (userAgent.includes("Android")) os = "Android";
  else if (userAgent.includes("Linux")) os = "Linux";

  return { browser, os };
}

// --- Audit Logging ---

interface AuditParams {
  teamId: string;
  actorId: string;
  action: AuditAction;
  ip: string;
  plan: TeamPlan;
  realActorId?: string;
  viaApiKey?: { id: string; name: string; prefix: string };
  target?: { type: "user" | "apikey" | "team" | "session" | "invite"; id: string };
  metadata?: Record<string, any>;
}

export async function logAudit(params: AuditParams): Promise<void> {
  const db = getDb();
  const now = new Date();
  const retentionDays = params.plan === "pro" ? 365 : 90;
  const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);

  await db.collection("auditEvents").insertOne({
    _id: randomUUID(),
    teamId: params.teamId,
    actorId: params.actorId,
    realActorId: params.realActorId,
    viaApiKey: params.viaApiKey,
    action: params.action,
    target: params.target,
    metadata: params.metadata,
    ip: params.ip,
    expiresAt,
    createdAt: now,
  });
}

// --- Scoping Helpers ---

export function teamScope(teamId: string): { teamId: string } {
  return { teamId };
}

export function userScope(userId: string): { userId: string } {
  return { userId };
}

// --- findOrCreateUser ---

export async function findOrCreateUser(
  profile: OAuthProfile,
  inviteCode?: string,
): Promise<FindOrCreateResult> {
  const db = getDb();
  const now = new Date();

  // 1. Look up by provider + providerId
  const existingByProvider = await db.collection("users").findOne({
    "providers.provider": profile.provider,
    "providers.providerId": profile.providerId,
  }) as User | null;

  if (existingByProvider) {
    const updates: Record<string, any> = { lastLoginAt: now, updatedAt: now };

    // Update avatar only if customAvatar === false
    if (!existingByProvider.customAvatar && profile.avatar) {
      updates.avatar = profile.avatar;
    }

    // Email sync: if provider says email changed and it's verified
    let emailUpdated: { old: string; new: string } | undefined;
    if (profile.emailVerified && profile.email !== existingByProvider.email) {
      const emailTaken = await db.collection("users").findOne({
        email: profile.email,
        _id: { $ne: existingByProvider._id },
      });
      if (!emailTaken) {
        updates.email = profile.email;
        emailUpdated = { old: existingByProvider.email, new: profile.email };
        logAudit({
          teamId: existingByProvider.teamId,
          actorId: existingByProvider._id,
          action: "user.email_updated",
          ip: "system",
          plan: "free",
          metadata: { old: existingByProvider.email, new: profile.email, provider: profile.provider },
        }).catch(() => {});
      }
    }

    // If deletion was requested, cancel it
    if (existingByProvider.deletionRequestedAt) {
      updates.deletionRequestedAt = null;
      updates.deletedAt = null;
      // Re-enable API keys
      await db.collection("apiKeys").updateMany(
        { userId: existingByProvider._id, disabled: true },
        { $set: { disabled: false, disabledAt: null } },
      );
      logAudit({
        teamId: existingByProvider.teamId,
        actorId: existingByProvider._id,
        action: "user.deletion_cancelled",
        ip: "system",
        plan: "free",
        metadata: { reason: "login" },
      }).catch(() => {});
    }

    await db.collection("users").updateOne({ _id: existingByProvider._id }, { $set: updates });
    const updatedUser = { ...existingByProvider, ...updates } as User;
    return { user: updatedUser, isNew: false, ...(emailUpdated ? { emailUpdated } : {}) };
  }

  // 2. Email not verified — reject
  if (!profile.emailVerified) {
    throw new Error("Email not verified by provider. Please verify your email and try again.");
  }

  // 3. Look up by email (auto-linking) — only non-deleted users
  const existingByEmail = await db.collection("users").findOne({
    email: profile.email,
    deletedAt: { $exists: false },
  }) as User | null;

  if (existingByEmail) {
    // Add provider to user's providers[]
    const newProvider = {
      provider: profile.provider,
      providerId: profile.providerId,
      email: profile.email,
      verified: profile.emailVerified,
      linkedAt: now,
    };

    const updates: Record<string, any> = {
      lastLoginAt: now,
      updatedAt: now,
      $push: { providers: newProvider },
    };

    // Update avatar only if customAvatar === false
    const avatarUpdate: Record<string, any> = { lastLoginAt: now, updatedAt: now };
    if (!existingByEmail.customAvatar && profile.avatar) {
      avatarUpdate.avatar = profile.avatar;
    }

    await db.collection("users").updateOne(
      { _id: existingByEmail._id },
      {
        $set: avatarUpdate,
        $push: { providers: newProvider } as any,
      },
    );

    logAudit({
      teamId: existingByEmail.teamId,
      actorId: existingByEmail._id,
      action: "provider.linked",
      ip: "system",
      plan: "free",
      metadata: { provider: profile.provider, providerId: profile.providerId },
    }).catch(() => {});

    const updatedUser = {
      ...existingByEmail,
      ...avatarUpdate,
      providers: [...existingByEmail.providers, newProvider],
    } as User;
    return { user: updatedUser, isNew: false };
  }

  // 4. New user creation
  const newUserId = randomUUID();
  let teamId: string;
  let role: UserRole = "owner";
  let platformRole: PlatformRole = "user";
  let joined: { teamId: string; teamName: string } | undefined;
  let inviteError: "expired" | "exhausted" | "not_found" | undefined;

  // Try invite code
  let inviteValid = false;
  if (inviteCode) {
    // Atomically increment uses and add to usedBy, filtered by code + not expired
    const inviteResult = await db.collection("teams").findOneAndUpdate(
      {
        "inviteCodes.code": inviteCode,
        "inviteCodes.expiresAt": { $gt: now },
      },
      {
        $inc: { "inviteCodes.$.uses": 1 },
        $push: { "inviteCodes.$.usedBy": newUserId } as any,
      },
      { returnDocument: "after" },
    );

    if (inviteResult) {
      const inviteEntry = (inviteResult as any).inviteCodes?.find((ic: any) => ic.code === inviteCode);
      // Check uses <= maxUses after increment (if uses > maxUses, the code was exhausted)
      if (inviteEntry && inviteEntry.uses <= inviteEntry.maxUses) {
        teamId = (inviteResult as any)._id;
        role = inviteEntry.role;
        joined = { teamId, teamName: (inviteResult as any).name };
        inviteValid = true;
      } else {
        // Undo the increment — code was exhausted
        await db.collection("teams").updateOne(
          { "inviteCodes.code": inviteCode },
          {
            $inc: { "inviteCodes.$.uses": -1 },
            $pull: { "inviteCodes.$.usedBy": newUserId } as any,
          },
        );
        inviteError = "exhausted";
      }
    } else {
      // Determine reason
      const teamWithCode = await db.collection("teams").findOne({ "inviteCodes.code": inviteCode });
      if (!teamWithCode) {
        inviteError = "not_found";
      } else {
        const entry = (teamWithCode as any).inviteCodes?.find((ic: any) => ic.code === inviteCode);
        if (entry && new Date(entry.expiresAt) < now) {
          inviteError = "expired";
        } else {
          inviteError = "exhausted";
        }
      }
    }
  }

  if (!inviteValid) {
    // Check first-user claim (atomic)
    const platformConfigResult = await db.collection("platformConfig").findOneAndUpdate(
      { _id: "config", firstUserClaimed: false },
      { $set: { firstUserClaimed: true, claimedBy: newUserId } },
      { upsert: false, returnDocument: "after" },
    );

    if (platformConfigResult) {
      platformRole = "admin";
    } else {
      // Ensure platformConfig exists
      await db.collection("platformConfig").updateOne(
        { _id: "config" },
        { $setOnInsert: { firstUserClaimed: false } },
        { upsert: true },
      );
    }

    // Create personal team
    const newTeamId = randomUUID();
    const teamName = `${profile.name}'s Team`;
    const teamSlug = await generateUniqueSlug(profile.name);

    await db.collection("teams").insertOne({
      _id: newTeamId,
      name: teamName,
      slug: teamSlug,
      plan: "free",
      ownerId: newUserId,
      watchlist: [],
      inviteCodes: [],
      createdAt: now,
      updatedAt: now,
    });

    teamId = newTeamId;
    role = "owner";
  }

  // Create user
  const newUser: User = {
    _id: newUserId,
    email: profile.email,
    name: profile.name,
    avatar: profile.avatar,
    customAvatar: false,
    role,
    platformRole,
    teamId: teamId!,
    roleVersion: 0,
    providers: [
      {
        provider: profile.provider,
        providerId: profile.providerId,
        email: profile.email,
        verified: profile.emailVerified,
        linkedAt: now,
      },
    ],
    lastLoginAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await db.collection("users").insertOne(newUser);

  // Create default NotificationPreferences
  await db.collection("notificationPreferences").insertOne({
    _id: newUserId,
    loginAlerts: true,
    teamInvites: true,
    anomalyDigest: "daily",
    updatedAt: now,
  });

  return { user: newUser, isNew: true, ...(joined ? { joined } : {}), ...(inviteError ? { inviteError } : {}) };
}
