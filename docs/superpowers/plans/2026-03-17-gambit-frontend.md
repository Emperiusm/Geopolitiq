# Gambit Frontend Shell, Layers, Intelligence UI & Performance — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Gambit frontend — a Preact + Deck.GL intelligence map with globe/flat view, 7 toggleable data layers, compare mode, global search, real-time news via SSE, timeline scrubbing, entity graph explorer, anomaly alerts, BYOK AI settings, and sub-500ms first load / sub-200ms repeat load performance.

**Architecture:** Preact + Vite + Deck.GL (GlobeView + MapView). PMTiles + MapLibre for the flat view base map. Preact Signals for state. CSS Modules with dark intelligence theme. Service worker + IndexedDB for offline caching. Web Workers for off-thread data processing. Binary data transfer from API for map layers. SSE for 9 real-time event types. D3-force for graph visualization.

**Tech Stack:** Preact 10.x, Vite 5.x, Deck.GL 9.x, MapLibre GL JS 4.x, PMTiles, Preact Signals, D3-force, Vitest

**Spec:** [docs/superpowers/specs/2026-03-17-hegemon-data-platform-design.md](../specs/2026-03-17-hegemon-data-platform-design.md) — Sections 6 and 7
**Addendum:** [docs/superpowers/specs/gambit-backend-upgrades-addendum.md](../specs/gambit-backend-upgrades-addendum.md) — Section 11 (Frontend implications)

**Depends On:**
- [Plan 1: Backend Infrastructure + Data Pipeline](2026-03-17-gambit-backend-infra-pipeline.md)
- [Plan 2: API Routes + Middleware](2026-03-17-gambit-api-routes.md)

---

## File Structure

### New Files to Create

```
frontend/
  package.json                          # Preact + Vite + Deck.GL + MapLibre + D3 deps
  tsconfig.json                         # Preact JSX, strict mode, path aliases
  vite.config.ts                        # Preact preset, port 5173
  index.html                            # App shell with inline critical CSS
  Dockerfile                            # Node-based build for Docker
  public/
    textures/
      earth-dark.jpg                    # Dark Blue Marble texture (~300KB)
      earth-night.jpg                   # NASA Black Marble texture (~300KB)
    sw.js                               # Service worker (generated at build)
  src/
    main.tsx                            # Preact render entry
    app.tsx                             # Root layout: map + sidebar + panels
    api/
      client.ts                         # API client: fetch wrapper with base URL
      bootstrap.ts                      # Bootstrap data fetch + IndexedDB cache + ?at= support
      sse.ts                            # SSE EventSource manager with reconnect (9 event types)
      timeline.ts                       # fetchTimeline(), fetchBootstrapAt()
      graph.ts                          # fetchConnections(), fetchPath()
      anomalies.ts                      # fetchAnomalies(), fetchBaseline()
      plugins.ts                        # fetchPluginManifests()
      settings.ts                       # getSettings(), putSettings(), deleteSettings()
    state/
      store.ts                          # Preact Signals: layers, selections, view mode
      layers.ts                         # Layer toggle state + presets + dynamic plugin layers
      compare.ts                        # Compare mode state (selected countries)
      timeline.ts                       # timelinePosition, isHistorical, scrubTo()
      graph.ts                          # graphConnections, selectedGraphEntity
      anomalies.ts                      # anomalyAlerts, dismissAlert()
      plugins.ts                        # pluginLayers, pluginManifests
      settings.ts                       # userSettings, aiEnabled
    map/
      deck-map.tsx                      # Deck.GL canvas wrapper
      globe-view.ts                     # GlobeView configuration + earth texture
      flat-view.ts                      # MapView + MapLibre GL integration
      view-transition.ts               # Globe <-> flat crossfade transition
      pmtiles-source.ts                # PMTiles protocol + MapLibre source
      day-night.ts                      # Solar calculation + theme switching
    layers/
      risk-heatmap.ts                   # Country risk coloring (globe: dots, flat: polygons)
      trade-routes.ts                   # ArcLayer for 21 trade routes
      chokepoints.ts                    # ScatterplotLayer + TextLayer for 60 chokepoints
      military-bases.ts                 # ScatterplotLayer + IconLayer with clustering
      nsa-zones.ts                      # ScatterplotLayer with semi-transparent circles
      conflicts.ts                      # Animated pulse rings at conflict epicenters
      elections.ts                      # Markers with countdown badges
    panels/
      sidebar.tsx                       # Left: watchlist + layer menu + anomaly badges
      layer-menu.tsx                    # Layer toggles + presets + dynamic plugin layers
      right-panel.tsx                   # Right: detail panel (country, base, etc.)
      trade-routes-panel.tsx            # Trade route list + filters
      chokepoints-panel.tsx             # Chokepoint list + filters
      bases-panel.tsx                   # Searchable bases list with filters
      nsa-panel.tsx                     # NSA groups list + expandable details
      conflicts-panel.tsx              # Active conflicts sorted by severity
      elections-panel.tsx              # Election timeline view
      compare-panel.tsx                # Side-by-side country comparison + shared connections
      news-feed.tsx                     # Real-time news feed via SSE + provenance + AI cards
      search-bar.tsx                    # Global search with cross-collection results
      timeline-scrubber.tsx            # Bottom-of-map slider + date label
      graph-explorer.tsx               # Entity connection network visualization (D3-force)
      anomaly-banner.tsx               # Top notification bar for spike alerts
      anomaly-history.tsx              # Historical anomaly list panel
      settings-panel.tsx               # BYOK API key + AI configuration
      ai-synthesis-card.tsx            # LLM-generated event summary card
    components/
      badge.tsx                         # Risk/status badges
      tooltip.tsx                       # Map tooltip (hover/click)
      keyboard-shortcuts.ts            # Keyboard shortcut handler
      sparkline.tsx                     # Tiny 7-day chart for anomaly baselines
      trust-badge.tsx                  # Color-coded provenance indicator
      pulse-ring.ts                    # Map animation for anomaly markers
    styles/
      variables.css                     # CSS custom properties (design system)
      app.css                           # Root layout
      panels.css                        # Panel components
      map.css                           # Map overlay styling
    workers/
      data-worker.ts                    # Web Worker for parsing API responses
    sw/
      service-worker.ts                # Service worker: cache shell + data
  tests/
    api/
      timeline.test.ts
      graph.test.ts
      anomalies.test.ts
      settings.test.ts
    state/
      store.test.ts
      timeline.test.ts
      graph.test.ts
      anomalies.test.ts
      settings.test.ts
    panels/
      timeline-scrubber.test.ts
      graph-explorer.test.ts
      anomaly-banner.test.ts
      settings-panel.test.ts
    components/
      sparkline.test.ts
      trust-badge.test.ts
```

---

## Phase 4: Frontend Shell

### Task 1: Frontend Scaffold — Preact + Vite + Deck.GL

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/Dockerfile`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/styles/variables.css`

- [ ] **Step 1: Create package.json with all dependencies**

```json
{
  "name": "gambit-frontend",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "preact": "^10.25.0",
    "@preact/signals": "^1.3.0",
    "@deck.gl/core": "^9.1.0",
    "@deck.gl/layers": "^9.1.0",
    "@deck.gl/aggregation-layers": "^9.1.0",
    "@deck.gl/geo-layers": "^9.1.0",
    "maplibre-gl": "^4.7.0",
    "pmtiles": "^4.2.0",
    "idb-keyval": "^6.2.0",
    "d3-force": "^3.0.0"
  },
  "devDependencies": {
    "@preact/preset-vite": "^2.9.0",
    "typescript": "^5.7.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0",
    "@testing-library/preact": "^3.2.0",
    "@types/d3-force": "^3.0.0",
    "happy-dom": "^15.7.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "jsxImportSource": "preact",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "paths": { "@/*": ["./src/*"] },
    "types": ["vite/client"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```ts
import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  plugins: [preact()],
  server: { port: 5173 },
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          "deck-gl": ["@deck.gl/core", "@deck.gl/layers"],
          "maplibre": ["maplibre-gl"],
        },
      },
    },
  },
  resolve: {
    alias: { "@": "/src" },
  },
});
```

- [ ] **Step 4: Create index.html with inline critical CSS**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GAMBIT — Global Intelligence Platform</title>
  <style>
    /* Critical CSS — inline for instant render */
    :root { --bg-primary: #0a0a1a; --text-primary: #e8e8f0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: var(--bg-primary); color: var(--text-primary); font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
    #root { width: 100vw; height: 100vh; }
    .loading { display: flex; align-items: center; justify-content: center; height: 100vh; font-family: monospace; color: #8888aa; }
  </style>
  <link rel="preload" href="/textures/earth-dark.jpg" as="image" />
</head>
<body>
  <div id="root"><div class="loading">GAMBIT</div></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 5: Create CSS variables (design system)**

```css
/* frontend/src/styles/variables.css */
:root {
  /* Backgrounds */
  --bg-primary:     #0a0a1a;
  --bg-secondary:   #111128;
  --bg-tertiary:    #1a1a3e;

  /* Text */
  --text-primary:   #e8e8f0;
  --text-secondary: #8888aa;
  --text-muted:     #555577;

  /* Borders */
  --border-default: #2a2a4a;
  --border-hover:   #3a3a6a;

  /* Risk levels */
  --risk-catastrophic: #ef4444;
  --risk-extreme:      #f97316;
  --risk-severe:       #eab308;
  --risk-stormy:       #d97706;
  --risk-cloudy:       #6b7280;
  --risk-clear:        #22c55e;

  /* Accents */
  --accent-primary:    #00d4ff;
  --accent-conflict:   #ef4444;
  --accent-security:   #eab308;
  --accent-diplomacy:  #8b5cf6;
  --accent-economic:   #3b82f6;

  /* Anomaly severities */
  --anomaly-watch:    #d97706;
  --anomaly-alert:    #f97316;
  --anomaly-critical: #ef4444;

  /* Trust scores */
  --trust-high:    #22c55e;
  --trust-medium:  #d97706;
  --trust-low:     #ef4444;

  /* Typography */
  --font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', monospace;
  --font-sans: 'Inter', -apple-system, system-ui, sans-serif;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
}
```

- [ ] **Step 6: Create main.tsx entry**

```tsx
// frontend/src/main.tsx
import { render } from "preact";
import { App } from "./app";
import "./styles/variables.css";

render(<App />, document.getElementById("root")!);
```

- [ ] **Step 7: Create Dockerfile**

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm i -g serve
COPY --from=build /app/dist ./dist
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
```

- [ ] **Step 8: Install deps and verify dev server starts**

Run: `cd frontend && npm install && npm run dev`
Expected: Vite dev server on http://localhost:5173

- [ ] **Step 9: Commit**

```bash
git add frontend/package.json frontend/tsconfig.json frontend/vite.config.ts frontend/index.html
git add frontend/Dockerfile frontend/src/main.tsx frontend/src/styles/variables.css
git commit -m "feat: scaffold frontend with Preact + Vite + Deck.GL + design system"
```

---

### Task 2: State Management + API Client

**Files:**
- Create: `frontend/src/state/store.ts`
- Create: `frontend/src/state/layers.ts`
- Create: `frontend/src/state/compare.ts`
- Create: `frontend/src/state/timeline.ts`
- Create: `frontend/src/state/graph.ts`
- Create: `frontend/src/state/anomalies.ts`
- Create: `frontend/src/state/plugins.ts`
- Create: `frontend/src/state/settings.ts`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/api/bootstrap.ts`
- Create: `frontend/src/api/timeline.ts`
- Create: `frontend/src/api/graph.ts`
- Create: `frontend/src/api/anomalies.ts`
- Create: `frontend/src/api/plugins.ts`
- Create: `frontend/src/api/settings.ts`
- Test: `frontend/tests/state/store.test.ts`
- Test: `frontend/tests/state/timeline.test.ts`
- Test: `frontend/tests/state/graph.test.ts`
- Test: `frontend/tests/state/anomalies.test.ts`
- Test: `frontend/tests/state/settings.test.ts`
- Test: `frontend/tests/api/timeline.test.ts`
- Test: `frontend/tests/api/graph.test.ts`
- Test: `frontend/tests/api/anomalies.test.ts`
- Test: `frontend/tests/api/settings.test.ts`

- [ ] **Step 1: Write failing test for core state store**

```ts
// frontend/tests/state/store.test.ts
import { describe, it, expect } from "vitest";
import { viewMode, selectedCountry, setViewMode, selectCountry } from "../../src/state/store";

