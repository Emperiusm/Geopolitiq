/**
 * Globe map marker element building, tooltip rendering, and click handling.
 *
 * Extracted from GlobeMap.ts — contains buildMarkerElement, handleMarkerClick,
 * showMarkerTooltip, and hideTooltip logic.
 */

import type { Hotspot, MilitaryVessel, MilitaryVesselCluster } from '@/types';
import { getIranEventHexColor } from '@/services/conflict';
import { getCountryAtCoordinates, getCountryNameByCode } from '@/services/country-geometry';
import { isAllowedPreviewUrl } from '@/utils/imagery-preview';
import { escapeHtml } from '@/utils/sanitize';
import { getCategoryStyle } from '@/services/webcams';
import { pinWebcam, isPinned } from '@/services/webcams/pinned-store';
import { MapPopup } from './MapPopup';
import type {
  GlobeMarker, SatelliteMarker, SatFootprintMarker,
} from './globe-map-types';
import {
  SAT_COUNTRY_COLORS, SAT_TYPE_EMOJI, SAT_TYPE_LABEL, SAT_OPERATOR_NAME,
  FLIGHT_TYPE_COLORS, VESSEL_TYPE_COLORS, VESSEL_TYPE_ICONS, CLUSTER_ACTIVITY_COLORS,
} from './globe-map-types';
import type { GlobeInstance } from 'globe.gl';

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Wrap marker content in an invisible 20x20px hit target for easier clicking on the globe. */
export function wrapHit(inner: string): string {
  return `<div style="width:20px;height:20px;display:flex;align-items:center;justify-content:center">${inner}</div>`;
}

function pulseStyle(enabled: boolean, duration: string): string {
  return enabled ? `animation:globe-pulse ${duration} ease-out infinite;` : 'animation:none;';
}

// ─── Marker element builder ──────────────────────────────────────────────────

