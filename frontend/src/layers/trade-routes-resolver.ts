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

  const portRouteIds = new Map<string, Set<string>>();
  const arcs: ResolvedArc[] = [];
  const waypointsByRoute = new Map<string, WaypointData[]>();

  for (const route of tradeRoutes) {
    const fromPort = portMap.get(route.from);
    const toPort = portMap.get(route.to);
    if (!fromPort || !toPort) continue;

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

    if (!portRouteIds.has(route.from)) portRouteIds.set(route.from, new Set());
    if (!portRouteIds.has(route.to)) portRouteIds.set(route.to, new Set());
    portRouteIds.get(route.from)!.add(route._id);
    portRouteIds.get(route.to)!.add(route._id);

    const resolvedWaypoints: WaypointData[] = (route.waypoints ?? [])
      .map((wpId: string) => chokepointMap.get(wpId))
      .filter(Boolean)
      .map((cp: any) => ({ _id: cp._id, name: cp.name, lng: cp.lng, lat: cp.lat, status: cp.status ?? 'active' }));
    waypointsByRoute.set(route._id, resolvedWaypoints);
  }

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
