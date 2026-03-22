import { ScatterplotLayer } from '@deck.gl/layers';

export function createNSAZonesLayer(nsaZones: any[], visible: boolean) {
  return new ScatterplotLayer({
    id: 'nsa-zones',
    data: nsaZones,
    visible,
    pickable: true,
    opacity: 0.3,
    stroked: true,
    filled: true,
    getLineColor: [168, 85, 247, 255], // --cat-security
    getLineWidth: 2,
    lineWidthMinPixels: 1,
    getPosition: d => [d.lng, d.lat],
    getFillColor: [168, 85, 247, 100],
    getRadius: d => (d.radiusKm || 100) * 1000,
    radiusMinPixels: 10,
  });
}
