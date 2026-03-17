// api/src/modules/system/admin-routes.ts
// Platform admin routes: recovery email, user listing, team listing

import { Hono } from "hono";
import { randomUUID } from "crypto";
import { getDb } from "../../infrastructure/mongo";
import { getEmailService } from "../../infrastructure/email";
import { hashToken, logAudit } from "../../infrastructure/auth";
import { success, apiError, paginated } from "../../helpers/response";
import { requirePlatformAdmin } from "../../middleware/require-platform-admin";
import type { User, Team } from "../../types/auth";

export const adminRoutes = new Hono();

// Apply platform admin middleware to all routes
adminRoutes.use("*", requirePlatformAdmin());

// Helper to get IP from context
function getIp(c: any): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    c.req.header("x-real-ip") ??
    "unknown"
  );
}

// Helper to get FRONTEND_URL
function getFrontendUrl(): string {
  return process.env.FRONTEND_URL ?? "http://localhost:5173";
}

// ---- POST /recovery ----
// Send account recovery email to user by email address
adminRoutes.post("/recovery", async (c) => {
  const db = getDb();
  const body = await c.req.json();
  const { email } = body as { email?: string };

  if (!email || typeof email !== "string") {
    return apiError(c, "VALIDATION_ERROR", "email is required", 400);
  }

  // Look up user by email (including soft-deleted)
  const user = (await db.collection("users").findOne({
    email,
  })) as User | null;

  if (!user) {
    return apiError(c, "NOT_FOUND", `User '${email}' not found`, 404);
  }

  // Check for existing unexpired recovery token
  const existingToken = await db.collection("recoveryTokens").findOne({
    userId: user._id,
    expiresAt: { $gt: new Date() },
  });

  if (existingToken) {
    return apiError(
      c,
      "CONFLICT",
      "Recovery email already sent recently. Please check your inbox or wait before requesting again.",
      409,
    );
  }

  // Generate recovery token (24h expiry)
  const rawToken = randomUUID();
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  // Store hashed token in recoveryTokens collection
  await db.collection("recoveryTokens").insertOne({
    _id: randomUUID(),
    userId: user._id,
    hash: tokenHash,
    expiresAt,
    createdAt: now,
  });

  // Send recovery email
  const emailService = getEmailService();
  const frontendUrl = getFrontendUrl();
  const recoveryLink = `${frontendUrl}/recover?token=${rawToken}`;

  try {
    await emailService.send(user.email, "account_recovery", {
      name: user.name,
      recoveryLink,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[admin-recovery] Failed to send email:", err);
    // Don't fail the request — token is stored, email will be in logs
  }

  // Log audit event
  const adminUserId = c.get("userId") as string;
  const adminTeamId = c.get("teamId") as string;
  try {
    await logAudit({
      teamId: adminTeamId,
      actorId: adminUserId,
      action: "user.recovery_initiated",
      ip: getIp(c),
      plan: "free",
      target: { type: "user", id: user._id },
      metadata: { email: user.email },
    });
  } catch (err) {
    console.error("[admin-recovery] Failed to log audit:", err);
  }

  return success(c, {
    message: "Recovery email sent",
    expiresAt: expiresAt.toISOString(),
  });
});

// ---- GET /users ----
// List all users with pagination and optional search
adminRoutes.get("/users", async (c) => {
  const db = getDb();

  // Parse query parameters
  const limit = Math.min(parseInt(c.req.query("limit") ?? "20"), 100);
  const offset = parseInt(c.req.query("offset") ?? "0");
  const search = c.req.query("search") ?? "";

  // Build query
  let query: Record<string, any> = {};

  if (search) {
    // Case-insensitive regex search on name and email
    const searchRegex = { $regex: search, $options: "i" };
    query = {
      $or: [{ name: searchRegex }, { email: searchRegex }],
    };
  }

  // Get total count
  const total = await db.collection("users").countDocuments(query);

  // Fetch paginated results, excluding roleVersion
  const users = (await db
    .collection("users")
    .find(query)
    .project({ roleVersion: 0 })
    .skip(offset)
    .limit(limit)
    .toArray()) as Omit<User, "roleVersion">[];

  return paginated(c, users, total, limit, offset);
});

// ---- GET /teams ----
// List all teams with pagination and optional search
adminRoutes.get("/teams", async (c) => {
  const db = getDb();

  // Parse query parameters
  const limit = Math.min(parseInt(c.req.query("limit") ?? "20"), 100);
  const offset = parseInt(c.req.query("offset") ?? "0");
  const search = c.req.query("search") ?? "";

  // Build query
  let query: Record<string, any> = {};

  if (search) {
    // Case-insensitive regex search on name and slug
    const searchRegex = { $regex: search, $options: "i" };
    query = {
      $or: [{ name: searchRegex }, { slug: searchRegex }],
    };
  }

  // Get total count
  const total = await db.collection("teams").countDocuments(query);

  // Fetch paginated results
  const teams = (await db
    .collection("teams")
    .find(query)
    .skip(offset)
    .limit(limit)
    .toArray()) as Team[];

  return paginated(c, teams, total, limit, offset);
});
