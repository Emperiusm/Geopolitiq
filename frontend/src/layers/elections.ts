import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';

export function createElectionsLayer(elections: any[], visible: boolean) {
  const dots = new ScatterplotLayer({
    id: 'elections-markers',
    data: elections,
    visible,
    pickable: true,
    getPosition: d => [d.lng, d.lat],
    getFillColor: [16, 185, 129, 255], // --cat-political
    getRadius: 80000,
    radiusMinPixels: 5,
    radiusMaxPixels: 15,
  });

  const text = new TextLayer({
    id: 'elections-text',
    data: elections,
    visible,
    getPosition: d => [d.lng, d.lat],
    getText: d => `T-${d.daysUntil || 0}`,
    getSize: 12,
    getColor: [255, 255, 255, 255],
    getPixelOffset: [0, 15],
    fontFamily: 'JetBrains Mono',
  });

  return [dots, text];
}
