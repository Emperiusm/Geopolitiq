import { Panel } from './Panel';
import { WindowedList } from './VirtualList';
import type { NewsItem, ClusteredEvent, DeviationLevel, RelatedAsset, RelatedAssetContext } from '@/types';
import { escapeHtml } from '@/utils/sanitize';
import { analysisWorker, enrichWithVelocityML, activityTracker, generateSummary, translateText } from '@/services';
import { SITE_VARIANT } from '@/config';
import { t, getCurrentLanguage } from '@/services/i18n';

import {
  type SortMode, VIRTUAL_SCROLL_THRESHOLD, type PreparedCluster,
  sortNewsItems, sortClusters, extractHeadlines, extractFlatHeadlines,
  getHeadlineSignature, getCachedSummary, setCachedSummary,
} from './news-panel-utils';
import { renderFlatItemHtml, renderClusterHtmlSafely as renderClusterHtmlSafelyFn } from './news-panel-render';

export type { PreparedCluster };

export class NewsPanel extends Panel {
  private clusteredMode = true;
  private deviationEl: HTMLElement | null = null;
  private relatedAssetContext = new Map<string, RelatedAssetContext>();
  private onRelatedAssetClick?: (asset: RelatedAsset) => void;
  private onRelatedAssetsFocus?: (assets: RelatedAsset[], originLabel: string) => void;
  private onRelatedAssetsClear?: () => void;
  private isFirstRender = true;
  private windowedList: WindowedList<PreparedCluster> | null = null;
  private useVirtualScroll = true;
  private renderRequestId = 0;
  private boundScrollHandler: (() => void) | null = null;
  private boundClickHandler: (() => void) | null = null;

  // Sort mode toggle (#107)
  private sortMode!: SortMode;
  private sortBtn: HTMLButtonElement | null = null;
  private lastRawClusters: ClusteredEvent[] | null = null;
  private lastRawItems: NewsItem[] | null = null;

  // Panel summary feature
  private summaryBtn: HTMLButtonElement | null = null;
  private summaryContainer: HTMLElement | null = null;
  private currentHeadlines: string[] = [];
  private lastHeadlineSignature = '';
  private isSummarizing = false;

  constructor(id: string, title: string) {
    super({ id, title, showCount: true, trackActivity: true });
    this.sortMode = this.loadSortMode();
    this.createDeviationIndicator();
    this.createSortToggle();
    this.createSummarizeButton();
    this.setupActivityTracking();
    this.initWindowedList();
    this.setupContentDelegation();
  }

  private initWindowedList(): void {
    this.windowedList = new WindowedList<PreparedCluster>(
      {
        container: this.content,
        chunkSize: 8,
        bufferChunks: 1,
      },
      (prepared) => this.renderClusterHtmlSafely(
        prepared.cluster,
        prepared.isNew,
        prepared.shouldHighlight,
        prepared.showNewTag
      ),
      () => this.bindRelatedAssetEvents()
    );
  }

  private setupActivityTracking(): void {
    activityTracker.register(this.panelId);

    activityTracker.onChange(this.panelId, (newCount) => {
      this.setNewBadge(newCount, newCount > 0);
    });

    this.boundScrollHandler = () => {
      activityTracker.markAsSeen(this.panelId);
    };
    this.content.addEventListener('scroll', this.boundScrollHandler);

    this.boundClickHandler = () => {
      activityTracker.markAsSeen(this.panelId);
    };
    this.element.addEventListener('click', this.boundClickHandler);
  }

  public setRelatedAssetHandlers(options: {
    onRelatedAssetClick?: (asset: RelatedAsset) => void;
    onRelatedAssetsFocus?: (assets: RelatedAsset[], originLabel: string) => void;
    onRelatedAssetsClear?: () => void;
  }): void {
    this.onRelatedAssetClick = options.onRelatedAssetClick;
    this.onRelatedAssetsFocus = options.onRelatedAssetsFocus;
    this.onRelatedAssetsClear = options.onRelatedAssetsClear;
  }

  private createDeviationIndicator(): void {
    const header = this.getElement().querySelector('.panel-header-left');
    if (header) {
      this.deviationEl = document.createElement('span');
      this.deviationEl.className = 'deviation-indicator';
      header.appendChild(this.deviationEl);
    }
  }

  // --- Sort toggle (#107) ---
  private get sortStorageKey(): string {
    return `wm_sort_${SITE_VARIANT}_${this.panelId}`;
  }

