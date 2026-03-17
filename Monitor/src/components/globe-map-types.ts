/**
 * Globe map types, interfaces, and constants.
 *
 * Extracted from GlobeMap.ts — all marker discriminated unions, path/polygon types,
 * static color/icon lookup tables, and configuration constants.
 */

import type { AisDisruptionType, AisDisruptionEvent } from '@/types';
import type { MapView } from './MapContainer';

// ─── Satellite display constants ─────────────────────────────────────────────
export const SAT_COUNTRY_COLORS: Record<string, string> = { CN: '#ff2020', RU: '#ff8800', US: '#4488ff', EU: '#44cc44', KR: '#aa66ff', IN: '#ff66aa', TR: '#ff4466', OTHER: '#ccccff' };
export const SAT_TYPE_EMOJI: Record<string, string> = { sar: '\u{1F4E1}', optical: '\u{1F4F7}', military: '\u{1F396}', sigint: '\u{1F4FB}' };
export const SAT_TYPE_LABEL: Record<string, string> = { sar: 'SAR Imaging', optical: 'Optical Imaging', military: 'Military', sigint: 'SIGINT' };
export const SAT_OPERATOR_NAME: Record<string, string> = { CN: 'China', RU: 'Russia', US: 'United States', EU: 'ESA / EU', KR: 'South Korea', IN: 'India', TR: 'Turkey', OTHER: 'Other' };

// ─── Marker discriminated union ─────────────────────────────────────────────
export interface BaseMarker {
  _kind: string;
  _lat: number;
  _lng: number;
}
export interface ConflictMarker extends BaseMarker {
  _kind: 'conflict';
  id: string;
  fatalities: number;
  eventType: string;
  location: string;
}
export interface HotspotMarker extends BaseMarker {
  _kind: 'hotspot';
  id: string;
  name: string;
  escalationScore: number;
}
export interface FlightMarker extends BaseMarker {
  _kind: 'flight';
  id: string;
  callsign: string;
  type: string;
  heading: number;
}
export interface VesselMarker extends BaseMarker {
  _kind: 'vessel';
  id: string;
  name: string;
  type: string;
  typeLabel: string;
  hullNumber?: string;
  operator?: string;
  operatorCountry?: string;
  isDark?: boolean;
  usniStrikeGroup?: string;
  usniRegion?: string;
  usniDeploymentStatus?: string;
  usniHomePort?: string;
  usniActivityDescription?: string;
  usniArticleDate?: string;
  usniSource?: boolean;
}
export interface ClusterMarker extends BaseMarker {
  _kind: 'cluster';
  id: string;
  name: string;
  vesselCount: number;
  activityType?: string;
  region?: string;
}
export interface WeatherMarker extends BaseMarker {
  _kind: 'weather';
  id: string;
  severity: string;
  headline: string;
}
export interface NaturalMarker extends BaseMarker {
  _kind: 'natural';
  id: string;
  category: string;
  title: string;
}
export interface IranMarker extends BaseMarker {
  _kind: 'iran';
  id: string;
  title: string;
  category: string;
  severity: string;
  location: string;
}
export interface OutageMarker extends BaseMarker {
  _kind: 'outage';
  id: string;
  title: string;
  severity: string;
  country: string;
}
export interface CyberMarker extends BaseMarker {
  _kind: 'cyber';
  id: string;
  indicator: string;
  severity: string;
  type: string;
}
export interface FireMarker extends BaseMarker {
  _kind: 'fire';
  id: string;
  region: string;
  brightness: number;
}
export interface ProtestMarker extends BaseMarker {
  _kind: 'protest';
  id: string;
  title: string;
  eventType: string;
  country: string;
}
export interface UcdpMarker extends BaseMarker {
  _kind: 'ucdp';
  id: string;
  sideA: string;
  sideB: string;
  deaths: number;
  country: string;
}
export interface DisplacementMarker extends BaseMarker {
  _kind: 'displacement';
  id: string;
  origin: string;
  asylum: string;
  refugees: number;
}
export interface ClimateMarker extends BaseMarker {
  _kind: 'climate';
  id: string;
  zone: string;
  type: string;
  severity: string;
  tempDelta: number;
}
export interface GpsJamMarker extends BaseMarker {
  _kind: 'gpsjam';
  id: string;
  level: string;
  npAvg: number;
}
export interface TechMarker extends BaseMarker {
  _kind: 'tech';
  id: string;
  title: string;
  country: string;
  daysUntil: number;
}
export interface ConflictZoneMarker extends BaseMarker {
  _kind: 'conflictZone';
  id: string;
  name: string;
  intensity: string;
  parties: string[];
  casualties?: string;
}
export interface MilBaseMarker extends BaseMarker {
  _kind: 'milbase';
  id: string;
  name: string;
  type: string;
  country: string;
}
export interface NuclearSiteMarker extends BaseMarker {
  _kind: 'nuclearSite';
  id: string;
  name: string;
  type: string;
  status: string;
}
export interface IrradiatorSiteMarker extends BaseMarker {
  _kind: 'irradiator';
  id: string;
  city: string;
  country: string;
}
export interface SpaceportSiteMarker extends BaseMarker {
  _kind: 'spaceport';
  id: string;
  name: string;
  country: string;
  operator: string;
  launches: string;
}
export interface EarthquakeMarker extends BaseMarker {
  _kind: 'earthquake';
  id: string;
  place: string;
  magnitude: number;
}
export interface EconomicMarker extends BaseMarker {
  _kind: 'economic';
  id: string;
  name: string;
  type: string;
  country: string;
  description: string;
}
export interface DatacenterMarker extends BaseMarker {
  _kind: 'datacenter';
  id: string;
  name: string;
  owner: string;
  country: string;
  chipType: string;
}
export interface WaterwayMarker extends BaseMarker {
  _kind: 'waterway';
  id: string;
  name: string;
  description: string;
}
export interface MineralMarker extends BaseMarker {
  _kind: 'mineral';
  id: string;
  name: string;
  mineral: string;
  country: string;
  status: string;
}
export interface FlightDelayMarker extends BaseMarker {
  _kind: 'flightDelay';
  id: string;
  iata: string;
  name: string;
  city: string;
  country: string;
  severity: string;
  delayType: string;
  avgDelayMinutes: number;
  reason: string;
}
export interface NotamRingMarker extends BaseMarker {
  _kind: 'notamRing';
  name: string;
  reason: string;
}
export interface NewsLocationMarker extends BaseMarker {
  _kind: 'newsLocation';
  id: string;
  title: string;
  threatLevel: string;
}
export interface FlashMarker extends BaseMarker {
  _kind: 'flash';
  id: string;
}
export interface CableAdvisoryMarker extends BaseMarker {
  _kind: 'cableAdvisory';
  id: string;
  cableId: string;
  title: string;
  severity: string;
  impact: string;
  repairEta: string;
}
export interface RepairShipMarker extends BaseMarker {
  _kind: 'repairShip';
  id: string;
  name: string;
  status: string;
  eta: string;
  operator: string;
}
export interface AisDisruptionMarker extends BaseMarker {
  _kind: 'aisDisruption';
  id: string;
  name: string;
  type: AisDisruptionType;
  severity: AisDisruptionEvent['severity'];
  description: string;
}
export interface SatelliteMarker extends BaseMarker {
  _kind: 'satellite';
  id: string;
  name: string;
  country: string;
  type: string;
  alt: number;
  velocity: number;
  inclination: number;
}
export interface SatFootprintMarker extends BaseMarker {
  _kind: 'satFootprint';
  country: string;
  noradId: string;
}
export interface ImagerySceneMarker extends BaseMarker {
  _kind: 'imageryScene';
  satellite: string;
  datetime: string;
  resolutionM: number;
  mode: string;
  previewUrl: string;
}
export interface WebcamMarkerData extends BaseMarker {
  _kind: 'webcam';
  webcamId: string;
  title: string;
  category: string;
  country: string;
}
export interface WebcamClusterData extends BaseMarker {
  _kind: 'webcam-cluster';
  count: number;
  categories: string[];
}

