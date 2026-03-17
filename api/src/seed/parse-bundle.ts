import { readFile } from "fs/promises";
import { resolve } from "path";

const DATA_DIR = resolve(import.meta.dir, "../../../.firecrawl");

/**
 * Read a .js file, clean extraction artifacts, and evaluate as JS.
 * The scraped files have `\[` and `\]` around array literals (invalid JS)
 * from the extraction process. We strip those before evaluating.
 */
async function evalJsFile(filename: string, varName: string): Promise<unknown> {
  let raw = await readFile(resolve(DATA_DIR, filename), "utf-8");
  // Remove extraction artifacts: \[ \] \` are not valid JS escape sequences
  raw = raw.replaceAll("\\[", "[").replaceAll("\\]", "]").replaceAll("\\`", "`");
  const fn = new Function(`${raw}\nreturn ${varName};`);
  return fn();
}

/** Parse hegemon-countries-raw.js -> { [name]: { lat, lng, flag, ... } } */
export async function parseCountries(): Promise<Record<string, any>> {
  return evalJsFile("hegemon-countries-raw.js", "ct") as Promise<Record<string, any>>;
}

/** Parse hegemon-bases.js -> [{ id, name, lat, lng, ... }] */
export async function parseBases(): Promise<any[]> {
  return evalJsFile("hegemon-bases.js", "BASES") as Promise<any[]>;
}

/** Parse hegemon-nsa-full.js -> [{ id, name, ideology, ... }] */
export async function parseNSA(): Promise<any[]> {
  let raw = await readFile(resolve(DATA_DIR, "hegemon-nsa-full.js"), "utf-8");
  raw = raw.replaceAll("\\[", "[").replaceAll("\\]", "]").replaceAll("\\`", "`");

  // Try direct eval first (file may define `const NSA = [...]`)
  try {
    const fn = new Function(`${raw}\nreturn NSA;`);
    const result = fn();
    return Array.isArray(result) ? result : [result];
  } catch {
    // Fallback: file may start with `const NSA=` followed by bare properties
    let content = raw.replace(/^const\s+NSA\s*=\s*/, "").replace(/;\s*$/, "");
    if (!content.trimStart().startsWith("[")) {
      content = `[{${content.trimStart().startsWith("{") ? content.trimStart().slice(1) : content}}]`;
    }
    const fn2 = new Function(`return (${content});`);
    const result = fn2();
    return Array.isArray(result) ? result : [result];
  }
}

/** Parse hegemon-chokepoints.js -> [{ id, name, type, ... }] */
export async function parseChokepoints(): Promise<any[]> {
  return evalJsFile("hegemon-chokepoints.js", "CHOKEPOINTS") as Promise<any[]>;
}

/** Parse hegemon-elections.js -> [{ flag, country, date, ... }] */
export async function parseElections(): Promise<any[]> {
  return evalJsFile("hegemon-elections.js", "ELECTIONS") as Promise<any[]>;
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
