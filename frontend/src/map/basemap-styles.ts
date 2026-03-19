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
const satellite: StyleSpecification = JSON.parse(JSON.stringify(intel));

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
