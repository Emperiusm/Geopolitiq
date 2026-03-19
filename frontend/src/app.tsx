import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import {
  bootstrapData,
  bootstrapLoading,
  latestEvents,
  viewMode,
} from './state/store';
import { fetchBootstrap } from './api/bootstrap';
import { connectSSE, disconnectSSE } from './api/sse';
import { api } from './api/client';

import { DeckMap } from './map/deck-map';
import { Sidebar } from './panels/sidebar';
import { RightPanel } from './panels/right-panel';
import { TimelineScrubber } from './panels/timeline-scrubber';
import { ComparePanel } from './panels/compare-panel';
import { GraphExplorer } from './panels/graph-explorer';
import { FilterBar } from './panels/filter-bar';
import { Header } from './panels/header';
import { SettingsPanel } from './panels/settings-panel';
import { useKeyboardShortcuts } from './components/keyboard-shortcuts';
import { ErrorBoundary } from './components/error-boundary';
import { Skeleton } from './components/skeleton';
import { BasemapPicker } from './components/basemap-picker';

export function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapMode, setMapMode] = useState<'globe' | 'flat'>('globe');

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

    // Seed the news feed from REST so the right panel isn't empty before SSE delivers events
    api.news(50)
      .then((items) => {
        if (Array.isArray(items) && items.length > 0 && latestEvents.value.length === 0) {
          latestEvents.value = items;
        }
      })
      .catch(() => { /* SSE will populate later */ });

    return () => disconnectSSE();
  }, []);

  const layoutClass = 'app-layout app-layout--right-open';

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
      <aside class="sidebar panel-glass panel-border-right" style={{ zIndex: 'var(--z-sidebar)' }}>
        <ErrorBoundary fallback={<div style={{padding: 16}}><Skeleton height="100%" /></div>}>
          <Sidebar />
        </ErrorBoundary>
      </aside>

      {/* Map viewport — center. key={mapMode} forces DeckMap remount on view switch */}
      <div class="map-viewport" style={{ background: 'var(--globe-bg, var(--bg-deep))', zIndex: 'var(--z-base)', position: 'relative' }}>
        <ErrorBoundary fallback={<div style={{padding: 24, color: 'var(--danger)'}}>Map integration failed</div>}>
          <DeckMap key={mapMode} />
        </ErrorBoundary>
        <FilterBar />

        {/* Map controls — bottom-right */}
        <div style={{
          position: 'absolute', right: '16px', bottom: '16px',
          display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end',
          zIndex: 'var(--z-map-controls)', pointerEvents: 'auto',
        }}>
          <BasemapPicker />
          <div style={{
            display: 'flex', gap: '1px', overflow: 'hidden',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--bg-glass)', backdropFilter: 'blur(var(--glass-blur))',
            border: '1px solid var(--border-subtle)', boxShadow: 'var(--glass-shadow)',
          }}>
            {(['globe', 'flat'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => { setMapMode(mode); viewMode.value = mode; }}
                style={{
                  padding: '6px 14px', border: 'none', cursor: 'pointer',
                  fontSize: 'var(--text-xs)', fontWeight: 600, letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  background: mapMode === mode ? 'var(--accent-blue)' : 'transparent',
                  color: mapMode === mode ? '#fff' : 'var(--text-secondary)',
                  transition: 'all var(--duration-fast) var(--ease-default)',
                }}
              >
                {mode === 'globe' ? '3D Globe' : '2D Map'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Pop Overlays — silent fallbacks since these are normally hidden */}
      <ErrorBoundary fallback={<span />}>
        <GraphExplorer />
      </ErrorBoundary>

      <ErrorBoundary fallback={<span />}>
        <ComparePanel />
      </ErrorBoundary>

      {settingsOpen && (
        <ErrorBoundary fallback={<span />}>
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        </ErrorBoundary>
      )}

      {/* Right panel — entity details / events feed */}
      <aside class="right-panel panel-glass panel-border-left" style={{ zIndex: 'var(--z-panel)' }}>
        <ErrorBoundary fallback={<div style={{padding: 16}}><Skeleton height="100%" /></div>}>
          <RightPanel />
        </ErrorBoundary>
      </aside>

      {/* Timeline — bottom */}
      <div class="timeline-bar panel-glass panel-border-top" style={{ zIndex: 'var(--z-timeline)' }}>
        <ErrorBoundary>
          <TimelineScrubber />
        </ErrorBoundary>
      </div>
    </div>
  );
}
