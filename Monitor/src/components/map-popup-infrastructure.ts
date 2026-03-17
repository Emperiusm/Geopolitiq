import type { NuclearFacility, GammaIrradiator, Pipeline, UnderseaCable, CableAdvisory, RepairShip, InternetOutage, AIDataCenter, NaturalEvent, StrategicWaterway } from '@/types';
import { UNDERSEA_CABLES } from '@/config';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { t } from '@/services/i18n';
import { getNaturalEventIcon } from '@/services/eonet';
import { getCableHealthRecord } from '@/services/cable-health';
import { getTimeAgo, getLatestCableAdvisory, getPriorityRepairShip, sanitizeClassToken, formatNumber } from './map-popup-helpers';
import type { DatacenterClusterData } from './map-popup-types';

export function renderWaterwayPopup(waterway: StrategicWaterway): string {
  return `
    <div class="popup-header waterway">
      <span class="popup-title">${escapeHtml(waterway.name)}</span>
      <span class="popup-badge elevated">${t('popups.strategic')}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      ${waterway.description ? `<p class="popup-description">${escapeHtml(waterway.description)}</p>` : ''}
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${waterway.lat.toFixed(2)}°, ${waterway.lon.toFixed(2)}°</span>
        </div>
      </div>
    </div>
  `;
}

export function renderNuclearPopup(facility: NuclearFacility): string {
  const typeLabels: Record<string, string> = {
    'plant': t('popups.nuclear.types.plant'),
    'enrichment': t('popups.nuclear.types.enrichment'),
    'weapons': t('popups.nuclear.types.weapons'),
    'research': t('popups.nuclear.types.research'),
  };
  const statusColors: Record<string, string> = {
    'active': 'elevated',
    'contested': 'high',
    'decommissioned': 'low',
  };

  return `
    <div class="popup-header nuclear">
      <span class="popup-title">${escapeHtml(facility.name.toUpperCase())}</span>
      <span class="popup-badge ${statusColors[facility.status] || 'low'}">${escapeHtml(facility.status.toUpperCase())}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.type')}</span>
          <span class="stat-value">${escapeHtml(typeLabels[facility.type] || facility.type.toUpperCase())}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.status')}</span>
          <span class="stat-value">${escapeHtml(facility.status.toUpperCase())}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${facility.lat.toFixed(2)}°, ${facility.lon.toFixed(2)}°</span>
        </div>
      </div>
      <p class="popup-description">${t('popups.nuclear.description')}</p>
    </div>
  `;
}

export function renderIrradiatorPopup(irradiator: GammaIrradiator): string {
  return `
    <div class="popup-header irradiator">
      <span class="popup-title">☢ ${escapeHtml(irradiator.city.toUpperCase())}</span>
      <span class="popup-badge elevated">${t('popups.gamma')}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${t('popups.irradiator.subtitle')}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.country')}</span>
          <span class="stat-value">${escapeHtml(irradiator.country)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.city')}</span>
          <span class="stat-value">${escapeHtml(irradiator.city)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${irradiator.lat.toFixed(2)}°, ${irradiator.lon.toFixed(2)}°</span>
        </div>
      </div>
      <p class="popup-description">${t('popups.irradiator.description')}</p>
    </div>
  `;
}

