import { h, ComponentChildren } from 'preact';

interface TooltipProps {
  x: number;
  y: number;
  children: ComponentChildren;
}

export function Tooltip({ x, y, children }: TooltipProps) {
  const offset = 12;

  return (
    <div
      class="panel-glass"
      style={{
        position: 'absolute',
        left: `${x + offset}px`,
        top: `${y + offset}px`,
        padding: '8px 12px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        fontSize: 'var(--text-xs)',
        color: 'var(--text-primary)',
        pointerEvents: 'none',
        zIndex: 'var(--z-tooltip)',
        maxWidth: '240px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
}
