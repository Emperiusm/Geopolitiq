import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import {
  sidebarOpen,
  rightPanelOpen,
  newsPanelOpen,
  bootstrapData,
  bootstrapLoading,
  latestEvents,
} from './state/store';
import { fetchBootstrap } from './api/bootstrap';
import { connectSSE, disconnectSSE } from './api/sse';

import { DeckMap } from './map/deck-map';
import { Sidebar } from './panels/sidebar';
import { RightPanel } from './panels/right-panel';
import { NewsFeed } from './panels/news-feed';
import { TimelineScrubber } from './panels/timeline-scrubber';
import { ComparePanel } from './panels/compare-panel';
import { GraphExplorer } from './panels/graph-explorer';
import { AnomalyBanner } from './panels/anomaly-banner';
import { Header } from './panels/header';
import { SettingsPanel } from './panels/settings-panel';
import { useKeyboardShortcuts } from './components/keyboard-shortcuts';
import { ErrorBoundary } from './components/error-boundary';
import { Skeleton } from './components/skeleton';

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Keyboard shortcuts integration
  useKeyboardShortcuts();

  // Bootstrap data on mount
  useEffect(() => {
    async function loadBootstrap() {
      try {
        const data = await fetchBootstrap();
        bootstrapData.value = data;
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
      <div class="app-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-deep)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'var(--accent-blue)', fontSize: 24, letterSpacing: 4, fontWeight: 700, animation: 'pulse 1.5s infinite' }}>GAMBIT</div>
          <div style={{ marginTop: 16 }}>
            <Skeleton width="200px" height="4px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div class={layoutClass}>
      
      {/* Header — top */}
      <div class="app-header">
        <Header onSettingsClick={() => setSettingsOpen(true)} />
      </div>

      {/* Sidebar — left */}
      {sidebarOpen.value && (
        <aside class="sidebar panel-glass panel-border-right" style={{ zIndex: 'var(--z-sidebar)' }}>
          <ErrorBoundary fallback={<div style={{padding: 16}}><Skeleton height="100%" /></div>}>
            <Sidebar />
          </ErrorBoundary>
        </aside>
      )}

      {/* Map viewport — center */}
      <div class="map-viewport" style={{ background: 'var(--bg-deep)', zIndex: 'var(--z-base)', position: 'relative' }}>
        <ErrorBoundary fallback={<div style={{padding: 24, color: 'var(--danger)'}}>Map integration failed</div>}>
          <DeckMap />
        </ErrorBoundary>
      </div>

      {/* Pop Overlays */}
      <ErrorBoundary>
        <GraphExplorer />
      </ErrorBoundary>
      
      <ErrorBoundary>
        <ComparePanel />
      </ErrorBoundary>

      {settingsOpen && (
        <ErrorBoundary>
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        </ErrorBoundary>
      )}

      {/* Right panel — entity details */}
      {rightPanelOpen.value && (
        <aside class="right-panel panel-glass panel-border-left" style={{ zIndex: 'var(--z-panel)' }}>
          <ErrorBoundary fallback={<div style={{padding: 16}}><Skeleton height="100%" /></div>}>
            <RightPanel />
          </ErrorBoundary>
        </aside>
      )}

      {/* News panel */}
      {newsPanelOpen.value && rightPanelOpen.value && (
        <aside class="news-panel panel-glass panel-border-left" style={{ zIndex: 'var(--z-panel)' }}>
          <ErrorBoundary fallback={<div style={{padding: 16}}><Skeleton height="100%" /></div>}>
            <NewsFeed />
          </ErrorBoundary>
        </aside>
      )}

      {/* Timeline — bottom */}
      <div class="timeline-bar panel-glass panel-border-top" style={{ zIndex: 'var(--z-timeline)' }}>
        <ErrorBoundary>
          <TimelineScrubber />
        </ErrorBoundary>
      </div>
    </div>
  );
}
