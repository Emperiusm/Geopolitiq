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
