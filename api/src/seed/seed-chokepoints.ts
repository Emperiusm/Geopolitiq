// api/src/seed/seed-chokepoints.ts
import { getDb } from "../infrastructure/mongo";
import { parseChokepoints } from "./parse-bundle";
import type { GeoPoint } from "../types";

function toGeoPoint(lng: number, lat: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

export async function seedChokepoints(): Promise<number> {
  const db = getDb();
  const col = db.collection("chokepoints");
  const raw = await parseChokepoints();
  const now = new Date();

  const ops = raw.map((cp) => ({
    updateOne: {
      filter: { _id: cp.id },
      update: {
        $set: {
          name: cp.name,
          type: cp.type,
          lat: cp.lat,
          lng: cp.lng,
          location: toGeoPoint(cp.lng, cp.lat),
          tooltipLine: cp.tooltipLine ?? "",
          summary: cp.summary ?? "",
          dailyVessels: cp.dailyVessels ?? "",
          oilVolume: cp.oilVolume ?? "",
          gasVolume: cp.gasVolume ?? "",
          status: cp.status ?? "OPEN",
          dependentCountries: cp.dependentCountries ?? [],
          strategicSummary: cp.strategicSummary ?? "",
          searchTerms: cp.searchTerms ?? [],
          updatedAt: now,
          dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);

  await col.createIndex({ location: "2dsphere" });
  await col.createIndex({ type: 1 });
  await col.createIndex({ status: 1 });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
