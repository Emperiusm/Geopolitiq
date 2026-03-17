/**
 * Globe map data transformation — public setter methods that transform
 * external data into internal marker/path/polygon formats.
 *
 * Extracted from GlobeMap.ts. Each function takes raw data and returns
 * the transformed marker arrays for the GlobeMap class to store.
 */

import type {
  Hotspot, MilitaryFlight, MilitaryVessel, MilitaryVesselCluster,
  NaturalEvent, InternetOutage, CyberThreat, SocialUnrestEvent,
  UcdpGeoEvent, CableAdvisory, RepairShip, AisDisruptionEvent,
  MilitaryBase, GammaIrradiator, Spaceport, EconomicCenter, StrategicWaterway,
  CriticalMineralProject, AIDataCenter, UnderseaCable, Pipeline,
} from '@/types';
import { CONFLICT_ZONES, MILITARY_BASES, NUCLEAR_FACILITIES, SPACEPORTS, ECONOMIC_CENTERS, STRATEGIC_WATERWAYS, CRITICAL_MINERALS, UNDERSEA_CABLES } from '@/config/geo';
import { PIPELINES } from '@/config/pipelines';
import { GAMMA_IRRADIATORS } from '@/config/irradiators';
import { AI_DATA_CENTERS } from '@/config/ai-datacenters';
import { resolveTradeRouteSegments, type TradeRouteSegment } from '@/config/trade-routes';
import type { FeatureCollection, Geometry } from 'geojson';
import type { Earthquake } from '@/services/earthquakes';
import type { AirportDelayAlert } from '@/services/aviation';
import type { WeatherAlert } from '@/services/weather';
import type { IranEvent } from '@/services/conflict';
import type { DisplacementFlow } from '@/services/displacement';
import type { ClimateAnomaly } from '@/services/climate';
import type { GpsJamHex } from '@/services/gps-interference';
import type { SatellitePosition } from '@/services/satellites';
import type { ImageryScene } from '@/generated/server/worldmonitor/imagery/v1/service_server';
import type { WebcamEntry, WebcamCluster } from '@/generated/client/worldmonitor/webcam/v1/service_client';

import type {
  HotspotMarker, FlightMarker, VesselMarker, ClusterMarker,
  WeatherMarker, NaturalMarker, IranMarker, OutageMarker,
  CyberMarker, FireMarker, ProtestMarker, UcdpMarker,
  DisplacementMarker, ClimateMarker, GpsJamMarker, TechMarker,
  ConflictZoneMarker, MilBaseMarker, NuclearSiteMarker, IrradiatorSiteMarker,
  SpaceportSiteMarker, EarthquakeMarker, EconomicMarker, DatacenterMarker,
  WaterwayMarker, MineralMarker, FlightDelayMarker, NotamRingMarker,
  CableAdvisoryMarker, RepairShipMarker, AisDisruptionMarker,
  NewsLocationMarker, FlashMarker, SatelliteMarker, SatFootprintMarker,
  ImagerySceneMarker, WebcamMarkerData, WebcamClusterData,
  GlobePath, GlobePolygon, GlobeMarker,
} from './globe-map-types';
import { VESSEL_TYPE_LABELS } from './globe-map-types';
import type { MapLayers } from '@/types';

// ─── Data transformation helpers ─────────────────────────────────────────────

export function transformHotspots(hotspots: Hotspot[]): HotspotMarker[] {
  return hotspots.map(h => ({
    _kind: 'hotspot' as const,
    _lat: h.lat,
    _lng: h.lon,
    id: h.id,
    name: h.name,
    escalationScore: h.escalationScore ?? 1,
  }));
}

export function transformMilitaryFlights(flights: MilitaryFlight[]): FlightMarker[] {
  return flights.map(f => ({
    _kind: 'flight' as const,
    _lat: f.lat,
    _lng: f.lon,
    id: f.id,
    callsign: f.callsign ?? '',
    type: (f as any).aircraftType ?? (f as any).type ?? 'fighter',
    heading: (f as any).heading ?? 0,
  }));
}

