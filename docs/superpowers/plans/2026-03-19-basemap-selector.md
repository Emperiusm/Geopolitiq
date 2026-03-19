# Basemap Selector Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 6-style basemap selector to Gambit's map with a floating 3x2 grid picker UI.

**Architecture:** A `basemap` Preact signal drives style selection. Maplibre style objects are defined per basemap in a central file. The picker is a self-contained Preact component mounted in the bottom-right map controls. Satellite and Terrain styles are stubbed (placeholder styles) until raster PMTiles are sourced — the 4 vector styles (Intel, Light, Oceanic, Political) work immediately with the existing Protomaps source.

**Tech Stack:** Preact + Signals, Deck.GL, Maplibre-GL, Protomaps PMTiles

**Spec:** `docs/superpowers/specs/2026-03-19-basemap-selector-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `frontend/src/map/basemap-styles.ts` | All 6 Maplibre style definitions + type exports + ocean color map + tint scale map |
| Create | `frontend/src/components/basemap-picker.tsx` | Floating button + 3x2 grid popover component |
| Modify | `frontend/src/state/store.ts` | Add `basemap` signal + `cycleBasemap()` action + localStorage persistence |
| Modify | `frontend/src/map/flat-view.ts` | Remove `FLAT_MAP_STYLE`, import from basemap-styles, accept basemap param |
| Modify | `frontend/src/map/deck-map.tsx` | Ocean polygon color per basemap, day/night tint scaling per basemap, re-init Maplibre on basemap change |
| Modify | `frontend/src/app.tsx` | Mount `BasemapPicker` in bottom-right controls area |
| Modify | `frontend/src/components/keyboard-shortcuts.ts` | Add `B` key to cycle basemaps |

---

### Task 1: Add basemap signal to store

**Files:**
- Modify: `frontend/src/state/store.ts`

- [ ] **Step 1: Add the BasemapId type and signal**

After the `Theme` type on line 13, add:

```typescript
export type BasemapId = 'intel' | 'satellite' | 'terrain' | 'light' | 'oceanic' | 'political';
```

After `viewMode` signal (line 94), add:

```typescript
const BASEMAP_IDS: BasemapId[] = ['intel', 'satellite', 'terrain', 'light', 'oceanic', 'political'];

function loadBasemap(): BasemapId {
  const stored = localStorage.getItem('gambit-basemap');
  return BASEMAP_IDS.includes(stored as BasemapId) ? (stored as BasemapId) : 'intel';
}

export const basemap = signal<BasemapId>(loadBasemap());
```

- [ ] **Step 2: Add cycleBasemap action**

In the Actions section (after `toggleTheme`), add:

```typescript
export function setBasemap(id: BasemapId) {
  basemap.value = id;
  localStorage.setItem('gambit-basemap', id);
}

export function cycleBasemap() {
  const idx = BASEMAP_IDS.indexOf(basemap.value);
  setBasemap(BASEMAP_IDS[(idx + 1) % BASEMAP_IDS.length]);
}
```

- [ ] **Step 3: Verify the frontend compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors related to store.ts

- [ ] **Step 4: Commit**

```bash
git add frontend/src/state/store.ts
git commit -m "feat(store): add basemap signal with localStorage persistence"
```

---

### Task 2: Create basemap style definitions

**Files:**
- Create: `frontend/src/map/basemap-styles.ts`
- Modify: `frontend/src/map/flat-view.ts`

- [ ] **Step 1: Create basemap-styles.ts**

Create `frontend/src/map/basemap-styles.ts` with the following content. This file extracts the current `FLAT_MAP_STYLE` as the `intel` style and defines 5 more styles:

```typescript
import type { StyleSpecification } from 'maplibre-gl';
import type { BasemapId } from '../state/store';

const PMTILES_URL = 'pmtiles://https://build.protomaps.com/20250314.pmtiles';