export interface GlobePath {
  id: string;
  name: string;
  points: number[][];
  pathType: 'cable' | 'oil' | 'gas' | 'products' | 'orbit' | 'stormTrack' | 'stormHistory';
  status: string;
  country?: string;
  windKt?: number;
}

export interface GlobePolygon {
  coords: number[][][];
  name: string;
  _kind: 'cii' | 'conflict' | 'imageryFootprint' | 'forecastCone';
  level?: string;
  score?: number;

  intensity?: string;
  parties?: string[];
  casualties?: string;

  satellite?: string;
  datetime?: string;
  resolutionM?: number;
  mode?: string;
  previewUrl?: string;
}

export type GlobeMarker =
  | ConflictMarker | HotspotMarker | FlightMarker | VesselMarker | ClusterMarker
  | WeatherMarker | NaturalMarker | IranMarker | OutageMarker
  | CyberMarker | FireMarker | ProtestMarker
  | UcdpMarker | DisplacementMarker | ClimateMarker | GpsJamMarker | TechMarker
  | ConflictZoneMarker | MilBaseMarker | NuclearSiteMarker | IrradiatorSiteMarker | SpaceportSiteMarker
  | EarthquakeMarker | EconomicMarker | DatacenterMarker | WaterwayMarker | MineralMarker
  | FlightDelayMarker | NotamRingMarker | CableAdvisoryMarker | RepairShipMarker | AisDisruptionMarker
  | NewsLocationMarker | FlashMarker | SatelliteMarker | SatFootprintMarker | ImagerySceneMarker
  | WebcamMarkerData | WebcamClusterData;

