import type { MilitaryAircraftType, MilitaryOperator } from '@/types';

// Re-export all data from extracted modules
export type { CallsignPattern } from './military-callsigns';
export {
  US_MILITARY_CALLSIGNS,
  NATO_ALLIED_CALLSIGNS,
  ADVERSARY_CALLSIGNS,
  ALL_MILITARY_CALLSIGNS,
} from './military-callsigns';

export {
  MILITARY_AIRCRAFT_TYPES,
  MILITARY_HEX_RANGES,
} from './military-aircraft';

export type { VesselPattern, KnownNavalVessel } from './military-vessels';
export {
  MILITARY_VESSEL_PATTERNS,
  KNOWN_NAVAL_VESSELS,
} from './military-vessels';

// Import for internal use by utility functions
import { ALL_MILITARY_CALLSIGNS } from './military-callsigns';
import { MILITARY_AIRCRAFT_TYPES, MILITARY_HEX_RANGES } from './military-aircraft';

/**
 * Regions of interest for military activity monitoring
 */
// Consolidated regions to reduce API calls (max 4 queries)
// Names kept short for map cluster labels
export const MILITARY_HOTSPOTS = [
  // East Asia: Taiwan + SCS + Korea + Japan Sea (combined)
  { name: 'INDO-PACIFIC', lat: 28.0, lon: 125.0, radius: 18, priority: 'high' },
  // Middle East: Persian Gulf + Aden + Mediterranean (combined)
  { name: 'CENTCOM', lat: 28.0, lon: 42.0, radius: 15, priority: 'high' },
  // Europe: Black Sea + Baltic (combined)
  { name: 'EUCOM', lat: 52.0, lon: 28.0, radius: 15, priority: 'medium' },
  // Keep Arctic separate (large but low activity)
  { name: 'ARCTIC', lat: 75.0, lon: 0.0, radius: 10, priority: 'low' },
] as const;

export interface QueryRegion {
  name: string;
  lamin: number;
  lamax: number;
  lomin: number;
  lomax: number;
}

export const MILITARY_QUERY_REGIONS: QueryRegion[] = [
  { name: 'PACIFIC', lamin: 10, lamax: 46, lomin: 107, lomax: 143 },
  { name: 'WESTERN', lamin: 13, lamax: 85, lomin: -10, lomax: 57 },
];

if (import.meta.env.DEV) {
  for (const h of MILITARY_HOTSPOTS) {
    const hbox = { lamin: h.lat - h.radius, lamax: h.lat + h.radius, lomin: h.lon - h.radius, lomax: h.lon + h.radius };
    const covered = MILITARY_QUERY_REGIONS.some(r =>
      r.lamin <= hbox.lamin && r.lamax >= hbox.lamax && r.lomin <= hbox.lomin && r.lomax >= hbox.lomax
    );
    if (!covered) console.error(`[Military] HOTSPOT ${h.name} bbox not covered by any QUERY_REGION`);
  }
}

