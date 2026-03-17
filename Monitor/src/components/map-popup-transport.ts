import type { AisDisruptionEvent } from '@/types';
import type { AirportDelayAlert, PositionSample } from '@/services/aviation';
import type { Earthquake } from '@/services/earthquakes';
import type { WeatherAlert } from '@/services/weather';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { t } from '@/services/i18n';
import { getTimeAgo, getTimeUntil } from './map-popup-helpers';

export function renderEarthquakePopup(earthquake: Earthquake): string {
  const severity = earthquake.magnitude >= 6 ? 'high' : earthquake.magnitude >= 5 ? 'medium' : 'low';
  const severityLabel = earthquake.magnitude >= 6 ? t('popups.earthquake.levels.major') : earthquake.magnitude >= 5 ? t('popups.earthquake.levels.moderate') : t('popups.earthquake.levels.minor');

  const timeAgo = getTimeAgo(new Date(earthquake.occurredAt));

  return `
    <div class="popup-header earthquake">
      <span class="popup-title magnitude">M${earthquake.magnitude.toFixed(1)}</span>
      <span class="popup-badge ${severity}">${severityLabel}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <p class="popup-location">${escapeHtml(earthquake.place)}</p>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.depth')}</span>
          <span class="stat-value">${earthquake.depthKm.toFixed(1)} km</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${(earthquake.location?.latitude ?? 0).toFixed(2)}°, ${(earthquake.location?.longitude ?? 0).toFixed(2)}°</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.time')}</span>
          <span class="stat-value">${timeAgo}</span>
        </div>
      </div>
      <a href="${sanitizeUrl(earthquake.sourceUrl)}" target="_blank" class="popup-link">${t('popups.viewUSGS')} →</a>
    </div>
  `;
}

export function renderWeatherPopup(alert: WeatherAlert): string {
  const severityClass = escapeHtml(alert.severity.toLowerCase());
  const expiresIn = getTimeUntil(alert.expires);

  return `
    <div class="popup-header weather ${severityClass}">
      <span class="popup-title">${escapeHtml(alert.event.toUpperCase())}</span>
      <span class="popup-badge ${severityClass}">${escapeHtml(alert.severity.toUpperCase())}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <p class="popup-headline">${escapeHtml(alert.headline)}</p>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.area')}</span>
          <span class="stat-value">${escapeHtml(alert.areaDesc)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.expires')}</span>
          <span class="stat-value">${expiresIn}</span>
        </div>
      </div>
      <p class="popup-description">${escapeHtml(alert.description.slice(0, 300))}${alert.description.length > 300 ? '...' : ''}</p>
    </div>
  `;
}

export function renderAisPopup(event: AisDisruptionEvent): string {
  const severityClass = escapeHtml(event.severity);
  const severityLabel = escapeHtml(event.severity.toUpperCase());
  const typeLabel = event.type === 'gap_spike' ? t('popups.aisGapSpike') : t('popups.chokepointCongestion');
  const changeLabel = event.type === 'gap_spike' ? t('popups.darkening') : t('popups.density');
  const countLabel = event.type === 'gap_spike' ? t('popups.darkShips') : t('popups.vesselCount');
  const countValue = event.type === 'gap_spike'
    ? event.darkShips?.toString() || '—'
    : event.vesselCount?.toString() || '—';

  return `
    <div class="popup-header ais">
      <span class="popup-title">${escapeHtml(event.name.toUpperCase())}</span>
      <span class="popup-badge ${severityClass}">${severityLabel}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${typeLabel}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${changeLabel}</span>
          <span class="stat-value">${event.changePct}% ↑</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${countLabel}</span>
          <span class="stat-value">${countValue}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.window')}</span>
          <span class="stat-value">${event.windowHours}H</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.region')}</span>
          <span class="stat-value">${escapeHtml(event.region || `${event.lat.toFixed(2)}°, ${event.lon.toFixed(2)}°`)}</span>
        </div>
      </div>
      <p class="popup-description">${escapeHtml(event.description)}</p>
    </div>
  `;
}

