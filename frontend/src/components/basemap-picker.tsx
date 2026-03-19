import { h } from 'preact';
import { useState, useEffect, useRef } from 'preact/hooks';
import { basemap, setBasemap, type BasemapId } from '../state/store';
import { BASEMAP_LABELS, BASEMAP_THUMBNAILS } from '../map/basemap-styles';

const BASEMAP_IDS: BasemapId[] = ['intel', 'satellite', 'terrain', 'light', 'oceanic', 'political'];

export function BasemapPicker() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Popover grid */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: '44px',
            right: 0,
            background: 'rgba(12, 12, 20, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            width: '264px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            zIndex: 100,
          }}
        >
          {BASEMAP_IDS.map((id) => {
            const active = basemap.value === id;
            return (
              <button
                key={id}
                onClick={() => setBasemap(id)}
                title={BASEMAP_LABELS[id]}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: '76px',
                    height: '52px',
                    borderRadius: '6px',
                    background: BASEMAP_THUMBNAILS[id],
                    border: active ? '2px solid #6366f1' : '2px solid transparent',
                    position: 'relative',
                    transition: 'border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                  }}
                >
                  {active && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '3px',
                        right: '3px',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#6366f1',
                      }}
                    />
                  )}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: active ? '#e2e8f0' : '#94a3b8',
                    marginTop: '4px',
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: active ? 600 : 400,
                  }}
                >
                  {BASEMAP_LABELS[id]}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        title="Basemap"
        style={{
          width: '36px',
          height: '36px',
          background: 'rgba(12, 12, 20, 0.9)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          padding: 0,
          transition: 'border-color 0.15s ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.3)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)'; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" stroke-width="2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      </button>
    </div>
  );
}
