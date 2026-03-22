# Stitch UI Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the existing Preact frontend components with the Stitch "Dashboard Refined" visual design while preserving all existing functionality (SSE, Deck.GL, graph explorer, etc.)

**Architecture:** The existing component structure maps well to the Stitch design. The main changes are: (1) add a proper Header bar merging the alert banner, (2) restyle the left sidebar with grouped watchlist + threat toggles + risk legend, (3) unify the right panel to show events by default and entity detail on selection, (4) add a floating category filter bar over the map, and (5) update CSS tokens and component styles to match the Stitch design language (Inter font, rounded-2xl panels, glassmorphism, color-coded borders).

**Tech Stack:** Preact + Preact Signals, CSS custom properties (no Tailwind — existing design system), Deck.GL for map

**Design Reference:** `frontend/public/stitch/dashboard-refined.html` (457 lines, Stitch-generated)

---

## File Structure

### New Files
- `frontend/src/panels/header.tsx` — Top navigation bar (logo, alert banner, user actions)
- `frontend/src/panels/filter-bar.tsx` — Floating category filter chips for the map viewport

### Modified Files
- `frontend/src/styles/variables.css` — Update sidebar-width, right-panel-width, add header-height token
- `frontend/src/styles/app.css` — Update grid layout for header row, add new utility classes
- `frontend/src/app.tsx` — Import Header, FilterBar; restructure grid areas; remove news panel aside (consolidated into right panel); always render right panel
- `frontend/src/panels/sidebar.tsx` — Restyle: grouped watchlist (CRITICAL/EXTREME), threat toggles above, full LayerMenu preserved below
- `frontend/src/panels/anomaly-banner.tsx` — Adapt for inline rendering inside Header
- `frontend/src/panels/news-feed.tsx` — Restyle event cards to match Stitch (rounded-xl, color-coded left borders, trust badges layout)
- `frontend/src/panels/ai-synthesis-card.tsx` — Add speedometer-style half-circle gauge matching Stitch
- `frontend/src/panels/right-panel.tsx` — Show events feed when no entity selected; update close button to not hide panel
- `frontend/src/panels/timeline-scrubber.tsx` — Visual polish to match Stitch (rounded-xl wrapper, styled play button)
- `frontend/src/state/store.ts` — Update `selectCountry` to not close right panel on null

---

### Task 1: Update CSS Layout Tokens & Grid

**Files:**
- Modify: `frontend/src/styles/variables.css:67-73`
- Modify: `frontend/src/styles/app.css:24-58`

- [ ] **Step 1: Update layout tokens in variables.css**

Add header-height token and update sidebar/panel widths to match Stitch design. Keep `--sidebar-collapsed` for existing collapse functionality:

```css
/* In :root section, replace existing layout tokens */
--header-height: 64px;
--sidebar-width: 320px;
--sidebar-collapsed: 52px;
--right-panel-width: 380px;
--news-panel-width: 280px;
--timeline-height: 64px;
--alert-height: 0px; /* Alert now inside header */
```

- [ ] **Step 2: Update grid layout in app.css**

Replace the grid template to include a header row instead of alert row:

```css
.app-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-rows: var(--header-height) 1fr var(--timeline-height);
  grid-template-areas:
    "header  header"
    "sidebar map"
    "timeline timeline";
  height: 100vh;
  width: 100vw;
}

.app-layout--right-open {
  grid-template-columns: var(--sidebar-width) 1fr var(--right-panel-width);
  grid-template-areas:
    "header  header  header"
    "sidebar map   panel"
    "timeline timeline timeline";
}

.app-layout--news-open {
  grid-template-columns: var(--sidebar-width) 1fr var(--news-panel-width) var(--right-panel-width);
  grid-template-areas:
    "header  header  header  header"
    "sidebar map   news   panel"
    "timeline timeline timeline timeline";
}
```

Update grid area assignments:

```css
.app-header { grid-area: header; }
.sidebar { grid-area: sidebar; }
.map-viewport { grid-area: map; position: relative; overflow: hidden; }
.right-panel { grid-area: panel; }
.news-panel { grid-area: news; }
.timeline-bar { grid-area: timeline; }
```

- [ ] **Step 3: Add new utility classes to app.css**

```css
/* Rounded panel style matching Stitch */
.panel-rounded {
  border-radius: var(--radius-2xl);
}

/* Stitch-style card */
.card {
  background: var(--bg-surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--glass-shadow);
}

/* Category filter chip */
.filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  background: var(--bg-hover);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-size: var(--text-xs);
  cursor: pointer;
  white-space: nowrap;
  transition: background var(--duration-fast) var(--ease-default);
}
.filter-chip:hover {
  background: var(--bg-active);
}
.filter-chip--active {
  background: var(--accent-blue-dim);
  color: var(--accent-blue);
  border-color: var(--border-accent);
}

/* Line clamp for event summaries */
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Hide scrollbar utility */
.hide-scrollbar::-webkit-scrollbar { display: none; }
.hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
```

- [ ] **Step 4: Do NOT commit yet** — the grid references `app-header` which doesn't exist until Task 2. Combine with Task 2 commit.

---

### Task 2: Create Header Component (commit with Task 1)

**Files:**
- Create: `frontend/src/panels/header.tsx`
- Modify: `frontend/src/app.tsx`

- [ ] **Step 1: Create header.tsx**

The Header component combines the logo, alert banner (inline), and user action buttons in one horizontal bar — matching the Stitch design's `<header>` element (lines 56-86 of dashboard-refined.html).

```tsx
import { h } from 'preact';
import { anomalyAlerts, dismissAnomaly, selectedEntity, rightPanelOpen } from '../state/store';

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const alerts = anomalyAlerts.value;
  const current = alerts.length > 0 ? alerts[0] : null;

  const handleAlertClick = () => {
    if (!current) return;
    selectedEntity.value = { type: current.entityType, id: current.entityId };
    rightPanelOpen.value = true;
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(var(--glass-blur-heavy))',
      WebkitBackdropFilter: 'blur(var(--glass-blur-heavy))',
      borderBottom: '1px solid var(--border-subtle)',
      boxShadow: 'var(--glass-shadow)',
      height: '100%',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '280px', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32,
          background: 'var(--accent-blue)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '14px',
        }}>
          {'\u265E'}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '2px', lineHeight: 1.2, color: 'var(--text-primary)' }}>
            GAMBIT
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500 }}>
            Global Intelligence Network
          </div>
        </div>
      </div>

      {/* Alert Banner (inline) */}
      <div style={{ flex: 1, maxWidth: '640px', margin: '0 24px' }}>
        {current && (
          <div
            onClick={handleAlertClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '6px 16px',
              background: 'var(--danger-dim)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
            }}
          >
            <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{'\u26A0'}</span>
            <span style={{ color: 'var(--text-primary)', flex: 1 }}>
              <strong style={{ color: 'var(--danger)' }}>CRITICAL ALERT:</strong>
              {' '}{current.entityType.toUpperCase()}: {current.entityId} — Z-Score: {current.zScore.toFixed(1)}
            </span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', flexShrink: 0 }}>
              {current.severity}
            </span>
            <button
              onClick={(e: Event) => { e.stopPropagation(); dismissAnomaly(0); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '14px', padding: 0 }}
            >
              {'\u2715'}
            </button>
          </div>
        )}
      </div>

      {/* User Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '280px', justifyContent: 'flex-end', flexShrink: 0 }}>
        <button
          onClick={onSettingsClick}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '16px' }}
          title="Settings"
        >
          {'\u2699'}
        </button>
        <div style={{ position: 'relative' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '16px' }}>{'\uD83D\uDD14'}</span>
          {alerts.length > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              width: 10, height: 10,
              background: 'var(--danger)',
              borderRadius: '50%',
              border: '2px solid var(--bg-surface)',
            }} />
          )}
        </div>
        <div style={{
          width: 32, height: 32,
          background: 'var(--bg-active)',
          borderRadius: '50%',
          border: '1px solid var(--border-medium)',
        }} />
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Update app.tsx to use Header**

Replace the alert-banner grid area with the Header component. Update imports, remove the standalone AnomalyBanner usage, and wire up settings:

1. Add import: `import { Header } from './panels/header';`
2. Replace the `<div class="alert-banner">` block with:
```tsx
<div class="app-header">
  <Header onSettingsClick={() => setSettingsOpen(true)} />