export function renderPipelinePopup(pipeline: Pipeline): string {
  const typeLabels: Record<string, string> = {
    'oil': t('popups.pipeline.types.oil'),
    'gas': t('popups.pipeline.types.gas'),
    'products': t('popups.pipeline.types.products'),
  };
  const typeColors: Record<string, string> = {
    'oil': 'high',
    'gas': 'elevated',
    'products': 'low',
  };
  const statusLabels: Record<string, string> = {
    'operating': t('popups.pipeline.status.operating'),
    'construction': t('popups.pipeline.status.construction'),
  };
  const typeIcon = pipeline.type === 'oil' ? '🛢' : pipeline.type === 'gas' ? '🔥' : '⛽';

  return `
    <div class="popup-header pipeline ${pipeline.type}">
      <span class="popup-title">${typeIcon} ${escapeHtml(pipeline.name.toUpperCase())}</span>
      <span class="popup-badge ${typeColors[pipeline.type] || 'low'}">${escapeHtml(pipeline.type.toUpperCase())}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${typeLabels[pipeline.type] || t('popups.pipeline.title')}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.status')}</span>
          <span class="stat-value">${escapeHtml(statusLabels[pipeline.status] || pipeline.status.toUpperCase())}</span>
        </div>
        ${pipeline.capacity ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.capacity')}</span>
          <span class="stat-value">${escapeHtml(pipeline.capacity)}</span>
        </div>
        ` : ''}
        ${pipeline.length ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.length')}</span>
          <span class="stat-value">${escapeHtml(pipeline.length)}</span>
        </div>
        ` : ''}
        ${pipeline.operator ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.operator')}</span>
          <span class="stat-value">${escapeHtml(pipeline.operator)}</span>
        </div>
        ` : ''}
      </div>
      ${pipeline.countries && pipeline.countries.length > 0 ? `
        <div class="popup-section">
          <span class="section-label">${t('popups.countries')}</span>
          <div class="popup-tags">
            ${pipeline.countries.map(c => `<span class="popup-tag">${escapeHtml(c)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      <p class="popup-description">${t('popups.pipeline.description', { type: pipeline.type, status: pipeline.status === 'operating' ? t('popups.pipelineStatusDesc.operating') : t('popups.pipelineStatusDesc.construction') })}</p>
    </div>
  `;
}

export function renderCablePopup(cable: UnderseaCable, cableAdvisories: CableAdvisory[], repairShips: RepairShip[]): string {
  const advisory = getLatestCableAdvisory(cableAdvisories, cable.id);
  const repairShip = getPriorityRepairShip(repairShips, cable.id);
  const healthRecord = getCableHealthRecord(cable.id);

  // Health data takes priority over advisory for status display
  let statusLabel: string;
  let statusBadge: string;
  if (healthRecord?.status === 'fault') {
    statusLabel = t('popups.cable.fault');
    statusBadge = 'high';
  } else if (healthRecord?.status === 'degraded') {
    statusLabel = t('popups.cable.degraded');
    statusBadge = 'elevated';
  } else if (advisory) {
    statusLabel = advisory.severity === 'fault' ? t('popups.cable.fault') : t('popups.cable.degraded');
    statusBadge = advisory.severity === 'fault' ? 'high' : 'elevated';
  } else {
    statusLabel = t('popups.cable.active');
    statusBadge = 'low';
  }
  const repairEta = repairShip?.eta || advisory?.repairEta;
  const cableName = escapeHtml(cable.name.toUpperCase());
  const safeStatusLabel = escapeHtml(statusLabel);
  const safeRepairEta = repairEta ? escapeHtml(repairEta) : '';
  const advisoryTitle = advisory ? escapeHtml(advisory.title) : '';
  const advisoryImpact = advisory ? escapeHtml(advisory.impact) : '';
  const advisoryDescription = advisory ? escapeHtml(advisory.description) : '';
  const repairShipName = repairShip ? escapeHtml(repairShip.name) : '';
  const repairShipNote = repairShip ? escapeHtml(repairShip.note || t('popups.repairShip.note')) : '';

  return `
    <div class="popup-header cable">
      <span class="popup-title">🌐 ${cableName}</span>
      <span class="popup-badge ${statusBadge}">${cable.major ? t('popups.cable.major') : t('popups.cable.cable')}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${t('popups.cable.subtitle')}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.type')}</span>
          <span class="stat-value">${t('popups.cable.type')}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.waypoints')}</span>
          <span class="stat-value">${cable.points.length}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.status')}</span>
          <span class="stat-value">${safeStatusLabel}</span>
        </div>
        ${repairEta ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.repairEta')}</span>
          <span class="stat-value">${safeRepairEta}</span>
        </div>
        ` : ''}
      </div>
      ${advisory ? `
        <div class="popup-section">
          <span class="section-label">${t('popups.cable.advisory')}</span>
          <div class="popup-tags">
            <span class="popup-tag">${advisoryTitle}</span>
            <span class="popup-tag">${advisoryImpact}</span>
          </div>
          <p class="popup-description">${advisoryDescription}</p>
        </div>
      ` : ''}
      ${repairShip ? `
        <div class="popup-section">
          <span class="section-label">${t('popups.cable.repairDeployment')}</span>
          <div class="popup-tags">
            <span class="popup-tag">${repairShipName}</span>
            <span class="popup-tag">${repairShip.status === 'on-station' ? t('popups.cable.repairStatus.onStation') : t('popups.cable.repairStatus.enRoute')}</span>
          </div>
          <p class="popup-description">${repairShipNote}</p>
        </div>
      ` : ''}
      ${healthRecord?.evidence?.length ? `
        <div class="popup-section">
          <span class="section-label">${t('popups.cable.health.evidence')}</span>
          <ul class="evidence-list">
            ${healthRecord.evidence.map((e) => `<li class="evidence-item"><strong>${escapeHtml(e.source)}</strong>: ${escapeHtml(e.summary)}</li>`).join('')}
          </ul>
        </div>
      ` : ''}
      <p class="popup-description">${t('popups.cable.description')}</p>
    </div>
  `;
}

export function renderCableAdvisoryPopup(advisory: CableAdvisory): string {
  const cable = UNDERSEA_CABLES.find((item) => item.id === advisory.cableId);
  const timeAgo = getTimeAgo(advisory.reported);
  const statusLabel = advisory.severity === 'fault' ? t('popups.cable.fault') : t('popups.cable.degraded');
  const cableName = escapeHtml(cable?.name.toUpperCase() || advisory.cableId.toUpperCase());
  const advisoryTitle = escapeHtml(advisory.title);
  const advisoryImpact = escapeHtml(advisory.impact);
  const advisoryEta = advisory.repairEta ? escapeHtml(advisory.repairEta) : '';
  const advisoryDescription = escapeHtml(advisory.description);

  return `
    <div class="popup-header cable">
      <span class="popup-title">🚨 ${cableName}</span>
      <span class="popup-badge ${advisory.severity === 'fault' ? 'high' : 'elevated'}">${statusLabel}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${advisoryTitle}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.cableAdvisory.reported')}</span>
          <span class="stat-value">${timeAgo}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.cableAdvisory.impact')}</span>
          <span class="stat-value">${advisoryImpact}</span>
        </div>
        ${advisory.repairEta ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.cableAdvisory.eta')}</span>
          <span class="stat-value">${advisoryEta}</span>
        </div>
        ` : ''}
      </div>
      <p class="popup-description">${advisoryDescription}</p>
    </div>
  `;
}

export function renderRepairShipPopup(ship: RepairShip): string {
  const cable = UNDERSEA_CABLES.find((item) => item.id === ship.cableId);
  const shipName = escapeHtml(ship.name.toUpperCase());
  const cableLabel = escapeHtml(cable?.name || ship.cableId);
  const shipEta = escapeHtml(ship.eta);
  const shipOperator = ship.operator ? escapeHtml(ship.operator) : '';
  const shipNote = escapeHtml(ship.note || t('popups.repairShip.description'));

  return `
    <div class="popup-header cable">
      <span class="popup-title">🚢 ${shipName}</span>
      <span class="popup-badge elevated">${t('popups.repairShip.badge')}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${cableLabel}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.status')}</span>
          <span class="stat-value">${ship.status === 'on-station' ? t('popups.repairShip.status.onStation') : t('popups.repairShip.status.enRoute')}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.cableAdvisory.eta')}</span>
          <span class="stat-value">${shipEta}</span>
        </div>
        ${ship.operator ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.operator')}</span>
          <span class="stat-value">${shipOperator}</span>
        </div>
        ` : ''}
      </div>
      <p class="popup-description">${shipNote}</p>
    </div>
  `;
}

export function renderOutagePopup(outage: InternetOutage): string {
  const severityColors: Record<string, string> = {
    'total': 'high',
    'major': 'elevated',
    'partial': 'low',
  };
  const severityLabels: Record<string, string> = {
    'total': t('popups.outage.levels.total'),
    'major': t('popups.outage.levels.major'),
    'partial': t('popups.outage.levels.partial'),
  };
  const timeAgo = getTimeAgo(outage.pubDate);
  const severityClass = escapeHtml(outage.severity);

  return `
    <div class="popup-header outage ${severityClass}">
      <span class="popup-title">📡 ${escapeHtml(outage.country.toUpperCase())}</span>
      <span class="popup-badge ${severityColors[outage.severity] || 'low'}">${severityLabels[outage.severity] || t('popups.outage.levels.disruption')}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(outage.title)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.severity')}</span>
          <span class="stat-value">${escapeHtml(outage.severity.toUpperCase())}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.outage.reported')}</span>
          <span class="stat-value">${timeAgo}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${outage.lat.toFixed(2)}°, ${outage.lon.toFixed(2)}°</span>
        </div>
      </div>
      ${outage.categories && outage.categories.length > 0 ? `
        <div class="popup-section">
          <span class="section-label">${t('popups.outage.categories')}</span>
          <div class="popup-tags">
            ${outage.categories.slice(0, 5).map(c => `<span class="popup-tag">${escapeHtml(c)}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      <p class="popup-description">${escapeHtml(outage.description.slice(0, 250))}${outage.description.length > 250 ? '...' : ''}</p>
      <a href="${sanitizeUrl(outage.link)}" target="_blank" class="popup-link">${t('popups.outage.readReport')} →</a>
    </div>
  `;
}

export function renderDatacenterPopup(dc: AIDataCenter): string {
  const statusColors: Record<string, string> = {
    'existing': 'normal',
    'planned': 'elevated',
    'decommissioned': 'low',
  };
  const statusLabels: Record<string, string> = {
    'existing': t('popups.datacenter.status.existing'),
    'planned': t('popups.datacenter.status.planned'),
    'decommissioned': t('popups.datacenter.status.decommissioned'),
  };

  return `
    <div class="popup-header datacenter ${dc.status}">
      <span class="popup-title">🖥️ ${escapeHtml(dc.name)}</span>
      <span class="popup-badge ${statusColors[dc.status] || 'normal'}">${statusLabels[dc.status] || t('popups.datacenter.status.unknown')}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(dc.owner)} • ${escapeHtml(dc.country)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.gpuChipCount')}</span>
          <span class="stat-value">${formatNumber(dc.chipCount)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.chipType')}</span>
          <span class="stat-value">${escapeHtml(dc.chipType || t('popups.unknown'))}</span>
        </div>
        ${dc.powerMW ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.power')}</span>
          <span class="stat-value">${dc.powerMW.toFixed(0)} MW</span>
        </div>
        ` : ''}
        ${dc.sector ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.sector')}</span>
          <span class="stat-value">${escapeHtml(dc.sector)}</span>
        </div>
        ` : ''}
      </div>
      ${dc.note ? `<p class="popup-description">${escapeHtml(dc.note)}</p>` : ''}
      <div class="popup-attribution">${t('popups.datacenter.attribution')}</div>
    </div>
  `;
}

export function renderDatacenterClusterPopup(data: DatacenterClusterData): string {
  const totalCount = data.count ?? data.items.length;
  const totalChips = data.totalChips ?? data.items.reduce((sum, dc) => sum + dc.chipCount, 0);
  const totalPower = data.totalPowerMW ?? data.items.reduce((sum, dc) => sum + (dc.powerMW || 0), 0);
  const existingCount = data.existingCount ?? data.items.filter(dc => dc.status === 'existing').length;
  const plannedCount = data.plannedCount ?? data.items.filter(dc => dc.status === 'planned').length;

  const dcListHtml = data.items.slice(0, 8).map(dc => `
    <div class="cluster-item">
      <span class="cluster-item-icon">${dc.status === 'planned' ? '🔨' : '🖥️'}</span>
      <div class="cluster-item-info">
        <span class="cluster-item-name">${escapeHtml(dc.name.slice(0, 40))}${dc.name.length > 40 ? '...' : ''}</span>
        <span class="cluster-item-detail">${escapeHtml(dc.owner)} • ${formatNumber(dc.chipCount)} ${t('popups.datacenter.chips')}</span>
      </div>
    </div>
  `).join('');

  return `
    <div class="popup-header datacenter cluster">
      <span class="popup-title">🖥️ ${t('popups.datacenter.cluster.title', { count: String(totalCount) })}</span>
      <span class="popup-badge elevated">${escapeHtml(data.region)}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(data.country)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.cluster.totalChips')}</span>
          <span class="stat-value">${formatNumber(totalChips)}</span>
        </div>
        ${totalPower > 0 ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.cluster.totalPower')}</span>
          <span class="stat-value">${totalPower.toFixed(0)} MW</span>
        </div>
        ` : ''}
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.cluster.operational')}</span>
          <span class="stat-value">${existingCount}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.datacenter.cluster.planned')}</span>
          <span class="stat-value">${plannedCount}</span>
        </div>
      </div>
      <div class="cluster-list">
        ${dcListHtml}
      </div>
      ${totalCount > 8 ? `<p class="popup-more">${t('popups.datacenter.cluster.moreDataCenters', { count: String(Math.max(0, totalCount - 8)) })}</p>` : ''}
      ${data.sampled ? `<p class="popup-more">${t('popups.datacenter.cluster.sampledSites', { count: String(data.items.length) })}</p>` : ''}
      <div class="popup-attribution">${t('popups.datacenter.attribution')}</div>
    </div>
  `;
}

export function renderNaturalEventPopup(event: NaturalEvent): string {
  const categoryColors: Record<string, string> = {
    severeStorms: 'high',
    wildfires: 'high',
    volcanoes: 'high',
    earthquakes: 'elevated',
    floods: 'elevated',
    landslides: 'elevated',
    drought: 'medium',
    dustHaze: 'low',
    snow: 'low',
    tempExtremes: 'elevated',
    seaLakeIce: 'low',
    waterColor: 'low',
    manmade: 'elevated',
  };
  const icon = getNaturalEventIcon(event.category);
  const severityClass = categoryColors[event.category] || 'low';
  const categoryClass = sanitizeClassToken(event.category, 'manmade');
  const timeAgo = getTimeAgo(event.date);

  return `
    <div class="popup-header nat-event ${categoryClass}">
      <span class="popup-icon">${icon}</span>
      <span class="popup-title">${escapeHtml(event.categoryTitle.toUpperCase())}</span>
      <span class="popup-badge ${severityClass}">${event.closed ? t('popups.naturalEvent.closed') : t('popups.naturalEvent.active')}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(event.title)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.naturalEvent.reported')}</span>
          <span class="stat-value">${timeAgo}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${event.lat.toFixed(2)}°, ${event.lon.toFixed(2)}°</span>
        </div>
        ${event.magnitude ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.magnitude')}</span>
          <span class="stat-value">${event.magnitude}${event.magnitudeUnit ? ` ${escapeHtml(event.magnitudeUnit)}` : ''}</span>
        </div>
        ` : ''}
        ${event.sourceName ? `
        <div class="popup-stat">
          <span class="stat-label">${t('popups.source')}</span>
          <span class="stat-value">${escapeHtml(event.sourceName)}</span>
        </div>
        ` : ''}
      </div>
      ${event.stormName || event.windKt ? renderTcDetails(event) : ''}
      ${event.description && !event.windKt ? `<p class="popup-description">${escapeHtml(event.description)}</p>` : ''}
      ${event.sourceUrl ? `<a href="${sanitizeUrl(event.sourceUrl)}" target="_blank" class="popup-link">${t('popups.naturalEvent.viewOnSource', { source: escapeHtml(event.sourceName || t('popups.source')) })} →</a>` : ''}
      <div class="popup-attribution">${t('popups.naturalEvent.attribution')}</div>
    </div>
  `;
}

function renderTcDetails(event: NaturalEvent): string {
  const TC_COLORS: Record<number, string> = {
    0: '#5ebaff', 1: '#00faf4', 2: '#ffffcc', 3: '#ffe775', 4: '#ffc140', 5: '#ff6060',
  };
  const cat = event.stormCategory ?? 0;
  const color = TC_COLORS[cat] || TC_COLORS[0];
  const catLabel = event.classification || (cat > 0 ? `Category ${cat}` : t('popups.naturalEvent.tropicalSystem'));

  return `
    <div class="popup-stats">
      ${event.stormName ? `
      <div class="popup-stat" style="grid-column: 1 / -1">
        <span class="stat-label">${t('popups.naturalEvent.storm')}</span>
        <span class="stat-value">${escapeHtml(event.stormName)}</span>
      </div>` : ''}
      <div class="popup-stat">
        <span class="stat-label">${t('popups.naturalEvent.classification')}</span>
        <span class="stat-value" style="color: ${color}">${escapeHtml(catLabel)}</span>
      </div>
      ${event.windKt != null ? `
      <div class="popup-stat">
        <span class="stat-label">${t('popups.naturalEvent.maxWind')}</span>
        <span class="stat-value">${event.windKt} kt (${Math.round(event.windKt * 1.15078)} mph)</span>
      </div>` : ''}
      ${event.pressureMb != null ? `
      <div class="popup-stat">
        <span class="stat-label">${t('popups.naturalEvent.pressure')}</span>
        <span class="stat-value">${event.pressureMb} mb</span>
      </div>` : ''}
      ${event.movementSpeedKt != null ? `
      <div class="popup-stat">
        <span class="stat-label">${t('popups.naturalEvent.movement')}</span>
        <span class="stat-value">${event.movementDir != null ? event.movementDir + '° at ' : ''}${event.movementSpeedKt} kt</span>
      </div>` : ''}
    </div>
  `;
}
