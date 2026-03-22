import { _GlobeView as GlobeView } from '@deck.gl/core';

export function createGlobeView() {
  return new GlobeView({
    id: 'globe',
    controller: true,
    resolution: 10,
  });
}

export const GLOBE_INITIAL_VIEW_STATE = {
  longitude: 0,
  latitude: 20,
  zoom: 1.5,
  minZoom: 0,
  maxZoom: 20,
  pitch: 0,
  bearing: 0,
};
