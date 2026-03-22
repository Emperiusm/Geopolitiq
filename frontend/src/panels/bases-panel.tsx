import { h } from 'preact';

export interface MilitaryBase {
  _id: string;
  name: string;
  country: string;
  countryFlag: string;
  type: string;
  lat: number;
  lng: number;
  operationalStatus: 'active' | 'standby' | 'decommissioned';
}

interface BasesPanelProps {
  base: MilitaryBase;
}

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  active: { bg: 'var(--success-dim)', fg: 'var(--success)' },
  standby: { bg: 'var(--warning-dim)', fg: 'var(--warning)' },
  decommissioned: { bg: 'var(--bg-hover)', fg: 'var(--text-tertiary)' },
};

export function BasesPanel({ base }: BasesPanelProps) {
  const status = STATUS_STYLES[base.operationalStatus] || STATUS_STYLES.standby;

  return (
    <div class="panel-glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header with flag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: 'var(--text-2xl)' }}>{base.countryFlag}</span>
        <div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{base.name}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{base.country}</div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Type</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' }}>{base.type}</div>
        </div>
        <div style={{ padding: '10px', background: status.bg, borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Status</div>
          <div style={{ fontSize: 'var(--text-sm)', color: status.fg, fontWeight: 600, textTransform: 'capitalize', fontFamily: 'var(--font-mono)' }}>
            {base.operationalStatus}
          </div>
        </div>
      </div>

      {/* Coordinates */}
      <div style={{ padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
        <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Coordinates</div>
        <div class="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
          {base.lat.toFixed(4)}, {base.lng.toFixed(4)}
        </div>
      </div>
    </div>
  );
}