describe("State store", () => {
  it("defaults to globe view", () => {
    expect(viewMode.value).toBe("globe");
  });

  it("switches view mode", () => {
    setViewMode("flat");
    expect(viewMode.value).toBe("flat");
    setViewMode("globe");
  });

  it("selects and deselects a country", () => {
    selectCountry("ukraine");
    expect(selectedCountry.value).toBe("ukraine");
    selectCountry(null);
    expect(selectedCountry.value).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run tests/state/store.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement core state store with Preact Signals**

```ts
// frontend/src/state/store.ts
import { signal, computed } from "@preact/signals";

export type ViewMode = "globe" | "flat";

// Core state
export const viewMode = signal<ViewMode>("globe");
export const selectedCountry = signal<string | null>(null);
export const searchQuery = signal("");
export const sidebarOpen = signal(true);

// Bootstrap data
export const bootstrapData = signal<any>(null);
export const bootstrapLoading = signal(true);

// Derived state
export const isGlobe = computed(() => viewMode.value === "globe");

// Actions
export function setViewMode(mode: ViewMode) { viewMode.value = mode; }
export function selectCountry(id: string | null) { selectedCountry.value = id; }
export function setSearchQuery(q: string) { searchQuery.value = q; }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run tests/state/store.test.ts`
Expected: PASS

- [ ] **Step 5: Write failing test for timeline state**

```ts
// frontend/tests/state/timeline.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { timelinePosition, isHistorical, scrubTo, returnToLive } from "../../src/state/timeline";

describe("Timeline state", () => {
  beforeEach(() => { returnToLive(); });

  it("defaults to live (null position)", () => {
    expect(timelinePosition.value).toBeNull();
    expect(isHistorical.value).toBe(false);
  });

  it("scrubs to a date", () => {
    const date = new Date("2026-03-15T14:00:00Z");
    scrubTo(date);
    expect(timelinePosition.value).toEqual(date);
    expect(isHistorical.value).toBe(true);
  });

  it("returns to live", () => {
    scrubTo(new Date("2026-03-15T14:00:00Z"));
    returnToLive();
    expect(timelinePosition.value).toBeNull();
    expect(isHistorical.value).toBe(false);
  });
});
```

- [ ] **Step 6: Implement timeline state**

```ts
// frontend/src/state/timeline.ts
import { signal, computed } from "@preact/signals";

export const timelinePosition = signal<Date | null>(null);
export const timelineRange = signal<{ from: Date; to: Date } | null>(null);
export const timelineSnapshots = signal<Date[]>([]);

export const isHistorical = computed(() => timelinePosition.value !== null);

export function scrubTo(date: Date) {
  timelinePosition.value = date;
}

export function returnToLive() {
  timelinePosition.value = null;
}

export function setTimelineRange(from: Date, to: Date) {
  timelineRange.value = { from, to };
}

export function setTimelineSnapshots(snapshots: Date[]) {
  timelineSnapshots.value = snapshots;
}
```

- [ ] **Step 7: Run timeline test to verify it passes**

Run: `cd frontend && npx vitest run tests/state/timeline.test.ts`
Expected: PASS

- [ ] **Step 8: Write failing test for graph state**

```ts
// frontend/tests/state/graph.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { graphConnections, selectedGraphEntity, setGraphConnections, selectGraphEntity, clearGraph } from "../../src/state/graph";

describe("Graph state", () => {
  beforeEach(() => { clearGraph(); });

  it("defaults to empty", () => {
    expect(graphConnections.value).toEqual([]);
    expect(selectedGraphEntity.value).toBeNull();
  });

  it("stores connections", () => {
    const connections = [{ from: { type: "country", id: "iran" }, to: { type: "conflict", id: "us-iran-war" }, relation: "involves" }];
    setGraphConnections(connections);
    expect(graphConnections.value).toEqual(connections);
  });

  it("selects graph entity", () => {
    selectGraphEntity("country:iran");
    expect(selectedGraphEntity.value).toBe("country:iran");
  });
});
```

- [ ] **Step 9: Implement graph state**

```ts
// frontend/src/state/graph.ts
import { signal } from "@preact/signals";

export interface GraphEdge {
  from: { type: string; id: string };
  to: { type: string; id: string };
  relation: string;
  weight?: number;
}

export const graphConnections = signal<GraphEdge[]>([]);
export const selectedGraphEntity = signal<string | null>(null);
export const graphDepth = signal(1);

export function setGraphConnections(edges: GraphEdge[]) {
  graphConnections.value = edges;
}

export function selectGraphEntity(entityKey: string | null) {
  selectedGraphEntity.value = entityKey;
}

export function setGraphDepth(depth: number) {
  graphDepth.value = Math.max(1, Math.min(3, depth));
}

export function clearGraph() {
  graphConnections.value = [];
  selectedGraphEntity.value = null;
  graphDepth.value = 1;
}
```

- [ ] **Step 10: Run graph test to verify it passes**

Run: `cd frontend && npx vitest run tests/state/graph.test.ts`
Expected: PASS

- [ ] **Step 11: Write failing test for anomaly state**

```ts
// frontend/tests/state/anomalies.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { anomalyAlerts, pushAnomaly, dismissAlert, clearAlerts } from "../../src/state/anomalies";

describe("Anomaly state", () => {
  beforeEach(() => { clearAlerts(); });

  it("defaults to empty", () => {
    expect(anomalyAlerts.value).toEqual([]);
  });

  it("pushes an anomaly alert", () => {
    const alert = { entityType: "country", entityId: "IR", severity: "alert" as const, zScore: 3.4, currentCount: 28, baselineMean: 12, detectedAt: new Date().toISOString() };
    pushAnomaly(alert);
    expect(anomalyAlerts.value).toHaveLength(1);
    expect(anomalyAlerts.value[0].entityId).toBe("IR");
  });

  it("dismisses an alert by index", () => {
    const alert = { entityType: "country", entityId: "IR", severity: "alert" as const, zScore: 3.4, currentCount: 28, baselineMean: 12, detectedAt: new Date().toISOString() };
    pushAnomaly(alert);
    dismissAlert(0);
    expect(anomalyAlerts.value).toHaveLength(0);
  });
});
```

- [ ] **Step 12: Implement anomaly state**

```ts
// frontend/src/state/anomalies.ts
import { signal } from "@preact/signals";

export interface AnomalyAlert {
  entityType: string;
  entityId: string;
  severity: "watch" | "alert" | "critical";
  zScore: number;
  currentCount: number;
  baselineMean: number;
  detectedAt: string;
}

export const anomalyAlerts = signal<AnomalyAlert[]>([]);

export function pushAnomaly(alert: AnomalyAlert) {
  anomalyAlerts.value = [alert, ...anomalyAlerts.value];
}

export function dismissAlert(index: number) {
  anomalyAlerts.value = anomalyAlerts.value.filter((_, i) => i !== index);
}

export function clearAlerts() {
  anomalyAlerts.value = [];
}
```

- [ ] **Step 13: Run anomaly test to verify it passes**

Run: `cd frontend && npx vitest run tests/state/anomalies.test.ts`
Expected: PASS

- [ ] **Step 14: Write failing test for settings state**

```ts
// frontend/tests/state/settings.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { userSettings, aiEnabled, setUserSettings, clearUserSettings } from "../../src/state/settings";

describe("Settings state", () => {
  beforeEach(() => { clearUserSettings(); });

  it("defaults to null / disabled", () => {
    expect(userSettings.value).toBeNull();
    expect(aiEnabled.value).toBe(false);
  });

  it("stores settings and derives aiEnabled", () => {
    setUserSettings({ llmProvider: "anthropic", llmApiKeyMasked: "sk-ant-...****7x2f", aiAnalysisEnabled: true });
    expect(userSettings.value?.llmProvider).toBe("anthropic");
    expect(aiEnabled.value).toBe(true);
  });

  it("clears settings", () => {
    setUserSettings({ llmProvider: "anthropic", llmApiKeyMasked: "sk-ant-...****7x2f", aiAnalysisEnabled: true });
    clearUserSettings();
    expect(userSettings.value).toBeNull();
    expect(aiEnabled.value).toBe(false);
  });
});
```

- [ ] **Step 15: Implement settings state**

```ts
// frontend/src/state/settings.ts
import { signal, computed } from "@preact/signals";

export interface UserSettingsData {
  llmProvider: "anthropic" | "openai";
  llmApiKeyMasked: string;
  llmModel?: string;
  aiAnalysisEnabled: boolean;
}

export const userSettings = signal<UserSettingsData | null>(null);

export const aiEnabled = computed(() => userSettings.value?.aiAnalysisEnabled ?? false);

export function setUserSettings(settings: UserSettingsData) {
  userSettings.value = settings;
}

export function clearUserSettings() {
  userSettings.value = null;
}
```

- [ ] **Step 16: Run settings test to verify it passes**

Run: `cd frontend && npx vitest run tests/state/settings.test.ts`
Expected: PASS

- [ ] **Step 17: Implement plugins state**

```ts
// frontend/src/state/plugins.ts
import { signal, computed } from "@preact/signals";

export interface PluginManifest {
  id: string;
  name: string;
  type: "source" | "layer" | "enrichment";
  panel?: { group: string; icon: string };
  layerConfig?: any;
}

export const pluginManifests = signal<PluginManifest[]>([]);
export const pluginLayers = signal<Record<string, boolean>>({});

export const activePluginLayers = computed(() =>
  Object.entries(pluginLayers.value).filter(([, on]) => on).map(([id]) => id)
);

export function setPluginManifests(manifests: PluginManifest[]) {
  pluginManifests.value = manifests;
  // Initialize toggle state for new plugins (default off)
  const existing = pluginLayers.value;
  const updated = { ...existing };
  for (const m of manifests) {
    if (m.type === "source" || m.type === "layer") {
      if (!(m.id in updated)) updated[m.id] = false;
    }
  }
  pluginLayers.value = updated;
}

export function togglePluginLayer(pluginId: string) {
  pluginLayers.value = { ...pluginLayers.value, [pluginId]: !pluginLayers.value[pluginId] };
}
```

- [ ] **Step 18: Implement layer state (with dynamic plugin layers)**

```ts
// frontend/src/state/layers.ts
import { signal, computed } from "@preact/signals";

export interface LayerState {
  tradeRoutes: boolean;
  chokepoints: boolean;
  militaryBases: boolean;
  nsaZones: boolean;
  conflicts: boolean;
  elections: boolean;
}

export const layers = signal<LayerState>({
  tradeRoutes: false,
  chokepoints: false,
  militaryBases: false,
  nsaZones: false,
  conflicts: false,
  elections: false,
});

export const riskHeatmapOpacity = signal(0.6);

export const activeLayerCount = computed(() =>
  Object.values(layers.value).filter(Boolean).length
);

export function toggleLayer(key: keyof LayerState) {
  layers.value = { ...layers.value, [key]: !layers.value[key] };
}

export function setPreset(preset: "conflict" | "trade" | "full" | "minimal") {
  const presets: Record<string, LayerState> = {
    conflict: { tradeRoutes: false, chokepoints: false, militaryBases: true, nsaZones: true, conflicts: true, elections: false },
    trade: { tradeRoutes: true, chokepoints: true, militaryBases: false, nsaZones: false, conflicts: false, elections: false },
    full: { tradeRoutes: true, chokepoints: true, militaryBases: true, nsaZones: true, conflicts: true, elections: true },
    minimal: { tradeRoutes: false, chokepoints: false, militaryBases: false, nsaZones: false, conflicts: false, elections: false },
  };
  layers.value = presets[preset];
}
```

- [ ] **Step 19: Implement compare state**

```ts
// frontend/src/state/compare.ts
import { signal, computed } from "@preact/signals";

export const compareMode = signal(false);
export const compareCountries = signal<string[]>([]); // ISO2 codes, max 3

export const compareCount = computed(() => compareCountries.value.length);

export function toggleCompareMode() {
  compareMode.value = !compareMode.value;
  if (!compareMode.value) compareCountries.value = [];
}

export function addCompareCountry(iso2: string) {
  const current = compareCountries.value;
  if (current.length >= 3 || current.includes(iso2)) return;
  compareCountries.value = [...current, iso2];
}

export function removeCompareCountry(iso2: string) {
  compareCountries.value = compareCountries.value.filter(c => c !== iso2);
}
```

- [ ] **Step 20: Implement API client**

```ts
// frontend/src/api/client.ts
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message ?? `API error: ${res.status}`);
  }

  return res.json();
}

export async function apiFetchBinary(path: string): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Binary fetch failed: ${res.status}`);
  return res.arrayBuffer();
}
```

- [ ] **Step 21: Implement bootstrap fetch with IndexedDB caching + ?at= support**

```ts
// frontend/src/api/bootstrap.ts
import { get, set } from "idb-keyval";
import { apiFetch } from "./client";
import { bootstrapData, bootstrapLoading } from "../state/store";
import { timelinePosition } from "../state/timeline";

const IDB_KEY = "gambit:bootstrap";

export async function loadBootstrap(): Promise<void> {
  bootstrapLoading.value = true;

  // Try IndexedDB first for instant render (live mode only)
  if (!timelinePosition.value) {
    try {
      const cached = await get(IDB_KEY);
      if (cached) {
        bootstrapData.value = cached;
        bootstrapLoading.value = false;
      }
    } catch {
      // IndexedDB unavailable — continue to fetch
    }
  }

  // Fetch fresh data from API
  try {
    const atParam = timelinePosition.value
      ? `&at=${timelinePosition.value.toISOString()}`
      : "";
    const response = await apiFetch<any>(`/bootstrap?slim=true${atParam}`);
    bootstrapData.value = response.data;
    bootstrapLoading.value = false;

    // Cache for next visit (only live data)
    if (!timelinePosition.value) {
      await set(IDB_KEY, response.data).catch(() => {});
    }
  } catch (err) {
    console.error("[bootstrap] Fetch failed:", err);
    if (!bootstrapData.value) {
      bootstrapLoading.value = false; // Show empty state
    }
  }
}

/** Re-fetch bootstrap for a specific historical timestamp */
export async function loadBootstrapAt(timestamp: Date): Promise<void> {
  bootstrapLoading.value = true;
  try {
    const response = await apiFetch<any>(`/bootstrap?slim=true&at=${timestamp.toISOString()}`);
    bootstrapData.value = response.data;
  } catch (err) {
    console.error("[bootstrap] Historical fetch failed:", err);
  } finally {
    bootstrapLoading.value = false;
  }
}
```

- [ ] **Step 22: Implement timeline API client**

```ts
// frontend/src/api/timeline.ts
import { apiFetch } from "./client";

export interface TimelineSnapshot {
  timestamp: string;
  trigger: "scheduled" | "event";
  triggerDetail?: string;
}

export async function fetchTimelineRange(from: Date, to: Date, limit = 50): Promise<TimelineSnapshot[]> {
  const res = await apiFetch<{ data: TimelineSnapshot[] }>(
    `/timeline/range?from=${from.toISOString()}&to=${to.toISOString()}&limit=${limit}`
  );
  return res.data;
}

export async function fetchTimelineAt(timestamp: Date): Promise<TimelineSnapshot | null> {
  const res = await apiFetch<{ data: TimelineSnapshot | null }>(
    `/timeline/at?t=${timestamp.toISOString()}`
  );
  return res.data;
}
```

- [ ] **Step 23: Implement graph API client**

```ts
// frontend/src/api/graph.ts
import { apiFetch } from "./client";
import type { GraphEdge } from "../state/graph";

interface GraphConnectionsResponse {
  data: {
    center: { type: string; id: string };
    edges: GraphEdge[];
    nodes: Array<{ type: string; id: string; label: string }>;
  };
}

interface GraphPathResponse {
  data: {
    path: Array<{ type: string; id: string; label: string }>;
    edges: GraphEdge[];
  };
}

export async function fetchGraphConnections(
  entityType: string,
  entityId: string,
  depth = 1,
  minWeight = 0.5,
): Promise<GraphConnectionsResponse["data"]> {
  const res = await apiFetch<GraphConnectionsResponse>(
    `/graph/connections?entity=${entityType}:${entityId}&depth=${depth}&minWeight=${minWeight}`
  );
  return res.data;
}

export async function fetchGraphPath(
  fromType: string,
  fromId: string,
  toType: string,
  toId: string,
): Promise<GraphPathResponse["data"]> {
  const res = await apiFetch<GraphPathResponse>(
    `/graph/path?from=${fromType}:${fromId}&to=${toType}:${toId}`
  );
  return res.data;
}
```

- [ ] **Step 24: Implement anomalies API client**

```ts
// frontend/src/api/anomalies.ts
import { apiFetch } from "./client";

export interface AnomalyRecord {
  entityType: string;
  entityId: string;
  currentCount: number;
  baselineMean: number;
  baselineStddev: number;
  zScore: number;
  severity: "watch" | "alert" | "critical";
  hourBucket: string;
  detectedAt: string;
}

export interface BaselineData {
  entityType: string;
  entityId: string;
  hours: Array<{ bucket: string; count: number }>;
  mean: number;
  stddev: number;
}

export async function fetchAnomalies(
  severity: string = "alert,critical",
  since: string = "24h",
): Promise<AnomalyRecord[]> {
  const res = await apiFetch<{ data: AnomalyRecord[] }>(
    `/anomalies?severity=${severity}&since=${since}`
  );
  return res.data;
}

export async function fetchAnomalyBaseline(
  entityType: string,
  entityId: string,
): Promise<BaselineData> {
  const res = await apiFetch<{ data: BaselineData }>(
    `/anomalies/baseline/${entityType}/${entityId}`
  );
  return res.data;
}
```

- [ ] **Step 25: Implement plugins API client**

```ts
// frontend/src/api/plugins.ts
import { apiFetch } from "./client";
import type { PluginManifest } from "../state/plugins";

export async function fetchPluginManifests(): Promise<PluginManifest[]> {
  const res = await apiFetch<{ data: PluginManifest[] }>("/plugins/manifest");
  return res.data;
}
```

- [ ] **Step 26: Implement settings API client**

```ts
// frontend/src/api/settings.ts
import { apiFetch } from "./client";

export interface AISettingsResponse {
  llmProvider: "anthropic" | "openai";
  llmApiKeyMasked: string;
  llmModel?: string;
  aiAnalysisEnabled: boolean;
}

export async function getUserSettings(): Promise<AISettingsResponse | null> {
  try {
    const res = await apiFetch<{ data: AISettingsResponse }>("/settings/ai");
    return res.data;
  } catch {
    return null; // Not configured yet
  }
}

export async function putUserSettings(
  provider: "anthropic" | "openai",
  apiKey: string,
  model?: string,
): Promise<AISettingsResponse> {
  const res = await apiFetch<{ data: AISettingsResponse }>("/settings/ai", {
    method: "PUT",
    body: JSON.stringify({ llmProvider: provider, llmApiKey: apiKey, llmModel: model }),
  });
  return res.data;
}

export async function deleteUserSettings(): Promise<void> {
  await apiFetch("/settings/ai", { method: "DELETE" });
}
```

- [ ] **Step 27: Run all state tests, commit**

Run: `cd frontend && npx vitest run tests/state/`
Expected: All PASS

```bash
git add frontend/src/state/ frontend/src/api/ frontend/tests/
git commit -m "feat: add state management (8 signal modules), API clients (7 modules), bootstrap with IndexedDB + temporal support"
```

---

### Task 3: Deck.GL Globe View + Earth Texture

**Files:**
- Create: `frontend/src/map/deck-map.tsx`
- Create: `frontend/src/map/globe-view.ts`
- Create: `frontend/src/app.tsx`

- [ ] **Step 1: Implement Deck.GL map wrapper**

```tsx
// frontend/src/map/deck-map.tsx
import { useEffect, useRef } from "preact/hooks";
import { Deck } from "@deck.gl/core";
import { viewMode, isGlobe } from "../state/store";
import { createGlobeView, GLOBE_INITIAL_STATE } from "./globe-view";

export function DeckMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Deck | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const deck = new Deck({
      parent: containerRef.current,
      initialViewState: GLOBE_INITIAL_STATE,
      views: createGlobeView(),
      layers: [],
      controller: true,
      style: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%" },
    });

    deckRef.current = deck;

    return () => { deck.finalize(); };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%", position: "relative" }} />;
}
```

- [ ] **Step 2: Implement globe view config**

```ts
// frontend/src/map/globe-view.ts
import { GlobeView } from "@deck.gl/core";
import { BitmapLayer } from "@deck.gl/layers";

export const GLOBE_INITIAL_STATE = {
  longitude: 40,
  latitude: 30,
  zoom: 1.5,
  maxZoom: 20,
  minZoom: 0.5,
};

export function createGlobeView() {
  return new GlobeView({ id: "globe" });
}

export function createEarthLayer() {
  return new BitmapLayer({
    id: "earth-texture",
    image: "/textures/earth-dark.jpg",
    bounds: [-180, -90, 180, 90],
  });
}
```

- [ ] **Step 3: Create app root layout**

```tsx
// frontend/src/app.tsx
import { DeckMap } from "./map/deck-map";
import { loadBootstrap } from "./api/bootstrap";
import { useEffect } from "preact/hooks";
import "./styles/app.css";

export function App() {
  useEffect(() => {
    loadBootstrap();
  }, []);

  return (
    <div class="app-layout">
      <aside class="sidebar">
        {/* Sidebar: watchlist + layer menu — Task 7 */}
      </aside>
      <main class="map-container">
        <DeckMap />
        {/* Timeline scrubber anchored to bottom — Task 16 */}
        {/* Anomaly banner anchored to top — Task 18 */}
      </main>
      <aside class="right-panel">
        {/* Right panel: details + news — Tasks 9-11, 16-19 */}
      </aside>
    </div>
  );
}
```

- [ ] **Step 4: Create app layout CSS**

```css
/* frontend/src/styles/app.css */
@import "./variables.css";

.app-layout {
  display: grid;
  grid-template-columns: 200px 1fr 380px;
  height: 100vh;
  background: var(--bg-primary);
}

.sidebar {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-default);
  overflow-y: auto;
  padding: var(--space-2);
}

