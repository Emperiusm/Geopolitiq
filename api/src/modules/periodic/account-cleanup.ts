import { getDb } from "../../infrastructure/mongo";

export async function runAccountCleanup(): Promise<number> {
  const db = getDb();
  const now = new Date();

  const usersToDelete = await db.collection("users")
    .find({ deletedAt: { $lte: now } })
    .toArray();

  let count = 0;
  for (const user of usersToDelete) {
    const userId = user._id as string;

    await db.collection("sessions").deleteMany({ userId });
    await db.collection("apiKeys").deleteMany({ userId });
    await db.collection("userPreferences").deleteOne({ _id: userId });
    await db.collection("notificationPreferences").deleteOne({ _id: userId });
    await db.collection("userSettings").deleteOne({ _id: userId });

    await db.collection("newsAnalysis").updateMany(
      { userId },
      { $set: { userId: "deleted-user" } },
    );
    await db.collection("auditEvents").updateMany(
      { actorId: userId },
      { $set: { actorId: "deleted-user" } },
    );

    if (user.role === "owner") {
      const memberCount = await db.collection("users").countDocuments({
        teamId: user.teamId, _id: { $ne: userId },
      });
      if (memberCount === 0) {
        await db.collection("teams").deleteOne({ _id: user.teamId });
        await db.collection("savedViews").deleteMany({ teamId: user.teamId });
        await db.collection("teamSettings").deleteOne({ _id: user.teamId });
      }
    }

    await db.collection("users").deleteOne({ _id: userId });
    count++;
  }

  // Archived team cleanup — delete teams soft-deleted > 30 days ago
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const archivedTeams = await db.collection("teams")
    .find({ deletedAt: { $lte: thirtyDaysAgo } })
    .toArray();

  for (const team of archivedTeams) {
    await db.collection("savedViews").deleteMany({ teamId: team._id });
    await db.collection("teamSettings").deleteOne({ _id: team._id });
    await db.collection("teams").deleteOne({ _id: team._id });
  }

  if (count > 0) console.log(`[gambit] Account cleanup: hard-deleted ${count} user(s)`);
  if (archivedTeams.length > 0) console.log(`[gambit] Account cleanup: removed ${archivedTeams.length} archived team(s)`);

  return count;
}

export function startAccountCleanup(): void {
  const intervalMs = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runAccountCleanup().catch((err) =>
      console.error("[gambit] Account cleanup error:", err),
    );
  }, intervalMs);
  console.log("[gambit] Account cleanup job scheduled (daily)");
}
