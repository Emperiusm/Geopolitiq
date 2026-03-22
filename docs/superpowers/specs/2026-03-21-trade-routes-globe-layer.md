# Trade Routes Globe Layer — Design Spec

**Date:** 2026-03-21
**Status:** Approved
**Scope:** Gambit frontend — Deck.GL trade routes layer with risk-glow arcs, port markers, waypoint highlights, floating detail card, and category filter

---

## Goal

Replace the minimal static `ArcLayer` in `trade-routes.ts` with a fully interactive trade routes visualization on the 3D globe. Users should be able to see which major shipping corridors are disrupted at a glance, click any route or port for detail, and filter by cargo category.

---

## Visual Direction

**B + C combined:**
- **Risk Glow (B):** Arc color encodes disruption status. Disrupted routes pulse red; active routes are teal. A wide transparent halo behind each arc simulates a glow bloom (no CSS animation — static, GPU-rendered).
- **Select-to-Highlight (C):** Ports are the primary visible markers. All routes render at low opacity until a route or port is clicked. Selected route goes full cyan; all others dim to 15%.

**Port-to-port arcs (Approach A):** One great-circle arc per route from source port to destination port. Chokepoint waypoints are hidden by default and appear as amber markers only on the selected route (unless the Chokepoints layer is already on, in which case the waypoint sub-layer is skipped to avoid double-rendering).

---

## Data Model

### Source (bootstrap — no new API endpoints)

Bootstrap already returns all required data:

```ts
bootstrapData.value.tradeRoutes[]  // { _id, name, from, to, category, status, volumeDesc, waypoints[] }
bootstrapData.value.ports[]        // { _id, name, lat, lng }
bootstrapData.value.chokepoints[]  // { _id, name, lat, lng, status }
```

### Field Mismatch Fix

The existing `TradeRoute` frontend interface uses different field names from the seed data. The resolver remaps at runtime:

| Seed field | Interface field | Notes |
|---|---|---|
| `from` | `source` | Port ID → port name via lookup |
| `to` | `destination` | Port ID → port name via lookup |
| `volumeDesc` | displayed directly | Replaces broken `volumePerDay` |
| `status: 'disrupted'` | `disruptionRisk: 'high'` | Mapped in resolver |
| `status: 'active'` | `disruptionRisk: 'low'` | Mapped in resolver |

### Resolved Structures

`resolveTradeArcs(tradeRoutes, ports, chokepoints)` runs once on bootstrap load (pure in-memory join, <1ms for 21 routes):

```ts
interface ResolvedArc {
  route: any;           // full original route doc
  fromLng: number;
  fromLat: number;
  toLng: number;
  toLat: number;
  color: [number, number, number, number];  // RGBA risk color
  width: number;        // by category
}

interface ResolvedPort {
  id: string;
  name: string;
  lng: number;
  lat: number;
  routeIds: string[];   // all routes this port appears in
}

// waypointsByRoute: Map<routeId, { id, name, lng, lat, status }[]>
```

**Color encoding:**
- `status === 'disrupted'` → `[255, 64, 88, 220]` red
- `status === 'active'` → `[20, 184, 166, 180]` teal

**Width by category:**
- `container` → 2.5px
- `energy` → 2.0px
- `bulk` → 1.5px

Routes with unresolvable `from` or `to` (port not in ports collection) are silently skipped.

---

## Layer Architecture

`createTradeRoutesLayer(arcs, ports, waypointsByRoute, selectedId, onSelectRoute, onSelectPort, visible, showChokepoints)` returns an array of 4 Deck.GL layers.

### Layer 1 — Glow Halo (`ArcLayer`)
```
id: 'trade-routes-glow'
getWidth: width * 5
opacity: disrupted ? 0.12 : 0.06
getSourceColor / getTargetColor: route color
greatCircle: true
updateTriggers: { getSourceColor: [selectedId], getTargetColor: [selectedId] }
pickable: false
```

### Layer 2 — Core Arc (`ArcLayer`)
```
id: 'trade-routes-core'
getWidth: route width
getSourceColor / getTargetColor:
  - if nothing selected: route color
  - if selectedId matches: [0, 229, 204, 255]  cyan
  - if selectedId set but no match: route color at 15% opacity
greatCircle: true
pickable: true
onClick: (info) => onSelectRoute(info.object.route)
onHover: (info) => show tooltip (name, status, volumeDesc)
updateTriggers: { getSourceColor: [selectedId], getTargetColor: [selectedId], getWidth: [selectedId] }
```

