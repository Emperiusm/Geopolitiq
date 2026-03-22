import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';

export function createChokepointsLayer(chokepoints: any[], visible: boolean) {
  const getStatusColor = (status: string): [number, number, number] => {
    if (status === 'blocked') return [255, 64, 88]; // danger
    if (status === 'contested') return [255, 176, 32]; // warning
    return [0, 214, 143]; // success
  };

  const dots = new ScatterplotLayer({
    id: 'chokepoints-dots',
    data: chokepoints,
    visible,
    pickable: true,
    getPosition: d => [d.lng, d.lat],
    getFillColor: d => getStatusColor(d.status),
    getRadius: 100000,
    radiusMinPixels: 6,
    radiusMaxPixels: 20,
  });

  const text = new TextLayer({
    id: 'chokepoints-text',
    data: chokepoints,
    visible,
    getPosition: d => [d.lng, d.lat],
    getText: d => d.name,
    getSize: 12,
    getColor: [255, 255, 255, 200],
    getPixelOffset: [0, 15],
    fontFamily: 'Inter',
  });

  return [dots, text];
}
