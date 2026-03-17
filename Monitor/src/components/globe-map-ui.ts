/**
 * Globe map overlay UI — zoom controls, layer toggle panel, and layer management.
 *
 * Extracted from GlobeMap.ts.
 */

import type { GlobeInstance } from 'globe.gl';
import { t } from '@/services/i18n';
import { SITE_VARIANT } from '@/config/variant';
import { getSecretState } from '@/services/runtime-config';
import { getLayersForVariant, resolveLayerLabel, bindLayerSearch, type MapVariant } from '@/config/map-layer-definitions';
import { showLayerWarning } from '@/utils/layer-warning';
import type { MapLayers } from '@/types';
import type { MapView } from './MapContainer';

// ─── Zoom controls ───────────────────────────────────────────────────────────

export function createControls(
  container: HTMLElement,
  zoomIn: () => void,
  zoomOut: () => void,
  resetView: () => void,
): void {
  const el = document.createElement('div');
  el.className = 'map-controls deckgl-controls';
  el.innerHTML = `
    <span class="globe-beta-badge">BETA</span>
    <div class="zoom-controls">
      <button class="map-btn zoom-in"    title="Zoom in">+</button>
      <button class="map-btn zoom-out"   title="Zoom out">-</button>
      <button class="map-btn zoom-reset" title="Reset view">&#8962;</button>
    </div>`;
  container.appendChild(el);
  el.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if      (target.classList.contains('zoom-in'))    zoomIn();
    else if (target.classList.contains('zoom-out'))   zoomOut();
    else if (target.classList.contains('zoom-reset')) resetView();
  });
}

export function zoomInGlobe(globe: GlobeInstance | null): void {
  if (!globe) return;
  const pov = globe.pointOfView();
  if (!pov) return;
  const alt = Math.max(0.05, (pov.altitude ?? 1.8) * 0.6);
  globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: alt }, 500);
}

export function zoomOutGlobe(globe: GlobeInstance | null): void {
  if (!globe) return;
  const pov = globe.pointOfView();
  if (!pov) return;
  const alt = Math.min(4.0, (pov.altitude ?? 1.8) * 1.6);
  globe.pointOfView({ lat: pov.lat, lng: pov.lng, altitude: alt }, 500);
}

// ─── Layer toggle panel ──────────────────────────────────────────────────────

