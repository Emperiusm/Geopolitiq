// api/src/seed/seed-ports.ts
import { getDb } from "../infrastructure/mongo";
import type { GeoPoint } from "../types";

function toGeoPoint(lng: number, lat: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

const PORTS: Array<{ id: string; name: string; lat: number; lng: number; country: string }> = [
  { id: "shanghai", name: "Shanghai", lat: 31.23, lng: 121.47, country: "China" },
  { id: "rotterdam", name: "Rotterdam", lat: 51.9, lng: 4.5, country: "Netherlands" },
  { id: "singapore", name: "Singapore", lat: 1.26, lng: 103.84, country: "Singapore" },
  { id: "busan", name: "Busan", lat: 35.1, lng: 129.04, country: "South Korea" },
  { id: "hong-kong", name: "Hong Kong", lat: 22.29, lng: 114.16, country: "China" },
  { id: "shenzhen", name: "Shenzhen", lat: 22.54, lng: 114.06, country: "China" },
  { id: "guangzhou", name: "Guangzhou", lat: 23.11, lng: 113.25, country: "China" },
  { id: "ningbo", name: "Ningbo-Zhoushan", lat: 29.87, lng: 121.55, country: "China" },
  { id: "qingdao", name: "Qingdao", lat: 36.07, lng: 120.38, country: "China" },
  { id: "tianjin", name: "Tianjin", lat: 39.08, lng: 117.7, country: "China" },
  { id: "dubai", name: "Jebel Ali (Dubai)", lat: 25.01, lng: 55.06, country: "UAE" },
  { id: "port-klang", name: "Port Klang", lat: 3.0, lng: 101.39, country: "Malaysia" },
  { id: "hamburg", name: "Hamburg", lat: 53.55, lng: 9.97, country: "Germany" },
  { id: "antwerp", name: "Antwerp", lat: 51.23, lng: 4.4, country: "Belgium" },
  { id: "los-angeles", name: "Los Angeles / Long Beach", lat: 33.74, lng: -118.27, country: "United States" },
  { id: "new-york", name: "New York / New Jersey", lat: 40.67, lng: -74.04, country: "United States" },
  { id: "houston", name: "Houston", lat: 29.76, lng: -95.36, country: "United States" },
  { id: "savannah", name: "Savannah", lat: 32.08, lng: -81.09, country: "United States" },
  { id: "tokyo", name: "Tokyo", lat: 35.65, lng: 139.77, country: "Japan" },
  { id: "yokohama", name: "Yokohama", lat: 35.44, lng: 139.64, country: "Japan" },
  { id: "mumbai", name: "Mumbai (JNPT)", lat: 18.95, lng: 72.95, country: "India" },
  { id: "colombo", name: "Colombo", lat: 6.94, lng: 79.84, country: "Sri Lanka" },
  { id: "santos", name: "Santos", lat: -23.96, lng: -46.3, country: "Brazil" },
  { id: "felixstowe", name: "Felixstowe", lat: 51.96, lng: 1.35, country: "United Kingdom" },
  { id: "piraeus", name: "Piraeus", lat: 37.94, lng: 23.64, country: "Greece" },
  { id: "tanjung-pelepas", name: "Tanjung Pelepas", lat: 1.36, lng: 103.55, country: "Malaysia" },
  { id: "laem-chabang", name: "Laem Chabang", lat: 13.08, lng: 100.88, country: "Thailand" },
  { id: "jeddah", name: "Jeddah", lat: 21.49, lng: 39.19, country: "Saudi Arabia" },
  { id: "algeciras", name: "Algeciras", lat: 36.13, lng: -5.45, country: "Spain" },
  { id: "tanger-med", name: "Tanger Med", lat: 35.89, lng: -5.5, country: "Morocco" },
  { id: "richards-bay", name: "Richards Bay", lat: -28.8, lng: 32.08, country: "South Africa" },
  { id: "durban", name: "Durban", lat: -29.87, lng: 31.05, country: "South Africa" },
  { id: "mombasa", name: "Mombasa", lat: -4.04, lng: 39.67, country: "Kenya" },
  { id: "dar-es-salaam", name: "Dar es Salaam", lat: -6.83, lng: 39.28, country: "Tanzania" },
  { id: "vladivostok", name: "Vladivostok", lat: 43.12, lng: 131.87, country: "Russia" },
  { id: "novorossiysk", name: "Novorossiysk", lat: 44.72, lng: 37.77, country: "Russia" },
  { id: "gwadar", name: "Gwadar", lat: 25.13, lng: 62.33, country: "Pakistan" },
];

export async function seedPorts(): Promise<number> {
  const db = getDb();
  const col = db.collection("ports");
  const now = new Date();

  const ops = PORTS.map((p) => ({
    updateOne: {
      filter: { _id: p.id },
      update: {
        $set: {
          name: p.name, lat: p.lat, lng: p.lng,
          location: toGeoPoint(p.lng, p.lat),
          country: p.country, updatedAt: now, dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);
  await col.createIndex({ location: "2dsphere" });
  await col.createIndex({ country: 1 });
  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
