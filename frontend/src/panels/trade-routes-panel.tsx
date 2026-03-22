import { h } from 'preact';
import { useRef, useCallback, useState } from 'preact/hooks';
import type { ResolvedArc, ResolvedPort, WaypointData } from '../layers/trade-routes-resolver';

interface TradeRoutesPanelProps {
  route: any | null;
  port: ResolvedPort | null;
  allArcs: ResolvedArc[];
  waypoints: WaypointData[];
  onClose: () => void;
  onSelectRoute: (route: any) => void;
}

const RISK_STYLES: Record<string, { bg: string; fg: string }> = {
  low:  { bg: 'var(--success-dim)',          fg: 'var(--success)' },
  high: { bg: 'var(--danger-dim)',           fg: 'var(--danger)' },
};

const CATEGORY_COLORS: Record<string, string> = {
  energy:    'var(--accent-amber)',
  container: 'var(--accent-cyan)',
  bulk:      'var(--text-secondary)',
};

export function TradeRoutesPanel({ route, port, allArcs, waypoints, onClose, onSelectRoute }: TradeRoutesPanelProps) {
  const [pos, setPos] = useState({ x: 20, y: 80 });
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const onHeaderMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    dragging.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      setPos({
        x: dragging.current.origX + ev.clientX - dragging.current.startX,
        y: dragging.current.origY + ev.clientY - dragging.current.startY,
      });
    };
    const onUp = () => {
      dragging.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [pos]);

  const panelStyle: h.JSX.CSSProperties = {
    position: 'fixed',
    left: pos.x,
    top: pos.y,
    width: 340,
    zIndex: 'var(--z-panel)' as any,
    background: 'var(--bg-glass)',
    backdropFilter: 'blur(var(--glass-blur))',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--glass-shadow)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  const headerStyle: h.JSX.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderBottom: '1px solid var(--border-subtle)',
    cursor: 'grab',
    userSelect: 'none',
    flexShrink: 0,
  };

  const bodyStyle: h.JSX.CSSProperties = {
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
  };

  const Badge = ({ label, color }: { label: string; color: string }) => (
    <span style={{
      display: 'inline-block', padding: '2px 8px',
      borderRadius: 'var(--radius-full)',
      background: `${color}20`, color,
      fontSize: 'var(--text-2xs)', fontWeight: 600,
      fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
    }}>
      {label}
    </span>
  );

  return (
    <div style={panelStyle}>
      {/* Draggable header */}
      <div style={headerStyle} onMouseDown={onHeaderMouseDown as any}>
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {route ? 'Trade Route' : 'Port'}
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      <div style={bodyStyle}>
        {route && (
          <>
            {/* Route name */}
            <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>
              {route.name}
            </div>

            {/* Source → Destination */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ flex: 1, padding: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>From</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{route.source}</div>
              </div>
              <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>→</span>
              <div style={{ flex: 1, padding: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>To</div>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{route.destination}</div>
              </div>
            </div>

            {/* Volume */}
            {route.volumeDesc && (
              <div style={{ padding: '8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>Volume</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{route.volumeDesc}</div>
              </div>
            )}

            {/* Badges */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {route.category && (
                <Badge label={route.category} color={CATEGORY_COLORS[route.category] ?? 'var(--text-secondary)'} />
              )}
              {route.disruptionRisk && (
                <Badge
                  label={route.disruptionRisk === 'high' ? 'Disrupted' : 'Active'}
                  color={RISK_STYLES[route.disruptionRisk]?.fg ?? 'var(--text-secondary)'}
                />
              )}
            </div>

            {/* Waypoints */}
            {waypoints.length > 0 && (
              <div>
                <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Chokepoints
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {waypoints.map(wp => (
                    <div key={wp._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)' }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>{wp.name}</span>
                      <Badge
                        label={wp.status}
                        color={wp.status === 'disrupted' ? 'var(--danger)' : 'var(--success)'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {port && (
          <>
            {/* Port name */}
            <div>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--text-primary)' }}>{port.name}</div>
              {port.country && (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{port.country}</div>
              )}
            </div>

            {/* Routes through this port */}
            {(() => {
              const portRoutes = allArcs.filter(a => a.fromPortId === port._id || a.toPortId === port._id);
              if (portRoutes.length === 0) return null;
              return (
                <div>
                  <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Routes ({portRoutes.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {portRoutes.map(a => (
                      <div
                        key={a.route._id}
                        onClick={() => onSelectRoute(a.route)}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                          background: 'var(--bg-hover)', cursor: 'pointer',
                          border: '1px solid transparent',
                        }}
                        onMouseEnter={(e: any) => e.currentTarget.style.borderColor = 'var(--border-bright)'}
                        onMouseLeave={(e: any) => e.currentTarget.style.borderColor = 'transparent'}
                      >
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>{a.route.name}</span>
                        <Badge
                          label={a.route.status === 'disrupted' ? 'Disrupted' : 'Active'}
                          color={a.route.status === 'disrupted' ? 'var(--danger)' : 'var(--success)'}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