export const USNI_REGION_COORDINATES: Record<string, { lat: number; lon: number }> = {
  // Seas & Oceans
  'Philippine Sea': { lat: 18.0, lon: 130.0 },
  'South China Sea': { lat: 14.0, lon: 115.0 },
  'East China Sea': { lat: 28.0, lon: 125.0 },
  'Sea of Japan': { lat: 40.0, lon: 135.0 },
  'Arabian Sea': { lat: 18.0, lon: 63.0 },
  'Red Sea': { lat: 20.0, lon: 38.0 },
  'Mediterranean Sea': { lat: 35.0, lon: 18.0 },
  'Eastern Mediterranean': { lat: 34.5, lon: 33.0 },
  'Western Mediterranean': { lat: 37.0, lon: 3.0 },
  'Persian Gulf': { lat: 26.5, lon: 52.0 },
  'Gulf of Oman': { lat: 24.5, lon: 58.5 },
  'Gulf of Aden': { lat: 12.0, lon: 47.0 },
  'Caribbean Sea': { lat: 15.0, lon: -73.0 },
  'North Atlantic': { lat: 45.0, lon: -30.0 },
  'Atlantic Ocean': { lat: 30.0, lon: -40.0 },
  'Western Atlantic': { lat: 30.0, lon: -60.0 },
  'Pacific Ocean': { lat: 20.0, lon: -150.0 },
  'Eastern Pacific': { lat: 18.0, lon: -125.0 },
  'Western Pacific': { lat: 20.0, lon: 140.0 },
  'Indian Ocean': { lat: -5.0, lon: 75.0 },
  'Antarctic': { lat: -70.0, lon: 20.0 },
  'Baltic Sea': { lat: 58.0, lon: 20.0 },
  'Black Sea': { lat: 43.5, lon: 34.0 },
  'Bay of Bengal': { lat: 14.0, lon: 87.0 },
  'Bab el-Mandeb Strait': { lat: 12.5, lon: 43.5 },
  'Strait of Hormuz': { lat: 26.5, lon: 56.5 },
  'Taiwan Strait': { lat: 24.5, lon: 119.5 },
  'Suez Canal': { lat: 30.0, lon: 32.5 },
  // Ports & Bases
  'Yokosuka': { lat: 35.29, lon: 139.67 },
  'Japan': { lat: 35.29, lon: 139.67 },
  'Sasebo': { lat: 33.16, lon: 129.72 },
  'Guam': { lat: 13.45, lon: 144.79 },
  'Pearl Harbor': { lat: 21.35, lon: -157.95 },
  'San Diego': { lat: 32.68, lon: -117.15 },
  'Norfolk': { lat: 36.95, lon: -76.30 },
  'Mayport': { lat: 30.39, lon: -81.40 },
  'Bahrain': { lat: 26.23, lon: 50.55 },
  'Rota': { lat: 36.63, lon: -6.35 },
  'Rota Spain': { lat: 36.63, lon: -6.35 },
  'Diego Garcia': { lat: -7.32, lon: 72.42 },
  'Souda Bay': { lat: 35.49, lon: 24.08 },
  'Naples': { lat: 40.84, lon: 14.25 },
  'Bremerton': { lat: 47.57, lon: -122.63 },
  'Everett': { lat: 47.97, lon: -122.22 },
  'Kings Bay': { lat: 30.80, lon: -81.56 },
  'Bangor': { lat: 47.73, lon: -122.71 },
  'Djibouti': { lat: 11.55, lon: 43.15 },
  'Singapore': { lat: 1.35, lon: 103.82 },
  // Additional homeports / shipyards
  'Newport News': { lat: 37.00, lon: -76.43 },
  'Puget Sound': { lat: 47.57, lon: -122.63 },
  'Naval Station Kitsap': { lat: 47.57, lon: -122.63 },
  'Kitsap': { lat: 47.57, lon: -122.63 },
  'Portsmouth': { lat: 43.07, lon: -70.76 },
  'Groton': { lat: 41.35, lon: -72.09 },
  'New London': { lat: 41.35, lon: -72.09 },
  'Pascagoula': { lat: 30.37, lon: -88.55 },
  'Jacksonville': { lat: 30.39, lon: -81.40 },
  'Pensacola': { lat: 30.35, lon: -87.30 },
  'Corpus Christi': { lat: 27.80, lon: -97.40 },
  'Deveselu': { lat: 44.10, lon: 24.09 },
};

/**
 * Fallback homeport lookup keyed by normalized hull number (e.g. "CVN-68").
 * Last verified: March 2026 (USNI Fleet Tracker)
 */
export const HULL_HOMEPORT: Record<string, string> = {
  // Aircraft Carriers
  'CVN-68': 'Bremerton',
  'CVN-69': 'Norfolk',
  'CVN-70': 'San Diego',
  'CVN-71': 'San Diego',
  'CVN-72': 'Everett',
  'CVN-73': 'Norfolk',
  'CVN-74': 'Bremerton',
  'CVN-75': 'Norfolk',
  'CVN-76': 'San Diego',
  'CVN-77': 'Norfolk',
  'CVN-78': 'Norfolk',
  'CVN-79': 'Norfolk',
  // Amphibious Assault
  'LHD-1': 'Norfolk',
  'LHD-2': 'Sasebo',
  'LHD-3': 'Norfolk',
  'LHD-4': 'San Diego',
  'LHD-5': 'Norfolk',
  'LHD-7': 'Norfolk',
  'LHD-8': 'San Diego',
  'LHA-6': 'San Diego',
  'LHA-7': 'San Diego',
};

