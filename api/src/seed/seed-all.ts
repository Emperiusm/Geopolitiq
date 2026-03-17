// api/src/seed/seed-all.ts
import { connectMongo, disconnectMongo } from "../infrastructure/mongo";
import { seedPorts } from "./seed-ports";
import { seedChokepoints } from "./seed-chokepoints";
import { seedCountries } from "./seed-countries";
import { seedCountryColors } from "./seed-country-colors";
import { seedBases } from "./seed-bases";
import { seedNSA } from "./seed-nsa";
import { seedElections } from "./seed-elections";
import { seedTradeRoutes } from "./seed-trade-routes";
import { seedConflicts } from "./seed-conflicts";
import { seedNews } from "./seed-news";

export interface SeedResults {
  ports: number;
  chokepoints: number;
  countries: number;
  countryColors: number;
  bases: number;
  nonStateActors: number;
  elections: number;
  tradeRoutes: number;
  conflicts: number;
  news: number;
}

export async function seedAll(): Promise<SeedResults> {
  console.log("[seed] Starting full seed...");
  const start = Date.now();

  console.log("[seed] Seeding ports...");
  const ports = await seedPorts();
  console.log(`[seed]   -> ${ports} ports`);

  console.log("[seed] Seeding chokepoints...");
  const chokepoints = await seedChokepoints();
  console.log(`[seed]   -> ${chokepoints} chokepoints`);

  console.log("[seed] Seeding countries...");
  const countries = await seedCountries();
  console.log(`[seed]   -> ${countries} countries`);

  console.log("[seed] Seeding country colors...");
  const countryColors = await seedCountryColors();
  console.log(`[seed]   -> ${countryColors} country colors`);

  console.log("[seed] Seeding bases...");
  const bases = await seedBases();
  console.log(`[seed]   -> ${bases} bases`);

  console.log("[seed] Seeding non-state actors...");
  const nonStateActors = await seedNSA();
  console.log(`[seed]   -> ${nonStateActors} non-state actors`);

  console.log("[seed] Seeding elections...");
  const elections = await seedElections();
  console.log(`[seed]   -> ${elections} elections`);

  console.log("[seed] Seeding trade routes...");
  const tradeRoutes = await seedTradeRoutes();
  console.log(`[seed]   -> ${tradeRoutes} trade routes`);

  console.log("[seed] Seeding conflicts...");
  const conflicts = await seedConflicts();
  console.log(`[seed]   -> ${conflicts} conflicts`);

  console.log("[seed] Seeding news...");
  const news = await seedNews();
  console.log(`[seed]   -> ${news} news events`);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[seed] Complete in ${elapsed}s`);

  return { ports, chokepoints, countries, countryColors, bases, nonStateActors, elections, tradeRoutes, conflicts, news };
}

// CLI entry: `bun src/seed/seed-all.ts`
if (import.meta.main) {
  const uri = process.env.MONGO_URI ?? "mongodb://localhost:27017/gambit";
  await connectMongo(uri);
  const results = await seedAll();
  console.log("[seed] Results:", JSON.stringify(results, null, 2));
  await disconnectMongo();
  process.exit(0);
}
