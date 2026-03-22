import { h } from 'preact';
import { layers, toggleLayer, applyPreset, LayerPreset, pluginManifests, heatmapOpacity } from '../state/store';

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
        <Toggle id="tradeRoutes" label="Global Trade Routes" color="var(--cat-economic)" />
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
