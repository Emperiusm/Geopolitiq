import { ScatterplotLayer } from '@deck.gl/layers';

export function createMilitaryBasesLayer(bases: any[], visible: boolean) {
  // Clustered rendering can be added with supercluster or deck.gl clustering
  return new ScatterplotLayer({
    id: 'military-bases',
    data: bases,
    visible,
    pickable: true,
    getPosition: d => [d.lng, d.lat],
    getFillColor: [100, 150, 255, 200], // Will use country color when mapped
    getRadius: 30000,
    radiusMinPixels: 4,
    radiusMaxPixels: 15,
  });
}
