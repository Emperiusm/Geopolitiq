import { h } from 'preact';
import { anomalyAlerts, dismissAnomaly, selectedEntity, rightPanelOpen } from '../state/store';

interface HeaderProps {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: HeaderProps) {
  const alerts = anomalyAlerts.value;
  const current = alerts.length > 0 ? alerts[0] : null;

  const handleAlertClick = () => {
    if (!current) return;
    selectedEntity.value = { type: current.entityType, id: current.entityId };
    rightPanelOpen.value = true;
  };

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      background: 'var(--bg-glass)',
      backdropFilter: 'blur(var(--glass-blur-heavy))',
      WebkitBackdropFilter: 'blur(var(--glass-blur-heavy))',
      borderBottom: '1px solid var(--border-subtle)',
      boxShadow: 'var(--glass-shadow)',
      height: '100%',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '280px', flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32,
          background: 'var(--accent-blue)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '14px',
        }}>
          {'\u265E'}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '2px', lineHeight: 1.2, color: 'var(--text-primary)' }}>
            GAMBIT
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 500 }}>
            Global Intelligence Network
          </div>
        </div>
      </div>

      {/* Alert Banner (inline) */}
      <div style={{ flex: 1, maxWidth: '640px', margin: '0 24px' }}>
        {current && (
          <div
            onClick={handleAlertClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '6px 16px',
              background: 'var(--danger-dim)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
            }}
          >
            <span style={{ color: 'var(--danger)', fontSize: '12px' }}>{'\u26A0'}</span>
            <span style={{ color: 'var(--text-primary)', flex: 1 }}>
              <strong style={{ color: 'var(--danger)' }}>CRITICAL ALERT:</strong>
              {' '}{current.entityType.toUpperCase()}: {current.entityId} — Z-Score: {current.zScore.toFixed(1)}
            </span>
            <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', flexShrink: 0 }}>
              {current.severity}
            </span>
            <button
              onClick={(e: Event) => { e.stopPropagation(); dismissAnomaly(0); }}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '14px', padding: 0 }}
            >
              {'\u2715'}
            </button>
          </div>
        )}
      </div>

      {/* User Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '280px', justifyContent: 'flex-end', flexShrink: 0 }}>
        <button
          onClick={onSettingsClick}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: '16px' }}
          title="Settings"
        >
          {'\u2699'}
        </button>
        <div style={{ position: 'relative' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '16px' }}>{'\uD83D\uDD14'}</span>
          {alerts.length > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              width: 10, height: 10,
              background: 'var(--danger)',
              borderRadius: '50%',
              border: '2px solid var(--bg-surface)',
            }} />
          )}
        </div>
        <div style={{
          width: 32, height: 32,
          background: 'var(--bg-active)',
          borderRadius: '50%',
          border: '1px solid var(--border-medium)',
        }} />
      </div>
    </header>
  );
}