const COMMON_SOURCE = {
  protomaps: {
    type: 'vector' as const,
    url: PMTILES_URL,
    attribution:
      '<a href="https://protomaps.com">Protomaps</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>',
  },
};

const GLYPHS = 'https://cdn.protomaps.com/fonts/pbf/{fontstack}/{range}.pbf';

/** Shared label layer factory — reused across vector styles */
function placesLabel(textColor: string, haloColor: string): any {
  return {
    id: 'places-label',
    type: 'symbol',
    source: 'protomaps',
    'source-layer': 'places',
    layout: {
      'text-field': ['get', 'name'],
      'text-font': ['Inter Regular'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 2, 10, 6, 13, 10, 16],
      'text-max-width': 8,
      'text-anchor': 'center',
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': textColor,
      'text-halo-color': haloColor,
      'text-halo-width': 1.5,
      'text-opacity': ['interpolate', ['linear'], ['zoom'], 1, 0.6, 5, 0.8, 10, 1],
    },
  };
}

/** Shared roads layer factory */
function roads(color: string): any {
  return {
    id: 'roads',
    type: 'line',
    source: 'protomaps',
    'source-layer': 'roads',
    paint: {
      'line-color': color,
      'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.2, 10, 0.6, 15, 1.2],
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 4, 0, 6, 0.3, 10, 0.5],
    },
  };
}

// ── Intel (current dark style — default) ─────────────────────
const intel: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: COMMON_SOURCE,
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#08080d' } },
    { id: 'earth', type: 'fill', source: 'protomaps', 'source-layer': 'earth', paint: { 'fill-color': '#0c0c14' } },
    { id: 'landuse', type: 'fill', source: 'protomaps', 'source-layer': 'landuse', paint: { 'fill-color': '#0e0e18', 'fill-opacity': 0.5 } },
    { id: 'natural', type: 'fill', source: 'protomaps', 'source-layer': 'natural', paint: { 'fill-color': '#0a0a12', 'fill-opacity': 0.4 } },
    { id: 'water', type: 'fill', source: 'protomaps', 'source-layer': 'water', paint: { 'fill-color': '#060610' } },
    { id: 'boundaries', type: 'line', source: 'protomaps', 'source-layer': 'boundaries', paint: { 'line-color': '#1a1a2e', 'line-width': 0.8, 'line-opacity': 0.6, 'line-dasharray': [4, 2] } },
    roads('#14141e'),
    placesLabel('#8888aa', '#08080d'),
  ],
};

// ── Light (briefing-room white) ──────────────────────────────
const light: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: COMMON_SOURCE,
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#f0f4f8' } },
    { id: 'earth', type: 'fill', source: 'protomaps', 'source-layer': 'earth', paint: { 'fill-color': '#e8ecf0' } },
    { id: 'landuse', type: 'fill', source: 'protomaps', 'source-layer': 'landuse', paint: { 'fill-color': '#d8e4d0', 'fill-opacity': 0.4 } },
    { id: 'natural', type: 'fill', source: 'protomaps', 'source-layer': 'natural', paint: { 'fill-color': '#dce8d4', 'fill-opacity': 0.3 } },
    { id: 'water', type: 'fill', source: 'protomaps', 'source-layer': 'water', paint: { 'fill-color': '#a8c4e0' } },
    { id: 'boundaries', type: 'line', source: 'protomaps', 'source-layer': 'boundaries', paint: { 'line-color': '#9aa0a8', 'line-width': 1, 'line-opacity': 0.7, 'line-dasharray': [4, 2] } },
    roads('#c8ccd0'),
    placesLabel('#4a5060', '#f0f4f8'),
  ],
};