export function createLayerToggles(
  container: HTMLElement,
  layers: MapLayers,
  callbacks: {
    onToggle: (layer: keyof MapLayers, checked: boolean) => void;
    onWebcamModeChange: () => void;
    getWebcamMode: () => string;
    setWebcamMode: (mode: string) => void;
    enforceLayerLimit: (el: HTMLElement) => void;
  },
): HTMLElement {
  const layerDefs = getLayersForVariant((SITE_VARIANT || 'full') as MapVariant, 'globe');
  const _wmKey = getSecretState('WORLDMONITOR_API_KEY').present;
  const layerItems = layerDefs.map(def => ({
    key: def.key,
    label: resolveLayerLabel(def, t),
    icon: def.icon,
    premium: def.premium,
  }));

  const el = document.createElement('div');
  el.className = 'layer-toggles deckgl-layer-toggles';
  el.style.bottom = 'auto';
  el.style.top = '10px';
  el.innerHTML = `
    <div class="toggle-header">
      <span>${t('components.deckgl.layersTitle')}</span>
      <button class="toggle-collapse">&#9660;</button>
    </div>
    <input type="text" class="layer-search" placeholder="${t('components.deckgl.layerSearch')}" autocomplete="off" spellcheck="false" />
    <div class="toggle-list" style="max-height:32vh;overflow-y:auto;scrollbar-width:thin;">
      ${layerItems.map(({ key, label, icon, premium }) => {
        const isLocked = premium === 'locked' && !_wmKey;
        const isEnhanced = premium === 'enhanced' && !_wmKey;
        return `
        <label class="layer-toggle${isLocked ? ' layer-toggle-locked' : ''}" data-layer="${key}">
          <input type="checkbox" ${layers[key] ? 'checked' : ''}${isLocked ? ' disabled' : ''}>
          <span class="toggle-icon">${icon}</span>
          <span class="toggle-label">${label}${isLocked ? ' \uD83D\uDD12' : ''}${isEnhanced ? ' <span class="layer-pro-badge">PRO</span>' : ''}</span>
        </label>`;
      }).join('')}
    </div>`;
  const authorBadge = document.createElement('div');
  authorBadge.className = 'map-author-badge';
  authorBadge.textContent = '\u00A9 Elie Habib \u00B7 Someone\u2122';
  el.appendChild(authorBadge);
  container.appendChild(el);

  el.querySelectorAll('.layer-toggle input').forEach(input => {
    input.addEventListener('change', () => {
      const layer = (input as HTMLInputElement).closest('.layer-toggle')?.getAttribute('data-layer') as keyof MapLayers | null;
      if (layer) {
        const checked = (input as HTMLInputElement).checked;
        callbacks.onToggle(layer, checked);
        if (layer === 'webcams') {
          const modeRow = el.querySelector('.webcam-mode-row') as HTMLElement | null;
          if (modeRow) modeRow.style.display = checked ? '' : 'none';
        }
      }
    });
  });

  // Webcam marker-mode sub-toggle
  const webcamToggleEl = el.querySelector('.layer-toggle[data-layer="webcams"]') as HTMLElement | null;
  if (webcamToggleEl) {
    const modeRow = document.createElement('div');
    modeRow.className = 'webcam-mode-row';
    modeRow.style.cssText = 'display:none;padding:2px 6px 4px 24px;font-size:10px;color:#aaa;';
    const renderModeLabel = (): string => callbacks.getWebcamMode() === 'emoji' ? '&#128247; icon mode' : '&#128512; emoji mode';
    const modeBtn = document.createElement('button');
    modeBtn.style.cssText = 'background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);color:#00d4ff;font-size:10px;padding:1px 6px;border-radius:3px;cursor:pointer;margin-left:2px;';
    modeBtn.title = 'Toggle webcam marker style';
    modeBtn.innerHTML = renderModeLabel();
    modeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = callbacks.getWebcamMode() === 'icon' ? 'emoji' : 'icon';
      callbacks.setWebcamMode(next);
      modeBtn.innerHTML = renderModeLabel();
      callbacks.onWebcamModeChange();
    });
    const modeLabel = document.createElement('span');
    modeLabel.textContent = 'Marker: ';
    modeRow.appendChild(modeLabel);
    modeRow.appendChild(modeBtn);
    webcamToggleEl.insertAdjacentElement('afterend', modeRow);
    if (layers.webcams) modeRow.style.display = '';
  }

  callbacks.enforceLayerLimit(el);

  bindLayerSearch(el);
  const searchEl = el.querySelector('.layer-search') as HTMLElement | null;

  const collapseBtn = el.querySelector('.toggle-collapse');
  const list = el.querySelector('.toggle-list') as HTMLElement | null;
  let collapsed = false;
  collapseBtn?.addEventListener('click', () => {
    collapsed = !collapsed;
    if (list) list.style.display = collapsed ? 'none' : '';
    if (searchEl) searchEl.style.display = collapsed ? 'none' : '';
    if (collapseBtn) (collapseBtn as HTMLElement).innerHTML = collapsed ? '&#9654;' : '&#9660;';
  });

  // Intercept wheel on layer panel
  el.addEventListener('wheel', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (list) list.scrollTop += e.deltaY;
  }, { passive: false });

  return el;
}

// ─── Layer limit enforcement ─────────────────────────────────────────────────

export function enforceLayerLimit(
  layerTogglesEl: HTMLElement | null,
  state: { layerWarningShown: boolean; lastActiveLayerCount: number },
): void {
  if (!layerTogglesEl) return;
  const WARN_THRESHOLD = 6;
  const activeCount = Array.from(layerTogglesEl.querySelectorAll<HTMLInputElement>('.layer-toggle input'))
    .filter(i => i.checked).length;
  const increasing = activeCount > state.lastActiveLayerCount;
  state.lastActiveLayerCount = activeCount;
  if (activeCount >= WARN_THRESHOLD && increasing && !state.layerWarningShown) {
    state.layerWarningShown = true;
    showLayerWarning(WARN_THRESHOLD);
  } else if (activeCount < WARN_THRESHOLD) {
    state.layerWarningShown = false;
  }
}
