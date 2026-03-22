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
- **Risk Glow (B):** Arc color encodes disruption status. Disrupted routes are red; active routes are teal. A wide transparent halo behind each arc simulates a glow bloom (static, GPU-rendered — no CSS or rAF animation).
- **Select-to-Highlight (C):** Ports are the primary visible markers. All routes render at low opacity until a route or port is clicked. Selected route goes full cyan; all others dim to 15%.

**Port-to-port arcs (Approach A):** One great-circle arc per route from source port to destination port. Chokepoint waypoints are hidden by default and appear as amber markers only on the selected route (unless the Chokepoints layer is already on, in which case the waypoint sub-layer is skipped to avoid double-rendering).

---

## Data Model

### Source (bootstrap — no new API endpoints)

Bootstrap already returns all required data:

```ts
bootstrapData.value.tradeRoutes[]  // { _id, name, from, to, category, status, volumeDesc, waypoints: string[] }
bootstrapData.value.ports[]        // { _id, name, lat, lng, country }
bootstrapData.value.chokepoints[]  // { _id, name, lat, lng, status }
```

**Bootstrap ports projection must be widened** to include `country`. Update `SLIM_PROJECTIONS.ports` in `bootstrap.ts` from `{ _id: 1, name: 1, lat: 1, lng: 1 }` to `{ _id: 1, name: 1, lat: 1, lng: 1, country: 1 }`. This adds one small string field per port (37 ports).

> **Cache invalidation:** The bootstrap response is cached in Redis under `gambit:bootstrap:slim` for 3600 seconds. After deploying this projection change, flush that key (`DEL gambit:bootstrap:slim` via redis-cli or the admin panel) so the `country` field is visible immediately rather than after the TTL expires.

**Trade route `_id`** is the human-readable string id (e.g. `"china-europe-suez"`), not a MongoDB ObjectId — this is how all reference collections are seeded in Gambit. Selection comparisons use this string directly.

**Waypoint IDs** stored in MongoDB are already normalized short-form strings (`"malacca"`, `"suez"`, `"bab-el-mandeb"`, etc.) via `normalizeWaypointId()` at seed time. These match `chokepoint._id` directly — no additional transformation needed in the resolver.

### Field Mismatch Fix

The existing `TradeRoute` frontend interface uses different field names from the seed data. The resolver remaps at runtime:

| Seed field | Resolved to | Notes |
|---|---|---|
| `from` | `source` | Resolved to port `name` string via port lookup |
| `to` | `destination` | Resolved to port `name` string via port lookup |
| `volumeDesc` | displayed directly | Replaces broken `volumePerDay` / `volumeUnit` |
| `status: 'disrupted'` | `disruptionRisk: 'high'` | Mapped in resolver |
| `status: 'active'` | `disruptionRisk: 'low'` | Mapped in resolver |
| any other `status` | `disruptionRisk: 'low'` | Fallback — treated as active |

### Resolved Structures

`resolveTradeArcs(tradeRoutes, ports, chokepoints)` runs **once on bootstrap load**, not in the render loop. It should be called inside a `useEffect` (or equivalent) that watches `bootstrapData` and stores results in a ref or signal. This is a pure in-memory join (<1ms for 21 routes) that produces stable objects until bootstrap refreshes.

```ts
interface ResolvedArc {
  route: any;           // full original route doc with remapped fields (source, destination, disruptionRisk)
  fromPortId: string;   // port._id — used for port card route-list filtering
  toPortId: string;     // port._id
  fromLng: number;
  fromLat: number;
  toLng: number;
  toLat: number;
  label: string;        // pre-formatted tooltip string: "${name} · ${status} · ${volumeDesc}"
  color: [number, number, number, number];  // RGBA risk color
  width: number;        // by category
}

interface ResolvedPort {
  _id: string;          // matches port._id from bootstrap (e.g. "shanghai")
  name: string;
  lng: number;
  lat: number;
  country: string;
  routeIds: string[];   // _ids of all routes this port appears in as from/to
}

// waypointsByRoute: Map<routeId, { _id: string; name: string; lng: number; lat: number; status: string }[]>
// Built by matching tradeRoute.waypoints[i] === chokepoint._id (direct string equality)
// Waypoint IDs with no matching chokepoint are silently skipped
```

**Color encoding:**
- `status === 'disrupted'` → `[255, 64, 88, 220]` red
- `status === 'active'` (or unknown) → `[20, 184, 166, 180]` teal

**Width by category:**
- `container` → 2.5
- `energy` → 2.0
- `bulk` → 1.5
- unknown → 1.5 (fallback)

Routes with unresolvable `from` or `to` (port `_id` not found in ports collection) are silently skipped.

> **Data quality note:** Several routes have geographic labelling issues in the seed (e.g. "Australia -> East Asia" uses Richards Bay, South Africa as the origin; "Nigeria -> Europe" uses Mombasa, Kenya). These are content errors not code bugs — they will render correctly as long as the port IDs resolve. The waypoint `"taiwan"` used by `intra-asia-container` has no matching chokepoint and will be silently skipped.

---

## Layer Architecture