// ── Oceanic (maritime deep blue) ─────────────────────────────
const oceanic: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: COMMON_SOURCE,
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#060610' } },
    { id: 'earth', type: 'fill', source: 'protomaps', 'source-layer': 'earth', paint: { 'fill-color': '#0a0e14' } },
    { id: 'landuse', type: 'fill', source: 'protomaps', 'source-layer': 'landuse', paint: { 'fill-color': '#0c1018', 'fill-opacity': 0.3 } },
    { id: 'natural', type: 'fill', source: 'protomaps', 'source-layer': 'natural', paint: { 'fill-color': '#0a0e14', 'fill-opacity': 0.2 } },
    { id: 'water', type: 'fill', source: 'protomaps', 'source-layer': 'water', paint: { 'fill-color': '#0a1628' } },
    // Bathymetry-style depth tint on water
    { id: 'water-depth', type: 'fill', source: 'protomaps', 'source-layer': 'water', paint: { 'fill-color': '#162d50', 'fill-opacity': 0.3 } },
    { id: 'boundaries', type: 'line', source: 'protomaps', 'source-layer': 'boundaries', paint: { 'line-color': '#1a2a3e', 'line-width': 0.6, 'line-opacity': 0.5, 'line-dasharray': [4, 2] } },
    roads('#101828'),
    placesLabel('#6688aa', '#060610'),
  ],
};

// ── Political (colored countries atlas) ──────────────────────
const political: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: COMMON_SOURCE,
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#0a0a14' } },
    { id: 'earth', type: 'fill', source: 'protomaps', 'source-layer': 'earth', paint: { 'fill-color': '#12121e' } },
    { id: 'landuse', type: 'fill', source: 'protomaps', 'source-layer': 'landuse', paint: { 'fill-color': '#14142a', 'fill-opacity': 0.3 } },
    { id: 'natural', type: 'fill', source: 'protomaps', 'source-layer': 'natural', paint: { 'fill-color': '#10101e', 'fill-opacity': 0.3 } },
    { id: 'water', type: 'fill', source: 'protomaps', 'source-layer': 'water', paint: { 'fill-color': '#080818' } },
    { id: 'boundaries', type: 'line', source: 'protomaps', 'source-layer': 'boundaries', paint: { 'line-color': '#e2e8f0', 'line-width': 1.2, 'line-opacity': 0.8 } },
    roads('#1a1a2e'),
    placesLabel('#c8d0e0', '#0a0a14'),
  ],
};

// ── Satellite (stub — requires raster PMTiles) ───────────────
// Uses Intel style as placeholder until raster PMTiles are sourced.
// When ready: replace with raster source + vector label overlay.
const satellite: StyleSpecification = { ...intel };

// ── Terrain (stub — requires hillshade PMTiles) ──────────────
// Uses a warm-toned vector style as placeholder until Mapzen DEM PMTiles are sourced.
// When ready: add hillshade raster source + Maplibre hillshade layer + topo-styled vectors.
const terrain: StyleSpecification = {
  version: 8,
  glyphs: GLYPHS,
  sources: COMMON_SOURCE,
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#1a1810' } },
    { id: 'earth', type: 'fill', source: 'protomaps', 'source-layer': 'earth', paint: { 'fill-color': '#2a2820' } },
    { id: 'landuse', type: 'fill', source: 'protomaps', 'source-layer': 'landuse', paint: { 'fill-color': '#2e3a24', 'fill-opacity': 0.5 } },
    { id: 'natural', type: 'fill', source: 'protomaps', 'source-layer': 'natural', paint: { 'fill-color': '#2a3420', 'fill-opacity': 0.4 } },
    { id: 'water', type: 'fill', source: 'protomaps', 'source-layer': 'water', paint: { 'fill-color': '#1a2a3a' } },
    { id: 'boundaries', type: 'line', source: 'protomaps', 'source-layer': 'boundaries', paint: { 'line-color': '#4a4a3e', 'line-width': 0.8, 'line-opacity': 0.6, 'line-dasharray': [4, 2] } },
    roads('#2a2a22'),
    placesLabel('#a0a088', '#1a1810'),
  ],
};

// ── Exports ──────────────────────────────────────────────────

