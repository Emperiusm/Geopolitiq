import { h } from 'preact';
import type { RiskLevel } from '../state/store';

interface BadgeProps {
  level: RiskLevel | string;
  size?: 'sm' | 'md';
}

const RISK_LEVELS = ['catastrophic', 'extreme', 'severe', 'stormy', 'cloudy', 'clear'];

export function Badge({ level, size = 'sm' }: BadgeProps) {
  const isRisk = RISK_LEVELS.includes(level);

  const bg = isRisk ? `var(--risk-${level}-bg)` : 'var(--accent-blue-dim)';
  const fg = isRisk ? `var(--risk-${level})` : 'var(--accent-blue)';

  const padding = size === 'sm' ? '1px 6px' : '2px 10px';
  const fontSize = size === 'sm' ? 'var(--text-2xs)' : 'var(--text-xs)';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding,
        borderRadius: 'var(--radius-sm)',
        background: bg,
        color: fg,
        fontSize,
        fontWeight: 600,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {level}
    </span>
  );
}
