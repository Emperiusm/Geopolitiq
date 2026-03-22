import { h } from 'preact';

export interface Chokepoint {
  _id: string;
  name: string;
  lat: number;
  lng: number;
  transitStatus: 'open' | 'contested' | 'blocked';
  affectedRoutes: string[];
  economicImpact: { metric: string; value: string }[];
  alternativeRoutes: string[];
}

interface ChokepointsPanelProps {
  chokepoint: Chokepoint;
}

const TRANSIT_COLORS: Record<string, { bg: string; fg: string; pct: number }> = {
  open: { bg: 'var(--success-dim)', fg: 'var(--success)', pct: 100 },
  contested: { bg: 'var(--warning-dim)', fg: 'var(--warning)', pct: 50 },
  blocked: { bg: 'var(--danger-dim)', fg: 'var(--danger)', pct: 10 },
};

export function ChokepointsPanel({ chokepoint }: ChokepointsPanelProps) {
  const transit = TRANSIT_COLORS[chokepoint.transitStatus] || TRANSIT_COLORS.open;

  return (
    <div class="panel-glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Name */}
      <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
        {chokepoint.name}
      </div>

      {/* Transit Status Bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Transit Status</span>
          <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: transit.fg }}>
            {chokepoint.transitStatus}
          </span>
        </div>
        <div style={{ height: '6px', borderRadius: 'var(--radius-full)', background: 'var(--bg-hover)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${transit.pct}%`, borderRadius: 'var(--radius-full)', background: transit.fg, transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* Affected Trade Routes */}
      {chokepoint.affectedRoutes && chokepoint.affectedRoutes.length > 0 && (
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Affected Trade Routes</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {chokepoint.affectedRoutes.map((r, i) => (
              <div key={i} style={{ padding: '6px 10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                {r}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Economic Impact */}
      {chokepoint.economicImpact && chokepoint.economicImpact.length > 0 && (
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Economic Impact</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {chokepoint.economicImpact.map((item, i) => (
              <div key={i} style={{ padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', marginBottom: '2px' }}>{item.metric}</div>
                <div class="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative Routes */}
      {chokepoint.alternativeRoutes && chokepoint.alternativeRoutes.length > 0 && (
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Alternative Routes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {chokepoint.alternativeRoutes.map((r, i) => (
              <span key={i} style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', background: 'var(--accent-blue-dim)', color: 'var(--accent-blue)', fontSize: 'var(--text-2xs)', fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
