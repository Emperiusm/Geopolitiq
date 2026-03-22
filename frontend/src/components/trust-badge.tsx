import { h } from 'preact';

interface TrustBadgeProps {
  score: number;
  sourceTier: string;
}

export function TrustBadge({ score, sourceTier }: TrustBadgeProps) {
  let bg: string;
  let fg: string;
  let label: string;

  if (score >= 0.7) {
    bg = 'var(--success-dim)';
    fg = 'var(--success)';
    label = 'High Trust';
  } else if (score >= 0.4) {
    bg = 'var(--warning-dim)';
    fg = 'var(--warning)';
    label = 'Medium Trust';
  } else {
    bg = 'var(--danger-dim)';
    fg = 'var(--danger)';
    label = 'Low Trust';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: '2px 8px',
        borderRadius: 'var(--radius-full)',
        background: bg,
        color: fg,
        fontSize: 'var(--text-2xs)',
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {label} &middot; {sourceTier}
    </span>
  );
}