export const basemapStyles: Record<BasemapId, StyleSpecification> = {
  intel, satellite, terrain, light, oceanic, political,
};

/** Ocean polygon color for the globe view, keyed by basemap */
export const OCEAN_COLORS: Record<BasemapId, [number, number, number, number]> = {
  intel:     [200, 212, 230, 255],
  satellite: [10,  30,  60,  255],
  terrain:   [170, 200, 220, 255],
  light:     [220, 230, 240, 255],
  oceanic:   [200, 212, 230, 255],
  political: [180, 200, 220, 255],
};

/** Day/night tint opacity scale factor per basemap */
export const TINT_SCALE: Record<BasemapId, number> = {
  intel: 1.0,
  satellite: 0.4,
  terrain: 0.6,
  light: 0.3,
  oceanic: 1.0,
  political: 0.5,
};

/** Labels for the picker UI */
export const BASEMAP_LABELS: Record<BasemapId, string> = {
  intel: 'Intel',
  satellite: 'Satellite',
  terrain: 'Terrain',
  light: 'Light',
  oceanic: 'Oceanic',
  political: 'Political',
};

/** CSS gradient thumbnails for the picker UI */
export const BASEMAP_THUMBNAILS: Record<BasemapId, string> = {
  intel:     'linear-gradient(135deg, #0c0c14, #1a1a2e)',
  satellite: 'linear-gradient(135deg, #2d5a27, #8B7355, #1a3a5c)',
  terrain:   'linear-gradient(135deg, #c8d5b9, #a0876c, #6d5a42)',
  light:     'linear-gradient(135deg, #f0f4f8, #d4dce6)',
  oceanic:   'linear-gradient(180deg, #0a1628, #162d50, #1a4a7a)',
  political: 'linear-gradient(135deg, #4a6fa5, #7a4a4a, #4a7a5a)',
};
```

- [ ] **Step 2: Update flat-view.ts to use basemap-styles**

Replace the entire `FLAT_MAP_STYLE` export and `PMTILES_URL` constant in `frontend/src/map/flat-view.ts`. The file should become:

```typescript
import { MapView } from '@deck.gl/core';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { basemapStyles } from './basemap-styles';
import type { BasemapId } from '../state/store';

let pmtilesInitialized = false;

export function initPMTiles() {
  if (pmtilesInitialized) return;
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  pmtilesInitialized = true;
}

export function createFlatView() {
  return new MapView({
    id: 'flat',
    controller: true,
  });
}

export function getMapStyle(id: BasemapId): maplibregl.StyleSpecification {
  return basemapStyles[id];
}
```

Note: `FLAT_MAP_STYLE` was imported in `deck-map.tsx` — but checking the code, it is NOT imported there. It was only used internally. If any other file imports `FLAT_MAP_STYLE`, add a re-export: `export const FLAT_MAP_STYLE = basemapStyles.intel;`

- [ ] **Step 3: Verify the frontend compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/map/basemap-styles.ts frontend/src/map/flat-view.ts
git commit -m "feat(map): create basemap style definitions and refactor flat-view"
```

---

### Task 3: Wire basemap into deck-map.tsx

**Files:**
- Modify: `frontend/src/map/deck-map.tsx`

- [ ] **Step 1: Add imports**

At the top of `frontend/src/map/deck-map.tsx`, add to the store import:

```typescript
import { viewMode, layers, bootstrapData, selectCountry, selectedEntity, rightPanelOpen, heatmapOpacity, basemap } from '../state/store';
```

Add new imports:

```typescript
import maplibregl from 'maplibre-gl';
import { OCEAN_COLORS, TINT_SCALE } from './basemap-styles';
import { getMapStyle } from './flat-view';
```

Note: `maplibregl` is needed for the `map` property in `MapView` (Step 4). If it's already imported elsewhere in the file, skip the duplicate.

- [ ] **Step 2: Update ocean polygon to use basemap-driven color**

In the `updateLayers` function (~line 254), change the hardcoded `getFillColor`:

