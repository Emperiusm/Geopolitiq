import { h } from 'preact';
import { useRef, useEffect, useCallback } from 'preact/hooks';
import { Deck, _GlobeView as GlobeView, MapView } from '@deck.gl/core';
import { GLOBE_INITIAL_VIEW_STATE } from './globe-view';
import { createFlatView, initPMTiles, getMapStyle } from './flat-view';
import maplibregl from 'maplibre-gl';
import { OCEAN_COLORS, TINT_SCALE } from './basemap-styles';
import { handleViewStateChange } from './view-transition';
import { viewMode, layers, bootstrapData, selectCountry, selectedEntity, rightPanelOpen, heatmapOpacity, basemap } from '../state/store';
import { getDayNightState } from './day-night';
import { SolidPolygonLayer } from '@deck.gl/layers';
import { createRiskHeatmapLayer } from '../layers/risk-heatmap';

/**
 * Densely-tessellated full-world polygon for the globe ocean base.
 * Uses small 5° steps so the polygon wraps correctly around the 3D sphere
 * instead of cutting through it like a flat rectangle would.
 */
function createOceanPolygon(): number[][] {
  const pts: number[][] = [];
  // Bottom edge: west to east
  for (let lng = -180; lng <= 180; lng += 5) pts.push([lng, -90]);
  // Right edge: south to north
  for (let lat = -90; lat <= 90; lat += 5) pts.push([180, lat]);
  // Top edge: east to west
  for (let lng = 180; lng >= -180; lng -= 5) pts.push([lng, 90]);
  // Left edge: north to south
  for (let lat = 90; lat >= -90; lat -= 5) pts.push([-180, lat]);
  return pts;
}
const OCEAN_POLYGON = createOceanPolygon();
import { createTradeRoutesLayer } from '../layers/trade-routes';
import { createChokepointsLayer } from '../layers/chokepoints';
import { createMilitaryBasesLayer } from '../layers/military-bases';
import { createNSAZonesLayer } from '../layers/nsa-zones';
import { createConflictsLayer } from '../layers/conflicts';
import { createElectionsLayer } from '../layers/elections';
import { createRiskPolygonLayer } from '../layers/risk-polygons';

/** Idle timeout before auto-rotate kicks in (ms) */
const AUTO_ROTATE_IDLE_MS = 4000;
/** Longitude increment per animation frame during auto-rotate */
const AUTO_ROTATE_SPEED = 0.02;

interface HoverInfo {
  x: number;
  y: number;
  name: string;
}

/**
 * Smoothly fly the camera to a target position.
 * Call from anywhere via the exported reference.
 */
let _deckInstance: Deck<any> | null = null;
let _currentViewState: Record<string, any> = {
  globe: { ...GLOBE_INITIAL_VIEW_STATE },
  flat: { longitude: 0, latitude: 20, zoom: 0 },
};

export function flyTo(longitude: number, latitude: number, zoom?: number) {
  if (!_deckInstance) return;
  const activeView = viewMode.value; // 'globe' | 'flat'
  const targetZoom = zoom ?? (activeView === 'globe' ? 3 : 4);

  const nextViewState = {
    ..._currentViewState,
    [activeView]: {
      ..._currentViewState[activeView],
      longitude,
      latitude,
      zoom: targetZoom,
      transitionDuration: 1500,
      transitionInterpolator: undefined, // Deck.GL uses default linear
    },
  };

  _currentViewState = nextViewState;
  _deckInstance.setProps({ initialViewState: nextViewState });
}

