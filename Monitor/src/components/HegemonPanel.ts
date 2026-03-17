import { Panel } from './Panel';
import { h, replaceChildren } from '../utils/dom-utils';
import { escapeHtml } from '../utils/sanitize';

// ─── Style injection ────────────────────────────────────────────────
let _styleInjected = false;
function injectStyles(): void {
  if (_styleInjected) return;
  _styleInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    /* ── Layout ─────────────────────────────────────────────── */
    .hegemon-root { font-size: 13px; color: var(--text-primary, #ddd); display: flex; flex-direction: column; height: 100%; }

    /* ── Toolbar (tabs + font controls) ─────────────────────── */
    .hegemon-toolbar { display: flex; align-items: center; border-bottom: 1px solid var(--border-color, #333); padding: 0 4px; flex-shrink: 0; }
    .hegemon-tabs { display: flex; flex: 1; overflow-x: auto; gap: 0; }
    .hegemon-tabs::-webkit-scrollbar { height: 0; }
    .hegemon-tab { background: none; border: none; color: var(--text-secondary, #888); font-size: 11px; font-weight: 600; letter-spacing: .06em; padding: 8px 10px; cursor: pointer; white-space: nowrap; border-bottom: 2px solid transparent; transition: color .15s, border-color .15s; text-transform: uppercase; }
    .hegemon-tab:hover { color: var(--text-primary, #ccc); }
    .hegemon-tab.active { color: #e74c3c; border-bottom-color: #e74c3c; }
    .hegemon-font-controls { display: flex; gap: 2px; padding: 0 6px; flex-shrink: 0; }
    .hegemon-font-btn { background: none; border: 1px solid var(--border-color, #444); color: var(--text-secondary, #999); font-size: 11px; padding: 2px 6px; border-radius: 3px; cursor: pointer; }
    .hegemon-font-btn:hover { color: var(--text-primary, #eee); border-color: var(--text-secondary, #888); }

    /* ── Scrollable body ────────────────────────────────────── */
    .hegemon-body { flex: 1; overflow-y: auto; padding: 8px 10px; }

    /* ── Section headers ────────────────────────────────────── */
    .hegemon-section-title { font-size: 10px; font-weight: 700; letter-spacing: .1em; color: var(--text-secondary, #777); margin: 14px 0 8px; text-transform: uppercase; }
    .hegemon-section-title:first-child { margin-top: 0; }

    /* ── Badges ──────────────────────────────────────────────── */
    .hegemon-badge { display: inline-block; font-size: 9px; font-weight: 700; letter-spacing: .06em; padding: 1px 5px; border-radius: 2px; margin-right: 4px; text-transform: uppercase; }
    .hegemon-badge-breaking { background: #e74c3c; color: #fff; }
    .hegemon-badge-conflict { background: #c0392b; color: #fff; }
    .hegemon-badge-politics { background: #8e44ad; color: #fff; }
    .hegemon-badge-military { background: #2c3e50; color: #fff; }
    .hegemon-badge-economic { background: #2980b9; color: #fff; }
    .hegemon-badge-diplomacy { background: #16a085; color: #fff; }
    .hegemon-badge-cyber { background: #d35400; color: #fff; }
    .hegemon-badge-live { background: #e74c3c; color: #fff; animation: hegemon-pulse 1.5s infinite; }
    .hegemon-badge-catastrophic { background: #e74c3c; color: #fff; }
    .hegemon-badge-extreme { background: #e67e22; color: #fff; }
    .hegemon-badge-severe { background: #f1c40f; color: #111; }
    .hegemon-badge-high { background: #e67e22; color: #fff; }
    .hegemon-badge-elevated { background: #f39c12; color: #111; }
    .hegemon-badge-moderate { background: #3498db; color: #fff; }
    .hegemon-badge-low { background: #27ae60; color: #fff; }
    @keyframes hegemon-pulse { 0%,100%{opacity:1} 50%{opacity:.6} }

    /* ── Cards ───────────────────────────────────────────────── */
    .hegemon-card { background: rgba(255,255,255,.03); border: 1px solid var(--border-color, #333); border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; cursor: pointer; transition: background .15s; }
    .hegemon-card:hover { background: rgba(255,255,255,.06); }
    .hegemon-card-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 11px; color: var(--text-secondary, #888); flex-wrap: wrap; }
    .hegemon-card-title { font-size: 13px; font-weight: 600; color: var(--text-primary, #eee); margin-bottom: 4px; line-height: 1.35; }
    .hegemon-card-summary { font-size: 12px; color: var(--text-secondary, #aaa); line-height: 1.4; margin-bottom: 6px; }
    .hegemon-card-update { font-size: 11px; color: var(--text-secondary, #888); font-style: italic; }

    /* ── Stat pills ──────────────────────────────────────────── */
    .hegemon-pills { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0; }
    .hegemon-pill { font-size: 10px; padding: 2px 7px; border-radius: 10px; background: rgba(255,255,255,.06); color: var(--text-secondary, #bbb); border: 1px solid var(--border-color, #444); }

    /* ── Load-more button ────────────────────────────────────── */
    .hegemon-load-more { display: block; width: 100%; background: rgba(255,255,255,.04); border: 1px solid var(--border-color, #444); color: var(--text-secondary, #999); font-size: 11px; font-weight: 600; letter-spacing: .06em; padding: 8px; border-radius: 4px; cursor: pointer; text-align: center; text-transform: uppercase; margin-top: 4px; }
    .hegemon-load-more:hover { background: rgba(255,255,255,.08); color: var(--text-primary, #ddd); }

    /* ── Modal overlay ───────────────────────────────────────── */
    .hegemon-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .hegemon-modal { background: var(--panel-bg, #1a1a2e); border: 1px solid var(--border-color, #333); border-radius: 10px; width: 700px; max-width: 95vw; max-height: 80vh; overflow-y: auto; padding: 20px 24px; position: relative; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
    .hegemon-modal-close { position: absolute; top: 12px; right: 14px; background: none; border: none; color: var(--text-secondary, #888); font-size: 20px; cursor: pointer; padding: 4px 8px; line-height: 1; }
    .hegemon-modal-close:hover { color: var(--text-primary, #eee); }
    .hegemon-modal-title { font-size: 16px; font-weight: 700; color: var(--text-primary, #eee); margin-bottom: 6px; padding-right: 30px; line-height: 1.3; }
    .hegemon-modal-subtitle { font-size: 11px; color: var(--text-secondary, #888); margin-bottom: 14px; }
    .hegemon-modal-section { margin-bottom: 16px; }
    .hegemon-modal-section-title { font-size: 11px; font-weight: 700; letter-spacing: .08em; color: var(--text-secondary, #777); margin-bottom: 6px; text-transform: uppercase; }
    .hegemon-modal-body { font-size: 12px; color: var(--text-primary, #ccc); line-height: 1.55; }
    .hegemon-modal-body p { margin: 0 0 8px; }
    .hegemon-modal-body strong { color: var(--text-primary, #eee); }

    /* ── Timeline in modal ───────────────────────────────────── */
    .hegemon-timeline { border-left: 2px solid var(--border-color, #444); padding-left: 14px; margin: 8px 0; }
    .hegemon-timeline-entry { margin-bottom: 10px; position: relative; }
    .hegemon-timeline-entry::before { content: ''; position: absolute; left: -19px; top: 5px; width: 8px; height: 8px; border-radius: 50%; background: #e74c3c; }
    .hegemon-timeline-time { font-size: 10px; color: var(--text-secondary, #888); font-weight: 600; }
    .hegemon-timeline-text { font-size: 12px; color: var(--text-primary, #ccc); margin-top: 2px; line-height: 1.4; }

    /* ── Sources list ─────────────────────────────────────────── */
    .hegemon-sources { list-style: none; padding: 0; margin: 6px 0; }
    .hegemon-sources li { font-size: 11px; color: var(--text-secondary, #999); padding: 3px 0; }
    .hegemon-sources li::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--text-secondary, #555); margin-right: 8px; }
    .hegemon-sources a { color: #3498db; text-decoration: none; }
    .hegemon-sources a:hover { text-decoration: underline; }

    /* ── Brief tab ────────────────────────────────────────────── */
    .hegemon-brief-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .hegemon-brief-date { font-size: 11px; color: var(--text-secondary, #888); }
    .hegemon-region-block { margin-bottom: 14px; }
    .hegemon-region-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
    .hegemon-region-name { font-size: 12px; font-weight: 700; color: var(--text-primary, #eee); text-transform: uppercase; letter-spacing: .06em; }
    .hegemon-region-counts { font-size: 10px; color: var(--text-secondary, #888); }
    .hegemon-region-body { font-size: 12px; color: var(--text-secondary, #bbb); line-height: 1.5; }
    .hegemon-collapsible-header { cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--text-secondary, #999); margin: 10px 0 4px; padding: 4px 0; }
    .hegemon-collapsible-header:hover { color: var(--text-primary, #ddd); }
    .hegemon-collapsible-arrow { transition: transform .2s; font-size: 10px; }
    .hegemon-collapsible-body { display: none; padding-left: 8px; }
    .hegemon-collapsible-body.open { display: block; }
    .hegemon-footer-note { font-size: 10px; color: var(--text-secondary, #666); margin-top: 12px; text-align: center; font-style: italic; }

    /* ── Elections tab ────────────────────────────────────────── */
    .hegemon-election-card { background: rgba(255,255,255,.03); border: 1px solid var(--border-color, #333); border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; cursor: pointer; transition: background .15s; }
    .hegemon-election-card:hover { background: rgba(255,255,255,.06); }
    .hegemon-election-flag { font-size: 18px; margin-right: 6px; }
    .hegemon-election-country { font-size: 13px; font-weight: 600; color: var(--text-primary, #eee); }
    .hegemon-election-date { font-size: 11px; color: var(--text-secondary, #888); margin-left: 8px; }
    .hegemon-election-type { font-size: 11px; color: var(--text-secondary, #999); margin: 2px 0; }
    .hegemon-election-winner { font-size: 12px; font-weight: 600; margin: 4px 0; }
    .hegemon-winner-left { color: #27ae60; }
    .hegemon-winner-right { color: #e74c3c; }
    .hegemon-winner-center { color: #3498db; }

    /* ── Country profile modal ───────────────────────────────── */
    .hegemon-country-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
    .hegemon-country-flag { font-size: 28px; }
    .hegemon-country-name { font-size: 18px; font-weight: 700; color: var(--text-primary, #eee); }
    .hegemon-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 10px 0; }
    .hegemon-info-item { font-size: 11px; color: var(--text-secondary, #999); }
    .hegemon-info-value { font-weight: 600; color: var(--text-primary, #ddd); }
    .hegemon-risk-bars { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
    .hegemon-risk-row { display: flex; align-items: center; gap: 8px; }
    .hegemon-risk-label { font-size: 11px; color: var(--text-secondary, #999); width: 80px; flex-shrink: 0; }
    .hegemon-risk-bar { flex: 1; height: 6px; background: rgba(255,255,255,.08); border-radius: 3px; overflow: hidden; }
    .hegemon-risk-fill { height: 100%; border-radius: 3px; }
    .hegemon-risk-val { font-size: 10px; color: var(--text-secondary, #888); width: 30px; text-align: right; flex-shrink: 0; }
    .hegemon-analysis-num { display: inline-block; width: 18px; height: 18px; border-radius: 50%; background: #e74c3c; color: #fff; font-size: 10px; font-weight: 700; text-align: center; line-height: 18px; margin-right: 6px; flex-shrink: 0; }
    .hegemon-analysis-block { margin-bottom: 10px; }
    .hegemon-analysis-heading { display: flex; align-items: center; font-size: 12px; font-weight: 600; color: var(--text-primary, #eee); margin-bottom: 4px; }

    /* ── Forecast tab ─────────────────────────────────────────── */
    .hegemon-forecast-card { background: rgba(255,255,255,.03); border: 1px solid var(--border-color, #333); border-radius: 6px; padding: 12px; margin-bottom: 10px; }
    .hegemon-forecast-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .hegemon-forecast-region { font-size: 13px; font-weight: 700; color: var(--text-primary, #eee); }
    .hegemon-forecast-body { font-size: 12px; color: var(--text-secondary, #bbb); line-height: 1.5; margin-bottom: 8px; }
    .hegemon-forecast-analysis { font-size: 12px; color: #e0c97f; line-height: 1.5; font-style: italic; padding: 8px 10px; background: rgba(224,201,127,.06); border-left: 3px solid #e0c97f; border-radius: 0 4px 4px 0; margin-bottom: 8px; }
    .hegemon-trend-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .hegemon-trend-tag { font-size: 10px; padding: 2px 8px; border-radius: 10px; border: 1px solid var(--border-color, #444); }
    .hegemon-trend-up { color: #e74c3c; border-color: rgba(231,76,60,.4); }
    .hegemon-trend-down { color: #27ae60; border-color: rgba(39,174,96,.4); }

    /* ── Horizon tab ──────────────────────────────────────────── */
    .hegemon-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .hegemon-filter-pill { font-size: 11px; background: rgba(255,255,255,.04); border: 1px solid var(--border-color, #444); color: var(--text-secondary, #999); padding: 3px 10px; border-radius: 12px; cursor: pointer; display: flex; align-items: center; gap: 5px; }
    .hegemon-filter-pill.active { border-color: var(--text-primary, #ddd); color: var(--text-primary, #ddd); }
    .hegemon-filter-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
    .hegemon-month-header { font-size: 11px; font-weight: 700; letter-spacing: .08em; color: var(--text-secondary, #777); margin: 12px 0 6px; text-transform: uppercase; }
    .hegemon-horizon-card { display: flex; gap: 10px; background: rgba(255,255,255,.03); border: 1px solid var(--border-color, #333); border-radius: 6px; padding: 10px 12px; margin-bottom: 6px; }
    .hegemon-horizon-date { display: flex; flex-direction: column; align-items: center; min-width: 42px; flex-shrink: 0; }
    .hegemon-horizon-month { font-size: 9px; font-weight: 700; letter-spacing: .06em; color: var(--text-secondary, #888); text-transform: uppercase; }
    .hegemon-horizon-day { font-size: 20px; font-weight: 700; color: var(--text-primary, #eee); line-height: 1.1; }
    .hegemon-horizon-rel { font-size: 9px; color: var(--text-secondary, #777); }
    .hegemon-horizon-info { flex: 1; }
    .hegemon-horizon-title { font-size: 12px; font-weight: 600; color: var(--text-primary, #eee); margin-bottom: 2px; }
    .hegemon-horizon-loc { font-size: 11px; color: var(--text-secondary, #888); margin-bottom: 2px; }
    .hegemon-horizon-desc { font-size: 11px; color: var(--text-secondary, #aaa); line-height: 1.4; }

    /* ── Stocks tab ───────────────────────────────────────────── */
    .hegemon-market-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .hegemon-market-note { font-size: 10px; color: var(--text-secondary, #666); font-style: italic; }
    .hegemon-market-section { margin-bottom: 12px; }
    .hegemon-market-country { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
    .hegemon-market-flag { font-size: 14px; }
    .hegemon-market-name { font-size: 12px; font-weight: 600; color: var(--text-primary, #eee); }
    .hegemon-market-status { font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: 8px; }
    .hegemon-market-open { background: rgba(39,174,96,.2); color: #27ae60; }
    .hegemon-market-closed { background: rgba(231,76,60,.15); color: #e74c3c; }
    .hegemon-index-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,.04); font-size: 12px; }
    .hegemon-index-name { color: var(--text-secondary, #bbb); }
    .hegemon-index-value { color: var(--text-primary, #eee); font-weight: 600; font-variant-numeric: tabular-nums; }
    .hegemon-index-change { font-weight: 600; font-variant-numeric: tabular-nums; min-width: 60px; text-align: right; }
    .hegemon-change-pos { color: #27ae60; }
    .hegemon-change-neg { color: #e74c3c; }

    /* ── Stocks modal ─────────────────────────────────────────── */
    .hegemon-chart-area { background: rgba(0,0,0,.2); border: 1px solid var(--border-color, #333); border-radius: 6px; padding: 12px; margin-bottom: 12px; text-align: center; min-height: 160px; }
    .hegemon-chart-buttons { display: flex; gap: 4px; margin-bottom: 8px; }
    .hegemon-chart-btn { background: rgba(255,255,255,.04); border: 1px solid var(--border-color, #444); color: var(--text-secondary, #888); font-size: 10px; padding: 3px 10px; border-radius: 3px; cursor: pointer; }
    .hegemon-chart-btn.active { background: #e74c3c; color: #fff; border-color: #e74c3c; }
    .hegemon-ticker-search { display: flex; gap: 6px; margin: 10px 0; }
    .hegemon-ticker-input { flex: 1; background: rgba(255,255,255,.04); border: 1px solid var(--border-color, #444); color: var(--text-primary, #eee); font-size: 12px; padding: 6px 10px; border-radius: 4px; outline: none; }
    .hegemon-ticker-go { background: #e74c3c; border: none; color: #fff; font-size: 11px; font-weight: 600; padding: 6px 14px; border-radius: 4px; cursor: pointer; }

    /* ── Travel tab ────────────────────────────────────────────── */
    .hegemon-search-row { display: flex; gap: 6px; margin-bottom: 8px; }
    .hegemon-search-input { flex: 1; background: rgba(255,255,255,.04); border: 1px solid var(--border-color, #444); color: var(--text-primary, #eee); font-size: 12px; padding: 6px 10px; border-radius: 4px; outline: none; }
    .hegemon-date-row { display: flex; gap: 8px; margin-bottom: 10px; }
    .hegemon-date-field { flex: 1; }
    .hegemon-date-label { font-size: 10px; color: var(--text-secondary, #888); margin-bottom: 2px; text-transform: uppercase; letter-spacing: .06em; }
    .hegemon-date-input { width: 100%; background: rgba(255,255,255,.04); border: 1px solid var(--border-color, #444); color: var(--text-primary, #eee); font-size: 12px; padding: 5px 8px; border-radius: 4px; outline: none; }
    .hegemon-danger-title { font-size: 11px; font-weight: 700; letter-spacing: .08em; color: #e74c3c; margin-bottom: 8px; text-transform: uppercase; }
    .hegemon-danger-card { display: flex; align-items: flex-start; gap: 10px; background: rgba(255,255,255,.03); border: 1px solid var(--border-color, #333); border-radius: 6px; padding: 10px 12px; margin-bottom: 6px; cursor: pointer; transition: background .15s; }
    .hegemon-danger-card:hover { background: rgba(255,255,255,.06); }
    .hegemon-danger-info { flex: 1; }
    .hegemon-danger-name { font-size: 12px; font-weight: 600; color: var(--text-primary, #eee); }
    .hegemon-danger-desc { font-size: 11px; color: var(--text-secondary, #aaa); margin-top: 2px; line-height: 1.35; }
    .hegemon-danger-country { font-size: 10px; color: var(--text-secondary, #777); margin-top: 2px; }
    .hegemon-level-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 3px; white-space: nowrap; flex-shrink: 0; }
    .hegemon-lvl-5 { background: #e74c3c; color: #fff; }
    .hegemon-lvl-4 { background: #e67e22; color: #fff; }
    .hegemon-lvl-3 { background: #f1c40f; color: #111; }
    .hegemon-lvl-2 { background: #3498db; color: #fff; }
    .hegemon-lvl-1 { background: #27ae60; color: #fff; }

    /* ── Travel detail view ───────────────────────────────────── */
    .hegemon-detail-view { }
    .hegemon-back-btn { background: none; border: none; color: #3498db; font-size: 12px; cursor: pointer; padding: 4px 0; margin-bottom: 10px; }
    .hegemon-back-btn:hover { text-decoration: underline; }
    .hegemon-detail-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
    .hegemon-detail-flag { font-size: 24px; }
    .hegemon-detail-name { font-size: 16px; font-weight: 700; color: var(--text-primary, #eee); }
    .hegemon-detail-region { font-size: 11px; color: var(--text-secondary, #888); }
    .hegemon-warning-banner { background: rgba(231,76,60,.15); border: 1px solid #e74c3c; border-radius: 4px; padding: 8px 12px; font-size: 12px; font-weight: 700; color: #e74c3c; text-align: center; margin-bottom: 12px; text-transform: uppercase; letter-spacing: .06em; }
    .hegemon-detail-section { margin-bottom: 14px; }
    .hegemon-detail-section-title { font-size: 11px; font-weight: 700; letter-spacing: .08em; color: var(--text-secondary, #777); margin-bottom: 6px; text-transform: uppercase; }
    .hegemon-detail-body { font-size: 12px; color: var(--text-primary, #ccc); line-height: 1.5; }
    .hegemon-tips-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .hegemon-tip-card { background: rgba(255,255,255,.03); border: 1px solid var(--border-color, #333); border-radius: 6px; padding: 8px 10px; }
    .hegemon-tip-title { font-size: 10px; font-weight: 700; color: var(--text-secondary, #888); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 4px; }
    .hegemon-tip-value { font-size: 12px; color: var(--text-primary, #ddd); line-height: 1.4; }
    .hegemon-other-regions { list-style: none; padding: 0; margin: 4px 0; }
    .hegemon-other-regions li { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,.04); font-size: 12px; color: var(--text-primary, #ccc); }

    /* ── Table ─────────────────────────────────────────────────── */
    .hegemon-table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    .hegemon-table th { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-secondary, #777); text-align: left; padding: 4px 6px; border-bottom: 1px solid var(--border-color, #333); }
    .hegemon-table td { font-size: 12px; color: var(--text-primary, #ddd); padding: 5px 6px; border-bottom: 1px solid rgba(255,255,255,.04); }
  `;
  document.head.appendChild(style);
}

// ─── Types ──────────────────────────────────────────────────────────

interface TopStory {
  id: string;
  categories: string[];
  timeAgo: string;
  title: string;
  pills: string[];
  latestUpdate: string;
  summary: { whatHappened: string; whyItMatters: string; outlook: string };
  timeline: { time: string; text: string }[];
}

interface LatestUpdate {
  id: string;
  category: string;
  sourceCount: number;
  timeAgo: string;
  headline: string;
  snippet: string;
  summary: { whatHappened: string; whyItMatters: string };
  sources: { name: string; url: string }[];
}

interface BriefRegion {
  name: string;
  criticalCount: number;
  updateCount: number;
  summary: string;
}

interface DailyBrief {
  date: string;
  regions: BriefRegion[];
  ramifications: string;
  sourceCount: number;
  previousBriefs: { date: string; summary: string }[];
}

interface Election {
  id: string;
  flag: string;
  country: string;
  date: string;
  type: string;
  winner?: string;
  winnerAlignment?: 'left' | 'right' | 'center';
  summary: string;
  profile: CountryProfile;
}

interface CountryProfile {
  flag: string;
  name: string;
  riskLevel: string;
  riskColor: string;
  status: string;
  region: string;
  population: string;
  gdp: string;
  leader: string;
  riskIndicators: { label: string; value: number; color: string }[];
  whatHappened: string;
  whyItMatters: string;
  whatMightHappen: string;
  topStories: { title: string; url: string }[];
  latestCoverage: { title: string; url: string }[];
}

interface ForecastCard {
  region: string;
  severity: string;
  summary: string;
  forecast: string;
  trends: { label: string; direction: 'up' | 'down' }[];
}

interface HorizonEvent {
  category: string;
  month: string;
  day: number;
  relativeTime: string;
  title: string;
  location: string;
  description: string;
  monthGroup: string;
}

interface MarketCountry {
  flag: string;
  country: string;
  open: boolean;
  indices: { name: string; value: string; change: number }[];
  analysis?: string;
  outlook?: string;
}

interface DangerZone {
  id: string;
  flag: string;
  name: string;
  description: string;
  country: string;
  level: number;
  region: string;
  threatAssessment: string;
  whatsExpected: { label: string; direction: 'up' | 'down' }[];
  countryOverview: string;
  entryRequirements: string;
  healthAdvisories: string;
  otherRegions: { name: string; level: number }[];
  tips: { currency: string; emergency: string; cultural: string; transport: string };
}

// ─── Static demo data ───────────────────────────────────────────────

const DEMO_TOP_STORIES: TopStory[] = [
  {
    id: 'ts1',
    categories: ['BREAKING', 'CONFLICT'],
    timeAgo: '2h ago',
    title: 'Major Escalation in Eastern Mediterranean as Naval Forces Converge',
    pills: ['342 casualties', '12K displaced', '3 nations involved'],
    latestUpdate: 'Turkish Navy deploys additional frigates to contested waters near Cyprus EEZ',
    summary: {
      whatHappened: 'Naval forces from three Mediterranean nations have converged in disputed waters near the Cyprus Exclusive Economic Zone. The buildup follows weeks of tensions over natural gas exploration rights. Multiple warships from Turkey, Greece, and France are now operating in close proximity.',
      whyItMatters: 'The eastern Mediterranean contains significant untapped natural gas reserves estimated at 122 trillion cubic feet. Control of these resources could reshape European energy security and regional power dynamics for decades. NATO cohesion is being tested as member states take opposing sides.',
      outlook: 'Diplomatic channels remain open through EU-mediated talks scheduled for next week. However, both Turkey and Greece have escalated military readiness, suggesting neither side is prepared to back down. Risk of accidental confrontation remains elevated.',
    },
    timeline: [
      { time: '14:32 UTC', text: 'Turkish Navy frigate TCG Barbaros enters contested zone' },
      { time: '12:15 UTC', text: 'Greek PM calls emergency security council meeting' },
      { time: '09:45 UTC', text: 'French carrier group Charles de Gaulle repositions to eastern Med' },
      { time: '07:20 UTC', text: 'Cyprus issues NOTAM restricting airspace over exploration area' },
    ],
  },
  {
    id: 'ts2',
    categories: ['CONFLICT'],
    timeAgo: '5h ago',
    title: 'Sudan Civil War Intensifies as RSF Advances on El-Fasher',
    pills: ['1,200+ killed this week', '450K newly displaced', 'Famine declared'],
    latestUpdate: 'UN Security Council holds emergency session on Darfur humanitarian crisis',
    summary: {
      whatHappened: 'The Rapid Support Forces have launched a major offensive on El-Fasher, the last major city in Darfur not under their control. Heavy artillery bombardment has destroyed critical water infrastructure and the main hospital. Civilian casualties have surged dramatically over the past 72 hours.',
      whyItMatters: 'El-Fasher shelters over 800,000 displaced civilians. Its fall would complete RSF control of Darfur and could trigger the largest displacement crisis since 2003. Regional destabilization threatens Chad, South Sudan, and the Central African Republic.',
      outlook: 'International intervention remains unlikely given geopolitical divisions. Humanitarian access is severely restricted. Aid agencies warn of imminent famine conditions affecting 2.5 million people in the greater Darfur region.',
    },
    timeline: [
      { time: '16:00 UTC', text: 'UNSC emergency session begins on Darfur situation' },
      { time: '13:30 UTC', text: 'WHO confirms main hospital in El-Fasher destroyed' },
      { time: '10:00 UTC', text: 'RSF captures strategic checkpoint on Nyala-El Fasher highway' },
    ],
  },
  {
    id: 'ts3',
    categories: ['ECONOMIC', 'BREAKING'],
    timeAgo: '1h ago',
    title: 'US-China Tariff War Escalates: Beijing Announces 45% Retaliatory Duties',
    pills: ['$380B trade affected', 'Markets -3.2%', 'Supply chains disrupted'],
    latestUpdate: 'S&P 500 futures drop 2.8% in pre-market trading following Beijing announcement',
    summary: {
      whatHappened: 'China has announced 45% retaliatory tariffs on $120 billion worth of US agricultural and technology exports, responding to Washington\'s expanded tariff regime. The measures target soybeans, semiconductors, and aerospace components. Markets globally have reacted sharply.',
      whyItMatters: 'The escalation threatens to fragment global supply chains further. US agricultural states face severe economic pressure ahead of midterm elections. Technology sector decoupling accelerates, forcing companies to choose between US and Chinese markets.',
      outlook: 'No diplomatic resolution appears imminent. Both sides have signaled willingness to sustain economic pain. WTO dispute mechanisms are effectively paralyzed. Markets expect continued volatility through Q2.',
    },
    timeline: [
      { time: '15:00 UTC', text: 'Beijing formally announces retaliatory tariff package' },
      { time: '14:20 UTC', text: 'European markets fall 2.1% on contagion fears' },
      { time: '12:00 UTC', text: 'White House says "all options on the table" in response' },
    ],
  },
  {
    id: 'ts4',
    categories: ['MILITARY'],
    timeAgo: '8h ago',
    title: 'North Korea Conducts Unprecedented Dual ICBM Launch Test',
    pills: ['2 ICBMs fired', 'Range: 15,000km est.', 'DEFCON raised'],
    latestUpdate: 'Pentagon confirms both missiles splashed down in Pacific beyond Japan\'s EEZ',
    summary: {
      whatHappened: 'North Korea simultaneously launched two Hwasong-18 solid-fuel intercontinental ballistic missiles from mobile launchers in Pyongan Province. Both missiles achieved lofted trajectories reaching altitudes exceeding 6,000 km before impacting in the Pacific Ocean. This is the first confirmed dual simultaneous ICBM launch by any nation.',
      whyItMatters: 'Simultaneous ICBM launches demonstrate a capability to overwhelm missile defense systems. The Hwasong-18\'s solid-fuel design enables rapid deployment with minimal preparation time. This significantly complicates US and allied deterrence calculations in the Pacific theater.',
      outlook: 'Japan and South Korea have requested emergency UNSC consultations. The US has deployed additional THAAD batteries to Guam. Diplomatic engagement through back-channels has stalled. Regional military readiness has been elevated across the Indo-Pacific.',
    },
    timeline: [
      { time: '06:14 UTC', text: 'First ICBM launch detected by satellite early warning' },
      { time: '06:16 UTC', text: 'Second ICBM launch confirmed from separate location' },
      { time: '06:45 UTC', text: 'Japan issues J-Alert to Hokkaido and northern Honshu' },
      { time: '07:30 UTC', text: 'Both missiles impact in Pacific Ocean' },
      { time: '08:00 UTC', text: 'Pentagon press briefing confirms dual ICBM test' },
    ],
  },
];

const DEMO_LATEST_UPDATES: LatestUpdate[] = [
  {
    id: 'lu1', category: 'POLITICS', sourceCount: 14, timeAgo: '32m ago',
    headline: 'EU Parliament Passes Emergency Digital Sovereignty Act',
    snippet: 'New legislation requires all cloud infrastructure serving EU institutions to be operated from EU-based data centers by 2027, affecting major US tech firms.',
    summary: { whatHappened: 'The European Parliament passed the Digital Sovereignty Act with a decisive 412-189 vote. The act mandates that all cloud services used by EU government bodies must operate from physically EU-located data centers.', whyItMatters: 'US cloud providers Amazon, Microsoft, and Google currently host approximately 60% of EU government data. Compliance will require billions in new infrastructure investment and may set precedent for private sector requirements.' },
    sources: [{ name: 'Reuters', url: 'https://reuters.com' }, { name: 'Politico EU', url: 'https://politico.eu' }, { name: 'Financial Times', url: 'https://ft.com' }],
  },
  {
    id: 'lu2', category: 'MILITARY', sourceCount: 8, timeAgo: '1h ago',
    headline: 'India Tests Hypersonic Cruise Missile in Bay of Bengal',
    snippet: 'DRDO confirms successful test of scramjet-powered cruise missile achieving Mach 7, joining an exclusive club of nations with operational hypersonic weapons.',
    summary: { whatHappened: 'India\'s Defence Research and Development Organisation successfully tested a domestically developed hypersonic cruise missile from a mobile launcher on the Odisha coast. The missile achieved speeds exceeding Mach 7 during its 400km flight.', whyItMatters: 'India becomes only the fourth nation to demonstrate operational hypersonic missile capability. The development alters the strategic calculus in the Indo-Pacific and has implications for the India-China-Pakistan security triangle.' },
    sources: [{ name: 'NDTV', url: 'https://ndtv.com' }, { name: 'Jane\'s Defence', url: 'https://janes.com' }],
  },
  {
    id: 'lu3', category: 'CYBER', sourceCount: 22, timeAgo: '2h ago',
    headline: 'Massive Ransomware Attack Cripples European Hospital Networks',
    snippet: 'Coordinated cyber attack disrupts healthcare systems across Germany, Netherlands, and Belgium. Over 40 hospitals affected, emergency services rerouted.',
    summary: { whatHappened: 'A sophisticated ransomware campaign simultaneously targeted hospital management systems across three European countries. The attack exploited a zero-day vulnerability in widely-used medical records software. Emergency departments at 42 hospitals have been forced to divert patients.', whyItMatters: 'The scale and coordination suggest state-sponsored or state-tolerated actors. Healthcare infrastructure attacks cross established red lines in cyber conflict norms. Patient safety is directly endangered as critical systems remain offline.' },
    sources: [{ name: 'Wired', url: 'https://wired.com' }, { name: 'BleepingComputer', url: 'https://bleepingcomputer.com' }, { name: 'BSI Germany', url: 'https://bsi.bund.de' }],
  },
  {
    id: 'lu4', category: 'ECONOMIC', sourceCount: 11, timeAgo: '3h ago',
    headline: 'OPEC+ Emergency Meeting Called as Oil Drops Below $60',
    snippet: 'Saudi Arabia pushes for immediate production cuts as Brent crude hits 18-month low amid global demand slowdown concerns.',
    summary: { whatHappened: 'Brent crude fell below $60 per barrel for the first time since September 2024, triggering an emergency OPEC+ ministerial meeting. Saudi Arabia is reportedly seeking an additional 1.5 million barrels per day in production cuts.', whyItMatters: 'Sub-$60 oil threatens the fiscal sustainability of major producing nations. Saudi Arabia requires $80+ oil to balance its budget. The price decline reflects weakening global demand, particularly from China, and signals broader economic slowdown concerns.' },
    sources: [{ name: 'Bloomberg', url: 'https://bloomberg.com' }, { name: 'OPEC', url: 'https://opec.org' }],
  },
  {
    id: 'lu5', category: 'DIPLOMACY', sourceCount: 6, timeAgo: '4h ago',
    headline: 'Taiwan Strait Tensions Ease as Back-Channel Talks Resume',
    snippet: 'Unnamed officials confirm quiet diplomatic exchanges between Washington and Beijing on military-to-military communication protocols in the Taiwan Strait.',
    summary: { whatHappened: 'After months of heightened military activity, backchannel communications between US and Chinese military officials have resumed. Discussions focus on establishing crisis communication protocols and reducing the risk of accidental escalation in the Taiwan Strait.', whyItMatters: 'Direct military-to-military communication is the most effective tool for preventing accidental conflict. The resumption of talks signals pragmatism on both sides despite ongoing strategic competition.' },
    sources: [{ name: 'South China Morning Post', url: 'https://scmp.com' }, { name: 'AP News', url: 'https://apnews.com' }],
  },
];

const DEMO_BRIEF: DailyBrief = {
  date: 'March 17, 2026',
  regions: [
    { name: 'MIDDLE EAST', criticalCount: 3, updateCount: 14, summary: 'Iranian nuclear talks in Vienna have stalled after IAEA inspectors were denied access to the Fordow enrichment facility. Houthi forces launched a new wave of anti-ship missiles targeting commercial vessels in the Red Sea, prompting the US to deploy additional destroyers to the region. Saudi-Israeli normalization discussions continue behind closed doors despite public opposition from Palestinian Authority leadership.' },
    { name: 'ASIA', criticalCount: 2, updateCount: 11, summary: 'North Korea\'s dual ICBM test has prompted emergency consultations across the Indo-Pacific. Japan announced a supplementary defense budget of $4.2 billion for accelerated missile defense deployment. China conducted unannounced naval exercises near the Senkaku/Diaoyu Islands, drawing formal protests from Tokyo. Myanmar\'s resistance forces have captured a major junta-held city in Shan State.' },
    { name: 'AMERICAS', criticalCount: 1, updateCount: 8, summary: 'US-China tariff escalation dominates economic headlines as retaliatory measures threaten agricultural exports across the Midwest. Venezuela\'s political crisis deepened as opposition leader was placed under house arrest. Colombia\'s peace process with ELN guerrillas faces collapse after a series of ceasefire violations in Arauca department.' },
    { name: 'EUROPE', criticalCount: 2, updateCount: 12, summary: 'The eastern Mediterranean naval standoff between NATO allies Turkey and Greece has prompted emergency EU foreign ministers meeting. A coordinated ransomware attack across European hospitals highlights critical infrastructure vulnerabilities. Poland and the Baltic states have increased border security deployments following reports of hybrid warfare tactics along the Belarus border.' },
    { name: 'AFRICA', criticalCount: 2, updateCount: 9, summary: 'Sudan\'s humanitarian catastrophe worsens as the RSF offensive on El-Fasher intensifies. The UN has declared famine conditions in parts of Darfur. Sahel region instability continues as Mali\'s military government expands operations against jihadist groups without French support. Ethiopia\'s fragile Tigray peace agreement faces new tests as disarmament deadlines are missed.' },
  ],
  ramifications: 'The convergence of multiple crises creates compounding risks: energy market volatility from Middle Eastern tensions intersects with US-China trade disruption, while European infrastructure vulnerabilities are exploited amid NATO alliance strains. Humanitarian corridors in Sudan and Myanmar face simultaneous collapse. Global food security indicators have deteriorated to their worst levels since 2022.',
  sourceCount: 247,
  previousBriefs: [
    { date: 'March 16, 2026', summary: 'Focus on North Korea missile preparations, EU digital sovereignty debate, and Sudan ceasefire collapse. Markets volatile on tariff fears.' },
    { date: 'March 15, 2026', summary: 'Mediterranean tensions escalate after Greek-Turkish naval incident. Cyber threat levels elevated following hospital network probes. Oil markets weakening.' },
  ],
};

const DEMO_ELECTIONS: Election[] = [
  {
    id: 'el1', flag: '\u{1F1E8}\u{1F1F1}', country: 'Chile', date: 'Nov 2025', type: 'Presidential Election',
    winner: 'Evelyn Matthei (UDI)', winnerAlignment: 'right',
    summary: 'Center-right coalition secures presidency with promises of economic reform and tougher immigration policies. Runoff was decided by a narrow 52-48 margin.',
    profile: { flag: '\u{1F1E8}\u{1F1F1}', name: 'Chile', riskLevel: 'MODERATE', riskColor: '#f39c12', status: 'Post-election transition', region: 'South America', population: '19.5M', gdp: '$301B', leader: 'Evelyn Matthei (President-elect)',
      riskIndicators: [{ label: 'Political', value: 55, color: '#f39c12' }, { label: 'Economic', value: 40, color: '#27ae60' }, { label: 'Social', value: 60, color: '#e67e22' }, { label: 'Security', value: 35, color: '#27ae60' }],
      whatHappened: 'Chile completed its presidential election with center-right candidate Evelyn Matthei winning the runoff against leftist Gabriel Boric\'s preferred successor. Voter turnout reached 72%, the highest since compulsory voting was abolished.',
      whyItMatters: 'Chile\'s political pendulum swing from left to right signals regional trends across Latin America. The new government\'s approach to lithium nationalization policies will affect global battery supply chains. Constitutional reform process enters a new phase.',
      whatMightHappen: 'The new administration is expected to reverse several of the previous government\'s progressive policies, particularly around mining regulations and pension reform. Relations with China may cool as the new government signals closer alignment with Washington.',
      topStories: [{ title: 'Matthei outlines economic reform agenda in victory speech', url: '#' }, { title: 'Chile\'s lithium policy at crossroads under new government', url: '#' }],
      latestCoverage: [{ title: 'Latin American markets rally on Chile election results', url: '#' }, { title: 'Analysis: What Matthei\'s win means for LATAM geopolitics', url: '#' }],
    },
  },
  {
    id: 'el2', flag: '\u{1F1E9}\u{1F1EA}', country: 'Germany', date: 'Feb 2026', type: 'Federal Election',
    winner: 'Friedrich Merz (CDU/CSU)', winnerAlignment: 'center',
    summary: 'CDU/CSU returns to power with Friedrich Merz as Chancellor, forming a coalition with the SPD. AfD gains but fails to enter government.',
    profile: { flag: '\u{1F1E9}\u{1F1EA}', name: 'Germany', riskLevel: 'LOW', riskColor: '#27ae60', status: 'Coalition formed', region: 'Europe', population: '84.4M', gdp: '$4.3T', leader: 'Friedrich Merz (Chancellor)',
      riskIndicators: [{ label: 'Political', value: 35, color: '#27ae60' }, { label: 'Economic', value: 50, color: '#f39c12' }, { label: 'Social', value: 40, color: '#27ae60' }, { label: 'Security', value: 30, color: '#27ae60' }],
      whatHappened: 'Friedrich Merz led CDU/CSU to a decisive victory in Germany\'s federal elections, ending the fractious three-party coalition era. A grand coalition with SPD was formed within three weeks of the election.',
      whyItMatters: 'Germany\'s new government signals a more assertive European defense posture and pragmatic approach to energy policy. Industrial strategy prioritizes competitiveness over climate targets. EU leadership dynamics shift as Franco-German coordination resets.',
      whatMightHappen: 'Expect accelerated defense spending increases, potential revision of nuclear energy phase-out timeline, and tougher stance on immigration. Relations with China will emphasize "de-risking" rather than decoupling.',
      topStories: [{ title: 'Merz announces defense spending boost to 3% GDP', url: '#' }, { title: 'New German government outlines EU reform priorities', url: '#' }],
      latestCoverage: [{ title: 'German industry welcomes Merz\'s competitiveness agenda', url: '#' }],
    },
  },
  {
    id: 'el3', flag: '\u{1F1F0}\u{1F1F7}', country: 'South Korea', date: 'Jun 2027', type: 'Presidential Election',
    summary: 'Early campaigning begins as political polarization deepens following constitutional crisis. Both major parties face internal divisions.',
    profile: { flag: '\u{1F1F0}\u{1F1F7}', name: 'South Korea', riskLevel: 'ELEVATED', riskColor: '#e67e22', status: 'Pre-election period', region: 'East Asia', population: '51.7M', gdp: '$1.7T', leader: 'Han Duck-soo (Acting President)',
      riskIndicators: [{ label: 'Political', value: 75, color: '#e74c3c' }, { label: 'Economic', value: 45, color: '#f39c12' }, { label: 'Social', value: 55, color: '#f39c12' }, { label: 'Security', value: 65, color: '#e67e22' }],
      whatHappened: 'South Korea remains in political turmoil following the martial law crisis. The acting presidency has stabilized governance but deep political divisions persist. Early presidential campaigning has begun despite the election being over a year away.',
      whyItMatters: 'Political instability in South Korea directly impacts Indo-Pacific security architecture, semiconductor supply chains, and alliance structures. The outcome will shape Seoul\'s approach to North Korea, China relations, and the US alliance.',
      whatMightHappen: 'Expect intensifying political competition, potential constitutional reform proposals, and continued social polarization. Defense cooperation with Japan and the US may face disruptions depending on the political trajectory.',
      topStories: [{ title: 'South Korea\'s opposition outlines presidential platform', url: '#' }],
      latestCoverage: [{ title: 'Analysis: Can South Korea heal its political divide?', url: '#' }],
    },
  },
  {
    id: 'el4', flag: '\u{1F1E6}\u{1F1FA}', country: 'Australia', date: 'May 2028', type: 'Federal Election',
    summary: 'Labor government faces headwinds over housing affordability and energy transition costs. Coalition rebuilds under new opposition leader.',
    profile: { flag: '\u{1F1E6}\u{1F1FA}', name: 'Australia', riskLevel: 'LOW', riskColor: '#27ae60', status: 'Mid-term', region: 'Oceania', population: '26.5M', gdp: '$1.7T', leader: 'Anthony Albanese (PM)',
      riskIndicators: [{ label: 'Political', value: 30, color: '#27ae60' }, { label: 'Economic', value: 40, color: '#27ae60' }, { label: 'Social', value: 35, color: '#27ae60' }, { label: 'Security', value: 25, color: '#27ae60' }],
      whatHappened: 'Australia\'s political landscape is stable but the Labor government faces declining poll numbers over housing affordability and cost-of-living pressures. The AUKUS agreement continues to shape defense and industrial policy.',
      whyItMatters: 'Australia\'s strategic positioning between the US alliance and Chinese economic ties remains a key geopolitical variable. AUKUS submarine program progress and critical minerals policy have global implications.',
      whatMightHappen: 'Housing policy reforms and energy transition costs will dominate pre-election debate. Australia\'s role in Indo-Pacific security architecture continues to deepen regardless of government composition.',
      topStories: [{ title: 'AUKUS submarine program hits next milestone', url: '#' }],
      latestCoverage: [{ title: 'Australia navigates China trade reset', url: '#' }],
    },
  },
];

const DEMO_FORECASTS: ForecastCard[] = [
  {
    region: 'MIDDLE EAST', severity: 'CATASTROPHIC',
    summary: 'Multiple overlapping crises create highest regional instability index since 2011. Iranian nuclear program advances while Houthi maritime attacks persist. Israeli-Palestinian tensions remain at crisis levels with no diplomatic resolution in sight. Gulf states hedge security partnerships.',
    forecast: 'The probability of a direct military confrontation between Iran and Israel has risen to 35% within the next 90 days. Houthi attacks will continue to disrupt 15-20% of global shipping through the Red Sea. A nuclear deal breakthrough remains unlikely before year-end, increasing proliferation risks. Oil price volatility will intensify as regional instability compounds.',
    trends: [{ label: 'Total War', direction: 'up' }, { label: 'Oil Shock', direction: 'up' }, { label: 'Nuclear Deal', direction: 'down' }, { label: 'Diplomacy', direction: 'down' }],
  },
  {
    region: 'INDO-PACIFIC', severity: 'EXTREME',
    summary: 'North Korea\'s accelerated weapons program and China\'s military modernization create heightened deterrence challenges. Taiwan Strait remains the world\'s most dangerous flashpoint. AUKUS implementation reshapes regional security architecture.',
    forecast: 'Expect continued North Korean provocations through Q2 2026 as Pyongyang tests international resolve. Chinese military exercises near Taiwan will increase in frequency and scale. The risk of miscalculation in the South China Sea remains elevated at approximately 20% for a significant incident within six months. Alliance structures are strengthening but friction between partners persists.',
    trends: [{ label: 'Arms Race', direction: 'up' }, { label: 'Taiwan Crisis', direction: 'up' }, { label: 'Alliance Cohesion', direction: 'up' }, { label: 'Diplomatic Channels', direction: 'down' }],
  },
  {
    region: 'EUROPE', severity: 'SEVERE',
    summary: 'NATO alliance faces internal strains as Mediterranean disputes pit allies against each other. Cyber warfare threats to critical infrastructure are intensifying. Eastern European security concerns persist with ongoing hybrid warfare tactics. EU institutional reform debates accelerate.',
    forecast: 'The Greek-Turkish Mediterranean standoff has a 15% probability of escalating to a limited military exchange within 60 days. Critical infrastructure cyber attacks will increase by an estimated 40% through 2026. European defense spending will accelerate but capability gaps will persist for 3-5 years. EU strategic autonomy debates will intensify under German leadership.',
    trends: [{ label: 'NATO Strain', direction: 'up' }, { label: 'Cyber Threats', direction: 'up' }, { label: 'Defense Spending', direction: 'up' }, { label: 'Energy Security', direction: 'down' }],
  },
  {
    region: 'AFRICA', severity: 'EXTREME',
    summary: 'Sudan faces the world\'s worst humanitarian crisis. Sahel instability spreads as military governments consolidate power. Horn of Africa peace processes falter. Critical minerals competition intensifies across the continent.',
    forecast: 'Sudan\'s conflict will likely persist through 2026 with displacement exceeding 12 million. The Sahel security vacuum will expand, with jihadist groups exploiting governance gaps. Ethiopia\'s Tigray peace holds but is fragile. Competition for critical minerals will drive increased great power engagement, particularly from China, Russia, and the Gulf states.',
    trends: [{ label: 'Humanitarian Crisis', direction: 'up' }, { label: 'State Collapse', direction: 'up' }, { label: 'Resource Competition', direction: 'up' }, { label: 'Peacekeeping', direction: 'down' }],
  },
];

const DEMO_HORIZON: HorizonEvent[] = [
  { category: 'Summit', month: 'MAR', day: 20, relativeTime: 'in 3 days', title: 'EU Foreign Affairs Council - Emergency Session', location: 'Brussels, Belgium', description: 'Emergency meeting to address Mediterranean naval tensions and European cyber security threats.', monthGroup: 'MARCH 2026' },
  { category: 'Military', month: 'MAR', day: 24, relativeTime: 'in 7 days', title: 'NATO Steadfast Defender 2026 Exercise Begins', location: 'Northern Europe', description: 'Largest NATO exercise since Cold War with 90,000 troops across Scandinavia and the Baltic region.', monthGroup: 'MARCH 2026' },
  { category: 'Economic', month: 'MAR', day: 28, relativeTime: 'in 11 days', title: 'OPEC+ Extraordinary Ministerial Meeting', location: 'Vienna, Austria', description: 'Emergency session to address oil price decline and agree on production cut framework.', monthGroup: 'MARCH 2026' },
  { category: 'Election', month: 'APR', day: 6, relativeTime: 'in 20 days', title: 'Ecuador Presidential Election - First Round', location: 'Ecuador', description: 'Critical election amid security crisis and narco-violence. Security is the dominant campaign issue.', monthGroup: 'APRIL 2026' },
  { category: 'Treaty', month: 'APR', day: 15, relativeTime: 'in 29 days', title: 'NPT Review Conference Resumes', location: 'New York, USA', description: 'Nuclear Non-Proliferation Treaty review resumes amid heightened concerns over Iran and North Korea programs.', monthGroup: 'APRIL 2026' },
  { category: 'Sanctions', month: 'APR', day: 22, relativeTime: 'in 36 days', title: 'EU Sanctions Review - Russia 15th Package', location: 'Brussels, Belgium', description: 'EU reviews and potentially expands sanctions package targeting Russian energy sector and sanctions evasion networks.', monthGroup: 'APRIL 2026' },
  { category: 'Summit', month: 'MAY', day: 10, relativeTime: 'in 54 days', title: 'G7 Summit 2026', location: 'Hiroshima, Japan', description: 'Focus on Indo-Pacific security, AI governance, and global economic coordination amid trade tensions.', monthGroup: 'MAY 2026' },
  { category: 'Military', month: 'MAY', day: 18, relativeTime: 'in 62 days', title: 'Shangri-La Dialogue', location: 'Singapore', description: 'Key Asia-Pacific security forum. Expected confrontation between US and Chinese defense officials on Taiwan.', monthGroup: 'MAY 2026' },
];

const CATEGORY_COLORS: Record<string, string> = {
  Summit: '#8e44ad', Election: '#e74c3c', Treaty: '#16a085',
  Military: '#2c3e50', Economic: '#2980b9', Sanctions: '#d35400',
};

const DEMO_MARKETS: MarketCountry[] = [
  {
    flag: '\u{1F30D}', country: 'Global Commodities', open: true,
    indices: [
      { name: 'Brent Crude', value: '58.42', change: -4.21 },
      { name: 'WTI Crude', value: '55.18', change: -3.87 },
      { name: 'Gold', value: '2,284.50', change: 1.32 },
      { name: 'Silver', value: '28.94', change: -0.56 },
      { name: 'Natural Gas', value: '2.41', change: -2.15 },
    ],
  },
  {
    flag: '\u{1F1FA}\u{1F1F8}', country: 'United States', open: true,
    indices: [
      { name: 'S&P 500', value: '4,892.34', change: -2.84 },
      { name: 'Dow Jones', value: '38,127.45', change: -2.51 },
      { name: 'NASDAQ', value: '15,234.78', change: -3.42 },
      { name: 'Russell 2000', value: '1,987.23', change: -3.15 },
    ],
    analysis: 'US markets are under severe pressure from the escalating tariff war with China. Technology stocks are leading the decline as semiconductor export restrictions tighten. Defensive sectors (utilities, healthcare) showing relative strength. VIX has spiked to 32, indicating elevated fear.',
    outlook: 'Markets are likely to remain volatile through Q2 as tariff negotiations stall. A potential Fed rate cut in response to economic weakness could provide a floor. Watch for earnings guidance revisions in upcoming quarterly reports.',
  },
  {
    flag: '\u{1F1E8}\u{1F1F3}', country: 'China', open: false,
    indices: [
      { name: 'Shanghai Composite', value: '3,012.45', change: -1.87 },
      { name: 'Shenzhen Component', value: '9,876.32', change: -2.34 },
      { name: 'Hang Seng', value: '16,543.21', change: -2.91 },
      { name: 'CSI 300', value: '3,456.78', change: -2.12 },
    ],
    analysis: 'Chinese markets reflect deepening economic concerns amid the trade war escalation. Property sector continues to weigh on sentiment. Government stimulus measures have had limited impact. Foreign capital outflows are accelerating.',
    outlook: 'Beijing is expected to announce additional stimulus measures, potentially including rate cuts and targeted fiscal support. However, structural challenges in the property sector and demographic headwinds limit the upside potential.',
  },
  {
    flag: '\u{1F1EC}\u{1F1E7}', country: 'United Kingdom', open: true,
    indices: [
      { name: 'FTSE 100', value: '7,654.32', change: -1.23 },
      { name: 'FTSE 250', value: '18,432.10', change: -1.87 },
    ],
  },
  {
    flag: '\u{1F1EF}\u{1F1F5}', country: 'Japan', open: false,
    indices: [
      { name: 'Nikkei 225', value: '37,892.45', change: -2.65 },
      { name: 'TOPIX', value: '2,678.34', change: -2.31 },
    ],
  },
  {
    flag: '\u{1F1E9}\u{1F1EA}', country: 'Germany', open: true,
    indices: [
      { name: 'DAX', value: '17,234.56', change: -2.12 },
      { name: 'MDAX', value: '24,567.89', change: -2.45 },
    ],
  },
];

const DEMO_DANGER_ZONES: DangerZone[] = [
  {
    id: 'dz1', flag: '\u{1F1F8}\u{1F1E9}', name: 'Darfur Region', description: 'Active armed conflict, famine conditions, complete breakdown of civil order',
    country: 'Sudan', level: 5, region: 'North Africa',
    threatAssessment: 'Darfur is experiencing its worst violence since the 2003 genocide. The RSF offensive on El-Fasher threatens 800,000 displaced civilians. Artillery bombardment is indiscriminate. Medical facilities have been systematically destroyed. Famine conditions are confirmed in multiple areas. No functioning government services exist in most of the region.',
    whatsExpected: [{ label: 'Violence', direction: 'up' }, { label: 'Displacement', direction: 'up' }, { label: 'Aid Access', direction: 'down' }],
    countryOverview: 'Sudan has been engulfed in civil war since April 2023 between the Sudanese Armed Forces (SAF) and the Rapid Support Forces (RSF). The conflict has killed tens of thousands and displaced over 10 million people, creating the world\'s largest displacement crisis.',
    entryRequirements: 'All borders effectively closed. No functioning visa process. Khartoum airport destroyed. Entry only possible through humanitarian corridors with military escort.',
    healthAdvisories: 'Complete healthcare system collapse. Cholera outbreaks confirmed. No functioning hospitals in Darfur. Meningitis belt risk. Malaria endemic. No medical evacuation available.',
    otherRegions: [{ name: 'Khartoum', level: 5 }, { name: 'Blue Nile', level: 4 }, { name: 'Port Sudan', level: 3 }, { name: 'Northern State', level: 3 }],
    tips: { currency: 'Sudanese Pound (SDG) - hyperinflation, USD preferred', emergency: 'No functioning emergency services. UN OCHA: +41 22 917 1234', cultural: 'Conservative Islamic customs. Modest dress essential. Photography restrictions strictly enforced by all armed groups.', transport: 'No commercial flights. Road travel extremely dangerous. Movement only with armed escort and advance coordination with armed groups controlling territory.' },
  },
  {
    id: 'dz2', flag: '\u{1F1E6}\u{1F1EB}', name: 'Kabul & Eastern Provinces', description: 'Terrorism risk, ISIS-K attacks, arbitrary detention of foreigners',
    country: 'Afghanistan', level: 5, region: 'Central Asia',
    threatAssessment: 'Afghanistan under Taliban control presents extreme risks for all foreign nationals. ISIS-K conducts regular attacks in Kabul and eastern provinces. Arbitrary detention of foreigners has increased. No consular assistance available from Western nations. Women face severe movement and employment restrictions.',
    whatsExpected: [{ label: 'Terrorism', direction: 'up' }, { label: 'Stability', direction: 'down' }],
    countryOverview: 'Afghanistan is governed by the Taliban since August 2021. The humanitarian crisis continues with over 23 million people requiring assistance. The economy has contracted by 30% since the Taliban takeover.',
    entryRequirements: 'Taliban-issued visa required. No Western embassies operational. Land border crossings unpredictable. Kabul airport has limited commercial flights to regional destinations only.',
    healthAdvisories: 'Healthcare system severely degraded. Polio remains endemic. Limited medical supplies. No reliable medical evacuation.',
    otherRegions: [{ name: 'Kandahar', level: 5 }, { name: 'Helmand', level: 5 }, { name: 'Mazar-i-Sharif', level: 4 }, { name: 'Herat', level: 4 }],
    tips: { currency: 'Afghan Afghani (AFN) - USD widely accepted', emergency: 'No Western emergency services. ICRC: +93 20 230 1714', cultural: 'Strict Islamic law enforced. Women must be fully covered. Photography of military/security installations prohibited under penalty of detention.', transport: 'Kabul airport has limited flights. Road travel requires Taliban permission. Checkpoints are frequent and unpredictable.' },
  },
  {
    id: 'dz3', flag: '\u{1F1F2}\u{1F1F2}', name: 'Shan & Rakhine States', description: 'Civil war, ethnic cleansing, active military operations',
    country: 'Myanmar', level: 4, region: 'Southeast Asia',
    threatAssessment: 'Active civil war between military junta and resistance forces. Airstrikes target civilian areas. Landmine contamination is extensive. Communications blackouts are frequent. Journalists and aid workers have been targeted.',
    whatsExpected: [{ label: 'Conflict Intensity', direction: 'up' }, { label: 'Humanitarian Access', direction: 'down' }],
    countryOverview: 'Myanmar\'s military coup in February 2021 triggered a nationwide resistance movement. The conflict has displaced over 2.7 million people. The economy has been devastated.',
    entryRequirements: 'Visa required. Many border crossings closed. Internal travel severely restricted by both junta and resistance forces.',
    healthAdvisories: 'Healthcare system fragmented. Malaria risk in border areas. Limited medical facilities outside Yangon.',
    otherRegions: [{ name: 'Sagaing', level: 5 }, { name: 'Chin State', level: 4 }, { name: 'Yangon', level: 3 }, { name: 'Mandalay', level: 3 }],
    tips: { currency: 'Myanmar Kyat (MMK) - cash economy, ATMs unreliable', emergency: 'Emergency services non-functional in conflict zones. ICRC Myanmar: +95 1 383 894', cultural: 'Buddhist customs predominant. Shoes must be removed at temples. Avoid political discussions.', transport: 'Domestic flights limited. Road travel dangerous outside major cities. Military checkpoints frequent.' },
  },
  {
    id: 'dz4', flag: '\u{1F1F1}\u{1F1FE}', name: 'Tripolitania & Fezzan', description: 'Militia warfare, kidnapping risk, migrant crisis',
    country: 'Libya', level: 4, region: 'North Africa',
    threatAssessment: 'Libya remains divided between rival governments. Militia groups control territory and engage in sporadic fighting. Kidnapping of foreigners for ransom is a significant risk. The migrant detention system involves severe human rights abuses.',
    whatsExpected: [{ label: 'Militia Conflict', direction: 'up' }, { label: 'Unification', direction: 'down' }],
    countryOverview: 'Libya has been in a state of civil conflict since 2011. Rival administrations in Tripoli and Benghazi compete for legitimacy. Oil production is frequently disrupted by armed groups.',
    entryRequirements: 'Visa required. Tripoli Mitiga airport has limited flights. Land borders dangerous. Travel requires armed escort.',
    healthAdvisories: 'Healthcare degraded. Water quality issues. Heat-related illness risk. Limited trauma care.',
    otherRegions: [{ name: 'Benghazi', level: 3 }, { name: 'Misrata', level: 3 }, { name: 'Sabha', level: 4 }],
    tips: { currency: 'Libyan Dinar (LYD) - dual exchange rate system', emergency: 'Limited emergency services. UN UNSMIL: +218 21 340 1144', cultural: 'Conservative Islamic society. Alcohol prohibited. Modest dress required.', transport: 'Internal flights unreliable. Road travel requires security arrangements. Checkpoints controlled by various militia groups.' },
  },
  {
    id: 'dz5', flag: '\u{1F1ED}\u{1F1F9}', name: 'Port-au-Prince Metropolitan Area', description: 'Gang warfare, kidnapping, state collapse',
    country: 'Haiti', level: 4, region: 'Caribbean',
    threatAssessment: 'Port-au-Prince is largely controlled by armed gangs. Kidnapping is widespread and targets all demographics. The government has minimal control outside the national palace area. The Multinational Security Support mission has had limited impact on gang territorial control.',
    whatsExpected: [{ label: 'Gang Violence', direction: 'up' }, { label: 'State Capacity', direction: 'down' }],
    countryOverview: 'Haiti faces a multidimensional crisis of gang violence, political vacuum, and humanitarian emergency. Over 5 million Haitians face acute food insecurity. The health system is near collapse.',
    entryRequirements: 'Passport required, visa on arrival available but not recommended. Port-au-Prince airport intermittently operational. No reliable land crossing from Dominican Republic.',
    healthAdvisories: 'Cholera outbreaks. Hospitals overwhelmed. No reliable emergency medical services. Dengue and malaria risk.',
    otherRegions: [{ name: 'Artibonite', level: 3 }, { name: 'Cap-Haitien', level: 3 }, { name: 'Les Cayes', level: 3 }],
    tips: { currency: 'Haitian Gourde (HTG) - USD widely accepted', emergency: 'Police largely non-functional. UN BINUH: +509 2812 0707', cultural: 'Creole and French spoken. Voodoo is a recognized religion. Community-level trust networks are critical.', transport: 'No reliable public transit. Private vehicles with security escort only. Many roads controlled by gang checkpoints.' },
  },
];

const TAB_IDS = ['events', 'brief', 'elections', 'forecast', 'horizon', 'stocks', 'travel'] as const;
type TabId = typeof TAB_IDS[number];
const TAB_LABELS: Record<TabId, string> = {
  events: 'Events', brief: 'Brief', elections: 'Elections',
  forecast: 'Forecast', horizon: 'Horizon', stocks: 'Stocks', travel: 'Travel',
};

// ─── Panel class ────────────────────────────────────────────────────

export class HegemonPanel extends Panel {
  private activeTab: TabId = 'events';
  private fontSize = 13;
  private latestUpdateLimit = 3;
  private activeHorizonFilter: string | null = null;
  private travelDetailZone: DangerZone | null = null;

  constructor() {
    super({
      id: 'hegemon',
      title: 'HEGEMON',
      className: 'panel-wide',
      closable: true,
      defaultRowSpan: 2,
    });
    injectStyles();
    this.hideLoading();
    this.render();

    // Event delegation on content
    this.content.addEventListener('click', (e) => this.handleContentClick(e));
  }

  private hideLoading(): void {
    this.content.innerHTML = '';
  }

  // ─── Render root ────────────────────────────────────────────────

  private render(): void {
    const root = h('div', { className: 'hegemon-root' });

    // Toolbar: tabs + font controls
    const toolbar = h('div', { className: 'hegemon-toolbar' });
    const tabsWrap = h('div', { className: 'hegemon-tabs' });
    for (const id of TAB_IDS) {
      const btn = h('button', {
        className: `hegemon-tab${id === this.activeTab ? ' active' : ''}`,
        dataset: { hegemonTab: id },
      }, TAB_LABELS[id]);
      tabsWrap.appendChild(btn);
    }
    toolbar.appendChild(tabsWrap);

    const fontControls = h('div', { className: 'hegemon-font-controls' });
    fontControls.appendChild(h('button', { className: 'hegemon-font-btn', dataset: { hegemonFont: 'decrease' } }, 'A\u2212'));
    fontControls.appendChild(h('button', { className: 'hegemon-font-btn', dataset: { hegemonFont: 'increase' } }, 'A+'));
    toolbar.appendChild(fontControls);

    root.appendChild(toolbar);

    // Body
    const body = h('div', { className: 'hegemon-body', style: { fontSize: `${this.fontSize}px` } });
    this.renderTabContent(body);
    root.appendChild(body);

    replaceChildren(this.content, root);
  }

  private renderTabContent(body: HTMLElement): void {
    switch (this.activeTab) {
      case 'events': this.renderEvents(body); break;
      case 'brief': this.renderBrief(body); break;
      case 'elections': this.renderElections(body); break;
      case 'forecast': this.renderForecast(body); break;
      case 'horizon': this.renderHorizon(body); break;
      case 'stocks': this.renderStocks(body); break;
      case 'travel': this.renderTravel(body); break;
    }
  }

  // ─── Tab 1: Events ──────────────────────────────────────────────

  private renderEvents(body: HTMLElement): void {
    body.appendChild(h('div', { className: 'hegemon-section-title' }, 'TOP STORIES'));

    for (const story of DEMO_TOP_STORIES) {
      const meta = h('div', { className: 'hegemon-card-meta' });
      for (const cat of story.categories) {
        meta.appendChild(h('span', { className: `hegemon-badge hegemon-badge-${cat.toLowerCase()}` }, escapeHtml(cat)));
      }
      meta.appendChild(h('span', null, escapeHtml(story.timeAgo)));

      const pills = h('div', { className: 'hegemon-pills' });
      for (const p of story.pills) {
        pills.appendChild(h('span', { className: 'hegemon-pill' }, escapeHtml(p)));
      }

      const card = h('div', { className: 'hegemon-card', dataset: { hegemonStory: story.id } },
        meta,
        h('div', { className: 'hegemon-card-title' }, escapeHtml(story.title)),
        pills,
        h('div', { className: 'hegemon-card-update' }, escapeHtml(story.latestUpdate)),
      );
      body.appendChild(card);
    }

    body.appendChild(h('div', { className: 'hegemon-section-title' }, 'LATEST UPDATES'));

    const visibleUpdates = DEMO_LATEST_UPDATES.slice(0, this.latestUpdateLimit);
    for (const upd of visibleUpdates) {
      const meta = h('div', { className: 'hegemon-card-meta' });
      meta.appendChild(h('span', { className: `hegemon-badge hegemon-badge-${upd.category.toLowerCase()}` }, escapeHtml(upd.category)));
      meta.appendChild(h('span', null, `${upd.sourceCount} sources`));
      meta.appendChild(h('span', null, escapeHtml(upd.timeAgo)));

      const card = h('div', { className: 'hegemon-card', dataset: { hegemonUpdate: upd.id } },
        meta,
        h('div', { className: 'hegemon-card-title' }, escapeHtml(upd.headline)),
        h('div', { className: 'hegemon-card-summary' }, escapeHtml(upd.snippet)),
      );
      body.appendChild(card);
    }

    if (this.latestUpdateLimit < DEMO_LATEST_UPDATES.length) {
      body.appendChild(h('button', { className: 'hegemon-load-more', dataset: { hegemonAction: 'loadMore' } }, 'LOAD MORE'));
    }
  }

  // ─── Tab 2: Brief ───────────────────────────────────────────────

  private renderBrief(body: HTMLElement): void {
    const header = h('div', { className: 'hegemon-brief-header' });
    header.appendChild(h('div', { className: 'hegemon-card-title', style: { marginBottom: '0' } }, 'DAILY INTELLIGENCE BRIEFING'));
    header.appendChild(h('span', { className: 'hegemon-badge hegemon-badge-live' }, 'LIVE'));
    header.appendChild(h('span', { className: 'hegemon-brief-date' }, escapeHtml(DEMO_BRIEF.date)));
    body.appendChild(header);

    for (const region of DEMO_BRIEF.regions) {
      const block = h('div', { className: 'hegemon-region-block' });
      const rHeader = h('div', { className: 'hegemon-region-header' });
      rHeader.appendChild(h('span', { className: 'hegemon-region-name' }, escapeHtml(region.name)));
      rHeader.appendChild(h('span', { className: 'hegemon-badge hegemon-badge-breaking' }, `${region.criticalCount} critical`));
      rHeader.appendChild(h('span', { className: 'hegemon-region-counts' }, `${region.updateCount} updates`));
      block.appendChild(rHeader);
      block.appendChild(h('div', { className: 'hegemon-region-body' }, escapeHtml(region.summary)));
      body.appendChild(block);
    }

    body.appendChild(h('div', { className: 'hegemon-section-title' }, 'GLOBAL RAMIFICATIONS'));
    body.appendChild(h('div', { className: 'hegemon-region-body', style: { marginBottom: '14px' } }, escapeHtml(DEMO_BRIEF.ramifications)));

    body.appendChild(h('div', { className: 'hegemon-section-title' }, 'PREVIOUS BRIEFINGS'));

    for (const prev of DEMO_BRIEF.previousBriefs) {
      const hdr = h('div', {
        className: 'hegemon-collapsible-header',
        dataset: { hegemonCollapse: prev.date },
      },
        h('span', { className: 'hegemon-collapsible-arrow' }, '\u25B6'),
        h('span', null, escapeHtml(prev.date)),
      );
      const collBody = h('div', { className: 'hegemon-collapsible-body', dataset: { hegemonCollapseBody: prev.date } });
      collBody.appendChild(h('div', { className: 'hegemon-region-body' }, escapeHtml(prev.summary)));
      body.appendChild(hdr);
      body.appendChild(collBody);
    }

    body.appendChild(h('div', { className: 'hegemon-footer-note' }, `Compiled from ${DEMO_BRIEF.sourceCount} sources`));
  }

  // ─── Tab 3: Elections ───────────────────────────────────────────

  private renderElections(body: HTMLElement): void {
    const recent = DEMO_ELECTIONS.filter(e => e.winner);
    const upcoming = DEMO_ELECTIONS.filter(e => !e.winner);

    if (recent.length) {
      body.appendChild(h('div', { className: 'hegemon-section-title' }, 'RECENT RESULTS'));
      for (const el of recent) {
        const winnerClass = el.winnerAlignment === 'left' ? 'hegemon-winner-left' : el.winnerAlignment === 'right' ? 'hegemon-winner-right' : 'hegemon-winner-center';
        const card = h('div', { className: 'hegemon-election-card', dataset: { hegemonElection: el.id } },
          h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '4px' } },
            h('span', { className: 'hegemon-election-flag' }, el.flag),
            h('span', { className: 'hegemon-election-country' }, escapeHtml(el.country)),
            h('span', { className: 'hegemon-election-date' }, escapeHtml(el.date)),
          ),
          h('div', { className: 'hegemon-election-type' }, escapeHtml(el.type)),
          h('div', { className: `hegemon-election-winner ${winnerClass}` }, `Winner: ${escapeHtml(el.winner!)}`),
          h('div', { className: 'hegemon-card-summary' }, escapeHtml(el.summary)),
        );
        body.appendChild(card);
      }
    }

    if (upcoming.length) {
      body.appendChild(h('div', { className: 'hegemon-section-title' }, 'UPCOMING ELECTIONS'));
      for (const el of upcoming) {
        const card = h('div', { className: 'hegemon-election-card', dataset: { hegemonElection: el.id } },
          h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: '4px' } },
            h('span', { className: 'hegemon-election-flag' }, el.flag),
            h('span', { className: 'hegemon-election-country' }, escapeHtml(el.country)),
            h('span', { className: 'hegemon-election-date' }, escapeHtml(el.date)),
          ),
          h('div', { className: 'hegemon-election-type' }, escapeHtml(el.type)),
          h('div', { className: 'hegemon-card-summary' }, escapeHtml(el.summary)),
        );
        body.appendChild(card);
      }
    }
  }

  // ─── Tab 4: Forecast ────────────────────────────────────────────

  private renderForecast(body: HTMLElement): void {
    body.appendChild(h('div', { className: 'hegemon-section-title' }, 'GEOPOLITICAL FORECASTS'));

    for (const fc of DEMO_FORECASTS) {
      const card = h('div', { className: 'hegemon-forecast-card' });
      const header = h('div', { className: 'hegemon-forecast-header' });
      header.appendChild(h('span', { className: 'hegemon-forecast-region' }, escapeHtml(fc.region)));
      header.appendChild(h('span', { className: `hegemon-badge hegemon-badge-${fc.severity.toLowerCase()}` }, escapeHtml(fc.severity)));
      card.appendChild(header);

      card.appendChild(h('div', { className: 'hegemon-forecast-body' }, escapeHtml(fc.summary)));

      const analysisBlock = h('div', { className: 'hegemon-forecast-analysis' });
      analysisBlock.appendChild(h('strong', null, 'FORECAST: '));
      analysisBlock.appendChild(document.createTextNode(escapeHtml(fc.forecast)));
      card.appendChild(analysisBlock);

      const tags = h('div', { className: 'hegemon-trend-tags' });
      for (const tr of fc.trends) {
        const arrow = tr.direction === 'up' ? '\u2191' : '\u2193';
        const cls = tr.direction === 'up' ? 'hegemon-trend-up' : 'hegemon-trend-down';
        tags.appendChild(h('span', { className: `hegemon-trend-tag ${cls}` }, `${arrow} ${escapeHtml(tr.label)}`));
      }
      card.appendChild(tags);
      body.appendChild(card);
    }
  }

  // ─── Tab 5: Horizon ─────────────────────────────────────────────

  private renderHorizon(body: HTMLElement): void {
    body.appendChild(h('div', { className: 'hegemon-section-title' }, `LOOKING AHEAD \u00B7 ${DEMO_HORIZON.length} events`));

    // Category filters
    const filters = h('div', { className: 'hegemon-filters' });
    const categories = [...new Set(DEMO_HORIZON.map(e => e.category))];
    for (const cat of categories) {
      const active = this.activeHorizonFilter === cat;
      const pill = h('button', {
        className: `hegemon-filter-pill${active ? ' active' : ''}`,
        dataset: { hegemonHorizonFilter: cat },
      },
        h('span', { className: 'hegemon-filter-dot', style: { backgroundColor: CATEGORY_COLORS[cat] || '#888' } }),
        escapeHtml(cat),
      );
      filters.appendChild(pill);
    }
    if (this.activeHorizonFilter) {
      filters.appendChild(h('button', {
        className: 'hegemon-filter-pill',
        dataset: { hegemonHorizonFilter: '__clear' },
      }, 'Clear'));
    }
    body.appendChild(filters);

    // Filter events
    const events = this.activeHorizonFilter
      ? DEMO_HORIZON.filter(e => e.category === this.activeHorizonFilter)
      : DEMO_HORIZON;

    // Group by month
    const groups = new Map<string, HorizonEvent[]>();
    for (const ev of events) {
      const arr = groups.get(ev.monthGroup) || [];
      arr.push(ev);
      groups.set(ev.monthGroup, arr);
    }

    for (const [monthLabel, evts] of groups) {
      body.appendChild(h('div', { className: 'hegemon-month-header' }, escapeHtml(monthLabel)));
      for (const ev of evts) {
        const card = h('div', { className: 'hegemon-horizon-card' },
          h('div', { className: 'hegemon-horizon-date' },
            h('div', { className: 'hegemon-horizon-month' }, escapeHtml(ev.month)),
            h('div', { className: 'hegemon-horizon-day' }, String(ev.day)),
            h('div', { className: 'hegemon-horizon-rel' }, escapeHtml(ev.relativeTime)),
          ),
          h('div', { className: 'hegemon-horizon-info' },
            h('div', { className: 'hegemon-horizon-title' }, escapeHtml(ev.title)),
            h('div', { className: 'hegemon-horizon-loc' }, escapeHtml(ev.location)),
            h('div', { className: 'hegemon-horizon-desc' }, escapeHtml(ev.description)),
          ),
        );
        body.appendChild(card);
      }
    }
  }

  // ─── Tab 6: Stocks ──────────────────────────────────────────────

  private renderStocks(body: HTMLElement): void {
    const header = h('div', { className: 'hegemon-market-header' });
    header.appendChild(h('div', { className: 'hegemon-section-title', style: { margin: '0' } }, 'GLOBAL MARKETS'));
    header.appendChild(h('div', { className: 'hegemon-market-note' }, 'Live data via Yahoo Finance \u00B7 Updated 2m ago'));
    body.appendChild(header);

    for (const mkt of DEMO_MARKETS) {
      const section = h('div', { className: 'hegemon-market-section', dataset: { hegemonMarket: mkt.country } });

      const countryRow = h('div', { className: 'hegemon-market-country' });
      countryRow.appendChild(h('span', { className: 'hegemon-market-flag' }, mkt.flag));
      countryRow.appendChild(h('span', { className: 'hegemon-market-name' }, escapeHtml(mkt.country)));
      const statusCls = mkt.open ? 'hegemon-market-open' : 'hegemon-market-closed';
      countryRow.appendChild(h('span', { className: `hegemon-market-status ${statusCls}` }, mkt.open ? 'Open' : 'Closed'));
      section.appendChild(countryRow);

      for (const idx of mkt.indices) {
        const changeCls = idx.change >= 0 ? 'hegemon-change-pos' : 'hegemon-change-neg';
        const changeStr = (idx.change >= 0 ? '+' : '') + idx.change.toFixed(2) + '%';
        const row = h('div', { className: 'hegemon-index-row' },
          h('span', { className: 'hegemon-index-name' }, escapeHtml(idx.name)),
          h('span', { className: 'hegemon-index-value' }, escapeHtml(idx.value)),
          h('span', { className: `hegemon-index-change ${changeCls}` }, changeStr),
        );
        section.appendChild(row);
      }
      body.appendChild(section);
    }
  }

  // ─── Tab 7: Travel ──────────────────────────────────────────────

  private renderTravel(body: HTMLElement): void {
    if (this.travelDetailZone) {
      this.renderTravelDetail(body, this.travelDetailZone);
      return;
    }

    body.appendChild(h('div', { className: 'hegemon-section-title' }, 'TRAVEL ADVISORY'));
    body.appendChild(h('div', { style: { fontSize: '10px', color: 'var(--text-secondary, #666)', marginBottom: '10px', fontStyle: 'italic' } }, 'Powered by live intelligence feeds'));

    // Search
    const searchRow = h('div', { className: 'hegemon-search-row' });
    searchRow.appendChild(h('input', { className: 'hegemon-search-input', placeholder: 'Search country, region, or city...' }));
    body.appendChild(searchRow);

    // Dates
    const dateRow = h('div', { className: 'hegemon-date-row' });
    const depField = h('div', { className: 'hegemon-date-field' });
    depField.appendChild(h('div', { className: 'hegemon-date-label' }, 'Departure'));
    depField.appendChild(h('input', { className: 'hegemon-date-input', type: 'date' }));
    const retField = h('div', { className: 'hegemon-date-field' });
    retField.appendChild(h('div', { className: 'hegemon-date-label' }, 'Return'));
    retField.appendChild(h('input', { className: 'hegemon-date-input', type: 'date' }));
    dateRow.appendChild(depField);
    dateRow.appendChild(retField);
    body.appendChild(dateRow);

    // Danger zones
    body.appendChild(h('div', { className: 'hegemon-danger-title' }, 'DANGER ZONES'));

    for (const zone of DEMO_DANGER_ZONES) {
      const lvlCls = `hegemon-lvl-${Math.min(zone.level, 5)}`;
      const card = h('div', { className: 'hegemon-danger-card', dataset: { hegemonZone: zone.id } },
        h('span', { style: { fontSize: '20px', flexShrink: '0' } }, zone.flag),
        h('div', { className: 'hegemon-danger-info' },
          h('div', { className: 'hegemon-danger-name' }, escapeHtml(zone.name)),
          h('div', { className: 'hegemon-danger-desc' }, escapeHtml(zone.description)),
          h('div', { className: 'hegemon-danger-country' }, escapeHtml(zone.country)),
        ),
        h('span', { className: `hegemon-level-badge ${lvlCls}` }, `LVL ${zone.level}`),
      );
      body.appendChild(card);
    }
  }

  private renderTravelDetail(body: HTMLElement, zone: DangerZone): void {
    body.appendChild(h('button', { className: 'hegemon-back-btn', dataset: { hegemonAction: 'travelBack' } }, '\u2190 Back to alerts'));

    // Header
    const header = h('div', { className: 'hegemon-detail-header' });
    header.appendChild(h('span', { className: 'hegemon-detail-flag' }, zone.flag));
    header.appendChild(h('span', { className: 'hegemon-detail-name' }, escapeHtml(zone.name)));
    header.appendChild(h('span', { className: 'hegemon-detail-region' }, escapeHtml(zone.region)));
    const lvlCls = `hegemon-lvl-${Math.min(zone.level, 5)}`;
    header.appendChild(h('span', { className: `hegemon-level-badge ${lvlCls}` }, `LEVEL ${zone.level}`));
    body.appendChild(header);

    if (zone.level >= 4) {
      body.appendChild(h('div', { className: 'hegemon-warning-banner' }, 'DO NOT TRAVEL'));
    }

    // Threat Assessment
    const threatSection = h('div', { className: 'hegemon-detail-section' });
    threatSection.appendChild(h('div', { className: 'hegemon-detail-section-title' }, 'THREAT ASSESSMENT'));
    threatSection.appendChild(h('div', { className: 'hegemon-detail-body' }, escapeHtml(zone.threatAssessment)));
    body.appendChild(threatSection);

    // What's Expected
    const expectedSection = h('div', { className: 'hegemon-detail-section' });
    expectedSection.appendChild(h('div', { className: 'hegemon-detail-section-title' }, "WHAT'S EXPECTED"));
    const expectedTags = h('div', { className: 'hegemon-trend-tags' });
    for (const tr of zone.whatsExpected) {
      const arrow = tr.direction === 'up' ? '\u2191' : '\u2193';
      const cls = tr.direction === 'up' ? 'hegemon-trend-up' : 'hegemon-trend-down';
      expectedTags.appendChild(h('span', { className: `hegemon-trend-tag ${cls}` }, `${arrow} ${escapeHtml(tr.label)}`));
    }
    expectedSection.appendChild(expectedTags);
    body.appendChild(expectedSection);

    // Country Overview
    const overviewSection = h('div', { className: 'hegemon-detail-section' });
    overviewSection.appendChild(h('div', { className: 'hegemon-detail-section-title' }, 'COUNTRY OVERVIEW'));
    overviewSection.appendChild(h('div', { className: 'hegemon-detail-body' }, escapeHtml(zone.countryOverview)));
    body.appendChild(overviewSection);

    // Entry Requirements
    const entrySection = h('div', { className: 'hegemon-detail-section' });
    entrySection.appendChild(h('div', { className: 'hegemon-detail-section-title' }, 'ENTRY REQUIREMENTS'));
    entrySection.appendChild(h('div', { className: 'hegemon-detail-body' }, escapeHtml(zone.entryRequirements)));
    body.appendChild(entrySection);

    // Health Advisories
    const healthSection = h('div', { className: 'hegemon-detail-section' });
    healthSection.appendChild(h('div', { className: 'hegemon-detail-section-title' }, 'HEALTH ADVISORIES'));
    healthSection.appendChild(h('div', { className: 'hegemon-detail-body' }, escapeHtml(zone.healthAdvisories)));
    body.appendChild(healthSection);

    // Other Regions
    const otherSection = h('div', { className: 'hegemon-detail-section' });
    otherSection.appendChild(h('div', { className: 'hegemon-detail-section-title' }, 'OTHER REGIONS'));
    const regionList = h('ul', { className: 'hegemon-other-regions' });
    for (const r of zone.otherRegions) {
      const rLvlCls = `hegemon-lvl-${Math.min(r.level, 5)}`;
      regionList.appendChild(h('li', null,
        h('span', null, escapeHtml(r.name)),
        h('span', { className: `hegemon-level-badge ${rLvlCls}` }, `LVL ${r.level}`),
      ));
    }
    otherSection.appendChild(regionList);
    body.appendChild(otherSection);

    // Local Tips
    const tipsSection = h('div', { className: 'hegemon-detail-section' });
    tipsSection.appendChild(h('div', { className: 'hegemon-detail-section-title' }, 'LOCAL TIPS'));
    const tipsGrid = h('div', { className: 'hegemon-tips-grid' });
    const tipEntries: [string, string][] = [
      ['Currency', zone.tips.currency],
      ['Emergency', zone.tips.emergency],
      ['Cultural Notes', zone.tips.cultural],
      ['Transport', zone.tips.transport],
    ];
    for (const [title, value] of tipEntries) {
      tipsGrid.appendChild(h('div', { className: 'hegemon-tip-card' },
        h('div', { className: 'hegemon-tip-title' }, title),
        h('div', { className: 'hegemon-tip-value' }, escapeHtml(value)),
      ));
    }
    tipsSection.appendChild(tipsGrid);
    body.appendChild(tipsSection);
  }

  // ─── Modal helpers ──────────────────────────────────────────────

  private openModal(content: HTMLElement): void {
    this.closeModal();
    const overlay = h('div', { className: 'hegemon-modal-overlay' });
    const modal = h('div', { className: 'hegemon-modal' });
    const closeBtn = h('button', { className: 'hegemon-modal-close' }, '\u00D7');
    closeBtn.addEventListener('click', () => this.closeModal());
    modal.appendChild(closeBtn);
    modal.appendChild(content);
    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeModal();
    });
    document.body.appendChild(overlay);
  }

  private closeModal(): void {
    const existing = document.querySelector('.hegemon-modal-overlay');
    if (existing) existing.remove();
  }

  // ─── Story modal ───────────────────────────────────────────────

  private openStoryModal(story: TopStory): void {
    const content = h('div');

    // Header badges
    const meta = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' } });
    for (const cat of story.categories) {
      meta.appendChild(h('span', { className: `hegemon-badge hegemon-badge-${cat.toLowerCase()}` }, escapeHtml(cat)));
    }
    meta.appendChild(h('span', { style: { fontSize: '11px', color: 'var(--text-secondary, #888)' } }, escapeHtml(story.timeAgo)));
    content.appendChild(meta);

    content.appendChild(h('div', { className: 'hegemon-modal-title' }, escapeHtml(story.title)));

    // Intelligence Summary
    const summarySection = h('div', { className: 'hegemon-modal-section' });
    summarySection.appendChild(h('div', { className: 'hegemon-modal-section-title' }, 'Intelligence Summary'));
    const summaryBody = h('div', { className: 'hegemon-modal-body' });
    summaryBody.appendChild(h('p', null, h('strong', null, 'What happened: '), escapeHtml(story.summary.whatHappened)));
    summaryBody.appendChild(h('p', null, h('strong', null, 'Why it matters: '), escapeHtml(story.summary.whyItMatters)));
    summaryBody.appendChild(h('p', null, h('strong', null, 'Outlook: '), escapeHtml(story.summary.outlook)));
    summarySection.appendChild(summaryBody);
    content.appendChild(summarySection);

    // Live Timeline
    const timelineSection = h('div', { className: 'hegemon-modal-section' });
    timelineSection.appendChild(h('div', { className: 'hegemon-modal-section-title' }, 'Live Timeline'));
    const timeline = h('div', { className: 'hegemon-timeline' });
    for (const entry of story.timeline) {
      timeline.appendChild(h('div', { className: 'hegemon-timeline-entry' },
        h('div', { className: 'hegemon-timeline-time' }, escapeHtml(entry.time)),
        h('div', { className: 'hegemon-timeline-text' }, escapeHtml(entry.text)),
      ));
    }
    timelineSection.appendChild(timeline);
    content.appendChild(timelineSection);

    this.openModal(content);
  }

  // ─── Update modal ──────────────────────────────────────────────

  private openUpdateModal(upd: LatestUpdate): void {
    const content = h('div');

    const meta = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px', alignItems: 'center' } });
    meta.appendChild(h('span', { className: `hegemon-badge hegemon-badge-${upd.category.toLowerCase()}` }, escapeHtml(upd.category)));
    meta.appendChild(h('span', { style: { fontSize: '11px', color: 'var(--text-secondary, #888)' } }, `${upd.sourceCount} sources \u00B7 ${escapeHtml(upd.timeAgo)}`));
    content.appendChild(meta);

    content.appendChild(h('div', { className: 'hegemon-modal-title' }, escapeHtml(upd.headline)));

    // Intelligence Summary
    const summarySection = h('div', { className: 'hegemon-modal-section' });
    summarySection.appendChild(h('div', { className: 'hegemon-modal-section-title' }, 'Intelligence Summary'));
    const summaryBody = h('div', { className: 'hegemon-modal-body' });
    summaryBody.appendChild(h('p', null, h('strong', null, 'What happened: '), escapeHtml(upd.summary.whatHappened)));
    summaryBody.appendChild(h('p', null, h('strong', null, 'Why it matters: '), escapeHtml(upd.summary.whyItMatters)));
    summarySection.appendChild(summaryBody);
    content.appendChild(summarySection);

    // Sources
    const sourcesSection = h('div', { className: 'hegemon-modal-section' });
    sourcesSection.appendChild(h('div', { className: 'hegemon-modal-section-title' }, 'Sources'));
    const sourcesList = h('ul', { className: 'hegemon-sources' });
    for (const src of upd.sources) {
      const li = h('li', null);
      li.appendChild(h('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer' }, escapeHtml(src.name)));
      sourcesList.appendChild(li);
    }
    sourcesSection.appendChild(sourcesList);
    content.appendChild(sourcesSection);

    this.openModal(content);
  }

  // ─── Election / Country profile modal ──────────────────────────

  private openElectionModal(election: Election): void {
    const profile = election.profile;
    const content = h('div');

    // Country header
    const countryHeader = h('div', { className: 'hegemon-country-header' });
    countryHeader.appendChild(h('span', { className: 'hegemon-country-flag' }, profile.flag));
    countryHeader.appendChild(h('span', { className: 'hegemon-country-name' }, escapeHtml(profile.name)));
    countryHeader.appendChild(h('span', { className: 'hegemon-badge', style: { backgroundColor: profile.riskColor, color: '#fff' } }, escapeHtml(profile.riskLevel)));
    countryHeader.appendChild(h('span', { style: { fontSize: '11px', color: 'var(--text-secondary, #888)' } }, escapeHtml(profile.status)));
    content.appendChild(countryHeader);

    // Info grid
    const infoGrid = h('div', { className: 'hegemon-info-grid' });
    const infoItems: [string, string][] = [
      ['Region', profile.region],
      ['Population', profile.population],
      ['GDP', profile.gdp],
      ['Leader', profile.leader],
    ];
    for (const [label, value] of infoItems) {
      infoGrid.appendChild(h('div', { className: 'hegemon-info-item' },
        h('span', null, `${label}: `),
        h('span', { className: 'hegemon-info-value' }, escapeHtml(value)),
      ));
    }
    content.appendChild(infoGrid);

    // Risk Trend & Indicators
    const riskSection = h('div', { className: 'hegemon-modal-section' });
    riskSection.appendChild(h('div', { className: 'hegemon-modal-section-title' }, 'Risk Trend & Indicators'));
    const riskBars = h('div', { className: 'hegemon-risk-bars' });
    for (const ind of profile.riskIndicators) {
      riskBars.appendChild(h('div', { className: 'hegemon-risk-row' },
        h('span', { className: 'hegemon-risk-label' }, escapeHtml(ind.label)),
        h('div', { className: 'hegemon-risk-bar' },
          h('div', { className: 'hegemon-risk-fill', style: { width: `${ind.value}%`, backgroundColor: ind.color } }),
        ),
        h('span', { className: 'hegemon-risk-val' }, `${ind.value}`),
      ));
    }
    riskSection.appendChild(riskBars);
    content.appendChild(riskSection);

    // Situation Analysis
    const analysisSection = h('div', { className: 'hegemon-modal-section' });
    analysisSection.appendChild(h('div', { className: 'hegemon-modal-section-title' }, 'Situation Analysis'));

    const analysisItems: [string, string][] = [
      ['What Happened', profile.whatHappened],
      ['Why It Matters', profile.whyItMatters],
      ['What Might Happen', profile.whatMightHappen],
    ];
    for (let i = 0; i < analysisItems.length; i++) {
      const [heading, text] = analysisItems[i]!;
      const block = h('div', { className: 'hegemon-analysis-block' });
      block.appendChild(h('div', { className: 'hegemon-analysis-heading' },
        h('span', { className: 'hegemon-analysis-num' }, String(i + 1)),
        escapeHtml(heading),
      ));
      block.appendChild(h('div', { className: 'hegemon-modal-body' }, escapeHtml(text)));
      analysisSection.appendChild(block);
    }
    content.appendChild(analysisSection);

    // Top Stories
    if (profile.topStories.length) {
      const storiesSection = h('div', { className: 'hegemon-modal-section' });
      storiesSection.appendChild(h('div', { className: 'hegemon-modal-section-title' }, 'Top Stories'));
      const storiesList = h('ul', { className: 'hegemon-sources' });
      for (const s of profile.topStories) {
        storiesList.appendChild(h('li', null,
          h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, escapeHtml(s.title)),
        ));
      }
      storiesSection.appendChild(storiesList);
      content.appendChild(storiesSection);
    }

    // Latest Coverage
    if (profile.latestCoverage.length) {
      const coverageSection = h('div', { className: 'hegemon-modal-section' });
      coverageSection.appendChild(h('div', { className: 'hegemon-modal-section-title' }, 'Latest Coverage'));
      const coverageList = h('ul', { className: 'hegemon-sources' });
      for (const s of profile.latestCoverage) {
        coverageList.appendChild(h('li', null,
          h('a', { href: s.url, target: '_blank', rel: 'noopener noreferrer' }, escapeHtml(s.title)),
        ));
      }
      coverageSection.appendChild(coverageList);
      content.appendChild(coverageSection);
    }

    this.openModal(content);
  }

  // ─── Stocks modal ──────────────────────────────────────────────

  private openStocksModal(mkt: MarketCountry): void {
    const content = h('div');

    // Header
    const mHeader = h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' } });
    mHeader.appendChild(h('span', { style: { fontSize: '24px' } }, mkt.flag));
    mHeader.appendChild(h('span', { style: { fontSize: '16px', fontWeight: '700', color: 'var(--text-primary, #eee)' } }, escapeHtml(mkt.country)));
    const statusCls = mkt.open ? 'hegemon-market-open' : 'hegemon-market-closed';
    mHeader.appendChild(h('span', { className: `hegemon-market-status ${statusCls}` }, mkt.open ? 'Open' : 'Closed'));
    content.appendChild(mHeader);

    // Chart area with time range buttons
    const chartArea = h('div', { className: 'hegemon-chart-area' });
    const chartBtns = h('div', { className: 'hegemon-chart-buttons' });
    const ranges = ['1D', '1W', '1M', '1Y'];
    for (const r of ranges) {
      chartBtns.appendChild(h('button', { className: `hegemon-chart-btn${r === '1D' ? ' active' : ''}` }, r));
    }
    chartArea.appendChild(chartBtns);

    // SVG placeholder chart
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '120');
    svg.setAttribute('viewBox', '0 0 600 120');
    const path = document.createElementNS(svgNs, 'path');
    const points = [10, 30, 25, 45, 40, 55, 50, 48, 60, 70, 65, 80, 75, 72, 85, 90, 85, 95, 88, 100, 95, 92, 98, 105, 100, 95, 90, 85, 80, 78];
    let d = '';
    for (let i = 0; i < points.length; i++) {
      const x = (i / (points.length - 1)) * 580 + 10;
      const y = 115 - (points[i]! / 110) * 110;
      d += (i === 0 ? 'M' : 'L') + `${x},${y}`;
    }
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#e74c3c');
    path.setAttribute('stroke-width', '2');
    svg.appendChild(path);
    chartArea.appendChild(svg as unknown as HTMLElement);
    content.appendChild(chartArea);

    // Market Overview table
    const tableSection = h('div', { className: 'hegemon-modal-section' });
    tableSection.appendChild(h('div', { className: 'hegemon-modal-section-title' }, 'MARKET OVERVIEW'));
    const table = h('table', { className: 'hegemon-table' });
    const thead = h('tr', null,
      h('th', null, 'Index'),
      h('th', null, 'Value'),
      h('th', null, 'Change'),
    );
    table.appendChild(thead);
    for (const idx of mkt.indices) {
      const changeCls = idx.change >= 0 ? 'hegemon-change-pos' : 'hegemon-change-neg';
      const changeStr = (idx.change >= 0 ? '+' : '') + idx.change.toFixed(2) + '%';
      table.appendChild(h('tr', null,
        h('td', null, escapeHtml(idx.name)),
        h('td', null, escapeHtml(idx.value)),
        h('td', { className: changeCls }, changeStr),
      ));
    }
    tableSection.appendChild(table);
    content.appendChild(tableSection);

    // Search ticker
    const searchSection = h('div', { className: 'hegemon-modal-section' });
    searchSection.appendChild(h('div', { className: 'hegemon-modal-section-title' }, 'SEARCH ANY TICKER'));
    const searchRow = h('div', { className: 'hegemon-ticker-search' });
    searchRow.appendChild(h('input', { className: 'hegemon-ticker-input', placeholder: 'Enter ticker symbol (e.g. AAPL)...' }));
    searchRow.appendChild(h('button', { className: 'hegemon-ticker-go' }, 'GO'));
    searchSection.appendChild(searchRow);
    content.appendChild(searchSection);

    // Why it matters
    if (mkt.analysis) {
      const whySection = h('div', { className: 'hegemon-modal-section' });
      whySection.appendChild(h('div', { className: 'hegemon-modal-section-title' }, 'WHY IT MATTERS'));
      whySection.appendChild(h('div', { className: 'hegemon-modal-body' }, escapeHtml(mkt.analysis)));
      content.appendChild(whySection);
    }

    // Outlook
    if (mkt.outlook) {
      const outlookSection = h('div', { className: 'hegemon-modal-section' });
      outlookSection.appendChild(h('div', { className: 'hegemon-modal-section-title' }, 'OUTLOOK'));
      outlookSection.appendChild(h('div', { className: 'hegemon-modal-body' }, escapeHtml(mkt.outlook)));
      content.appendChild(outlookSection);
    }

    this.openModal(content);
  }

  // ─── Event delegation ──────────────────────────────────────────

  private handleContentClick(e: Event): void {
    const target = e.target as HTMLElement;

    // Tab switch
    const tabBtn = target.closest<HTMLElement>('[data-hegemon-tab]');
    if (tabBtn) {
      const tab = tabBtn.dataset.hegemonTab as TabId;
      if (TAB_IDS.includes(tab) && tab !== this.activeTab) {
        this.activeTab = tab;
        this.travelDetailZone = null;
        this.render();
      }
      return;
    }

    // Font controls
    const fontBtn = target.closest<HTMLElement>('[data-hegemon-font]');
    if (fontBtn) {
      const action = fontBtn.dataset.hegemonFont;
      if (action === 'increase' && this.fontSize < 18) this.fontSize += 1;
      if (action === 'decrease' && this.fontSize > 10) this.fontSize -= 1;
      const body = this.content.querySelector<HTMLElement>('.hegemon-body');
      if (body) body.style.fontSize = `${this.fontSize}px`;
      return;
    }

    // Load more
    const loadMoreBtn = target.closest<HTMLElement>('[data-hegemon-action="loadMore"]');
    if (loadMoreBtn) {
      this.latestUpdateLimit = DEMO_LATEST_UPDATES.length;
      this.render();
      return;
    }

    // Top story click
    const storyCard = target.closest<HTMLElement>('[data-hegemon-story]');
    if (storyCard) {
      const story = DEMO_TOP_STORIES.find(s => s.id === storyCard.dataset.hegemonStory);
      if (story) this.openStoryModal(story);
      return;
    }

    // Latest update click
    const updateCard = target.closest<HTMLElement>('[data-hegemon-update]');
    if (updateCard) {
      const upd = DEMO_LATEST_UPDATES.find(u => u.id === updateCard.dataset.hegemonUpdate);
      if (upd) this.openUpdateModal(upd);
      return;
    }

    // Collapsible toggle
    const collapseHeader = target.closest<HTMLElement>('[data-hegemon-collapse]');
    if (collapseHeader) {
      const key = collapseHeader.dataset.hegemonCollapse;
      const body = this.content.querySelector<HTMLElement>(`[data-hegemon-collapse-body="${key}"]`);
      if (body) {
        body.classList.toggle('open');
        const arrow = collapseHeader.querySelector('.hegemon-collapsible-arrow');
        if (arrow) arrow.textContent = body.classList.contains('open') ? '\u25BC' : '\u25B6';
      }
      return;
    }

    // Election click
    const electionCard = target.closest<HTMLElement>('[data-hegemon-election]');
    if (electionCard) {
      const election = DEMO_ELECTIONS.find(el => el.id === electionCard.dataset.hegemonElection);
      if (election) this.openElectionModal(election);
      return;
    }

    // Horizon filter
    const horizonFilter = target.closest<HTMLElement>('[data-hegemon-horizon-filter]');
    if (horizonFilter) {
      const cat = horizonFilter.dataset.hegemonHorizonFilter;
      if (cat === '__clear') {
        this.activeHorizonFilter = null;
      } else {
        this.activeHorizonFilter = this.activeHorizonFilter === cat ? null : (cat || null);
      }
      this.render();
      return;
    }

    // Stocks market section click
    const marketSection = target.closest<HTMLElement>('[data-hegemon-market]');
    if (marketSection) {
      const mkt = DEMO_MARKETS.find(m => m.country === marketSection.dataset.hegemonMarket);
      if (mkt) this.openStocksModal(mkt);
      return;
    }

    // Travel zone click
    const zoneCard = target.closest<HTMLElement>('[data-hegemon-zone]');
    if (zoneCard) {
      const zone = DEMO_DANGER_ZONES.find(z => z.id === zoneCard.dataset.hegemonZone);
      if (zone) {
        this.travelDetailZone = zone;
        this.render();
      }
      return;
    }

    // Travel back button
    const backBtn = target.closest<HTMLElement>('[data-hegemon-action="travelBack"]');
    if (backBtn) {
      this.travelDetailZone = null;
      this.render();
      return;
    }
  }

  public destroy(): void {
    this.closeModal();
    super.destroy();
  }
}
