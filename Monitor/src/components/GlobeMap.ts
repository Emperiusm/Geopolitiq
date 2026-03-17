/**
 * GlobeMap - 3D interactive globe using globe.gl
 *
 * Matches World Monitor's MapContainer API so it can be used as a drop-in
 * replacement within MapContainer when the user enables globe mode.
 */

import Globe from 'globe.gl';
import { isDesktopRuntime } from '@/services/runtime';
import type { GlobeInstance, ConfigOptions } from 'globe.gl';
import { INTEL_HOTSPOTS } from '@/config/geo';
import { getGlobeRenderScale, resolveGlobePixelRatio, resolvePerformanceProfile, subscribeGlobeRenderScaleChange, getGlobeTexture, GLOBE_TEXTURE_URLS, subscribeGlobeTextureChange, getGlobeVisualPreset, subscribeGlobeVisualPresetChange, type GlobeRenderScale, type GlobePerformanceProfile, type GlobeVisualPreset } from '@/services/globe-render-settings';
import type { TradeRouteSegment } from '@/config/trade-routes';
import { getCountryBbox, getCountriesGeoJson } from '@/services/country-geometry';
import type { FeatureCollection, Geometry } from 'geojson';
import type { MapLayers, Hotspot, MilitaryFlight, MilitaryVessel, MilitaryVesselCluster, NaturalEvent, InternetOutage, CyberThreat, SocialUnrestEvent, UcdpGeoEvent, CableAdvisory, RepairShip, AisDisruptionEvent, AisDensityZone } from '@/types';
import type { Earthquake } from '@/services/earthquakes';
import type { AirportDelayAlert } from '@/services/aviation';
import { MapPopup } from './MapPopup';
import type { MapContainerState, MapView, TimeRange } from './MapContainer';
import type { CountryClickPayload } from './DeckGLMap';
import type { WeatherAlert } from '@/services/weather';
import type { IranEvent } from '@/services/conflict';
import type { DisplacementFlow } from '@/services/displacement';
import type { ClimateAnomaly } from '@/services/climate';
import type { GpsJamHex } from '@/services/gps-interference';
import type { SatellitePosition } from '@/services/satellites';
import type { ImageryScene } from '@/generated/server/worldmonitor/imagery/v1/service_server';
import type { WebcamEntry, WebcamCluster } from '@/generated/client/worldmonitor/webcam/v1/service_client';

import type {
  GlobeMarker, GlobePath, GlobePolygon, GlobeControlsLike,
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
} from './globe-map-types';
import { VIEW_POVS, LAYER_CHANNELS } from './globe-map-types';
import { buildMarkerElement, handleMarkerClick, showMarkerTooltip } from './globe-map-markers';
import {
  transformHotspots, transformMilitaryFlights, transformMilitaryVessels,
  transformVesselClusters, transformWeatherAlerts, transformNaturalEvents,
  transformOutages, transformAisData, transformCableActivity,
  transformProtests, transformFlightDelays, transformNewsLocations,
  transformCyberThreats, transformIranEvents, transformFires,
  transformWebcams, transformUcdpEvents, transformDisplacementFlows,
  transformClimateAnomalies, transformGpsJamming, transformEarthquakes,
  transformSatellites, transformTechEvents, transformImageryScenes,
  initStaticLayers, assembleVisibleMarkers, assemblePolygons,
} from './globe-map-data';
import {
  rebuildSatBeams, applyEnhancedVisuals, removeEnhancedVisuals,
  startExtrasLoop, applyRenderQuality, applyPerformanceProfile,
  type EnhancedVisualRefs,
} from './globe-map-visuals';
import { createControls, zoomInGlobe, zoomOutGlobe, createLayerToggles, enforceLayerLimit } from './globe-map-ui';
import { setupArcAccessors, setupPathAccessors, setupPolygonAccessors } from './globe-map-accessors';

export class GlobeMap {
  private container: HTMLElement;
  private globe: GlobeInstance | null = null;
  private unsubscribeGlobeQuality: (() => void) | null = null;
  private unsubscribeGlobeTexture: (() => void) | null = null;
  private unsubscribeVisualPreset: (() => void) | null = null;
  private savedDefaultMaterial: any = null;
  private controls: GlobeControlsLike | null = null;
  private renderPaused = false;
  private outerGlow: any = null;
  private innerGlow: any = null;
  private starField: any = null;
  private cyanLight: any = null;
  private extrasAnimFrameId: number | null = null;
  private pendingFlushWhilePaused = false;
  private controlsAutoRotateBeforePause: boolean | null = null;
  private controlsDampingBeforePause: boolean | null = null;
  private initialized = false;
  private destroyed = false;
  private webglLost = false;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushMaxTimer: ReturnType<typeof setTimeout> | null = null;
  private _pulseEnabled = true;
  private reversedRingCache = new Map<string, number[][][]>();
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private isGlobeAnimating = true;
  private visibilityHandler: (() => void) | null = null;

