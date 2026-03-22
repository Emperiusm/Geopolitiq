import { h } from 'preact';

export interface NonStateActor {
  _id: string;
  name: string;
  ideology: string;
  territory: string;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface NsaPanelProps {
  nsa: NonStateActor;
}

const THREAT_STYLES: Record<string, { bg: string; fg: string }> = {
  low: { bg: 'var(--success-dim)', fg: 'var(--success)' },
  medium: { bg: 'var(--warning-dim)', fg: 'var(--warning)' },
  high: { bg: 'var(--danger-dim)', fg: 'var(--danger)' },
  critical: { bg: 'var(--risk-catastrophic-bg)', fg: 'var(--risk-catastrophic)' },
};

export function NsaPanel({ nsa }: NsaPanelProps) {
  const threat = THREAT_STYLES[nsa.threatLevel] || THREAT_STYLES.medium;

  return (
    <div class="panel-glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Name */}
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
        {nsa.name}
      </div>

      {/* Ideology Tag */}
      <div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>Ideology</div>
        <span style={{
          display: 'inline-flex',
          padding: '2px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--accent-blue-dim)',
          color: 'var(--accent-blue)',
          fontSize: 'var(--text-2xs)',
          fontWeight: 600,
          fontFamily: 'var(--font-mono)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}>
          {nsa.ideology}
        </span>
      </div>

      {/* Territory */}
      <div style={{ padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
        <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Territory</div>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{nsa.territory}</div>
      </div>

      {/* Threat Level */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: threat.bg, borderRadius: 'var(--radius-sm)', border: `1px solid ${threat.fg}20` }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Threat Level</span>
        <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: threat.fg }}>
          {nsa.threatLevel}
        </span>
      </div>
    </div>
  );
}
