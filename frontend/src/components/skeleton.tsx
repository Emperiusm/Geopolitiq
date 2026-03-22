import { h } from 'preact';

export function Skeleton({ width = '100%', height = '20px', borderRadius = '4px', style = {} }: any) {
  return (
    <div style={{
      width, height, borderRadius,
      background: 'var(--bg-elevated)',
      backgroundImage: 'linear-gradient(90deg, var(--bg-elevated) 0px, var(--bg-hover) 40px, var(--bg-elevated) 80px)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite linear',
      ...style
    }} />
  );
}

// Ensure the shimmer animation exists globally or inject it here
if (typeof document !== 'undefined') {
  if (!document.getElementById('skeleton-anim')) {
    const style = document.createElement('style');
    style.id = 'skeleton-anim';
    style.innerHTML = `
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `;
    document.head.appendChild(style);
  }
}
