import { h } from 'preact';
import { useEffect } from 'preact/hooks';
import { anomalyAlerts, dismissAnomaly, selectedEntity, rightPanelOpen } from '../state/store';

export function AnomalyBanner() {
  const alerts = anomalyAlerts.value;

  const current = alerts.length > 0 ? alerts[0] : null;

  // Auto-dismiss watch-level alerts after 10 seconds
  useEffect(() => {
    if (!current || current.severity !== 'watch') return;

    const timer = setTimeout(() => {
      dismissAnomaly(0);
    }, 10_000);

    return () => clearTimeout(timer);
  }, [current]);

  if (!current) return null;

  const colors = {
    watch: 'var(--warning)',
    alert: 'var(--danger)',
    critical: 'var(--risk-catastrophic)'
  };

  const bgColors = {
    watch: 'var(--warning-dim)',
    alert: 'var(--danger-dim)',
    critical: 'var(--risk-catastrophic-bg)'
  };

  const color = colors[current.severity];
  const bg = bgColors[current.severity];

  const handleBannerClick = () => {
    selectedEntity.value = { type: current.entityType, id: current.entityId };
    rightPanelOpen.value = true;
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 16px',
      background: bg,
      borderBottom: `1px solid ${color}`,
      boxShadow: `0 0 10px ${bg}`,
      width: '100%',
      height: '100%',
      cursor: 'pointer'
    }}
    onClick={handleBannerClick}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          background: color,
          color: '#000',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          textTransform: 'uppercase'
        }}>
          {current.severity}
        </div>
        <div style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>
          {current.entityType.toUpperCase()}: {current.entityId} — Z-Score: {current.zScore.toFixed(1)}
        </div>
      </div>
      <button
        onClick={(e: Event) => { e.stopPropagation(); dismissAnomaly(0); }}
        style={{ background: 'transparent', border: 'none', color, cursor: 'pointer' }}
      >
        ✕
      </button>
    </div>
  );
}