export function buildMarkerElement(
  d: GlobeMarker,
  pulseEnabled: boolean,
  webcamMarkerMode: string,
  onMarkerClick: (d: GlobeMarker, el: HTMLElement) => void,
): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = 'pointer-events:auto;cursor:pointer;user-select:none;';
  const ps = (dur: string) => pulseStyle(pulseEnabled, dur);

  if (d._kind === 'conflict') {
    const size = Math.min(12, 6 + (d.fatalities ?? 0) * 0.4);
    el.innerHTML = wrapHit(`
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="
          position:absolute;inset:0;border-radius:50%;
          background:rgba(255,50,50,0.85);
          border:1.5px solid rgba(255,120,120,0.9);
          box-shadow:0 0 6px 2px rgba(255,50,50,0.5);
        "></div>
        <div style="
          position:absolute;inset:-4px;border-radius:50%;
          background:rgba(255,50,50,0.2);
          ${ps('2s')}
        "></div>
      </div>`);
    el.title = `${d.location}`;
  } else if (d._kind === 'hotspot') {
    const colors: Record<number, string> = { 5: '#ff2020', 4: '#ff6600', 3: '#ffaa00', 2: '#ffdd00', 1: '#88ff44' };
    const c = colors[d.escalationScore] ?? '#ffaa00';
    el.innerHTML = wrapHit(`
      <div style="
        width:10px;height:10px;
        background:${c};
        border:1.5px solid rgba(255,255,255,0.6);
        clip-path:polygon(50% 0%,100% 50%,50% 100%,0% 50%);
        box-shadow:0 0 8px 2px ${c}88;
      "></div>`);
    el.title = d.name;
  } else if (d._kind === 'flight') {
    const heading = d.heading ?? 0;
    const color = FLIGHT_TYPE_COLORS[d.type] ?? '#cccccc';
    el.innerHTML = wrapHit(`
      <div style="transform:rotate(${heading}deg);font-size:11px;color:${color};text-shadow:0 0 4px ${color}88;line-height:1;">
        \u2708
      </div>`);
    el.title = `${d.callsign} (${d.type})`;
  } else if (d._kind === 'vessel') {
    const c = VESSEL_TYPE_COLORS[d.type] ?? '#44aaff';
    const icon = VESSEL_TYPE_ICONS[d.type] ?? '\u26f4';
    const isCarrier = d.type === 'carrier';
    const sz = isCarrier ? 15 : 10;
    const glow = isCarrier ? `0 0 10px 4px ${c}bb` : `0 0 4px ${c}88`;
    const darkRing = d.isDark
      ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:2px solid #ff444499;${ps('1.5s')}"></div>`
      : '';
    const usniRing = d.usniSource
      ? `<div style="position:absolute;inset:-4px;border-radius:50%;border:2px dashed #ffaa4466;"></div>`
      : '';
    el.innerHTML = wrapHit(
      `<div style="position:relative;display:inline-flex;align-items:center;justify-content:center;">` +
      darkRing +
      usniRing +
      `<div style="font-size:${sz}px;color:${c};text-shadow:${glow};line-height:1;${d.usniSource ? 'opacity:0.8;' : ''}">${icon}</div>` +
      `</div>`
    );
    el.title = `${d.name}${d.hullNumber ? ` (${d.hullNumber})` : ''} \u00b7 ${d.typeLabel} \u00b7 ${d.usniSource ? 'EST. POSITION' : 'AIS LIVE'}`;
  } else if (d._kind === 'cluster') {
    const cc = CLUSTER_ACTIVITY_COLORS[d.activityType ?? 'unknown'] ?? '#6688aa';
    const sz = Math.max(14, Math.min(26, 12 + d.vesselCount * 2));
    el.innerHTML = wrapHit(
      `<div style="position:relative;display:inline-flex;align-items:center;justify-content:center;width:${sz}px;height:${sz}px;">` +
      `<div style="position:absolute;inset:0;border-radius:50%;background:${cc}22;border:2px solid ${cc}bb;${ps('2.5s')}"></div>` +
      `<span style="position:relative;font-size:9px;color:${cc};font-weight:bold;line-height:1;">${d.vesselCount}</span>` +
      `</div>`
    );
    el.title = `${d.name} \u00b7 ${d.vesselCount} vessel${d.vesselCount !== 1 ? 's' : ''}`;
  } else if (d._kind === 'weather') {
    const severityColors: Record<string, string> = {
      Extreme: '#ff0044', Severe: '#ff6600', Moderate: '#ffaa00', Minor: '#88aaff',
    };
    const c = severityColors[d.severity] ?? '#88aaff';
    el.innerHTML = wrapHit(`<div style="font-size:9px;color:${c};text-shadow:0 0 4px ${c}88;font-weight:bold;">\u26A1</div>`);
    el.title = d.headline;
  } else if (d._kind === 'natural') {
    const typeIcons: Record<string, string> = {
      earthquakes: '\u303D', volcanoes: '\uD83C\uDF0B', severeStorms: '\uD83C\uDF00',
      floods: '\uD83D\uDCA7', wildfires: '\uD83D\uDD25', drought: '\u2600',
    };
    const icon = typeIcons[d.category] ?? '\u26A0';
    el.innerHTML = wrapHit(`<div style="font-size:11px;">${icon}</div>`);
    el.title = d.title;
  } else if (d._kind === 'iran') {
    const sc = getIranEventHexColor(d);
    el.innerHTML = wrapHit(`
      <div style="position:relative;width:9px;height:9px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${sc};border:1.5px solid rgba(255,255,255,0.5);box-shadow:0 0 5px 2px ${sc}88;"></div>
        <div style="position:absolute;inset:-4px;border-radius:50%;background:${sc}33;${ps('2s')}"></div>
      </div>`);
    el.title = d.title;
  } else if (d._kind === 'outage') {
    const sc = d.severity === 'total' ? '#ff2020' : d.severity === 'major' ? '#ff8800' : '#ffcc00';
    el.innerHTML = wrapHit(`<div style="font-size:12px;color:${sc};text-shadow:0 0 4px ${sc}88;">\uD83D\uDCE1</div>`);
    el.title = `${d.country}: ${d.title}`;
  } else if (d._kind === 'cyber') {
    const sc = d.severity === 'critical' ? '#ff0044' : d.severity === 'high' ? '#ff4400' : d.severity === 'medium' ? '#ffaa00' : '#44aaff';
    el.innerHTML = wrapHit(`<div style="font-size:10px;color:${sc};text-shadow:0 0 4px ${sc}88;font-weight:bold;">\uD83D\uDEE1</div>`);
    el.title = `${d.type}: ${d.indicator}`;
  } else if (d._kind === 'fire') {
    const intensity = d.brightness > 400 ? '#ff2020' : d.brightness > 330 ? '#ff6600' : '#ffaa00';
    el.innerHTML = wrapHit(`<div style="font-size:10px;color:${intensity};text-shadow:0 0 4px ${intensity}88;">\uD83D\uDD25</div>`);
    el.title = `Fire \u2014 ${d.region}`;
  } else if (d._kind === 'protest') {
    const typeColors: Record<string, string> = {
      riot: '#ff3030', protest: '#ffaa00', strike: '#44aaff',
      demonstration: '#88ff44', civil_unrest: '#ff6600',
    };
    const c = typeColors[d.eventType] ?? '#ffaa00';
    el.innerHTML = wrapHit(`<div style="font-size:11px;color:${c};text-shadow:0 0 4px ${c}88;">\uD83D\uDCE2</div>`);
    el.title = d.title;
  } else if (d._kind === 'ucdp') {
    const size = Math.min(10, 5 + (d.deaths || 0) * 0.3);
    el.innerHTML = wrapHit(`
      <div style="position:relative;width:${size}px;height:${size}px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:rgba(255,100,0,0.85);border:1.5px solid rgba(255,160,80,0.9);box-shadow:0 0 5px 2px rgba(255,100,0,0.5);"></div>
      </div>`);
    el.title = `${d.sideA} vs ${d.sideB}`;
  } else if (d._kind === 'displacement') {
    el.innerHTML = wrapHit(`<div style="font-size:11px;color:#88bbff;text-shadow:0 0 4px #88bbff88;">\uD83D\uDC65</div>`);
    el.title = `${d.origin} \u2192 ${d.asylum}`;
  } else if (d._kind === 'climate') {
    const typeColors: Record<string, string> = { warm: '#ff4400', cold: '#44aaff', wet: '#00ccff', dry: '#ff8800', mixed: '#88ff88' };
    const c = typeColors[d.type] ?? '#88ff88';
    el.innerHTML = wrapHit(`<div style="font-size:10px;color:${c};text-shadow:0 0 4px ${c}88;">\uD83C\uDF21</div>`);
    el.title = `${d.zone} (${d.type})`;
  } else if (d._kind === 'gpsjam') {
    const c = d.level === 'high' ? '#ff2020' : '#ff8800';
    el.innerHTML = wrapHit(`<div style="font-size:10px;color:${c};text-shadow:0 0 4px ${c}88;">\uD83D\uDCE1</div>`);
    el.title = `GPS Jamming (${d.level})`;
  } else if (d._kind === 'tech') {
    el.innerHTML = wrapHit(`<div style="font-size:10px;color:#44aaff;text-shadow:0 0 4px #44aaff88;">\uD83D\uDCBB</div>`);
    el.title = d.title;
  } else if (d._kind === 'conflictZone') {
    const intColor = d.intensity === 'high' ? '#ff2020' : d.intensity === 'medium' ? '#ff8800' : '#ffcc00';
    el.innerHTML = `
      <div style="position:relative;width:20px;height:20px;">
        <div style="
          position:absolute;inset:0;border-radius:50%;
          background:${intColor}33;
          border:1.5px solid ${intColor}99;
          box-shadow:0 0 6px 2px ${intColor}44;
        "></div>
        <div style="
          position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
          font-size:9px;line-height:1;color:${intColor};
        ">\u2694</div>
      </div>`;
    el.title = d.name;
  } else if (d._kind === 'milbase') {
    const typeColors: Record<string, string> = {
      'us-nato': '#4488ff', uk: '#4488ff', france: '#4488ff',
      russia: '#ff4444', china: '#ff8844', india: '#ff8844',
      other: '#aaaaaa',
    };
    const c = typeColors[d.type] ?? '#aaaaaa';
    el.innerHTML = wrapHit(`
      <div style="
        width:0;height:0;
        border-left:5px solid transparent;
        border-right:5px solid transparent;
        border-bottom:9px solid ${c};
        filter:drop-shadow(0 0 3px ${c}88);
      "></div>`);
    el.title = `${d.name}${d.country ? ' \u00b7 ' + d.country : ''}`;
  } else if (d._kind === 'nuclearSite') {
    el.innerHTML = wrapHit(`<div style="font-size:11px;color:#ffd700;text-shadow:0 0 4px #ffd70088;">\u2622</div>`);
    el.title = `${d.name} (${d.type})`;
  } else if (d._kind === 'irradiator') {
    el.innerHTML = wrapHit(`<div style="font-size:10px;color:#ff8800;text-shadow:0 0 3px #ff880088;">\u26A0</div>`);
    el.title = `${d.city}, ${d.country}`;
  } else if (d._kind === 'spaceport') {
    el.innerHTML = wrapHit(`<div style="font-size:11px;color:#88ddff;text-shadow:0 0 4px #88ddff88;">\uD83D\uDE80</div>`);
    el.title = `${d.name} (${d.operator})`;
  } else if (d._kind === 'earthquake') {
    const mc = d.magnitude >= 6 ? '#ff2020' : d.magnitude >= 4 ? '#ff8800' : '#ffcc00';
    const sz = Math.max(8, Math.min(18, Math.round(d.magnitude * 2.5)));
    el.innerHTML = wrapHit(`<div style="width:${sz}px;height:${sz}px;border-radius:50%;background:${mc}44;border:2px solid ${mc};box-shadow:0 0 6px 2px ${mc}55;"></div>`);
    el.title = `M${d.magnitude.toFixed(1)} \u2014 ${d.place}`;
  } else if (d._kind === 'economic') {
    const ec = d.type === 'exchange' ? '#ffd700' : d.type === 'central-bank' ? '#4488ff' : '#44cc88';
    el.innerHTML = wrapHit(`<div style="font-size:11px;color:${ec};text-shadow:0 0 4px ${ec}88;">\uD83D\uDCB0</div>`);
    el.title = `${d.name} \u00b7 ${d.country}`;
  } else if (d._kind === 'datacenter') {
    el.innerHTML = wrapHit(`<div style="font-size:10px;color:#88aaff;text-shadow:0 0 3px #88aaff88;">\uD83D\uDDA5</div>`);
    el.title = `${d.name} (${d.owner})`;
  } else if (d._kind === 'waterway') {
    el.innerHTML = wrapHit(`<div style="font-size:10px;color:#44aadd;text-shadow:0 0 3px #44aadd88;">\u2693</div>`);
    el.title = d.name;
  } else if (d._kind === 'mineral') {
    el.innerHTML = wrapHit(`<div style="font-size:10px;color:#cc88ff;text-shadow:0 0 3px #cc88ff88;">\uD83D\uDC8E</div>`);
    el.title = `${d.mineral} \u2014 ${d.name}`;
  } else if (d._kind === 'flightDelay') {
    const sc = d.severity === 'severe' ? '#ff2020' : d.severity === 'major' ? '#ff6600' : d.severity === 'moderate' ? '#ffaa00' : '#ffee44';
    el.innerHTML = wrapHit(`<div style="font-size:11px;color:${sc};text-shadow:0 0 4px ${sc}88;">\u2708</div>`);
    el.title = `${d.iata} \u2014 ${d.severity}`;
  } else if (d._kind === 'notamRing') {
    el.innerHTML = `<div style="position:relative;width:20px;height:20px;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;inset:-3px;border-radius:50%;border:2px solid #ff282888;${ps('2s')}"></div><div style="font-size:12px;color:#ff2828;text-shadow:0 0 6px #ff282888;">\u26A0</div></div>`;
    el.title = `NOTAM: ${d.name}`;
  } else if (d._kind === 'cableAdvisory') {
    const sc = d.severity === 'fault' ? '#ff2020' : '#ff8800';
    el.innerHTML = wrapHit(`<div style="font-size:11px;color:${sc};text-shadow:0 0 4px ${sc}88;">\uD83D\uDD0C</div>`);
    el.title = `${d.title} (${d.severity})`;
  } else if (d._kind === 'repairShip') {
    const sc = d.status === 'on-station' ? '#44ff88' : '#44aaff';
    el.innerHTML = wrapHit(`<div style="font-size:11px;color:${sc};text-shadow:0 0 4px ${sc}88;">\uD83D\uDEA2</div>`);
    el.title = d.name;
  } else if (d._kind === 'newsLocation') {
    const tc = d.threatLevel === 'critical' ? '#ff2020'
             : d.threatLevel === 'high'     ? '#ff6600'
             : d.threatLevel === 'elevated' ? '#ffaa00'
             : '#44aaff';
    el.innerHTML = `
      <div style="position:relative;width:16px;height:16px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${tc}44;border:1.5px solid ${tc};box-shadow:0 0 5px 2px ${tc}55;"></div>
        <div style="position:absolute;inset:-5px;border-radius:50%;background:${tc}22;${ps('1.8s')}"></div>
      </div>`;
    el.title = d.title;
  } else if (d._kind === 'aisDisruption') {
    const sc = d.severity === 'high' ? '#ff2020' : d.severity === 'elevated' ? '#ff8800' : '#44aaff';
    el.innerHTML = wrapHit(`<div style="font-size:11px;color:${sc};text-shadow:0 0 4px ${sc}88;">\u26F4</div>`);
    el.title = d.name;
  } else if (d._kind === 'satellite') {
    const c = SAT_COUNTRY_COLORS[(d as SatelliteMarker).country] || '#ccccff';
    el.innerHTML = `<div class="sat-hit" style="width:16px;height:16px;display:flex;align-items:center;justify-content:center;margin:-8px 0 0 -8px;color:${c}"><div class="sat-dot" style="width:5px;height:5px;border-radius:50%;background:${c};box-shadow:0 0 6px 2px ${c}88;transition:transform .15s,box-shadow .15s;"></div></div>`;
    el.title = `${(d as SatelliteMarker).name}`;
  } else if (d._kind === 'satFootprint') {
    const colors: Record<string, string> = { CN: '#ff2020', RU: '#ff8800', US: '#4488ff', EU: '#44cc44' };
    const c = colors[(d as SatFootprintMarker).country] || '#ccccff';
    el.innerHTML = `<div style="width:12px;height:12px;border-radius:50%;border:1px solid ${c}66;background:${c}15;margin:-6px 0 0 -6px"></div>`;
    el.style.pointerEvents = 'none';
  } else if (d._kind === 'imageryScene') {
    el.innerHTML = wrapHit(`<div style="font-size:11px;color:#00b4ff;text-shadow:0 0 4px #00b4ff88;">&#128752;</div>`);
    el.title = `${d.satellite} ${d.datetime}`;
  } else if (d._kind === 'webcam') {
    const style = getCategoryStyle(d.category);
    const emoji = webcamMarkerMode === 'emoji' ? style.emoji : '\u{1F4F7}';
    el.innerHTML = wrapHit(`<span style="background:${style.color}33;border:1px solid ${style.color}88;border-radius:10px;padding:1px 5px;font-size:12px;">${emoji}</span>`);
    el.title = d.title;
  } else if (d._kind === 'webcam-cluster') {
    el.innerHTML = wrapHit(`<span style="background:#00d4ff33;border:1px solid #00d4ff88;border-radius:12px;padding:2px 7px;font-size:11px;font-weight:bold;color:#00d4ff;">${d.count}</span>`);
    el.title = `${d.count} webcams`;
  } else if (d._kind === 'flash') {
    el.style.pointerEvents = 'none';
    el.innerHTML = `
      <div style="position:relative;width:0;height:0;">
        <div style="position:absolute;width:44px;height:44px;border-radius:50%;
          border:2px solid rgba(255,255,255,0.9);background:rgba(255,255,255,0.2);
          left:-22px;top:-22px;
          ${ps('0.7s')}"></div>
      </div>`;
  }

  el.addEventListener('click', (e) => {
    e.stopPropagation();
    onMarkerClick(d, el);
  });

  return el;
}

