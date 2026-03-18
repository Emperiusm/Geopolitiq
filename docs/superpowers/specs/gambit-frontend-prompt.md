# Gambit Frontend — Complete Implementation Prompt

> **For Antigravity agents:** This prompt contains everything needed to build the Gambit frontend. Start by generating the design system with Stitch MCP, then implement in parallel across 5 agent workspaces.

## Project context

Gambit is a geopolitical intelligence platform. The **entire backend is complete** — Bun + Hono API with MongoDB + Redis, 21 API routes, 220+ RSS feed ingestion, entity graph, anomaly detection, temporal snapshots, BYOK AI analysis, plugin system, and source provenance. The repo is at the project root with the backend in `api/`.

The frontend is a Preact + Deck.GL intelligence map that visualizes the world state and provides real-time intelligence feeds.

## Tech stack

- **Framework:** Preact 10.x (not React — use `h` and `@preact/signals`)
- **Build:** Vite 5.x with `@preact/preset-vite`
- **Map:** Deck.GL 9.x (GlobeView + MapView)
- **Base map:** MapLibre GL JS 4.x + PMTiles (dark style, flat view only)
- **State:** Preact Signals (`@preact/signals`)
- **Graph visualization:** D3-force (for entity graph explorer)
- **Styling:** CSS Modules with CSS custom properties (dark intelligence theme)
- **Testing:** Vitest
- **Performance:** Service worker, IndexedDB caching, Web Workers for binary parsing, bundle splitting

## Design direction

**Dark intelligence command center.** Think Bloomberg Terminal meets a modern ops dashboard. Not a generic dark theme — a purpose-built intelligence aesthetic.