  private hotspots: HotspotMarker[] = [];
  private flights: FlightMarker[] = [];
  private vessels: VesselMarker[] = [];
  private vesselData: Map<string, MilitaryVessel> = new Map();
  private clusterMarkers: ClusterMarker[] = [];
  private clusterData: Map<string, MilitaryVesselCluster> = new Map();
  private popup: MapPopup | null = null;
  private weatherMarkers: WeatherMarker[] = [];
  private naturalMarkers: NaturalMarker[] = [];
  private iranMarkers: IranMarker[] = [];
  private outageMarkers: OutageMarker[] = [];
  private cyberMarkers: CyberMarker[] = [];
  private fireMarkers: FireMarker[] = [];
  private protestMarkers: ProtestMarker[] = [];
  private ucdpMarkers: UcdpMarker[] = [];
  private displacementMarkers: DisplacementMarker[] = [];
  private climateMarkers: ClimateMarker[] = [];
  private gpsJamMarkers: GpsJamMarker[] = [];
  private techMarkers: TechMarker[] = [];
  private conflictZoneMarkers: ConflictZoneMarker[] = [];
  private milBaseMarkers: MilBaseMarker[] = [];
  private nuclearSiteMarkers: NuclearSiteMarker[] = [];
  private irradiatorSiteMarkers: IrradiatorSiteMarker[] = [];
  private spaceportSiteMarkers: SpaceportSiteMarker[] = [];
  private earthquakeMarkers: EarthquakeMarker[] = [];
  private economicMarkers: EconomicMarker[] = [];
  private datacenterMarkers: DatacenterMarker[] = [];
  private waterwayMarkers: WaterwayMarker[] = [];
  private mineralMarkers: MineralMarker[] = [];
  private flightDelayMarkers: FlightDelayMarker[] = [];
  private notamRingMarkers: NotamRingMarker[] = [];
  private newsLocationMarkers: NewsLocationMarker[] = [];
  private flashMarkers: FlashMarker[] = [];
  private cableAdvisoryMarkers: CableAdvisoryMarker[] = [];
  private repairShipMarkers: RepairShipMarker[] = [];
  private aisMarkers: AisDisruptionMarker[] = [];
  private satelliteMarkers: SatelliteMarker[] = [];
  private satelliteTrailPaths: GlobePath[] = [];
  private stormTrackPaths: GlobePath[] = [];
  private stormConePolygons: GlobePolygon[] = [];
  private satelliteFootprintMarkers: SatFootprintMarker[] = [];
  private imagerySceneMarkers: ImagerySceneMarker[] = [];
  private webcamMarkers: (WebcamMarkerData | WebcamClusterData)[] = [];
  private webcamMarkerMode: string = localStorage.getItem('wm-webcam-marker-mode') || 'icon';
  private imageryFootprintPolygons: GlobePolygon[] = [];
  private lastImageryCenter: { lat: number; lon: number } | null = null;
  private imageryFetchTimer: ReturnType<typeof setTimeout> | null = null;
  private imageryFetchVersion = 0;
  private controlsEndHandler: (() => void) | null = null;
  private satBeamGroup: any = null;
  private tradeRouteSegments: TradeRouteSegment[] = [];
  private globePaths: GlobePath[] = [];
  private cableFaultIds = new Set<string>();
  private cableDegradedIds = new Set<string>();
  private ciiScoresMap: Map<string, { score: number; level: string }> = new Map();
  private countriesGeoData: FeatureCollection<Geometry> | null = null;
  private layers: MapLayers;
  private timeRange: TimeRange;
  private currentView: MapView = 'global';
  private onHotspotClickCb: ((h: Hotspot) => void) | null = null;
  private autoRotateTimer: ReturnType<typeof setTimeout> | null = null;
  private layerTogglesEl: HTMLElement | null = null;
  private tooltipEl: HTMLElement | null = null;
  private tooltipHideTimer: ReturnType<typeof setTimeout> | null = null;
  private satHoverStyle: HTMLStyleElement | null = null;
  private onLayerChangeCb: ((layer: keyof MapLayers, enabled: boolean, source: 'user' | 'programmatic') => void) | null = null;
  private onMapContextMenuCb?: (payload: { lat: number; lon: number; screenX: number; screenY: number }) => void;
  layerWarningShown = false;
  lastActiveLayerCount = 0;

  private readonly handleContextMenu = (e: MouseEvent): void => {
    e.preventDefault();
    if (!this.onMapContextMenuCb || !this.globe) return;
    const rect = this.container.getBoundingClientRect();
    const coords = this.globe.toGlobeCoords(e.clientX - rect.left, e.clientY - rect.top);
    if (!coords) return;
    this.onMapContextMenuCb({ lat: coords.lat, lon: coords.lng, screenX: e.clientX, screenY: e.clientY });
  };

  constructor(container: HTMLElement, initialState: MapContainerState) {
    this.container = container;
    this.popup = new MapPopup(this.container);
    this.layers = { ...initialState.layers };
    this.timeRange = initialState.timeRange;
    this.currentView = initialState.view;
    this.container.classList.add('globe-mode');
    this.container.style.cssText = 'width:100%;height:100%;background:#000;position:relative;';
    this.initGlobe().catch(err => console.error('[GlobeMap] Init failed:', err));
  }

  // ─── Globe initialization ──────────────────────────────────────────────────

