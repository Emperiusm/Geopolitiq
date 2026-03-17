// api/src/seed/seed-nsa.ts
import { getDb } from "../infrastructure/mongo";
import { parseNSA } from "./parse-bundle";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function seedNSA(): Promise<number> {
  const db = getDb();
  const col = db.collection("nonStateActors");
  const raw = await parseNSA();
  const now = new Date();

  const ops = raw.map((a) => ({
    updateOne: {
      filter: { _id: a.id ?? slugify(a.name ?? "unknown") },
      update: {
        $set: {
          name: a.name ?? "",
          ideology: a.ideology ?? "",
          status: a.status ?? "active",
          designation: a.designation ?? "",
          founded: a.founded ?? "",
          revenue: a.revenue ?? "",
          strength: a.strength ?? "",
          activities: a.activities ?? "",
          territory: a.territory ?? "",
          funding: a.funding ?? "",
          leaders: a.leaders ?? "",
          allies: a.allies ?? [],
          rivals: a.rivals ?? [],
          majorAttacks: a.majorAttacks ?? [],
          searchTerms: a.searchTerms ?? [],
          zones: (a.zones ?? []).map((z: any) => ({
            lat: z.lat,
            lng: z.lng,
            radiusKm: z.radiusKm ?? z.radius ?? 50,
          })),
          updatedAt: now,
          dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);

  await col.createIndex({ status: 1 });
  await col.createIndex({ ideology: 1 });
  await col.createIndex({ name: "text", searchTerms: "text" });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