- Background: near-black (#0a0a0f to #12121a range)
- Accent: electric blue/cyan for active elements, amber for warnings, red for critical
- Text: high-contrast white/light gray on dark surfaces
- Panels: translucent glass-morphism with subtle borders, not opaque cards
- Typography: clean sans-serif, monospace for data values
- Map: dark globe with subtle country outlines, bright data layers
- Animations: subtle, purposeful — pulse rings for conflicts, fade-in for panels

**Use Stitch MCP first** to generate the design DNA for a "dark cinematic geopolitical intelligence dashboard." Extract the design context, then apply it consistently across all components.

---

## Backend API contract

Base URL: `http://localhost:3000/api/v1` (configurable via `VITE_API_URL`)

### Core data endpoints (JSON)

| Method | Route | Returns | Cache |
|--------|-------|---------|-------|
| GET | `/bootstrap?slim=true` | All collections in one call | 5m |
| GET | `/bootstrap?at=<ISO8601>` | Historical state at timestamp | — |
| GET | `/countries` | 199 countries with risk, leader, tags | 1h |
| GET | `/countries/:id` | Single country detail | 1h |
| GET | `/bases` | 495 military bases | 1h |
| GET | `/nsa` | 79 non-state actors | 1h |
| GET | `/chokepoints` | 60 chokepoints | 1h |
| GET | `/elections` | ~13 upcoming elections | 1h |
| GET | `/trade-routes` | 21 trade routes | 1h |
| GET | `/ports` | Ports (derived from routes) | 1h |
| GET | `/conflicts` | Active conflicts | 5m |
| GET | `/news?limit=50` | Recent enriched news | — |
| GET | `/search?q=<term>` | Cross-collection search | — |
| GET | `/compare?ids=X,Y,Z` | Side-by-side country data | — |
| GET | `/viewport?bbox=W,S,E,N` | Entities in map viewport | — |

### Binary layer endpoints (ArrayBuffer)

| Route | Stride | Fields | Description |
|-------|--------|--------|-------------|
| `/layers/bases/binary` | 5 | lng, lat, r, g, b | Military bases |
| `/layers/nsa-zones/binary` | 4 | lng, lat, radiusKm, ideology | NSA zones |
| `/layers/chokepoints/binary` | 4 | lng, lat, status, type | Chokepoints |
| `/layers/trade-arcs/binary` | 5 | fromLng, fromLat, toLng, toLat, category | Trade routes |
| `/layers/conflicts/binary` | 4 | lng, lat, dayCount, status | Conflicts |
| `/layers/<pluginId>/binary` | varies | varies | Plugin-registered layers |

**Binary format:** 8-byte header (uint32 count + uint32 stride) + Float32Array body.

```ts
// Parse binary layer response:
const buffer = await res.arrayBuffer();
const header = new DataView(buffer);
const count = header.getUint32(0, true);
const stride = header.getUint32(4, true);
const data = new Float32Array(buffer, 8);
// Access: data[i * stride + fieldIndex]
```

### Intelligence pipeline endpoints (new)

| Method | Route | Returns |
|--------|-------|---------|
| GET | `/timeline/at?t=<ISO>` | Snapshot nearest to timestamp |
| GET | `/timeline/range?from=<ISO>&to=<ISO>&limit=50` | Snapshot series for scrubber |
| GET | `/graph/connections?entity=<type:id>&depth=1&minWeight=0.5` | Entity connections (fan-out) |
| GET | `/graph/path?from=<type:id>&to=<type:id>` | Shortest path (max 4 hops) |
| GET | `/anomalies?severity=alert,critical&since=24h` | Recent anomaly alerts |
| GET | `/anomalies/baseline/:type/:id` | 7-day hourly count history |
| GET | `/plugins/manifest` | All plugin manifests (for dynamic layers) |
| GET | `/plugins/:id/status` | Plugin health + doc count |
| PUT | `/settings/ai` | Set BYOK LLM provider + key |
| GET | `/settings/ai` | Get settings (key masked) |
| DELETE | `/settings/ai` | Remove key, disable AI |

### SSE stream

`EventSource` at `/events/stream`. Nine event types:

| Event | Data | Action |
|-------|------|--------|
| `news` | `{ title, conflictId, relatedCountries }` | Add to news feed |
| `news-enriched` | `{ title, conflictId, relatedCountries, relatedChokepoints, relatedNSA }` | Update news item with entity links |
| `news-analysis` | `{ clusterId, summary, escalationSignal }` | Show AI synthesis card |
| `risk-change` | `{ countryId, oldRisk, newRisk }` | Update heatmap color |
| `conflict-update` | `{ conflictId, status, dayCount }` | Update conflict layer |
| `anomaly` | `{ entityType, entityId, severity, zScore, currentCount, baselineMean }` | Alert banner + map pulse |
| `snapshot` | `{ timestamp, trigger }` | Update timeline "live" end |
| `plugin-poll` | `{ pluginId, inserted, total }` | Refresh plugin layer |
| `plugin-data` | `{ pluginId, newDocs, totalDocs }` | Refresh plugin layer data |

### Response envelope

All JSON responses wrapped in:
```ts
{ data: T, meta: { total?, limit?, offset?, cached?, freshness? } }
```

### Key data shapes

```ts
// Country (from /bootstrap or /countries)
{ _id: "iran", iso2: "IR", name: "Iran", flag: "🇮🇷", lat: 32.4, lng: 53.6,
  risk: "catastrophic" | "extreme" | "severe" | "stormy" | "cloudy" | "clear",
  tags: ["CONFLICT", "SANCTIONS"], region: "Middle East", leader: "...", analysis: { what, why, next } }

// Conflict
{ _id: "us-iran-war", title: "...", lat, lng, status: "active"|"ceasefire"|"resolved",
  dayCount: 42, casualties: [{ party, figure }], relatedCountries: ["IR","US"] }

// News (enriched)
{ title, summary, tags: ["CONFLICT","ENERGY"], sourceCount: 3, conflictId: "us-iran-war",
  relatedCountries: ["IR","US"], relatedChokepoints: ["hormuz"], relatedNSA: ["hezbollah"],
  provenance: { trustScore: 0.85, redFlags: [], sourceTier: "primary" } }

// Graph connection response
{ data: { seed: { type, id }, nodes: [...], edges: [{ from, to, relation, weight }] } }

// Anomaly
{ entityType: "country", entityId: "IR", severity: "alert", zScore: 3.5,
  currentCount: 47, baselineMean: 12, detectedAt: "..." }

// Plugin manifest (from /plugins/manifest)
{ id: "acled-conflicts", name: "ACLED Armed Conflict Events", type: "source",
  deckglLayer: { type: "ScatterplotLayer", colorMap: {...}, radiusField: "fatalities" },
  panel: { icon: "crosshairs", group: "SECURITY" } }
```

---

## File structure

```
frontend/
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  public/
    textures/earth-dark.jpg, earth-night.jpg
  src/
    main.tsx                            # Preact render entry
    app.tsx                             # Root layout: map + sidebar + panels + timeline
    api/
      client.ts                         # fetch wrapper with auth header + base URL
      bootstrap.ts                      # Bootstrap fetch + IndexedDB cache + ?at= support
      sse.ts                            # EventSource with 9 event types + reconnect
      timeline.ts                       # fetchTimeline(), fetchBootstrapAt()
      graph.ts                          # fetchConnections(), fetchPath()
      anomalies.ts                      # fetchAnomalies(), fetchBaseline()
      plugins.ts                        # fetchPluginManifests()
      settings.ts                       # getSettings(), putSettings(), deleteSettings()
    state/
      store.ts                          # Core signals: viewMode, selectedCountry, bootstrapData
      layers.ts                         # Layer toggles + presets + dynamic plugin layers
      compare.ts                        # Compare mode (up to 3 countries)
      timeline.ts                       # timelinePosition, isHistorical, scrubTo()
      graph.ts                          # graphConnections, selectedGraphEntity
      anomalies.ts                      # anomalyAlerts, dismissAlert()
      plugins.ts                        # pluginLayers, pluginManifests
      settings.ts                       # userSettings, aiEnabled
    map/
      deck-map.tsx                      # Deck.GL canvas wrapper (globe + flat)
      globe-view.ts                     # GlobeView + earth texture
      flat-view.ts                      # MapView + MapLibre + PMTiles
      view-transition.ts               # Globe <-> flat crossfade
      pmtiles-source.ts                # PMTiles protocol for MapLibre
      day-night.ts                      # Solar calculation + CSS theme switching
    layers/
      risk-heatmap.ts                   # Country risk coloring
      trade-routes.ts                   # ArcLayer
      chokepoints.ts                    # ScatterplotLayer + TextLayer
      military-bases.ts                 # ScatterplotLayer + clustering
      nsa-zones.ts                      # Semi-transparent circles
      conflicts.ts                      # Animated pulse rings
      elections.ts                      # Countdown markers
    panels/
      sidebar.tsx                       # Watchlist + layer menu + anomaly badges
      layer-menu.tsx                    # Toggles + presets + plugin layers
      right-panel.tsx                   # Entity detail container
      trade-routes-panel.tsx
      chokepoints-panel.tsx
      bases-panel.tsx
      nsa-panel.tsx
      conflicts-panel.tsx
      elections-panel.tsx
      compare-panel.tsx                 # Side-by-side + shared graph connections
      news-feed.tsx                     # SSE feed + provenance badges + AI cards
      search-bar.tsx                    # Cross-collection search
      timeline-scrubber.tsx             # Bottom slider for time travel
      graph-explorer.tsx                # D3-force entity network
      anomaly-banner.tsx                # Top notification bar
      anomaly-history.tsx               # Alert history list
      settings-panel.tsx                # BYOK config UI
      ai-synthesis-card.tsx             # LLM event summary
    components/
      badge.tsx                         # Risk/status badge
      tooltip.tsx                       # Map hover tooltip
      keyboard-shortcuts.ts
      sparkline.tsx                     # Tiny 7-day chart
      trust-badge.tsx                   # Provenance indicator
      pulse-ring.ts                     # Map anomaly animation
    styles/
      variables.css                     # Design system tokens
      app.css                           # Root layout
    workers/
      data-worker.ts                    # Binary ArrayBuffer parsing
    sw/
      service-worker.ts                 # Cache shell + data
```

---

## Implementation phases

### Phase 4: Frontend shell (Tasks 1-5)

**Task 1: Scaffold** — `package.json` with all deps, `tsconfig.json` with Preact JSX, `vite.config.ts` with Preact preset + port 5173, `index.html` with inline critical CSS (dark background), `main.tsx` entry, verify `bun dev` starts.

**Task 2: State management + API client** — Preact Signals store with: `viewMode` (globe/flat), `selectedCountry`, `searchQuery`, `sidebarOpen`, `bootstrapData`, `bootstrapLoading`, `timelinePosition` (Date | null), `isHistorical` (computed), `graphConnections`, `anomalyAlerts`, `pluginManifests`, `userSettings`, `newsAnalyses`. API client with auth header support, all fetch functions for new endpoints. Bootstrap fetch with IndexedDB cache + `?at=` parameter support for timeline.

**Task 3: Deck.GL globe** — `deck-map.tsx` with GlobeView, dark earth texture, interactive rotation/zoom. Transition to MapView when zoom > threshold.

**Task 4: Flat view + PMTiles** — MapLibre with dark base tiles, PMTiles protocol, country polygon fill from GeoJSON. View toggle button (globe <-> flat).

**Task 5: SSE client + day/night** — EventSource with reconnect. **All 9 event types:**
- `news` → prepend to `latestEvents`
- `news-enriched` → update existing item with entity links
- `news-analysis` → add to `newsAnalyses` by clusterId
- `risk-change` → update country in `bootstrapData`
- `conflict-update` → update conflict in `bootstrapData`
- `anomaly` → push to `anomalyAlerts`, trigger banner
- `snapshot` → update timeline "live" endpoint
- `plugin-poll` → refresh plugin layer data
- `plugin-data` → refresh plugin layer data

Day/night: solar elevation calc, CSS variable switching per time-of-day.

### Phase 5: Layers + features (Tasks 6-12)

**Task 6: Risk heatmap** — Globe: ScatterplotLayer colored dots at country centers. Flat: MapLibre `setFeatureState()` for polygon fill. Opacity slider.

**Task 7: Sidebar + layer menu** — Left sidebar with: critical watchlist (catastrophic + extreme countries with anomaly badges), layer menu with 3 groups (Economic, Security, Political), presets (Conflict Zone, Trade Risk, Full Intel, Minimal), **dynamic plugin layers from `/plugins/manifest`** appended to their manifest-specified group.

**Task 8: Six data layers** — Trade routes (ArcLayer colored by category), chokepoints (ScatterplotLayer + TextLayer, colored by status), military bases (ScatterplotLayer with country colors + clustering at low zoom), NSA zones (semi-transparent circles colored by ideology), conflicts (animated pulse rings, size by dayCount), elections (markers with countdown badges).

**Task 9: Detail panels** — Right panel container. Each entity type gets a detail panel with standard info PLUS: **connections tab** (fetch `/graph/connections?entity=<type:id>&depth=1`, show linked entities as clickable chips), **anomaly sparkline** (tiny 7-day chart from `/anomalies/baseline/:type/:id`). Conflict panel also shows AI synthesis cards when BYOK enabled.

**Task 10: Compare mode** — Select up to 3 countries. Side-by-side stats. **Add: shared graph connections** (fetch connections for each, compute intersection, show shared conflicts/chokepoints/NSA).

**Task 11: Search + news feed** — Global search bar with debounced `/search?q=`. News feed panel with: **provenance trust badge** per article (green >0.8, amber 0.5-0.8, red <0.5), **source count** ("5 sources"), **AI synthesis card** when available (expandable: summary, perspectives, escalation signal).

**Task 12: Keyboard shortcuts** — 1-6 for layers, C for compare, L for layer menu, Esc to exit, T for timeline, G for graph. Map tooltip on hover.

### Phase 5.5: Intelligence components (Tasks 16-19) — NEW

**Task 16: Timeline scrubber** — Horizontal slider anchored at bottom of map viewport. Left end = oldest snapshot, right end = "live" (now). Dragging:
1. Fetches `/timeline/range?from=...&to=...` for available timestamps
2. Snaps to nearest snapshot
3. Calls `/bootstrap?at=<timestamp>&slim=true` for historical state
4. Re-renders mutable layers (risk colors, conflict statuses, chokepoint statuses) with historical data
5. Shows "HISTORICAL — Mar 15, 2026 14:00 UTC" banner
6. "Return to live" button resets

Static layers (bases, ports, trade routes) don't change when scrubbing.

**Task 17: Graph explorer** — Panel with D3-force network visualization. Triggered from "Show connections" button on any entity detail panel.
1. Fetch `/graph/connections?entity=<type:id>&depth=1`
2. Render nodes (colored by entity type) and edges (labeled by relation)
3. Clickable nodes → navigate to that entity's detail panel + fly camera
4. Depth control (1-hop, 2-hop, 3-hop via +/- buttons)
5. Path mode: `/graph/path?from=...&to=...` highlights shortest path

**Task 18: Anomaly alerts** — Two components:
1. **Alert banner** — slides in from top on SSE `anomaly` event. Shows entity name, severity badge (amber watch, orange alert, red critical), z-score vs baseline. Auto-dismiss 10s for watch, persist for alert/critical. Click navigates to entity.
2. **Map pulse** — on anomaly, affected entity's map marker gets temporary expanding circle animation with severity color.

**Task 19: Settings panel** — Accessible from sidebar gear icon.
1. "AI Analysis" section: provider dropdown (Anthropic/OpenAI), API key input (password field), model override, enable/disable toggle
2. Save calls `PUT /settings/ai` (backend validates key)
3. Shows status: "Connected — Claude Sonnet 4 via Anthropic" or "Not configured"
4. "Remove key" button calls `DELETE /settings/ai`

### Phase 6: Performance (Tasks 13-15)

**Task 13: Binary data** — Web Worker for parsing binary ArrayBuffer responses. Each layer accepts Float32Array data directly via Deck.GL's binary data support.

**Task 14: Service worker + splitting** — Cache app shell, textures, PMTiles metadata. Bundle: core (Preact ~20KB), Deck.GL (~150KB), MapLibre (~200KB lazy), each panel lazy-loaded. Loading skeletons + error boundaries.

**Task 15: Static bootstrap snapshot** — Build-time script fetches `/bootstrap?slim=true`, saves as `bootstrap-snapshot.json` baked into the build. First visit renders instantly from snapshot, background fetch updates.

---

## Antigravity parallel agent strategy

**Before agents start:** Run Stitch MCP to generate the design system.
```
"Use stitch MCP server to design a dark cinematic geopolitical intelligence dashboard.
It should have: a dark globe map as the centerpiece, a left sidebar with entity watchlist
and layer toggles, a right panel for entity details, a bottom timeline slider, a top
notification bar for alerts, and a news feed panel. The aesthetic should be: near-black
backgrounds, electric blue accents, glass-morphism panels, monospace data values,
subtle grid lines. Think Bloomberg Terminal meets military ops center."
```

Extract the design context, then dispatch 5 parallel agents:

| Agent | Workspace | Tasks | Model |
|-------|-----------|-------|-------|
| 1 — Globe + map | `frontend/src/map/` + `layers/` | T1, T3, T4, T6, T8, T13 | Claude Opus |
| 2 — Sidebar + panels | `frontend/src/panels/` | T7, T9, T10, T11, T12 | Claude Opus |
| 3 — Timeline + graph | `frontend/src/panels/timeline-*` + `graph-*` | T16, T17 | Claude Opus |
| 4 — News + anomalies + SSE | `frontend/src/panels/news-*` + `anomaly-*`, `api/sse.ts` | T5, T18 | Claude Sonnet |
| 5 — Settings + state + perf | `frontend/src/state/` + `api/` + `settings-*` | T2, T19, T14, T15 | Claude Sonnet |

**Shared files** (coordinate between agents): `app.tsx` (root layout), `state/store.ts` (signals), `styles/variables.css` (design tokens).

---

## Verification checklist

After all phases, verify:

- [ ] `bun dev` loads with dark globe view
- [ ] Globe rotates, zooms; transitions to flat view with dark tiles
- [ ] All 7 layer toggles work (trade routes, chokepoints, bases, NSA, conflicts, elections, risk heatmap)
- [ ] Presets (Conflict Zone, Trade Risk, Full Intel, Minimal) toggle correct layers
- [ ] Plugin layers from `/plugins/manifest` appear in layer menu dynamically
- [ ] Clicking country shows detail panel with connections tab + sparkline
- [ ] Compare mode: 2-3 countries side-by-side + shared graph connections
- [ ] News feed shows real-time SSE events with provenance badge + source count
- [ ] AI synthesis cards appear for multi-source events (when BYOK active)
- [ ] Timeline scrubber: drag to past, risk levels change, "Return to live" works
- [ ] Graph explorer: click entity → 1-hop connections → click node → navigate
- [ ] Anomaly alert: SSE anomaly event → banner slides in + map marker pulses
- [ ] Settings panel: enter API key → validation → toggle AI → save
- [ ] Search returns cross-collection results, selecting flies camera
- [ ] Keyboard shortcuts (1-6, C, L, T, G, Esc) work
- [ ] SSE reconnects after disconnect (5s backoff)
- [ ] Binary layers load correctly from Web Worker
- [ ] Service worker caches shell on first visit
- [ ] Repeat visit loads from cache in <200ms
- [ ] `bun run build` produces optimized production bundle
