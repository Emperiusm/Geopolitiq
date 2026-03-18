// api/src/modules/system/api-key-routes.ts
// CRUD + rotate operations for API key management.

import { Hono } from "hono";
import { randomBytes, randomUUID } from "crypto";
import { getDb } from "../../infrastructure/mongo";
import { hashToken, logAudit } from "../../infrastructure/auth";
import { success, apiError, validationError } from "../../helpers/response";
import type { ApiKeyScope, AppVariables } from "../../types/auth";

export const apiKeyRoutes = new Hono<{ Variables: AppVariables }>();

const VALID_SCOPES: ApiKeyScope[] = ["read", "read-write"];

function generateRawKey(): string {
  return `gbt_${randomBytes(24).toString("hex")}`;
}

function keyPrefix(raw: string): string {
  // Return first 12 chars as a recognisable prefix (e.g. "gbt_a1b2c3d4")
  return raw.slice(0, 12);
}

async function getTeamPlan(teamId: string): Promise<"free" | "pro"> {
  const db = getDb();
  const team = await db.collection("teams").findOne({ _id: teamId });
  return (team?.plan as "free" | "pro") ?? "free";
}

// POST / — create a new API key
apiKeyRoutes.post("/", async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return validationError(c, "Request body must be valid JSON");
  }

  const { name, scope, expiresAt } = body;

  if (!name || typeof name !== "string" || name.trim() === "") {
    return validationError(c, "name is required");
  }

  if (!scope || !VALID_SCOPES.includes(scope as ApiKeyScope)) {
    return validationError(c, `scope must be one of: ${VALID_SCOPES.join(", ")}`);
  }

  const rawKey = generateRawKey();
  const prefix = keyPrefix(rawKey);
  const keyHash = hashToken(rawKey);
  const now = new Date();
  const keyId = randomUUID();

  const doc: Record<string, any> = {
    _id: keyId,
    keyHash,
    keyPrefix: prefix,
    userId,
    teamId,
    name: name.trim(),
    scope: scope as ApiKeyScope,
    disabled: false,
    lastUsedAt: null,
    createdAt: now,
  };

  if (expiresAt) {
    doc.expiresAt = new Date(expiresAt);
  }

  const db = getDb();
  await db.collection("apiKeys").insertOne(doc);

  // Fire-and-forget audit log
  const plan = await getTeamPlan(teamId);
  logAudit({
    teamId,
    actorId: userId,
    action: "apikey.created",
    ip: c.req.header("x-forwarded-for") ?? "unknown",
    plan,
    target: { type: "apikey", id: keyId },
    metadata: { name: doc.name, scope, prefix },
  }).catch(() => {});

  return success(
    c,
    {
      _id: keyId,
      key: rawKey, // raw key returned only once
      keyPrefix: prefix,
      name: doc.name,
      scope: doc.scope,
      createdAt: now,
      ...(doc.expiresAt ? { expiresAt: doc.expiresAt } : {}),
    },
    {},
    201,
  );
});

// GET / — list own keys (paginated, exclude keyHash)
apiKeyRoutes.get("/", async (c) => {
  const userId = c.get("userId") as string;
  const db = getDb();

  const searchParams = new URL(c.req.url).searchParams;
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 200);
  const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);

  const filter = { userId };
  const total = await db.collection("apiKeys").countDocuments(filter);

  const keys = await db
    .collection("apiKeys")
    .find(filter, {
      projection: {
        keyHash: 0, // never expose the hash
      },
      sort: { createdAt: -1 },
      skip: offset,
      limit,
    })
    .toArray();

  return c.json({
    data: keys,
    meta: { total, limit, offset },
  });
});

// DELETE /:id — revoke (delete) a key
apiKeyRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const keyId = c.req.param("id");

  const db = getDb();
  const existing = await db.collection("apiKeys").findOne({ _id: keyId, userId });

  if (!existing) {
    return apiError(c, "NOT_FOUND", `API key '${keyId}' not found`, 404);
  }

  await db.collection("apiKeys").deleteOne({ _id: keyId, userId });

  // Fire-and-forget audit log
  const plan = await getTeamPlan(teamId);
  logAudit({
    teamId,
    actorId: userId,
    action: "apikey.revoked",
    ip: c.req.header("x-forwarded-for") ?? "unknown",
    plan,
    target: { type: "apikey", id: keyId },
    metadata: { name: existing.name, prefix: existing.keyPrefix },
  }).catch(() => {});

  return success(c, { revoked: true, _id: keyId });
});

// POST /:id/rotate — generate a new key, update hash + prefix
apiKeyRoutes.post("/:id/rotate", async (c) => {
  const userId = c.get("userId") as string;
  const teamId = c.get("teamId") as string;
  const keyId = c.req.param("id");

  const db = getDb();
  const existing = await db.collection("apiKeys").findOne({ _id: keyId, userId });

  if (!existing) {
    return apiError(c, "NOT_FOUND", `API key '${keyId}' not found`, 404);
  }

  const oldPrefix = existing.keyPrefix as string;
  const rawKey = generateRawKey();
  const newPrefix = keyPrefix(rawKey);
  const newHash = hashToken(rawKey);

  await db.collection("apiKeys").updateOne(
    { _id: keyId, userId },
    { $set: { keyHash: newHash, keyPrefix: newPrefix } },
  );

  // Fire-and-forget audit log
  const plan = await getTeamPlan(teamId);
  logAudit({
    teamId,
    actorId: userId,
    action: "apikey.rotated",
    ip: c.req.header("x-forwarded-for") ?? "unknown",
    plan,
    target: { type: "apikey", id: keyId },
    metadata: { name: existing.name, oldPrefix, newPrefix },
  }).catch(() => {});

  return success(c, {
    _id: keyId,
    key: rawKey, // new raw key returned once
    keyPrefix: newPrefix,
    name: existing.name,
    scope: existing.scope,
  });
});
