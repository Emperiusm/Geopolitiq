import { viewMode } from '../state/store';

const ZOOM_THRESHOLD = 4.5;

export function handleViewStateChange({ viewState, interactionState }: any) {
  // Switch to flat map when zoomed in deeply
  if (viewState.zoom > ZOOM_THRESHOLD && viewMode.value === 'globe') {
    viewMode.value = 'flat';
  } else if (viewState.zoom <= ZOOM_THRESHOLD && viewMode.value === 'flat') {
    viewMode.value = 'globe';
  }

  // Adjust viewState to maintain position appropriately during transition
  // We can return the modified view state if necessary
  return viewState;
}

// Optional helper to calculate crossfade opacity between views based on zoom
export function getCrossfadeOpacity(zoom: number): number {
  if (zoom < ZOOM_THRESHOLD - 0.5) return 1; // 100% globe
  if (zoom > ZOOM_THRESHOLD + 0.5) return 0; // 0% globe, 100% flat
  // linear interpolation in the transition zone
  return 1 - (zoom - (ZOOM_THRESHOLD - 0.5));
}
