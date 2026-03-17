// api/src/seed/seed-elections.ts
import { getDb } from "../infrastructure/mongo";
import { parseElections, parseCountries } from "./parse-bundle";
import type { GeoPoint } from "../types";

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toGeoPoint(lng: number, lat: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

function parseDateString(dateStr: string): Date {
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  const parts = dateStr.split(" ");
  if (parts.length === 2) {
    return new Date(`${parts[0]} 1, ${parts[1]}`);
  }
  return new Date();
}

const ISO2_ELECTIONS: Record<string, string> = {
  "Bangladesh": "BD", "Japan": "JP", "Portugal": "PT", "Thailand": "TH",
  "United States": "US", "France": "FR", "Brazil": "BR", "Germany": "DE",
  "Colombia": "CO", "United Kingdom": "GB", "Australia": "AU",
  "South Korea": "KR", "India": "IN", "Mexico": "MX", "Canada": "CA",
  "Israel": "IL", "Turkey": "TR", "Iran": "IR", "Iraq": "IQ",
};

export async function seedElections(): Promise<number> {
  const db = getDb();
  const col = db.collection("elections");
  const dedicated = await parseElections();
  const now = new Date();

  const countries = await parseCountries();
  const embedded: any[] = [];

  for (const [name, data] of Object.entries(countries)) {
    if (data.elections && Array.isArray(data.elections)) {
      for (const e of data.elections) {
        embedded.push({ ...e, country: name, flag: data.flag, lat: data.lat, lng: data.lng });
      }
    }
    if (data.election && typeof data.election === "object") {
      embedded.push({ ...data.election, country: name, flag: data.flag, lat: data.lat, lng: data.lng });
    }
  }

  const allElections = [...dedicated, ...embedded];

  const ops = allElections.map((e) => {
    const countrySlug = slugify(e.country);
    const dateSlug = slugify(e.date ?? "unknown");
    const id = `${countrySlug}-${dateSlug}`;
    const iso2 = ISO2_ELECTIONS[e.country] ?? "";
    const lat = e.lat ?? countries[e.country]?.lat ?? 0;
    const lng = e.lng ?? countries[e.country]?.lng ?? 0;

    return {
      updateOne: {
        filter: { _id: id },
        update: {
          $set: {
            flag: e.flag ?? "",
            country: e.country,
            countryISO2: iso2,
            lat, lng,
            location: toGeoPoint(lng, lat),
            date: e.date ?? "",
            dateISO: parseDateString(e.date ?? ""),
            type: e.type ?? "",
            winner: e.winner ?? null,
            result: e.result ?? null,
            summary: e.summary ?? "",
            updatedAt: now,
            dataSource: "hegemon-bundle",
          },
          $setOnInsert: { createdAt: now },
        },
        upsert: true,
      },
    };
  });

  if (ops.length === 0) return 0;
  const result = await col.bulkWrite(ops);

  await col.createIndex({ dateISO: 1 });
  await col.createIndex({ country: 1 });
  await col.createIndex({ location: "2dsphere" });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