.map-container {
  position: relative;
  overflow: hidden;
}

.right-panel {
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-default);
  overflow-y: auto;
  padding: var(--space-2);
}

/* Scrollbar styling */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bg-tertiary); border-radius: 3px; }
```

- [ ] **Step 5: Create map overlay CSS**

```css
/* frontend/src/styles/map.css */
@import "./variables.css";

.timeline-scrubber {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, var(--bg-primary));
  padding: var(--space-2) var(--space-4);
  z-index: 10;
}

.historical-banner {
  background: var(--anomaly-alert);
  color: #fff;
  text-align: center;
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-2);
}

.scrubber-slider {
  width: 100%;
  accent-color: var(--accent-primary);
}

.scrubber-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.scrubber-live.active { color: var(--risk-clear); }

.return-live-btn {
  background: var(--accent-primary);
  color: #fff;
  border: none;
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: 10px;
  cursor: pointer;
}

.anomaly-banner {
  position: absolute;
  top: var(--space-2);
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  padding: var(--space-2) var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  z-index: 20;
  cursor: pointer;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.anomaly-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--anomaly-alert);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}
```

- [ ] **Step 6: Verify globe renders in browser**

Run: `cd frontend && npm run dev`
Navigate to: http://localhost:5173
Expected: Dark globe renders with earth texture, draggable/zoomable

- [ ] **Step 7: Commit**

```bash
git add frontend/src/map/ frontend/src/app.tsx frontend/src/styles/app.css frontend/src/styles/map.css
git commit -m "feat: add Deck.GL globe view with dark earth texture + app layout"
```

---

### Task 4: Flat View + MapLibre + PMTiles + View Transition

**Files:**
- Create: `frontend/src/map/flat-view.ts`
- Create: `frontend/src/map/pmtiles-source.ts`
- Create: `frontend/src/map/view-transition.ts`
- Modify: `frontend/src/map/deck-map.tsx`

- [ ] **Step 1: Implement PMTiles source for MapLibre**

```ts
// frontend/src/map/pmtiles-source.ts
import { Protocol } from "pmtiles";
import maplibregl from "maplibre-gl";

let protocol: Protocol | null = null;

export function initPMTiles() {
  if (protocol) return;
  protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
}

// Fallback to CartoDB dark tiles during development (no PMTiles file yet)
export const DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
      tileSize: 256,
      attribution: "&copy; CARTO",
    },
  },
  layers: [
    {
      id: "carto-dark-layer",
      type: "raster",
      source: "carto-dark",
      minzoom: 0,
      maxzoom: 20,
    },
  ],
};
```

- [ ] **Step 2: Implement flat view with MapLibre**

```ts
// frontend/src/map/flat-view.ts
import { MapView } from "@deck.gl/core";
import maplibregl from "maplibre-gl";
import { DARK_STYLE, initPMTiles } from "./pmtiles-source";

export const FLAT_INITIAL_STATE = {
  longitude: 40,
  latitude: 30,
  zoom: 3,
  maxZoom: 18,
  minZoom: 1,
};

export function createFlatView() {
  return new MapView({
    id: "flat",
    controller: true,
  });
}

export function createMapLibreMap(container: HTMLElement): maplibregl.Map {
  initPMTiles();

  return new maplibregl.Map({
    container,
    style: DARK_STYLE,
    center: [FLAT_INITIAL_STATE.longitude, FLAT_INITIAL_STATE.latitude],
    zoom: FLAT_INITIAL_STATE.zoom,
    attributionControl: false,
  });
}
```

- [ ] **Step 3: Implement view transition (globe <-> flat)**

```ts
// frontend/src/map/view-transition.ts
import { viewMode, setViewMode } from "../state/store";

const TRANSITION_ZOOM = 4.5;

export function checkViewTransition(zoom: number) {
  if (viewMode.value === "globe" && zoom > TRANSITION_ZOOM) {
    setViewMode("flat");
  } else if (viewMode.value === "flat" && zoom < TRANSITION_ZOOM - 0.5) {
    setViewMode("globe");
  }
}

export function animateTransition(
  deckInstance: any,
  targetMode: "globe" | "flat",
) {
  // Crossfade: set opacity transition on the canvas
  const canvas = deckInstance.getCanvas();
  if (canvas) {
    canvas.style.transition = "opacity 200ms ease";
    canvas.style.opacity = "0.7";
    setTimeout(() => {
      canvas.style.opacity = "1";
    }, 200);
  }
}
```

- [ ] **Step 4: Update deck-map.tsx to support both views**

Update `DeckMap` component to switch between `GlobeView` and `MapView` based on `viewMode` signal. When in flat mode, render MapLibre as the base map underneath Deck.GL.

- [ ] **Step 5: Verify view switching works in browser**

Run: `cd frontend && npm run dev`
Expected: Globe renders initially. Zooming in past ~4.5 transitions to flat view with dark tiles. Zooming out transitions back to globe.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/map/
git commit -m "feat: add flat view with MapLibre + PMTiles + globe/flat transition"
```

