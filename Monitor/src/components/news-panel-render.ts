import type { NewsItem, ClusteredEvent, RelatedAsset, RelatedAssetContext } from '@/types';
import { formatTime, getCSSColor } from '@/utils';
import { escapeHtml, sanitizeUrl } from '@/utils/sanitize';
import { getClusterAssetContext, MAX_DISTANCE_KM } from '@/services';
import { getSourcePropagandaRisk, getSourceTier, getSourceType } from '@/config/feeds';
import { t, getCurrentLanguage } from '@/services/i18n';

/**
 * Render a flat (non-clustered) news item to HTML string.
 */
export function renderFlatItemHtml(item: NewsItem): string {
  return `
    <div class="item ${item.isAlert ? 'alert' : ''}" ${item.monitorColor ? `style="border-inline-start-color: ${escapeHtml(item.monitorColor)}"` : ''}>
      <div class="item-source">
        ${escapeHtml(item.source)}
        ${item.lang && item.lang !== getCurrentLanguage() ? `<span class="lang-badge">${item.lang.toUpperCase()}</span>` : ''}
        ${item.isAlert ? '<span class="alert-tag">ALERT</span>' : ''}
      </div>
      <a class="item-title" href="${sanitizeUrl(item.link)}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>
      <div class="item-time">
        ${formatTime(item.pubDate)}
        ${getCurrentLanguage() !== 'en' ? `<button class="item-translate-btn" title="Translate" data-text="${escapeHtml(item.title)}">文</button>` : ''}
      </div>
    </div>
  `;
}

/**
 * Get a localized label for a related asset type.
 */
export function getLocalizedAssetLabel(type: RelatedAsset['type']): string {
  const keyMap: Record<RelatedAsset['type'], string> = {
    pipeline: 'modals.countryBrief.infra.pipeline',
    cable: 'modals.countryBrief.infra.cable',
    datacenter: 'modals.countryBrief.infra.datacenter',
    base: 'modals.countryBrief.infra.base',
    nuclear: 'modals.countryBrief.infra.nuclear',
  };
  return t(keyMap[type]);
}

/**
 * Render a single cluster to HTML string.
 * Also populates the relatedAssetContext map if the cluster has nearby assets.
 */