  private loadSortMode(): SortMode {
    try {
      const v = localStorage.getItem(this.sortStorageKey);
      return v === 'newest' ? 'newest' : 'relevance';
    } catch { return 'relevance'; }
  }

  private saveSortMode(): void {
    try { localStorage.setItem(this.sortStorageKey, this.sortMode); } catch { /* storage full */ }
  }

  private createSortToggle(): void {
    this.sortBtn = document.createElement('button');
    this.sortBtn.className = 'panel-sort-btn';
    this.updateSortButtonLabel();
    this.sortBtn.addEventListener('click', () => {
      this.sortMode = this.sortMode === 'relevance' ? 'newest' : 'relevance';
      this.saveSortMode();
      this.updateSortButtonLabel();
      if (this.lastRawClusters) {
        this.renderClusters(this.lastRawClusters);
      } else if (this.lastRawItems) {
        this.renderFlat(this.lastRawItems);
      }
    });

    const countEl = this.header.querySelector('.panel-count');
    if (countEl) {
      this.header.insertBefore(this.sortBtn, countEl);
    } else {
      this.header.appendChild(this.sortBtn);
    }
  }

  private updateSortButtonLabel(): void {
    if (!this.sortBtn) return;
    const icon = this.sortMode === 'newest'
      ? '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6.5"/><polyline points="8,4 8,8 11,10"/></svg>'
      : '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 2v8M4 7l4 4 4-4"/><line x1="3" y1="14" x2="13" y2="14"/></svg>';
    const label = this.sortMode === 'newest'
      ? t('components.newsPanel.sortNewest') || 'Newest'
      : t('components.newsPanel.sortRelevance') || 'Relevance';
    const tooltip = `${t('components.newsPanel.sortBy') || 'Sort by'}: ${label}`;
    this.sortBtn.innerHTML = icon;
    this.sortBtn.title = tooltip;
    this.sortBtn.setAttribute('aria-label', tooltip);
  }

