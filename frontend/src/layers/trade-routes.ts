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

  const selectedRoutePortIds = new Set<string>();
  if (selectedRouteId) {
    const arc = allArcs.find(a => a.route._id === selectedRouteId);
    if (arc) {
      selectedRoutePortIds.add(arc.fromPortId);
      selectedRoutePortIds.add(arc.toPortId);
    }
  }

  return [
    // Layer 1: Glow halo (wide, very low opacity, not pickable)
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

    // Layer 2: Core arc (pickable, selection-aware opacity)
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

    // Layer 3: Unselected port markers
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

    // Layer 4: Selected port marker (larger radius, not pickable)
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

    // Layer 5: Waypoints on selected route (amber, suppressed when chokepoints layer is on)
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