  private async initGlobe(): Promise<void> {
    if (this.destroyed) return;
    const desktop = isDesktopRuntime();
    const initialScale = getGlobeRenderScale();
    const initialPixelRatio = desktop
      ? Math.min(resolveGlobePixelRatio(initialScale), 1.25)
      : resolveGlobePixelRatio(initialScale);
    const config: ConfigOptions = {
      animateIn: false,
      rendererConfig: {
        powerPreference: desktop ? 'high-performance' : 'default',
        logarithmicDepthBuffer: !desktop,
        antialias: initialPixelRatio > 1,
      },
    };
    const globe = new Globe(this.container, config) as GlobeInstance;
    if (this.destroyed) { globe._destructor(); return; }

    const satStyle = document.createElement('style');
    satStyle.textContent = `.sat-hit:hover .sat-dot { transform: scale(2.5); box-shadow: 0 0 10px 4px currentColor; }`;
    document.head.appendChild(satStyle);
    this.satHoverStyle = satStyle;

    this.unsubscribeGlobeQuality?.();
    this.unsubscribeGlobeQuality = subscribeGlobeRenderScaleChange((scale) => {
      this.applyRenderQualityLocal(scale);
      this.applyPerformanceProfileLocal(resolvePerformanceProfile(scale));
    });

    const initW = this.container.clientWidth || window.innerWidth;
    const initH = this.container.clientHeight || window.innerHeight;
    globe
      .globeImageUrl(GLOBE_TEXTURE_URLS[getGlobeTexture()])
      .backgroundImageUrl('')
      .atmosphereColor('#4466cc')
      .atmosphereAltitude(0.18)
      .width(initW).height(initH)
      .pathTransitionDuration(0);

    const controls = globe.controls() as GlobeControlsLike;
    this.controls = controls;
    controls.autoRotate = !desktop;
    controls.autoRotateSpeed = 0.3;
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.zoomSpeed = 1.4;
    controls.minDistance = 101;
    controls.maxDistance = 600;
    controls.enableDamping = !desktop;

    this.controlsEndHandler = () => {
      if (!this.layers.satellites) return;
      if (this.imageryFetchTimer) clearTimeout(this.imageryFetchTimer);
      this.imageryFetchTimer = setTimeout(() => this.fetchImageryForViewport(), 800);
    };
    controls.addEventListener('end', this.controlsEndHandler);

    const glCanvas = this.container.querySelector('canvas');
    if (glCanvas) {
      (glCanvas as HTMLElement).style.cssText = 'position:absolute;top:0;left:0;width:100% !important;height:100% !important;';
    }

    const attribution = document.createElement('div');
    attribution.className = 'map-attribution';
    attribution.innerHTML = '\u00A9 <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> \u00A9 <a href="https://www.naturalearthdata.com" target="_blank" rel="noopener">Natural Earth</a>';
    this.container.appendChild(attribution);

    this.savedDefaultMaterial = globe.globeMaterial();
    if (getGlobeVisualPreset() === 'enhanced') setTimeout(() => this.applyEnhancedVisualsLocal(), 800);
    this.unsubscribeVisualPreset = subscribeGlobeVisualPresetChange((preset) => this.applyVisualPreset(preset));
    this.unsubscribeGlobeTexture = subscribeGlobeTextureChange((texture) => { if (this.globe) this.globe.globeImageUrl(GLOBE_TEXTURE_URLS[texture]); });

    // Auto-rotate pause/resume
    const pauseAutoRotate = () => { if (this.renderPaused) return; controls.autoRotate = false; if (this.autoRotateTimer) clearTimeout(this.autoRotateTimer); };
    const scheduleResume = () => { if (this.renderPaused) return; if (this.autoRotateTimer) clearTimeout(this.autoRotateTimer); this.autoRotateTimer = setTimeout(() => { if (!this.renderPaused) controls.autoRotate = !desktop; }, 60_000); };

    const canvas = this.container.querySelector('canvas');
    if (canvas) {
      const wake = () => this.wakeGlobe();
      canvas.addEventListener('mousedown', () => { pauseAutoRotate(); wake(); });
      canvas.addEventListener('touchstart', () => { pauseAutoRotate(); wake(); }, { passive: true });
      canvas.addEventListener('wheel', wake, { passive: true });
      let lastMoveWake = 0;
      canvas.addEventListener('mousemove', () => { const now = performance.now(); if (now - lastMoveWake > 500) { lastMoveWake = now; wake(); } }, { passive: true });
      canvas.addEventListener('mouseup', scheduleResume);
      canvas.addEventListener('touchend', scheduleResume);
      canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.webglLost = true; });
      canvas.addEventListener('webglcontextrestored', () => { this.webglLost = false; this.flushMarkers(); });
    }
    this.container.addEventListener('contextmenu', this.handleContextMenu);

    // Wire HTML marker layer
    globe.htmlElementsData([])
      .htmlLat((d: object) => (d as GlobeMarker)._lat)
      .htmlLng((d: object) => (d as GlobeMarker)._lng)
      .htmlAltitude((d: object) => {
        const m = d as GlobeMarker;
        if (m._kind === 'satFootprint') return 0;
        if (m._kind === 'satellite') return (m as SatelliteMarker).alt / 6371;
        if (m._kind === 'flight' || m._kind === 'vessel' || m._kind === 'cluster') return 0.012;
        if (m._kind === 'hotspot') return 0.005;
        return 0.003;
      })
      .htmlElement((d: object) => this.buildMarkerElementLocal(d as GlobeMarker));

    setupArcAccessors(globe);
    setupPathAccessors(globe, () => this.cableFaultIds, () => this.cableDegradedIds);
    setupPolygonAccessors(globe);

    this.globe = globe;
    this.initialized = true;
    this.applyRenderQualityLocal(initialScale);
    this.applyPerformanceProfileLocal(resolvePerformanceProfile(initialScale));

    createControls(this.container, () => zoomInGlobe(this.globe), () => zoomOutGlobe(this.globe), () => this.setView(this.currentView));
    this.createLayerTogglesLocal();

    // Load static datasets
    this.setHotspots(INTEL_HOTSPOTS);
    const sd = initStaticLayers();
    this.milBaseMarkers = sd.milBaseMarkers; this.nuclearSiteMarkers = sd.nuclearSiteMarkers;
    this.irradiatorSiteMarkers = sd.irradiatorSiteMarkers; this.spaceportSiteMarkers = sd.spaceportSiteMarkers;
    this.economicMarkers = sd.economicMarkers; this.datacenterMarkers = sd.datacenterMarkers;
    this.waterwayMarkers = sd.waterwayMarkers; this.mineralMarkers = sd.mineralMarkers;
    this.tradeRouteSegments = sd.tradeRouteSegments; this.globePaths = sd.globePaths;
    this.conflictZoneMarkers = sd.conflictZoneMarkers;
    this.setView(this.currentView);
    this.layers.dayNight = false;
    this.hideLayerToggle('dayNight');

    this.flushMarkers(); this.flushArcs(); this.flushPaths(); this.flushPolygons();
    if (this.layers.satellites) this.fetchImageryForViewport();
    this.setupVisibilityHandler();
    this.scheduleIdlePause();

    getCountriesGeoJson().then(geojson => {
      if (geojson && !this.destroyed) { this.countriesGeoData = geojson; this.reversedRingCache.clear(); this.flushPolygons(); }
    }).catch(err => { if (import.meta.env.DEV) console.warn('[GlobeMap] Failed to load countries GeoJSON', err); });
  }

  // ─── Marker building (delegates to extracted module) ───────────────────────

  private buildMarkerElementLocal(d: GlobeMarker): HTMLElement {
    return buildMarkerElement(d, this._pulseEnabled, this.webcamMarkerMode, (marker, el) => {
      handleMarkerClick(marker, el, {
        onHotspotClickCb: this.onHotspotClickCb, vesselData: this.vesselData,
        clusterData: this.clusterData, popup: this.popup, container: this.container,
        globe: this.globe, hideTooltip: () => this.hideTooltip(),
        showMarkerTooltip: (m, a) => this.showMarkerTooltipLocal(m, a),
      });
    });
  }

  private showMarkerTooltipLocal(d: GlobeMarker, anchor: HTMLElement): void {
    showMarkerTooltip(d, anchor, {
      container: this.container, globe: this.globe,
      tooltipEl: this.tooltipEl, tooltipHideTimer: this.tooltipHideTimer,
      hideTooltip: () => this.hideTooltip(),
      setTooltipEl: (el) => { this.tooltipEl = el; },
      setTooltipHideTimer: (timer) => { this.tooltipHideTimer = timer; },
      showMarkerTooltip: (m, a) => this.showMarkerTooltipLocal(m, a),
    });
  }

  private hideTooltip(): void {
    if (this.tooltipHideTimer) { clearTimeout(this.tooltipHideTimer); this.tooltipHideTimer = null; }
    this.tooltipEl?.remove(); this.tooltipEl = null; this.popup?.hide();
  }

  // ─── Layer toggle panel ────────────────────────────────────────────────────

  private createLayerTogglesLocal(): void {
    this.layerTogglesEl = createLayerToggles(this.container, this.layers, {
      onToggle: (layer, checked) => {
        this.layers[layer] = checked;
        this.flushLayerChannels(layer);
        this.onLayerChangeCb?.(layer, checked, 'user');
        enforceLayerLimit(this.layerTogglesEl, this);
      },
      onWebcamModeChange: () => this.flushMarkers(),
      getWebcamMode: () => this.webcamMarkerMode,
      setWebcamMode: (mode) => { localStorage.setItem('wm-webcam-marker-mode', mode); this.webcamMarkerMode = mode; },
      enforceLayerLimit: () => enforceLayerLimit(this.layerTogglesEl, this),
    });
  }

  // ─── Flush data to globe ───────────────────────────────────────────────────

  private flushMarkers(): void {
    if (!this.globe || !this.initialized || this.destroyed || this.webglLost) return;
    if (this.renderPaused) { this.pendingFlushWhilePaused = true; return; }
    if (!this.flushMaxTimer) {
      this.flushMaxTimer = setTimeout(() => { this.flushMaxTimer = null; if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; } this.flushMarkersImmediate(); }, 300);
    }
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => { this.flushTimer = null; if (this.flushMaxTimer) { clearTimeout(this.flushMaxTimer); this.flushMaxTimer = null; } this.flushMarkersImmediate(); }, 100);
  }

  private flushMarkersImmediate(): void {
    if (!this.globe || !this.initialized || this.destroyed || this.webglLost) return;
    this.wakeGlobe();
    try {
      this.globe.htmlElementsData(assembleVisibleMarkers(this.layers, {
        hotspots: this.hotspots, conflictZoneMarkers: this.conflictZoneMarkers,
        milBaseMarkers: this.milBaseMarkers, nuclearSiteMarkers: this.nuclearSiteMarkers,
        irradiatorSiteMarkers: this.irradiatorSiteMarkers, spaceportSiteMarkers: this.spaceportSiteMarkers,
        flights: this.flights, vessels: this.vessels, clusterMarkers: this.clusterMarkers,
        weatherMarkers: this.weatherMarkers, naturalMarkers: this.naturalMarkers,
        earthquakeMarkers: this.earthquakeMarkers, economicMarkers: this.economicMarkers,
        datacenterMarkers: this.datacenterMarkers, waterwayMarkers: this.waterwayMarkers,
        mineralMarkers: this.mineralMarkers, flightDelayMarkers: this.flightDelayMarkers,
        notamRingMarkers: this.notamRingMarkers, aisMarkers: this.aisMarkers,
        iranMarkers: this.iranMarkers, outageMarkers: this.outageMarkers,
        cyberMarkers: this.cyberMarkers, fireMarkers: this.fireMarkers,
        protestMarkers: this.protestMarkers, ucdpMarkers: this.ucdpMarkers,
        displacementMarkers: this.displacementMarkers, climateMarkers: this.climateMarkers,
        gpsJamMarkers: this.gpsJamMarkers, satelliteMarkers: this.satelliteMarkers,
        satelliteFootprintMarkers: this.satelliteFootprintMarkers,
        imagerySceneMarkers: this.imagerySceneMarkers, techMarkers: this.techMarkers,
        cableAdvisoryMarkers: this.cableAdvisoryMarkers, repairShipMarkers: this.repairShipMarkers,
        webcamMarkers: this.webcamMarkers, newsLocationMarkers: this.newsLocationMarkers,
        flashMarkers: this.flashMarkers,
      }));
    }
    catch (err) { if (import.meta.env.DEV) console.warn('[GlobeMap] flush error', err); }
  }

  private flushArcs(): void {
    if (!this.globe || !this.initialized || this.destroyed || this.webglLost) return;
    this.wakeGlobe();
    (this.globe as any).arcsData(this.layers.tradeRoutes ? this.tradeRouteSegments : []);
  }

  private flushPaths(): void {
    if (!this.globe || !this.initialized || this.destroyed || this.webglLost) return;
    this.wakeGlobe();
    const showCables = this.layers.cables, showPipelines = this.layers.pipelines;
    const paths = (showCables && showPipelines) ? this.globePaths : this.globePaths.filter(p => p.pathType === 'cable' ? showCables : showPipelines);
    (this.globe as any).pathsData([...paths, ...(this.layers.satellites ? this.satelliteTrailPaths : []), ...(this.layers.natural ? this.stormTrackPaths : [])]);
  }

  private getReversedRing(zoneId: string, countryIso: string, ringIdx: number, ring: number[][][]): number[][][] {
    const key = `${zoneId}:${countryIso}:${ringIdx}`;
    let cached = this.reversedRingCache.get(key);
    if (!cached) { cached = ring.map((r: number[][]) => [...r].reverse()); this.reversedRingCache.set(key, cached); }
    return cached;
  }

  private flushPolygons(): void {
    if (!this.globe || !this.initialized || this.destroyed || this.webglLost) return;
    this.wakeGlobe();
    (this.globe as any).polygonsData(assemblePolygons(
      this.layers, this.countriesGeoData, this.ciiScoresMap,
      this.imageryFootprintPolygons, this.stormConePolygons,
      (z, c, r, ring) => this.getReversedRing(z, c, r, ring),
    ));
  }

  private flushLayerChannels(layer: keyof MapLayers): void {
    const ch = LAYER_CHANNELS.get(layer);
    if (!ch) { this.flushMarkers(); return; }
    if (ch.markers) this.flushMarkers();
    if (ch.arcs) this.flushArcs();
    if (ch.paths) this.flushPaths();
    if (ch.polygons) this.flushPolygons();
    if (layer === 'satellites' && this.satBeamGroup) this.satBeamGroup.visible = !!this.layers.satellites;
  }

  // ─── Public data setters ───────────────────────────────────────────────────

  public setCIIScores(scores: Array<{ code: string; score: number; level: string }>): void {
    this.ciiScoresMap = new Map(scores.map(s => [s.code, { score: s.score, level: s.level }]));
    this.flushPolygons();
  }
  public setHotspots(hotspots: Hotspot[]): void { this.hotspots = transformHotspots(hotspots); this.flushMarkers(); }
  public setMilitaryFlights(flights: MilitaryFlight[]): void { this.flights = transformMilitaryFlights(flights); this.flushMarkers(); }
  public setMilitaryVessels(vessels: MilitaryVessel[], clusters: MilitaryVesselCluster[] = []): void {
    this.vesselData.clear(); for (const v of vessels) this.vesselData.set(v.id, v);
    this.clusterData.clear(); for (const c of clusters) this.clusterData.set(c.id, c);
    this.vessels = transformMilitaryVessels(vessels);
    this.clusterMarkers = transformVesselClusters(clusters);
    this.flushMarkers();
  }
  public setWeatherAlerts(alerts: WeatherAlert[]): void { this.weatherMarkers = transformWeatherAlerts(alerts); this.flushMarkers(); }
  public setNaturalEvents(events: NaturalEvent[]): void {
    const r = transformNaturalEvents(events);
    this.naturalMarkers = r.markers; this.stormTrackPaths = r.trackPaths; this.stormConePolygons = r.conePolygons;
    this.flushMarkers(); this.flushPaths(); this.flushPolygons();
  }
  public setOutages(outages: InternetOutage[]): void { this.outageMarkers = transformOutages(outages); this.flushMarkers(); }
  public setAisData(disruptions: AisDisruptionEvent[], _density: AisDensityZone[]): void { this.aisMarkers = transformAisData(disruptions); this.flushMarkers(); }
  public setCableActivity(advisories: CableAdvisory[], repairShips: RepairShip[]): void {
    const r = transformCableActivity(advisories, repairShips);
    this.cableAdvisoryMarkers = r.advisoryMarkers; this.repairShipMarkers = r.repairShipMarkers;
    this.cableFaultIds = r.faultIds; this.cableDegradedIds = r.degradedIds;
    this.flushMarkers(); this.flushPaths();
  }
  public setCableHealth(_m: any): void {}
  public setProtests(events: SocialUnrestEvent[]): void { this.protestMarkers = transformProtests(events); this.flushMarkers(); }
  public setFlightDelays(delays: AirportDelayAlert[]): void {
    const r = transformFlightDelays(delays); this.flightDelayMarkers = r.delayMarkers; this.notamRingMarkers = r.notamRingMarkers; this.flushMarkers();
  }
  public setNewsLocations(data: Array<{ lat: number; lon: number; title: string; threatLevel: string; timestamp?: Date }>): void { this.newsLocationMarkers = transformNewsLocations(data); this.flushMarkers(); }
  public setCyberThreats(threats: CyberThreat[]): void { this.cyberMarkers = transformCyberThreats(threats); this.flushMarkers(); }
  public setIranEvents(events: IranEvent[]): void { this.iranMarkers = transformIranEvents(events); this.flushMarkers(); }
  public setFires(fires: Array<{ lat: number; lon: number; brightness: number; region: string; [key: string]: any }>): void { this.fireMarkers = transformFires(fires); this.flushMarkers(); }
  public setWebcams(markers: Array<WebcamEntry | WebcamCluster>): void { this.webcamMarkers = transformWebcams(markers); this.flushMarkers(); }
  public setUcdpEvents(events: UcdpGeoEvent[]): void { this.ucdpMarkers = transformUcdpEvents(events); this.flushMarkers(); }
  public setDisplacementFlows(flows: DisplacementFlow[]): void { this.displacementMarkers = transformDisplacementFlows(flows); this.flushMarkers(); }
  public setClimateAnomalies(anomalies: ClimateAnomaly[]): void { this.climateMarkers = transformClimateAnomalies(anomalies); this.flushMarkers(); }
  public setGpsJamming(hexes: GpsJamHex[]): void { this.gpsJamMarkers = transformGpsJamming(hexes); this.flushMarkers(); }
  public setEarthquakes(earthquakes: Earthquake[]): void { this.earthquakeMarkers = transformEarthquakes(earthquakes); this.flushMarkers(); }
  public setSatellites(positions: SatellitePosition[]): void {
    const r = transformSatellites(positions);
    this.satelliteMarkers = r.markers; this.satelliteFootprintMarkers = r.footprints; this.satelliteTrailPaths = r.trailPaths;
    this.rebuildSatBeamsLocal(positions); this.flushMarkers(); this.flushPaths();
  }
  public setTechEvents(events: Array<{ id: string; title: string; lat: number; lng: number; country: string; daysUntil: number; [key: string]: any }>): void { this.techMarkers = transformTechEvents(events); this.flushMarkers(); }
  public setImageryScenes(scenes: ImageryScene[]): void {
    const r = transformImageryScenes(scenes); this.imagerySceneMarkers = r.sceneMarkers; this.imageryFootprintPolygons = r.footprintPolygons;
    if (this.layers.satellites) { this.flushMarkers(); this.flushPolygons(); }
  }

  private async fetchImageryForViewport(): Promise<void> {
    if (this.destroyed) return;
    const center = this.getCenter(); if (!center) return;
    if (this.lastImageryCenter) { if (Math.abs(center.lat - this.lastImageryCenter.lat) < 2 && Math.abs(center.lon - this.lastImageryCenter.lon) < 2) return; }
    const R = 5;
    const bbox = `${Math.max(-180, center.lon - R).toFixed(4)},${Math.max(-90, center.lat - R).toFixed(4)},${Math.min(180, center.lon + R).toFixed(4)},${Math.min(90, center.lat + R).toFixed(4)}`;
    const thisVersion = ++this.imageryFetchVersion;
    try { const { fetchImageryScenes } = await import('@/services/imagery'); const scenes = await fetchImageryScenes({ bbox, limit: 20 }); if (thisVersion !== this.imageryFetchVersion) return; this.setImageryScenes(scenes); this.lastImageryCenter = { lat: center.lat, lon: center.lon }; } catch { /* best-effort */ }
  }

  // ─── Layer management ──────────────────────────────────────────────────────

  public setLayers(layers: MapLayers): void {
    const prev = this.layers; this.layers = { ...layers, dayNight: false };
    let nm = false, na = false, np = false, npoly = false;
    for (const k of Object.keys(layers) as (keyof MapLayers)[]) {
      if (prev[k] === layers[k]) continue;
      const ch = LAYER_CHANNELS.get(k);
      if (!ch) { nm = true; continue; }
      if (ch.markers) nm = true; if (ch.arcs) na = true; if (ch.paths) np = true; if (ch.polygons) npoly = true;
    }
    if (nm) this.flushMarkers(); if (na) this.flushArcs(); if (np) this.flushPaths(); if (npoly) this.flushPolygons();
    if (prev.satellites !== layers.satellites) {
      if (this.satBeamGroup) this.satBeamGroup.visible = !!layers.satellites;
      if (layers.satellites) { this.fetchImageryForViewport(); }
      else { if (this.imageryFetchTimer) { clearTimeout(this.imageryFetchTimer); this.imageryFetchTimer = null; } this.lastImageryCenter = null; this.imageryFetchVersion++; this.imagerySceneMarkers = []; this.imageryFootprintPolygons = []; }
    }
  }

  public enableLayer(layer: keyof MapLayers): void {
    if (layer === 'dayNight' || this.layers[layer]) return;
    (this.layers as any)[layer] = true;
    const toggle = this.layerTogglesEl?.querySelector(`.layer-toggle[data-layer="${layer}"] input`) as HTMLInputElement | null;
    if (toggle) toggle.checked = true;
    this.flushLayerChannels(layer); enforceLayerLimit(this.layerTogglesEl, this);
  }

  // ─── Camera / navigation ───────────────────────────────────────────────────

  public setView(view: MapView): void { this.currentView = view; if (!this.globe) return; this.wakeGlobe(); this.globe.pointOfView(VIEW_POVS[view] ?? VIEW_POVS.global, 1200); }
  public setCenter(lat: number, lon: number, zoom?: number): void {
    if (!this.globe) return; this.wakeGlobe();
    let alt = 1.2;
    if (zoom !== undefined) { if (zoom >= 7) alt = 0.08; else if (zoom >= 6) alt = 0.15; else if (zoom >= 5) alt = 0.3; else if (zoom >= 4) alt = 0.5; else if (zoom >= 3) alt = 0.8; else alt = 1.5; }
    this.globe.pointOfView({ lat, lng: lon, altitude: alt }, 1200);
  }
  public getCenter(): { lat: number; lon: number } | null { if (!this.globe) return null; const pov = this.globe.pointOfView(); return pov ? { lat: pov.lat, lon: pov.lng } : null; }
  public getBbox(): string | null {
    if (!this.globe) return null; const pov = this.globe.pointOfView(); if (!pov) return null;
    const alt = pov.altitude ?? 2.0, R = Math.min(90, Math.max(5, alt * 30));
    return `${Math.max(-180, pov.lng - R).toFixed(4)},${Math.max(-90, pov.lat - R).toFixed(4)},${Math.min(180, pov.lng + R).toFixed(4)},${Math.min(90, pov.lat + R).toFixed(4)}`;
  }
  public resize(): void { if (!this.globe || this.destroyed) return; this.wakeGlobe(); this.applyRenderQualityLocal(undefined, this.container.clientWidth, this.container.clientHeight); }

  // ─── State API & callbacks ─────────────────────────────────────────────────

  public getState(): MapContainerState { return { zoom: 1, pan: { x: 0, y: 0 }, view: this.currentView, layers: this.layers, timeRange: this.timeRange }; }
  public setTimeRange(range: TimeRange): void { this.timeRange = range; }
  public getTimeRange(): TimeRange { return this.timeRange; }
  public setOnHotspotClick(cb: (h: Hotspot) => void): void { this.onHotspotClickCb = cb; }
  public setOnCountryClick(_cb: (c: CountryClickPayload) => void): void {}
  public setOnMapContextMenu(cb: (payload: { lat: number; lon: number; screenX: number; screenY: number }) => void): void { this.onMapContextMenuCb = cb; }
  public render(): void { this.resize(); }
  public setIsResizing(isResizing: boolean): void { if (!isResizing) this.resize(); }
  public setZoom(_z: number): void {}

  public setRenderPaused(paused: boolean): void {
    if (this.renderPaused === paused) return;
    this.renderPaused = paused;
    if (paused) {
      if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
      if (this.flushMaxTimer) { clearTimeout(this.flushMaxTimer); this.flushMaxTimer = null; }
      this.pendingFlushWhilePaused = true;
      if (this.autoRotateTimer) { clearTimeout(this.autoRotateTimer); this.autoRotateTimer = null; }
    }
    if (this.controls) {
      if (paused) {
        this.controlsAutoRotateBeforePause = this.controls.autoRotate; this.controlsDampingBeforePause = this.controls.enableDamping;
        this.controls.autoRotate = false; this.controls.enableDamping = false;
      } else {
        if (this.controlsAutoRotateBeforePause !== null) this.controls.autoRotate = this.controlsAutoRotateBeforePause;
        if (this.controlsDampingBeforePause !== null) this.controls.enableDamping = this.controlsDampingBeforePause;
        this.controlsAutoRotateBeforePause = null; this.controlsDampingBeforePause = null;
      }
    }
    if (!paused && this.pendingFlushWhilePaused) { this.pendingFlushWhilePaused = false; this.flushMarkers(); }
  }

  // ─── No-op stubs ───────────────────────────────────────────────────────────

  public updateHotspotActivity(_news: any[]): void {}
  public updateMilitaryForEscalation(_f: any[], _v: any[]): void {}
  public getHotspotDynamicScore(_id: string) { return undefined; }
  public getHotspotLevels() { return {} as Record<string, string>; }
  public setHotspotLevels(_l: Record<string, string>): void {}
  public initEscalationGetters(): void {}
  public highlightAssets(_assets: any): void {}
  public setOnLayerChange(cb: (layer: keyof MapLayers, enabled: boolean, source: 'user' | 'programmatic') => void): void { this.onLayerChangeCb = cb; }
  public setOnTimeRangeChange(_cb: any): void {}
  public hideLayerToggle(layer: keyof MapLayers): void { this.layerTogglesEl?.querySelector(`.layer-toggle[data-layer="${layer}"]`)?.remove(); }
  public setLayerLoading(layer: keyof MapLayers, loading: boolean): void { this.layerTogglesEl?.querySelector(`.layer-toggle[data-layer="${layer}"]`)?.classList.toggle('loading', loading); }
  public setLayerReady(layer: keyof MapLayers, hasData: boolean): void { this.layerTogglesEl?.querySelector(`.layer-toggle[data-layer="${layer}"]`)?.classList.toggle('no-data', !hasData); }
  public flashAssets(_type: string, _ids: string[]): void {}
  public flashLocation(lat: number, lon: number, durationMs = 2000): void {
    if (!this.globe || !this.initialized) return;
    const id = `flash-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    this.flashMarkers.push({ _kind: 'flash', id, _lat: lat, _lng: lon });
    this.flushMarkers();
    setTimeout(() => { this.flashMarkers = this.flashMarkers.filter(m => m.id !== id); this.flushMarkers(); }, durationMs);
  }
  public triggerHotspotClick(_id: string): void {}
  public triggerConflictClick(_id: string): void {}
  public triggerBaseClick(_id: string): void {}
  public triggerPipelineClick(_id: string): void {}
  public triggerCableClick(_id: string): void {}
  public triggerDatacenterClick(_id: string): void {}
  public triggerNuclearClick(_id: string): void {}
  public triggerIrradiatorClick(_id: string): void {}
  public fitCountry(code: string): void {
    if (!this.globe) return; const bbox = getCountryBbox(code); if (!bbox) return;
    const [minLon, minLat, maxLon, maxLat] = bbox; const lat = (minLat + maxLat) / 2; const lng = (minLon + maxLon) / 2;
    const span = Math.max(maxLat - minLat, maxLon - minLon);
    this.globe.pointOfView({ lat, lng, altitude: span > 60 ? 1.0 : span > 20 ? 0.7 : span > 8 ? 0.45 : span > 3 ? 0.25 : 0.12 }, 1200);
  }
  public highlightCountry(_code: string): void {}
  public clearCountryHighlight(): void {}
  public setPositiveEvents(_events: any[]): void {}
  public setKindnessData(_points: any[]): void {}
  public setHappinessScores(_data: any): void {}
  public setSpeciesRecoveryZones(_zones: any[]): void {}
  public setRenewableInstallations(_installations: any[]): void {}
  public onHotspotClicked(cb: (h: Hotspot) => void): void { this.onHotspotClickCb = cb; }
  public onTimeRangeChanged(_cb: (r: TimeRange) => void): void {}
  public onStateChanged(_cb: (s: MapContainerState) => void): void {}
  public setOnCountry(_cb: any): void {}
  public getHotspotLevel(_id: string) { return 'low'; }

  // ─── Visual & render quality ───────────────────────────────────────────────

  private async rebuildSatBeamsLocal(positions: SatellitePosition[]): Promise<void> {
    this.satBeamGroup = await rebuildSatBeams(positions, this.globe!, this.destroyed, !!this.layers.satellites, this.satBeamGroup);
  }
  private async applyEnhancedVisualsLocal(): Promise<void> {
    if (!this.globe || this.destroyed) return;
    const refs = await applyEnhancedVisuals(this.globe, this.destroyed);
    if (refs) { this.outerGlow = refs.outerGlow; this.innerGlow = refs.innerGlow; this.starField = refs.starField; this.cyanLight = refs.cyanLight; startExtrasLoop(refs, this.destroyed); this.extrasAnimFrameId = refs.extrasAnimFrameId; }
  }
  private removeEnhancedVisualsLocal(): void {
    const refs: EnhancedVisualRefs = { outerGlow: this.outerGlow, innerGlow: this.innerGlow, starField: this.starField, cyanLight: this.cyanLight, extrasAnimFrameId: this.extrasAnimFrameId };
    removeEnhancedVisuals(this.globe, refs, this.savedDefaultMaterial);
    this.outerGlow = refs.outerGlow; this.innerGlow = refs.innerGlow; this.starField = refs.starField; this.cyanLight = refs.cyanLight; this.extrasAnimFrameId = refs.extrasAnimFrameId;
  }
  private applyVisualPreset(preset: GlobeVisualPreset): void { if (!this.globe || this.destroyed) return; this.removeEnhancedVisualsLocal(); if (preset === 'enhanced') this.applyEnhancedVisualsLocal(); }
  private applyRenderQualityLocal(scale?: GlobeRenderScale, width?: number, height?: number): void { if (this.globe) applyRenderQuality(this.globe, scale, width, height, this.container.clientWidth, this.container.clientHeight); }
  private applyPerformanceProfileLocal(profile: GlobePerformanceProfile): void {
    const r = applyPerformanceProfile(this.globe!, profile, this.initialized, this.destroyed, this.webglLost, this._pulseEnabled, this.outerGlow, this.innerGlow);
    this._pulseEnabled = r.pulseEnabled; if (r.needFlush) this.flushMarkers();
  }

  // ─── Idle rendering control ────────────────────────────────────────────────

  private wakeGlobe(): void {
    if (this.destroyed || !this.globe) return;
    if (!this.isGlobeAnimating) { this.isGlobeAnimating = true; try { (this.globe as any).resumeAnimation?.(); } catch {} }
    this.scheduleIdlePause();
  }
  private scheduleIdlePause(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => { if (this.destroyed || !this.globe || this.renderPaused || this.controls?.autoRotate) return; this.isGlobeAnimating = false; try { (this.globe as any).pauseAnimation?.(); } catch {} }, 3000);
  }
  private setupVisibilityHandler(): void {
    this.visibilityHandler = () => {
      if (document.hidden) {
        if (this.isGlobeAnimating && this.globe) { this.isGlobeAnimating = false; try { (this.globe as any).pauseAnimation?.(); } catch {} }
        if (this.extrasAnimFrameId != null) { cancelAnimationFrame(this.extrasAnimFrameId); this.extrasAnimFrameId = null; }
      } else {
        this.wakeGlobe();
        if (this.outerGlow && this.extrasAnimFrameId == null) {
          const refs: EnhancedVisualRefs = { outerGlow: this.outerGlow, innerGlow: this.innerGlow, starField: this.starField, cyanLight: this.cyanLight, extrasAnimFrameId: this.extrasAnimFrameId };
          startExtrasLoop(refs, this.destroyed); this.extrasAnimFrameId = refs.extrasAnimFrameId;
        }
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  // ─── Destroy ───────────────────────────────────────────────────────────────

  public destroy(): void {
    this.popup?.hide(); this.popup = null;
    this.vesselData.clear(); this.clusterData.clear();
    this.container.removeEventListener('contextmenu', this.handleContextMenu);
    this.unsubscribeGlobeQuality?.(); this.unsubscribeGlobeQuality = null;
    this.unsubscribeGlobeTexture?.(); this.unsubscribeGlobeTexture = null;
    this.unsubscribeVisualPreset?.(); this.unsubscribeVisualPreset = null;
    if (this.visibilityHandler) { document.removeEventListener('visibilitychange', this.visibilityHandler); this.visibilityHandler = null; }
    if (this.idleTimer) { clearTimeout(this.idleTimer); this.idleTimer = null; }
    if (this.imageryFetchTimer) { clearTimeout(this.imageryFetchTimer); this.imageryFetchTimer = null; }
    this.imageryFetchVersion++;
    if (this.controlsEndHandler && this.controls) { this.controls.removeEventListener('end', this.controlsEndHandler); this.controlsEndHandler = null; }
    this.destroyed = true;
    if (this.extrasAnimFrameId != null) { cancelAnimationFrame(this.extrasAnimFrameId); this.extrasAnimFrameId = null; }
    const scene = this.globe?.scene();
    if (this.satBeamGroup && scene) { scene.remove(this.satBeamGroup); this.satBeamGroup.traverse((c: any) => { if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }); this.satBeamGroup = null; }
    for (const obj of [this.outerGlow, this.innerGlow, this.starField, this.cyanLight]) { if (!obj) continue; if (scene) scene.remove(obj); if (obj.geometry) obj.geometry.dispose(); if (obj.material) obj.material.dispose(); }
    if (this.globe) { const mat = this.globe.globeMaterial(); if (mat && (mat as any).isMeshStandardMaterial) mat.dispose(); }
    this.outerGlow = null; this.innerGlow = null; this.starField = null; this.cyanLight = null;
    if (this.flushTimer) { clearTimeout(this.flushTimer); this.flushTimer = null; }
    if (this.flushMaxTimer) { clearTimeout(this.flushMaxTimer); this.flushMaxTimer = null; }
    if (this.autoRotateTimer) clearTimeout(this.autoRotateTimer);
    this.reversedRingCache.clear(); this.hideTooltip();
    if (this.satHoverStyle) { this.satHoverStyle.remove(); this.satHoverStyle = null; }
    this.controls = null; this.controlsAutoRotateBeforePause = null; this.controlsDampingBeforePause = null; this.layerTogglesEl = null;
    if (this.globe) { try { this.globe._destructor(); } catch {} this.globe = null; }
    this.container.innerHTML = ''; this.container.classList.remove('globe-mode'); this.container.style.cssText = '';
  }
}
