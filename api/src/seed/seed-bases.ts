// api/src/seed/seed-bases.ts
import { getDb } from "../infrastructure/mongo";
import { parseBases } from "./parse-bundle";
import type { GeoPoint } from "../types";

function toGeoPoint(lng: number, lat: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

export async function seedBases(): Promise<number> {
  const db = getDb();
  const col = db.collection("bases");
  const raw = await parseBases();
  const now = new Date();

  const ops = raw.map((b) => ({
    updateOne: {
      filter: { _id: b.id },
      update: {
        $set: {
          name: b.name,
          country: b.country,
          hostNation: b.hostNation ?? b.location ?? b.country,
          operatingCountry: b.country,
          lat: b.lat,
          lng: b.lng,
          location: toGeoPoint(b.lng, b.lat),
          branch: b.branch ?? "",
          type: b.type ?? "base",
          flag: b.flag ?? "",
          color: b.color ?? "#888888",
          personnel: b.personnel ?? "",
          history: b.history ?? "",
          significance: b.significance ?? "",
          iranWarRole: b.iranWarRole ?? null,
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
  await col.createIndex({ country: 1 });
  await col.createIndex({ branch: 1 });
  await col.createIndex({ type: 1 });
  await col.createIndex({ operatingCountry: 1 });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
