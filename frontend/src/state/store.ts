/**
 * GAMBIT — Core state management with Preact Signals
 *
 * All shared application state lives here. Panels and components
 * import the signals they need and react automatically.
 */
import { signal, computed } from '@preact/signals';

// ── Types ────────────────────────────────────────────────────

export type RiskLevel = 'catastrophic' | 'extreme' | 'severe' | 'stormy' | 'cloudy' | 'clear';
export type ViewMode = 'globe' | 'flat';
export type Theme = 'dark' | 'light';
export type BasemapId = 'intel' | 'satellite' | 'terrain' | 'light' | 'oceanic' | 'political';

export interface Country {
  _id: string;
  iso2: string;
  name: string;
  flag: string;
  lat: number;
  lng: number;
  risk: RiskLevel;
  tags: string[];
  region: string;
  leader: string;
  analysis?: { what: string; why: string; next: string };
}

export interface Conflict {
  _id: string;
  title: string;
  lat: number;
  lng: number;
  status: 'active' | 'ceasefire' | 'resolved';
  dayCount: number;
  casualties: { party: string; figure: number }[];
  relatedCountries: string[];
}

export interface NewsItem {
  title: string;
  summary: string;
  tags: string[];
  sourceCount: number;
  conflictId?: string;
  relatedCountries: string[];
  relatedChokepoints?: string[];
  relatedNSA?: string[];
  provenance?: {
    trustScore: number;
    redFlags: string[];
    sourceTier: string;
  };
}

export interface NewsAnalysis {
  clusterId: string;
  summary: string;
  escalationSignal?: string;
}

export interface Anomaly {
  entityType: string;
  entityId: string;
  severity: 'watch' | 'alert' | 'critical';
  zScore: number;
  currentCount: number;
  baselineMean: number;
  detectedAt: string;
}

export interface BootstrapData {
  countries: Country[];
  conflicts: Conflict[];
  bases: any[];
  nsa: any[];
  chokepoints: any[];
  elections: any[];
  tradeRoutes: any[];
  ports: any[];
}

export interface UserSettings {
  aiProvider?: 'anthropic' | 'openai';
  aiModel?: string;
  aiEnabled: boolean;
}

// ── Core UI state ────────────────────────────────────────────

export const theme = signal<Theme>(
  (document.documentElement.getAttribute('data-theme') as Theme) || 'dark'
);
export const viewMode = signal<ViewMode>('globe');

const BASEMAP_IDS: BasemapId[] = ['intel', 'satellite', 'terrain', 'light', 'oceanic', 'political'];

function loadBasemap(): BasemapId {
  const stored = localStorage.getItem('gambit-basemap');
  return BASEMAP_IDS.includes(stored as BasemapId) ? (stored as BasemapId) : 'intel';
}

export const basemap = signal<BasemapId>(loadBasemap());

export const sidebarOpen = signal(true);
export const rightPanelOpen = signal(false);
export const newsPanelOpen = signal(false);

// ── Entity selection ─────────────────────────────────────────

export const selectedCountry = signal<Country | null>(null);
export const selectedEntity = signal<{ type: string; id: string } | null>(null);
export const compareCountries = signal<Country[]>([]);

// ── Data state ───────────────────────────────────────────────

export const bootstrapData = signal<BootstrapData | null>(null);
export const bootstrapLoading = signal(true);
export const searchQuery = signal('');

// ── Intelligence pipeline ────────────────────────────────────

export const timelinePosition = signal<Date | null>(null);
export const isHistorical = computed(() => timelinePosition.value !== null);

export const latestEvents = signal<NewsItem[]>([]);
export const newsAnalyses = signal<Map<string, NewsAnalysis>>(new Map());

export const anomalyAlerts = signal<Anomaly[]>([]);

export const graphConnections = signal<{
  seed: { type: string; id: string };
  nodes: any[];
  edges: any[];
} | null>(null);

export const heatmapOpacity = signal(0.8);
export const pluginManifests = signal<any[]>([]);
export const userSettings = signal<UserSettings>({ aiEnabled: false });

// ── Layer toggles ────────────────────────────────────────────

export interface LayerState {
  riskHeatmap: boolean;
  tradeRoutes: boolean;
  chokepoints: boolean;
  militaryBases: boolean;
  nsaZones: boolean;
  conflicts: boolean;
  elections: boolean;
  [key: string]: boolean; // plugin layers
}

export const layers = signal<LayerState>({
  riskHeatmap: true,
  tradeRoutes: false,
  chokepoints: false,
  militaryBases: false,
  nsaZones: false,
  conflicts: true,
  elections: false,
});

export type LayerPreset = 'full-intel' | 'conflict-zone' | 'trade-risk' | 'minimal';

export const LAYER_PRESETS: Record<LayerPreset, Partial<LayerState>> = {
  'full-intel': {
    riskHeatmap: true, tradeRoutes: true, chokepoints: true,
    militaryBases: true, nsaZones: true, conflicts: true, elections: true,
  },
  'conflict-zone': {
    riskHeatmap: true, tradeRoutes: false, chokepoints: false,
    militaryBases: true, nsaZones: true, conflicts: true, elections: false,
  },
  'trade-risk': {
    riskHeatmap: true, tradeRoutes: true, chokepoints: true,
    militaryBases: false, nsaZones: false, conflicts: false, elections: false,
  },
  'minimal': {
    riskHeatmap: true, tradeRoutes: false, chokepoints: false,
    militaryBases: false, nsaZones: false, conflicts: false, elections: false,
  },
};

// ── Actions ──────────────────────────────────────────────────

export function toggleTheme() {
  const next = theme.value === 'dark' ? 'light' : 'dark';
  theme.value = next;
  document.documentElement.setAttribute('data-theme', next);
}

export function setBasemap(id: BasemapId) {
  basemap.value = id;
  localStorage.setItem('gambit-basemap', id);
}

export function cycleBasemap() {
  const idx = BASEMAP_IDS.indexOf(basemap.value);
  setBasemap(BASEMAP_IDS[(idx + 1) % BASEMAP_IDS.length]);
}

export function toggleLayer(key: keyof LayerState) {
  layers.value = { ...layers.value, [key]: !layers.value[key] };
}

export function applyPreset(preset: LayerPreset) {
  const base = {
    riskHeatmap: false, tradeRoutes: false, chokepoints: false,
    militaryBases: false, nsaZones: false, conflicts: false, elections: false,
  } as LayerState;
  layers.value = { ...base, ...LAYER_PRESETS[preset] } as LayerState;
}

export function selectCountry(country: Country | null) {
  selectedCountry.value = country;
  selectedEntity.value = country ? { type: 'country', id: country._id } : null;
  // Don't toggle rightPanelOpen — panel is always visible
}

export function addToCompare(country: Country) {
  const current = compareCountries.value;
  if (current.length < 3 && !current.find(c => c._id === country._id)) {
    compareCountries.value = [...current, country];
  }
}

export function removeFromCompare(id: string) {
  compareCountries.value = compareCountries.value.filter(c => c._id !== id);
}

export function dismissAnomaly(idx: number) {
  anomalyAlerts.value = anomalyAlerts.value.filter((_, i) => i !== idx);
}
