/**
 * GAMBIT — Root Application Shell
 *
 * Layout: alert banner (top) + sidebar (left) + map (center)
 *         + news panel + right panel + timeline (bottom)
 *
 * All panels overlay/dock around the central map viewport.
 */
import { useEffect } from 'preact/hooks';
import {
  sidebarOpen,
  rightPanelOpen,
  newsPanelOpen,
  bootstrapData,
  bootstrapLoading,
  latestEvents,
  theme,
} from './state/store';
import { api } from './api/client';
import { connectSSE, disconnectSSE } from './api/sse';

export function App() {
  // Bootstrap data on mount
  useEffect(() => {
    async function loadBootstrap() {
      try {
        const data = await api.bootstrap(true);
        bootstrapData.value = data;

        // Also load initial news
        const news = await api.news(50);
        latestEvents.value = news;
      } catch (err) {
        console.error('[Bootstrap] Failed to load:', err);
      } finally {
        bootstrapLoading.value = false;
      }
    }

    loadBootstrap();
    connectSSE();

    return () => disconnectSSE();
  }, []);

  // Derive layout class from panel state
  const layoutClass = [
    'app-layout',
    rightPanelOpen.value && newsPanelOpen.value
      ? 'app-layout--news-open'
      : rightPanelOpen.value
        ? 'app-layout--right-open'
        : '',
  ].filter(Boolean).join(' ');

  if (bootstrapLoading.value) {
    return (
      <div class="app-loading">
        <span class="app-loading-text">GAMBIT</span>
      </div>
    );
  }

  return (
    <div class={layoutClass}>
      {/* Alert banner — top */}
      <div class="alert-banner panel-glass panel-border-bottom">
        {/* TODO: AnomalyBanner component */}
      </div>

      {/* Sidebar — left */}
      <aside class="sidebar panel-glass panel-border-right">
        {/* TODO: Sidebar component with watchlist + layer menu */}
        <div style={{ padding: '16px 12px' }}>
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            letterSpacing: '3px',
            color: 'var(--accent-blue)',
          }}>
            GAMBIT
          </div>
          <div style={{
            fontSize: '8px',
            letterSpacing: '2px',
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
          }}>
            Geopolitical Intelligence
          </div>
        </div>
      </aside>

      {/* Map viewport — center */}
      <div class="map-viewport" style={{ background: 'var(--bg-deep)' }}>
        {/* TODO: DeckMap component */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
        }}>
          Globe viewport — Deck.GL + MapLibre
        </div>
      </div>

      {/* Right panel — entity details */}
      {rightPanelOpen.value && (
        <aside class="right-panel panel-glass panel-border-left">
          {/* TODO: RightPanel component */}
        </aside>
      )}

      {/* News panel */}
      {newsPanelOpen.value && rightPanelOpen.value && (
        <aside class="news-panel panel-glass panel-border-left">
          {/* TODO: NewsFeed component */}
        </aside>
      )}

      {/* Timeline — bottom */}
      <div class="timeline-bar panel-glass panel-border-top">
        {/* TODO: TimelineScrubber component */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.1em',
        }}>
          TIMELINE SCRUBBER
        </div>
      </div>
    </div>
  );
}