export function transformMilitaryVessels(vessels: MilitaryVessel[]): VesselMarker[] {
  return vessels.map(v => ({
    _kind: 'vessel' as const,
    _lat: v.lat,
    _lng: v.lon,
    id: v.id,
    name: v.name ?? 'vessel',
    type: v.vesselType,
    typeLabel: VESSEL_TYPE_LABELS[v.vesselType] ?? v.vesselType,
    hullNumber: v.hullNumber,
    operator: v.operator !== 'other' ? v.operator : undefined,
    operatorCountry: v.operatorCountry,
    isDark: v.isDark,
    usniStrikeGroup: v.usniStrikeGroup,
    usniRegion: v.usniRegion,
    usniDeploymentStatus: v.usniDeploymentStatus,
    usniHomePort: v.usniHomePort,
    usniActivityDescription: v.usniActivityDescription,
    usniArticleDate: v.usniArticleDate,
    usniSource: v.usniSource,
  }));
}

export function transformVesselClusters(clusters: MilitaryVesselCluster[]): ClusterMarker[] {
  return clusters.map(c => ({
    _kind: 'cluster' as const,
    _lat: c.lat,
    _lng: c.lon,
    id: c.id,
    name: c.name,
    vesselCount: c.vesselCount,
    activityType: c.activityType,
    region: c.region,
  }));
}

export function transformWeatherAlerts(alerts: WeatherAlert[]): WeatherMarker[] {
  return (alerts ?? [])
    .filter(a => a.centroid != null)
    .map(a => ({
      _kind: 'weather' as const,
      _lat: a.centroid![1],
      _lng: a.centroid![0],
      id: a.id,
      severity: a.severity ?? 'Minor',
      headline: a.headline ?? a.event ?? '',
    }));
}

export function transformNaturalEvents(events: NaturalEvent[]): {
  markers: NaturalMarker[];
  trackPaths: GlobePath[];
  conePolygons: GlobePolygon[];
} {
  const markers: NaturalMarker[] = (events ?? []).map(e => ({
    _kind: 'natural' as const,
    _lat: e.lat,
    _lng: e.lon,
    id: e.id,
    category: e.category ?? '',
    title: e.title ?? '',
  }));

  const trackPaths: GlobePath[] = [];
  const conePolygons: GlobePolygon[] = [];

  for (const e of events ?? []) {
    if (e.forecastTrack?.length) {
      trackPaths.push({
        id: `storm-forecast-${e.id}`,
        name: e.stormName || e.title || '',
        points: [
          [e.lon, e.lat, 0],
          ...e.forecastTrack.map(p => [p.lon, p.lat, 0]),
        ],
        pathType: 'stormTrack',
        status: 'active',
      });
    }
    if (e.pastTrack?.length) {
      let segIdx = 0;
      for (let i = 0; i < e.pastTrack.length - 1; i++) {
        const a = e.pastTrack[i]!;
        const b = e.pastTrack[i + 1]!;
        trackPaths.push({
          id: `storm-past-${e.id}-${segIdx++}`,
          name: e.stormName || e.title || '',
          points: [[a.lon, a.lat, 0], [b.lon, b.lat, 0]],
          pathType: 'stormHistory',
          status: 'active',
          windKt: b.windKt ?? a.windKt ?? 0,
        });
      }
    }
    if (e.conePolygon?.length) {
      for (const ring of e.conePolygon) {
        conePolygons.push({
          coords: [ring],
          name: `${e.stormName || e.title || ''} Forecast Cone`,
          _kind: 'forecastCone',
        });
      }
    }
  }

  return { markers, trackPaths, conePolygons };
}

export function transformOutages(outages: InternetOutage[]): OutageMarker[] {
  return (outages ?? []).filter(o => o.lat != null && o.lon != null).map(o => ({
    _kind: 'outage' as const,
    _lat: o.lat,
    _lng: o.lon,
    id: o.id,
    title: o.title ?? '',
    severity: o.severity ?? 'partial',
    country: o.country ?? '',
  }));
}

export function transformAisData(disruptions: AisDisruptionEvent[]): AisDisruptionMarker[] {
  return (disruptions ?? [])
    .filter(d => d.lat != null && d.lon != null)
    .map(d => ({
      _kind: 'aisDisruption' as const,
      _lat: d.lat,
      _lng: d.lon,
      id: d.id,
      name: d.name,
      type: d.type,
      severity: d.severity,
      description: d.description ?? '',
    }));
}

