# GAMBIT Frontend — Antigravity Agent Dispatch

> **5 parallel agents.** Foundation already scaffolded in `frontend/`. Each agent owns specific files and must not modify files outside their ownership. Shared files (`app.tsx`, `store.ts`, `variables.css`, `app.css`) are READ-ONLY — agents import from them but coordinate edits through the orchestrator.

---

## Pre-flight: Stitch Design Context

**ALL agents** must fetch relevant Stitch screens before writing component code.

**Stitch Project:** Geopolitiq Intelligence Dashboard Light Mode
**Project ID:** `6268829174203934199`

### Screen Reference Table

| # | Screen | Stitch ID | Used By |
|---|--------|-----------|---------|
| 1 | Dashboard (main light mode) | `0cd28a6bcf124eb1b89ab0b21462111f` | All agents |
| 2 | Conflict Zone Detail | `5532d186e1bf4692bb145e8f749b2e41` | Agent 1, Agent 2 |
| 3 | Suez Canal / Chokepoint Detail | `1e530f49a3b14cf69d1df85876c752f8` | Agent 1, Agent 2 |
| 4 | Economic Impact + AI Briefing | `660c2480088541e080de978498d55687` | Agent 2, Agent 4 |
| 5 | Market Overlay + Macro Correlation | `9a78d679aa1a4d4e943be2c8c5967b17` | Agent 2, Agent 3 |
| 6 | Graph Explorer + Network View | `c93661858f0e497a878efd333757e857` | Agent 3 |
| 7 | News Feed + AI Synthesis | `08ceccfdbac34143a48a6958caabb069` | Agent 4 |

### How to fetch a screen:
```
Get the images and code for the following Stitch project's screens:

## Project
Title: Geopolitiq Intelligence Dashboard Light Mode
ID: 6268829174203934199

## Screens:
1. <Screen Name>
    ID: <Screen ID from table above>

Use a utility like `curl -L` to download the hosted URLs.
```

Extract colors, spacing, component patterns from the Stitch output. Cross-reference with `frontend/src/styles/variables.css` which has the dual-theme token system already defined. **Always use CSS variables from `variables.css`** — never hardcode colors.

---

## Shared Context (all agents read these)

### Tech Stack
- **Framework:** Preact 10.x (`h` and `@preact/signals`)
- **Build:** Vite 5.x with `@preact/preset-vite`
- **Map:** Deck.GL 9.x (GlobeView + MapView)
- **Base map:** MapLibre GL JS 4.x + PMTiles
- **State:** Preact Signals (`@preact/signals`) — all in `state/store.ts`
- **Styling:** CSS with custom properties from `styles/variables.css`
- **Fonts:** Inter (sans) + JetBrains Mono (data values)

### API Base
`/api/v1` (proxied by Vite to `http://localhost:3000`)

### Response Envelope
All JSON: `{ data: T, meta: { total?, limit?, offset?, cached?, freshness? } }`

### Key Types (from `state/store.ts`)
```ts
type RiskLevel = 'catastrophic' | 'extreme' | 'severe' | 'stormy' | 'cloudy' | 'clear';
type ViewMode = 'globe' | 'flat';
type Theme = 'dark' | 'light';
```

### Binary Layer Format
8-byte header (uint32 count + uint32 stride) + Float32Array body.
Parse with `parseBinaryLayer()` from `api/client.ts`.

### SSE Events (9 types, handled in `api/sse.ts`)
`news`, `news-enriched`, `news-analysis`, `risk-change`, `conflict-update`, `anomaly`, `snapshot`, `plugin-poll`, `plugin-data`

---

## Agent 1 — Globe + Map + Layers

**Model:** Claude Opus
**Workspace:** `frontend/src/map/` + `frontend/src/layers/`
**Tasks:** T3, T4, T6, T8, T13
**Stitch screens to fetch:** #1 (Dashboard), #2 (Conflict Zone), #3 (Chokepoint Detail)

### Files to create:

