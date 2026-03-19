# Basemap Selector Design

## Overview

Add a basemap style selector to Gambit's map, allowing users to switch between 6 tile styles while staying in either Globe or Flat view. Basemap selection is independent of view mode — it swaps the underlying tiles, not the camera/projection.

## Basemap Styles

| ID | Name | Source | Description |
|----|------|--------|-------------|
| `intel` | Intel | Protomaps PMTiles (vector) | Current dark style. Default. Dark navy land, near-black water, subtle borders. Optimized for data overlay readability. |
| `satellite` | Satellite | Raster PMTiles (Sentinel-2 / USGS open imagery) | Aerial satellite imagery with vector label overlay. Google Earth aesthetic. |
| `terrain` | Terrain | Mapzen DEM hillshade PMTiles + Protomaps vector overlay | Topographic relief with hillshade shading. Green valleys → brown peaks → white snow elevation ramp. Contour-style coloring. |
| `light` | Light | Protomaps PMTiles (vector, restyled) | Clean white/grey briefing-room style. High contrast for presentations and screenshots. |
| `oceanic` | Oceanic | Protomaps PMTiles (vector, restyled) + bathymetry tint | Maritime-focused. Deep blue ocean with depth shading. Land de-emphasized. Ideal for trade route and chokepoint analysis. |
| `political` | Political | Protomaps PMTiles (vector, restyled) + country fill polygons | Countries filled with distinct colors. Clear sovereign boundaries. Atlas/classroom style. |

### Tile Source Strategy

All 6 basemaps use **self-hosted PMTiles** — no third-party tile APIs, no rate limits, no commercial licensing restrictions.

- **Intel, Light, Oceanic, Political:** Same Protomaps PMTiles source (`20250314.pmtiles`), different Maplibre style definitions (paint properties, colors, opacity).
- **Satellite:** Raster PMTiles converted from open satellite imagery (Sentinel-2 or USGS). Hosted on CDN (Cloudflare R2 or S3). Global zoom 0-12 keeps file size manageable (~5-10GB). Vector labels from Protomaps overlaid on top.
- **Terrain:** Two-layer composite:
  1. **Hillshade raster** — Mapzen Terrain Tiles (open, from AWS Public Datasets) converted to PMTiles (~2-5GB for global zoom 0-12). Rendered via Maplibre's native `hillshade` layer type.
  2. **Vector overlay** — Protomaps PMTiles styled with topo-appropriate palette (elevation color ramps, contour-like coloring, Inter font labels matching Gambit brand).

## UI Component: Basemap Picker

### Trigger Button

- **Icon:** Stacked-layers SVG (4 squares grid)
- **Size:** 36x36px
- **Position:** Bottom-right corner, directly above the existing 3D Globe / 2D Map toggle buttons
- **Style:** Glassmorphic, matching existing controls — `background: rgba(12,12,20,0.9)`, `backdrop-filter: blur(8px)`, `border: 1px solid rgba(255,255,255,0.15)`, `border-radius: 8px`
- **Tooltip:** "Basemap" on hover

### Popover (3x2 Grid)

- **Trigger:** Click button to open, click outside or re-click to close. Escape key closes.
- **Position:** Opens upward from the button
- **Layout:** 3 columns x 2 rows grid
- **Panel style:** Glassmorphic (`rgba(12,12,20,0.95)`, `backdrop-filter: blur(12px)`, `border-radius: 12px`, `box-shadow: 0 8px 32px rgba(0,0,0,0.6)`)
- **Thumbnail cards:** ~76x52px each, `border-radius: 6px`, gradient/color preview of the style
- **Labels:** Style name below each thumbnail, 10px Inter font
- **Active state:** Indigo accent border (`#6366f1`, 2px) + small dot indicator in bottom-right corner of thumbnail. Label color: `#e2e8f0`
- **Inactive state:** Transparent border. Label color: `#94a3b8`
- **Hover state:** Subtle border brighten
- **Behavior:** Click immediately swaps basemap. Popover stays open so user can compare styles before closing.

### File

New component: `frontend/src/components/basemap-picker.tsx`

Mounted in `app.tsx` alongside the view-mode buttons in the bottom-right map controls area.

## Data Flow

### Store (`frontend/src/state/store.ts`)

New signal:
```typescript
export const basemap = signal<'intel' | 'satellite' | 'terrain' | 'light' | 'oceanic' | 'political'>('intel');
```

Persisted to `localStorage` key `gambit-basemap` so selection survives refresh.

### Style Definitions (`frontend/src/map/basemap-styles.ts`)

New file. Exports:
```typescript
export type BasemapId = 'intel' | 'satellite' | 'terrain' | 'light' | 'oceanic' | 'political';
export const basemapStyles: Record<BasemapId, MaplibreStyleSpec>;
```

Each entry is a full Maplibre style object. The current `FLAT_MAP_STYLE` from `flat-view.ts` is extracted and moved here as the `intel` style. The other 3 vector styles (Light, Oceanic, Political) reuse the same PMTiles source with different paint properties.

Satellite and Terrain styles reference raster PMTiles sources plus vector label overlays.