export function transformCableActivity(advisories: CableAdvisory[], repairShips: RepairShip[]): {
  advisoryMarkers: CableAdvisoryMarker[];
  repairShipMarkers: RepairShipMarker[];
  faultIds: Set<string>;
  degradedIds: Set<string>;
} {
  const advisoryMarkers: CableAdvisoryMarker[] = (advisories ?? [])
    .filter(a => a.lat != null && a.lon != null)
    .map(a => ({
      _kind: 'cableAdvisory' as const,
      _lat: a.lat,
      _lng: a.lon,
      id: a.id,
      cableId: a.cableId,
      title: a.title ?? '',
      severity: a.severity,
      impact: a.impact ?? '',
      repairEta: a.repairEta ?? '',
    }));
  const repairShipMarkers: RepairShipMarker[] = (repairShips ?? [])
    .filter(r => r.lat != null && r.lon != null)
    .map(r => ({
      _kind: 'repairShip' as const,
      _lat: r.lat,
      _lng: r.lon,
      id: r.id,
      name: r.name ?? '',
      status: r.status,
      eta: r.eta ?? '',
      operator: r.operator ?? '',
    }));
  const faultIds = new Set((advisories ?? []).filter(a => a.severity === 'fault').map(a => a.cableId));
  const degradedIds = new Set((advisories ?? []).filter(a => a.severity === 'degraded').map(a => a.cableId));
  return { advisoryMarkers, repairShipMarkers, faultIds, degradedIds };
}

export function transformProtests(events: SocialUnrestEvent[]): ProtestMarker[] {
  return (events ?? []).filter(e => e.lat != null && e.lon != null).map(e => ({
    _kind: 'protest' as const,
    _lat: e.lat,
    _lng: e.lon,
    id: e.id,
    title: e.title ?? '',
    eventType: e.eventType ?? 'protest',
    country: e.country ?? '',
  }));
}

export function transformFlightDelays(delays: AirportDelayAlert[]): {
  delayMarkers: FlightDelayMarker[];
  notamRingMarkers: NotamRingMarker[];
} {
  const delayMarkers: FlightDelayMarker[] = (delays ?? [])
    .filter(d => d.lat != null && d.lon != null && d.severity !== 'normal')
    .map(d => ({
      _kind: 'flightDelay' as const,
      _lat: d.lat,
      _lng: d.lon,
      id: d.id,
      iata: d.iata,
      name: d.name,
      city: d.city,
      country: d.country,
      severity: d.severity,
      delayType: d.delayType,
      avgDelayMinutes: d.avgDelayMinutes,
      reason: d.reason ?? '',
    }));
  const notamRingMarkers: NotamRingMarker[] = (delays ?? [])
    .filter(d => d.lat != null && d.lon != null && d.delayType === 'closure')
    .map(d => ({
      _kind: 'notamRing' as const,
      _lat: d.lat,
      _lng: d.lon,
      name: d.name || d.iata,
      reason: d.reason || 'Airspace closure',
    }));
  return { delayMarkers, notamRingMarkers };
}

export function transformNewsLocations(data: Array<{ lat: number; lon: number; title: string; threatLevel: string; timestamp?: Date }>): NewsLocationMarker[] {
  return (data ?? [])
    .filter(d => d.lat != null && d.lon != null)
    .map((d, i) => ({
      _kind: 'newsLocation' as const,
      _lat: d.lat,
      _lng: d.lon,
      id: `news-${i}-${d.title.slice(0, 20)}`,
      title: d.title,
      threatLevel: d.threatLevel ?? 'info',
    }));
}

export function transformCyberThreats(threats: CyberThreat[]): CyberMarker[] {
  return (threats ?? []).filter(t => t.lat != null && t.lon != null).map(t => ({
    _kind: 'cyber' as const,
    _lat: t.lat,
    _lng: t.lon,
    id: t.id,
    indicator: t.indicator ?? '',
    severity: t.severity ?? 'low',
    type: t.type ?? 'malware_host',
  }));
}

export function transformIranEvents(events: IranEvent[]): IranMarker[] {
  return (events ?? []).filter(e => e.latitude != null && e.longitude != null).map(e => ({
    _kind: 'iran' as const,
    _lat: e.latitude,
    _lng: e.longitude,
    id: e.id,
    title: e.title ?? '',
    category: e.category ?? '',
    severity: e.severity ?? 'moderate',
    location: e.locationName ?? '',
  }));
}

export function transformFires(fires: Array<{ lat: number; lon: number; brightness: number; region: string; [key: string]: any }>): FireMarker[] {
  return (fires ?? []).filter(f => f.lat != null && f.lon != null).map(f => ({
    _kind: 'fire' as const,
    _lat: f.lat,
    _lng: f.lon,
    id: (f.id as string | undefined) ?? `${f.lat},${f.lon}`,
    region: f.region ?? '',
    brightness: f.brightness ?? 330,
  }));
}