```
src/map/
  deck-map.tsx          # Deck.GL canvas wrapper
  globe-view.ts         # GlobeView config + dark earth texture
  flat-view.ts          # MapView + MapLibre + PMTiles dark tiles
  view-transition.ts    # Globe ↔ flat crossfade at zoom threshold
  pmtiles-source.ts     # PMTiles protocol registration for MapLibre
  day-night.ts          # Solar elevation calc + CSS variable switching

src/layers/
  risk-heatmap.ts       # Country risk coloring (globe: ScatterplotLayer, flat: polygon fill)
  trade-routes.ts       # ArcLayer colored by category
  chokepoints.ts        # ScatterplotLayer + TextLayer, colored by status
  military-bases.ts     # ScatterplotLayer with country colors + clustering
  nsa-zones.ts          # Semi-transparent circles colored by ideology
  conflicts.ts          # Animated pulse rings, size by dayCount
  elections.ts          # Markers with countdown badges

src/workers/
  data-worker.ts        # Web Worker for binary ArrayBuffer parsing
```

### Requirements:

**T3 — Deck.GL Globe:**
- `deck-map.tsx`: Wrap `@deck.gl/core` `Deck` component with `GlobeView`
- Dark earth texture from `public/textures/earth-dark.jpg` (reuse existing `earth-blue-marble.jpg` from legacy `public/textures/`)
- Interactive rotation/zoom. Auto-rotate when idle (resume after 4s like existing Globe.tsx)
- Starfield background (port from existing `Globe.tsx` createStarfield)
- Atmosphere glow ring
- Emit `onCountryClick` callback → calls `selectCountry()` from store

**T4 — Flat View + PMTiles:**
- MapLibre GL JS with dark vector tiles
- PMTiles protocol for offline/self-hosted tiles
- Country polygon fill from GeoJSON (for risk heatmap)
- View toggle: when zoom > threshold (~5), transition from globe to flat
- `view-transition.ts`: smooth crossfade between Deck.GL GlobeView and MapView

**T6 — Risk Heatmap:**
- Globe mode: ScatterplotLayer at country lat/lng centers, colored by risk level
- Flat mode: `setFeatureState()` on MapLibre polygon fill
- Colors from `--risk-catastrophic` through `--risk-clear` CSS variables
- Read `layers.riskHeatmap` signal for toggle
- Opacity slider: range input (0-100%) that controls the heatmap layer opacity. Expose via a signal or prop so the sidebar can render the slider.

**T8 — Six Data Layers:**
Each layer reads its toggle from `layers` signal in store.
- Trade routes: `ArcLayer` with `getSourcePosition`/`getTargetPosition`, colored by category
- Chokepoints: `ScatterplotLayer` + `TextLayer`, colored by status (open=green, contested=amber, blocked=red)
- Military bases: `ScatterplotLayer` with clustering at low zoom
- NSA zones: `ScatterplotLayer` with large radius, semi-transparent, colored by ideology
- Conflicts: Custom animated layer with expanding rings, size by `dayCount`
- Elections: `ScatterplotLayer` with text overlay showing countdown days

**T13 — Binary Data Worker:**
- `data-worker.ts`: receives ArrayBuffer, returns parsed Float32Array + metadata
- Each layer should accept binary data directly via Deck.GL binary data support
- Use `parseBinaryLayer()` from `api/client.ts` as reference

**T5 (partial) — Day/Night Cycle:**
- `day-night.ts`: calculate solar elevation for a given lat/lng + current time
- Switch CSS custom properties (subtle ambient shift) based on whether the user's viewport center is in day or night
- Does NOT change the theme (dark/light) — only subtly adjusts map tint and atmosphere glow
- Export `getDayNightState(lat, lng): 'day' | 'twilight' | 'night'`

### Imports from shared files:
```ts
import { viewMode, layers, bootstrapData, selectedCountry, selectCountry } from '@/state/store';
import { api, parseBinaryLayer } from '@/api/client';
```

### Export pattern:
Each layer file exports a function: `createXxxLayer(data, visible): Layer`
`deck-map.tsx` exports `<DeckMap />` component that composes all layers.

---

## Agent 2 — Sidebar + Panels

**Model:** Claude Opus
**Workspace:** `frontend/src/panels/` + `frontend/src/components/`
**Tasks:** T7, T9, T10, T11, T12
**Stitch screens to fetch:** #1 (Dashboard), #2 (Conflict Zone), #3 (Chokepoint Detail), #4 (Economic Impact)

### Files to create:

```
src/panels/
  sidebar.tsx              # Left sidebar: logo, search, watchlist, layer menu, stats
  layer-menu.tsx           # Toggle switches + presets + dynamic plugin layers
  right-panel.tsx          # Entity detail container with tabs
  trade-routes-panel.tsx
  chokepoints-panel.tsx
  bases-panel.tsx
  nsa-panel.tsx
  conflicts-panel.tsx
  elections-panel.tsx
  compare-panel.tsx        # Side-by-side 2-3 countries + shared graph connections
  search-bar.tsx           # Global search with debounced results dropdown

src/components/
  badge.tsx                # Risk/status badge component
  tooltip.tsx              # Map hover tooltip
  sparkline.tsx            # Tiny 7-day inline chart (SVG)
  trust-badge.tsx          # Provenance trust indicator
  keyboard-shortcuts.ts   # Keyboard handler
```

### Requirements:

**T7 — Sidebar + Layer Menu:**
- Sidebar width: `var(--sidebar-width)` (260px)
- Header: GAMBIT logo + version
- Search box: glass-morphism input, `⌘K` shortcut hint
- Critical watchlist: countries where risk is catastrophic or extreme
  - Each item: flag emoji, country name (truncated), risk badge
  - **Anomaly badge**: if the country has a recent anomaly in `anomalyAlerts`, show a small pulsing dot or count badge next to the risk badge (severity-colored: amber/orange/red)
  - Click → `selectCountry()`
  - Selected state: accent border-left (match Stitch: Ukraine row with blue left border)
- Layer menu: 3 groups (Security, Economic, Political)
  - Each row: colored icon, layer name, toggle switch
  - Toggle calls `toggleLayer()` from store
- Presets: pills above map — "Full intel", "Conflict zone", "Trade risk", "Minimal"
- Plugin layers: fetch from `/plugins/manifest`, append to their `panel.group`
- Bottom stats bar: critical count, high risk count, stable count, total
- Risk levels legend (match Stitch: colored dots + labels + counts)

**T9 — Detail Panels:**
- `right-panel.tsx`: container with tabs (Overview, Connections, Analysis)
- Overview tab: entity header (flag + name + region + risk badge), stat grid (4 cards), sparkline
- Connections tab: fetch `/graph/connections?entity=<type:id>&depth=1`, show as clickable chips
- Analysis tab: AI synthesis when BYOK enabled
- Conflict Zone Detail: match Stitch screen #2 — local map view, key actors grid, risk trend chart, intel briefing bullets
- Chokepoint Detail: match Stitch screen #3 — transit status bar, affected assets table, economic impact stats, alternative routes toggle

**T10 — Compare Mode:**
- Up to 3 countries side-by-side
- Stat comparison grid
- Shared graph connections: fetch for each, compute intersection

**T11 — Search:**
- Debounced input (300ms) calling `/search?q=`
- Dropdown results grouped by type
- Select result → navigate to entity + fly camera

**T12 — Keyboard Shortcuts:**
- `1-6`: toggle layers, `C`: compare, `L`: layer menu, `T`: timeline, `G`: graph, `Esc`: close

