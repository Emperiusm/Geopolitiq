// api/src/seed/seed-country-colors.ts
import { getDb } from "../infrastructure/mongo";

const COUNTRY_COLORS: Record<string, string> = {
  "United States": "#3b82f6", "Russia": "#ef4444", "China": "#f97316",
  "United Kingdom": "#22c55e", "France": "#8b5cf6", "India": "#eab308",
  "Turkey": "#06b6d4", "Israel": "#6366f1", "Iran": "#dc2626",
  "Saudi Arabia": "#10b981", "Japan": "#f43f5e", "South Korea": "#0ea5e9",
  "Australia": "#a855f7", "Germany": "#64748b", "Italy": "#14b8a6",
  "Pakistan": "#84cc16", "Egypt": "#d97706", "Brazil": "#059669",
  "Canada": "#e11d48", "NATO": "#2563eb", "UAE": "#0891b2",
  "Qatar": "#7c3aed", "Singapore": "#ec4899", "Greece": "#2dd4bf",
  "Spain": "#f59e0b", "Netherlands": "#f97316", "Poland": "#dc2626",
  "Norway": "#0284c7", "Denmark": "#4f46e5", "Belgium": "#be185d",
};

export async function seedCountryColors(): Promise<number> {
  const db = getDb();
  const col = db.collection("countryColors");
  const now = new Date();

  const ops = Object.entries(COUNTRY_COLORS).map(([name, color]) => ({
    updateOne: {
      filter: { _id: name },
      update: {
        $set: { color, updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);
  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