export function transformWebcams(markers: Array<WebcamEntry | WebcamCluster>): (WebcamMarkerData | WebcamClusterData)[] {
  return markers.map(m => {
    if ('count' in m) {
      return { _kind: 'webcam-cluster' as const, _lat: m.lat, _lng: m.lng, count: m.count, categories: m.categories || [] };
    }
    return { _kind: 'webcam' as const, _lat: m.lat, _lng: m.lng, webcamId: m.webcamId, title: m.title, category: m.category || 'other', country: m.country || '' };
  });
}

export function transformUcdpEvents(events: UcdpGeoEvent[]): UcdpMarker[] {
  return (events ?? []).filter(e => e.latitude != null && e.longitude != null).map(e => ({
    _kind: 'ucdp' as const,
    _lat: e.latitude,
    _lng: e.longitude,
    id: e.id,
    sideA: e.side_a ?? '',
    sideB: e.side_b ?? '',
    deaths: e.deaths_best ?? 0,
    country: e.country ?? '',
  }));
}

export function transformDisplacementFlows(flows: DisplacementFlow[]): DisplacementMarker[] {
  return (flows ?? [])
    .filter(f => f.originLat != null && f.originLon != null)
    .map(f => ({
      _kind: 'displacement' as const,
      _lat: f.originLat!,
      _lng: f.originLon!,
      id: `${f.originCode}-${f.asylumCode}`,
      origin: f.originName ?? f.originCode,
      asylum: f.asylumName ?? f.asylumCode,
      refugees: f.refugees ?? 0,
    }));
}

export function transformClimateAnomalies(anomalies: ClimateAnomaly[]): ClimateMarker[] {
  return (anomalies ?? []).filter(a => a.lat != null && a.lon != null).map(a => ({
    _kind: 'climate' as const,
    _lat: a.lat,
    _lng: a.lon,
    id: `${a.zone}-${a.period}`,
    zone: a.zone ?? '',
    type: a.type ?? 'mixed',
    severity: a.severity ?? 'normal',
    tempDelta: a.tempDelta ?? 0,
  }));
}

export function transformGpsJamming(hexes: GpsJamHex[]): GpsJamMarker[] {
  return (hexes ?? []).filter(h => h.lat != null && h.lon != null).map(h => ({
    _kind: 'gpsjam' as const,
    _lat: h.lat,
    _lng: h.lon,
    id: h.h3,
    level: h.level,
    npAvg: h.npAvg ?? 0,
  }));
}

export function transformEarthquakes(earthquakes: Earthquake[]): EarthquakeMarker[] {
  return (earthquakes ?? [])
    .filter(e => e.location != null)
    .map(e => ({
      _kind: 'earthquake' as const,
      _lat: e.location!.latitude,
      _lng: e.location!.longitude,
      id: e.id,
      place: e.place ?? '',
      magnitude: e.magnitude ?? 0,
    }));
}

export function transformSatellites(positions: SatellitePosition[]): {
  markers: SatelliteMarker[];
  footprints: SatFootprintMarker[];
  trailPaths: GlobePath[];
} {
  const markers: SatelliteMarker[] = positions.map(s => ({
    _kind: 'satellite' as const,
    _lat: s.lat,
    _lng: s.lng,
    id: s.noradId,
    name: s.name,
    country: s.country,
    type: s.type,
    alt: s.alt,
    velocity: s.velocity,
    inclination: s.inclination,
  }));

  const footprints: SatFootprintMarker[] = positions.map(s => ({
    _kind: 'satFootprint' as const,
    _lat: s.lat,
    _lng: s.lng,
    country: s.country,
    noradId: s.noradId,
  }));

  const trailPaths: GlobePath[] = positions
    .filter(s => s.trail && s.trail.length > 1)
    .map(s => ({
      id: `orbit-${s.noradId}`,
      name: s.name,
      points: [[s.lng, s.lat, s.alt], ...s.trail],
      pathType: 'orbit' as const,
      status: 'active',
      country: s.country,
    }));

  return { markers, footprints, trailPaths };
}

