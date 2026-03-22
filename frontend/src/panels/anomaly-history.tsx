import { h } from 'preact';
import { anomalyAlerts, selectedEntity, rightPanelOpen } from '../state/store';
import type { Anomaly } from '../state/store';

export function AnomalyHistory() {
  const alerts = anomalyAlerts.value;

  const severityColors: Record<string, string> = {
    watch: 'var(--warning)',
    alert: 'var(--danger)',
    critical: 'var(--risk-catastrophic)',
  };

  const navigateToEntity = (a: Anomaly) => {
    selectedEntity.value = { type: a.entityType, id: a.entityId };
    rightPanelOpen.value = true;
  };

  return (
    <div style={{
      background: 'rgba(var(--bg-surface-rgb, 20, 22, 28), 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md, 8px)',
      padding: '16px',
      maxHeight: '400px',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{
          fontSize: 'var(--text-xs)',
          textTransform: 'uppercase',
          letterSpacing: '1.5px',
          color: 'var(--text-tertiary)',
          fontWeight: 700,
        }}>
          Anomaly History
        </div>
        <div style={{
          background: 'var(--bg-active)',
          color: 'var(--text-secondary)',
          fontSize: 'var(--text-xs)',
          padding: '2px 8px',
          borderRadius: '10px',
          fontWeight: 600,
        }}>
          {alerts.length}
        </div>
      </div>

      {/* Scrollable list */}
      <div style={{
        overflowY: 'auto',
        flex: 1,
      }}>
        {alerts.length === 0 && (
          <div style={{
            color: 'var(--text-tertiary)',
            fontSize: 'var(--text-sm)',
            textAlign: 'center',
            padding: '24px 0',
          }}>
            No anomalies detected
          </div>
        )}

        {alerts.map((a: Anomaly, i: number) => (
          <div
            key={`${a.entityId}-${a.detectedAt}-${i}`}
            onClick={() => navigateToEntity(a)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              marginBottom: '4px',
              borderRadius: 'var(--radius-sm, 4px)',
              cursor: 'pointer',
              background: 'transparent',
              transition: 'background 0.15s',
              borderLeft: `3px solid ${severityColors[a.severity] || 'var(--border-medium)'}`,
            }}
            onMouseEnter={(e: MouseEvent) => {
              (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-active)';
            }}
            onMouseLeave={(e: MouseEvent) => {
              (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            {/* Severity badge */}
            <div style={{
              background: severityColors[a.severity] || 'var(--border-medium)',
              color: '#000',
              padding: '1px 6px',
              borderRadius: '3px',
              fontSize: '10px',
              fontWeight: 700,
              textTransform: 'uppercase',
              minWidth: '48px',
              textAlign: 'center',
            }}>
              {a.severity}
            </div>

            {/* Details */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {a.entityType.toUpperCase()}: {a.entityId}
              </div>
              <div style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-tertiary)',
                marginTop: '2px',
              }}>
                Z: {a.zScore.toFixed(1)} | baseline: {a.baselineMean.toFixed(1)} | {new Date(a.detectedAt).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
