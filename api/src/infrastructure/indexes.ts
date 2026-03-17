import { getDb } from "./mongo";

export async function ensureAuthIndexes(): Promise<void> {
  const db = getDb();

  // users
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex(
    { "providers.provider": 1, "providers.providerId": 1 },
    { unique: true },
  );
  await db.collection("users").createIndex({ teamId: 1 });
  await db.collection("users").createIndex(
    { deletedAt: 1 },
    { sparse: true },
  );

  // teams
  await db.collection("teams").createIndex({ slug: 1 }, { unique: true });

  // sessions
  await db.collection("sessions").createIndex({ userId: 1 });
  await db.collection("sessions").createIndex(
    { absoluteExpiresAt: 1 },
    { expireAfterSeconds: 0 },
  );

  // authCodes
  await db.collection("authCodes").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );

  // apiKeys
  await db.collection("apiKeys").createIndex({ keyHash: 1 }, { unique: true });
  await db.collection("apiKeys").createIndex({ userId: 1 });
  await db.collection("apiKeys").createIndex({ teamId: 1 });

  // auditEvents
  await db.collection("auditEvents").createIndex({ teamId: 1, createdAt: -1 });
  await db.collection("auditEvents").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );

  // savedViews
  await db.collection("savedViews").createIndex({ teamId: 1 });

  // recoveryTokens
  await db.collection("recoveryTokens").createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 },
  );
  await db.collection("recoveryTokens").createIndex({ userId: 1 });

  // Ensure platformConfig singleton exists
  await db.collection("platformConfig").updateOne(
    { _id: "config" },
    { $setOnInsert: { firstUserClaimed: false } },
    { upsert: true },
  );
}