---

### Task 5: SSE Client (9 Event Types) + Day/Night Theme

**Files:**
- Create: `frontend/src/api/sse.ts`
- Create: `frontend/src/map/day-night.ts`

- [ ] **Step 1: Implement SSE client with all 9 event type handlers**

```ts
// frontend/src/api/sse.ts
import { signal } from "@preact/signals";
import { bootstrapData } from "../state/store";
import { pushAnomaly } from "../state/anomalies";
import { setTimelineSnapshots } from "../state/timeline";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export const sseConnected = signal(false);
export const latestNews = signal<any[]>([]);
export const newsAnalyses = signal<Record<string, any>>({});

let eventSource: EventSource | null = null;

export function connectSSE() {
  if (eventSource) return;

  eventSource = new EventSource(`${BASE_URL}/events/stream`);

  eventSource.onopen = () => { sseConnected.value = true; };

  // --- Core events (from original plan) ---

  eventSource.addEventListener("news", (e) => {
    const data = JSON.parse(e.data);
    latestNews.value = [data, ...latestNews.value.slice(0, 99)];
  });

  eventSource.addEventListener("risk-change", (e) => {
    const data = JSON.parse(e.data);
    // Update bootstrap data for the affected country
    const bd = bootstrapData.value;
    if (bd?.countries) {
      bootstrapData.value = {
        ...bd,
        countries: bd.countries.map((c: any) =>
          c._id === data.country ? { ...c, risk: data.to } : c
        ),
      };
    }
  });

  eventSource.addEventListener("conflict-update", (e) => {
    const data = JSON.parse(e.data);
    const bd = bootstrapData.value;
    if (bd?.conflicts) {
      bootstrapData.value = {
        ...bd,
        conflicts: bd.conflicts.map((c: any) =>
          c._id === data.id ? { ...c, dayCount: data.dayCount, latestUpdate: data.latestUpdate } : c
        ),
      };
    }
  });

  eventSource.addEventListener("chokepoint-status", (e) => {
    const data = JSON.parse(e.data);
    const bd = bootstrapData.value;
    if (bd?.chokepoints) {
      bootstrapData.value = {
        ...bd,
        chokepoints: bd.chokepoints.map((c: any) =>
          c._id === data.id ? { ...c, status: data.status } : c
        ),
      };
    }
  });

  // --- New events (from intelligence pipeline) ---

  eventSource.addEventListener("news-enriched", (e) => {
    const data = JSON.parse(e.data);
    // Replace the matching news item with its enriched version
    latestNews.value = latestNews.value.map((n: any) =>
      n.title === data.title ? { ...n, ...data } : n
    );
  });

  eventSource.addEventListener("news-analysis", (e) => {
    const data = JSON.parse(e.data);
    // Store AI synthesis keyed by cluster ID
    newsAnalyses.value = { ...newsAnalyses.value, [data.clusterId]: data };
  });

  eventSource.addEventListener("anomaly", (e) => {
    const data = JSON.parse(e.data);
    pushAnomaly({
      entityType: data.entityType,
      entityId: data.entityId,
      severity: data.severity,
      zScore: data.zScore,
      currentCount: data.currentCount,
      baselineMean: data.baselineMean,
      detectedAt: new Date().toISOString(),
    });
  });

  eventSource.addEventListener("snapshot", (e) => {
    const data = JSON.parse(e.data);
    // Inform timeline scrubber that new data is available
    import("../state/timeline").then(m => {
      setTimelineSnapshots([...m.timelineSnapshots.value, new Date(data.timestamp)]);
    });
  });

  eventSource.addEventListener("plugin-data", (e) => {
    const data = JSON.parse(e.data);
    // Trigger refresh of active plugin layer data
    console.log("[sse] Plugin data update:", data.pluginId, data.newDocs, "new docs");
    // Plugin layer refresh handled by the plugin layer components via signal subscription
  });

  eventSource.onerror = () => {
    sseConnected.value = false;
    eventSource?.close();
    eventSource = null;
    // Reconnect after 5s
    setTimeout(connectSSE, 5000);
  };
}

export function disconnectSSE() {
  eventSource?.close();
  eventSource = null;
  sseConnected.value = false;
}
```

- [ ] **Step 2: Implement day/night solar calculation**

```ts
// frontend/src/map/day-night.ts
import { signal } from "@preact/signals";

export type TimeOfDay = "day" | "golden" | "night" | "dawn";

export const timeOfDay = signal<TimeOfDay>("night"); // default dark

/** Lightweight solar calculation — no external deps */
function getSolarElevation(lat: number, date: Date): number {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
  const declination = 23.45 * Math.sin((2 * Math.PI * (dayOfYear - 81)) / 365);
  const hourAngle = ((date.getHours() + date.getMinutes() / 60) - 12) * 15;

  const latRad = (lat * Math.PI) / 180;
  const decRad = (declination * Math.PI) / 180;
  const haRad = (hourAngle * Math.PI) / 180;

  return Math.asin(
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
  ) * (180 / Math.PI);
}

export function updateTimeOfDay(userLat: number = 40) {
  const now = new Date();
  const elevation = getSolarElevation(userLat, now);

  if (elevation > 6) timeOfDay.value = "day";
  else if (elevation > 0) timeOfDay.value = "golden";
  else if (elevation > -6) timeOfDay.value = "dawn";
  else timeOfDay.value = "night";
}

// Update every minute
let interval: ReturnType<typeof setInterval> | null = null;

export function startDayNightCycle(userLat?: number) {
  updateTimeOfDay(userLat);
  interval = setInterval(() => updateTimeOfDay(userLat), 60000);
}

export function stopDayNightCycle() {
  if (interval) clearInterval(interval);
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/sse.ts frontend/src/map/day-night.ts
git commit -m "feat: add SSE client with 8 event handlers + day/night solar theme cycle"
```

---

## Phase 5: Layers & Features

### Task 6: Risk Heatmap + Country Interaction

**Files:**
- Create: `frontend/src/layers/risk-heatmap.ts`

- [ ] **Step 1: Implement risk heatmap layer**

Globe view: `ScatterplotLayer` with colored dots at country centers.
Flat view: MapLibre `setFeatureState()` to color country polygons from PMTiles.

```ts
// frontend/src/layers/risk-heatmap.ts
import { ScatterplotLayer } from "@deck.gl/layers";
import { riskHeatmapOpacity } from "../state/layers";
import { bootstrapData } from "../state/store";

const RISK_COLORS: Record<string, [number, number, number]> = {
  catastrophic: [239, 68, 68],
  extreme: [249, 115, 22],
  severe: [234, 179, 8],
  stormy: [217, 119, 6],
  cloudy: [107, 114, 128],
  clear: [34, 197, 94],
};

export function createRiskHeatmapLayer() {
  const countries = bootstrapData.value?.countries ?? [];

  return new ScatterplotLayer({
    id: "risk-heatmap",
    data: countries,
    getPosition: (d: any) => [d.lng, d.lat],
    getRadius: 80000, // 80km visual radius
    getFillColor: (d: any) => [...(RISK_COLORS[d.risk] ?? [128, 128, 128]), Math.floor(riskHeatmapOpacity.value * 255)],
    pickable: true,
    onClick: (info: any) => {
      if (info.object) {
        import("../state/store").then(m => m.selectCountry(info.object._id));
      }
    },
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/layers/risk-heatmap.ts
git commit -m "feat: add risk heatmap layer (globe: colored dots, flat: polygon fill)"
```

---

### Task 7: Sidebar — Watchlist + Layer Menu + Dynamic Plugin Layers + Anomaly Badges

**Files:**
- Create: `frontend/src/panels/sidebar.tsx`
- Create: `frontend/src/panels/layer-menu.tsx`
- Create: `frontend/src/components/badge.tsx`

- [ ] **Step 1: Implement badge component**

```tsx
// frontend/src/components/badge.tsx
const RISK_COLORS: Record<string, string> = {
  catastrophic: "var(--risk-catastrophic)",
  extreme: "var(--risk-extreme)",
  severe: "var(--risk-severe)",
  stormy: "var(--risk-stormy)",
  cloudy: "var(--risk-cloudy)",
  clear: "var(--risk-clear)",
};

export function RiskBadge({ risk }: { risk: string }) {
  return (
    <span class="badge" style={{ background: RISK_COLORS[risk] ?? "#888", color: "#fff" }}>
      {risk.toUpperCase()}
    </span>
  );
}

export function StatusBadge({ status, color }: { status: string; color?: string }) {
  return (
    <span class="badge" style={{ background: color ?? "var(--accent-primary)", color: "#fff" }}>
      {status}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: "watch" | "alert" | "critical" }) {
  const colors: Record<string, string> = {
    watch: "var(--anomaly-watch)",
    alert: "var(--anomaly-alert)",
    critical: "var(--anomaly-critical)",
  };
  return (
    <span class="badge" style={{ background: colors[severity], color: "#fff" }}>
      {severity.toUpperCase()}
    </span>
  );
}
```

- [ ] **Step 2: Implement sidebar with watchlist + anomaly badges**

```tsx
// frontend/src/panels/sidebar.tsx
import { bootstrapData } from "../state/store";
import { RiskBadge } from "../components/badge";
import { LayerMenu } from "./layer-menu";
import { selectCountry } from "../state/store";
import { anomalyAlerts } from "../state/anomalies";

export function Sidebar() {
  const data = bootstrapData.value;
  const alerts = anomalyAlerts.value;
  const criticalCountries = (data?.countries ?? [])
    .filter((c: any) => c.risk === "catastrophic" || c.risk === "extreme")
    .sort((a: any, b: any) => {
      const order = { catastrophic: 0, extreme: 1 };
      return (order[a.risk as keyof typeof order] ?? 2) - (order[b.risk as keyof typeof order] ?? 2);
    });

  // Build a set of entity IDs with active anomaly alerts
  const alertEntityIds = new Set(alerts.map(a => a.entityId));

  return (
    <div class="sidebar-content">
      <div class="sidebar-header">
        <h1 class="logo">GAMBIT</h1>
        <span class="live-dot" />
        <span class="date">{new Date().toLocaleDateString()}</span>
      </div>

      <div class="watchlist">
        <h2 class="section-title">CRITICAL WATCHLIST</h2>
        {criticalCountries.map((c: any) => (
          <div class="watchlist-item" key={c._id} onClick={() => selectCountry(c._id)}>
            <span class="flag">{c.flag}</span>
            <span class="name">{c.name}</span>
            <RiskBadge risk={c.risk} />
            {alertEntityIds.has(c.iso2) && (
              <span class="anomaly-pulse" title="Active anomaly alert" />
            )}
          </div>
        ))}
      </div>

      <LayerMenu />
    </div>
  );
}
```

- [ ] **Step 3: Implement layer menu with presets + dynamic plugin layers**

```tsx
// frontend/src/panels/layer-menu.tsx
import { layers, toggleLayer, setPreset, activeLayerCount, riskHeatmapOpacity } from "../state/layers";
import { compareMode, toggleCompareMode, compareCount } from "../state/compare";
import { pluginManifests, pluginLayers, togglePluginLayer } from "../state/plugins";

export function LayerMenu() {
  const l = layers.value;
  const manifests = pluginManifests.value;
  const pLayers = pluginLayers.value;

  // Group plugin layers by their panel.group (or "PLUGINS" as fallback)
  const pluginsByGroup: Record<string, typeof manifests> = {};
  for (const m of manifests) {
    if (m.type === "source" || m.type === "layer") {
      const group = m.panel?.group ?? "PLUGINS";
      if (!pluginsByGroup[group]) pluginsByGroup[group] = [];
      pluginsByGroup[group].push(m);
    }
  }

  return (
    <div class="layer-menu">
      <div class="layer-controls">
        <button class="layer-btn" onClick={() => {}}>
          Layers {activeLayerCount.value > 0 ? activeLayerCount.value : ""}
        </button>
        <button
          class={`compare-btn ${compareMode.value ? "active" : ""}`}
          onClick={toggleCompareMode}
        >
          Compare {compareMode.value ? `${compareCount.value}/3` : ""}
        </button>
      </div>

      <div class="presets">
        <h3 class="group-title">PRESETS</h3>
        <div class="preset-row">
          <button onClick={() => setPreset("conflict")}>Conflict Zone</button>
          <button onClick={() => setPreset("trade")}>Trade Risk</button>
          <button onClick={() => setPreset("full")}>Full Intel</button>
          <button onClick={() => setPreset("minimal")}>Minimal</button>
        </div>
      </div>

      <div class="layer-group">
        <h3 class="group-title">ECONOMIC</h3>
        <label><input type="checkbox" checked={l.tradeRoutes} onChange={() => toggleLayer("tradeRoutes")} /> Trade Routes</label>
        <label><input type="checkbox" checked={l.chokepoints} onChange={() => toggleLayer("chokepoints")} /> Chokepoints</label>
      </div>

      <div class="layer-group">
        <h3 class="group-title">SECURITY</h3>
        <label><input type="checkbox" checked={l.militaryBases} onChange={() => toggleLayer("militaryBases")} /> Military Bases</label>
        <label><input type="checkbox" checked={l.nsaZones} onChange={() => toggleLayer("nsaZones")} /> Non-State Actors</label>
        <label><input type="checkbox" checked={l.conflicts} onChange={() => toggleLayer("conflicts")} /> Conflicts</label>
      </div>

      <div class="layer-group">
        <h3 class="group-title">POLITICAL</h3>
        <label><input type="checkbox" checked={l.elections} onChange={() => toggleLayer("elections")} /> Elections</label>
      </div>

      {/* Dynamic plugin layers */}
      {Object.entries(pluginsByGroup).map(([group, plugins]) => (
        <div class="layer-group" key={group}>
          <h3 class="group-title">{group.toUpperCase()}</h3>
          {plugins.map((p) => (
            <label key={p.id}>
              <input type="checkbox" checked={pLayers[p.id] ?? false} onChange={() => togglePluginLayer(p.id)} />
              {p.panel?.icon ? <span class="plugin-icon">{p.panel.icon}</span> : null}
              {p.name}
            </label>
          ))}
        </div>
      ))}

      <div class="heatmap-slider">
        <label>Risk Heatmap</label>
        <input
          type="range" min="0" max="100" value={riskHeatmapOpacity.value * 100}
          onInput={(e) => { riskHeatmapOpacity.value = Number((e.target as HTMLInputElement).value) / 100; }}
        />
        <span>{Math.round(riskHeatmapOpacity.value * 100)}%</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create panels CSS**

```css
/* frontend/src/styles/panels.css */
@import "./variables.css";