</div>
```
3. Remove the settings button from the sidebar `<aside>` (it's now in the header).

- [ ] **Step 3: Commit (includes Task 1 CSS changes)**

```bash
git add frontend/src/styles/variables.css frontend/src/styles/app.css frontend/src/panels/header.tsx frontend/src/app.tsx
git commit -m "feat: add Header component with inline alert banner and update grid layout"
```

---

### Task 3: Restyle Sidebar

> **Depends on:** Task 2 (Header must exist, since branding moves from sidebar to Header)

**Files:**
- Modify: `frontend/src/panels/sidebar.tsx`

- [ ] **Step 1: Rewrite sidebar to match Stitch design**

The Stitch sidebar has:
- Panel title "CRITICAL WATCHLIST" (bold, dark)
- Search input with magnifying glass icon
- Quick threat toggles (top 5 layers matching Stitch: Active Conflicts, Terrorism, Cyber Threats, Economic Instability, Disinformation)
- Country list grouped by risk level (CRITICAL with red dots, EXTREME with orange dots)
- **Full LayerMenu preserved** below the watchlist (presets, all toggles, heatmap opacity, plugins)
- Risk Levels legend at bottom

**IMPORTANT:** The existing `LayerMenu` component must be kept to preserve all layer toggle functionality (presets, heatmap opacity slider, plugin toggles). The quick toggles above the country list are shortcuts for the 5 most relevant layers; the full `LayerMenu` remains in a collapsible section below.

Replace the current sidebar.tsx with a restyled version that preserves ALL existing functionality:

```tsx
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { bootstrapData, selectCountry, anomalyAlerts, layers, toggleLayer } from '../state/store';
import { LayerMenu } from './layer-menu';
import { SearchBar } from './search-bar';

/** Quick-access threat toggles — these map to real layer keys */
const THREAT_TOGGLES = [
  { id: 'conflicts' as const, label: 'Active Conflicts', icon: '\u2694\uFE0F' },
  { id: 'nsaZones' as const, label: 'Non-State Actors', icon: '\uD83D\uDCA3' },
  { id: 'riskHeatmap' as const, label: 'Risk Heatmap', icon: '\uD83C\uDF21' },
  { id: 'tradeRoutes' as const, label: 'Trade Routes', icon: '\uD83D\uDCC9' },
  { id: 'elections' as const, label: 'Elections', icon: '\uD83D\uDDF3' },
] as const;

/** Risk level metadata for the legend */
const RISK_LEGEND = [
  { label: 'Catastrophic', color: 'var(--risk-catastrophic)', key: 'catastrophic' },
  { label: 'Stormy', color: 'var(--risk-stormy)', key: 'stormy' },
  { label: 'Extreme', color: 'var(--risk-extreme)', key: 'extreme' },
  { label: 'Cloudy', color: 'var(--risk-cloudy)', key: 'cloudy' },
  { label: 'Severe', color: 'var(--risk-severe)', key: 'severe' },
  { label: 'Clear', color: 'var(--risk-clear)', key: 'clear' },
] as const;

