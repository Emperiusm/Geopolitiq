import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { basemapStyles } from './basemap-styles';
import type { BasemapId } from '../state/store';

let pmtilesInitialized = false;

export function initPMTiles() {
  if (pmtilesInitialized) return;
  const protocol = new Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  pmtilesInitialized = true;
}

export function getMapStyle(id: BasemapId): maplibregl.StyleSpecification {
  return basemapStyles[id];
}
