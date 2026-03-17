/**
 * Globe.gl layer accessor configuration — arc, path, and polygon accessors.
 *
 * Extracted from GlobeMap.ts. These functions configure how globe.gl renders
 * arcs (trade routes), paths (cables, pipelines, orbits, storm tracks), and
 * polygons (CII choropleth, conflict zones, imagery footprints).
 */

import type { GlobeInstance } from 'globe.gl';
import type { TradeRouteSegment } from '@/config/trade-routes';
import { escapeHtml } from '@/utils/sanitize';
import { isAllowedPreviewUrl } from '@/utils/imagery-preview';
import type { GlobePath, GlobePolygon } from './globe-map-types';
import {
  CII_GLOBE_COLORS, CONFLICT_CAP, CONFLICT_SIDE, CONFLICT_STROKE, CONFLICT_ALT,
} from './globe-map-types';

export function setupArcAccessors(globe: GlobeInstance): void {
  (globe as any)
    .arcStartLat((d: TradeRouteSegment) => d.sourcePosition[1])
    .arcStartLng((d: TradeRouteSegment) => d.sourcePosition[0])
    .arcEndLat((d: TradeRouteSegment) => d.targetPosition[1])
    .arcEndLng((d: TradeRouteSegment) => d.targetPosition[0])
    .arcColor((d: TradeRouteSegment) => {
      if (d.status === 'disrupted') return ['rgba(255,32,32,0.1)', 'rgba(255,32,32,0.8)', 'rgba(255,32,32,0.1)'];
      if (d.status === 'high_risk') return ['rgba(255,180,0,0.1)', 'rgba(255,180,0,0.7)', 'rgba(255,180,0,0.1)'];
      if (d.category === 'energy')    return ['rgba(255,140,0,0.05)', 'rgba(255,140,0,0.6)', 'rgba(255,140,0,0.05)'];
      if (d.category === 'container') return ['rgba(68,136,255,0.05)', 'rgba(68,136,255,0.6)', 'rgba(68,136,255,0.05)'];
      return ['rgba(68,204,136,0.05)', 'rgba(68,204,136,0.6)', 'rgba(68,204,136,0.05)'];
    })
    .arcAltitudeAutoScale(0.3).arcStroke(0.5).arcDashLength(0.9).arcDashGap(4).arcDashAnimateTime(5000)
    .arcLabel((d: TradeRouteSegment) => `${d.routeName} \u00b7 ${d.volumeDesc}`);
}

export function setupPathAccessors(
  globe: GlobeInstance,
  getCableFaultIds: () => Set<string>,
  getCableDegradedIds: () => Set<string>,
): void {
  (globe as any)
    .pathPoints((d: GlobePath) => d?.points ?? [])
    .pathPointLat((p: number[]) => p[1])
    .pathPointLng((p: number[]) => p[0])
    .pathPointAlt((p: number[], _idx: number, path: object) =>
      (path as GlobePath)?.pathType === 'orbit' && p.length > 2 ? (p[2] ?? 0) / 6371 : 0
    )
    .pathColor((d: GlobePath) => {
      if (!d) return 'rgba(180,160,255,0.6)';
      if (d.pathType === 'orbit') {
        const colors: Record<string, string> = { CN: 'rgba(255,32,32,0.4)', RU: 'rgba(255,136,0,0.4)', US: 'rgba(68,136,255,0.4)', EU: 'rgba(68,204,68,0.4)' };
        return colors[d.country || ''] || 'rgba(200,200,255,0.3)';
      }
      if (d.pathType === 'cable') {
        if (getCableFaultIds().has(d.id)) return '#ff3030';
        if (getCableDegradedIds().has(d.id)) return '#ff8800';
        return 'rgba(0,200,255,0.65)';
      }
      if (d.pathType === 'oil') return 'rgba(255,140,0,0.6)';
      if (d.pathType === 'gas') return 'rgba(80,220,120,0.6)';
      if (d.pathType === 'stormTrack') return 'rgba(255,100,100,0.8)';
      if (d.pathType === 'stormHistory') {
        const w = d.windKt || 0;
        if (w >= 137) return 'rgba(255,96,96,0.8)';
        if (w >= 96) return 'rgba(255,140,0,0.8)';
        if (w >= 64) return 'rgba(255,231,117,0.8)';
        if (w >= 34) return 'rgba(94,186,255,0.8)';
        return 'rgba(160,160,160,0.6)';
      }
      return 'rgba(180,160,255,0.6)';
    })
    .pathStroke((d: GlobePath) => {
      if (!d) return 0.6;
      if (d.pathType === 'orbit') return 0.3;
      if (d.pathType === 'cable') return 0.3;
      if (d.pathType === 'stormTrack' || d.pathType === 'stormHistory') return 1.2;
      return 0.6;
    })
    .pathDashLength((d: GlobePath) => {
      if (!d) return 0.6;
      if (d.pathType === 'orbit') return 0.4;
      if (d.pathType === 'cable') return 1;
      if (d.pathType === 'stormTrack') return 0.8;
      if (d.pathType === 'stormHistory') return 1;
      return 0.6;
    })
    .pathDashGap((d: GlobePath) => {
      if (!d) return 0.25;
      if (d.pathType === 'orbit') return 0.15;
      if (d.pathType === 'cable') return 0;
      if (d.pathType === 'stormTrack') return 0.4;
      if (d.pathType === 'stormHistory') return 0;
      return 0.25;
    })
    .pathDashAnimateTime((d: GlobePath) => {
      if (!d) return 5000;
      if (d.pathType === 'orbit') return 0;
      if (d.pathType === 'cable') return 0;
      if (d.pathType === 'stormTrack') return 3000;
      if (d.pathType === 'stormHistory') return 0;
      return 5000;
    })
    .pathLabel((d: GlobePath) => d?.name ?? '');
}

