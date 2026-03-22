import { ScatterplotLayer } from '@deck.gl/layers';

// In a real application, you might use a custom layer for pulsing rings.
// Here we use ScatterplotLayer and we can animate it externally by updating the `time` prop.

export function createConflictsLayer(
  conflicts: any[],
  visible: boolean,
  time: number
) {
  return new ScatterplotLayer({
    id: 'conflicts-pulse',
    data: conflicts,
    visible,
    pickable: true,
    opacity: 0.8,
    stroked: true,
    filled: false,
    getPosition: d => [d.lng, d.lat],
    getLineColor: d => {
      // red pulse
      const alpha = 255 * (1 - (time % 1));
      return [255, 64, 88, alpha];
    },
    getLineWidth: 3,
    lineWidthMinPixels: 2,
    getRadius: d => {
      // The radius grows based on time modulo
      const baseSize = d.dayCount > 100 ? 200000 : 100000;
      return baseSize * (0.5 + (time % 1));
    },
    updateTriggers: {
      getLineColor: [time],
      getRadius: [time],
    },
    transitions: {
      getRadius: {
        duration: 0,
        enter: (value: any) => [value[0], 0]
      }
    }
  });
}
