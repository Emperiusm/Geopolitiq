// api/src/seed/seed-trade-routes.ts
import { getDb } from "../infrastructure/mongo";
import { normalizeWaypointId } from "./parse-bundle";

const TRADE_ROUTES = [
  { id: "china-europe-suez", name: "China -> Europe (Suez)", from: "shanghai", to: "rotterdam", category: "container", status: "active", volumeDesc: "47M+ TEU/year", waypoints: ["malacca", "bab-el-mandeb", "suez", "gibraltar"] },
  { id: "china-europe-cape", name: "China -> Europe (Cape Route)", from: "shanghai", to: "rotterdam", category: "container", status: "active", volumeDesc: "Rerouted traffic from Suez", waypoints: ["malacca", "lombok", "cape"] },
  { id: "persian-gulf-asia", name: "Persian Gulf -> East Asia", from: "jeddah", to: "tokyo", category: "energy", status: "disrupted", volumeDesc: "21M bbl/day", waypoints: ["hormuz", "malacca"] },
  { id: "persian-gulf-europe", name: "Persian Gulf -> Europe", from: "jeddah", to: "rotterdam", category: "energy", status: "disrupted", volumeDesc: "5M bbl/day", waypoints: ["hormuz", "bab-el-mandeb", "suez"] },
  { id: "russia-europe-pipeline", name: "Russia -> Europe (Pipeline)", from: "novorossiysk", to: "rotterdam", category: "energy", status: "disrupted", volumeDesc: "1M bbl/day (reduced)", waypoints: ["bosphorus"] },
  { id: "us-gulf-asia", name: "US Gulf -> East Asia", from: "houston", to: "tokyo", category: "energy", status: "active", volumeDesc: "4M bbl/day (LNG+crude)", waypoints: ["panama"] },
  { id: "us-gulf-europe", name: "US Gulf -> Europe", from: "houston", to: "rotterdam", category: "energy", status: "active", volumeDesc: "3M bbl/day", waypoints: [] },
  { id: "australia-asia", name: "Australia -> East Asia", from: "richards-bay", to: "busan", category: "bulk", status: "active", volumeDesc: "Iron ore + LNG", waypoints: ["lombok"] },
  { id: "brazil-china", name: "Brazil -> China", from: "santos", to: "shanghai", category: "bulk", status: "active", volumeDesc: "Iron ore + soybeans", waypoints: ["cape", "malacca"] },
  { id: "west-africa-china", name: "West Africa -> China", from: "durban", to: "shanghai", category: "energy", status: "active", volumeDesc: "2M bbl/day crude", waypoints: ["cape", "malacca"] },
  { id: "qatar-asia-lng", name: "Qatar -> East Asia (LNG)", from: "dubai", to: "tokyo", category: "energy", status: "disrupted", volumeDesc: "77M tons LNG/year", waypoints: ["hormuz", "malacca"] },
  { id: "trans-pacific-container", name: "Trans-Pacific (Container)", from: "shanghai", to: "los-angeles", category: "container", status: "active", volumeDesc: "28M TEU/year", waypoints: [] },
  { id: "intra-asia-container", name: "Intra-Asia (Container)", from: "shanghai", to: "singapore", category: "container", status: "active", volumeDesc: "Largest regional trade flow", waypoints: ["taiwan"] },
  { id: "europe-us-atlantic", name: "Europe -> US (Atlantic)", from: "rotterdam", to: "new-york", category: "container", status: "active", volumeDesc: "8M TEU/year", waypoints: [] },
  { id: "arctic-northern-sea", name: "Northern Sea Route", from: "vladivostok", to: "rotterdam", category: "bulk", status: "active", volumeDesc: "Growing (seasonal)", waypoints: ["denmark"] },
  { id: "caspian-med-btc", name: "Caspian -> Mediterranean (BTC)", from: "novorossiysk", to: "piraeus", category: "energy", status: "active", volumeDesc: "1M bbl/day", waypoints: ["bosphorus"] },
  { id: "nigeria-europe", name: "Nigeria -> Europe (LNG)", from: "mombasa", to: "rotterdam", category: "energy", status: "active", volumeDesc: "22M tons LNG/year", waypoints: ["gibraltar"] },
  { id: "india-europe", name: "India -> Europe", from: "mumbai", to: "rotterdam", category: "container", status: "active", volumeDesc: "Growing", waypoints: ["bab-el-mandeb", "suez"] },
  { id: "china-africa", name: "China -> East Africa", from: "shanghai", to: "mombasa", category: "container", status: "active", volumeDesc: "Belt and Road flow", waypoints: ["malacca"] },
  { id: "south-america-europe", name: "South America -> Europe", from: "santos", to: "rotterdam", category: "bulk", status: "active", volumeDesc: "Agricultural + minerals", waypoints: [] },
  { id: "china-pakistan-cpec", name: "China -> Pakistan (CPEC)", from: "shanghai", to: "gwadar", category: "container", status: "active", volumeDesc: "Growing (BRI)", waypoints: ["malacca"] },
];

export async function seedTradeRoutes(): Promise<number> {
  const db = getDb();
  const col = db.collection("tradeRoutes");
  const now = new Date();

  const ops = TRADE_ROUTES.map((r) => ({
    updateOne: {
      filter: { _id: r.id },
      update: {
        $set: {
          name: r.name, from: r.from, to: r.to,
          category: r.category, status: r.status, volumeDesc: r.volumeDesc,
          waypoints: r.waypoints.map(normalizeWaypointId),
          updatedAt: now, dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);
  await col.createIndex({ category: 1 });
  await col.createIndex({ status: 1 });
  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