### Flat View Integration (`flat-view.ts`)

- Remove hardcoded `FLAT_MAP_STYLE`
- Import `basemapStyles` and `basemap` signal
- `getMapStyle()` returns `basemapStyles[basemap.value]`
- On `basemap` signal change, call `maplibreMap.setStyle(newStyle)` for live swap

### Globe View Integration (`deck-map.tsx`)

- Ocean base polygon color adjusts per basemap:
  - Intel/Oceanic: `[200, 212, 230, 255]` (current light blue)
  - Satellite: `[10, 30, 60, 255]` (deep ocean blue)
  - Terrain: `[170, 200, 220, 255]` (muted blue)
  - Light: `[220, 230, 240, 255]` (light grey-blue)
  - Political: `[180, 200, 220, 255]` (neutral blue)

### Day/Night Tint Adjustments (`deck-map.tsx` — `handleDayNightTint`)

Tint opacity scale factor per basemap, applied in `deck-map.tsx` where the `--map-tint` CSS variable is set (not in `day-night.ts` which only computes solar position). Scale factor multiplies the base tint opacity:

| Basemap | Tint Scale | Reason |
|---------|-----------|--------|
| Intel | 1.0 (current) | Dark base, full tint effect |
| Satellite | 0.4 | Imagery has natural lighting already |
| Terrain | 0.6 | Hillshade provides some depth cues |
| Light | 0.3 | Light background, subtle tint only |
| Oceanic | 1.0 | Dark base, same as Intel |
| Political | 0.5 | Mid-brightness, moderate tint |

## Layer Readability

Data overlay layers (risk heatmap, conflict pulses, trade routes, etc.) are designed for dark backgrounds. On lighter basemaps (Light, Terrain, Satellite), some layers may need contrast adjustments:

- **Risk heatmap dots:** May need darker stroke or shadow on Light/Terrain
- **Conflict pulse rings:** Red stays visible on most backgrounds; no change expected
- **Trade route arcs:** May need opacity boost on Satellite where imagery competes
- **Text labels (chokepoints, elections):** May need background pill/halo on busy basemaps

These are polish items to tune during implementation, not blocking architecture decisions.

## Edge Cases

- **View switching preserves basemap:** Swapping Globe ↔ Flat reads from the same `basemap` signal. No reset.
- **Tile loading transition:** Raster tiles (Satellite, Terrain) are heavier than vector. Implement a brief crossfade (200-300ms opacity blend) when switching basemaps to avoid a flash of grey tiles. Since Maplibre doesn't natively crossfade between styles, use a temporary overlay div that fades out after the new tiles load.
- **Auto-rotate:** Unaffected by basemap choice. No changes needed.
- **Mobile/responsive:** Popover must not overflow viewport on narrow screens. On small viewports, reduce thumbnail size or switch to 2x3 portrait grid.
- **localStorage corruption:** If persisted basemap ID is invalid, fall back to `intel`.

## Keyboard Shortcut

Add `B` key to cycle through basemaps (Intel → Satellite → Terrain → Light → Oceanic → Political → Intel). Integrates with existing keyboard shortcuts infrastructure in `frontend/src/components/keyboard-shortcuts.ts`.

## Prerequisites

**Raster PMTiles for Satellite and Terrain** do not exist yet and must be sourced/converted before those two styles can be implemented:

- **Satellite:** Convert Sentinel-2 or USGS open imagery to raster PMTiles using `pmtiles convert`. Host on Cloudflare R2 or S3. Target zoom 0-12 globally (~5-10GB).
- **Terrain hillshade:** Convert Mapzen Terrain Tiles (available on AWS Open Data) to PMTiles. Target zoom 0-12 (~2-5GB).

The 4 vector styles (Intel, Light, Oceanic, Political) have no prerequisites — they restyle the existing Protomaps PMTiles source. Implementation should start with these 4, then add Satellite and Terrain once raster tiles are available.

## Future Considerations (not in scope)

- **Preset-basemap coupling:** Layer presets (Trade Risk, Conflict Zone) could auto-switch basemap. Deferred — keep them independent for now.
- **URL state:** Basemap as a URL parameter for shareable map links.
- **Custom basemap uploads:** Let users provide their own PMTiles or style JSON.

## Files to Create/Modify

| Action | File | Change |
|--------|------|--------|
| Create | `frontend/src/map/basemap-styles.ts` | Style definitions for all 6 basemaps |
| Create | `frontend/src/components/basemap-picker.tsx` | Picker button + popover component |
| Modify | `frontend/src/map/flat-view.ts` | Remove hardcoded style, use basemap signal |
| Modify | `frontend/src/map/deck-map.tsx` | Ocean polygon color per basemap |
| Modify | `frontend/src/map/deck-map.tsx` | Day/night tint scale per basemap |
| Modify | `frontend/src/state/store.ts` | Add `basemap` signal + localStorage persistence |
| Modify | `frontend/src/app.tsx` | Mount basemap picker in bottom-right controls |
| Modify | `frontend/src/components/keyboard-shortcuts.ts` | Add `B` key shortcut |
