import { h } from 'preact';

interface AISynthesisProps {
  analysis: {
    clusterId: string;
    summary: string;
    escalationSignal?: string;
  };
}

/** Map escalation signal to numeric percentage and color */
function escalationConfig(signal?: string): { pct: number; color: string; label: string } {
  switch ((signal || '').toLowerCase()) {
    case 'critical':
      return { pct: 95, color: '#ef4444', label: 'Critical' };
    case 'high':
      return { pct: 75, color: '#f97316', label: 'High' };
    case 'moderate':
      return { pct: 50, color: '#f59e0b', label: 'Moderate' };
    case 'low':
    default:
      return { pct: 25, color: '#22c55e', label: 'Low' };
  }
}

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
        <path d={arc(startAngle, 0)} fill="none" stroke="var(--bg-active)" stroke-width="6" stroke-linecap="round" />
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