```typescript
// Before:
getFillColor: [200, 212, 230, 255],

// After:
getFillColor: OCEAN_COLORS[basemap.value],
```

- [ ] **Step 3: Update day/night tint to scale per basemap**

In the `handleDayNightTint` function (~line 210), apply the tint scale. Replace the tint assignment block:

```typescript
const handleDayNightTint = () => {
  if (!containerRef.current) return;
  const activeView = viewMode.value;
  const vs = _currentViewState[activeView];
  if (!vs) return;

  const state = getDayNightState(vs.latitude ?? 0, vs.longitude ?? 0);
  const scale = TINT_SCALE[basemap.value];
  let tint: string;
  switch (state) {
    case 'night': {
      const a = (0.25 * scale).toFixed(3);
      tint = `rgba(10, 15, 40, ${a})`;
      break;
    }
    case 'twilight': {
      const a = (0.12 * scale).toFixed(3);
      tint = `rgba(15, 20, 50, ${a})`;
      break;
    }
    default:
      tint = 'transparent';
  }
  containerRef.current.style.setProperty('--map-tint', tint);
};
```

- [ ] **Step 4: Re-initialize Maplibre style on basemap change**

The Deck.GL `MapView` creates an internal Maplibre map. To swap styles, we need to pass the style through the map configuration. In the `useEffect` that creates the Deck instance, the `MapView` is created in `getViews()`. Update it to pass the current basemap style:

In `getViews()` (~line 97), update the flat view branch:

```typescript
const getViews = () => {
  if (viewMode.value === 'flat') {
    return [new MapView({
      id: 'flat',
      controller: true,
      map: maplibregl,
      mapStyle: getMapStyle(basemap.value),
    })];
  }
  return [new GlobeView({ id: 'globe', controller: true, resolution: 10 })];
};
```

Then in the animation loop, add a `prevBasemap` ref to detect changes and re-set views:

After the other refs (~line 89), add:

```typescript
const prevBasemapRef = useRef<string>(basemap.value);
```

In the `animate` function, before `updateLayers()`, add:

```typescript
// Check for basemap change and update views
if (basemap.value !== prevBasemapRef.current) {
  prevBasemapRef.current = basemap.value;
  deckRef.current?.setProps({ views: getViews() });
}
```

- [ ] **Step 5: Verify the frontend compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/map/deck-map.tsx
git commit -m "feat(map): wire basemap signal into ocean color, tint, and map style"
```

---

### Task 4: Create basemap picker component

**Files:**
- Create: `frontend/src/components/basemap-picker.tsx`

- [ ] **Step 1: Create the component**

Create `frontend/src/components/basemap-picker.tsx`:

```tsx
import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { basemap, setBasemap, type BasemapId } from '../state/store';
import { BASEMAP_LABELS, BASEMAP_THUMBNAILS } from '../map/basemap-styles';

const BASEMAP_IDS: BasemapId[] = ['intel', 'satellite', 'terrain', 'light', 'oceanic', 'political'];