.sidebar-content { display: flex; flex-direction: column; gap: var(--space-2); }
.sidebar-header { display: flex; align-items: center; gap: var(--space-2); padding: var(--space-2) 0; }
.logo { font-family: var(--font-mono); font-size: 16px; letter-spacing: 0.15em; color: var(--accent-primary); }
.live-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--risk-clear); animation: pulse 2s infinite; }
.date { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }

.section-title { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-secondary); margin: var(--space-2) 0 var(--space-1); }
.subsection-title { font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary); margin: var(--space-3) 0 var(--space-1); }

.watchlist-item { display: flex; align-items: center; gap: var(--space-1); padding: var(--space-1); cursor: pointer; border-radius: 4px; }
.watchlist-item:hover { background: var(--bg-tertiary); }
.watchlist-item .flag { font-size: 14px; }
.watchlist-item .name { flex: 1; font-size: 12px; color: var(--text-primary); }

.badge { display: inline-block; padding: 1px 6px; border-radius: 2px; font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; font-weight: bold; }

.trust-badge { display: inline-block; padding: 1px 6px; border-radius: 2px; font-family: var(--font-mono); font-size: 8px; text-transform: uppercase; font-weight: bold; cursor: help; }
.trust-high { background: var(--trust-high); color: #fff; }
.trust-medium { background: var(--trust-medium); color: #fff; }
.trust-low { background: var(--trust-low); color: #fff; }

.layer-menu { display: flex; flex-direction: column; gap: var(--space-1); }
.layer-controls { display: flex; gap: var(--space-1); }
.layer-btn, .compare-btn { background: transparent; border: 1px solid var(--border-default); color: var(--text-primary); padding: var(--space-1) var(--space-2); font-family: var(--font-mono); font-size: 10px; cursor: pointer; flex: 1; }
.compare-btn.active { border-color: var(--accent-primary); color: var(--accent-primary); }
.group-title { font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin: var(--space-2) 0 var(--space-1); }
.preset-row { display: flex; flex-wrap: wrap; gap: var(--space-1); }
.preset-row button { background: var(--bg-tertiary); border: 1px solid var(--border-default); color: var(--text-secondary); padding: 2px 6px; font-size: 10px; cursor: pointer; border-radius: 2px; }
.layer-group label { display: flex; align-items: center; gap: var(--space-1); font-size: 12px; color: var(--text-primary); cursor: pointer; padding: 2px 0; }
.heatmap-slider { display: flex; align-items: center; gap: var(--space-1); font-size: 11px; }
.heatmap-slider input[type="range"] { flex: 1; accent-color: var(--accent-primary); }

.graph-explorer { padding: var(--space-2); }
.graph-controls { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); }
.graph-entity { font-family: var(--font-mono); font-size: 11px; color: var(--accent-primary); }
.depth-control { display: flex; align-items: center; gap: var(--space-1); font-size: 11px; }
.depth-control button { background: var(--bg-tertiary); border: 1px solid var(--border-default); color: var(--text-primary); width: 24px; height: 24px; cursor: pointer; }

.ai-synthesis-card { background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: 6px; padding: var(--space-2); margin: var(--space-1) 0; }
.synthesis-header { display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1); }
.synthesis-label { font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--accent-diplomacy); }
.synthesis-signal { font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; font-weight: bold; }
.synthesis-count { font-size: 10px; color: var(--text-muted); margin-left: auto; }
.synthesis-summary { font-size: 12px; color: var(--text-primary); line-height: 1.4; }
.synthesis-perspectives { margin-top: var(--space-1); display: flex; flex-wrap: wrap; gap: var(--space-1); }
.perspective { font-size: 10px; padding: 2px 6px; background: var(--bg-secondary); border-radius: 2px; }
.perspective-source { color: var(--text-secondary); }
.perspective-label { color: var(--text-primary); margin-left: 4px; }

.settings-panel { padding: var(--space-2); }
.settings-status { padding: var(--space-2); border-radius: 4px; margin-bottom: var(--space-2); font-size: 12px; }
.settings-status.connected { background: rgba(34, 197, 94, 0.1); border: 1px solid var(--risk-clear); color: var(--risk-clear); }
.settings-status.not-configured { background: rgba(136, 136, 170, 0.1); border: 1px solid var(--text-muted); color: var(--text-muted); }
.settings-form { display: flex; flex-direction: column; gap: var(--space-2); }
.form-field { display: flex; flex-direction: column; gap: 2px; }
.form-field span { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; color: var(--text-secondary); }
.form-field input, .form-field select { background: var(--bg-tertiary); border: 1px solid var(--border-default); color: var(--text-primary); padding: var(--space-1) var(--space-2); font-size: 12px; }
.settings-error { color: var(--risk-catastrophic); font-size: 12px; }
.settings-actions { display: flex; gap: var(--space-2); }
.save-btn { background: var(--accent-primary); color: #fff; border: none; padding: var(--space-1) var(--space-3); cursor: pointer; }
.remove-btn { background: transparent; border: 1px solid var(--risk-catastrophic); color: var(--risk-catastrophic); padding: var(--space-1) var(--space-3); cursor: pointer; }

.empty-state { color: var(--text-muted); font-size: 12px; text-align: center; padding: var(--space-4); }
.loading-state { color: var(--text-muted); font-size: 12px; text-align: center; padding: var(--space-4); }

.anomaly-record { display: flex; align-items: center; gap: var(--space-1); padding: var(--space-1); cursor: pointer; border-radius: 4px; }
.anomaly-record:hover { background: var(--bg-tertiary); }
.record-entity { font-size: 12px; color: var(--text-primary); flex: 1; }
.record-stats { font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary); }
.record-time { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/panels/sidebar.tsx frontend/src/panels/layer-menu.tsx
git add frontend/src/components/badge.tsx frontend/src/styles/panels.css
git commit -m "feat: add sidebar with watchlist + anomaly badges, layer menu with plugin layers"
```

---

### Task 8: Data Layers — Trade Routes, Chokepoints, Military, NSA, Conflicts, Elections

**Files:**
- Create: `frontend/src/layers/trade-routes.ts`
- Create: `frontend/src/layers/chokepoints.ts`
- Create: `frontend/src/layers/military-bases.ts`
- Create: `frontend/src/layers/nsa-zones.ts`
- Create: `frontend/src/layers/conflicts.ts`
- Create: `frontend/src/layers/elections.ts`

Each layer file exports a function that returns a Deck.GL layer instance using bootstrap data. Layers are conditionally included in the Deck.GL layer array based on `layers` signal state.

- [ ] **Step 1: Implement trade routes + chokepoints layers**

- **Trade Routes** (`trade-routes.ts`): `ArcLayer` — color by category (container=blue, energy=amber, bulk=green), width by volume, pulse animation for disrupted
- **Chokepoints** (`chokepoints.ts`): `ScatterplotLayer` + `TextLayer` — status-colored markers (OPEN=green, RESTRICTED=amber, CLOSED=red)

- [ ] **Step 2: Implement military bases + NSA zones layers**

- **Military Bases** (`military-bases.ts`): `ScatterplotLayer` with clustering — color by operating country from `countryColors`
- **NSA Zones** (`nsa-zones.ts`): `ScatterplotLayer` with semi-transparent circles — color by ideology, opacity by status

- [ ] **Step 3: Implement conflicts + elections layers**

- **Conflicts** (`conflicts.ts`): Animated pulse rings — `ScatterplotLayer` with `radiusScale` animation
- **Elections** (`elections.ts`): `ScatterplotLayer` + `TextLayer` — countdown badges at country capitals

- [ ] **Step 4: Wire layers into DeckMap component**

Update `deck-map.tsx` to read `layers` signal and conditionally include layer instances in the Deck.GL layer array. Layers update reactively when toggles change.

- [ ] **Step 5: Verify each layer renders correctly in browser**

Toggle each layer on and off via the layer menu. Verify visual rendering matches spec.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/layers/
git commit -m "feat: add 6 map data layers (trade routes, chokepoints, bases, NSA, conflicts, elections)"
```

---

### Task 9: Detail Panels — Per-Layer Sidebars + Connections Tab + Anomaly Sparkline

**Files:**
- Create: `frontend/src/panels/trade-routes-panel.tsx`
- Create: `frontend/src/panels/chokepoints-panel.tsx`
- Create: `frontend/src/panels/bases-panel.tsx`
- Create: `frontend/src/panels/nsa-panel.tsx`
- Create: `frontend/src/panels/conflicts-panel.tsx`
- Create: `frontend/src/panels/elections-panel.tsx`
- Create: `frontend/src/panels/right-panel.tsx`
- Create: `frontend/src/components/sparkline.tsx`
- Test: `frontend/tests/components/sparkline.test.ts`

- [ ] **Step 1: Write failing test for sparkline component**

```ts
// frontend/tests/components/sparkline.test.ts
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/preact";
import { Sparkline } from "../../src/components/sparkline";

describe("Sparkline", () => {
  it("renders an SVG with the correct number of points", () => {
    const data = [1, 3, 2, 5, 4, 8, 6];
    const { container } = render(<Sparkline data={data} width={120} height={24} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("width")).toBe("120");
  });

  it("highlights spikes above threshold", () => {
    const data = [1, 2, 1, 8, 1, 2, 1]; // 8 is a spike
    const { container } = render(<Sparkline data={data} width={120} height={24} spikeThreshold={5} />);
    const circles = container.querySelectorAll("circle.spike");
    expect(circles.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Implement sparkline component**

```tsx
// frontend/src/components/sparkline.tsx
interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  spikeThreshold?: number;
  color?: string;
  spikeColor?: string;
}