export function renderFlightPopup(delay: AirportDelayAlert): string {
  const severityClass = escapeHtml(delay.severity);
  const severityLabel = escapeHtml(delay.severity.toUpperCase());
  const delayTypeLabels: Record<string, string> = {
    'ground_stop': t('popups.flight.groundStop'),
    'ground_delay': t('popups.flight.groundDelay'),
    'departure_delay': t('popups.flight.departureDelay'),
    'arrival_delay': t('popups.flight.arrivalDelay'),
    'general': t('popups.flight.delaysReported'),
    'closure': t('popups.flight.closure'),
  };
  const delayTypeLabel = delayTypeLabels[delay.delayType] || t('popups.flight.delays');
  const icon = delay.delayType === 'closure' ? '🚫' : delay.delayType === 'ground_stop' ? '🛑' : delay.severity === 'severe' ? '✈️' : '🛫';
  const sourceLabels: Record<string, string> = {
    'faa': t('popups.flight.sources.faa'),
    'eurocontrol': t('popups.flight.sources.eurocontrol'),
    'computed': t('popups.flight.sources.computed'),
    'aviationstack': t('popups.flight.sources.aviationstack'),
    'notam': t('popups.flight.sources.notam'),
  };
  const sourceLabel = sourceLabels[delay.source] || escapeHtml(delay.source);
  const regionLabels: Record<string, string> = {
    'americas': t('popups.flight.regions.americas'),
    'europe': t('popups.flight.regions.europe'),
    'apac': t('popups.flight.regions.apac'),
    'mena': t('popups.flight.regions.mena'),
    'africa': t('popups.flight.regions.africa'),
  };
  const regionLabel = regionLabels[delay.region] || escapeHtml(delay.region);

  const avgDelaySection = delay.avgDelayMinutes > 0
    ? `<div class="popup-stat"><span class="stat-label">${t('popups.flight.avgDelay')}</span><span class="stat-value alert">+${delay.avgDelayMinutes} ${t('popups.timeUnits.m')}</span></div>`
    : '';
  const reasonSection = delay.reason
    ? `<div class="popup-stat"><span class="stat-label">${t('popups.reason')}</span><span class="stat-value">${escapeHtml(delay.reason)}</span></div>`
    : '';
  const cancelledSection = delay.cancelledFlights
    ? `<div class="popup-stat"><span class="stat-label">${t('popups.flight.cancelled')}</span><span class="stat-value alert">${delay.cancelledFlights} ${t('popups.events')}</span></div>`
    : '';

  return `
    <div class="popup-header flight ${severityClass}">
      <span class="popup-icon">${icon}</span>
      <span class="popup-title">${escapeHtml(delay.iata)} - ${delayTypeLabel}</span>
      <span class="popup-badge ${severityClass}">${severityLabel}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(delay.name)}</div>
      <div class="popup-location">${escapeHtml(delay.city)}, ${escapeHtml(delay.country)}</div>
      <div class="popup-stats">
        ${avgDelaySection}
        ${reasonSection}
        ${cancelledSection}
        <div class="popup-stat">
          <span class="stat-label">${t('popups.region')}</span>
          <span class="stat-value">${regionLabel}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.source')}</span>
          <span class="stat-value">${sourceLabel}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.updated')}</span>
          <span class="stat-value">${delay.updatedAt.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderAircraftPopup(pos: PositionSample): string {
  const callsign = escapeHtml(pos.callsign || pos.icao24);
  const onGroundBadge = pos.onGround ? 'low' : 'elevated';
  const statusLabel = pos.onGround ? t('popups.aircraft.ground') : t('popups.aircraft.airborne');
  const altDisplay = pos.altitudeFt > 0 ? `FL${Math.round(pos.altitudeFt / 100)} (${pos.altitudeFt.toLocaleString()} ft)` : t('popups.aircraft.ground');

  return `
    <div class="popup-header aircraft">
      <span class="popup-icon">&#9992;</span>
      <span class="popup-title">${callsign}</span>
      <span class="popup-badge ${onGroundBadge}">${statusLabel}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">ICAO24: ${escapeHtml(pos.icao24)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.aircraft.altitude')}</span>
          <span class="stat-value">${altDisplay}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.aircraft.speed')}</span>
          <span class="stat-value">${pos.groundSpeedKts} kts</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.aircraft.heading')}</span>
          <span class="stat-value">${Math.round(pos.trackDeg)}&deg;</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.aircraft.position')}</span>
          <span class="stat-value">${pos.lat.toFixed(4)}&deg;, ${pos.lon.toFixed(4)}&deg;</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.source')}</span>
          <span class="stat-value">${escapeHtml(pos.source)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.updated')}</span>
          <span class="stat-value">${pos.observedAt.toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  `;
}
