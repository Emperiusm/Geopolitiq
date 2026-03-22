import { h } from 'preact';

export interface Election {
  _id: string;
  country: string;
  countryFlag: string;
  date: string;
  type: string;
  candidates: { name: string; party: string; polling?: number }[];
  riskAssessment: 'low' | 'medium' | 'high' | 'critical';
}

interface ElectionsPanelProps {
  election: Election;
}

const RISK_STYLES: Record<string, { bg: string; fg: string }> = {
  low: { bg: 'var(--success-dim)', fg: 'var(--success)' },
  medium: { bg: 'var(--warning-dim)', fg: 'var(--warning)' },
  high: { bg: 'var(--danger-dim)', fg: 'var(--danger)' },
  critical: { bg: 'var(--risk-catastrophic-bg)', fg: 'var(--risk-catastrophic)' },
};

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function ElectionsPanel({ election }: ElectionsPanelProps) {
  const risk = RISK_STYLES[election.riskAssessment] || RISK_STYLES.low;
  const countdown = daysUntil(election.date);
  const isPast = countdown === 0 && new Date(election.date) < new Date();

  return (
    <div class="panel-glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Country + Flag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: 'var(--text-2xl)' }}>{election.countryFlag}</span>
        <div>
          <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{election.country}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{election.type} Election</div>
        </div>
      </div>

      {/* Date + Countdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div style={{ padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Date</div>
          <div class="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>
            {new Date(election.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        </div>
        <div style={{ padding: '10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '2px' }}>Countdown</div>
          <div class="mono" style={{ fontSize: 'var(--text-sm)', color: isPast ? 'var(--text-tertiary)' : 'var(--accent-cyan)', fontWeight: 600 }}>
            {isPast ? 'Completed' : `${countdown} days`}
          </div>
        </div>
      </div>

      {/* Key Candidates */}
      {election.candidates && election.candidates.length > 0 && (
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Key Candidates</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {election.candidates.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 600 }}>{c.name}</div>
                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)' }}>{c.party}</div>
                </div>
                {c.polling != null && (
                  <span class="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--accent-cyan)' }}>
                    {c.polling}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: risk.bg, borderRadius: 'var(--radius-sm)', border: `1px solid ${risk.fg}20` }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Risk Assessment</span>
        <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 600, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', color: risk.fg }}>
          {election.riskAssessment}
        </span>
      </div>
    </div>
  );
}
