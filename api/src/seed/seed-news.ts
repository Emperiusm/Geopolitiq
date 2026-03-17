// api/src/seed/seed-news.ts
import { getDb } from "../infrastructure/mongo";

const NEWS_EVENTS = [
  { title: "Trump's War Stalls Diplomacy as Iran Conflict Enters Third Week", summary: "Diplomatic channels between the US and Iran remain frozen as military operations continue.", tags: ["CONFLICT"], sourceCount: 8, conflictId: "us-iran-war", relatedCountries: ["US", "IR"], publishedAt: "2026-03-16T20:00:00Z" },
  { title: "Iran Strikes U.S.-Owned Oil Tanker in Strait of Hormuz", summary: "An Iranian anti-ship missile struck a US-flagged commercial tanker transiting the Strait of Hormuz.", tags: ["BREAKING", "CONFLICT"], sourceCount: 12, conflictId: "us-iran-war", relatedCountries: ["US", "IR"], publishedAt: "2026-03-16T18:00:00Z" },
  { title: "Oil Prices Surge Past $130 as Hormuz Closure Tightens Supply", summary: "Brent crude topped $130/barrel as markets reacted to the effective closure of the Strait of Hormuz.", tags: ["ECONOMIC"], sourceCount: 6, conflictId: "us-iran-war", relatedCountries: ["US", "IR", "SA"], publishedAt: "2026-03-16T15:00:00Z" },
  { title: "UN Emergency Session on Sudan Humanitarian Crisis", summary: "The UN Security Council convened an emergency session on the worsening humanitarian situation in Sudan.", tags: ["HUMANITARIAN"], sourceCount: 5, conflictId: "sudan-civil-war", relatedCountries: ["SD"], publishedAt: "2026-03-16T12:00:00Z" },
  { title: "Russian Cyberattack Targets European Financial Infrastructure", summary: "A coordinated cyberattack attributed to Russian state actors disrupted SWIFT terminals across Eastern Europe.", tags: ["CYBER", "SECURITY"], sourceCount: 7, conflictId: null, relatedCountries: ["RU", "PL", "DE"], publishedAt: "2026-03-16T10:00:00Z" },
  { title: "South Korea Deploys Additional Naval Assets to Red Sea", summary: "South Korean Navy deploying destroyer group to protect commercial shipping in the Red Sea.", tags: ["SECURITY"], sourceCount: 4, conflictId: null, relatedCountries: ["KR", "YE"], publishedAt: "2026-03-15T22:00:00Z" },
  { title: "Gaza Humanitarian Corridor Proposal Gains Traction", summary: "International coalition pushing for protected humanitarian corridors in northern Gaza.", tags: ["HUMANITARIAN", "CONFLICT"], sourceCount: 9, conflictId: "israel-hamas-war", relatedCountries: ["IL", "PS", "EG"], publishedAt: "2026-03-15T18:00:00Z" },
  { title: "France and UK Pledge Military Hubs in Ukraine", summary: "France and the United Kingdom announced plans to install military training and logistics hubs in western Ukraine.", tags: ["SECURITY", "DIPLOMACY"], sourceCount: 6, conflictId: "russia-ukraine-war", relatedCountries: ["FR", "GB", "UA"], publishedAt: "2026-03-15T14:00:00Z" },
];

export async function seedNews(): Promise<number> {
  const db = getDb();
  const col = db.collection("news");
  const now = new Date();

  const ops = NEWS_EVENTS.map((n) => ({
    updateOne: {
      filter: { title: n.title },
      update: {
        $set: {
          title: n.title, summary: n.summary, tags: n.tags,
          sourceCount: n.sourceCount, conflictId: n.conflictId,
          relatedCountries: n.relatedCountries,
          publishedAt: new Date(n.publishedAt),
          updatedAt: now, dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);
  await col.createIndex({ publishedAt: -1 });
  await col.createIndex({ tags: 1 });
  await col.createIndex({ conflictId: 1 });
  await col.createIndex({ relatedCountries: 1 });
  await col.createIndex({ title: "text", summary: "text" });
  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
