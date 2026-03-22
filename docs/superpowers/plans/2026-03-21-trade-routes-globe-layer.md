# Trade Routes Globe Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-arc stub in `trade-routes.ts` with a fully interactive trade routes visualization: 5 Deck.GL sub-layers (glow halo, core arc, port markers, selected port, waypoints), client-side data resolver, floating draggable detail card, and category filter chips in the layer menu.

**Architecture:** A pure `resolveTradeArcs()` utility joins bootstrap data (tradeRoutes + ports + chokepoints) into stable `ResolvedArc[]` and `ResolvedPort[]` structures once on load. The layer factory consumes these pre-resolved structures directly. Selection state lives in three new Preact Signals (`selectedTradeRoute`, `selectedPort`, `tradeRouteFilter`) that the layer factory and floating card both read.

**Tech Stack:** Deck.GL 9 `ArcLayer` + `ScatterplotLayer`, Preact Signals (`@preact/signals`), Vitest for resolver unit tests, TypeScript strict mode.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `frontend/src/layers/trade-routes-resolver.ts` | Create | Pure `resolveTradeArcs()` join — tradeRoutes + ports + chokepoints → `ResolvedArc[]`, `ResolvedPort[]`, `Map<routeId, WaypointData[]>` |
| `frontend/src/layers/trade-routes.ts` | Rewrite | `createTradeRoutesLayer()` factory — 5 Deck.GL sub-layers with selection-aware accessors |
| `frontend/src/state/store.ts` | Modify | Add `selectedTradeRoute`, `selectedPort`, `tradeRouteFilter` signals + `selectTradeRoute()`, `selectPort()` actions; update `toggleLayer()` |
| `frontend/src/map/deck-map.tsx` | Modify | Run resolver once on bootstrap load (via `useEffect`); pass all resolved data + selection signals to layer factory; fix `onClick` empty-canvas guard |
| `frontend/src/panels/trade-routes-panel.tsx` | Rewrite | Promote to draggable floating card with route view and port view |
| `frontend/src/panels/layer-menu.tsx` | Modify | Add category chips (Energy/Container/Bulk) + disruption count badge beneath trade routes toggle |
| `frontend/src/app.tsx` | Modify | Conditionally render `TradeRoutesPanel` overlay (like `GraphExplorer`) |
| `api/src/modules/aggregate/bootstrap.ts` | Modify | Widen `SLIM_PROJECTIONS.ports` to include `country` field |

---

## Task 1: Widen Bootstrap Ports Projection

**Files:**
- Modify: `api/src/modules/aggregate/bootstrap.ts:20`

The `country` field is needed for the port detail card. Currently the slim projection excludes it.

- [ ] **Step 1: Update the projection**

In `api/src/modules/aggregate/bootstrap.ts`, change line 20:

```ts
// Before
ports: { _id: 1, name: 1, lat: 1, lng: 1 },

// After
ports: { _id: 1, name: 1, lat: 1, lng: 1, country: 1 },
```

- [ ] **Step 2: Flush the Redis cache**

The bootstrap response is cached as `gambit:bootstrap:slim` for 3600s. After deploying, flush it:

```bash
# via redis-cli (or use the Gambit admin panel if available)
redis-cli DEL gambit:bootstrap:slim
```

Without this flush, the `country` field will be absent until the TTL expires even though the code is updated.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd api && bun run typecheck
```

Expected: no errors related to the projection change.

- [ ] **Step 4: Commit**

```bash
git add api/src/modules/aggregate/bootstrap.ts
git commit -m "feat: widen bootstrap ports projection to include country field"
```

---

## Task 2: Create the Trade Routes Resolver

**Files:**
- Create: `frontend/src/layers/trade-routes-resolver.ts`
- Create: `frontend/src/layers/trade-routes-resolver.test.ts`

`resolveTradeArcs()` is a pure function — no signals, no side-effects, no DOM. It takes raw bootstrap arrays and returns stable resolved structures. This is the right place to put field remapping and data-quality silencing.

### 2a — Write the failing tests first

- [ ] **Step 1: Create the test file**

Create `frontend/src/layers/trade-routes-resolver.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveTradeArcs } from './trade-routes-resolver';

const ports = [
  { _id: 'shanghai', name: 'Shanghai', lat: 31.2, lng: 121.5, country: 'China' },
  { _id: 'rotterdam', name: 'Rotterdam', lat: 51.9, lng: 4.5, country: 'Netherlands' },
  { _id: 'singapore', name: 'Singapore', lat: 1.3, lng: 103.8, country: 'Singapore' },
];

const chokepoints = [
  { _id: 'malacca', name: 'Strait of Malacca', lat: 2.5, lng: 101.5, status: 'active' },
  { _id: 'suez', name: 'Suez Canal', lat: 30.5, lng: 32.3, status: 'disrupted' },
];