export function normalizeUSNIRegion(regionText: string): string {
  return regionText
    .replace(/^(In the|In|The)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getUSNIRegionCoords(regionText: string): { lat: number; lon: number } | undefined {
  const normalized = normalizeUSNIRegion(regionText);
  if (USNI_REGION_COORDINATES[normalized]) return USNI_REGION_COORDINATES[normalized];
  const lower = normalized.toLowerCase();
  for (const [key, coords] of Object.entries(USNI_REGION_COORDINATES)) {
    if (key.toLowerCase() === lower || lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) {
      return coords;
    }
  }
  return undefined;
}

export function getUSNIRegionApproxCoords(regionText: string): { lat: number; lon: number } {
  const direct = getUSNIRegionCoords(regionText);
  if (direct) return direct;

  const normalized = normalizeUSNIRegion(regionText).toLowerCase();
  if (normalized.includes('eastern pacific')) return { lat: 18.0, lon: -125.0 };
  if (normalized.includes('western atlantic')) return { lat: 30.0, lon: -60.0 };
  if (normalized.includes('pacific')) return { lat: 15.0, lon: -150.0 };
  if (normalized.includes('atlantic')) return { lat: 30.0, lon: -40.0 };
  if (normalized.includes('indian')) return { lat: -5.0, lon: 75.0 };
  if (normalized.includes('mediterranean')) return { lat: 35.0, lon: 18.0 };
  if (normalized.includes('antarctic') || normalized.includes('southern')) return { lat: -70.0, lon: 20.0 };
  if (normalized.includes('arctic')) return { lat: 75.0, lon: 0.0 };

  // Deterministic fallback so previously unseen regions are still rendered.
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  const lat = ((Math.abs(hash) % 120) - 60);
  const lon = ((Math.abs(hash * 31) % 300) - 150);
  return { lat, lon };
}

/**
 * Helper function to identify aircraft by callsign
 */
export function identifyByCallsign(callsign: string, originCountry?: string): import('./military-callsigns').CallsignPattern | undefined {
  const normalized = callsign.toUpperCase().trim();
  const origin = originCountry?.toLowerCase().trim();

  // Prefer country-specific operators to disambiguate (e.g. NAVY -> USN vs RN)
  const preferred: MilitaryOperator[] = [];
  if (origin === 'united kingdom' || origin === 'uk') preferred.push('rn', 'raf');
  if (origin === 'united states' || origin === 'usa') preferred.push('usn', 'usaf', 'usa', 'usmc');

  if (preferred.length > 0) {
    for (const pattern of ALL_MILITARY_CALLSIGNS) {
      if (!preferred.includes(pattern.operator)) continue;
      if (new RegExp(pattern.pattern, 'i').test(normalized)) return pattern;
    }
  }

  for (const pattern of ALL_MILITARY_CALLSIGNS) {
    if (new RegExp(pattern.pattern, 'i').test(normalized)) return pattern;
  }

  return undefined;
}

/**
 * Helper function to identify aircraft by type code
 */
export function identifyByAircraftType(typeCode: string): { type: MilitaryAircraftType; name: string } | undefined {
  const normalized = typeCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return MILITARY_AIRCRAFT_TYPES[normalized];
}

/**
 * Helper to check if a hex code is in known military range
 */
export function isKnownMilitaryHex(hexCode: string): { operator: MilitaryOperator; country: string } | undefined {
  const hex = hexCode.toUpperCase();
  for (const range of MILITARY_HEX_RANGES) {
    if (hex >= range.start && hex <= range.end) {
      return { operator: range.operator, country: range.country };
    }
  }
  return undefined;
}

/**
 * Check if vessel is near a military hotspot
 */
export function getNearbyHotspot(lat: number, lon: number): typeof MILITARY_HOTSPOTS[number] | undefined {
  for (const hotspot of MILITARY_HOTSPOTS) {
    const distance = Math.sqrt((lat - hotspot.lat) ** 2 + (lon - hotspot.lon) ** 2);
    if (distance <= hotspot.radius) {
      return hotspot;
    }
  }
  return undefined;
}