### Layer 3 — Port Markers (`ScatterplotLayer`)
```
id: 'trade-routes-ports'
data: resolved ports (only those appearing in visible + filtered routes)
getPosition: [lng, lat]
getFillColor:
  - selected route's ports: [0, 229, 204, 255]
  - other ports (nothing selected): [20, 184, 166, 180]
  - other ports (something selected): [20, 184, 166, 50]
getRadius: selected port → 120000, others → 80000
radiusMinPixels: selected → 7, others → 4
radiusMaxPixels: 18
pickable: true
onClick: (info) => onSelectPort(info.object)
updateTriggers: { getFillColor: [selectedId], getRadius: [selectedId] }
```

### Layer 4 — Waypoints (`ScatterplotLayer`)
```
id: 'trade-routes-waypoints'
data: waypointsByRoute.get(selectedId) ?? []
visible: selectedId !== null && !showChokepoints
getPosition: [lng, lat]
getFillColor: [255, 176, 32, 220]  amber
getRadius: 90000
radiusMinPixels: 5
radiusMaxPixels: 14
pickable: false
```

> **Note:** Layer 4 is suppressed (`visible: false`) when the Chokepoints layer is on, preventing double-rendering of the same chokepoint markers.

---

## State

Two new signals added to `src/state/store.ts`:

```ts
export const selectedTradeRoute = signal<any | null>(null);
export const tradeRouteFilter = signal<Set<'energy' | 'container' | 'bulk'>>(
  new Set(['energy', 'container', 'bulk'])  // all on by default
);
```

`selectedTradeRoute` is independent of `selectedCountry` — they do not clear each other.

### Actions
```ts
export function selectTradeRoute(route: any | null) {
  selectedTradeRoute.value = route;
}
```

---

## Interaction Model

| User action | Result |
|---|---|
| Hover arc | Tooltip appears: route name + status badge + volumeDesc |
| Click arc | `selectTradeRoute(route)` → floating card opens |
| Click port marker | Highlights all routes through that port; floating card shows port name + route list |
| Click empty globe | `selectTradeRoute(null)` → card closes, all routes return to default opacity |
| Layer toggle off | All 4 sub-layers hidden; `selectedTradeRoute` cleared |

---

## Floating Card

`TradeRoutesPanel` is promoted from a plain display component to a draggable floating card, following the same pattern as `GraphExplorer`:

- **Default position:** bottom-left (`{ x: 20, y: auto }`, above the timeline scrubber)
- **Draggable** via header mousedown
- **Close button** → `selectTradeRoute(null)`
- **No resize** handle (fixed size, compact)

**Card content (route selected):**
- Route name (large)
- Source → Destination
- Volume description
- Category badge + Disruption risk badge
- Waypoints list: chokepoint names with their current status

**Card content (port selected):**
- Port name + country
- List of routes through this port, each with status badge
- Clicking a route in the list selects it

---

## Layer Menu Changes

Two additions to the trade routes section in `layer-menu.tsx`:

**1 — Disruption count badge**
When trade routes are enabled and at least one disrupted route exists, show inline: `Trade Routes · 3 disrupted` in red. Count is derived from `bootstrapData.value.tradeRoutes` filtered by `tradeRouteFilter`.

**2 — Category chips**
Three toggle chips below the trade routes toggle row:
```
[Energy]  [Container]  [Bulk]
```
All on by default. Multi-select. Drives `tradeRouteFilter` signal. Arcs for filtered-out categories are excluded from all 4 sub-layers. Chips only visible when the trade routes toggle is on.

---

## Files Changed

| File | Type | Description |
|---|---|---|
| `src/layers/trade-routes.ts` | Modify | Full rewrite — 4 sub-layers, resolved data, updateTriggers |
| `src/layers/trade-routes-resolver.ts` | Create | `resolveTradeArcs()` utility — client-side data join |
| `src/state/store.ts` | Modify | Add `selectedTradeRoute`, `tradeRouteFilter` signals + `selectTradeRoute()` action |
| `src/panels/trade-routes-panel.tsx` | Modify | Promote to draggable floating card; add port-selected view |
| `src/panels/layer-menu.tsx` | Modify | Category chips + disruption count badge |
| Main deck-map component | Modify | Wire onClick/onHover callbacks; pass `selectedId` + `showChokepoints` to layer factory |

---

## Out of Scope

- Animated arc flow (no requestAnimationFrame opacity pulses — static glow only)
- Historical route data / timeline scrubbing
- Route editing or admin UI
- News feed integration (surface related articles when route selected)
- Backend changes of any kind