export function transformTechEvents(events: Array<{ id: string; title: string; lat: number; lng: number; country: string; daysUntil: number; [key: string]: any }>): TechMarker[] {
  return (events ?? []).filter(e => e.lat != null && e.lng != null).map(e => ({
    _kind: 'tech' as const,
    _lat: e.lat,
    _lng: e.lng,
    id: e.id,
    title: e.title ?? '',
    country: e.country ?? '',
    daysUntil: e.daysUntil ?? 0,
  }));
}

export function transformImageryScenes(scenes: ImageryScene[]): {
  sceneMarkers: ImagerySceneMarker[];
  footprintPolygons: GlobePolygon[];
} {
  const valid = (scenes ?? []).filter(s => {
    try {
      const geom = JSON.parse(s.geometryGeojson);
      return geom?.type === 'Polygon' && geom.coordinates?.[0]?.[0];
    } catch { return false; }
  });
  const sceneMarkers: ImagerySceneMarker[] = valid.map(s => {
    const geom = JSON.parse(s.geometryGeojson);
    const coords = geom.coordinates[0] as number[][];
    const lats = coords.map(c => c[1] ?? 0);
    const lons = coords.map(c => c[0] ?? 0);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
    return {
      _kind: 'imageryScene' as const,
      _lat: centerLat,
      _lng: centerLon,
      satellite: s.satellite,
      datetime: s.datetime,
      resolutionM: s.resolutionM,
      mode: s.mode,
      previewUrl: s.previewUrl,
    };
  });
  const footprintPolygons: GlobePolygon[] = valid.map(s => {
    const geom = JSON.parse(s.geometryGeojson);
    return {
      coords: geom.coordinates as number[][][],
      name: `${s.satellite} ${s.datetime}`,
      _kind: 'imageryFootprint' as const,
      satellite: s.satellite,
      datetime: s.datetime,
      resolutionM: s.resolutionM,
      mode: s.mode,
      previewUrl: s.previewUrl,
    };
  });
  return { sceneMarkers, footprintPolygons };
}

// ─── Static layer initialization ──────────────────────────────────────────────

export interface StaticLayerData {
  milBaseMarkers: MilBaseMarker[];
  nuclearSiteMarkers: NuclearSiteMarker[];
  irradiatorSiteMarkers: IrradiatorSiteMarker[];
  spaceportSiteMarkers: SpaceportSiteMarker[];
  economicMarkers: EconomicMarker[];
  datacenterMarkers: DatacenterMarker[];
  waterwayMarkers: WaterwayMarker[];
  mineralMarkers: MineralMarker[];
  tradeRouteSegments: TradeRouteSegment[];
  globePaths: GlobePath[];
  conflictZoneMarkers: ConflictZoneMarker[];
}

