import { ArcLayer } from '@deck.gl/layers';

export function createTradeRoutesLayer(
  tradeArcsData: any, // Binary Float32Array or parsed JSON
  visible: boolean
) {
  return new ArcLayer({
    id: 'trade-routes',
    data: tradeArcsData,
    visible,
    pickable: true,
    getWidth: 2,
    getSourcePosition: (d: any) => [d.fromLng, d.fromLat],
    getTargetPosition: (d: any) => [d.toLng, d.toLat],
    getSourceColor: [20, 184, 166, 160], // --cat-economic
    getTargetColor: [20, 184, 166, 160],
    greatCircle: true,
  });
}