export interface GlobeControlsLike {
  autoRotate: boolean;
  autoRotateSpeed: number;
  enablePan: boolean;
  enableZoom: boolean;
  zoomSpeed: number;
  minDistance: number;
  maxDistance: number;
  enableDamping: boolean;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

// ─── Static color/icon lookup tables ─────────────────────────────────────────

export const FLIGHT_TYPE_COLORS: Record<string, string> = {
  fighter: '#ff4444', bomber: '#ff8800', recon: '#44aaff',
  tanker: '#88ff44', transport: '#aaaaff', helicopter: '#ffff44',
  drone: '#ff44ff', maritime: '#44ffff',
};

export const VESSEL_TYPE_COLORS: Record<string, string> = {
  carrier:    '#ff4444',
  destroyer:  '#ff8800',
  frigate:    '#ffcc00',
  submarine:  '#8844ff',
  amphibious: '#44cc88',
  patrol:     '#44aaff',
  auxiliary:  '#aaaaaa',
  research:   '#44ffff',
  icebreaker: '#88ccff',
  special:    '#ff44ff',
};

export const VESSEL_TYPE_ICONS: Record<string, string> = {
  carrier:    '\u26f4',
  destroyer:  '\u25b2',
  frigate:    '\u25b2',
  submarine:  '\u25c6',
  amphibious: '\u2b21',
  patrol:     '\u25b6',
  auxiliary:  '\u25cf',
  research:   '\u25ce',
  icebreaker: '\u2745',
  special:    '\u2605',
};

export const CLUSTER_ACTIVITY_COLORS: Record<string, string> = {
  deployment: '#ff4444', exercise: '#ff8800', transit: '#ffcc00', unknown: '#6688aa',
};

export const VESSEL_TYPE_LABELS: Record<string, string> = {
  carrier: 'Aircraft Carrier',
  destroyer: 'Destroyer',
  frigate: 'Frigate',
  submarine: 'Submarine',
  amphibious: 'Amphibious',
  patrol: 'Patrol',
  auxiliary: 'Auxiliary',
  research: 'Research',
  icebreaker: 'Icebreaker',
  special: 'Special Mission',
  unknown: 'Unknown',
};

export const CII_GLOBE_COLORS: Record<string, string> = {
  low:      'rgba(40, 180, 60, 0.35)',
  normal:   'rgba(220, 200, 50, 0.35)',
  elevated: 'rgba(240, 140, 30, 0.40)',
  high:     'rgba(220, 50, 20, 0.45)',
  critical: 'rgba(140, 10, 0, 0.50)',
};

export const CONFLICT_CAP: Record<string, string> = { high: 'rgba(255,40,40,0.25)', medium: 'rgba(255,120,0,0.20)', low: 'rgba(255,200,0,0.15)' };
export const CONFLICT_SIDE: Record<string, string> = { high: 'rgba(255,40,40,0.12)', medium: 'rgba(255,120,0,0.08)', low: 'rgba(255,200,0,0.06)' };
export const CONFLICT_STROKE: Record<string, string> = { high: '#ff3030', medium: '#ff8800', low: '#ffcc00' };
export const CONFLICT_ALT: Record<string, number> = { high: 0.006, medium: 0.004, low: 0.003 };

export const VIEW_POVS: Record<MapView, { lat: number; lng: number; altitude: number }> = {
  global:   { lat: 20,  lng:  0,   altitude: 1.8 },
  america:  { lat: 20,  lng: -90,  altitude: 1.5 },
  mena:     { lat: 25,  lng:  40,  altitude: 1.2 },
  eu:       { lat: 50,  lng:  10,  altitude: 1.2 },
  asia:     { lat: 35,  lng: 105,  altitude: 1.5 },
  latam:    { lat: -15, lng: -60,  altitude: 1.5 },
  africa:   { lat:  5,  lng:  20,  altitude: 1.5 },
  oceania:  { lat: -25, lng: 140,  altitude: 1.5 },
};

export const LAYER_CHANNELS: Map<string, { markers: boolean; arcs: boolean; paths: boolean; polygons: boolean }> = new Map([
  ['ciiChoropleth', { markers: false, arcs: false, paths: false, polygons: true }],
  ['tradeRoutes',   { markers: false, arcs: true,  paths: false, polygons: false }],
  ['pipelines',     { markers: false, arcs: false, paths: true,  polygons: false }],
  ['conflicts',     { markers: true,  arcs: false, paths: false, polygons: true }],
  ['cables',        { markers: true,  arcs: false, paths: true,  polygons: false }],
  ['satellites',    { markers: true,  arcs: false, paths: true,  polygons: true }],
  ['natural',       { markers: true,  arcs: false, paths: true,  polygons: true }],
  ['webcams',       { markers: true,  arcs: false, paths: false, polygons: false }],
]);
