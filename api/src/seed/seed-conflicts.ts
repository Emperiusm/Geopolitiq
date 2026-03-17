// api/src/seed/seed-conflicts.ts
import { getDb } from "../infrastructure/mongo";
import type { GeoPoint } from "../types";

function toGeoPoint(lng: number, lat: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

function daysSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

const CONFLICTS = [
  { id: "us-iran-war", title: "US and Israel at War with Iran", lat: 32.0, lng: 53.0, startDate: "2026-02-27", status: "active", casualties: [{ party: "Iran", figure: "6,000+ killed" }, { party: "Israel", figure: "14 killed" }, { party: "US", figure: "13 killed" }], latestUpdate: "Iran strikes U.S.-owned oil tanker in Strait of Hormuz", tags: ["BREAKING", "CONFLICT"], relatedCountries: ["US", "IL", "IR"] },
  { id: "russia-ukraine-war", title: "Russia-Ukraine War", lat: 48.38, lng: 31.17, startDate: "2022-02-24", status: "active", casualties: [{ party: "Russia", figure: "~1.2M casualties" }, { party: "Ukraine", figure: "~500-600K casualties" }], latestUpdate: "Peace negotiations continue with Western mediation", tags: ["CONFLICT"], relatedCountries: ["UA", "RU"] },
  { id: "israel-hamas-war", title: "Israel-Hamas War (Gaza)", lat: 31.5, lng: 34.47, startDate: "2023-10-07", status: "active", casualties: [{ party: "Gaza", figure: "45,000+ killed" }, { party: "Israel", figure: "1,700+ killed" }], latestUpdate: "Humanitarian crisis deepens in Gaza", tags: ["CONFLICT"], relatedCountries: ["IL", "PS"] },
  { id: "sudan-civil-war", title: "Sudan Civil War", lat: 15.5, lng: 32.5, startDate: "2023-04-15", status: "active", casualties: [{ party: "Civilian", figure: "15,000+ killed" }], latestUpdate: "UN emergency session on Sudan humanitarian crisis", tags: ["CONFLICT"], relatedCountries: ["SD"] },
];

export async function seedConflicts(): Promise<number> {
  const db = getDb();
  const col = db.collection("conflicts");
  const now = new Date();

  const ops = CONFLICTS.map((c) => ({
    updateOne: {
      filter: { _id: c.id },
      update: {
        $set: {
          title: c.title, lat: c.lat, lng: c.lng,
          location: toGeoPoint(c.lng, c.lat),
          startDate: new Date(c.startDate),
          dayCount: daysSince(c.startDate),
          status: c.status, casualties: c.casualties,
          latestUpdate: c.latestUpdate, tags: c.tags,
          relatedCountries: c.relatedCountries,
          updatedAt: now, dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);
  await col.createIndex({ status: 1 });
  await col.createIndex({ relatedCountries: 1 });
  await col.createIndex({ startDate: 1 });
  await col.createIndex({ location: "2dsphere" });
  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