export function renderClusterHtml(
  cluster: ClusteredEvent,
  isNew: boolean,
  shouldHighlight: boolean,
  showNewTag: boolean,
  relatedAssetContext: Map<string, RelatedAssetContext>,
): string {
  const sourceBadge = cluster.sourceCount > 1
    ? `<span class="source-count">${t('components.newsPanel.sources', { count: String(cluster.sourceCount) })}</span>`
    : '';

  const velocity = cluster.velocity;
  const velocityBadge = velocity && velocity.level !== 'normal' && cluster.sourceCount > 1
    ? `<span class="velocity-badge ${velocity.level}">${velocity.trend === 'rising' ? '↑' : ''}+${velocity.sourcesPerHour}/hr</span>`
    : '';

  const sentimentIcon = velocity?.sentiment === 'negative' ? '⚠' : velocity?.sentiment === 'positive' ? '✓' : '';
  const sentimentBadge = sentimentIcon && Math.abs(velocity?.sentimentScore || 0) > 2
    ? `<span class="sentiment-badge ${velocity?.sentiment}">${sentimentIcon}</span>`
    : '';

  const newTag = showNewTag ? `<span class="new-tag">${t('common.new')}</span>` : '';
  const langBadge = cluster.lang && cluster.lang !== getCurrentLanguage()
    ? `<span class="lang-badge">${cluster.lang.toUpperCase()}</span>`
    : '';

  // Propaganda risk indicator for primary source
  const primaryPropRisk = getSourcePropagandaRisk(cluster.primarySource);
  const primaryPropBadge = primaryPropRisk.risk !== 'low'
    ? `<span class="propaganda-badge ${primaryPropRisk.risk}" title="${escapeHtml(primaryPropRisk.note || `State-affiliated: ${primaryPropRisk.stateAffiliated || 'Unknown'}`)}">${primaryPropRisk.risk === 'high' ? '⚠ State Media' : '! Caution'}</span>`
    : '';

  // Source credibility badge for primary source (T1=Wire, T2=Verified outlet)
  const primaryTier = getSourceTier(cluster.primarySource);
  const primaryType = getSourceType(cluster.primarySource);
  const tierLabel = primaryTier === 1 ? 'Wire' : ''; // Don't show "Major" - confusing with story importance
  const tierBadge = primaryTier <= 2
    ? `<span class="tier-badge tier-${primaryTier}" title="${primaryType === 'wire' ? 'Wire Service - Highest reliability' : primaryType === 'gov' ? 'Official Government Source' : 'Verified News Outlet'}">${primaryTier === 1 ? '★' : '●'}${tierLabel ? ` ${tierLabel}` : ''}</span>`
    : '';

  // Build "Also reported by" section for multi-source confirmation
  const otherSources = cluster.topSources.filter(s => s.name !== cluster.primarySource);
  const topSourcesHtml = otherSources.length > 0
    ? `<span class="also-reported">Also:</span>` + otherSources
      .map(s => {
        const propRisk = getSourcePropagandaRisk(s.name);
        const propBadge = propRisk.risk !== 'low'
          ? `<span class="propaganda-badge ${propRisk.risk}" title="${escapeHtml(propRisk.note || `State-affiliated: ${propRisk.stateAffiliated || 'Unknown'}`)}">${propRisk.risk === 'high' ? '⚠' : '!'}</span>`
          : '';
        return `<span class="top-source tier-${s.tier}">${escapeHtml(s.name)}${propBadge}</span>`;
      })
      .join('')
    : '';

  const assetContext = getClusterAssetContext(cluster);
  if (assetContext && assetContext.assets.length > 0) {
    relatedAssetContext.set(cluster.id, assetContext);
  }

  const relatedAssetsHtml = assetContext && assetContext.assets.length > 0
    ? `
      <div class="related-assets" data-cluster-id="${escapeHtml(cluster.id)}">
        <div class="related-assets-header">
          ${t('components.newsPanel.relatedAssetsNear', { location: escapeHtml(assetContext.origin.label) })}
          <span class="related-assets-range">(${MAX_DISTANCE_KM}km)</span>
        </div>
        <div class="related-assets-list">
          ${assetContext.assets.map(asset => `
            <button class="related-asset" data-cluster-id="${escapeHtml(cluster.id)}" data-asset-id="${escapeHtml(asset.id)}" data-asset-type="${escapeHtml(asset.type)}">
              <span class="related-asset-type">${escapeHtml(getLocalizedAssetLabel(asset.type))}</span>
              <span class="related-asset-name">${escapeHtml(asset.name)}</span>
              <span class="related-asset-distance">${Math.round(asset.distanceKm)}km</span>
            </button>
          `).join('')}
        </div>
      </div>
    `
    : '';

  // Category tag from threat classification
  const cat = cluster.threat?.category;
  const catLabel = cat && cat !== 'general' ? cat.charAt(0).toUpperCase() + cat.slice(1) : '';
  const threatVarMap: Record<string, string> = { critical: '--threat-critical', high: '--threat-high', medium: '--threat-medium', low: '--threat-low', info: '--threat-info' };
  const catColor = cluster.threat ? getCSSColor(threatVarMap[cluster.threat.level] || '--text-dim') : '';
  const categoryBadge = catLabel
    ? `<span class="category-tag" style="color:${catColor};border-color:${catColor}40;background:${catColor}20">${catLabel}</span>`
    : '';

  // Build class list for item
  const itemClasses = [
    'item',
    'clustered',
    cluster.isAlert ? 'alert' : '',
    shouldHighlight ? 'item-new-highlight' : '',
    isNew ? 'item-new' : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${itemClasses}" ${cluster.monitorColor ? `style="border-inline-start-color: ${escapeHtml(cluster.monitorColor)}"` : ''} data-cluster-id="${escapeHtml(cluster.id)}" data-news-id="${escapeHtml(cluster.primaryLink)}">
      <div class="item-source">
        ${tierBadge}
        ${escapeHtml(cluster.primarySource)}
        ${primaryPropBadge}
        ${langBadge}
        ${newTag}
        ${sourceBadge}
        ${velocityBadge}
        ${sentimentBadge}
        ${cluster.isAlert ? '<span class="alert-tag">ALERT</span>' : ''}
        ${categoryBadge}
      </div>
      <a class="item-title" href="${sanitizeUrl(cluster.primaryLink)}" target="_blank" rel="noopener">${escapeHtml(cluster.primaryTitle)}</a>
      <div class="cluster-meta">
        <span class="top-sources">${topSourcesHtml}</span>
        <span class="item-time">${formatTime(cluster.lastUpdated)}</span>
        ${getCurrentLanguage() !== 'en' ? `<button class="item-translate-btn" title="Translate" data-text="${escapeHtml(cluster.primaryTitle)}">文</button>` : ''}
      </div>
      ${relatedAssetsHtml}
    </div>
  `;
}

/**
 * Render a cluster with error boundary — returns an error card on failure.
 */
export function renderClusterHtmlSafely(
  cluster: ClusteredEvent,
  isNew: boolean,
  shouldHighlight: boolean,
  showNewTag: boolean,
  relatedAssetContext: Map<string, RelatedAssetContext>,
): string {
  try {
    return renderClusterHtml(cluster, isNew, shouldHighlight, showNewTag, relatedAssetContext);
  } catch (error) {
    console.error('[NewsPanel] Failed to render cluster card:', error, cluster);
    const clusterId = typeof cluster?.id === 'string' ? cluster.id : 'unknown-cluster';
    return `
      <div class="item clustered item-render-error" data-cluster-id="${escapeHtml(clusterId)}">
        <div class="item-source">${t('common.error')}</div>
        <div class="item-title">Failed to display this cluster.</div>
      </div>
    `;
  }
}
