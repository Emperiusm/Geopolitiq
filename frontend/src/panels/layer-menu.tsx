import { h } from 'preact';
import { layers, toggleLayer, applyPreset, LayerPreset, pluginManifests, heatmapOpacity, tradeRouteFilter, bootstrapData } from '../state/store';
import { resolveTradeArcs } from '../layers/trade-routes-resolver';

export function LayerMenu() {
  const state = layers.value;

  const PresetButton = ({ preset, label }: { preset: LayerPreset, label: string }) => (
    <button
      class="preset-btn"
      onClick={() => applyPreset(preset)}
      style={{
        margin: '0 4px',
        padding: '4px 8px',
        background: 'var(--bg-active)',
        border: '1px solid var(--border-medium)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        fontSize: 'var(--text-xs)'
      }}
    >
      {label}
    </button>
  );

  const Toggle = ({ id, label, color }: { id: keyof typeof state, label: string, color?: string }) => {
    const isOn = state[id];
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {color && <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />}
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{label}</span>
        </div>
        <div
          onClick={() => toggleLayer(id as any)}
          style={{
            width: 32, height: 16, borderRadius: 16,
            background: isOn ? 'var(--accent-blue)' : 'var(--bg-elevated)',
            position: 'relative', cursor: 'pointer',
            border: '1px solid var(--border-medium)'
          }}
        >
          <div style={{
            position: 'absolute', top: 1, left: isOn ? 17 : 1,
            width: 12, height: 12, borderRadius: '50%',
            background: 'var(--text-primary)',
            transition: 'left 0.2s'
          }} />
        </div>
      </div>
    );
  };

  const plugins = pluginManifests.value;

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        <PresetButton preset="full-intel" label="Full Intel" />
        <PresetButton preset="conflict-zone" label="Conflict Zone" />
        <PresetButton preset="trade-risk" label="Trade Risk" />
        <PresetButton preset="minimal" label="Minimal" />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '1px', marginBottom: '8px' }}>
          Security
        </div>
        <Toggle id="conflicts" label="Conflicts & Crises" color="var(--danger)" />
        <Toggle id="militaryBases" label="Military Installations" color="var(--info)" />
        <Toggle id="nsaZones" label="Non-State Actor Zones" color="var(--cat-security)" />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '1px', marginBottom: '8px' }}>
          Economic
        </div>
        {/* Trade Routes toggle row with disruption badge */}
        {(() => {
          const isOn = state.tradeRoutes;
          const filter = tradeRouteFilter.value;
          const data = bootstrapData.value;

          let disruptedCount = 0;
          if (isOn && data) {
            const { arcs } = resolveTradeArcs(data.tradeRoutes, data.ports, data.chokepoints);
            disruptedCount = arcs.filter(a =>
              filter.has(a.route.category as any) && a.route.status === 'disrupted'
            ).length;
          }

          const CATEGORIES = ['energy', 'container', 'bulk'] as const;

          return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--cat-economic)' }} />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Global Trade Routes</span>
                  {isOn && disruptedCount > 0 && (
                    <span style={{
                      fontSize: 'var(--text-2xs)', fontWeight: 600, fontFamily: 'var(--font-mono)',
                      color: 'var(--danger)', background: 'var(--danger-dim)',
                      padding: '1px 6px', borderRadius: 'var(--radius-full)',
                    }}>
                      {disruptedCount} disrupted
                    </span>
                  )}
                </div>
                <div
                  onClick={() => toggleLayer('tradeRoutes')}
                  style={{
                    width: 32, height: 16, borderRadius: 16,
                    background: isOn ? 'var(--accent-blue)' : 'var(--bg-elevated)',
                    position: 'relative', cursor: 'pointer',
                    border: '1px solid var(--border-medium)',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 1, left: isOn ? 17 : 1,
                    width: 12, height: 12, borderRadius: '50%',
                    background: 'var(--text-primary)', transition: 'left 0.2s',
                  }} />
                </div>
              </div>

              {/* Category chips — only visible when toggle is on */}
              {isOn && (
                <div style={{ display: 'flex', gap: '4px', marginLeft: 16, marginBottom: '4px' }}>
                  {CATEGORIES.map(cat => {
                    const active = filter.has(cat);
                    const isLastActive = active && filter.size === 1;
                    return (
                      <button
                        key={cat}
                        onClick={() => {
                          if (isLastActive) return;
                          const next = new Set(filter);
                          if (active) next.delete(cat);
                          else next.add(cat);
                          tradeRouteFilter.value = next;
                        }}
                        style={{
                          padding: '2px 8px', borderRadius: 'var(--radius-full)',
                          fontSize: 'var(--text-2xs)', fontWeight: 600,
                          fontFamily: 'var(--font-mono)', textTransform: 'capitalize',
                          cursor: isLastActive ? 'not-allowed' : 'pointer',
                          border: `1px solid ${active ? 'var(--cat-economic)' : 'var(--border-medium)'}`,
                          background: active ? 'var(--cat-economic-dim, rgba(20,184,166,0.1))' : 'transparent',
                          color: active ? 'var(--cat-economic)' : 'var(--text-tertiary)',
                          opacity: isLastActive ? 0.5 : 1,
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}
        <Toggle id="chokepoints" label="Strategic Chokepoints" color="var(--warning)" />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '1px', marginBottom: '8px' }}>
          Political
        </div>
        <Toggle id="riskHeatmap" label="National Risk Heatmap" />
        {state.riskHeatmap && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 8px 16px' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: '52px' }}>
              Opacity
            </span>
            <input
              type="range"
              min="0"
              max="100"
              value={Math.round(heatmapOpacity.value * 100)}
              onInput={(e: Event) => {
                heatmapOpacity.value = Number((e.target as HTMLInputElement).value) / 100;
              }}
              style={{
                flex: 1,
                height: '4px',
                accentColor: 'var(--accent-blue)',
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: '28px', textAlign: 'right' }}>
              {Math.round(heatmapOpacity.value * 100)}%
            </span>
          </div>
        )}
        <Toggle id="elections" label="Upcoming Elections" color="var(--cat-political)" />
      </div>

      {plugins.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', color: 'var(--text-tertiary)', letterSpacing: '1px', marginBottom: '8px' }}>
            Plugins
          </div>
          {plugins.map((plugin: { id: string; name: string; panel?: { group: string } }) => (
            <Toggle
              key={plugin.id}
              id={plugin.id as any}
              label={plugin.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
