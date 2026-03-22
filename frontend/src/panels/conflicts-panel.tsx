import { h } from 'preact';
import type { Conflict } from '../state/store';
import { Badge } from '../components/badge';

interface ConflictsPanelProps {
  conflict: Conflict;
}

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--danger)',
  ceasefire: 'var(--warning)',
  resolved: 'var(--success)',
};

export function ConflictsPanel({ conflict }: ConflictsPanelProps) {
  return (
    <div class="panel-glass" style={{ padding: '16px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Title + Status */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {conflict.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-2xs)',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              background: conflict.status === 'active' ? 'var(--danger-dim)' : conflict.status === 'ceasefire' ? 'var(--warning-dim)' : 'var(--success-dim)',
              color: STATUS_COLORS[conflict.status] || 'var(--text-secondary)',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLORS[conflict.status] || 'var(--text-secondary)', display: 'inline-block' }} />
            {conflict.status}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Day {conflict.dayCount}
          </span>
        </div>
      </div>

      {/* Casualties */}
      {conflict.casualties && conflict.casualties.length > 0 && (
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Casualties</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {conflict.casualties.map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{c.party}</span>
                <span class="mono" style={{ fontSize: 'var(--text-sm)', color: 'var(--danger)' }}>
                  {c.figure.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related Countries */}
      {conflict.relatedCountries && conflict.relatedCountries.length > 0 && (
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>Related Countries</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {conflict.relatedCountries.map((c, i) => (
              <Badge key={i} level={c} size="sm" />
            ))}
          </div>
        </div>
      )}

      {/* Coordinates */}
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        {conflict.lat.toFixed(4)}, {conflict.lng.toFixed(4)}
      </div>
    </div>
  );
}