```ts
createTradeRoutesLayer(
  arcs: ResolvedArc[],             // pre-filtered by tradeRouteFilter
  allArcs: ResolvedArc[],          // full unfiltered list (for port card route list)
  ports: ResolvedPort[],           // ports referenced by arcs
  waypointsByRoute: Map<string, WaypointData[]>,
  selectedRouteId: string | null,
  selectedPortId: string | null,
  onSelectRoute: (route: any) => void,
  onSelectPort: (port: ResolvedPort) => void,
  visible: boolean,
  showChokepoints: boolean,
): Layer[]
```

Returns an array of **5 Deck.GL layers**. All `get*` functions use per-datum accessor form `(d) => ...`.

### Layer 1 — Glow Halo (`ArcLayer`)
```
id: 'trade-routes-glow'
data: arcs
getWidth: (d) => d.width * 5
getSourceColor: (d) => [...d.color.slice(0,3), d.route.status === 'disrupted' ? 30 : 15]
getTargetColor: same as getSourceColor
greatCircle: true
pickable: false
updateTriggers: { getSourceColor: [selectedRouteId], getTargetColor: [selectedRouteId] }
```

### Layer 2 — Core Arc (`ArcLayer`)
```
id: 'trade-routes-core'
data: arcs
getWidth: (d) => d.width
getSourceColor: (d) =>
  selectedRouteId === null         ? d.color
  selectedRouteId === d.route._id  ? [0, 229, 204, 255]        // cyan
  otherwise                        : [...d.color.slice(0,3), 38]  // ~15% opacity
getTargetColor: same logic as getSourceColor
greatCircle: true
pickable: true
onClick: (info) => info.object && onSelectRoute(info.object.route)
onHover: drives tooltip — see Hover Tooltip below
updateTriggers: { getSourceColor: [selectedRouteId], getTargetColor: [selectedRouteId] }
```

### Layer 3 — Port Markers, unselected (`ScatterplotLayer`)
```
id: 'trade-routes-ports'
data: ports (excluding the currently selected port)
getPosition: (d) => [d.lng, d.lat]
getFillColor: (d) =>
  selectedRouteId set and d._id in selected route's from/to → [0, 229, 204, 255]
  nothing selected → [20, 184, 166, 180]
  something selected and this port is not an endpoint → [20, 184, 166, 50]
getRadius: () => 80000
radiusMinPixels: 4
radiusMaxPixels: 14
pickable: true
onClick: (info) => info.object && onSelectPort(info.object)
updateTriggers: { getFillColor: [selectedRouteId, selectedPortId], data: [selectedPortId] }
```

### Layer 4 — Port Marker, selected (`ScatterplotLayer`)
```
id: 'trade-routes-port-selected'
data: selectedPortId ? [ports.find(p => p._id === selectedPortId)] : []
getPosition: (d) => [d.lng, d.lat]
getFillColor: () => [0, 229, 204, 255]
getRadius: () => 120000
radiusMinPixels: 7
radiusMaxPixels: 18
pickable: false
updateTriggers: { data: [selectedPortId] }
```

> Layers 3 and 4 are split so that `radiusMinPixels` (a scalar layer prop, not per-datum) can differ between selected and unselected ports.

### Layer 5 — Waypoints (`ScatterplotLayer`)
```
id: 'trade-routes-waypoints'
data: waypointsByRoute.get(selectedRouteId) ?? []
visible: selectedRouteId !== null && !showChokepoints
getPosition: (d) => [d.lng, d.lat]
getFillColor: () => [255, 176, 32, 220]   amber
getRadius: () => 90000
radiusMinPixels: 5
radiusMaxPixels: 14
pickable: false
```

> Layer 5 is suppressed when the Chokepoints layer is on (`showChokepoints: true`), preventing double-rendering of the same chokepoint markers.

### Hover Tooltip

The existing `onHover` handler in deck-map reads `info.object.name ?? info.object.title ?? info.object.label ?? info.layer.id`. `ResolvedArc` has none of these fields by default, so the `label` field is added to `ResolvedArc` (see above) with the pre-formatted string. No changes to deck-map's `onHover` handler are needed — it will pick up `d.label` automatically.

---

## State

**One new file to add** to the bootstrap projection. Three new signals added to `src/state/store.ts`:

```ts
export const selectedTradeRoute = signal<any | null>(null);
export const selectedPort = signal<ResolvedPort | null>(null);
export const tradeRouteFilter = signal<Set<'energy' | 'container' | 'bulk'>>(
  new Set(['energy', 'container', 'bulk'])  // all on by default
);
```

`selectedTradeRoute` and `selectedCountry` are independent — they do not clear each other.
`selectedTradeRoute` and `selectedPort` are mutually exclusive — selecting one clears the other.

### Actions
```ts
export function selectTradeRoute(route: any | null) {
  selectedTradeRoute.value = route;
  selectedPort.value = null;
}

export function selectPort(port: ResolvedPort | null) {
  selectedPort.value = port;
  selectedTradeRoute.value = null;
}
```

**Layer toggle side-effect:** Update the `toggleLayer()` action so that toggling `tradeRoutes` off also calls `selectTradeRoute(null)` and `selectPort(null)`.

