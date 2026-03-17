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
  publishedAt: Date;
}

// --- Country Colors ---

export interface CountryColor {
  _id: string;
  color: string;
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