// ─── Marker click handler ────────────────────────────────────────────────────

export function handleMarkerClick(
  d: GlobeMarker,
  anchor: HTMLElement,
  ctx: {
    onHotspotClickCb: ((h: Hotspot) => void) | null;
    vesselData: Map<string, MilitaryVessel>;
    clusterData: Map<string, MilitaryVesselCluster>;
    popup: MapPopup | null;
    container: HTMLElement;
    globe: GlobeInstance | null;
    hideTooltip: () => void;
    showMarkerTooltip: (d: GlobeMarker, anchor: HTMLElement) => void;
  },
): void {
  if (d._kind === 'hotspot' && ctx.onHotspotClickCb) {
    ctx.onHotspotClickCb({
      id: d.id,
      name: d.name,
      lat: d._lat,
      lon: d._lng,
      keywords: [],
      escalationScore: d.escalationScore as Hotspot['escalationScore'],
    });
  }

  if (d._kind === 'vessel' && ctx.popup) {
    const vessel = ctx.vesselData.get(d.id);
    if (vessel) {
      const aRect = anchor.getBoundingClientRect();
      const cRect = ctx.container.getBoundingClientRect();
      const x = aRect.left - cRect.left + aRect.width / 2;
      const y = aRect.top  - cRect.top;
      ctx.hideTooltip();
      ctx.popup.show({ type: 'militaryVessel', data: vessel, x, y });
      return;
    }
  }

  if (d._kind === 'cluster' && ctx.popup) {
    const cluster = ctx.clusterData.get(d.id);
    if (cluster) {
      const aRect = anchor.getBoundingClientRect();
      const cRect = ctx.container.getBoundingClientRect();
      const x = aRect.left - cRect.left + aRect.width / 2;
      const y = aRect.top  - cRect.top;
      ctx.hideTooltip();
      ctx.popup.show({ type: 'militaryVesselCluster', data: cluster, x, y });
      return;
    }
  }

  if (d._kind === 'webcam-cluster' && ctx.globe) {
    const pov = ctx.globe.pointOfView();
    ctx.globe.pointOfView({ lat: d._lat, lng: d._lng, altitude: pov.altitude * 0.4 }, 800);
  }
  ctx.showMarkerTooltip(d, anchor);
}