  private createSummarizeButton(): void {
    this.summaryContainer = document.createElement('div');
    this.summaryContainer.className = 'panel-summary';
    this.summaryContainer.style.display = 'none';
    this.element.insertBefore(this.summaryContainer, this.content);

    this.summaryContainer.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.panel-summary-close')) {
        this.hideSummary();
      }
    });

    this.summaryBtn = document.createElement('button');
    this.summaryBtn.className = 'panel-summarize-btn';
    this.summaryBtn.innerHTML = '✨';
    this.summaryBtn.title = t('components.newsPanel.summarize');
    this.summaryBtn.addEventListener('click', () => this.handleSummarize());

    const countEl = this.header.querySelector('.panel-count');
    if (countEl) {
      this.header.insertBefore(this.summaryBtn, countEl);
    } else {
      this.header.appendChild(this.summaryBtn);
    }
  }

  private async handleSummarize(): Promise<void> {
    if (this.isSummarizing || !this.summaryContainer || !this.summaryBtn) return;
    if (this.currentHeadlines.length === 0) return;

    const currentLang = getCurrentLanguage();
    const cacheKey = `panel_summary_v3_${SITE_VARIANT}_${this.panelId}_${currentLang}`;
    const cached = getCachedSummary(cacheKey, this.lastHeadlineSignature);
    if (cached) {
      this.showSummary(cached);
      return;
    }

    this.isSummarizing = true;
    this.summaryBtn.innerHTML = '<span class="panel-summarize-spinner"></span>';
    this.summaryBtn.disabled = true;
    this.summaryContainer.style.display = 'block';
    this.summaryContainer.innerHTML = `<div class="panel-summary-loading">${t('components.newsPanel.generatingSummary')}</div>`;

    const sigAtStart = this.lastHeadlineSignature;

    try {
      const result = await generateSummary(this.currentHeadlines.slice(0, 8), undefined, this.panelId, currentLang);
      if (!this.element?.isConnected) return;
      if (this.lastHeadlineSignature !== sigAtStart) {
        this.hideSummary();
        return;
      }
      if (result?.summary) {
        setCachedSummary(cacheKey, this.lastHeadlineSignature, result.summary);
        this.showSummary(result.summary);
      } else {
        this.summaryContainer.innerHTML = `<div class="panel-summary-error">${t('components.newsPanel.summaryError')}</div>`;
        setTimeout(() => this.hideSummary(), 3000);
      }
    } catch {
      if (!this.element?.isConnected) return;
      this.summaryContainer.innerHTML = `<div class="panel-summary-error">${t('components.newsPanel.summaryFailed')}</div>`;
      setTimeout(() => this.hideSummary(), 3000);
    } finally {
      this.isSummarizing = false;
      if (this.summaryBtn) {
        this.summaryBtn.innerHTML = '✨';
        this.summaryBtn.disabled = false;
      }
    }
  }

  private async handleTranslate(element: HTMLElement, text: string): Promise<void> {
    const currentLang = getCurrentLanguage();
    if (currentLang === 'en') return;

    const titleEl = element.closest('.item')?.querySelector('.item-title') as HTMLElement;
    if (!titleEl) return;

    const originalText = titleEl.textContent || '';

    element.innerHTML = '...';
    element.style.pointerEvents = 'none';

    try {
      const translated = await translateText(text, currentLang);
      if (!this.element?.isConnected) return;
      if (translated) {
        titleEl.textContent = translated;
        titleEl.dataset.original = originalText;
        element.innerHTML = '✓';
        element.title = 'Original: ' + originalText;
        element.classList.add('translated');
      } else {
        element.innerHTML = '文';
      }
    } catch (e) {
      if (!this.element?.isConnected) return;
      console.error('Translation failed', e);
      element.innerHTML = '文';
    } finally {
      if (element.isConnected) {
        element.style.pointerEvents = 'auto';
      }
    }
  }

  private showSummary(summary: string): void {
    if (!this.summaryContainer || !this.element?.isConnected) return;
    this.summaryContainer.style.display = 'block';
    this.summaryContainer.innerHTML = `
      <div class="panel-summary-content">
        <span class="panel-summary-text">${escapeHtml(summary)}</span>
        <button class="panel-summary-close" title="${t('components.newsPanel.close')}" aria-label="${t('components.newsPanel.close')}">×</button>
      </div>
    `;
  }

  private hideSummary(): void {
    if (!this.summaryContainer) return;
    this.summaryContainer.style.display = 'none';
    this.summaryContainer.innerHTML = '';
  }

  private updateHeadlineSignature(): void {
    const newSig = getHeadlineSignature(this.currentHeadlines);
    if (newSig !== this.lastHeadlineSignature) {
      this.lastHeadlineSignature = newSig;
      if (this.summaryContainer?.style.display === 'block') {
        this.hideSummary();
      }
    }
  }

  public setDeviation(zScore: number, percentChange: number, level: DeviationLevel): void {
    if (!this.deviationEl) return;

    if (level === 'normal') {
      this.deviationEl.textContent = '';
      this.deviationEl.className = 'deviation-indicator';
      return;
    }

    const arrow = zScore > 0 ? '↑' : '↓';
    const sign = percentChange > 0 ? '+' : '';
    this.deviationEl.textContent = `${arrow}${sign}${percentChange}%`;
    this.deviationEl.className = `deviation-indicator ${level}`;
    this.deviationEl.title = `z-score: ${zScore} (vs 7-day avg)`;
  }

  public override showError(message?: string, onRetry?: () => void, autoRetrySeconds?: number): void {
    this.lastRawClusters = null;
    this.lastRawItems = null;
    super.showError(message, onRetry, autoRetrySeconds);
  }

  public renderNews(items: NewsItem[]): void {
    if (items.length === 0) {
      this.renderRequestId += 1;
      this.setDataBadge('unavailable');
      this.showError(t('common.noNewsAvailable'));
      return;
    }

    this.setDataBadge('live');
    this.renderFlat(items);

    if (this.clusteredMode) {
      void this.renderClustersAsync(items);
    }
  }

  public renderFilteredEmpty(message: string): void {
    this.renderRequestId += 1;
    this.lastRawClusters = null;
    this.lastRawItems = null;
    this.setDataBadge('live');
    this.setCount(0);
    this.relatedAssetContext.clear();
    this.currentHeadlines = [];
    this.updateHeadlineSignature();
    this.setContent(`<div class="panel-empty">${escapeHtml(message)}</div>`);
  }

  private async renderClustersAsync(items: NewsItem[]): Promise<void> {
    const requestId = ++this.renderRequestId;

    try {
      const clusters = await analysisWorker.clusterNews(items);
      if (requestId !== this.renderRequestId) return;
      const enriched = await enrichWithVelocityML(clusters);
      this.renderClusters(enriched);
    } catch (error) {
      if (requestId !== this.renderRequestId) return;
      console.warn('[NewsPanel] Failed to cluster news, keeping flat list:', error);
    }
  }

  private renderFlat(items: NewsItem[]): void {
    this.lastRawItems = items;

    const sorted = sortNewsItems(items, this.sortMode);
    this.setCount(sorted.length);
    this.currentHeadlines = extractFlatHeadlines(sorted);
    this.updateHeadlineSignature();

    const html = sorted.map(item => renderFlatItemHtml(item)).join('');
    this.setContent(html);
  }

  private renderClusters(clusters: ClusteredEvent[]): void {
    this.lastRawClusters = clusters;
    this.lastRawItems = null;

    const sorted = sortClusters(clusters, this.sortMode);

    const totalItems = sorted.reduce((sum, c) => sum + c.sourceCount, 0);
    this.setCount(totalItems);
    this.relatedAssetContext.clear();

    this.currentHeadlines = extractHeadlines(sorted);
    this.updateHeadlineSignature();

    const clusterIds = sorted.map(c => c.id);
    let newItemIds: Set<string>;

    if (this.isFirstRender) {
      activityTracker.updateItems(this.panelId, clusterIds);
      activityTracker.markAsSeen(this.panelId);
      newItemIds = new Set();
      this.isFirstRender = false;
    } else {
      const newIds = activityTracker.updateItems(this.panelId, clusterIds);
      newItemIds = new Set(newIds);
    }

    const prepared: PreparedCluster[] = sorted.map(cluster => ({
      cluster,
      isNew: newItemIds.has(cluster.id),
      shouldHighlight: activityTracker.shouldHighlight(this.panelId, cluster.id),
      showNewTag: activityTracker.isNewItem(this.panelId, cluster.id) && newItemIds.has(cluster.id),
    }));

    if (this.useVirtualScroll && sorted.length > VIRTUAL_SCROLL_THRESHOLD && this.windowedList) {
      this.windowedList.setItems(prepared);
    } else {
      const html = prepared
        .map(p => this.renderClusterHtmlSafely(p.cluster, p.isNew, p.shouldHighlight, p.showNewTag))
        .join('');
      this.setContent(html);
    }
  }

  private renderClusterHtmlSafely(
    cluster: ClusteredEvent,
    isNew: boolean,
    shouldHighlight: boolean,
    showNewTag: boolean
  ): string {
    return renderClusterHtmlSafelyFn(cluster, isNew, shouldHighlight, showNewTag, this.relatedAssetContext);
  }

  private setupContentDelegation(): void {
    this.content.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;

      const assetBtn = target.closest<HTMLElement>('.related-asset');
      if (assetBtn) {
        e.stopPropagation();
        const clusterId = assetBtn.dataset.clusterId;
        const assetId = assetBtn.dataset.assetId;
        const assetType = assetBtn.dataset.assetType as RelatedAsset['type'] | undefined;
        if (!clusterId || !assetId || !assetType) return;
        const context = this.relatedAssetContext.get(clusterId);
        const asset = context?.assets.find(item => item.id === assetId && item.type === assetType);
        if (asset) this.onRelatedAssetClick?.(asset);
        return;
      }

      const translateBtn = target.closest<HTMLElement>('.item-translate-btn');
      if (translateBtn) {
        e.stopPropagation();
        const text = translateBtn.dataset.text;
        if (text) this.handleTranslate(translateBtn, text);
        return;
      }
    });

    this.content.addEventListener('mouseover', (e) => {
      const container = (e.target as HTMLElement).closest<HTMLElement>('.related-assets');
      if (!container) return;
      const related = (e as MouseEvent).relatedTarget as Node | null;
      if (related && container.contains(related)) return;
      const context = this.relatedAssetContext.get(container.dataset.clusterId ?? '');
      if (context) this.onRelatedAssetsFocus?.(context.assets, context.origin.label);
    });

    this.content.addEventListener('mouseout', (e) => {
      const container = (e.target as HTMLElement).closest<HTMLElement>('.related-assets');
      if (!container) return;
      const related = (e as MouseEvent).relatedTarget as Node | null;
      if (related && container.contains(related)) return;
      this.onRelatedAssetsClear?.();
    });
  }

  private bindRelatedAssetEvents(): void {
    // Event delegation is set up in setupContentDelegation() — this is now a no-op
    // kept for WindowedList callback compatibility
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.windowedList?.destroy();
    this.windowedList = null;

    if (this.boundScrollHandler) {
      this.content.removeEventListener('scroll', this.boundScrollHandler);
      this.boundScrollHandler = null;
    }
    if (this.boundClickHandler) {
      this.element.removeEventListener('click', this.boundClickHandler);
      this.boundClickHandler = null;
    }

    activityTracker.unregister(this.panelId);
    super.destroy();
  }
}