export function BasemapPicker() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Popover grid */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '44px',
            right: 0,
            background: 'rgba(12, 12, 20, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            width: '264px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            zIndex: 100,
          }}
        >
          {BASEMAP_IDS.map((id) => {
            const active = basemap.value === id;
            return (
              <button
                key={id}
                onClick={() => setBasemap(id)}
                title={BASEMAP_LABELS[id]}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '76px',
                    height: '52px',
                    borderRadius: '6px',
                    background: BASEMAP_THUMBNAILS[id],
                    border: active ? '2px solid #6366f1' : '2px solid transparent',
                    position: 'relative',
                    transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }}
                >
                  {active && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '3px',
                        right: '3px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#6366f1',
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: active ? '#e2e8f0' : '#94a3b8',
                    marginTop: '4px',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {BASEMAP_LABELS[id]}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        title="Basemap"
        style={{
          width: '36px',
          height: '36px',
          background: 'rgba(12, 12, 20, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          transition: 'border-color 0.15s ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify the frontend compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/basemap-picker.tsx
git commit -m "feat(ui): create basemap picker component with 3x2 grid popover"
```

---

### Task 5: Mount picker in app.tsx

**Files:**
- Modify: `frontend/src/app.tsx`

- [ ] **Step 1: Import BasemapPicker**

Add to the imports in `frontend/src/app.tsx`:

```typescript
import { BasemapPicker } from './components/basemap-picker';
```

- [ ] **Step 2: Add BasemapPicker above view-mode buttons**

In the map controls `<div>` (~line 99-127), add `<BasemapPicker />` as the first child, above the view-mode button row. The structure becomes:

```tsx
{/* Map controls — bottom-right */}
<div style={{
  position: 'absolute', right: '16px', bottom: '16px',
  display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end',
  zIndex: 'var(--z-map-controls)', pointerEvents: 'auto',
}}>
  <BasemapPicker />
  <div style={{
    display: 'flex', gap: '1px', overflow: 'hidden',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--bg-glass)', backdropFilter: 'blur(var(--glass-blur))',
    border: '1px solid var(--border-subtle)', boxShadow: 'var(--glass-shadow)',
  }}>
    {(['globe', 'flat'] as const).map(mode => (
      /* ... existing view mode buttons unchanged ... */
    ))}
  </div>
</div>
```

- [ ] **Step 3: Verify the frontend compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app.tsx
git commit -m "feat(app): mount basemap picker in bottom-right map controls"
```

---

### Task 6: Add keyboard shortcut

**Files:**
- Modify: `frontend/src/components/keyboard-shortcuts.ts`

- [ ] **Step 1: Import cycleBasemap**

Add `cycleBasemap` to the import from store:

```typescript
import { toggleLayer, rightPanelOpen, selectCountry, sidebarOpen,
         newsPanelOpen, compareCountries, addToCompare, selectedCountry,
         selectedEntity, graphConnections, cycleBasemap } from '../state/store';
```

- [ ] **Step 2: Add B key case**

In the `switch (e.key)` block, add before the `'Escape'` case:

```typescript
case 'b':
case 'B':
  cycleBasemap();
  break;
```

- [ ] **Step 3: Verify the frontend compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/keyboard-shortcuts.ts
git commit -m "feat(shortcuts): add B key to cycle basemaps"
```

---

### Task 7: Manual smoke test

**Files:** None (testing only)

- [ ] **Step 1: Start the frontend dev server**

Run: `cd frontend && bun run dev`
Open: `http://localhost:5200`

- [ ] **Step 2: Verify basemap picker appears**

Check: A small 4-squares icon button appears in the bottom-right, above the 3D Globe / 2D Map buttons.

- [ ] **Step 3: Test popover interaction**

Click the basemap button. Verify:
- 3x2 grid popover opens upward
- "Intel" shows active (indigo border + dot)
- Clicking "Light" swaps the basemap immediately — map tiles change to light theme
- Clicking "Oceanic" swaps to deep blue ocean style
- Clicking "Political" swaps to colored boundaries
- Popover stays open between clicks
- Clicking outside or pressing Escape closes the popover

- [ ] **Step 4: Test keyboard shortcut**

Press `B` key. Verify basemap cycles: Intel → Satellite → Terrain → Light → Oceanic → Political → Intel.

- [ ] **Step 5: Test persistence**

Select a non-default basemap (e.g. "Oceanic"). Refresh the page. Verify Oceanic is still selected.

- [ ] **Step 6: Test with Globe view**

Switch to 3D Globe. Verify:
- Basemap picker still works
- Ocean polygon color changes per basemap
- Day/night tint is subtler on Light basemap, normal on Intel

- [ ] **Step 7: Commit all remaining changes (if any polish needed)**

```bash
git add -A
git commit -m "feat: complete basemap selector implementation"
```
