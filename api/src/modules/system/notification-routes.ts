// api/src/modules/system/notification-routes.ts
// Notification preference routes for users.

import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import { success, validationError } from "../../helpers/response";
import type { AppVariables } from "../../types/auth";

export const notificationRoutes = new Hono<{ Variables: AppVariables }>();

const DEFAULTS = {
  loginAlerts: true,
  teamInvites: true,
  anomalyDigest: "daily" as const,
};

type AnomalyDigestType = "realtime" | "daily" | "off";

// GET /notifications — get notification prefs
notificationRoutes.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const db = getDb();

  const prefs = await db
    .collection("notificationPreferences")
    .findOne({ _id: userId });

  if (!prefs) {
    return success(c, DEFAULTS);
  }

  return success(c, {
    loginAlerts: prefs.loginAlerts ?? DEFAULTS.loginAlerts,
    teamInvites: prefs.teamInvites ?? DEFAULTS.teamInvites,
    anomalyDigest: prefs.anomalyDigest ?? DEFAULTS.anomalyDigest,
  });
});

// PUT /notifications — update prefs
notificationRoutes.put("/", async (c) => {
  const userId = c.get("userId") as string;

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, "Request body must be valid JSON");
  }

  // Validate individual fields if present
  if ("loginAlerts" in body) {
    if (typeof body.loginAlerts !== "boolean") {
      return validationError(c, "loginAlerts must be a boolean");
    }
  }

  if ("teamInvites" in body) {
    if (typeof body.teamInvites !== "boolean") {
      return validationError(c, "teamInvites must be a boolean");
    }
  }

  if ("anomalyDigest" in body) {
    const validValues: AnomalyDigestType[] = ["realtime", "daily", "off"];
    if (!validValues.includes(body.anomalyDigest)) {
      return validationError(
        c,
        `anomalyDigest must be one of: ${validValues.join(", ")}`,
      );
    }
  }

  const db = getDb();
  const now = new Date();

  // Build update object with only provided fields
  const updateObj: Record<string, any> = {
    updatedAt: now,
  };

  if ("loginAlerts" in body) {
    updateObj.loginAlerts = body.loginAlerts;
  }

  if ("teamInvites" in body) {
    updateObj.teamInvites = body.teamInvites;
  }

  if ("anomalyDigest" in body) {
    updateObj.anomalyDigest = body.anomalyDigest;
  }

  await db.collection("notificationPreferences").updateOne(
    { _id: userId },
    {
      $set: updateObj,
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  // Fetch and return the updated prefs
  const updated = await db
    .collection("notificationPreferences")
    .findOne({ _id: userId });

  return success(c, {
    loginAlerts: updated!.loginAlerts ?? DEFAULTS.loginAlerts,
    teamInvites: updated!.teamInvites ?? DEFAULTS.teamInvites,
    anomalyDigest: updated!.anomalyDigest ?? DEFAULTS.anomalyDigest,
  });
});