// ─── Tooltip rendering ───────────────────────────────────────────────────────

export function showMarkerTooltip(
  d: GlobeMarker,
  anchor: HTMLElement,
  ctx: {
    container: HTMLElement;
    globe: GlobeInstance | null;
    tooltipEl: HTMLElement | null;
    tooltipHideTimer: ReturnType<typeof setTimeout> | null;
    hideTooltip: () => void;
    setTooltipEl: (el: HTMLElement | null) => void;
    setTooltipHideTimer: (timer: ReturnType<typeof setTimeout> | null) => void;
    showMarkerTooltip: (d: GlobeMarker, anchor: HTMLElement) => void;
  },
): void {
  ctx.hideTooltip();
  const el = document.createElement('div');
  el.style.cssText = [
    'position:absolute',
    'background:rgba(10,12,16,0.95)',
    'border:1px solid rgba(60,120,60,0.6)',
    'padding:8px 12px',
    'border-radius:3px',
    'font-size:11px',
    'font-family:monospace',
    'color:#d4d4d4',
    'max-width:240px',
    'z-index:1000',
    'pointer-events:auto',
    'line-height:1.5',
  ].join(';');

  const closeBtn = `<button style="position:absolute;top:4px;right:4px;background:none;border:none;color:#888;cursor:pointer;font-size:14px;line-height:1;padding:2px 4px;" aria-label="Close">\u00D7</button>`;

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  let html = '';
  if (d._kind === 'conflict') {
    html = `<span style="color:#ff5050;font-weight:bold;">\u2694 ${esc(d.location)}</span>` +
           (d.fatalities ? `<br><span style="opacity:.7;">Casualties: ${d.fatalities}</span>` : '');
  } else if (d._kind === 'hotspot') {
    const sc = ['', '#88ff44', '#ffdd00', '#ffaa00', '#ff6600', '#ff2020'][d.escalationScore] ?? '#ffaa00';
    html = `<span style="color:${sc};font-weight:bold;">\uD83C\uDFAF ${esc(d.name)}</span>` +
           `<br><span style="opacity:.7;">Escalation: ${d.escalationScore}/5</span>`;
  } else if (d._kind === 'flight') {
    html = `<span style="font-weight:bold;">\u2708 ${esc(d.callsign)}</span><br><span style="opacity:.7;">${esc(d.type)}</span>`;
  } else if (d._kind === 'vessel') {
    const deployStatus = d.usniDeploymentStatus && d.usniDeploymentStatus !== 'unknown'
      ? ` <span style="opacity:.6;font-size:10px;">[${esc(d.usniDeploymentStatus.toUpperCase().replace('-', ' '))}]</span>`
      : '';
    const darkWarning = d.isDark
      ? `<br><span style="color:#ff4444;font-size:10px;font-weight:bold;">\u26A0 AIS DARK</span>`
      : '';
    const operatorLine = d.operatorCountry || d.operator
      ? `<br><span style="opacity:.6;font-size:10px;">${esc(d.operatorCountry || d.operator || '')}</span>`
      : '';
    const hullLine = d.hullNumber
      ? ` <span style="opacity:.5;font-size:10px;">(${esc(d.hullNumber)})</span>`
      : '';
    const articleDate = d.usniArticleDate
      ? ` \u00b7 ${new Date(d.usniArticleDate).toLocaleDateString()}`
      : '';
    const inPort = d.usniDeploymentStatus === 'in-port';
    const portLine = inPort && d.usniHomePort
      ? `<br><span style="color:#44aaff;font-size:10px;">\uD83C\uDFE0 ${esc(d.usniHomePort)}</span>`
      : '';
    html = `<span style="font-weight:bold;">\u26F4 ${esc(d.name)}${hullLine}${deployStatus}</span>`
      + darkWarning
      + `<br><span style="opacity:.7;">${esc(d.typeLabel)}</span>`
      + operatorLine
      + portLine
      + (!inPort && d.usniStrikeGroup ? `<br><span style="opacity:.85;">\u2693 ${esc(d.usniStrikeGroup)}</span>` : '')
      + (d.usniRegion ? `<br><span style="opacity:.6;font-size:10px;">${esc(d.usniRegion)}</span>` : '')
      + (d.usniActivityDescription ? `<br><span style="opacity:.6;font-size:10px;white-space:normal;display:block;max-width:200px;">${esc(d.usniActivityDescription.slice(0, 120))}</span>` : '')
      + (d.usniSource
        ? `<br><span style="color:#ffaa44;font-size:9px;">\u26A0 EST. POSITION \u2014 ${inPort ? 'In-port' : 'Approx.'} via USNI${articleDate}</span>`
        : `<br><span style="color:#44ff88;font-size:9px;">\u25CF AIS LIVE</span>`);
  } else if (d._kind === 'cluster') {
    const cc = CLUSTER_ACTIVITY_COLORS[d.activityType ?? 'unknown'] ?? '#6688aa';
    const actLabel = d.activityType && d.activityType !== 'unknown'
      ? d.activityType.charAt(0).toUpperCase() + d.activityType.slice(1) : '';
    html = `<span style="color:${cc};font-weight:bold;">\u2693 ${esc(d.name)}</span>`
      + `<br><span style="opacity:.7;">${d.vesselCount} vessel${d.vesselCount !== 1 ? 's' : ''}</span>`
      + (actLabel ? `<br><span style="opacity:.6;font-size:10px;">Activity: ${esc(actLabel)}</span>` : '')
      + (d.region ? `<br><span style="opacity:.6;font-size:10px;">${esc(d.region)}</span>` : '');
  } else if (d._kind === 'weather') {
    const wc = d.severity === 'Extreme' ? '#ff0044' : d.severity === 'Severe' ? '#ff6600' : '#88aaff';
    html = `<span style="color:${wc};font-weight:bold;">\u26A1 ${esc(d.severity)}</span>` +
           `<br><span style="opacity:.7;white-space:normal;display:block;">${esc(d.headline.slice(0, 90))}</span>`;
  } else if (d._kind === 'natural') {
    html = `<span style="font-weight:bold;">${esc(d.title.slice(0, 60))}</span>` +
           `<br><span style="opacity:.7;">${esc(d.category)}</span>`;
  } else if (d._kind === 'iran') {
    const sc = getIranEventHexColor(d);
    html = `<span style="color:${sc};font-weight:bold;">\uD83C\uDFAF ${esc(d.title.slice(0, 60))}</span>` +
           `<br><span style="opacity:.7;">${esc(d.category)}${d.location ? ' \u00b7 ' + esc(d.location) : ''}</span>`;
  } else if (d._kind === 'outage') {
    const sc = d.severity === 'total' ? '#ff2020' : d.severity === 'major' ? '#ff8800' : '#ffcc00';
    html = `<span style="color:${sc};font-weight:bold;">\uD83D\uDCE1 ${d.severity.toUpperCase()} Outage</span>` +
           `<br><span style="opacity:.7;">${esc(d.country)}</span>` +
           `<br><span style="opacity:.7;white-space:normal;display:block;">${esc(d.title.slice(0, 70))}</span>`;
  } else if (d._kind === 'cyber') {
    const sc = d.severity === 'critical' ? '#ff0044' : d.severity === 'high' ? '#ff4400' : '#ffaa00';
    html = `<span style="color:${sc};font-weight:bold;">\uD83D\uDEE1 ${d.severity.toUpperCase()}</span>` +
           `<br><span style="opacity:.7;">${esc(d.type)}</span>` +
           `<br><span style="opacity:.5;font-size:10px;">${esc(d.indicator.slice(0, 40))}</span>`;
  } else if (d._kind === 'fire') {
    html = `<span style="color:#ff6600;font-weight:bold;">\uD83D\uDD25 Wildfire</span>` +
           `<br><span style="opacity:.7;">${esc(d.region)}</span>` +
           `<br><span style="opacity:.5;">Brightness: ${d.brightness.toFixed(0)} K</span>`;
  } else if (d._kind === 'protest') {
    const typeColors: Record<string, string> = { riot: '#ff3030', strike: '#44aaff', protest: '#ffaa00' };
    const c = typeColors[d.eventType] ?? '#ffaa00';
    html = `<span style="color:${c};font-weight:bold;">\uD83D\uDCE2 ${esc(d.eventType)}</span>` +
           `<br><span style="opacity:.7;">${esc(d.country)}</span>` +
           `<br><span style="opacity:.7;white-space:normal;display:block;">${esc(d.title.slice(0, 70))}</span>`;
  } else if (d._kind === 'ucdp') {
    html = `<span style="color:#ff6400;font-weight:bold;">\u2694 ${esc(d.country)}</span>` +
           `<br><span style="opacity:.7;">${esc(d.sideA)} vs ${esc(d.sideB)}</span>` +
           (d.deaths ? `<br><span style="opacity:.5;">Deaths: ${d.deaths}</span>` : '');
  } else if (d._kind === 'displacement') {
    html = `<span style="color:#88bbff;font-weight:bold;">\uD83D\uDC65 Displacement</span>` +
           `<br><span style="opacity:.7;">${esc(d.origin)} \u2192 ${esc(d.asylum)}</span>` +
           `<br><span style="opacity:.5;">Refugees: ${d.refugees.toLocaleString()}</span>`;
  } else if (d._kind === 'climate') {
    const tc = d.type === 'warm' ? '#ff4400' : d.type === 'cold' ? '#44aaff' : '#88ff88';
    html = `<span style="color:${tc};font-weight:bold;">\uD83C\uDF21 ${esc(d.type.toUpperCase())}</span>` +
           `<br><span style="opacity:.7;">${esc(d.zone)}</span>` +
           `<br><span style="opacity:.5;">\u0394T: ${d.tempDelta > 0 ? '+' : ''}${d.tempDelta.toFixed(1)}\u00B0C \u00b7 ${esc(d.severity)}</span>`;
  } else if (d._kind === 'gpsjam') {
    const gc = d.level === 'high' ? '#ff2020' : '#ff8800';
    html = `<span style="color:${gc};font-weight:bold;">\uD83D\uDCE1 GPS Jamming</span>` +
           `<br><span style="opacity:.7;">Level: ${esc(d.level)}</span>` +
           `<br><span style="opacity:.5;">NP avg: ${d.npAvg.toFixed(2)}</span>`;
  } else if (d._kind === 'tech') {
    html = `<span style="color:#44aaff;font-weight:bold;">\uD83D\uDCBB ${esc(d.title.slice(0, 50))}</span>` +
           `<br><span style="opacity:.7;">${esc(d.country)}</span>` +
           (d.daysUntil >= 0 ? `<br><span style="opacity:.5;">In ${d.daysUntil} days</span>` : '');
  } else if (d._kind === 'conflictZone') {
    const ic = d.intensity === 'high' ? '#ff3030' : d.intensity === 'medium' ? '#ff8800' : '#ffcc00';
    html = `<span style="color:${ic};font-weight:bold;">\u2694 ${esc(d.name)}</span>` +
           (d.parties.length ? `<br><span style="opacity:.7;">${d.parties.map(esc).join(', ')}</span>` : '') +
           (d.casualties ? `<br><span style="opacity:.5;">Casualties: ${esc(d.casualties)}</span>` : '');
  } else if (d._kind === 'milbase') {
    html = `<span style="color:#4488ff;font-weight:bold;">\uD83C\uDFDB ${esc(d.name)}</span>` +
           `<br><span style="opacity:.7;">${esc(d.type)}${d.country ? ' \u00b7 ' + esc(d.country) : ''}</span>`;
  } else if (d._kind === 'nuclearSite') {
    const nc = d.status === 'active' ? '#ffd700' : d.status === 'construction' ? '#ff8800' : '#888888';
    html = `<span style="color:${nc};font-weight:bold;">\u2622 ${esc(d.name)}</span>` +
           `<br><span style="opacity:.7;">${esc(d.type)} \u00b7 ${esc(d.status)}</span>`;
  } else if (d._kind === 'irradiator') {
    html = `<span style="color:#ff8800;font-weight:bold;">\u26A0 Gamma Irradiator</span>` +
           `<br><span style="opacity:.7;">${esc(d.city)}, ${esc(d.country)}</span>`;
  } else if (d._kind === 'spaceport') {
    const lc = d.launches === 'High' ? '#88ddff' : d.launches === 'Medium' ? '#44aaff' : '#aaaaaa';
    html = `<span style="color:${lc};font-weight:bold;">\uD83D\uDE80 ${esc(d.name)}</span>` +
           `<br><span style="opacity:.7;">${esc(d.operator)} \u00b7 ${esc(d.country)}</span>` +
           `<br><span style="opacity:.5;">Launch frequency: ${esc(d.launches)}</span>`;
  } else if (d._kind === 'earthquake') {
    const mc = d.magnitude >= 6 ? '#ff3030' : d.magnitude >= 4 ? '#ff8800' : '#ffcc00';
    html = `<span style="color:${mc};font-weight:bold;">\uD83C\uDF0D M${d.magnitude.toFixed(1)}</span>` +
           `<br><span style="opacity:.7;white-space:normal;display:block;">${esc(d.place.slice(0, 70))}</span>`;
  } else if (d._kind === 'economic') {
    const ec = d.type === 'exchange' ? '#ffd700' : d.type === 'central-bank' ? '#4488ff' : '#44cc88';
    html = `<span style="color:${ec};font-weight:bold;">\uD83D\uDCB0 ${esc(d.name)}</span>` +
           `<br><span style="opacity:.7;">${esc(d.type)} \u00b7 ${esc(d.country)}</span>` +
           (d.description ? `<br><span style="opacity:.5;white-space:normal;display:block;">${esc(d.description.slice(0, 70))}</span>` : '');
  } else if (d._kind === 'datacenter') {
    html = `<span style="color:#88aaff;font-weight:bold;">\uD83D\uDDA5 ${esc(d.name)}</span>` +
           `<br><span style="opacity:.7;">${esc(d.owner)} \u00b7 ${esc(d.country)}</span>` +
           `<br><span style="opacity:.5;">${esc(d.chipType)}</span>`;
  } else if (d._kind === 'waterway') {
    html = `<span style="color:#44aadd;font-weight:bold;">\u2693 ${esc(d.name)}</span>` +
           (d.description ? `<br><span style="opacity:.7;white-space:normal;display:block;">${esc(d.description.slice(0, 80))}</span>` : '');
  } else if (d._kind === 'mineral') {
    const mc2 = d.status === 'producing' ? '#cc88ff' : '#8866bb';
    html = `<span style="color:${mc2};font-weight:bold;">\uD83D\uDC8E ${esc(d.mineral)}</span>` +
           `<br><span style="opacity:.7;">${esc(d.name)} \u00b7 ${esc(d.country)}</span>` +
           `<br><span style="opacity:.5;">${esc(d.status)}</span>`;
  } else if (d._kind === 'flightDelay') {
    const sc = d.severity === 'severe' ? '#ff3030' : d.severity === 'major' ? '#ff6600' : d.severity === 'moderate' ? '#ffaa00' : '#ffee44';
    html = `<span style="color:${sc};font-weight:bold;">\u2708 ${esc(d.iata)} \u2014 ${esc(d.severity.toUpperCase())}</span>` +
           `<br><span style="opacity:.7;">${esc(d.name)}, ${esc(d.country)}</span>` +
           `<br><span style="opacity:.7;">${esc(d.delayType.replace(/_/g, ' '))}` +
           (d.avgDelayMinutes > 0 ? ` \u00b7 avg ${d.avgDelayMinutes}min` : '') + `</span>` +
           (d.reason ? `<br><span style="opacity:.5;white-space:normal;display:block;">${esc(d.reason.slice(0, 70))}</span>` : '');
  } else if (d._kind === 'notamRing') {
    html = `<span style="color:#ff2828;font-weight:bold;">\u26A0 NOTAM CLOSURE</span>` +
           `<br><span style="opacity:.7;">${esc(d.name)}</span>` +
           (d.reason ? `<br><span style="opacity:.5;white-space:normal;display:block;">${esc(d.reason.slice(0, 100))}</span>` : '');
  } else if (d._kind === 'cableAdvisory') {
    const sc = d.severity === 'fault' ? '#ff2020' : '#ff8800';
    html = `<span style="color:${sc};font-weight:bold;">\uD83D\uDD0C ${esc(d.severity.toUpperCase())} \u2014 ${esc(d.title.slice(0, 50))}</span>` +
           (d.impact ? `<br><span style="opacity:.7;white-space:normal;display:block;">${esc(d.impact.slice(0, 70))}</span>` : '') +
           (d.repairEta ? `<br><span style="opacity:.5;">ETA: ${esc(d.repairEta)}</span>` : '');
  } else if (d._kind === 'repairShip') {
    const sc = d.status === 'on-station' ? '#44ff88' : '#44aaff';
    html = `<span style="color:${sc};font-weight:bold;">\uD83D\uDEA2 ${esc(d.name)}</span>` +
           `<br><span style="opacity:.7;">${esc(d.status.replace(/-/g, ' '))}${d.operator ? ' \u00b7 ' + esc(d.operator) : ''}</span>` +
           (d.eta ? `<br><span style="opacity:.5;">ETA: ${esc(d.eta)}</span>` : '');
  } else if (d._kind === 'aisDisruption') {
    const sc = d.severity === 'high' ? '#ff2020' : d.severity === 'elevated' ? '#ff8800' : '#44aaff';
    const typeLabel = d.type === 'gap_spike' ? 'Gap Spike' : 'Chokepoint Congestion';
    html = `<span style="color:${sc};font-weight:bold;">\u26F4 ${esc(typeLabel)}</span>` +
           `<br><span style="opacity:.7;">${esc(d.name)}</span>` +
           `<br><span style="opacity:.5;">${esc(d.severity)} \u00b7 ${esc(d.description.slice(0, 60))}</span>`;
  } else if (d._kind === 'newsLocation') {
    const tc = d.threatLevel === 'critical' ? '#ff2020' : d.threatLevel === 'high' ? '#ff6600' : d.threatLevel === 'elevated' ? '#ffaa00' : '#44aaff';
    html = `<span style="color:${tc};font-weight:bold;">\uD83D\uDCF0 ${esc(d.title.slice(0, 60))}</span>` +
           `<br><span style="opacity:.5;">${esc(d.threatLevel)}</span>`;
  } else if (d._kind === 'satellite') {
    const sc = SAT_COUNTRY_COLORS[d.country] || '#ccccff';
    const altBand = d.alt < 2000 ? 'LEO' : d.alt < 35786 ? 'MEO' : 'GEO';
    const operatorName = SAT_OPERATOR_NAME[d.country] || getCountryNameByCode(d.country) || d.country;
    const overHit = getCountryAtCoordinates(d._lat, d._lng);
    const overLabel = overHit ? overHit.name : 'Ocean';
    html = `<div style="min-width:220px;">` +
      `<span style="color:${sc};font-weight:bold;font-size:12px;">${SAT_TYPE_EMOJI[d.type] || '\u{1F6F0}'} ${esc(d.name)}</span>` +
      `<div style="opacity:.5;font-size:10px;margin:2px 0 6px;">NORAD ${esc(d.id)}</div>` +
      `<div style="display:grid;grid-template-columns:auto 1fr;gap:2px 8px;font-size:11px;">` +
      `<span style="opacity:.5;">Type</span><span>${esc(SAT_TYPE_LABEL[d.type] || d.type)}</span>` +
      `<span style="opacity:.5;">Operator</span><span style="color:${sc}">${esc(operatorName)}</span>` +
      `<span style="opacity:.5;">Over</span><span>${esc(overLabel)}</span>` +
      `<span style="opacity:.5;">Alt. band</span><span>${altBand} \u00B7 ${Math.round(d.alt)} km</span>` +
      `<span style="opacity:.5;">Incl.</span><span>${d.inclination.toFixed(1)}\u00B0</span>` +
      `<span style="opacity:.5;">Velocity</span><span>${d.velocity.toFixed(1)} km/s</span>` +
      `</div></div>`;
  } else if (d._kind === 'imageryScene') {
    html = `<span style="color:#00b4ff;font-weight:bold;">&#128752; ${esc(d.satellite)}</span>` +
           `<br><span style="opacity:.7;">${esc(d.datetime)}</span>`;
    if (d.resolutionM != null || d.mode) {
      const rp: string[] = [];
      if (d.resolutionM != null) rp.push(`${d.resolutionM}m`);
      if (d.mode) rp.push(esc(d.mode));
      html += `<br><span style="opacity:.5;">Res: ${rp.join(' \u00B7 ')}</span>`;
    }
    if (isAllowedPreviewUrl(d.previewUrl)) {
      const safeHref = escapeHtml(new URL(d.previewUrl!).href);
      html += `<br><img src="${safeHref}" referrerpolicy="no-referrer" style="max-width:180px;max-height:120px;margin-top:4px;border-radius:4px;" class="imagery-preview">`;
    }
  } else if (d._kind === 'webcam') {
    html = '';
  } else if (d._kind === 'webcam-cluster') {
    html = '';
  }
  el.innerHTML = `<div style="padding-right:16px;position:relative;">${closeBtn}${html}</div>`;
  if (d._kind === 'satellite') el.style.maxWidth = '300px';
  el.querySelector('button')?.addEventListener('click', () => ctx.hideTooltip());

  if (d._kind === 'webcam') {
    const wrapper = el.firstElementChild!;
    const titleSpan = document.createElement('span');
    titleSpan.style.cssText = 'color:#00d4ff;font-weight:bold;';
    titleSpan.textContent = `\u{1F4F7} ${d.title.slice(0, 50)}`;
    wrapper.appendChild(titleSpan);

    const metaSpan = document.createElement('span');
    metaSpan.style.cssText = 'display:block;opacity:.7;font-size:11px;';
    metaSpan.textContent = `${d.country} \u00B7 ${d.category}`;
    wrapper.appendChild(metaSpan);

    const previewDiv = document.createElement('div');
    previewDiv.style.marginTop = '4px';
    const loadingSpan = document.createElement('span');
    loadingSpan.style.cssText = 'opacity:.5;font-size:11px;';
    loadingSpan.textContent = 'Loading preview...';
    previewDiv.appendChild(loadingSpan);
    wrapper.appendChild(previewDiv);

    const link = document.createElement('a');
    link.href = `https://www.windy.com/webcams/${encodeURIComponent(d.webcamId)}`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.style.cssText = 'display:block;color:#00d4ff;font-size:11px;text-decoration:none;';
    link.textContent = 'Open on Windy \u2197';
    wrapper.appendChild(link);

    const attribution = document.createElement('div');
    attribution.style.cssText = 'opacity:.4;font-size:9px;margin-top:4px;';
    attribution.textContent = 'Powered by Windy';
    wrapper.appendChild(attribution);

    import('@/services/webcams').then(({ fetchWebcamImage }) => {
      fetchWebcamImage(d.webcamId).then(img => {
        if (!el.isConnected) return;
        previewDiv.replaceChildren();
        if (img.thumbnailUrl) {
          const imgEl = document.createElement('img');
          imgEl.src = img.thumbnailUrl;
          imgEl.style.cssText = 'width:200px;border-radius:4px;margin-bottom:4px;';
          imgEl.loading = 'lazy';
          previewDiv.appendChild(imgEl);
        } else {
          const span = document.createElement('span');
          span.style.cssText = 'opacity:.5;font-size:11px;';
          span.textContent = 'Preview unavailable';
          previewDiv.appendChild(span);
        }
        const pinBtn = document.createElement('button');
        pinBtn.className = 'webcam-pin-btn';
        pinBtn.style.cssText = 'display:block;margin-top:4px;';
        if (isPinned(d.webcamId)) {
          pinBtn.classList.add('webcam-pin-btn--pinned');
          pinBtn.textContent = '\u{1F4CC} Pinned';
          pinBtn.disabled = true;
        } else {
          pinBtn.textContent = '\u{1F4CC} Pin';
          pinBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            pinWebcam({
              webcamId: d.webcamId,
              title: d.title || img.title || '',
              lat: d._lat,
              lng: d._lng,
              category: d.category || 'other',
              country: d.country || '',
              playerUrl: img.playerUrl || '',
            });
            pinBtn.classList.add('webcam-pin-btn--pinned');
            pinBtn.textContent = '\u{1F4CC} Pinned';
            pinBtn.disabled = true;
          });
        }
        wrapper.appendChild(pinBtn);
      });
    });
  } else if (d._kind === 'webcam-cluster') {
    const wrapper = el.firstElementChild!;
    const header = document.createElement('span');
    header.style.cssText = 'color:#00d4ff;font-weight:bold;';
    header.textContent = `\u{1F4F7} ${d.count} webcams`;
    wrapper.appendChild(header);
    const loadingSpan = document.createElement('span');
    loadingSpan.style.cssText = 'display:block;opacity:.5;font-size:10px;';
    loadingSpan.textContent = 'Loading list...';
    wrapper.appendChild(loadingSpan);
  }
  el.addEventListener('mouseenter', () => {
    if (ctx.tooltipHideTimer) { clearTimeout(ctx.tooltipHideTimer); ctx.setTooltipHideTimer(null); }
  });
  el.addEventListener('mouseleave', () => {
    ctx.setTooltipHideTimer(setTimeout(() => ctx.hideTooltip(), 2000));
  });

  ctx.container.appendChild(el);

  // Position relative to container using measured dimensions
  const ar = anchor.getBoundingClientRect();
  const cr = ctx.container.getBoundingClientRect();
  const left = Math.max(4, Math.min(
    ar.left - cr.left + (anchor.offsetWidth ?? 14) + 6,
    cr.width - el.offsetWidth - 4
  ));
  const top = Math.max(4, Math.min(
    ar.top - cr.top - 8,
    cr.height - el.offsetHeight - 4
  ));
  el.style.left = left + 'px';
  el.style.top  = top  + 'px';

  ctx.setTooltipEl(el);
  if (ctx.tooltipHideTimer) clearTimeout(ctx.tooltipHideTimer);
  const hideDelay = d._kind === 'satellite' ? 6000 : d._kind === 'webcam' ? 8000 : d._kind === 'webcam-cluster' ? 12000 : 3500;
  ctx.setTooltipHideTimer(setTimeout(() => ctx.hideTooltip(), hideDelay));

  if (d._kind === 'webcam-cluster') {
    const tooltipEl = el;
    const alt = ctx.globe?.pointOfView()?.altitude ?? 2.0;
    const approxZoom = alt >= 2.0 ? 2 : alt >= 1.0 ? 4 : alt >= 0.5 ? 6 : 8;
    import('@/services/webcams').then(({ fetchWebcams, getClusterCellSize }) => {
      const margin = Math.max(0.5, getClusterCellSize(approxZoom));
      fetchWebcams(10, {
        w: d._lng - margin, s: d._lat - margin,
        e: d._lng + margin, n: d._lat + margin,
      }).then(result => {
        if (!tooltipEl.isConnected) return;
        const webcams = result.webcams.slice(0, 20);

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'padding-right:16px;position:relative;';

        const closeBtn2 = document.createElement('button');
        closeBtn2.style.cssText = 'position:absolute;top:4px;right:4px;background:none;border:none;color:#888;cursor:pointer;font-size:14px;line-height:1;padding:2px 4px;';
        closeBtn2.setAttribute('aria-label', 'Close');
        closeBtn2.textContent = '\u00D7';
        closeBtn2.addEventListener('click', () => ctx.hideTooltip());
        wrapper.appendChild(closeBtn2);

        const headerSpan = document.createElement('span');
        headerSpan.style.cssText = 'color:#00d4ff;font-weight:bold;';
        headerSpan.textContent = `\u{1F4F7} ${webcams.length} webcams`;
        wrapper.appendChild(headerSpan);

        const listDiv = document.createElement('div');
        listDiv.style.cssText = 'max-height:180px;overflow-y:auto;margin-top:4px;';

        for (const webcam of webcams) {
          const item = document.createElement('div');
          item.style.cssText = 'padding:2px 0;cursor:pointer;color:#aaa;border-bottom:1px solid rgba(255,255,255,0.08);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

          const nameSpan = document.createElement('span');
          nameSpan.textContent = webcam.title || webcam.category || 'Webcam';
          item.appendChild(nameSpan);

          if (webcam.country) {
            const countrySpan = document.createElement('span');
            countrySpan.style.cssText = 'float:right;opacity:0.4;font-size:10px;margin-left:6px;';
            countrySpan.textContent = webcam.country;
            item.appendChild(countrySpan);
          }

          item.addEventListener('mouseenter', () => { item.style.color = '#00d4ff'; });
          item.addEventListener('mouseleave', () => { item.style.color = '#aaa'; });
          item.addEventListener('click', (e) => {
            e.stopPropagation();
            const cr2 = ctx.container.getBoundingClientRect();
            const me = e as MouseEvent;
            const phantom = document.createElement('div');
            phantom.style.cssText = `position:absolute;left:${me.clientX - cr2.left}px;top:${me.clientY - cr2.top}px;width:1px;height:1px;pointer-events:none;`;
            ctx.container.appendChild(phantom);
            ctx.showMarkerTooltip({
              _kind: 'webcam', _lat: webcam.lat, _lng: webcam.lng,
              webcamId: webcam.webcamId, title: webcam.title,
              category: webcam.category, country: webcam.country,
            } as GlobeMarker, phantom);
            phantom.remove();
          });
          listDiv.appendChild(item);
        }

        wrapper.appendChild(listDiv);
        tooltipEl.replaceChildren(wrapper);
      });
    });
  }
}