export function initStaticLayers(): StaticLayerData {
  const milBaseMarkers: MilBaseMarker[] = (MILITARY_BASES as MilitaryBase[]).map(b => ({
    _kind: 'milbase' as const, _lat: b.lat, _lng: b.lon, id: b.id, name: b.name, type: b.type, country: b.country ?? '',
  }));
  const nuclearSiteMarkers: NuclearSiteMarker[] = NUCLEAR_FACILITIES
    .filter(f => f.status !== 'decommissioned')
    .map(f => ({ _kind: 'nuclearSite' as const, _lat: f.lat, _lng: f.lon, id: f.id, name: f.name, type: f.type, status: f.status }));
  const irradiatorSiteMarkers: IrradiatorSiteMarker[] = (GAMMA_IRRADIATORS as GammaIrradiator[]).map(g => ({
    _kind: 'irradiator' as const, _lat: g.lat, _lng: g.lon, id: g.id, city: g.city, country: g.country,
  }));
  const spaceportSiteMarkers: SpaceportSiteMarker[] = (SPACEPORTS as Spaceport[])
    .filter(s => s.status === 'active')
    .map(s => ({ _kind: 'spaceport' as const, _lat: s.lat, _lng: s.lon, id: s.id, name: s.name, country: s.country, operator: s.operator, launches: s.launches }));
  const economicMarkers: EconomicMarker[] = (ECONOMIC_CENTERS as EconomicCenter[]).map(c => ({
    _kind: 'economic' as const, _lat: c.lat, _lng: c.lon, id: c.id, name: c.name, type: c.type, country: c.country, description: c.description ?? '',
  }));
  const datacenterMarkers: DatacenterMarker[] = (AI_DATA_CENTERS as AIDataCenter[])
    .filter(d => d.status !== 'decommissioned')
    .map(d => ({ _kind: 'datacenter' as const, _lat: d.lat, _lng: d.lon, id: d.id, name: d.name, owner: d.owner, country: d.country, chipType: d.chipType }));
  const waterwayMarkers: WaterwayMarker[] = (STRATEGIC_WATERWAYS as StrategicWaterway[]).map(w => ({
    _kind: 'waterway' as const, _lat: w.lat, _lng: w.lon, id: w.id, name: w.name, description: w.description ?? '',
  }));
  const mineralMarkers: MineralMarker[] = (CRITICAL_MINERALS as CriticalMineralProject[])
    .filter(m => m.status === 'producing' || m.status === 'development')
    .map(m => ({ _kind: 'mineral' as const, _lat: m.lat, _lng: m.lon, id: m.id, name: m.name, mineral: m.mineral, country: m.country, status: m.status }));
  const tradeRouteSegments = resolveTradeRouteSegments();
  const globePaths: GlobePath[] = [
    ...(UNDERSEA_CABLES as UnderseaCable[]).map(c => ({ id: c.id, name: c.name, points: c.points, pathType: 'cable' as const, status: 'ok' })),
    ...(PIPELINES as Pipeline[]).map(p => ({ id: p.id, name: p.name, points: p.points, pathType: p.type, status: p.status })),
  ];
  const conflictZoneMarkers: ConflictZoneMarker[] = CONFLICT_ZONES.map(z => ({
    _kind: 'conflictZone' as const, _lat: z.center[1], _lng: z.center[0], id: z.id, name: z.name,
    intensity: z.intensity ?? 'low', parties: z.parties ?? [], casualties: z.casualties,
  }));
  return { milBaseMarkers, nuclearSiteMarkers, irradiatorSiteMarkers, spaceportSiteMarkers, economicMarkers, datacenterMarkers, waterwayMarkers, mineralMarkers, tradeRouteSegments, globePaths, conflictZoneMarkers };
}

// ─── Marker assembly for flush ────────────────────────────────────────────────

export function assembleVisibleMarkers(
  layers: MapLayers,
  data: {
    hotspots: HotspotMarker[];
    conflictZoneMarkers: ConflictZoneMarker[];
    milBaseMarkers: MilBaseMarker[];
    nuclearSiteMarkers: NuclearSiteMarker[];
    irradiatorSiteMarkers: IrradiatorSiteMarker[];
    spaceportSiteMarkers: SpaceportSiteMarker[];
    flights: FlightMarker[];
    vessels: VesselMarker[];
    clusterMarkers: ClusterMarker[];
    weatherMarkers: WeatherMarker[];
    naturalMarkers: NaturalMarker[];
    earthquakeMarkers: EarthquakeMarker[];
    economicMarkers: EconomicMarker[];
    datacenterMarkers: DatacenterMarker[];
    waterwayMarkers: WaterwayMarker[];
    mineralMarkers: MineralMarker[];
    flightDelayMarkers: FlightDelayMarker[];
    notamRingMarkers: NotamRingMarker[];
    aisMarkers: AisDisruptionMarker[];
    iranMarkers: IranMarker[];
    outageMarkers: OutageMarker[];
    cyberMarkers: CyberMarker[];
    fireMarkers: FireMarker[];
    protestMarkers: ProtestMarker[];
    ucdpMarkers: UcdpMarker[];
    displacementMarkers: DisplacementMarker[];
    climateMarkers: ClimateMarker[];
    gpsJamMarkers: GpsJamMarker[];
    satelliteMarkers: SatelliteMarker[];
    satelliteFootprintMarkers: SatFootprintMarker[];
    imagerySceneMarkers: ImagerySceneMarker[];
    techMarkers: TechMarker[];
    cableAdvisoryMarkers: CableAdvisoryMarker[];
    repairShipMarkers: RepairShipMarker[];
    webcamMarkers: (WebcamMarkerData | WebcamClusterData)[];
    newsLocationMarkers: NewsLocationMarker[];
    flashMarkers: FlashMarker[];
  },
): GlobeMarker[] {
  const markers: GlobeMarker[] = [];
  if (layers.hotspots) markers.push(...data.hotspots);
  if (layers.conflicts) markers.push(...data.conflictZoneMarkers);
  if (layers.bases) markers.push(...data.milBaseMarkers);
  if (layers.nuclear) markers.push(...data.nuclearSiteMarkers);
  if (layers.irradiators) markers.push(...data.irradiatorSiteMarkers);
  if (layers.spaceports) markers.push(...data.spaceportSiteMarkers);
  if (layers.military) { markers.push(...data.flights, ...data.vessels, ...data.clusterMarkers); }
  if (layers.weather) markers.push(...data.weatherMarkers);
  if (layers.natural) { markers.push(...data.naturalMarkers, ...data.earthquakeMarkers); }
  if (layers.economic) markers.push(...data.economicMarkers);
  if (layers.datacenters) markers.push(...data.datacenterMarkers);
  if (layers.waterways) markers.push(...data.waterwayMarkers);
  if (layers.minerals) markers.push(...data.mineralMarkers);
  if (layers.flights) { markers.push(...data.flightDelayMarkers, ...data.notamRingMarkers); }
  if (layers.ais) markers.push(...data.aisMarkers);
  if (layers.iranAttacks) markers.push(...data.iranMarkers);
  if (layers.outages) markers.push(...data.outageMarkers);
  if (layers.cyberThreats) markers.push(...data.cyberMarkers);
  if (layers.fires) markers.push(...data.fireMarkers);
  if (layers.protests) markers.push(...data.protestMarkers);
  if (layers.ucdpEvents) markers.push(...data.ucdpMarkers);
  if (layers.displacement) markers.push(...data.displacementMarkers);
  if (layers.climate) markers.push(...data.climateMarkers);
  if (layers.gpsJamming) markers.push(...data.gpsJamMarkers);
  if (layers.satellites) { markers.push(...data.satelliteMarkers, ...data.satelliteFootprintMarkers, ...data.imagerySceneMarkers); }
  if (layers.techEvents) markers.push(...data.techMarkers);
  if (layers.cables) { markers.push(...data.cableAdvisoryMarkers, ...data.repairShipMarkers); }
  if (layers.webcams) markers.push(...data.webcamMarkers);
  markers.push(...data.newsLocationMarkers, ...data.flashMarkers);
  return markers;
}

