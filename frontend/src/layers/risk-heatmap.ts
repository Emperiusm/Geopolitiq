import { ScatterplotLayer } from '@deck.gl/layers';
import type { Country, RiskLevel } from '../state/store';

// Helper to convert named CSS variable colors to RGB arrays for DeckGL
export function getRiskColorRGB(risk: RiskLevel): [number, number, number] {
  switch (risk) {
    case 'catastrophic': return [255, 32, 64];
    case 'extreme': return [255, 96, 48];
    case 'severe': return [255, 144, 32];
    case 'stormy': return [255, 184, 64];
    case 'cloudy': return [136, 160, 192];
    case 'clear': return [64, 216, 144];
    default: return [100, 100, 100];
  }
}

export function createRiskHeatmapLayer(
  countries: Country[],
  visible: boolean,
  opacity: number = 0.8,
  zoom: number = 1
) {
  // Exponential scale: small at globe overview, grows when zoomed in
  const scale = Math.pow(1.5, zoom);

  return new ScatterplotLayer({
    id: 'risk-heatmap',
    data: countries,
    visible,
    opacity,
    pickable: true,
    getPosition: (d: Country) => [d.lng, d.lat],
    getFillColor: (d: Country) => getRiskColorRGB(d.risk),
    getRadius: (d: Country) => {
      if (d.risk === 'catastrophic') return 8;
      if (d.risk === 'extreme') return 6;
      if (d.risk === 'severe') return 4.5;
      return 3;
    },
    radiusUnits: 'pixels' as const,
    radiusScale: scale,
    radiusMaxPixels: 50,
    updateTriggers: {
      getRadius: [zoom],
    },
  });
}