export function Sidebar() {
  const data = bootstrapData.value;
  const layerState = layers.value;
  const [showLayers, setShowLayers] = useState(false);

  // Group countries by risk tier
  const critical = data?.countries.filter(c => c.risk === 'catastrophic' || c.risk === 'extreme') || [];
  const extreme = data?.countries.filter(c => c.risk === 'severe') || [];

  // Count per risk level
  const counts: Record<string, number> = {};
  for (const c of data?.countries || []) {
    counts[c.risk] = (counts[c.risk] || 0) + 1;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', padding: '12px' }}>
      {/* Watchlist Panel */}
      <div class="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Panel Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
            CRITICAL WATCHLIST
          </span>
          <button style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '14px' }}>
            {'\u22EE'}
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <SearchBar />
        </div>

        {/* Quick Threat Toggles */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          {THREAT_TOGGLES.map(t => {
            const isOn = layerState[t.id];
            return (
              <div key={t.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
              }}
              onClick={() => toggleLayer(t.id as any)}
              >
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '16px', textAlign: 'center', fontSize: '12px', opacity: 0.6 }}>{t.icon}</span>
                  {t.label}
                </span>
                <div class={`toggle ${isOn ? 'toggle--on' : ''}`}>
                  <div class="toggle__thumb" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Country List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }} class="hide-scrollbar">
          {critical.map(c => {
            const hasAnomaly = anomalyAlerts.value.some(a => a.entityId === c._id);
            return (
              <div
                key={c._id}
                onClick={() => selectCountry(c)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                  transition: 'background var(--duration-fast) var(--ease-default)',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: `var(--risk-${c.risk})`, flexShrink: 0 }} />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {c.iso2} - {c.name}
                  </span>
                  {hasAnomaly && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--warning)', animation: 'pulse-dot 2s infinite' }} />
                  )}
                </div>
                <span class={`badge risk-${c.risk}`} style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px' }}>
                  {c.risk === 'catastrophic' ? 'CRITICAL' : c.risk.toUpperCase()}
                </span>
              </div>
            );
          })}

          {/* EXTREME tier separator */}
          {extreme.length > 0 && (
            <>
              <div style={{ height: '8px' }} />
              {extreme.map(c => (
                <div
                  key={c._id}
                  onClick={() => selectCountry(c)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px', borderRadius: 'var(--radius-lg)', cursor: 'pointer',
                    transition: 'background var(--duration-fast) var(--ease-default)',
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--risk-severe)', flexShrink: 0 }} />
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {c.iso2} - {c.name}
                    </span>
                  </div>
                  <span class="badge risk-severe" style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px' }}>
                    EXTREME
                  </span>
                </div>
              ))}
            </>
          )}

          {/* Full Layer Menu (collapsible) */}
          <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
            <button
              onClick={() => setShowLayers(!showLayers)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', width: '100%',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)',
                fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
              }}
            >
              Map Layers
              <span style={{ transform: showLayers ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                {'\u25BC'}
              </span>
            </button>
            {showLayers && <LayerMenu />}
          </div>
        </div>
      </div>

      {/* Risk Legend */}
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(var(--glass-blur))',
        borderRadius: 'var(--radius-xl)',
        padding: '12px',
        border: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>RISK LEVELS</span>
          <span class="mono" style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>2026</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {RISK_LEGEND.map(r => (
            <div key={r.key} class="mono" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: r.key === 'clear' ? 'transparent' : r.color,
                border: r.key === 'clear' ? '1px solid var(--border-medium)' : 'none',
              }} />
              {r.label} {counts[r.key] ? `(${counts[r.key]})` : ''}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/panels/sidebar.tsx
git commit -m "style: restyle sidebar to match Stitch watchlist design"
```

---

### Task 4: Create Floating Filter Bar

**Files:**
- Create: `frontend/src/panels/filter-bar.tsx`
- Modify: `frontend/src/app.tsx`

- [ ] **Step 1: Create filter-bar.tsx**

A floating bar over the map viewport with category filter chips (matching Stitch lines 267-281).

> **Note:** The `activeFilters` signal is exported but not yet consumed by any data layer. A future task will wire it to filter `latestEvents` in the news feed and toggle layer visibility. For now, the UI is interactive but does not affect data.

```tsx
import { h } from 'preact';
import { signal } from '@preact/signals';

export type FilterCategory = 'conflict' | 'security' | 'economic' | 'cyber' | 'maritime' | 'political';

export const activeFilters = signal<Set<FilterCategory>>(new Set());

const CATEGORIES: { id: FilterCategory; label: string; color: string }[] = [
  { id: 'conflict', label: 'Conflict', color: 'var(--cat-conflict)' },
  { id: 'security', label: 'Security', color: 'var(--cat-security)' },
  { id: 'economic', label: 'Economic', color: 'var(--cat-economic)' },
  { id: 'cyber', label: 'Cyber', color: 'var(--cat-cyber)' },
  { id: 'maritime', label: 'Maritime', color: 'var(--cat-maritime)' },
  { id: 'political', label: 'Political', color: 'var(--cat-political)' },
];

export function FilterBar() {
  const filters = activeFilters.value;

  function toggle(id: FilterCategory) {
    const next = new Set(filters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    activeFilters.value = next;
  }

  return (
    <div style={{
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 'var(--z-presets)',
      width: '100%',
      maxWidth: '560px',
      pointerEvents: 'auto',
    }}>
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(var(--glass-blur-heavy))',
        WebkitBackdropFilter: 'blur(var(--glass-blur-heavy))',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--glass-shadow)',
        padding: '8px 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {CATEGORIES.map(cat => {
            const isActive = filters.has(cat.id);
            return (
              <button
                key={cat.id}
                class={`filter-chip ${isActive ? 'filter-chip--active' : ''}`}
                onClick={() => toggle(cat.id)}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Mount FilterBar in app.tsx map viewport**

Inside the `<div class="map-viewport">` block, add the FilterBar after the DeckMap:

```tsx
import { FilterBar } from './panels/filter-bar';
// ...
<div class="map-viewport" style={{ background: 'var(--bg-deep)', zIndex: 'var(--z-base)', position: 'relative' }}>
  <ErrorBoundary fallback={<div style={{padding: 24, color: 'var(--danger)'}}>Map failed</div>}>
    <DeckMap />
  </ErrorBoundary>
  <FilterBar />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/panels/filter-bar.tsx frontend/src/app.tsx
git commit -m "feat: add floating category filter bar over map viewport"
```

---

### Task 5: Restyle AI Synthesis Card with Speedometer Gauge

**Files:**
- Modify: `frontend/src/panels/ai-synthesis-card.tsx`

- [ ] **Step 1: Replace EscalationGauge with half-circle speedometer**

Match the Stitch design's speedometer gauge (dashboard-refined.html lines 373-383) — a half-circle arc with a needle, numeric value, and risk label. Keep the existing `escalationConfig` logic but render as a half-arc gauge:

```tsx
/** SVG half-circle speedometer gauge for escalation signal */
function EscalationGauge({ signal }: { signal?: string }) {
  const { pct, color, label } = escalationConfig(signal);
  const numericValue = (pct / 10).toFixed(1); // 0.0 - 10.0 scale

  // Half-circle arc geometry
  const w = 96;
  const h = 52;
  const cx = w / 2;
  const cy = h - 4;
  const r = 38;
  const startAngle = Math.PI;  // left (180deg)
  const endAngle = 0;          // right (0deg)
  const needleAngle = startAngle - (pct / 100) * Math.PI;

  // Arc path helper
  function arc(startA: number, endA: number): string {
    const x1 = cx + r * Math.cos(startA);
    const y1 = cy - r * Math.sin(startA);
    const x2 = cx + r * Math.cos(endA);
    const y2 = cy - r * Math.sin(endA);
    const sweep = startA > endA ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 0 ${sweep} ${x2} ${y2}`;
  }

  const needleX = cx + (r - 8) * Math.cos(needleAngle);
  const needleY = cy - (r - 8) * Math.sin(needleAngle);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, marginLeft: '16px' }}>
      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
        Escalation Signal
      </span>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* Background arc */}
        <path d={arc(startAngle, endAngle)} fill="none" stroke="var(--bg-active)" stroke-width="6" stroke-linecap="round" />
        {/* Colored arc segment */}
        <path d={arc(startAngle, needleAngle)} fill="none" stroke={color} stroke-width="6" stroke-linecap="round" />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="var(--text-primary)" stroke-width="2" stroke-linecap="round" />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="4" fill="var(--text-primary)" stroke="var(--bg-surface)" stroke-width="2" />
      </svg>
      <div style={{ textAlign: 'center', marginTop: '2px' }}>
        <span class="mono" style={{ fontSize: '20px', fontWeight: 700, color, lineHeight: 1 }}>
          {numericValue}
        </span>
      </div>
      <span style={{ fontSize: '9px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '1px' }}>
        {label} RISK
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Update card layout to match Stitch side-by-side design**

The Stitch card has the text on the left and gauge on the right in a row layout. Update the `AISynthesisCard` render to use `flexDirection: 'row'` for the header:

```tsx
export function AISynthesisCard({ analysis }: AISynthesisProps) {
  return (
    <div class="card" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        {/* Left: text content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)',
            display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px',
          }}>
            AI Synthesis
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, marginBottom: '6px' }}>
            BLUF (Bottom Line Up Front)
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {analysis.summary}
          </div>
        </div>
        {/* Right: gauge */}
        <EscalationGauge signal={analysis.escalationSignal} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/panels/ai-synthesis-card.tsx
git commit -m "style: update AI synthesis card with speedometer gauge"
```

---

### Task 6: Restyle News Feed Event Cards

**Files:**
- Modify: `frontend/src/panels/news-feed.tsx`

- [ ] **Step 1: Update event card rendering**

Match Stitch's event card design (dashboard-refined.html lines 388-451):
- Rounded-xl cards with color-coded left border (4px)
- Category tags with colored backgrounds (BREAKING | CONFLICT)
- Trust badges row with check icon + colored pills
- Source count in right corner

Update the card rendering inside the `events.map()` in `NewsFeed`:

```tsx
{/* Each event card */}
<div
  key={i}
  class="card"
  style={{
    padding: '16px',
    borderLeft: `4px solid ${borderColor}`,
  }}
>
  {/* Tags row */}
  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
    <span style={{ color: borderColor }}>{ev.tags[0] || 'NEWS'}</span>
    {ev.tags[1] && (
      <>
        <span style={{ color: 'var(--text-tertiary)' }}>|</span>
        <span style={{ color: 'var(--accent-blue)', background: 'var(--accent-blue-dim)', padding: '1px 4px', borderRadius: '3px' }}>
          {ev.tags[1]}
        </span>
      </>
    )}
    <span style={{ color: 'var(--text-tertiary)' }}>|</span>
    <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'none' }}>{ts}</span>
  </div>

  {/* Title */}
  <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '4px' }}>
    {ev.title}
  </div>

  {/* Summary */}
  <div class="line-clamp-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
    {ev.summary}
  </div>

  {/* Trust Badges */}
  <div style={{ fontSize: 'var(--text-xs)' }}>
    <div style={{ color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: '6px' }}>Provenance Trust Badges</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {ev.sourceCount > 0 && (
          <span style={{
            background: 'var(--success-dim)', color: 'var(--success)',
            padding: '3px 8px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--success)',
            display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600,
          }}>
            {'\u2713'} Verified by {ev.sourceCount} sources
          </span>
        )}
        {prov?.sourceTier && (
          <span style={{
            background: 'var(--info-dim)', color: 'var(--info)',
            padding: '3px 8px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--info)',
            display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600,
          }}>
            {prov.sourceTier}
          </span>
        )}
      </div>
      {ev.sourceCount > 0 && (
        <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>
          {ev.sourceCount} Sources
        </span>
      )}
    </div>
  </div>
</div>
```

- [ ] **Step 2: Update feed header with Stitch-style tabs**

Replace the feed header with EVENTS / BRIEF / STOCKS tabs and a Filter button matching Stitch (lines 351-360):

```tsx
{/* Header with tabs */}
<div style={{
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '0 16px', borderBottom: '1px solid var(--border-subtle)',
}}>
  <div style={{ display: 'flex', gap: '16px' }}>
    {['EVENTS', 'BRIEF', 'STOCKS'].map((tab, i) => (
      <button
        key={tab}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 'var(--text-sm)', fontWeight: i === 0 ? 700 : 600,
          color: i === 0 ? 'var(--accent-blue)' : 'var(--text-tertiary)',
          borderBottom: i === 0 ? '2px solid var(--accent-blue)' : '2px solid transparent',
          padding: '12px 0',
        }}
      >
        {tab}
      </button>
    ))}
  </div>
  <button style={{
    display: 'flex', alignItems: 'center', gap: '4px',
    background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
    padding: '4px 12px', borderRadius: 'var(--radius-md)',
    color: 'var(--text-secondary)', fontSize: 'var(--text-xs)',
    cursor: 'pointer', boxShadow: 'var(--glass-shadow)',
  }}>
    Filter
  </button>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/panels/news-feed.tsx
git commit -m "style: restyle news feed cards with trust badges and Stitch tabs"
```

---

### Task 7: Update Right Panel to Show Events by Default

**Files:**
- Modify: `frontend/src/panels/right-panel.tsx`
- Modify: `frontend/src/app.tsx`
- Modify: `frontend/src/state/store.ts`

- [ ] **Step 1: Update selectCountry in store.ts to not close right panel**

The current `selectCountry` sets `rightPanelOpen.value = false` when called with null, which contradicts the "always visible" panel. Update the function to only clear the selection without hiding the panel:

In `frontend/src/state/store.ts`, find the `selectCountry` function and change:
```tsx
export function selectCountry(country: Country | null) {
  selectedCountry.value = country;
  selectedEntity.value = country ? { type: 'country', id: country._id } : null;
  // Don't toggle rightPanelOpen — panel is always visible
}
```

- [ ] **Step 2: Add events feed fallback to right panel**

When no entity is selected, show the events feed (NewsFeed) directly in the right panel. This consolidates the separate news panel into the right panel:

In `right-panel.tsx`, update the `RightPanel` component. Add an import and fallback condition:

```tsx
import { NewsFeed } from './news-feed';
```

At the top of the component, replace the existing null-return:
```tsx
// If no entity selected, show events feed
if (!selectedEntity.value && !selectedCountry.value) {
  return <NewsFeed />;
}
```

Also update the close button handler to just clear selection (panel stays visible):
```tsx
onClick={() => { selectCountry(null); selectedEntity.value = null; activeTab.value = 'overview'; }}
```

- [ ] **Step 3: Update app.tsx — always show right panel, remove news panel aside**

The right panel is now always visible and contains the events feed when nothing is selected, so the separate news panel aside is no longer needed.

1. Simplify the layout class — always include right-open:
```tsx
const layoutClass = 'app-layout app-layout--right-open';
```

2. Remove the `newsPanelOpen` import from store (no longer needed in app.tsx).

3. Remove the entire news panel aside block:
```tsx
// REMOVE THIS BLOCK:
{newsPanelOpen.value && rightPanelOpen.value && (
  <aside class="news-panel panel-glass panel-border-left" ...>
    <NewsFeed />
  </aside>
)}
```

4. Remove the conditional around the right panel — always render it:
```tsx
<aside class="right-panel panel-glass panel-border-left" style={{ zIndex: 'var(--z-panel)' }}>
  <ErrorBoundary fallback={<div style={{padding: 16}}><Skeleton height="100%" /></div>}>
    <RightPanel />
  </ErrorBoundary>
</aside>
```

5. Remove the `sidebarOpen` conditional — always render the sidebar (the grid layout assumes it):
```tsx
<aside class="sidebar panel-glass panel-border-right" style={{ zIndex: 'var(--z-sidebar)' }}>
  <ErrorBoundary fallback={<div style={{padding: 16}}><Skeleton height="100%" /></div>}>
    <Sidebar />
  </ErrorBoundary>
</aside>
```

6. Remove the `app-layout--news-open` CSS variant from `app.css` since it's no longer used.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/panels/right-panel.tsx frontend/src/app.tsx frontend/src/state/store.ts frontend/src/styles/app.css
git commit -m "feat: always-visible right panel with events feed fallback"
```

---

### Task 8: Polish Timeline Scrubber

**Files:**
- Modify: `frontend/src/panels/timeline-scrubber.tsx`

- [ ] **Step 1: Update visual styling**

Match the Stitch timeline (dashboard-refined.html lines 313-345):
- Glassmorphism wrapper with rounded-xl and shadow
- Styled play button with icon
- Day labels with bold "Today" marker
- Visible timeline markers as vertical bars
- Styled scrubber thumb (white circle with blue border + shadow)

Update the track styling in the return JSX. Replace the play button with a styled version:

```tsx
<button style={{
  background: 'none', border: '1px solid var(--border-medium)',
  color: 'var(--text-primary)', cursor: 'pointer',
  width: '32px', height: '32px', borderRadius: '50%',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '12px', flexShrink: 0,
}}>
  {'\u25B6'}
</button>
```

Update the thumb style:
```tsx
{/* Thumb */}
<div style={{
  position: 'absolute', top: '50%', left: progressPct,
  transform: 'translate(-50%, -50%)',
  width: '16px', height: '16px', borderRadius: '50%',
  background: 'var(--bg-surface)',
  border: '2px solid var(--accent-blue)',
  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
  zIndex: 3, cursor: 'pointer',
  transition: dragging ? 'none' : 'left 0.15s ease-out',
}} />
```

Update the historical banner to match Stitch's amber banner style:
```tsx
{isHistorical.value && timelinePosition.value && (
  <div style={{
    position: 'absolute', top: -36, left: '50%', transform: 'translateX(-50%)',
    background: 'var(--warning)', color: '#000', padding: '6px 20px',
    borderRadius: 'var(--radius-xl)', fontSize: 'var(--text-xs)',
    fontWeight: 700, letterSpacing: '1px', whiteSpace: 'nowrap',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex', alignItems: 'center', gap: '16px',
  }}>
    <span>HISTORICAL — {formatHistoricalDate(timelinePosition.value)}</span>
    <button onClick={returnToLive} style={{
      background: '#000', color: '#fff', border: 'none',
      padding: '4px 12px', borderRadius: 'var(--radius-lg)',
      fontSize: '11px', fontWeight: 700, cursor: 'pointer',
    }}>
      RETURN TO LIVE
    </button>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/panels/timeline-scrubber.tsx
git commit -m "style: polish timeline scrubber to match Stitch design"
```

---

### Task 9: Final App Layout Integration & Cleanup

**Files:**
- Modify: `frontend/src/app.tsx`

- [ ] **Step 1: Clean up app.tsx**

Verify the final app.tsx integrates all components correctly:
1. Header in `app-header` grid area
2. Sidebar with new design in `sidebar` grid area (remove the settings button that moved to Header)
3. DeckMap + FilterBar in `map-viewport`
4. RightPanel (always visible) in `panel` grid area
5. TimelineScrubber in `timeline` grid area
6. GraphExplorer, ComparePanel, SettingsPanel as overlays

Remove the old AnomalyBanner import (it's now rendered inside Header).

- [ ] **Step 2: Run typecheck**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 0 errors (fix any type issues)

- [ ] **Step 3: Run dev server and verify**

```bash
cd frontend && npm run dev
```

Open http://localhost:5200 and verify:
- Header bar with logo, alert, user actions
- Sidebar with watchlist, toggles, risk legend
- Map with floating filter chips
- Right panel showing events feed
- Timeline scrubber at bottom
- Entity selection still opens detail view in right panel

- [ ] **Step 4: Commit**

```bash
git add -A frontend/src/
git commit -m "feat: complete Stitch UI alignment for dashboard layout"
```
