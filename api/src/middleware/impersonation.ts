import type { MiddlewareHandler } from "hono";
import { getDb } from "../infrastructure/mongo";
import { logAudit } from "../infrastructure/auth";

export const impersonation: MiddlewareHandler = async (c, next) => {
  const targetUserId = c.req.header("x-impersonate-user");
  if (!targetUserId) return next();

  const platformRole = c.get("platformRole") as string;
  if (platformRole !== "admin") {
    return c.json(
      { error: { code: "FORBIDDEN", message: "Only platform admins can impersonate", action: "none" } },
      403,
    );
  }

  const db = getDb();
  const targetUser = await db.collection("users").findOne({ _id: targetUserId });
  if (!targetUser) {
    return c.json(
      { error: { code: "NOT_FOUND", message: "Target user not found", action: "none" } },
      404,
    );
  }

  const adminUserId = c.get("userId") as string;
  c.set("realActorId", adminUserId);
  c.set("userId", targetUser._id);
  c.set("role", targetUser.role);
  c.set("teamId", targetUser.teamId);

  const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  logAudit({
    teamId: targetUser.teamId,
    actorId: adminUserId,
    action: "admin.impersonated",
    target: { type: "user", id: targetUserId },
    ip,
    plan: "free",
  }).catch(() => {});

  return next();
};
