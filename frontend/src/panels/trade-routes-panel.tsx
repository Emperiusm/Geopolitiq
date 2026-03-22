import { h } from 'preact';

export interface TradeRoute {
  _id: string;
  name: string;
  source: string;
  destination: string;
  category: string;
  volumePerDay: number;
  volumeUnit: string;
  disruptionRisk: 'low' | 'medium' | 'high' | 'critical';
  relatedChokepoints: string[];
}

interface TradeRoutesPanelProps {
  route: TradeRoute;
}

const RISK_STYLES: Record<string, { bg: string; fg: string }> = {
  low: { bg: 'var(--success-dim)', fg: 'var(--success)' },
  medium: { bg: 'var(--warning-dim)', fg: 'var(--warning)' },
  high: { bg: 'var(--danger-dim)', fg: 'var(--danger)' },
  critical: { bg: 'var(--risk-catastrophic-bg)', fg: 'var(--risk-catastrophic)' },
};

export function TradeRoutesPanel({ route }: TradeRoutesPanelProps) {
  const risk = RISK_STYLES[route.disruptionRisk] || RISK_STYLES.low;

  return (
    <div class="panel-glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Name */}
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
        {route.name}
      </div>

      {/* Source / Destination */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ flex: 1, padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Source</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>{route.source}</div>
        </div>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>&rarr;</span>
        <div style={{ flex: 1, padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Destination</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>{route.destination}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Category</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 600, textTransform: 'capitalize' }}>{route.category}</div>
        </div>
        <div style={{ padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Volume / Day</div>
          <div class="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>
            {route.volumePerDay.toLocaleString()} {route.volumeUnit}
          </div>
        </div>
      </div>

      {/* Disruption Risk */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: risk.bg, borderRadius: 'var(--radius-sm)', border: `1px solid ${risk.fg}20` }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Disruption Risk</span>
        <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: risk.fg }}>
          {route.disruptionRisk}
        </span>
      </div>

      {/* Related Chokepoints */}
      {route.relatedChokepoints && route.relatedChokepoints.length > 0 && (
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Related Chokepoints</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {route.relatedChokepoints.map((cp, i) => (
              <span key={i} style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--accent-cyan-dim)', color: 'var(--accent-cyan)', fontSize: 'var(--text-2xs)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                {cp}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