export function setupPolygonAccessors(globe: GlobeInstance): void {
  (globe as any)
    .polygonGeoJsonGeometry((d: GlobePolygon) => ({ type: 'Polygon', coordinates: d.coords }))
    .polygonCapColor((d: GlobePolygon) => {
      if (d._kind === 'cii') return CII_GLOBE_COLORS[d.level!] ?? 'rgba(0,0,0,0)';
      if (d._kind === 'conflict') return CONFLICT_CAP[d.intensity!] ?? CONFLICT_CAP.low;
      if (d._kind === 'imageryFootprint') return 'rgba(0,0,0,0)';
      if (d._kind === 'forecastCone') return 'rgba(255,140,60,0.2)';
      return 'rgba(255,60,60,0.15)';
    })
    .polygonSideColor((d: GlobePolygon) => {
      if (d._kind === 'cii') return 'rgba(0,0,0,0)';
      if (d._kind === 'conflict') return CONFLICT_SIDE[d.intensity!] ?? CONFLICT_SIDE.low;
      if (d._kind === 'imageryFootprint') return 'rgba(0,0,0,0)';
      if (d._kind === 'forecastCone') return 'rgba(255,140,60,0.1)';
      return 'rgba(255,60,60,0.08)';
    })
    .polygonStrokeColor((d: GlobePolygon) => {
      if (d._kind === 'cii') return 'rgba(80,80,80,0.3)';
      if (d._kind === 'conflict') return CONFLICT_STROKE[d.intensity!] ?? CONFLICT_STROKE.low;
      if (d._kind === 'imageryFootprint') return '#00b4ff';
      if (d._kind === 'forecastCone') return 'rgba(255,140,60,0.5)';
      return '#ff4444';
    })
    .polygonAltitude((d: GlobePolygon) => {
      if (d._kind === 'cii') return 0.002;
      if (d._kind === 'conflict') return CONFLICT_ALT[d.intensity!] ?? CONFLICT_ALT.low;
      return 0.005;
    })
    .polygonLabel((d: GlobePolygon) => {
      if (d._kind === 'cii') return `<b>${escapeHtml(d.name)}</b><br/>CII: ${d.score}/100 (${escapeHtml(d.level ?? '')})`;
      if (d._kind === 'conflict') {
        let label = `<b>${escapeHtml(d.name)}</b>`;
        if (d.parties?.length) label += `<br/>Parties: ${d.parties.map(p => escapeHtml(p)).join(', ')}`;
        if (d.casualties) label += `<br/>Casualties: ${escapeHtml(d.casualties)}`;
        return label;
      }
      if (d._kind === 'imageryFootprint') {
        let label = `<span style="color:#00b4ff;font-weight:bold;">&#128752; ${escapeHtml(d.satellite ?? '')}</span>`;
        if (d.datetime) label += `<br><span style="opacity:.7;">${escapeHtml(d.datetime)}</span>`;
        if (d.resolutionM != null || d.mode) {
          const parts: string[] = [];
          if (d.resolutionM != null) parts.push(`${d.resolutionM}m`);
          if (d.mode) parts.push(escapeHtml(d.mode));
          label += `<br><span style="opacity:.5;">Res: ${parts.join(' \u00B7 ')}</span>`;
        }
        if (isAllowedPreviewUrl(d.previewUrl)) {
          const safeHref = escapeHtml(new URL(d.previewUrl!).href);
          label += `<br><img src="${safeHref}" referrerpolicy="no-referrer" style="max-width:180px;max-height:120px;margin-top:4px;border-radius:4px;" class="imagery-preview">`;
        }
        return label;
      }
      return escapeHtml(d.name);
    });
}
