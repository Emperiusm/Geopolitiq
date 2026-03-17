import { getDb } from "../../infrastructure/mongo";
import { publishEvent } from "../../infrastructure/sse";

async function updateConflictDayCounts() {
  try {
    const col = getDb().collection("conflicts");
    const conflicts = await col.find({ status: "active" }).toArray();
    const now = new Date();

    for (const conflict of conflicts) {
      const dayCount = Math.floor((now.getTime() - new Date(conflict.startDate).getTime()) / (1000 * 60 * 60 * 24));
      if (dayCount !== conflict.dayCount) {
        await col.updateOne({ _id: conflict._id }, { $set: { dayCount, updatedAt: now } });
        await publishEvent("conflict-update", {
          id: conflict._id,
          dayCount,
          latestUpdate: conflict.latestUpdate,
        });
      }
    }
  } catch (err) {
    console.error("[periodic] Conflict day counter error:", err);
  }
}

let interval: ReturnType<typeof setInterval> | null = null;

export function startConflictCounter() {
  updateConflictDayCounts();
  interval = setInterval(updateConflictDayCounts, 60 * 60 * 1000);
  console.log("[periodic] Conflict day counter started (hourly)");
}

export function stopConflictCounter() {
  if (interval) clearInterval(interval);
  interval = null;
}