const tradeRoutes = [
  {
    _id: 'china-europe-suez',
    name: 'China–Europe (Suez)',
    from: 'shanghai',
    to: 'rotterdam',
    category: 'container',
    status: 'active',
    volumeDesc: '20,000 TEU/day',
    waypoints: ['malacca', 'suez'],
  },
  {
    _id: 'disrupted-route',
    name: 'Disrupted Route',
    from: 'singapore',
    to: 'rotterdam',
    category: 'energy',
    status: 'disrupted',
    volumeDesc: '5M bbl/day',
    waypoints: [],
  },
  {
    _id: 'broken-port',
    name: 'Route with missing port',
    from: 'nonexistent-port',
    to: 'rotterdam',
    category: 'bulk',
    status: 'active',
    volumeDesc: '',
    waypoints: [],
  },
];

describe('resolveTradeArcs', () => {
  const { arcs, portList, waypointsByRoute } = resolveTradeArcs(tradeRoutes, ports, chokepoints);

  it('skips routes with unresolvable port IDs', () => {
    expect(arcs.length).toBe(2);
    expect(arcs.find(a => a.route._id === 'broken-port')).toBeUndefined();
  });

  it('remaps from/to → source/destination using port names', () => {
    const arc = arcs.find(a => a.route._id === 'china-europe-suez')!;
    expect(arc.route.source).toBe('Shanghai');
    expect(arc.route.destination).toBe('Rotterdam');
  });

  it('maps status:disrupted → disruptionRisk:high, active → low', () => {
    const active = arcs.find(a => a.route._id === 'china-europe-suez')!;
    const disrupted = arcs.find(a => a.route._id === 'disrupted-route')!;
    expect(active.route.disruptionRisk).toBe('low');
    expect(disrupted.route.disruptionRisk).toBe('high');
  });

  it('sets red color for disrupted routes, teal for active', () => {
    const active = arcs.find(a => a.route._id === 'china-europe-suez')!;
    const disrupted = arcs.find(a => a.route._id === 'disrupted-route')!;
    expect(active.color).toEqual([20, 184, 166, 180]);
    expect(disrupted.color).toEqual([255, 64, 88, 220]);
  });

  it('sets width by category', () => {
    const container = arcs.find(a => a.route.category === 'container')!;
    const energy = arcs.find(a => a.route.category === 'energy')!;
    expect(container.width).toBe(2.5);
    expect(energy.width).toBe(2.0);
  });

  it('stores fromPortId and toPortId as original _id strings', () => {
    const arc = arcs.find(a => a.route._id === 'china-europe-suez')!;
    expect(arc.fromPortId).toBe('shanghai');
    expect(arc.toPortId).toBe('rotterdam');
  });

  it('builds label as "name · status · volumeDesc"', () => {
    const arc = arcs.find(a => a.route._id === 'china-europe-suez')!;
    expect(arc.label).toBe('China–Europe (Suez) · active · 20,000 TEU/day');
  });

  it('builds portList with routeIds for each port that appears', () => {
    const shanghai = portList.find(p => p._id === 'shanghai')!;
    expect(shanghai.routeIds).toContain('china-europe-suez');
  });

  it('builds waypointsByRoute with matching chokepoint data', () => {
    const waypoints = waypointsByRoute.get('china-europe-suez')!;
    expect(waypoints.length).toBe(2);
    expect(waypoints[0]._id).toBe('malacca');
    expect(waypoints[1]._id).toBe('suez');
  });

  it('silently skips waypoint IDs with no matching chokepoint', () => {
    const routes = [{ ...tradeRoutes[0], waypoints: ['taiwan', 'suez'] }];
    const { waypointsByRoute: wpMap } = resolveTradeArcs(routes, ports, chokepoints);
    const wps = wpMap.get('china-europe-suez')!;
    // Only 'suez' should be present — 'taiwan' has no matching chokepoint
    expect(wps.length).toBe(1);
    expect(wps[0]._id).toBe('suez');
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd frontend && bun run test src/layers/trade-routes-resolver.test.ts
```

Expected: FAIL — `Cannot find module './trade-routes-resolver'`

### 2b — Implement the resolver

- [ ] **Step 3: Create the resolver**

Create `frontend/src/layers/trade-routes-resolver.ts`:

```ts
export interface ResolvedArc {
  route: {
    _id: string;
    name: string;
    source: string;
    destination: string;
    category: string;
    status: string;
    volumeDesc: string;
    disruptionRisk: 'low' | 'high';
  };
  fromPortId: string;
  toPortId: string;
  fromLng: number;
  fromLat: number;
  toLng: number;
  toLat: number;
  label: string;
  color: [number, number, number, number];
  width: number;
}

export interface ResolvedPort {
  _id: string;
  name: string;
  lng: number;
  lat: number;
  country: string;
  routeIds: string[];
}

export interface WaypointData {
  _id: string;
  name: string;
  lng: number;
  lat: number;
  status: string;
}

const CATEGORY_WIDTH: Record<string, number> = {
  container: 2.5,
  energy: 2.0,
  bulk: 1.5,
};

export function resolveTradeArcs(
  tradeRoutes: any[],
  ports: any[],
  chokepoints: any[],
): {
  arcs: ResolvedArc[];
  portList: ResolvedPort[];
  waypointsByRoute: Map<string, WaypointData[]>;
} {
  const portMap = new Map<string, any>(ports.map(p => [p._id, p]));
  const chokepointMap = new Map<string, any>(chokepoints.map(c => [c._id, c]));

  // Track which route IDs each port appears in
  const portRouteIds = new Map<string, Set<string>>();

  const arcs: ResolvedArc[] = [];
  const waypointsByRoute = new Map<string, WaypointData[]>();

  for (const route of tradeRoutes) {
    const fromPort = portMap.get(route.from);
    const toPort = portMap.get(route.to);
    if (!fromPort || !toPort) continue; // silently skip unresolvable routes

    const disruptionRisk: 'low' | 'high' = route.status === 'disrupted' ? 'high' : 'low';
    const color: [number, number, number, number] =
      route.status === 'disrupted'
        ? [255, 64, 88, 220]
        : [20, 184, 166, 180];

    arcs.push({
      route: {
        _id: route._id,
        name: route.name,
        source: fromPort.name,
        destination: toPort.name,
        category: route.category ?? '',
        status: route.status ?? 'active',
        volumeDesc: route.volumeDesc ?? '',
        disruptionRisk,
      },
      fromPortId: route.from,
      toPortId: route.to,
      fromLng: fromPort.lng,
      fromLat: fromPort.lat,
      toLng: toPort.lng,
      toLat: toPort.lat,
      label: `${route.name} · ${route.status} · ${route.volumeDesc ?? ''}`,
      color,
      width: CATEGORY_WIDTH[route.category] ?? 1.5,
    });

    // Track route membership for port detail card
    if (!portRouteIds.has(route.from)) portRouteIds.set(route.from, new Set());
    if (!portRouteIds.has(route.to)) portRouteIds.set(route.to, new Set());
    portRouteIds.get(route.from)!.add(route._id);
    portRouteIds.get(route.to)!.add(route._id);

    // Resolve waypoints
    const resolvedWaypoints: WaypointData[] = (route.waypoints ?? [])
      .map((wpId: string) => chokepointMap.get(wpId))
      .filter(Boolean)
      .map((cp: any) => ({ _id: cp._id, name: cp.name, lng: cp.lng, lat: cp.lat, status: cp.status ?? 'active' }));
    waypointsByRoute.set(route._id, resolvedWaypoints);
  }

  // Build portList only for ports that appear in at least one route
  const portList: ResolvedPort[] = [];
  for (const [portId, routeIdSet] of portRouteIds) {
    const port = portMap.get(portId);
    if (!port) continue;
    portList.push({
      _id: port._id,
      name: port.name,
      lng: port.lng,
      lat: port.lat,
      country: port.country ?? '',
      routeIds: Array.from(routeIdSet),
    });
  }

  return { arcs, portList, waypointsByRoute };
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd frontend && bun run test src/layers/trade-routes-resolver.test.ts
```

Expected: all 10 tests PASS.

- [ ] **Step 5: Run TypeScript check**

```bash
cd frontend && bun run typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/layers/trade-routes-resolver.ts frontend/src/layers/trade-routes-resolver.test.ts
git commit -m "feat: add trade routes resolver with field remapping and waypoint join"
```

---

## Task 3: Add Selection State to Store

**Files:**
- Modify: `frontend/src/state/store.ts`

Three new signals and two actions. The mutual-exclusion logic (selecting a route clears the port and vice versa) lives here.

- [ ] **Step 1: Add the ResolvedPort import and new signals**

In `frontend/src/state/store.ts`, after the existing `export const heatmapOpacity` line (~line 138), add:

```ts
// ── Trade Routes selection ────────────────────────────────────

// Import type from resolver — no circular dep since resolver has no store imports
import type { ResolvedPort } from '../layers/trade-routes-resolver';

export const selectedTradeRoute = signal<any | null>(null);
export const selectedPort = signal<ResolvedPort | null>(null);
export const tradeRouteFilter = signal<Set<'energy' | 'container' | 'bulk'>>(
  new Set(['energy', 'container', 'bulk'])
);
```

- [ ] **Step 2: Add the selection actions**

After the `removeFromCompare` function, add:

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

- [ ] **Step 3: Update toggleLayer to clear trade route selection on toggle-off**

Replace the existing `toggleLayer` function:

```ts
// Before:
export function toggleLayer(key: keyof LayerState) {
  layers.value = { ...layers.value, [key]: !layers.value[key] };
}

// After:
export function toggleLayer(key: keyof LayerState) {
  const next = !layers.value[key];
  layers.value = { ...layers.value, [key]: next };
  if (key === 'tradeRoutes' && !next) {
    selectedTradeRoute.value = null;
    selectedPort.value = null;
  }
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && bun run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/state/store.ts
git commit -m "feat: add trade route and port selection signals to store"
```

---

## Task 4: Rewrite the Trade Routes Layer Factory

**Files:**
- Modify: `frontend/src/layers/trade-routes.ts`

Full rewrite from 1 layer to 5 sub-layers. All `get*` accessors are per-datum functions (not scalars). `updateTriggers` are set on any accessor that closes over `selectedRouteId` or `selectedPortId`.

- [ ] **Step 1: Rewrite trade-routes.ts**

Replace the entire file contents:

```ts
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import type { ResolvedArc, ResolvedPort, WaypointData } from './trade-routes-resolver';

export function createTradeRoutesLayer(
  arcs: ResolvedArc[],
  allArcs: ResolvedArc[],
  ports: ResolvedPort[],
  waypointsByRoute: Map<string, WaypointData[]>,
  selectedRouteId: string | null,
  selectedPortId: string | null,
  onSelectRoute: (route: any) => void,
  onSelectPort: (port: ResolvedPort) => void,
  visible: boolean,
  showChokepoints: boolean,
) {
  const unselectedPorts = selectedPortId
    ? ports.filter(p => p._id !== selectedPortId)
    : ports;

  const selectedPortObj = selectedPortId
    ? ports.find(p => p._id === selectedPortId) ?? null
    : null;

  // Which port IDs are endpoints of the currently selected route?
  const selectedRoutePortIds = new Set<string>();
  if (selectedRouteId) {
    const arc = allArcs.find(a => a.route._id === selectedRouteId);
    if (arc) {
      selectedRoutePortIds.add(arc.fromPortId);
      selectedRoutePortIds.add(arc.toPortId);
    }
  }

  return [
    // ── Layer 1: Glow halo (wide, very low opacity, not pickable) ──
    new ArcLayer({
      id: 'trade-routes-glow',
      data: arcs,
      visible,
      pickable: false,
      greatCircle: true,
      getWidth: (d: ResolvedArc) => d.width * 5,
      getSourceColor: (d: ResolvedArc) => [
        ...d.color.slice(0, 3),
        d.route.status === 'disrupted' ? 30 : 15,
      ] as [number, number, number, number],
      getTargetColor: (d: ResolvedArc) => [
        ...d.color.slice(0, 3),
        d.route.status === 'disrupted' ? 30 : 15,
      ] as [number, number, number, number],
      updateTriggers: {
        getSourceColor: [selectedRouteId],
        getTargetColor: [selectedRouteId],
      },
    }),

    // ── Layer 2: Core arc (pickable, selection-aware opacity) ──
    new ArcLayer({
      id: 'trade-routes-core',
      data: arcs,
      visible,
      pickable: true,
      greatCircle: true,
      getWidth: (d: ResolvedArc) => d.width,
      getSourceColor: (d: ResolvedArc) => {
        if (selectedRouteId === null) return d.color;
        if (selectedRouteId === d.route._id) return [0, 229, 204, 255];
        return [...d.color.slice(0, 3), 38] as [number, number, number, number];
      },
      getTargetColor: (d: ResolvedArc) => {
        if (selectedRouteId === null) return d.color;
        if (selectedRouteId === d.route._id) return [0, 229, 204, 255];
        return [...d.color.slice(0, 3), 38] as [number, number, number, number];
      },
      onClick: (info: any) => {
        if (info.object) onSelectRoute(info.object.route);
      },
      updateTriggers: {
        getSourceColor: [selectedRouteId],
        getTargetColor: [selectedRouteId],
      },
    }),

    // ── Layer 3: Unselected port markers ──
    new ScatterplotLayer({
      id: 'trade-routes-ports',
      data: unselectedPorts,
      visible,
      pickable: true,
      getPosition: (d: ResolvedPort) => [d.lng, d.lat],
      getFillColor: (d: ResolvedPort) => {
        if (selectedRouteId && selectedRoutePortIds.has(d._id)) return [0, 229, 204, 255];
        if (selectedRouteId || selectedPortId) return [20, 184, 166, 50];
        return [20, 184, 166, 180];
      },
      getRadius: () => 80000,
      radiusMinPixels: 4,
      radiusMaxPixels: 14,
      onClick: (info: any) => {
        if (info.object) onSelectPort(info.object);
      },
      updateTriggers: {
        getFillColor: [selectedRouteId, selectedPortId],
        data: [selectedPortId],
      },
    }),

    // ── Layer 4: Selected port marker (larger radius, not pickable) ──
    new ScatterplotLayer({
      id: 'trade-routes-port-selected',
      data: selectedPortObj ? [selectedPortObj] : [],
      visible,
      pickable: false,
      getPosition: (d: ResolvedPort) => [d.lng, d.lat],
      getFillColor: () => [0, 229, 204, 255] as [number, number, number, number],
      getRadius: () => 120000,
      radiusMinPixels: 7,
      radiusMaxPixels: 18,
      updateTriggers: {
        data: [selectedPortId],
      },
    }),

    // ── Layer 5: Waypoints on selected route (amber, suppressed when chokepoints layer is on) ──
    new ScatterplotLayer({
      id: 'trade-routes-waypoints',
      data: selectedRouteId ? (waypointsByRoute.get(selectedRouteId) ?? []) : [],
      visible: visible && selectedRouteId !== null && !showChokepoints,
      pickable: false,
      getPosition: (d: WaypointData) => [d.lng, d.lat],
      getFillColor: () => [255, 176, 32, 220] as [number, number, number, number],
      getRadius: () => 90000,
      radiusMinPixels: 5,
      radiusMaxPixels: 14,
    }),
  ];
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && bun run typecheck
```

Expected: no errors in `trade-routes.ts`. (deck-map.tsx will have errors because the call signature changed — those get fixed in Task 5.)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/layers/trade-routes.ts
git commit -m "feat: rewrite trade routes layer to 5 sub-layers with glow, ports, waypoints"
```

---

## Task 5: Wire Resolver and New Layers in deck-map

**Files:**
- Modify: `frontend/src/map/deck-map.tsx`

Three changes: (1) run the resolver once on bootstrap load and store results in refs, (2) pass the new args to `createTradeRoutesLayer`, (3) fix the empty-canvas `onClick` guard.

- [ ] **Step 1: Update imports in deck-map.tsx**

At the top of `frontend/src/map/deck-map.tsx`, add to the store import line:

```ts
// Add to existing store import:
import {
  viewMode, layers, bootstrapData, selectCountry, selectedEntity, rightPanelOpen,
  heatmapOpacity, basemap,
  selectedTradeRoute, selectedPort, tradeRouteFilter,
  selectTradeRoute, selectPort,
} from '../state/store';
```

Also add the resolver import after the existing layer imports:

```ts
import { resolveTradeArcs } from '../layers/trade-routes-resolver';
import type { ResolvedArc, ResolvedPort, WaypointData } from '../layers/trade-routes-resolver';
```

- [ ] **Step 2: Add resolved-data refs inside the DeckMap function**

Inside `DeckMap()`, before `useEffect`, add:

```ts
const resolvedArcsRef = useRef<ResolvedArc[]>([]);
const resolvedPortsRef = useRef<ResolvedPort[]>([]);
const waypointsByRouteRef = useRef<Map<string, WaypointData[]>>(new Map());
```

- [ ] **Step 3: Add a useEffect that runs the resolver when bootstrapData loads**

Add a second `useEffect` (after the one that creates the Deck instance):

```ts
// Re-resolve trade route data whenever bootstrap refreshes
useEffect(() => {
  const data = bootstrapData.value;
  if (!data) return;
  const { arcs, portList, waypointsByRoute } = resolveTradeArcs(
    data.tradeRoutes,
    data.ports,
    data.chokepoints,
  );
  resolvedArcsRef.current = arcs;
  resolvedPortsRef.current = portList;
  waypointsByRouteRef.current = waypointsByRoute;
}, [bootstrapData.value]);
```

- [ ] **Step 4: Update the createTradeRoutesLayer call in updateLayers()**

Find the `createTradeRoutesLayer(data.tradeRoutes, l.tradeRoutes)` call and replace it:

```ts
// Before:
createTradeRoutesLayer(data.tradeRoutes, l.tradeRoutes),

// After:
...createTradeRoutesLayer(
  resolvedArcsRef.current.filter(a =>
    tradeRouteFilter.value.has(a.route.category as any)
  ),
  resolvedArcsRef.current,
  resolvedPortsRef.current,
  waypointsByRouteRef.current,
  selectedTradeRoute.value?._id ?? null,
  selectedPort.value?._id ?? null,
  selectTradeRoute,
  selectPort,
  l.tradeRoutes,
  l.chokepoints,
),
```

Note the spread (`...`) — `createTradeRoutesLayer` now returns an array of 5 layers.

- [ ] **Step 5: Fix the empty-canvas onClick guard**

Find the `onClick` handler in the Deck constructor:

```ts
// Before:
onClick: (info: any) => {
  if (!info.object) return;
  const obj = info.object;
  ...
}

// After:
onClick: (info: any) => {
  if (!info.object) {
    selectTradeRoute(null);
    selectPort(null);
    return;
  }
  const obj = info.object;
  ...
}
```

- [ ] **Step 6: TypeScript check — all errors should be gone**

```bash
cd frontend && bun run typecheck
```

Expected: no errors.

- [ ] **Step 7: Start dev server and verify layers render**

```bash
cd frontend && bun run dev
```

Open http://localhost:5200, enable the Trade Routes toggle in the layer menu. Verify:
- Arcs appear on the globe with teal/red color coding
- Hovering an arc shows the tooltip (name · status · volumeDesc)
- Port markers appear at route endpoints
- No console errors

- [ ] **Step 8: Commit**

```bash
git add frontend/src/map/deck-map.tsx
git commit -m "feat: wire trade routes resolver and 5-layer factory into deck-map"
```

---

## Task 6: Promote TradeRoutesPanel to Draggable Floating Card

**Files:**
- Modify: `frontend/src/panels/trade-routes-panel.tsx`

Full rewrite. Follows the same draggable pattern as `GraphExplorer`. Conditionally rendered (not always mounted). Two content views: route view when a route is selected, port view when a port is selected.

- [ ] **Step 1: Rewrite trade-routes-panel.tsx**

Replace the entire file contents:

```tsx
import { h } from 'preact';
import { useRef, useCallback, useState } from 'preact/hooks';
import type { ResolvedArc, ResolvedPort } from '../layers/trade-routes-resolver';

interface TradeRoutesPanelProps {
  route: any | null;
  port: ResolvedPort | null;
  allArcs: ResolvedArc[];
  waypoints: WaypointData[];   // waypoints for the selected route (empty when port selected)
  onClose: () => void;
  onSelectRoute: (route: any) => void;
}

const RISK_STYLES: Record<string, { bg: string; fg: string }> = {
  low:  { bg: 'var(--success-dim)',          fg: 'var(--success)' },
  high: { bg: 'var(--danger-dim)',           fg: 'var(--danger)' },
};

const CATEGORY_COLORS: Record<string, string> = {
  energy:    'var(--accent-amber)',
  container: 'var(--accent-cyan)',
  bulk:      'var(--text-secondary)',
};

export function TradeRoutesPanel({ route, port, allArcs, waypoints, onClose, onSelectRoute }: TradeRoutesPanelProps) {
  const [pos, setPos] = useState({ x: 20, y: 80 });
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onHeaderMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    dragging.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: dragging.current.origX + ev.clientX - dragging.current.startX,
        y: dragging.current.origY + ev.clientY - dragging.current.startY,
      });
    };
    const onUp = () => {
      dragging.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [pos]);

  const panelStyle: h.JSX.CSSProperties = {
    position: 'fixed',
    left: pos.x,
    top: pos.y,
    width: 340,
    zIndex: 'var(--z-panel)' as any,
    background: 'var(--bg-glass)',
    backdropFilter: 'blur(var(--glass-blur))',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--glass-shadow)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: h.JSX.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border-subtle)',
    cursor: 'grab',
    userSelect: 'none',
    flexShrink: 0,
  };

  const bodyStyle: h.JSX.CSSProperties = {
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
  };

  const Badge = ({ label, color }: { label: string; color: string }) => (
    <span style={{
      display: 'inline-block', padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      background: `${color}20`, color,
      fontSize: 'var(--text-2xs)', fontWeight: 600,
      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
    }}>
      {label}
    </span>
  );

  return (
    <div style={panelStyle}>
      {/* Draggable header */}
      <div style={headerStyle} onMouseDown={onHeaderMouseDown as any}>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {route ? 'Trade Route' : 'Port'}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      <div style={bodyStyle}>
        {route && (
          <>
            {/* Route name */}
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {route.name}
            </div>

            {/* Source → Destination */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, padding: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>From</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{route.source}</div>
              </div>
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>→</span>
              <div style={{ flex: 1, padding: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>To</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{route.destination}</div>
              </div>
            </div>

            {/* Volume */}
            {route.volumeDesc && (
              <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>Volume</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{route.volumeDesc}</div>
              </div>
            )}

            {/* Badges */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {route.category && (
                <Badge label={route.category} color={CATEGORY_COLORS[route.category] ?? 'var(--text-secondary)'} />
              )}
              {route.disruptionRisk && (
                <Badge
                  label={route.disruptionRisk === 'high' ? 'Disrupted' : 'Active'}
                  color={RISK_STYLES[route.disruptionRisk]?.fg ?? 'var(--text-secondary)'}
                />
              )}
            </div>

            {/* Waypoints */}
            {waypoints.length > 0 && (
              <div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Chokepoints
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {waypoints.map(wp => (
                    <div key={wp._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>{wp.name}</span>
                      <Badge
                        label={wp.status}
                        color={wp.status === 'disrupted' ? 'var(--danger)' : 'var(--success)'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {port && (
          <>
            {/* Port name */}
            <div>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>{port.name}</div>
              {port.country && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{port.country}</div>
              )}
            </div>

            {/* Routes through this port */}
            {(() => {
              const portRoutes = allArcs.filter(a => a.fromPortId === port._id || a.toPortId === port._id);
              if (portRoutes.length === 0) return null;
              return (
                <div>
                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Routes ({portRoutes.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {portRoutes.map(a => (
                      <div
                        key={a.route._id}
                        onClick={() => onSelectRoute(a.route)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-hover)', cursor: 'pointer',
                          border: '1px solid transparent',
                        }}
                        onMouseEnter={(e: any) => e.currentTarget.style.borderColor = 'var(--border-bright)'}
                        onMouseLeave={(e: any) => e.currentTarget.style.borderColor = 'transparent'}
                      >
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>{a.route.name}</span>
                        <Badge
                          label={a.route.status === 'disrupted' ? 'Disrupted' : 'Active'}
                          color={a.route.status === 'disrupted' ? 'var(--danger)' : 'var(--success)'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && bun run typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/panels/trade-routes-panel.tsx
git commit -m "feat: promote TradeRoutesPanel to draggable floating card with route + port views"
```

---

## Task 7: Add TradeRoutesPanel to app.tsx

**Files:**
- Modify: `frontend/src/app.tsx`

The panel is conditionally rendered — only when a route or port is selected. It follows the same overlay pattern as `GraphExplorer`.

- [ ] **Step 1: Update imports in app.tsx**

Add imports:

```ts
import { TradeRoutesPanel } from './panels/trade-routes-panel';
import { selectedTradeRoute, selectedPort, selectTradeRoute, selectPort, bootstrapData } from './state/store';
import { resolveTradeArcs } from './layers/trade-routes-resolver';
import type { ResolvedArc, WaypointData } from './layers/trade-routes-resolver';
```

- [ ] **Step 2: Add resolved arcs ref for the panel's allArcs prop**

Inside `App()`, add state for the resolved arcs (needed for the port detail card's route list):

```ts
const [allArcs, setAllArcs] = useState<ResolvedArc[]>([]);
const [allWaypointsByRoute, setAllWaypointsByRoute] = useState<Map<string, WaypointData[]>>(new Map());

useEffect(() => {
  const data = bootstrapData.value;
  if (!data) return;
  const { arcs, waypointsByRoute } = resolveTradeArcs(data.tradeRoutes, data.ports, data.chokepoints);
  setAllArcs(arcs);
  setAllWaypointsByRoute(waypointsByRoute);
}, [bootstrapData.value]);
```

- [ ] **Step 3: Add the conditional TradeRoutesPanel overlay**

In the JSX, after the `<GraphExplorer />` block, add:

```tsx
{(selectedTradeRoute.value !== null || selectedPort.value !== null) && (
  <ErrorBoundary fallback={<span />}>
    <TradeRoutesPanel
      route={selectedTradeRoute.value}
      port={selectedPort.value}
      allArcs={allArcs}
      waypoints={
        selectedTradeRoute.value
          ? (allWaypointsByRoute.get(selectedTradeRoute.value._id) ?? [])
          : []
      }
      onClose={() => { selectTradeRoute(null); selectPort(null); }}
      onSelectRoute={selectTradeRoute}
    />
  </ErrorBoundary>
)}
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && bun run typecheck
```

Expected: no errors.

- [ ] **Step 5: Verify panel appears on click**

```bash
cd frontend && bun run dev
```

Enable Trade Routes layer. Click an arc → panel should appear at bottom-left with route details. Click a port → panel should show port + route list. Click the ✕ button → panel should close.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app.tsx
git commit -m "feat: add TradeRoutesPanel conditional overlay to App"
```

---

## Task 8: Layer Menu — Category Chips + Disruption Count Badge

**Files:**
- Modify: `frontend/src/panels/layer-menu.tsx`

Two additions to the Trade Routes toggle row: a disruption count badge (visible when any disrupted routes match the current filter) and category filter chips (Energy / Container / Bulk).

- [ ] **Step 1: Update imports in layer-menu.tsx**

Add to the existing import line:

```ts
import { layers, toggleLayer, applyPreset, LayerPreset, pluginManifests, heatmapOpacity,
  tradeRouteFilter, bootstrapData } from '../state/store';
import { resolveTradeArcs } from '../layers/trade-routes-resolver';
```

- [ ] **Step 2: Replace the "Global Trade Routes" toggle row**

Find the existing trade routes toggle in `layer-menu.tsx`:

```tsx
<Toggle id="tradeRoutes" label="Global Trade Routes" color="var(--cat-economic)" />
```

Replace it with:

```tsx
{/* Trade Routes toggle row with disruption badge */}
{(() => {
  const isOn = state.tradeRoutes;
  const filter = tradeRouteFilter.value;
  const data = bootstrapData.value;

  // Compute disruption count from resolved arcs (filtered by current category filter)
  let disruptedCount = 0;
  if (isOn && data) {
    const { arcs } = resolveTradeArcs(data.tradeRoutes, data.ports, data.chokepoints);
    disruptedCount = arcs.filter(a =>
      filter.has(a.route.category as any) && a.route.status === 'disrupted'
    ).length;
  }

  const CATEGORIES = ['energy', 'container', 'bulk'] as const;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cat-economic)' }} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Global Trade Routes</span>
          {isOn && disruptedCount > 0 && (
            <span style={{
              fontSize: 'var(--text-2xs)', fontWeight: 600, fontFamily: 'var(--font-mono)',
              color: 'var(--danger)', background: 'var(--danger-dim)',
              padding: '1px 6px', borderRadius: 'var(--radius-full)',
            }}>
              {disruptedCount} disrupted
            </span>
          )}
        </div>
        <div
          onClick={() => toggleLayer('tradeRoutes')}
          style={{
            width: 32, height: 16, borderRadius: 16,
            background: isOn ? 'var(--accent-blue)' : 'var(--bg-elevated)',
            position: 'relative', cursor: 'pointer',
            border: '1px solid var(--border-medium)',
          }}
        >
          <div style={{
            position: 'absolute', top: 1, left: isOn ? 17 : 1,
            width: 12, height: 12, borderRadius: '50%',
            background: 'var(--text-primary)', transition: 'left 0.2s',
          }} />
        </div>
      </div>

      {/* Category chips — only visible when toggle is on */}
      {isOn && (
        <div style={{ display: 'flex', gap: '4px', marginLeft: 16, marginBottom: '4px' }}>
          {CATEGORIES.map(cat => {
            const active = filter.has(cat);
            // Prevent all-off: if this is the only active category, don't allow toggle-off
            const isLastActive = active && filter.size === 1;
            return (
              <button
                key={cat}
                onClick={() => {
                  if (isLastActive) return;
                  const next = new Set(filter);
                  if (active) next.delete(cat);
                  else next.add(cat);
                  tradeRouteFilter.value = next;
                }}
                style={{
                  padding: '2px 8px', borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-2xs)', fontWeight: 600,
                  fontFamily: 'var(--font-mono)', textTransform: 'capitalize',
                  cursor: isLastActive ? 'not-allowed' : 'pointer',
                  border: `1px solid ${active ? 'var(--cat-economic)' : 'var(--border-medium)'}`,
                  background: active ? 'var(--cat-economic-dim, rgba(20,184,166,0.1))' : 'transparent',
                  color: active ? 'var(--cat-economic)' : 'var(--text-tertiary)',
                  opacity: isLastActive ? 0.5 : 1,
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
})()}
```

> **Note on performance:** `resolveTradeArcs` is called here only when the layer menu re-renders with `tradeRoutes` on. This is acceptable since it's <1ms for 21 routes. If this becomes a concern, the result can be memoized in the store.

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && bun run typecheck
```

Expected: no errors.

- [ ] **Step 4: Verify chips and badge in browser**

Enable Trade Routes layer. Verify:
- "N disrupted" badge appears in red when disrupted routes are in the active filter
- Energy / Container / Bulk chips appear below the toggle
- Toggling a chip off filters arcs from the globe (the layer will re-render in the animation loop)
- Cannot turn off the last chip (opacity drops, click is no-op)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/panels/layer-menu.tsx
git commit -m "feat: add trade route category filter chips and disruption count badge to layer menu"
```

---

## Task 9: Full Integration Test

- [ ] **Step 1: Run all tests**

```bash
cd frontend && bun run test
```

Expected: all tests pass (including the resolver unit tests from Task 2).

- [ ] **Step 2: TypeScript final check**

```bash
cd frontend && bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Manual end-to-end verification**

Start the full stack (MongoDB, Redis, API on :3005, frontend on :5200).

Verify each interaction from the spec:

| Action | Expected result |
|---|---|
| Enable Trade Routes layer | Teal arcs appear; disrupted routes in red; port markers visible |
| Hover arc | Tooltip shows `name · status · volumeDesc` |
| Click arc | Floating card appears (bottom-left); selected arc turns cyan; others dim to 15% |
| Click port marker | Floating card switches to port view; routes through port listed |
| Click route row in port card | Card switches to route view |
| Click empty globe | Card closes; all arcs return to normal opacity |
| Toggle Energy chip off | Energy arcs disappear; disruption count badge updates |
| Disable Trade Routes toggle | All arcs hidden; card closes |
| Re-enable Trade Routes | All arcs reappear; selections cleared |

- [ ] **Step 4: Final commit**

```bash
git add -p  # stage any remaining unstaged changes
git commit -m "feat: trade routes globe layer — full integration complete"
```