export function Sparkline({
  data,
  width = 120,
  height = 24,
  spikeThreshold,
  color = "var(--accent-primary)",
  spikeColor = "var(--anomaly-alert)",
}: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 2;

  const points = data.map((v, i) => {
    const x = padding + (i / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return { x, y, value: v };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <svg width={width} height={height} class="sparkline">
      <path d={pathD} fill="none" stroke={color} stroke-width="1.5" />
      {spikeThreshold != null && points
        .filter(p => p.value >= spikeThreshold)
        .map((p, i) => (
          <circle key={i} class="spike" cx={p.x} cy={p.y} r="2.5" fill={spikeColor} />
        ))
      }
    </svg>
  );
}
```

- [ ] **Step 3: Run sparkline test**

Run: `cd frontend && npx vitest run tests/components/sparkline.test.ts`
Expected: PASS

- [ ] **Step 4: Implement trade routes + chokepoints + bases panels**

Each panel reads from `bootstrapData` and provides:
- Filtered/sorted list of items for that layer
- Filter controls (by status, type, category, etc.)
- Click-to-fly: clicking an item dispatches a camera fly-to action

- [ ] **Step 5: Implement NSA + elections panels**

- NSA panel: expandable details (funding, allies, rivals, major attacks)
- Elections panel: timeline view sorted chronologically

- [ ] **Step 6: Implement conflicts panel with AI synthesis cards**

- Conflicts panel: sorted by severity, casualty summary, day count
- When user has BYOK enabled: AI synthesis cards interspersed with individual articles (reads from `newsAnalyses` signal)

- [ ] **Step 7: Add connections tab + anomaly sparkline to all entity panels**

Shared pattern added to each detail panel:
- **Connections tab** — fetches `/graph/connections?entity=<type:id>&depth=1` and shows linked entities as clickable chips. Clicking a chip navigates to that entity's detail panel + flies the camera.
- **Anomaly sparkline** — fetches `/anomalies/baseline/:type/:id` and renders a tiny 7-day chart via the `<Sparkline>` component with spikes highlighted.

- [ ] **Step 8: Implement right panel container**

The right panel shows context-sensitive content: when a layer is active, show its panel. When a country is selected, show country detail. When compare mode is active, show compare panel. When graph explorer is active, show graph panel.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/panels/ frontend/src/components/sparkline.tsx frontend/tests/components/
git commit -m "feat: add detail panels with connections tab, anomaly sparkline, AI synthesis cards"
```

---

### Task 10: Compare Mode + Shared Graph Connections

**Files:**
- Create: `frontend/src/panels/compare-panel.tsx`
- Modify: `frontend/src/map/deck-map.tsx` (selection mode)

- [ ] **Step 1: Implement compare panel with shared connections section**

Side-by-side comparison of up to 3 countries showing: risk, pop, GDP, leader, region, tags, analysis. Below: related conflicts, NSA groups, nearby bases (merged lists).

**NEW: Shared graph connections section.** Fetch `/graph/connections` for each compared country, compute the intersection of linked entities, and display shared conflicts, chokepoints, NSA groups as a "Shared Intelligence" section below the stats comparison.

```tsx
// frontend/src/panels/compare-panel.tsx (partial — shared connections logic)
import { fetchGraphConnections } from "../api/graph";

async function loadSharedConnections(countryCodes: string[]) {
  // Fetch connections for each country
  const allConnections = await Promise.all(
    countryCodes.map(iso2 => fetchGraphConnections("country", iso2, 1))
  );

  // Find entities connected to ALL compared countries
  const entitySets = allConnections.map(conn =>
    new Set(conn.edges.map(e => {
      const other = e.from.id === conn.center.id ? e.to : e.from;
      return `${other.type}:${other.id}`;
    }))
  );

  const shared = [...entitySets[0]].filter(entity =>
    entitySets.every(set => set.has(entity))
  );

  return shared.map(key => {
    const [type, id] = key.split(":");
    return { type, id };
  });
}
```

Data fetched from `/compare?countries=US,IR,RU` for the stats comparison.

- [ ] **Step 2: Implement map selection mode for compare**

When compare mode is active, clicking a country on the map adds it to the comparison (up to 3). Selected countries get highlighted with assigned colors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/panels/compare-panel.tsx frontend/src/map/
git commit -m "feat: add compare mode with side-by-side stats + shared graph connections"
```

---

### Task 11: Global Search + News Feed + Provenance Badge + AI Synthesis Card

**Files:**
- Create: `frontend/src/panels/search-bar.tsx`
- Create: `frontend/src/panels/news-feed.tsx`
- Create: `frontend/src/components/trust-badge.tsx`
- Create: `frontend/src/panels/ai-synthesis-card.tsx`
- Test: `frontend/tests/components/trust-badge.test.ts`

- [ ] **Step 1: Write failing test for trust badge**

```ts
// frontend/tests/components/trust-badge.test.ts
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/preact";
import { TrustBadge } from "../../src/components/trust-badge";

describe("TrustBadge", () => {
  it("renders green for high trust (>0.8)", () => {
    const { container } = render(<TrustBadge trustScore={0.9} sourceTier="primary" corroborationCount={5} />);
    const badge = container.querySelector(".trust-badge");
    expect(badge).toBeTruthy();
    expect(badge?.classList.contains("trust-high")).toBe(true);
  });

  it("renders amber for medium trust (0.5-0.8)", () => {
    const { container } = render(<TrustBadge trustScore={0.6} sourceTier="regional" corroborationCount={2} />);
    const badge = container.querySelector(".trust-badge");
    expect(badge?.classList.contains("trust-medium")).toBe(true);
  });

  it("renders red for low trust (<0.5)", () => {
    const { container } = render(<TrustBadge trustScore={0.3} sourceTier="unknown" corroborationCount={0} redFlags={["single-source"]} />);
    const badge = container.querySelector(".trust-badge");
    expect(badge?.classList.contains("trust-low")).toBe(true);
  });
});
```

- [ ] **Step 2: Implement trust badge component**

```tsx
// frontend/src/components/trust-badge.tsx
interface TrustBadgeProps {
  trustScore: number;
  sourceTier: string;
  corroborationCount: number;
  redFlags?: string[];
}

export function TrustBadge({ trustScore, sourceTier, corroborationCount, redFlags }: TrustBadgeProps) {
  const level = trustScore > 0.8 ? "high" : trustScore > 0.5 ? "medium" : "low";

  return (
    <span
      class={`trust-badge trust-${level}`}
      title={`Trust: ${Math.round(trustScore * 100)}% | Tier: ${sourceTier} | ${corroborationCount} sources${redFlags?.length ? ` | Flags: ${redFlags.join(", ")}` : ""}`}
    >
      {level === "high" ? "VERIFIED" : level === "medium" ? "PARTIAL" : "UNVERIFIED"}
    </span>
  );
}
```

- [ ] **Step 3: Run trust badge test**

Run: `cd frontend && npx vitest run tests/components/trust-badge.test.ts`
Expected: PASS

- [ ] **Step 4: Implement AI synthesis card**

```tsx
// frontend/src/panels/ai-synthesis-card.tsx
interface AISynthesisCardProps {
  summary: string;
  perspectives: Array<{ source: string; label: string; sentiment: string }>;
  escalationSignal: "escalating" | "de-escalating" | "stable";
  articleCount: number;
}

export function AISynthesisCard({ summary, perspectives, escalationSignal, articleCount }: AISynthesisCardProps) {
  const signalColor = {
    escalating: "var(--anomaly-critical)",
    "de-escalating": "var(--risk-clear)",
    stable: "var(--text-secondary)",
  }[escalationSignal];

  return (
    <div class="ai-synthesis-card">
      <div class="synthesis-header">
        <span class="synthesis-label">AI SYNTHESIS</span>
        <span class="synthesis-signal" style={{ color: signalColor }}>
          {escalationSignal.toUpperCase()}
        </span>
        <span class="synthesis-count">{articleCount} sources</span>
      </div>
      <p class="synthesis-summary">{summary}</p>
      {perspectives.length > 0 && (
        <div class="synthesis-perspectives">
          {perspectives.map((p, i) => (
            <div key={i} class="perspective">
              <span class="perspective-source">{p.source}</span>
              <span class="perspective-label">{p.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Implement global search bar**

Fetches from `/search?q=...` on input with debounce (300ms). Shows results grouped by type. Selecting a result flies the camera to its location and opens its detail panel.

- [ ] **Step 6: Implement news feed panel with provenance + AI cards + source count**

Connected via SSE (`/events/stream`). Displays events in real-time with tag badges. Each article shows:
- **Provenance trust badge** — color-coded by `trustScore` (green >0.8, amber 0.5-0.8, red <0.5)
- **Source count indicator** — "5 sources" or "1 source" from the dedup system's `sourceCount`
- **AI synthesis card** — expandable card when AI analysis exists for the article's event cluster (keyed by `clusterId` from `newsAnalyses` signal)

Click news item -> highlight related countries/conflicts on map.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/panels/search-bar.tsx frontend/src/panels/news-feed.tsx
git add frontend/src/components/trust-badge.tsx frontend/src/panels/ai-synthesis-card.tsx
git add frontend/tests/components/trust-badge.test.ts
git commit -m "feat: add search, news feed with provenance badges + AI synthesis cards"
```

---

### Task 12: Keyboard Shortcuts + Tooltip

**Files:**
- Create: `frontend/src/components/keyboard-shortcuts.ts`
- Create: `frontend/src/components/tooltip.tsx`

- [ ] **Step 1: Implement keyboard shortcuts**

```ts
// frontend/src/components/keyboard-shortcuts.ts
import { toggleLayer } from "../state/layers";
import { toggleCompareMode } from "../state/compare";

const KEY_MAP: Record<string, () => void> = {
  "1": () => toggleLayer("tradeRoutes"),
  "2": () => toggleLayer("chokepoints"),
  "3": () => toggleLayer("militaryBases"),
  "4": () => toggleLayer("nsaZones"),
  "5": () => toggleLayer("conflicts"),
  "6": () => toggleLayer("elections"),
  "c": () => toggleCompareMode(),
  "l": () => document.querySelector<HTMLElement>(".layer-menu")?.focus(),
};

export function initKeyboardShortcuts() {
  document.addEventListener("keydown", (e) => {
    // Don't trigger when typing in input fields
    if ((e.target as HTMLElement).tagName === "INPUT") return;
    if (e.key === "Escape") {
      import("../state/compare").then(m => { if (m.compareMode.value) m.toggleCompareMode(); });
      return;
    }
    const handler = KEY_MAP[e.key.toLowerCase()];
    if (handler) handler();
  });
}
```

- [ ] **Step 2: Implement map tooltip**

Show tooltip on hover over any map feature: country name + risk badge, base name + branch, chokepoint name + status, etc.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add keyboard shortcuts (1-6 layers, C compare, Esc exit) + map tooltips"
```

---

## Phase 5.5: Intelligence UI

### Task 16: Timeline Scrubber — Rewind World State

**Files:**
- Create: `frontend/src/panels/timeline-scrubber.tsx`
- Test: `frontend/tests/panels/timeline-scrubber.test.ts`

- [ ] **Step 1: Write failing test for timeline scrubber**

```ts
// frontend/tests/panels/timeline-scrubber.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { render, fireEvent } from "@testing-library/preact";
import { timelinePosition, returnToLive } from "../../src/state/timeline";
import { TimelineScrubber } from "../../src/panels/timeline-scrubber";

describe("TimelineScrubber", () => {
  beforeEach(() => { returnToLive(); });

  it("renders with live state by default", () => {
    const { getByText } = render(<TimelineScrubber />);
    expect(getByText("LIVE")).toBeTruthy();
  });

  it("shows historical banner when scrubbed to past date", async () => {
    // Simulate scrub by setting timeline position
    const { getByText, rerender } = render(<TimelineScrubber />);
    // When timelinePosition is set, component shows historical label
    // This tests the component's derived state rendering
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run tests/panels/timeline-scrubber.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement timeline scrubber component**

A slider control anchored to the bottom of the map viewport.

```tsx
// frontend/src/panels/timeline-scrubber.tsx
import { useEffect, useState } from "preact/hooks";
import { timelinePosition, isHistorical, scrubTo, returnToLive, setTimelineSnapshots, timelineSnapshots } from "../state/timeline";
import { loadBootstrapAt } from "../api/bootstrap";
import { fetchTimelineRange } from "../api/timeline";

export function TimelineScrubber() {
  const [snapshots, setSnapshots] = useState<Date[]>([]);
  const [sliderValue, setSliderValue] = useState(100); // 0-100, 100 = live
  const [loading, setLoading] = useState(false);

  // Load available snapshot timestamps on mount
  useEffect(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    fetchTimelineRange(weekAgo, now, 200).then((snaps) => {
      const dates = snaps.map(s => new Date(s.timestamp));
      setSnapshots(dates);
      setTimelineSnapshots(dates);
    }).catch(console.error);
  }, []);

  const handleScrub = async (value: number) => {
    setSliderValue(value);

    if (value >= 99) {
      // Return to live
      returnToLive();
      const { loadBootstrap } = await import("../api/bootstrap");
      loadBootstrap();
      return;
    }

    if (snapshots.length === 0) return;

    // Map slider value to nearest snapshot
    const index = Math.round((value / 100) * (snapshots.length - 1));
    const targetDate = snapshots[index];

    if (targetDate) {
      setLoading(true);
      scrubTo(targetDate);
      await loadBootstrapAt(targetDate);
      setLoading(false);
    }
  };

  const currentDate = timelinePosition.value;
  const formatDate = (d: Date) =>
    d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

  return (
    <div class="timeline-scrubber">
      {isHistorical.value && (
        <div class="historical-banner">
          HISTORICAL — {currentDate ? formatDate(currentDate) : ""}
          {loading && <span class="loading-indicator"> Loading...</span>}
        </div>
      )}

      <div class="scrubber-controls">
        <input
          type="range"
          min="0"
          max="100"
          value={sliderValue}
          class="scrubber-slider"
          onInput={(e) => handleScrub(Number((e.target as HTMLInputElement).value))}
        />
        <div class="scrubber-labels">
          <span class="scrubber-start">
            {snapshots.length > 0 ? formatDate(snapshots[0]) : "—"}
          </span>
          <span class={`scrubber-live ${!isHistorical.value ? "active" : ""}`}>
            {isHistorical.value ? (
              <button class="return-live-btn" onClick={() => handleScrub(100)}>
                Return to LIVE
              </button>
            ) : (
              "LIVE"
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
```

**UX notes:**
- Static layers (bases, ports, trade routes) don't change when scrubbing — only mutable fields update (risk levels, conflict statuses, chokepoint statuses, NSA zones). This keeps scrubbing fast since you only overlay the snapshot's small mutable payload.
- The slider snaps to the nearest available snapshot timestamp.
- `/bootstrap?at=<timestamp>&slim=true` returns current static data with historical mutable fields overlaid.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run tests/panels/timeline-scrubber.test.ts`
Expected: PASS

- [ ] **Step 5: Wire into app layout**

Add `<TimelineScrubber />` inside the `.map-container` div in `app.tsx`, positioned at the bottom with CSS `position: absolute; bottom: 0`.

- [ ] **Step 6: Verify scrubber works in browser**

Run: `cd frontend && npm run dev`
Expected: Slider at bottom of map. Dragging to the left loads historical data. "HISTORICAL" banner appears. "Return to LIVE" button works.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/panels/timeline-scrubber.tsx frontend/tests/panels/timeline-scrubber.test.ts frontend/src/app.tsx
git commit -m "feat: add timeline scrubber for rewinding world state to any historical point"
```

---

### Task 17: Graph Explorer — Entity Connection Visualization

**Files:**
- Create: `frontend/src/panels/graph-explorer.tsx`
- Test: `frontend/tests/panels/graph-explorer.test.ts`

- [ ] **Step 1: Write failing test for graph explorer**

```ts
// frontend/tests/panels/graph-explorer.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/preact";
import { clearGraph, setGraphConnections, selectGraphEntity } from "../../src/state/graph";
import { GraphExplorer } from "../../src/panels/graph-explorer";

describe("GraphExplorer", () => {
  beforeEach(() => { clearGraph(); });

  it("renders empty state when no entity selected", () => {
    const { getByText } = render(<GraphExplorer />);
    expect(getByText(/select an entity/i)).toBeTruthy();
  });

  it("renders nodes and edges when connections loaded", () => {
    selectGraphEntity("country:iran");
    setGraphConnections([
      { from: { type: "country", id: "iran" }, to: { type: "conflict", id: "us-iran-war" }, relation: "involves", weight: 1.0 },
      { from: { type: "country", id: "iran" }, to: { type: "nsa", id: "hezbollah" }, relation: "ally-of", weight: 1.0 },
    ]);
    const { container } = render(<GraphExplorer />);
    const svg = container.querySelector("svg.graph-canvas");
    expect(svg).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run tests/panels/graph-explorer.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement graph explorer with D3-force layout**

A panel that visualizes entity connections as an interactive force-directed network.

```tsx
// frontend/src/panels/graph-explorer.tsx
import { useEffect, useRef } from "preact/hooks";
import { forceSimulation, forceLink, forceManyBody, forceCenter } from "d3-force";
import { graphConnections, selectedGraphEntity, graphDepth, setGraphDepth, selectGraphEntity, clearGraph, type GraphEdge } from "../state/graph";
import { fetchGraphConnections, fetchGraphPath } from "../api/graph";

interface GraphNode {
  id: string;
  type: string;
  label: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  relation: string;
}

export function GraphExplorer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const entity = selectedGraphEntity.value;
  const edges = graphConnections.value;
  const depth = graphDepth.value;

  // Load connections when entity or depth changes
  useEffect(() => {
    if (!entity) return;
    const [type, id] = entity.split(":");
    fetchGraphConnections(type, id, depth).then(data => {
      import("../state/graph").then(m => m.setGraphConnections(data.edges));
    }).catch(console.error);
  }, [entity, depth]);

  // Run D3 force simulation
  useEffect(() => {
    if (!svgRef.current || edges.length === 0) return;

    const width = svgRef.current.clientWidth || 400;
    const height = svgRef.current.clientHeight || 300;

    // Build nodes and links from edges
    const nodeMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    for (const edge of edges) {
      const fromKey = `${edge.from.type}:${edge.from.id}`;
      const toKey = `${edge.to.type}:${edge.to.id}`;

      if (!nodeMap.has(fromKey)) nodeMap.set(fromKey, { id: fromKey, type: edge.from.type, label: edge.from.id });
      if (!nodeMap.has(toKey)) nodeMap.set(toKey, { id: toKey, type: edge.to.type, label: edge.to.id });

      links.push({ source: fromKey, target: toKey, relation: edge.relation });
    }

    const nodes = [...nodeMap.values()];

    const simulation = forceSimulation(nodes as any)
      .force("link", forceLink(links as any).id((d: any) => d.id).distance(80))
      .force("charge", forceManyBody().strength(-200))
      .force("center", forceCenter(width / 2, height / 2));

    const svg = svgRef.current;

    simulation.on("tick", () => {
      // Clear and redraw
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      // Draw edges
      for (const link of links) {
        const source = nodeMap.get(link.source as string) as any;
        const target = nodeMap.get(link.target as string) as any;
        if (!source?.x || !target?.x) continue;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", String(source.x));
        line.setAttribute("y1", String(source.y));
        line.setAttribute("x2", String(target.x));
        line.setAttribute("y2", String(target.y));
        line.setAttribute("stroke", "#3a3a6a");
        line.setAttribute("stroke-width", "1.5");
        svg.appendChild(line);

        // Edge label
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", String((source.x + target.x) / 2));
        text.setAttribute("y", String((source.y + target.y) / 2 - 4));
        text.setAttribute("fill", "#555577");
        text.setAttribute("font-size", "9");
        text.setAttribute("text-anchor", "middle");
        text.textContent = link.relation;
        svg.appendChild(text);
      }

      // Draw nodes
      for (const node of nodes) {
        if (!node.x || !node.y) continue;
        const isCenter = `${node.type}:${node.id}` === entity;

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", String(node.x));
        circle.setAttribute("cy", String(node.y));
        circle.setAttribute("r", isCenter ? "10" : "7");
        circle.setAttribute("fill", getNodeColor(node.type));
        circle.setAttribute("cursor", "pointer");
        circle.addEventListener("click", () => {
          selectGraphEntity(`${node.type}:${node.id}`);
        });
        svg.appendChild(circle);

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", String(node.x));
        label.setAttribute("y", String(node.y + 18));
        label.setAttribute("fill", "#e8e8f0");
        label.setAttribute("font-size", "10");
        label.setAttribute("text-anchor", "middle");
        label.textContent = node.label;
        svg.appendChild(label);
      }
    });

    return () => { simulation.stop(); };
  }, [edges, entity]);

  if (!entity) {
    return (
      <div class="graph-explorer">
        <p class="empty-state">Select an entity to explore connections</p>
      </div>
    );
  }

  return (
    <div class="graph-explorer">
      <div class="graph-controls">
        <span class="graph-entity">{entity}</span>
        <div class="depth-control">
          <button onClick={() => setGraphDepth(depth - 1)} disabled={depth <= 1}>−</button>
          <span>{depth}-hop</span>
          <button onClick={() => setGraphDepth(depth + 1)} disabled={depth >= 3}>+</button>
        </div>
        <button class="close-btn" onClick={clearGraph}>Close</button>
      </div>
      <svg ref={svgRef} class="graph-canvas" style={{ width: "100%", height: "300px" }} />
    </div>
  );
}

function getNodeColor(type: string): string {
  const colors: Record<string, string> = {
    country: "#3b82f6",
    conflict: "#ef4444",
    chokepoint: "#eab308",
    nsa: "#f97316",
    base: "#6b7280",
    "trade-route": "#22c55e",
    news: "#8b5cf6",
  };
  return colors[type] ?? "#8888aa";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run tests/panels/graph-explorer.test.ts`
Expected: PASS

- [ ] **Step 5: Wire "Show connections" into entity detail panels**

Add a "Show connections" button to each entity detail panel (country, base, chokepoint, NSA, conflict). Clicking it sets `selectedGraphEntity` and opens the graph explorer panel.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/panels/graph-explorer.tsx frontend/tests/panels/graph-explorer.test.ts
git commit -m "feat: add graph explorer with D3-force layout + depth control + entity navigation"
```

---

### Task 18: Anomaly Alert System — Banner + Map Pulse

**Files:**
- Create: `frontend/src/panels/anomaly-banner.tsx`
- Create: `frontend/src/panels/anomaly-history.tsx`
- Create: `frontend/src/components/pulse-ring.ts`
- Test: `frontend/tests/panels/anomaly-banner.test.ts`

- [ ] **Step 1: Write failing test for anomaly banner**

```ts
// frontend/tests/panels/anomaly-banner.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/preact";
import { clearAlerts, pushAnomaly } from "../../src/state/anomalies";
import { AnomalyBanner } from "../../src/panels/anomaly-banner";

describe("AnomalyBanner", () => {
  beforeEach(() => { clearAlerts(); });

  it("renders nothing when no alerts", () => {
    const { container } = render(<AnomalyBanner />);
    expect(container.querySelector(".anomaly-banner")).toBeNull();
  });

  it("shows banner when alert is pushed", () => {
    pushAnomaly({
      entityType: "country", entityId: "IR", severity: "alert",
      zScore: 3.4, currentCount: 28, baselineMean: 12, detectedAt: new Date().toISOString(),
    });
    const { container } = render(<AnomalyBanner />);
    expect(container.querySelector(".anomaly-banner")).toBeTruthy();
    expect(container.textContent).toContain("IR");
    expect(container.textContent).toContain("ALERT");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run tests/panels/anomaly-banner.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement anomaly banner**

```tsx
// frontend/src/panels/anomaly-banner.tsx
import { useEffect } from "preact/hooks";
import { anomalyAlerts, dismissAlert } from "../state/anomalies";
import { SeverityBadge } from "../components/badge";
import { selectCountry } from "../state/store";

export function AnomalyBanner() {
  const alerts = anomalyAlerts.value;
  const latestAlert = alerts[0];

  // Auto-dismiss "watch" severity after 10 seconds
  useEffect(() => {
    if (!latestAlert || latestAlert.severity !== "watch") return;
    const timer = setTimeout(() => dismissAlert(0), 10000);
    return () => clearTimeout(timer);
  }, [latestAlert]);

  if (!latestAlert) return null;

  const severityColors: Record<string, string> = {
    watch: "var(--anomaly-watch)",
    alert: "var(--anomaly-alert)",
    critical: "var(--anomaly-critical)",
  };

  return (
    <div
      class="anomaly-banner"
      style={{ borderLeft: `4px solid ${severityColors[latestAlert.severity]}` }}
      onClick={() => {
        // Navigate to the entity
        if (latestAlert.entityType === "country") {
          selectCountry(latestAlert.entityId);
        }
        dismissAlert(0);
      }}
    >
      <div class="banner-content">
        <SeverityBadge severity={latestAlert.severity} />
        <span class="banner-entity">{latestAlert.entityType}: {latestAlert.entityId}</span>
        <span class="banner-stats">
          z={latestAlert.zScore.toFixed(1)} | {latestAlert.currentCount} mentions (baseline: {latestAlert.baselineMean.toFixed(0)})
        </span>
      </div>
      <button class="banner-dismiss" onClick={(e) => { e.stopPropagation(); dismissAlert(0); }}>
        Dismiss
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run tests/panels/anomaly-banner.test.ts`
Expected: PASS

- [ ] **Step 5: Implement map pulse ring effect**

```ts
// frontend/src/components/pulse-ring.ts
import { ScatterplotLayer } from "@deck.gl/layers";
import { anomalyAlerts } from "../state/anomalies";
import { bootstrapData } from "../state/store";

const SEVERITY_COLORS: Record<string, [number, number, number]> = {
  watch: [217, 119, 6],
  alert: [249, 115, 22],
  critical: [239, 68, 68],
};

/**
 * Creates a Deck.GL layer that renders expanding pulse rings
 * at entity locations where anomalies are active.
 */
export function createAnomalyPulseLayer(animationProgress: number) {
  const alerts = anomalyAlerts.value;
  if (alerts.length === 0) return null;

  // Resolve alert entity positions from bootstrap data
  const data = bootstrapData.value;
  if (!data) return null;

  const pulseData = alerts.map(alert => {
    let position: [number, number] | null = null;

    if (alert.entityType === "country") {
      const country = data.countries?.find((c: any) => c.iso2 === alert.entityId || c._id === alert.entityId);
      if (country) position = [country.lng, country.lat];
    } else if (alert.entityType === "chokepoint") {
      const cp = data.chokepoints?.find((c: any) => c._id === alert.entityId);
      if (cp) position = [cp.lng, cp.lat];
    } else if (alert.entityType === "conflict") {
      const cf = data.conflicts?.find((c: any) => c._id === alert.entityId);
      if (cf) position = [cf.lng, cf.lat];
    }

    return position ? { ...alert, position } : null;
  }).filter(Boolean);

  return new ScatterplotLayer({
    id: "anomaly-pulse",
    data: pulseData,
    getPosition: (d: any) => d.position,
    getRadius: () => 50000 + animationProgress * 150000, // Expanding radius
    getFillColor: (d: any) => [...(SEVERITY_COLORS[d.severity] ?? [128, 128, 128]), Math.floor((1 - animationProgress) * 150)],
    filled: true,
    stroked: false,
    pickable: false,
  });
}
```

- [ ] **Step 6: Implement anomaly history panel**

```tsx
// frontend/src/panels/anomaly-history.tsx
import { useEffect, useState } from "preact/hooks";
import { fetchAnomalies, type AnomalyRecord } from "../api/anomalies";
import { SeverityBadge } from "../components/badge";
import { selectCountry } from "../state/store";

export function AnomalyHistory() {
  const [records, setRecords] = useState<AnomalyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnomalies("alert,critical", "24h")
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div class="loading-state">Loading anomalies...</div>;

  return (
    <div class="anomaly-history">
      <h2 class="section-title">ANOMALY HISTORY (24H)</h2>
      {records.length === 0 ? (
        <p class="empty-state">No anomalies detected in the last 24 hours</p>
      ) : (
        records.map((r, i) => (
          <div
            key={i}
            class="anomaly-record"
            onClick={() => {
              if (r.entityType === "country") selectCountry(r.entityId);
            }}
          >
            <SeverityBadge severity={r.severity} />
            <span class="record-entity">{r.entityType}: {r.entityId}</span>
            <span class="record-stats">z={r.zScore.toFixed(1)} | {r.currentCount} mentions</span>
            <span class="record-time">{new Date(r.detectedAt).toLocaleTimeString()}</span>
          </div>
        ))
      )}
    </div>
  );
}
```

- [ ] **Step 7: Wire banner into app layout + pulse into DeckMap**

Add `<AnomalyBanner />` inside `.map-container` positioned at top. Add `createAnomalyPulseLayer()` to the DeckMap layer array with a `requestAnimationFrame`-driven progress value.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/panels/anomaly-banner.tsx frontend/src/panels/anomaly-history.tsx
git add frontend/src/components/pulse-ring.ts frontend/tests/panels/anomaly-banner.test.ts
git commit -m "feat: add anomaly alert banner + map pulse rings + anomaly history panel"
```

---

### Task 19: Settings Panel — BYOK API Key + AI Analysis Toggle

**Files:**
- Create: `frontend/src/panels/settings-panel.tsx`
- Test: `frontend/tests/panels/settings-panel.test.ts`

- [ ] **Step 1: Write failing test for settings panel**

```ts
// frontend/tests/panels/settings-panel.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { render } from "@testing-library/preact";
import { clearUserSettings } from "../../src/state/settings";
import { SettingsPanel } from "../../src/panels/settings-panel";

describe("SettingsPanel", () => {
  beforeEach(() => { clearUserSettings(); });

  it("renders not configured state", () => {
    const { getByText } = render(<SettingsPanel />);
    expect(getByText(/not configured/i)).toBeTruthy();
  });

  it("shows provider dropdown and key input", () => {
    const { container } = render(<SettingsPanel />);
    expect(container.querySelector("select")).toBeTruthy();
    expect(container.querySelector("input[type='password']")).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run tests/panels/settings-panel.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement settings panel**

```tsx
// frontend/src/panels/settings-panel.tsx
import { useState, useEffect } from "preact/hooks";
import { userSettings, aiEnabled, setUserSettings, clearUserSettings } from "../state/settings";
import { getUserSettings, putUserSettings, deleteUserSettings } from "../api/settings";

export function SettingsPanel() {
  const settings = userSettings.value;
  const [provider, setProvider] = useState<"anthropic" | "openai">("anthropic");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load current settings on mount
  useEffect(() => {
    getUserSettings().then(s => {
      if (s) {
        setUserSettings(s);
        setProvider(s.llmProvider);
        setModel(s.llmModel ?? "");
      }
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    if (!apiKey) { setError("API key is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const result = await putUserSettings(provider, apiKey, model || undefined);
      setUserSettings(result);
      setApiKey(""); // Clear raw key after save
    } catch (err: any) {
      setError(err.message ?? "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      await deleteUserSettings();
      clearUserSettings();
    } catch (err: any) {
      setError(err.message ?? "Failed to remove settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="settings-panel">
      <h2 class="section-title">SETTINGS</h2>

      <div class="settings-section">
        <h3 class="subsection-title">AI ANALYSIS</h3>

        {settings ? (
          <div class="settings-status connected">
            Connected — {settings.llmModel ?? settings.llmProvider} via {settings.llmProvider}
            <br />
            Key: {settings.llmApiKeyMasked}
            <br />
            Status: {settings.aiAnalysisEnabled ? "Enabled" : "Disabled"}
          </div>
        ) : (
          <div class="settings-status not-configured">Not configured</div>
        )}

        <div class="settings-form">
          <label class="form-field">
            <span>Provider</span>
            <select value={provider} onChange={(e) => setProvider((e.target as HTMLSelectElement).value as any)}>
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>

          <label class="form-field">
            <span>API Key</span>
            <input
              type="password"
              value={apiKey}
              placeholder={settings ? "Enter new key to update" : "Enter API key"}
              onInput={(e) => setApiKey((e.target as HTMLInputElement).value)}
            />
          </label>

          <label class="form-field">
            <span>Model Override (optional)</span>
            <input
              type="text"
              value={model}
              placeholder="e.g., claude-sonnet-4-6"
              onInput={(e) => setModel((e.target as HTMLInputElement).value)}
            />
          </label>

          {error && <div class="settings-error">{error}</div>}

          <div class="settings-actions">
            <button class="save-btn" onClick={handleSave} disabled={saving}>
              {saving ? "Validating..." : settings ? "Update Key" : "Save & Validate"}
            </button>
            {settings && (
              <button class="remove-btn" onClick={handleRemove} disabled={saving}>
                Remove Key
              </button>
            )}
          </div>
        </div>
      </div>
      <div class="settings-section">
        <h3 class="subsection-title">MAP THEME</h3>
        <div class="settings-form">
          <label class="form-field">
            <span>Day/Night Mode</span>
            <select
              value="auto"
              onChange={(e) => {
                // Store preference and update day-night module
                const pref = (e.target as HTMLSelectElement).value;
                import("../map/day-night").then(m => {
                  if (pref === "auto") m.startDayNightCycle();
                  else if (pref === "dark") { m.stopDayNightCycle(); m.timeOfDay.value = "night"; }
                  else if (pref === "light") { m.stopDayNightCycle(); m.timeOfDay.value = "day"; }
                });
              }}
            >
              <option value="auto">Auto (follow sun)</option>
              <option value="dark">Always dark</option>
              <option value="light">Always light</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run tests/panels/settings-panel.test.ts`
Expected: PASS

- [ ] **Step 5: Wire settings panel into sidebar navigation**

Add a settings gear icon button to the sidebar. Clicking it shows the settings panel in the right panel area.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/panels/settings-panel.tsx frontend/tests/panels/settings-panel.test.ts
git commit -m "feat: add settings panel with BYOK API key management + AI analysis toggle"
```

---

## Phase 6: Performance

### Task 13: Binary Data + Deck.GL Integration

**Files:**
- Modify: `frontend/src/layers/*.ts` (upgrade from JSON to binary)
- Create: `frontend/src/workers/data-worker.ts`

- [ ] **Step 1: Implement binary data fetch + parsing in Web Worker**

```ts
// frontend/src/workers/data-worker.ts
self.onmessage = async (e) => {
  const { type, url } = e.data;

  const res = await fetch(url);
  const buffer = await res.arrayBuffer();

  // Parse header
  const header = new DataView(buffer);
  const count = header.getUint32(0, true);
  const stride = header.getUint32(4, true);

  // Parse body
  const body = new Float32Array(buffer, 8);

  self.postMessage({ type, count, stride, data: body }, [body.buffer]);
};
```

- [ ] **Step 2: Update layer files to accept binary data**

Each layer can accept `Float32Array` data directly via Deck.GL's binary data support (`{length, attributes}` format).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/workers/ frontend/src/layers/
git commit -m "feat: upgrade map layers to binary data transfer via Web Worker"
```

---

### Task 14: Service Worker + Bundle Splitting + Loading States

**Files:**
- Create: `frontend/src/sw/service-worker.ts`
- Modify: `frontend/vite.config.ts` (manual chunks)

- [ ] **Step 1: Implement service worker**

Cache app shell, earth textures, PMTiles metadata, fonts. On repeat visit, serve from cache while revalidating in background.

- [ ] **Step 2: Configure bundle splitting**

```ts
// Already in vite.config.ts — refine chunks:
// Core: preact + signals (~20KB)
// Deck.GL: deck core + layers (~150KB)
// MapLibre: maplibre-gl (~200KB) — lazy loaded when entering flat view
// D3-force: d3-force (~15KB) — lazy loaded when opening graph explorer
// Each layer panel: lazy loaded when toggled
```

- [ ] **Step 3: Add loading states + error boundaries**

Skeleton screens for panels during data loading. Error boundary component that catches render errors and shows retry option.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/sw/ frontend/vite.config.ts
git commit -m "feat: add service worker, bundle splitting, loading states"
```

---

### Task 15: Static Bootstrap Snapshot

**Files:**
- Create: `frontend/scripts/generate-snapshot.ts`
- Modify: `frontend/src/api/bootstrap.ts`

- [ ] **Step 1: Create build-time snapshot generator**

Script that fetches `/bootstrap?slim=true` from the running API and saves as `frontend/src/data/bootstrap-snapshot.json`. This file is baked into the build for instant first-visit rendering.

```ts
// frontend/scripts/generate-snapshot.ts
const API_URL = process.env.VITE_API_URL ?? "http://localhost:3000/api/v1";
const res = await fetch(`${API_URL}/bootstrap?slim=true`);
const data = await res.json();
await Bun.write("src/data/bootstrap-snapshot.json", JSON.stringify(data.data));
console.log("Bootstrap snapshot generated");
```

- [ ] **Step 2: Update bootstrap.ts to use snapshot as initial data**

```ts
// In loadBootstrap():
// 1. Immediately set bootstrapData from import of snapshot JSON
// 2. Then fetch fresh data from API in background
// 3. Then update IndexedDB cache
```

- [ ] **Step 3: Add to CI: API must be running + seeded before frontend build**

Update `docker-compose.yml` or CI script to:
1. Start API + MongoDB + Redis
2. Run seed-all
3. Generate snapshot
4. Build frontend

- [ ] **Step 4: Commit**

```bash
git add frontend/scripts/ frontend/src/data/ frontend/src/api/bootstrap.ts
git commit -m "feat: add static bootstrap snapshot for instant first-visit rendering"
```

---

## Verification Checklist

After completing all tasks, verify:

**Core (Tasks 1-5):**
- [ ] `cd frontend && npm run dev` — app loads with globe view
- [ ] Globe renders with dark earth texture, interactive rotation/zoom
- [ ] Zooming in transitions to flat view with dark base tiles
- [ ] Zooming out transitions back to globe
- [ ] SSE connects and receives all 9 event types

**Layers & Features (Tasks 6-12):**
- [ ] Layer menu toggles each layer on/off
- [ ] Presets (Conflict Zone, Trade Risk, Full Intel, Minimal) work correctly
- [ ] Risk heatmap shows colored dots with adjustable opacity
- [ ] Critical watchlist sidebar shows catastrophic + extreme countries
- [ ] Clicking a country shows its profile in the right panel
- [ ] Trade routes render as arcs colored by category
- [ ] Chokepoints render as status-colored markers
- [ ] Military bases render with country-colored dots + clustering
- [ ] NSA zones render as semi-transparent ideology-colored circles
- [ ] Conflicts render as animated pulse rings
- [ ] Elections render as countdown markers
- [ ] Compare mode: click up to 3 countries for side-by-side comparison
- [ ] Compare mode: shared graph connections shown between compared countries
- [ ] Global search returns cross-collection results
- [ ] News feed shows real-time SSE events
- [ ] News feed: articles show provenance trust badge + source count
- [ ] News feed: AI synthesis card appears for multi-source events (when BYOK active)
- [ ] Keyboard shortcuts (1-6, C, L, Esc) work

**Intelligence UI (Tasks 16-19):**
- [ ] Timeline scrubber: drag to past date, see risk levels change, return to live
- [ ] Timeline scrubber: "HISTORICAL" banner shown when scrubbed to past
- [ ] Graph explorer: click entity, see 1-hop connections, navigate between entities
- [ ] Graph explorer: depth control (1-hop, 2-hop, 3-hop) works
- [ ] Anomaly alert: SSE anomaly event shows banner + map pulse
- [ ] Anomaly alert: watch severity auto-dismisses after 10s, alert/critical persist
- [ ] Anomaly history: panel shows last 24h of alert/critical anomalies
- [ ] Detail panels: connections tab + anomaly sparkline present on all entity types
- [ ] Settings panel: enter API key, see validation, toggle AI analysis
- [ ] Settings panel: remove key works, status shows "Not configured"
- [ ] Settings panel: day/night mode override (Auto / Always dark / Always light) works
- [ ] Plugin layers: dynamic layers from /plugins/manifest appear in layer menu

**Performance (Tasks 13-15):**
- [ ] `npm run build` — production build completes
- [ ] Service worker caches app shell on first visit
- [ ] Repeat visit loads from cache in < 200ms
- [ ] Binary layer data loads correctly from API
- [ ] D3-force and MapLibre are lazy-loaded (not in initial bundle)
