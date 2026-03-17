// api/src/types/index.ts

// Shared metadata on all documents
export interface DocMeta {
  createdAt: Date;
  updatedAt: Date;
  dataSource: "hegemon-bundle" | "firecrawl-scrape" | "manual";
}

// GeoJSON Point for 2dsphere indexes
export interface GeoPoint {
  type: "Point";
  coordinates: [lng: number, lat: number];
}

// --- Countries ---

export interface CasualtySrc {
  name: string;
  figure: string;
  note: string;
}

export interface Casualties {
  total: string;
  label: string;
  lastUpdated: string;
  source: string;
  contested: boolean;
  sources: CasualtySrc[];
}

export interface Analysis {
  what: string;
  why: string;
  next: string;
}

export type RiskLevel = "catastrophic" | "extreme" | "severe" | "stormy" | "cloudy" | "clear";

export interface Country extends DocMeta {
  _id: string;
  iso2: string;
  name: string;
  flag: string;
  lat: number;
  lng: number;
  location: GeoPoint;
  risk: RiskLevel;
  tags: string[];
  region: string;
  pop: string;
  gdp: string;
  leader: string;
  title: string;
  casualties: Casualties | null;
  analysis: Analysis;
}

export interface CountrySlim {
  _id: string;
  iso2: string;
  name: string;
  flag: string;
  lat: number;
  lng: number;
  risk: RiskLevel;
  region: string;
  tags: string[];
}

// --- Bases ---

export type BaseType = "base" | "port" | "station" | "facility";

export interface Base extends DocMeta {
  _id: string;
  name: string;
  country: string;
  hostNation: string;
  operatingCountry: string;
  lat: number;
  lng: number;
  location: GeoPoint;
  branch: string;
  type: BaseType;
  flag: string;
  color: string;
  personnel: string;
  history: string;
  significance: string;
  iranWarRole: string | null;
}

// --- Non-State Actors ---

export interface NSAZone {
  lat: number;
  lng: number;
  radiusKm: number;
}

export interface MajorAttack {
  year: string;
  event: string;
}

export interface NonStateActor extends DocMeta {
  _id: string;
  name: string;
  ideology: string;
  status: "active" | "inactive" | "degraded";
  designation: string;
  founded: string;
  revenue: string;
  strength: string;
  activities: string;
  territory: string;
  funding: string;
  leaders: string;
  allies: string[];
  rivals: string[];
  majorAttacks: MajorAttack[];
  searchTerms: string[];
  zones: NSAZone[];
}

// --- Chokepoints ---

export type ChokepointType = "maritime" | "energy" | "land";
export type ChokepointStatus = "OPEN" | "RESTRICTED" | "CLOSED";

export interface Chokepoint extends DocMeta {
  _id: string;
  name: string;
  type: ChokepointType;
  lat: number;
  lng: number;
  location: GeoPoint;
  tooltipLine: string;
  summary: string;
  dailyVessels: string;
  oilVolume: string;
  gasVolume: string;
  status: ChokepointStatus;
  dependentCountries: string[];
  strategicSummary: string;
  searchTerms: string[];
}

// --- Elections ---

export interface Election extends DocMeta {
  _id: string;
  flag: string;
  country: string;
  countryISO2: string;
  lat: number;
  lng: number;
  location: GeoPoint;
  date: string;
  dateISO: Date;
  type: string;
  winner: string | null;
  result: string | null;
  summary: string;
}

// --- Trade Routes ---

export type TradeCategory = "container" | "energy" | "bulk";
export type TradeStatus = "active" | "disrupted" | "high_risk";

export interface TradeRoute extends DocMeta {
  _id: string;
  name: string;
  from: string;
  to: string;
  category: TradeCategory;
  status: TradeStatus;
  volumeDesc: string;
  waypoints: string[];
}

// --- Ports ---

export interface Port extends DocMeta {
  _id: string;
  name: string;
  lat: number;
  lng: number;
  location: GeoPoint;
  country: string;
}

// --- Conflicts ---

export interface ConflictCasualty {
  party: string;
  figure: string;
}

export interface Conflict extends DocMeta {
  _id: string;
  title: string;
  lat: number;
  lng: number;
  location: GeoPoint;
  startDate: Date;
  dayCount: number;
  status: "active" | "ceasefire" | "resolved";
  casualties: ConflictCasualty[];
  latestUpdate: string;
  tags: string[];
  relatedCountries: string[];
}

// --- News ---

export interface NewsEvent extends DocMeta {
  title: string;
  summary: string;
  tags: string[];
  sourceCount: number;
  conflictId: string | null;
  relatedCountries: string[];
  relatedChokepoints: string[];
  relatedNSA: string[];
  enrichedAt: Date | null;
  publishedAt: Date;
}

// --- Country Colors ---

export interface CountryColor {
  _id: string;
  color: string;
}

// --- Temporal Snapshots ---

export interface SnapshotConflict {
  _id: string;
  status: string;
  dayCount: number;
  casualties: ConflictCasualty[];
}

export interface SnapshotChokepoint {
  _id: string;
  status: ChokepointStatus;
}

export interface SnapshotCountry {
  _id: string;
  risk: RiskLevel;
  leader: string;
  tags: string[];
}

export interface SnapshotNSA {
  _id: string;
  status: string;
  zones: NSAZone[];
}

export interface TemporalSnapshot {
  _id?: any;
  timestamp: Date;
  trigger: "scheduled" | "event";
  triggerDetail?: string;
  conflicts: SnapshotConflict[];
  chokepoints: SnapshotChokepoint[];
  countries: SnapshotCountry[];
  nsa: SnapshotNSA[];
}

// --- Graph Edges ---

export type EntityType =
  | "country" | "conflict" | "chokepoint"
  | "nsa" | "base" | "trade-route" | "port" | "news";

export type EdgeRelation =
  | "involves"           // conflict → country
  | "hosted-by"          // base → country (host nation)
  | "operated-by"        // base → country (operating country)
  | "depends-on"         // chokepoint → country
  | "ally-of"            // nsa → country
  | "rival-of"           // nsa → country
  | "passes-through"     // trade-route → chokepoint
  | "originates-at"      // trade-route → port
  | "terminates-at"      // trade-route → port
  | "port-in"            // port → country
  | "participates-in"    // nsa → conflict (inferred)
  | "disrupts"           // conflict → chokepoint (inferred)
  | "mentions"           // news → country|conflict|chokepoint|nsa
  ;

export interface GraphEdge {
  _id?: any;
  from: { type: EntityType; id: string };
  to: { type: EntityType; id: string };
  relation: EdgeRelation;
  weight: number;
  source: "seed" | "nlp" | "inferred";
  createdAt: Date;
}

// --- API Response Envelope ---

export interface ApiMeta {
  total?: number;
  limit?: number;
  offset?: number;
  cached?: boolean;
  freshness?: string;
}

export interface ApiSuccess<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