### Design notes:
- All panels use `panel-glass` class for glass-morphism
- Risk badges: use `.risk-catastrophic` through `.risk-clear` from `app.css`
- Toggle switches: use `.toggle` / `.toggle--on` / `.toggle__thumb` from `app.css`
- News cards from Stitch: white bg cards with colored left border (4px border-l)
- Trust badges: "Verified by 12 sources" green pill, "OSINT & Satellite" badge (from Stitch screen #7)

---

## Agent 3 — Timeline + Graph Explorer

**Model:** Claude Opus
**Workspace:** `frontend/src/panels/timeline-scrubber.tsx` + `frontend/src/panels/graph-explorer.tsx`
**Tasks:** T16, T17
**Stitch screens to fetch:** #1 (Dashboard — for timeline bar), #5 (Market Overlay — for event timeline), #6 (Graph Explorer)

### Files to create:

```
src/panels/
  timeline-scrubber.tsx    # Bottom horizontal slider for time travel
  graph-explorer.tsx       # D3-force entity network visualization
```

### Requirements:

**T16 — Timeline Scrubber:**
- Horizontal slider in `timeline-bar` grid area
- Left end = oldest snapshot, right end = "LIVE" (now)
- On drag:
  1. Fetch `/timeline/range?from=...&to=...` for available timestamps
  2. Snap to nearest snapshot
  3. Fetch `/bootstrap?at=<timestamp>&slim=true` for historical state
  4. Update `bootstrapData` signal
  5. Set `timelinePosition` signal
- Show "HISTORICAL — Mar 15, 2026 14:00 UTC" banner when `isHistorical` is true
- "Return to live" button resets
- Match Stitch Dashboard: date labels (Tue Mar 17, Wed Mar 18...), time ticks, play button, backdrop-blur panel
- Match Stitch Market Overlay (#5): event node markers along timeline with labels
- Progress track: gradient from `--accent-blue` to `--accent-cyan`
- Thumb: `--accent-cyan` circle with glow shadow

**T17 — Graph Explorer:**
- D3-force network visualization in a panel
- Match Stitch screen #6: force-directed node graph
- Fetch `/graph/connections?entity=<type:id>&depth=1`
- Node colors: blue=country, red=conflict, amber=chokepoint, purple=NSA, green=trade
- Edges: thin lines, thickness by weight, labeled by relation
- Clickable nodes → navigate to entity + fly camera
- Depth control: +/− buttons for 1-3 hops
- Path mode: `/graph/path?from=...&to=...` highlights shortest path in cyan
- SVG rendering (need clickable nodes)

### Imports:
```ts
import { timelinePosition, isHistorical, bootstrapData, bootstrapLoading,
         selectedEntity, graphConnections, selectCountry } from '@/state/store';
import { api } from '@/api/client';
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force';
```

---

## Agent 4 — News Feed + Anomalies

**Model:** Claude Sonnet
**Workspace:** `frontend/src/panels/news-feed.tsx` + `frontend/src/panels/anomaly-*`
**Tasks:** T5, T11 (news UI), T18
**Stitch screens to fetch:** #1 (Dashboard — for feed layout), #4 (Economic + AI Briefing), #7 (News Feed + AI Synthesis)

### Files to create:

```
src/panels/
  news-feed.tsx            # Real-time news feed with provenance badges + AI cards
  ai-synthesis-card.tsx    # AI summary card with BLUF + escalation signal
  anomaly-banner.tsx       # Top notification bar
  anomaly-history.tsx      # Alert history list

src/components/
  pulse-ring.ts            # Map anomaly animation
```

### Requirements:

**News Feed:**
- Match Stitch screen #7 closely: AI Synthesis card at top with BLUF, escalation signal score (circular gauge), provenance trust badges per article
- Panel header: "INTELLIGENCE FEED" + pulsing "LIVE" dot
- Cards from `latestEvents` signal (populated by SSE via `api/sse.ts`)
- Each card:
  - Colored left border (4px): red=breaking, orange=alert, blue=conflict, teal=world
  - Category labels: "BREAKING | CONFLICT"
  - Bold headline, summary, timestamp
  - Provenance trust badges: "Verified by 12 sources" green pill, source type badges ("OSINT & Satellite")
  - Source count
- AI Synthesis card (from `newsAnalyses` signal):
  - "AI Synthesis | DM Sans" header
  - "BLUF (Bottom Line Up Front)" section with strategic summary
  - Escalation Signal gauge (circular, colored by severity)
  - Match Stitch screen #7 layout exactly

**AI Briefing (from Stitch screen #4):**
- "AI Intelligence Briefing" panel variant
- BLUF strategic takeaway
- Impact Assessment section
- Risk Vector section with data points
- Actionable Outlook section
- "Generated by AI" badge

**Anomaly Banner (T18):**
- Slides in from top on SSE `anomaly` event
- Entity name, severity badge (watch=amber, alert=orange, critical=red), z-score vs baseline
- Auto-dismiss: 10s for watch, persist for alert/critical
- Click → navigate to entity

**Pulse Ring:**
- CSS animation for map markers on anomaly events
- Expanding circle with severity color

### Imports:
```ts
import { latestEvents, newsAnalyses, anomalyAlerts, dismissAnomaly,
         selectedEntity, userSettings } from '@/state/store';
```

---

## Agent 5 — Settings + Performance + Bootstrap

**Model:** Claude Sonnet
**Workspace:** `frontend/src/api/` + `frontend/src/state/` + `frontend/src/panels/settings-panel.tsx` + `frontend/src/sw/`
**Tasks:** T2, T19, T14, T15
**Stitch screens to fetch:** #1 (Dashboard — for general styling reference)

### Files to create:

```
src/api/
  bootstrap.ts            # Bootstrap fetch + IndexedDB cache + ?at= support
  timeline.ts             # fetchTimeline(), fetchBootstrapAt()
  graph.ts                # fetchConnections(), fetchPath()
  anomalies.ts            # fetchAnomalies(), fetchBaseline()
  plugins.ts              # fetchPluginManifests()
  settings.ts             # getSettings(), putSettings(), deleteSettings()

src/state/
  layers.ts               # Layer toggle + preset helpers
  compare.ts              # Compare mode state helpers
  timeline.ts             # Timeline-specific computed signals
  graph.ts                # Graph explorer state
  anomalies.ts            # Anomaly alert management
  plugins.ts              # Plugin manifest/layer state
  settings.ts             # User settings state

src/panels/
  settings-panel.tsx       # BYOK config UI

src/sw/
  service-worker.ts        # Cache shell + data
```

### Requirements:

**T2 — Bootstrap + IndexedDB Cache:**
- Fetch `/bootstrap?slim=true` on load
- Cache in IndexedDB (key: `gambit-bootstrap`, TTL: 5 minutes)
- Serve from cache immediately, background-refresh
- Support `?at=<ISO>` for historical snapshots (don't cache)
- Populate `bootstrapData` signal

**T19 — Settings Panel:**
- "AI Analysis" section: provider dropdown (Anthropic/OpenAI), API key (masked), model override, enable/disable toggle
- Save: `PUT /settings/ai`, status display, "Remove key" button: `DELETE /settings/ai`
- Load existing on mount: `GET /settings/ai`

**T14 — Service Worker + Loading UX:**
- Cache: app shell, fonts, textures, PMTiles metadata
- Strategy: cache-first static, network-first API
- **Loading skeletons**: create a `components/skeleton.tsx` component — shimmer placeholder rectangles that match panel layout shapes. Use in `right-panel.tsx`, `news-feed.tsx`, `sidebar.tsx` while data loads
- **Error boundaries**: create a `components/error-boundary.tsx` Preact component that catches render errors and shows a "Something went wrong — retry" fallback instead of crashing the whole app. Wrap each major panel.

**T15 — Static Bootstrap Snapshot:**
- Build-time script: `scripts/snapshot-bootstrap.ts`
- Saves `public/bootstrap-snapshot.json`
- First visit renders from snapshot, background fetch updates

### Imports:
```ts
import { bootstrapData, bootstrapLoading, userSettings, pluginManifests,
         anomalyAlerts, timelinePosition } from '@/state/store';
import { api } from '@/api/client';
```

---

## Integration Checklist

After all agents complete, the orchestrator (you) must:

1. **Wire `app.tsx`**: Import all panel components and place them in the grid layout
2. **Connect layers to map**: Import layer creators into `deck-map.tsx`
3. **Add keyboard shortcuts**: Import handler into `app.tsx`
4. **Test SSE flow**: Verify all 9 event types update the correct signals/UI
5. **Run `bun install` + `bun dev`**: Verify everything compiles

### Verification:
- [ ] `cd frontend && bun install && bun dev` loads with dark theme
- [ ] Globe rotates, zooms; transitions to flat view with dark tiles
- [ ] All 7 layer toggles work
- [ ] Presets (Conflict Zone, Trade Risk, Full Intel, Minimal) toggle correct layers
- [ ] Plugin layers from `/plugins/manifest` appear in layer menu dynamically
- [ ] Clicking country shows detail panel with connections tab + sparkline
- [ ] Compare mode: 2-3 countries side-by-side + shared graph connections
- [ ] News feed shows real-time SSE events with provenance badges + source counts
- [ ] AI synthesis cards appear with BLUF + escalation signal gauge
- [ ] Timeline scrubber: drag to past, risk levels change, "Return to live" works
- [ ] Graph explorer: click entity → 1-hop connections → click node → navigate
- [ ] Anomaly alert: SSE anomaly event → banner slides in + map marker pulses
- [ ] Settings panel: enter API key → validation → toggle AI → save
- [ ] Search returns cross-collection results, selecting flies camera
- [ ] Keyboard shortcuts (1-6, C, L, T, G, Esc) work
- [ ] SSE reconnects after disconnect (5s backoff)
- [ ] Binary layers load correctly from Web Worker
- [ ] Service worker caches shell on first visit
- [ ] Both dark and light themes render correctly
- [ ] Day/night cycle subtly adjusts map tint based on viewport location
- [ ] Risk heatmap opacity slider works
- [ ] Anomaly badges appear on watchlist items with active anomalies
- [ ] Loading skeletons show while panels load data
- [ ] Error boundaries catch panel crashes gracefully
- [ ] Repeat visit loads from cache in <200ms
- [ ] `bun run build` produces optimized production bundle