export function DeckMap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<Deck<any> | null>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const hoverRef = useRef<HoverInfo | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  // Auto-rotate state
  const lastInteractionRef = useRef<number>(Date.now());
  const autoRotatingRef = useRef<boolean>(false);
  const prevBasemapRef = useRef<string>(basemap.value);

  const markInteraction = useCallback(() => {
    lastInteractionRef.current = Date.now();
    autoRotatingRef.current = false;
  }, []);

  /** Get the single active view */
  const getViews = () => {
    if (viewMode.value === 'flat') {
      return [new MapView({
        id: 'flat',
        controller: true,
        map: maplibregl,
        mapStyle: getMapStyle(basemap.value),
      } as any)];
    }
    return [new GlobeView({ id: 'globe', controller: true, resolution: 10 })];
  };

  useEffect(() => {
    initPMTiles();

    if (!containerRef.current) return;

    const initialViewState = {
      globe: { ...GLOBE_INITIAL_VIEW_STATE },
      flat: { longitude: 0, latitude: 20, zoom: 0 },
    };
    _currentViewState = initialViewState;

    const deck = new Deck({
      parent: containerRef.current,
      views: getViews(),
      initialViewState,
      onViewStateChange: ({ viewState, viewId }) => {
        markInteraction();
        _currentViewState = {
          ..._currentViewState,
          [viewId as string]: viewState,
        };
        handleViewStateChange({ viewState });
        return viewState;
      },
      onClick: (info: any) => {
        if (!info.object) return;
        const obj = info.object;

        if (info.layer?.id === 'risk-heatmap') {
          // Country feature from heatmap layer
          selectCountry(obj);
        } else {
          // Other entity types
          selectedEntity.value = {
            type: info.layer?.id ?? 'unknown',
            id: obj._id ?? obj.id ?? '',
          };
          rightPanelOpen.value = true;
        }
      },
      onHover: (info: any) => {
        if (info.object && info.layer) {
          const name =
            info.object.name ??
            info.object.title ??
            info.object.label ??
            info.layer.id;
          hoverRef.current = { x: info.x, y: info.y, name };
        } else {
          hoverRef.current = null;
        }
        updateTooltip();
      },
      onDragStart: () => markInteraction(),
      layers: [], // Managed below in update sequence
    });

    deckRef.current = deck;
    _deckInstance = deck;

    // Listen for wheel / pointer events on the container to mark interaction
    const el = containerRef.current;
    el.addEventListener('pointerdown', markInteraction);
    el.addEventListener('wheel', markInteraction);

    const animate = () => {
      timeRef.current += 0.01;
      // Check for basemap change and update views
      if (basemap.value !== prevBasemapRef.current) {
        prevBasemapRef.current = basemap.value;
        deckRef.current?.setProps({ views: getViews() });
      }
      handleAutoRotate();
      handleDayNightTint();
      updateLayers();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      el.removeEventListener('pointerdown', markInteraction);
      el.removeEventListener('wheel', markInteraction);
      deckRef.current?.finalize();
      deckRef.current = null;
      _deckInstance = null;
    };
  }, []);


  // ── Auto-rotate logic ──────────────────────────────────────
  const handleAutoRotate = () => {
    if (viewMode.value !== 'globe') return;
    const idleTime = Date.now() - lastInteractionRef.current;
    if (idleTime < AUTO_ROTATE_IDLE_MS) return;

    autoRotatingRef.current = true;
    const globeState = _currentViewState.globe ?? {};
    const nextLng = ((globeState.longitude ?? 0) + AUTO_ROTATE_SPEED + 180) % 360 - 180;

    _currentViewState = {
      ..._currentViewState,
      globe: { ...globeState, longitude: nextLng },
    };

    deckRef.current?.setProps({
      initialViewState: _currentViewState,
    });
  };

  // ── Day/night ambient tint ─────────────────────────────────
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

  // ── Tooltip DOM update ─────────────────────────────────────
  const updateTooltip = () => {
    const el = tooltipRef.current;
    if (!el) return;
    const info = hoverRef.current;
    if (!info) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.style.left = `${info.x + 12}px`;
    el.style.top = `${info.y + 12}px`;
    el.textContent = info.name;
  };

  // ── Sync state signals to DeckGL ───────────────────────────
  const updateLayers = () => {
    if (!deckRef.current || !bootstrapData.value) return;
    const data = bootstrapData.value;
    const l = layers.value;

    const baseLayers = [
      // Ocean base — tessellated polygon that wraps around the 3D globe sphere
      new SolidPolygonLayer({
        id: 'ocean-base',
        data: [{ polygon: OCEAN_POLYGON }],
        getPolygon: (d: any) => d.polygon,
        getFillColor: OCEAN_COLORS[basemap.value],
      }),
      // Country polygon fill — visible in both globe and flat modes
      createRiskPolygonLayer(data.countries, l.riskHeatmap, viewMode.value === 'flat' ? 0.5 : 1.0),
      createRiskHeatmapLayer(data.countries, l.riskHeatmap, heatmapOpacity.value, _currentViewState[viewMode.value]?.zoom ?? 1),
      createTradeRoutesLayer(data.tradeRoutes, l.tradeRoutes),
      ...createChokepointsLayer(data.chokepoints, l.chokepoints),
      createMilitaryBasesLayer(data.bases, l.militaryBases),
      createNSAZonesLayer(data.nsa, l.nsaZones),
      createConflictsLayer(data.conflicts, l.conflicts, timeRef.current),
      ...createElectionsLayer(data.elections, l.elections),
    ];

    deckRef.current.setProps({
      layers: baseLayers,
    });
  };

  // Layers update runs in animation loop; no need for useEffect here

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'absolute' }}>
      {/* Day/night tint overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'var(--map-tint, transparent)',
          pointerEvents: 'none',
          transition: 'background-color 2s ease',
          zIndex: 1,
        }}
      />
      {/* Hover tooltip */}
      <div
        ref={tooltipRef}
        style={{
          display: 'none',
          position: 'absolute',
          pointerEvents: 'none',
          zIndex: 10,
          background: 'rgba(8, 8, 13, 0.9)',
          color: '#c8c8e0',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontFamily: 'Inter, sans-serif',
          border: '1px solid rgba(255,255,255,0.08)',
          whiteSpace: 'nowrap',
          maxWidth: '240px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      />
    </div>
  );
}
