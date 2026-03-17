import { readFile } from "fs/promises";
import { resolve } from "path";

const DATA_DIR = resolve(import.meta.dir, "../../../.firecrawl");

/**
 * Read a .js file, strip the variable declaration, and evaluate to get the data.
 * These files use `const NAME = <JS literal>` format.
 */
async function evalJsFile(filename: string, varPattern: RegExp): Promise<unknown> {
  const raw = await readFile(resolve(DATA_DIR, filename), "utf-8");
  // Strip the variable declaration: "const X = " or "const X="
  const stripped = raw.replace(varPattern, "").replace(/;\s*$/, "");
  // Unescape escaped brackets (artifact of some extraction)
  const cleaned = stripped.replaceAll("\\[", "[").replaceAll("\\]", "]");
  // Use Function constructor to safely evaluate the JS literal
  const fn = new Function(`return (${cleaned});`);
  return fn();
}

/** Parse hegemon-countries-raw.js -> { [name]: { lat, lng, flag, ... } } */
export async function parseCountries(): Promise<Record<string, any>> {
  return evalJsFile("hegemon-countries-raw.js", /^const\s+ct\s*=\s*/) as Promise<Record<string, any>>;
}

/** Parse hegemon-bases.js -> [{ id, name, lat, lng, ... }] */
export async function parseBases(): Promise<any[]> {
  return evalJsFile("hegemon-bases.js", /^const\s+BASES\s*=\s*/) as Promise<any[]>;
}

/** Parse hegemon-nsa-full.js -> [{ id, name, ideology, ... }] */
export async function parseNSA(): Promise<any[]> {
  const raw = await readFile(resolve(DATA_DIR, "hegemon-nsa-full.js"), "utf-8");
  let stripped = raw.replace(/^const\s+NSA\s*=\s*/, "").replace(/;\s*$/, "");
  stripped = stripped.replaceAll("\\[", "[").replaceAll("\\]", "]");

  // Handle irregular format - may be missing array/object wrapping
  if (!stripped.trimStart().startsWith("[")) {
    if (stripped.trimStart().startsWith("{") || stripped.trimStart().startsWith("id:") || stripped.trimStart().startsWith("ideology:")) {
      stripped = `[{${stripped.trimStart().startsWith("{") ? stripped.trimStart().slice(1) : stripped}}]`;
    }
  }

  const fn = new Function(`return (${stripped});`);
  const result = fn();
  return Array.isArray(result) ? result : [result];
}

/** Parse hegemon-chokepoints.js -> [{ id, name, type, ... }] */
export async function parseChokepoints(): Promise<any[]> {
  return evalJsFile("hegemon-chokepoints.js", /^const\s+CHOKEPOINTS\s*=\s*/) as Promise<any[]>;
}

/** Parse hegemon-elections.js -> [{ flag, country, date, ... }] */
export async function parseElections(): Promise<any[]> {
  return evalJsFile("hegemon-elections.js", /^const\s+ELECTIONS\s*=\s*/) as Promise<any[]>;
}

// Waypoint ID normalization for trade routes
export const WAYPOINT_ID_MAP: Record<string, string> = {
  malacca_strait: "malacca",
  suez_canal: "suez",
  bab_el_mandeb: "bab-el-mandeb",
  panama_canal: "panama",
  strait_of_hormuz: "hormuz",
  cape_of_good_hope: "cape",
  strait_of_gibraltar: "gibraltar",
  turkish_straits: "bosphorus",
  taiwan_strait: "taiwan",
  lombok_strait: "lombok",
  korea_strait: "korea",
  dover_strait: "dover",
};

export function normalizeWaypointId(id: string): string {
  return WAYPOINT_ID_MAP[id] ?? id.replace(/_/g, "-");
}