// ─── Polygon assembly for flush ───────────────────────────────────────────────

export function assemblePolygons(
  layers: MapLayers,
  countriesGeoData: FeatureCollection<Geometry> | null,
  ciiScoresMap: Map<string, { score: number; level: string }>,
  imageryFootprintPolygons: GlobePolygon[],
  stormConePolygons: GlobePolygon[],
  getReversedRing: (zoneId: string, countryIso: string, ringIdx: number, ring: number[][][]) => number[][][],
): GlobePolygon[] {
  const polys: GlobePolygon[] = [];

  if (layers.conflicts) {
    const CONFLICT_ISO: Record<string, string[]> = {
      iran: ['IR'], ukraine: ['UA'], gaza: ['PS', 'IL'], sudan: ['SD'], myanmar: ['MM'],
    };
    for (const z of CONFLICT_ZONES) {
      const isoCodes = CONFLICT_ISO[z.id];
      if (isoCodes && countriesGeoData) {
        for (const feat of countriesGeoData.features) {
          const code = feat.properties?.['ISO3166-1-Alpha-2'] as string | undefined;
          if (!code || !isoCodes.includes(code)) continue;
          const geom = feat.geometry;
          if (!geom) continue;
          const rings = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
          for (let ri = 0; ri < rings.length; ri++) {
            polys.push({
              coords: getReversedRing(z.id, code, ri, rings[ri] as number[][][]),
              name: z.name, _kind: 'conflict',
              intensity: z.intensity ?? 'low', parties: z.parties, casualties: z.casualties,
            });
          }
        }
      }
    }
  }

  if (layers.ciiChoropleth && countriesGeoData) {
    for (const feat of countriesGeoData.features) {
      const code = feat.properties?.['ISO3166-1-Alpha-2'] as string | undefined;
      const entry = code ? ciiScoresMap.get(code) : undefined;
      if (!entry || !code) continue;
      const geom = feat.geometry;
      if (!geom) continue;
      const rings = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
      const name = (feat.properties?.name as string) ?? code;
      for (const ring of rings) {
        polys.push({ coords: ring, name, _kind: 'cii', level: entry.level, score: entry.score });
      }
    }
  }

  if (layers.satellites) polys.push(...imageryFootprintPolygons);
  if (layers.natural) polys.push(...stormConePolygons);

  return polys;
}
