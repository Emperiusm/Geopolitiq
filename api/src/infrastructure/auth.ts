import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { createHash, randomBytes, randomUUID } from "crypto";
import { getDb } from "./mongo";
import type { UserRole, PlatformRole, AuditAction, TeamPlan } from "../types/auth";

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