---

## Interaction Model

| User action | Result |
|---|---|
| Hover arc | DOM tooltip: `name · status · volumeDesc` |
| Click arc | `selectTradeRoute(route)` → floating card shows route view |
| Click port marker | `selectPort(port)` → floating card shows port view; all routes through that port highlight |
| Click empty globe | `selectTradeRoute(null)` + `selectPort(null)` → card closes |
| Layer toggle off | All 5 sub-layers hidden; `selectedTradeRoute` and `selectedPort` cleared |

**Click handling — layer vs deck level:**
- Route and port selection (`onSelectRoute`, `onSelectPort`) are handled entirely at the **layer level** via per-layer `onClick` props on Layers 2 and 3. Deck.GL calls these before the deck-level handler.
- The deck-map's central `onClick` handler handles **empty-canvas deselection** only. Its current guard `if (!info.object) return` should become:
```ts
if (!info.object) {
  selectTradeRoute(null);
  selectPort(null);
  return;
}
```
The existing `if (info.object)` branch is unchanged. No existing country/entity deselection logic lives in the `!info.object` path — it is currently just an early return.

---

## Floating Card

`TradeRoutesPanel` is promoted from a plain display component to a draggable floating card, following the same pattern as `GraphExplorer`. It is **conditionally rendered** (not always mounted): shown only when `selectedTradeRoute.value !== null || selectedPort.value !== null`.

**New component signature:**
```ts
interface TradeRoutesPanelProps {
  route: any | null;            // set when a route is selected
  port: ResolvedPort | null;    // set when a port is selected (mutually exclusive with route)
  allArcs: ResolvedArc[];       // pre-filter full arc list — used to list routes through port
  onClose: () => void;          // calls selectTradeRoute(null) + selectPort(null)
  onSelectRoute: (route: any) => void;  // switches card from port view to route view
}
```

- **Default position:** bottom-left `{ x: 20, y: 80 }`
- **Draggable** via header mousedown (same pattern as GraphExplorer)
- **Close button** → `onClose()`
- **No resize** handle (fixed width 340px, height auto)

**Card content — route selected (`route !== null`):**
- Route name (large)
- Source → Destination (resolved port names)
- Volume description (`volumeDesc`)
- Category badge + Disruption risk badge
- Waypoints list: chokepoint names with status indicator

**Card content — port selected (`port !== null`):**
- Port name + country
- Routes through this port: derived from `allArcs.filter(a => a.fromPortId === port._id || a.toPortId === port._id)` — uses `fromPortId`/`toPortId` (the original port `_id` strings on `ResolvedArc`) and the **pre-filter** `allArcs` so routes in toggled-off categories still appear in the port summary
- Each route listed with name + status badge
- Clicking a route row calls `onSelectRoute(route)`

---

## Layer Menu Changes

Two additions to the trade routes section in `layer-menu.tsx`:

**1 — Disruption count badge**
When trade routes are enabled, show inline: `Trade Routes · N disrupted` (red) when N > 0. Count is derived from the **resolved arcs array** (not raw `bootstrapData`), filtered by the current `tradeRouteFilter` — so the count exactly matches what is rendered on the globe.

**2 — Category chips**
Three toggle chips rendered below the trade routes toggle row, visible only when the toggle is on:
```
[Energy]  [Container]  [Bulk]
```
All on by default. Multi-select. Drives `tradeRouteFilter` signal. When a category is toggled off, arcs of that category are excluded from `arcs` (but not `allArcs`) passed to the layer factory. At least one category must remain selected — prevent all-off state in the toggle handler.

---

## Files Changed

| File | Type | Description |
|---|---|---|
| `src/layers/trade-routes.ts` | Modify | Full rewrite — 5 sub-layers, accessor functions, updateTriggers |
| `src/layers/trade-routes-resolver.ts` | Create | `resolveTradeArcs()` utility — client-side data join, field remapping |
| `src/state/store.ts` | Modify | Add `selectedTradeRoute`, `selectedPort`, `tradeRouteFilter` signals + `selectTradeRoute()`, `selectPort()` actions; update `toggleLayer()` to clear selections on trade routes toggle-off |
| `src/panels/trade-routes-panel.tsx` | Modify | Promote to draggable floating card; new prop signature; route + port views |
| `src/panels/layer-menu.tsx` | Modify | Category chips + disruption count badge (from resolved arcs) |
| `api/src/modules/aggregate/bootstrap.ts` | Modify | Widen ports projection to include `country` field |
| Main deck-map component | Modify | Call `resolveTradeArcs()` on bootstrap load (in `useEffect`/`useMemo`); pass `arcs`, `allArcs`, `ports`, `waypointsByRoute`, `selectedRouteId`, `selectedPortId`, `showChokepoints` to layer factory; restructure empty-canvas `onClick` guard to call `selectTradeRoute(null)` + `selectPort(null)` |

---

## Out of Scope

- Animated arc flow (no requestAnimationFrame opacity pulses — static glow only)
- Historical route data / timeline scrubbing
- Route editing or admin UI
- News feed integration (surface related articles when route selected)
