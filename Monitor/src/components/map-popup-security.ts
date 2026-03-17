import type { ConflictZone, Hotspot, NewsItem, APTGroup, CyberThreat, SocialUnrestEvent } from '@/types';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { getCSSColor } from '@/utils';
import { t } from '@/services/i18n';
import { fetchHotspotContext, formatArticleDate, extractDomain, type GdeltArticle } from '@/services/gdelt-intel';
import { getHotspotEscalation, getEscalationChange24h } from '@/services/hotspot-escalation';
import { getLocalizedHotspotSubtext, normalizeSeverity, getTimeAgo } from './map-popup-helpers';
import type { IranEventPopupData, GpsJammingPopupData, ProtestClusterData } from './map-popup-types';

export function renderConflictPopup(conflict: ConflictZone): string {
  const severityClass = conflict.intensity === 'high' ? 'high' : conflict.intensity === 'medium' ? 'medium' : 'low';
  const severityLabel = escapeHtml(conflict.intensity?.toUpperCase() || t('popups.unknown').toUpperCase());

  return `
    <div class="popup-header conflict">
      <span class="popup-title">${escapeHtml(conflict.name.toUpperCase())}</span>
      <span class="popup-badge ${severityClass}">${severityLabel}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.startDate')}</span>
          <span class="stat-value">${escapeHtml(conflict.startDate || t('popups.unknown'))}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.casualties')}</span>
          <span class="stat-value">${escapeHtml(conflict.casualties || t('popups.unknown'))}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.displaced')}</span>
          <span class="stat-value">${escapeHtml(conflict.displaced || t('popups.unknown'))}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.location')}</span>
          <span class="stat-value">${escapeHtml(conflict.location || `${conflict.center[1]}°N, ${conflict.center[0]}°E`)}</span>
        </div>
      </div>
      ${conflict.description ? `<p class="popup-description">${escapeHtml(conflict.description)}</p>` : ''}
      ${conflict.parties && conflict.parties.length > 0 ? `
        <div class="popup-section">
          <details open>
            <summary>${t('popups.belligerents')}</summary>
            <div class="popup-section-content">
              <div class="popup-tags">
                ${conflict.parties.map(p => `<span class="popup-tag">${escapeHtml(p)}</span>`).join('')}
              </div>
            </div>
          </details>
        </div>
      ` : ''}
      ${conflict.keyDevelopments && conflict.keyDevelopments.length > 0 ? `
        <div class="popup-section">
          <details open>
            <summary>${t('popups.keyDevelopments')}</summary>
            <div class="popup-section-content">
              <ul class="popup-list">
                ${conflict.keyDevelopments.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
              </ul>
            </div>
          </details>
        </div>
      ` : ''}
    </div>
  `;
}

export function renderHotspotPopup(hotspot: Hotspot, relatedNews?: NewsItem[]): string {
  const severityClass = hotspot.level || 'low';
  const severityLabel = escapeHtml((hotspot.level || 'low').toUpperCase());
  const localizedSubtext = hotspot.subtext ? getLocalizedHotspotSubtext(hotspot.subtext) : '';

  // Get dynamic escalation score
  const dynamicScore = getHotspotEscalation(hotspot.id);
  const change24h = getEscalationChange24h(hotspot.id);

  // Escalation score display
  const escalationColors: Record<number, string> = {
    1: getCSSColor('--semantic-normal'),
    2: getCSSColor('--semantic-normal'),
    3: getCSSColor('--semantic-elevated'),
    4: getCSSColor('--semantic-high'),
    5: getCSSColor('--semantic-critical'),
  };
  const escalationLabels: Record<number, string> = {
    1: t('popups.hotspot.levels.stable'),
    2: t('popups.hotspot.levels.watch'),
    3: t('popups.hotspot.levels.elevated'),
    4: t('popups.hotspot.levels.high'),
    5: t('popups.hotspot.levels.critical')
  };
  const trendIcons: Record<string, string> = { 'escalating': '↑', 'stable': '→', 'de-escalating': '↓' };
  const trendColors: Record<string, string> = { 'escalating': getCSSColor('--semantic-critical'), 'stable': getCSSColor('--semantic-elevated'), 'de-escalating': getCSSColor('--semantic-normal') };

  const displayScore = dynamicScore?.combinedScore ?? hotspot.escalationScore ?? 3;
  const displayScoreInt = Math.round(displayScore);
  const displayTrend = dynamicScore?.trend ?? hotspot.escalationTrend ?? 'stable';

  const escalationSection = `
    <div class="popup-section escalation-section">
      <span class="section-label">${t('popups.hotspot.escalation')}</span>
      <div class="escalation-display">
        <div class="escalation-score" style="background: ${escalationColors[displayScoreInt] || getCSSColor('--text-dim')}">
          <span class="score-value">${displayScore.toFixed(1)}/5</span>
          <span class="score-label">${escalationLabels[displayScoreInt] || t('popups.unknown')}</span>
        </div>
        <div class="escalation-trend" style="color: ${trendColors[displayTrend] || getCSSColor('--text-dim')}">
          <span class="trend-icon">${trendIcons[displayTrend] || ''}</span>
          <span class="trend-label">${escapeHtml(displayTrend.toUpperCase())}</span>
        </div>
      </div>
      ${dynamicScore ? `
        <div class="escalation-breakdown">
          <div class="breakdown-header">
            <span class="baseline-label">${t('popups.hotspot.baseline')}: ${dynamicScore.staticBaseline}/5</span>
            ${change24h ? `
              <span class="change-label ${change24h.change >= 0 ? 'rising' : 'falling'}">
                24h: ${change24h.change >= 0 ? '+' : ''}${change24h.change}
              </span>
            ` : ''}
          </div>
          <div class="breakdown-components">
            <div class="breakdown-row">
              <span class="component-label">${t('popups.hotspot.components.news')}</span>
              <div class="component-bar-bg">
                <div class="component-bar news" style="width: ${dynamicScore.components.newsActivity}%"></div>
              </div>
              <span class="component-value">${Math.round(dynamicScore.components.newsActivity)}</span>
            </div>
            <div class="breakdown-row">
              <span class="component-label">${t('popups.hotspot.components.cii')}</span>
              <div class="component-bar-bg">
                <div class="component-bar cii" style="width: ${dynamicScore.components.ciiContribution}%"></div>
              </div>
              <span class="component-value">${Math.round(dynamicScore.components.ciiContribution)}</span>
            </div>
            <div class="breakdown-row">
              <span class="component-label">${t('popups.hotspot.components.geo')}</span>
              <div class="component-bar-bg">
                <div class="component-bar geo" style="width: ${dynamicScore.components.geoConvergence}%"></div>
              </div>
              <span class="component-value">${Math.round(dynamicScore.components.geoConvergence)}</span>
            </div>
            <div class="breakdown-row">
              <span class="component-label">${t('popups.hotspot.components.military')}</span>
              <div class="component-bar-bg">
                <div class="component-bar military" style="width: ${dynamicScore.components.militaryActivity}%"></div>
              </div>
              <span class="component-value">${Math.round(dynamicScore.components.militaryActivity)}</span>
            </div>
          </div>
        </div>
      ` : ''}
      ${hotspot.escalationIndicators && hotspot.escalationIndicators.length > 0 ? `
        <div class="escalation-indicators">
          ${hotspot.escalationIndicators.map(i => `<span class="indicator-tag">• ${escapeHtml(i)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `;

  // Historical context section
  const historySection = hotspot.history ? `
    <div class="popup-section history-section">
      <details>
        <summary>${t('popups.historicalContext')}</summary>
        <div class="popup-section-content">
          <div class="history-content">
            ${hotspot.history.lastMajorEvent ? `
              <div class="history-event">
                <span class="history-label">${t('popups.lastMajorEvent')}:</span>
                <span class="history-value">${escapeHtml(hotspot.history.lastMajorEvent)} ${hotspot.history.lastMajorEventDate ? `(${escapeHtml(hotspot.history.lastMajorEventDate)})` : ''}</span>
              </div>
            ` : ''}
            ${hotspot.history.precedentDescription ? `
              <div class="history-event">
                <span class="history-label">${t('popups.precedents')}:</span>
                <span class="history-value">${escapeHtml(hotspot.history.precedentDescription)}</span>
              </div>
            ` : ''}
            ${hotspot.history.cyclicalRisk ? `
              <div class="history-event cyclical">
                <span class="history-label">${t('popups.cyclicalPattern')}:</span>
                <span class="history-value">${escapeHtml(hotspot.history.cyclicalRisk)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      </details>
    </div>
  ` : '';

  // "Why it matters" section
  const whyItMattersSection = hotspot.whyItMatters ? `
    <div class="popup-section why-matters-section">
      <details>
        <summary>${t('popups.whyItMatters')}</summary>
        <div class="popup-section-content">
          <p class="why-matters-text">${escapeHtml(hotspot.whyItMatters)}</p>
        </div>
      </details>
    </div>
  ` : '';

  return `
    <div class="popup-header hotspot">
      <span class="popup-title">${escapeHtml(hotspot.name.toUpperCase())}</span>
      <span class="popup-badge ${severityClass}">${severityLabel}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      ${localizedSubtext ? `<div class="popup-subtitle">${escapeHtml(localizedSubtext)}</div>` : ''}
      ${hotspot.description ? `<p class="popup-description">${escapeHtml(hotspot.description)}</p>` : ''}
      ${escalationSection}
      <div class="popup-stats">
        ${hotspot.location ? `
          <div class="popup-stat">
            <span class="stat-label">${t('popups.location')}</span>
            <span class="stat-value">${escapeHtml(hotspot.location)}</span>
          </div>
        ` : ''}
        <div class="popup-stat">
          <span class="stat-label">${t('popups.coordinates')}</span>
          <span class="stat-value">${escapeHtml(`${hotspot.lat.toFixed(2)}°N, ${hotspot.lon.toFixed(2)}°E`)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.status')}</span>
          <span class="stat-value">${escapeHtml(hotspot.status || t('popups.monitoring'))}</span>
        </div>
      </div>
      ${whyItMattersSection}
      ${historySection}
      ${hotspot.agencies && hotspot.agencies.length > 0 ? `
        <div class="popup-section">
          <details open>
            <summary>${t('popups.keyEntities')}</summary>
            <div class="popup-section-content">
              <div class="popup-tags">
                ${hotspot.agencies.map(a => `<span class="popup-tag">${escapeHtml(a)}</span>`).join('')}
              </div>
            </div>
          </details>
        </div>
      ` : ''}
      ${relatedNews && relatedNews.length > 0 ? `
        <div class="popup-section">
          <details>
            <summary>${t('popups.relatedHeadlines')}</summary>
            <div class="popup-section-content">
              <div class="popup-news">
                ${relatedNews.slice(0, 5).map(n => `
                  <div class="popup-news-item">
                    <span class="news-source">${escapeHtml(n.source)}</span>
                    <a href="${sanitizeUrl(n.link)}" target="_blank" class="news-title">${escapeHtml(n.title)}</a>
                  </div>
                `).join('')}
              </div>
            </div>
          </details>
        </div>
      ` : ''}
      <div class="hotspot-gdelt-context" data-hotspot-id="${escapeHtml(hotspot.id)}">
        <div class="hotspot-gdelt-header">${t('popups.liveIntel')}</div>
        <div class="hotspot-gdelt-loading">${t('popups.loadingNews')}</div>
      </div>
    </div>
  `;
}

export async function loadHotspotGdeltContext(popup: HTMLElement | null, hotspot: Hotspot): Promise<void> {
  if (!popup) return;

  const container = popup.querySelector('.hotspot-gdelt-context');
  if (!container) return;

  try {
    const articles = await fetchHotspotContext(hotspot);

    if (!popup || !container.isConnected) return;

    if (articles.length === 0) {
      container.innerHTML = `
        <div class="hotspot-gdelt-header">${t('popups.liveIntel')}</div>
        <div class="hotspot-gdelt-loading">${t('popups.noCoverage')}</div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="hotspot-gdelt-header">${t('popups.liveIntel')}</div>
      <div class="hotspot-gdelt-articles">
        ${articles.slice(0, 5).map(article => renderGdeltArticle(article)).join('')}
      </div>
    `;
  } catch (error) {
    if (container.isConnected) {
      container.innerHTML = `
        <div class="hotspot-gdelt-header">${t('popups.liveIntel')}</div>
        <div class="hotspot-gdelt-loading">${t('common.error')}</div>
      `;
    }
  }
}

function renderGdeltArticle(article: GdeltArticle): string {
  const domain = article.source || extractDomain(article.url);
  const timeAgo = formatArticleDate(article.date);

  return `
    <a href="${sanitizeUrl(article.url)}" target="_blank" rel="noopener" class="hotspot-gdelt-article">
      <div class="article-meta">
        <span>${escapeHtml(domain)}</span>
        <span>${escapeHtml(timeAgo)}</span>
      </div>
      <div class="article-title">${escapeHtml(article.title)}</div>
    </a>
  `;
}

export function renderAPTPopup(apt: APTGroup): string {
  return `
    <div class="popup-header apt">
      <span class="popup-title">${escapeHtml(apt.name)}</span>
      <span class="popup-badge high">${t('popups.threat')}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${t('popups.aka')}: ${escapeHtml(apt.aka)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.sponsor')}</span>
          <span class="stat-value">${escapeHtml(apt.sponsor)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.origin')}</span>
          <span class="stat-value">${apt.lat.toFixed(1)}°, ${apt.lon.toFixed(1)}°</span>
        </div>
      </div>
      <p class="popup-description">${t('popups.apt.description')}</p>
    </div>
  `;
}

export function renderCyberThreatPopup(threat: CyberThreat): string {
  const severityClass = escapeHtml(threat.severity);
  const sourceLabels: Record<string, string> = {
    feodo: 'Feodo Tracker',
    urlhaus: 'URLhaus',
    c2intel: 'C2 Intel Feeds',
    otx: 'AlienVault OTX',
    abuseipdb: 'AbuseIPDB',
  };
  const sourceLabel = sourceLabels[threat.source] || threat.source;
  const typeLabel = threat.type.replace(/_/g, ' ').toUpperCase();
  const tags = (threat.tags || []).slice(0, 6);

  return `
    <div class="popup-header apt ${severityClass}">
      <span class="popup-title">${t('popups.cyberThreat.title')}</span>
      <span class="popup-badge ${severityClass}">${escapeHtml(threat.severity.toUpperCase())}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${escapeHtml(typeLabel)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${escapeHtml(threat.indicatorType.toUpperCase())}</span>
          <span class="stat-value">${escapeHtml(threat.indicator)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.country')}</span>
          <span class="stat-value">${escapeHtml(threat.country || t('popups.unknown'))}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.source')}</span>
          <span class="stat-value">${escapeHtml(sourceLabel)}</span>
        </div>
        ${threat.malwareFamily ? `<div class="popup-stat">
          <span class="stat-label">${t('popups.malware')}</span>
          <span class="stat-value">${escapeHtml(threat.malwareFamily)}</span>
        </div>` : ''}
        <div class="popup-stat">
          <span class="stat-label">${t('popups.lastSeen')}</span>
          <span class="stat-value">${escapeHtml(threat.lastSeen ? new Date(threat.lastSeen).toLocaleString() : t('popups.unknown'))}</span>
        </div>
      </div>
      ${tags.length > 0 ? `
      <div class="popup-tags">
        ${tags.map((tag) => `<span class="popup-tag">${escapeHtml(tag)}</span>`).join('')}
      </div>` : ''}
    </div>
  `;
}

export function renderProtestPopup(event: SocialUnrestEvent): string {
  const severityClass = escapeHtml(event.severity);
  const severityLabel = escapeHtml(event.severity.toUpperCase());
  const eventTypeLabel = escapeHtml(event.eventType.replace('_', ' ').toUpperCase());
  const icon = event.eventType === 'riot' ? '🔥' : event.eventType === 'strike' ? '✊' : '📢';
  const sourceLabel = event.sourceType === 'acled' ? t('popups.protest.acledVerified') : t('popups.protest.gdelt');
  const validatedBadge = event.validated ? `<span class="popup-badge verified">${t('popups.verified')}</span>` : '';
  const fatalitiesSection = event.fatalities
    ? `<div class="popup-stat"><span class="stat-label">${t('popups.fatalities')}</span><span class="stat-value alert">${event.fatalities}</span></div>`
    : '';
  const actorsSection = event.actors?.length
    ? `<div class="popup-stat"><span class="stat-label">${t('popups.actors')}</span><span class="stat-value">${event.actors.map(a => escapeHtml(a)).join(', ')}</span></div>`
    : '';
  const tagsSection = event.tags?.length
    ? `<div class="popup-tags">${event.tags.map(t => `<span class="popup-tag">${escapeHtml(t)}</span>`).join('')}</div>`
    : '';
  const relatedHotspots = event.relatedHotspots?.length
    ? `<div class="popup-related">${t('popups.near')}: ${event.relatedHotspots.map(h => escapeHtml(h)).join(', ')}</div>`
    : '';

  return `
    <div class="popup-header protest ${severityClass}">
      <span class="popup-icon">${icon}</span>
      <span class="popup-title">${eventTypeLabel}</span>
      <span class="popup-badge ${severityClass}">${severityLabel}</span>
      ${validatedBadge}
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-subtitle">${event.city ? `${escapeHtml(event.city)}, ` : ''}${escapeHtml(event.country)}</div>
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.time')}</span>
          <span class="stat-value">${event.time.toLocaleDateString()}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.source')}</span>
          <span class="stat-value">${sourceLabel}</span>
        </div>
        ${fatalitiesSection}
        ${actorsSection}
      </div>
      ${event.title ? `<p class="popup-description">${escapeHtml(event.title)}</p>` : ''}
      ${tagsSection}
      ${relatedHotspots}
    </div>
  `;
}

export function renderProtestClusterPopup(data: ProtestClusterData): string {
  const totalCount = data.count ?? data.items.length;
  const riots = data.riotCount ?? data.items.filter(e => e.eventType === 'riot').length;
  const highSeverity = data.highSeverityCount ?? data.items.filter(e => e.severity === 'high').length;
  const verified = data.verifiedCount ?? data.items.filter(e => e.validated).length;
  const totalFatalities = data.totalFatalities ?? data.items.reduce((sum, e) => sum + (e.fatalities || 0), 0);

  const sortedItems = [...data.items].sort((a, b) => {
    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const typeOrder: Record<string, number> = { riot: 0, civil_unrest: 1, strike: 2, demonstration: 3, protest: 4 };
    const sevDiff = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
    if (sevDiff !== 0) return sevDiff;
    return (typeOrder[a.eventType] ?? 5) - (typeOrder[b.eventType] ?? 5);
  });

  const listItems = sortedItems.slice(0, 10).map(event => {
    const icon = event.eventType === 'riot' ? '🔥' : event.eventType === 'strike' ? '✊' : '📢';
    const sevClass = event.severity;
    const dateStr = event.time.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const city = event.city ? escapeHtml(event.city) : '';
    const title = event.title ? `: ${escapeHtml(event.title.slice(0, 40))}${event.title.length > 40 ? '...' : ''}` : '';
    return `<li class="cluster-item ${sevClass}">${icon} ${dateStr}${city ? ` • ${city}` : ''}${title}</li>`;
  }).join('');

  const renderedCount = Math.min(10, data.items.length);
  const remainingCount = Math.max(0, totalCount - renderedCount);
  const moreCount = remainingCount > 0 ? `<li class="cluster-more">+${remainingCount} ${t('popups.moreEvents')}</li>` : '';
  const headerClass = highSeverity > 0 ? 'high' : riots > 0 ? 'medium' : 'low';

  return `
    <div class="popup-header protest ${headerClass} cluster">
      <span class="popup-title">📢 ${escapeHtml(data.country)}</span>
      <span class="popup-badge">${totalCount} ${t('popups.events').toUpperCase()}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body cluster-popup">
      <div class="cluster-summary">
        ${riots ? `<span class="summary-item riot">🔥 ${riots} ${t('popups.protest.riots')}</span>` : ''}
        ${highSeverity ? `<span class="summary-item high">⚠️ ${highSeverity} ${t('popups.protest.highSeverity')}</span>` : ''}
        ${verified ? `<span class="summary-item verified">✓ ${verified} ${t('popups.verified')}</span>` : ''}
        ${totalFatalities > 0 ? `<span class="summary-item fatalities">💀 ${totalFatalities} ${t('popups.fatalities')}</span>` : ''}
      </div>
      <ul class="cluster-list">${listItems}${moreCount}</ul>
      ${data.sampled ? `<p class="popup-more">${t('popups.sampledList', { count: data.items.length })}</p>` : ''}
    </div>
  `;
}

export function renderIranEventPopup(event: IranEventPopupData): string {
  const severity = normalizeSeverity(event.severity);
  const timeAgo = event.timestamp ? getTimeAgo(new Date(event.timestamp)) : '';
  const safeUrl = sanitizeUrl(event.sourceUrl);

  const relatedHtml = event.relatedEvents && event.relatedEvents.length > 0 ? `
      <div class="popup-section">
        <span class="section-label">${t('popups.iranEvent.relatedEvents')}</span>
        <ul class="cluster-list">
          ${event.relatedEvents.map(r => {
    const rSev = normalizeSeverity(r.severity);
    const rTime = r.timestamp ? getTimeAgo(new Date(r.timestamp)) : '';
    const rTitle = r.title.length > 60 ? r.title.slice(0, 60) + '…' : r.title;
    return `<li class="cluster-item"><span class="popup-badge ${rSev}">${escapeHtml(rSev.toUpperCase())}</span> ${escapeHtml(rTitle)}${rTime ? ` <span style="color:var(--text-muted);font-size:10px;">${escapeHtml(rTime)}</span>` : ''}</li>`;
  }).join('')}
        </ul>
      </div>` : '';

  return `
    <div class="popup-header iranEvent ${severity}">
      <span class="popup-title">${escapeHtml(event.title)}</span>
      <span class="popup-badge ${severity}">${escapeHtml(severity.toUpperCase())}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.type')}</span>
          <span class="stat-value">${escapeHtml(event.category)}</span>
        </div>
        ${event.locationName ? `<div class="popup-stat">
          <span class="stat-label">${t('popups.location')}</span>
          <span class="stat-value">${escapeHtml(event.locationName)}</span>
        </div>` : ''}
        ${timeAgo ? `<div class="popup-stat">
          <span class="stat-label">${t('popups.time')}</span>
          <span class="stat-value">${escapeHtml(timeAgo)}</span>
        </div>` : ''}
      </div>
      ${relatedHtml}
      ${safeUrl ? `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer nofollow" class="popup-link">${t('popups.source')} →</a>` : ''}
    </div>
  `;
}

export function renderGpsJammingPopup(data: GpsJammingPopupData): string {
  const isHigh = data.level === 'high';
  const badgeClass = isHigh ? 'critical' : 'medium';
  const headerColor = isHigh ? '#ff5050' : '#ffb432';
  return `
    <div class="popup-header" style="background:${headerColor}">
      <span class="popup-title">${t('popups.gpsJamming.title')}</span>
      <span class="popup-badge ${badgeClass}">${escapeHtml(data.level.toUpperCase())}</span>
      <button class="popup-close" aria-label="Close">×</button>
    </div>
    <div class="popup-body">
      <div class="popup-stats">
        <div class="popup-stat">
          <span class="stat-label">${t('popups.gpsJamming.navPerformance')}</span>
          <span class="stat-value">${Number(data.npAvg).toFixed(2)}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.gpsJamming.samples')}</span>
          <span class="stat-value">${data.sampleCount}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.gpsJamming.aircraft')}</span>
          <span class="stat-value">${data.aircraftCount}</span>
        </div>
        <div class="popup-stat">
          <span class="stat-label">${t('popups.gpsJamming.h3Hex')}</span>
          <span class="stat-value" style="font-size:10px">${escapeHtml(data.h3)}</span>
        </div>
      </div>
    </div>
  `;
}
