// api/src/seed/seed-countries.ts
import { getDb } from "../infrastructure/mongo";
import { parseCountries } from "./parse-bundle";
import type { GeoPoint } from "../types";

const ISO2_MAP: Record<string, string> = {
  "Afghanistan": "AF", "Albania": "AL", "Algeria": "DZ", "Andorra": "AD",
  "Angola": "AO", "Argentina": "AR", "Armenia": "AM", "Australia": "AU",
  "Austria": "AT", "Azerbaijan": "AZ", "Bahamas": "BS", "Bahrain": "BH",
  "Bangladesh": "BD", "Barbados": "BB", "Belarus": "BY", "Belgium": "BE",
  "Belize": "BZ", "Benin": "BJ", "Bhutan": "BT", "Bolivia": "BO",
  "Bosnia and Herzegovina": "BA", "Botswana": "BW", "Brazil": "BR",
  "Brunei": "BN", "Bulgaria": "BG", "Burkina Faso": "BF", "Burundi": "BI",
  "Cambodia": "KH", "Cameroon": "CM", "Canada": "CA", "Cape Verde": "CV",
  "Central African Republic": "CF", "Chad": "TD", "Chile": "CL",
  "China": "CN", "Colombia": "CO", "Comoros": "KM", "Congo": "CG",
  "Costa Rica": "CR", "Croatia": "HR", "Cuba": "CU", "Cyprus": "CY",
  "Czech Republic": "CZ", "Czechia": "CZ",
  "Democratic Republic of the Congo": "CD", "DRC": "CD",
  "Denmark": "DK", "Djibouti": "DJ", "Dominican Republic": "DO",
  "East Timor": "TL", "Timor-Leste": "TL",
  "Ecuador": "EC", "Egypt": "EG", "El Salvador": "SV",
  "Equatorial Guinea": "GQ", "Eritrea": "ER", "Estonia": "EE",
  "Eswatini": "SZ", "Ethiopia": "ET", "Fiji": "FJ", "Finland": "FI",
  "France": "FR", "Gabon": "GA", "Gambia": "GM", "Georgia": "GE",
  "Germany": "DE", "Ghana": "GH", "Greece": "GR", "Guatemala": "GT",
  "Guinea": "GN", "Guinea-Bissau": "GW", "Guyana": "GY", "Haiti": "HT",
  "Honduras": "HN", "Hungary": "HU", "Iceland": "IS", "India": "IN",
  "Indonesia": "ID", "Iran": "IR", "Iraq": "IQ", "Ireland": "IE",
  "Israel": "IL", "Italy": "IT", "Ivory Coast": "CI", "Côte d'Ivoire": "CI",
  "Jamaica": "JM", "Japan": "JP", "Jordan": "JO", "Kazakhstan": "KZ",
  "Kenya": "KE", "Kosovo": "XK", "Kuwait": "KW", "Kyrgyzstan": "KG",
  "Laos": "LA", "Latvia": "LV", "Lebanon": "LB", "Lesotho": "LS",
  "Liberia": "LR", "Libya": "LY", "Lithuania": "LT", "Luxembourg": "LU",
  "Madagascar": "MG", "Malawi": "MW", "Malaysia": "MY", "Maldives": "MV",
  "Mali": "ML", "Malta": "MT", "Mauritania": "MR", "Mauritius": "MU",
  "Mexico": "MX", "Moldova": "MD", "Mongolia": "MN", "Montenegro": "ME",
  "Morocco": "MA", "Mozambique": "MZ", "Myanmar": "MM", "Namibia": "NA",
  "Nepal": "NP", "Netherlands": "NL", "New Zealand": "NZ", "Nicaragua": "NI",
  "Niger": "NE", "Nigeria": "NG", "North Korea": "KP", "North Macedonia": "MK",
  "Norway": "NO", "Oman": "OM", "Pakistan": "PK", "Palestine": "PS",
  "Panama": "PA", "Papua New Guinea": "PG", "Paraguay": "PY", "Peru": "PE",
  "Philippines": "PH", "Poland": "PL", "Portugal": "PT", "Qatar": "QA",
  "Romania": "RO", "Russia": "RU", "Rwanda": "RW", "Saudi Arabia": "SA",
  "Senegal": "SN", "Serbia": "RS", "Sierra Leone": "SL", "Singapore": "SG",
  "Slovakia": "SK", "Slovenia": "SI", "Somalia": "SO", "South Africa": "ZA",
  "South Korea": "KR", "South Sudan": "SS", "Spain": "ES", "Sri Lanka": "LK",
  "Sudan": "SD", "Suriname": "SR", "Sweden": "SE", "Switzerland": "CH",
  "Syria": "SY", "Taiwan": "TW", "Tajikistan": "TJ", "Tanzania": "TZ",
  "Thailand": "TH", "Togo": "TG", "Trinidad and Tobago": "TT",
  "Tunisia": "TN", "Turkey": "TR", "Turkmenistan": "TM", "Uganda": "UG",
  "Ukraine": "UA", "United Arab Emirates": "AE", "United Kingdom": "GB",
  "United States": "US", "Uruguay": "UY", "Uzbekistan": "UZ",
  "Venezuela": "VE", "Vietnam": "VN", "Yemen": "YE", "Zambia": "ZM",
  "Zimbabwe": "ZW",
};

function slugify(name: string): string {
  return name.toLowerCase().replace(/['']/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function toGeoPoint(lng: number, lat: number): GeoPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

export async function seedCountries(): Promise<number> {
  const db = getDb();
  const col = db.collection("countries");
  const raw = await parseCountries();
  const now = new Date();

  const ops = Object.entries(raw).map(([name, data]) => ({
    updateOne: {
      filter: { _id: slugify(name) },
      update: {
        $set: {
          iso2: ISO2_MAP[name] ?? "",
          name,
          flag: data.flag ?? "",
          lat: data.lat,
          lng: data.lng,
          location: toGeoPoint(data.lng, data.lat),
          risk: (data.risk ?? "clear").toLowerCase(),
          tags: data.tags ?? [],
          region: data.region ?? "",
          pop: data.pop ?? "",
          gdp: data.gdp ?? "",
          leader: data.leader ?? "",
          title: data.title ?? "",
          casualties: data.casualties ?? null,
          analysis: data.analysis ?? { what: "", why: "", next: "" },
          updatedAt: now,
          dataSource: "hegemon-bundle",
        },
        $setOnInsert: { createdAt: now },
      },
      upsert: true,
    },
  }));

  const result = await col.bulkWrite(ops);

  await col.createIndex({ risk: 1 });
  await col.createIndex({ region: 1 });
  await col.createIndex({ location: "2dsphere" });
  await col.createIndex({ tags: 1 });
  await col.createIndex({ iso2: 1 }, { unique: true, partialFilterExpression: { iso2: { $gt: "" } } });
  await col.createIndex({ name: "text" });

  return result.upsertedCount + result.modifiedCount + result.matchedCount;
}
