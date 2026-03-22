import { h } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import { searchQuery, selectCountry, selectedEntity, rightPanelOpen } from '../state/store';
import { api } from '../api/client';
import { flyTo } from '../map/deck-map';

// ── Type icons by entity type ───────────────────────────────

const TYPE_META: Record<string, { icon: string; label: string }> = {
  country:    { icon: '\uD83C\uDF0D', label: 'Countries' },
  conflict:   { icon: '\u2694\uFE0F',  label: 'Conflicts' },
  chokepoint: { icon: '\u2693',  label: 'Chokepoints' },
  base:       { icon: '\uD83C\uDFEA', label: 'Military Bases' },
  nsa:        { icon: '\uD83D\uDC65', label: 'Non-State Actors' },
  election:   { icon: '\uD83D\uDDF3\uFE0F',  label: 'Elections' },
  port:       { icon: '\uD83D\uDEA2', label: 'Ports' },
  trade:      { icon: '\uD83D\uDCE6', label: 'Trade Routes' },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { icon: '\uD83D\uDD0D', label: type.charAt(0).toUpperCase() + type.slice(1) };
}

// ── Group results by type ───────────────────────────────────

function groupByType(results: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const item of results) {
    const t = item.type ?? 'unknown';
    if (!groups[t]) groups[t] = [];
    groups[t].push(item);
  }
  return groups;
}

// ── Component ───────────────────────────────────────────────

export function SearchBar() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const q = searchQuery.value;
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.search(q);
        setResults(res ?? []);
        setOpen(true);
      } catch (e) {
        console.error('Search failed', e);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery.value]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  }, []);

  // Handle result click
  function handleSelect(item: any) {
    if (item.type === 'country') {
      selectCountry(item);
    } else {
      selectedEntity.value = { type: item.type, id: item._id };
      rightPanelOpen.value = true;
    }
    // Fly camera to entity coordinates if available
    const lng = item.lng ?? item.longitude;
    const lat = item.lat ?? item.latitude;
    if (typeof lng === 'number' && typeof lat === 'number') {
      flyTo(lng, lat);
    }
    setOpen(false);
    searchQuery.value = '';
  }

  const grouped = groupByType(results);
  const groupKeys = Object.keys(grouped);
  const hasResults = results.length > 0;

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search regions or countries..."
          value={searchQuery.value}
          onInput={(e) => {
            searchQuery.value = (e.target as HTMLInputElement).value;
          }}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            padding: '8px 32px 8px 12px',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {loading && (
          <div
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '14px',
              height: '14px',
              border: '2px solid var(--border-medium)',
              borderTopColor: 'var(--text-primary)',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }}
          />
        )}
      </div>

      {/* Dropdown */}
      {open && searchQuery.value.length >= 2 && (
        <div
          class="panel-glass"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            maxHeight: '400px',
            overflowY: 'auto',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-medium)',
            zIndex: 1000,
            padding: '4px 0',
          }}
        >
          {!hasResults && !loading && (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                color: 'var(--text-tertiary)',
                fontSize: 'var(--text-sm)',
              }}
            >
              No results for "{searchQuery.value}"
            </div>
          )}

          {groupKeys.map((type) => {
            const meta = getTypeMeta(type);
            const items = grouped[type];
            return (
              <div key={type}>
                {/* Group header */}
                <div
                  style={{
                    padding: '6px 12px 4px',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--text-tertiary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {meta.label}
                </div>

                {/* Items */}
                {items.map((item: any) => (
                  <button
                    key={item._id}
                    onClick={() => handleSelect(item)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      padding: '8px 12px',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-sm)',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <span style={{ fontSize: '1.1em', flexShrink: 0 }}>
                      {item.flag ?? meta.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.name ?? item.title ?? item._id}
                      </div>
                      {item.region && (
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                          {item.region}
                        </div>
                      )}
                    </div>
                    {item.risk && (
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                          background: `var(--risk-${item.risk}-bg, var(--bg-hover))`,
                          color: `var(--risk-${item.risk}, var(--text-secondary))`,
                          textTransform: 'capitalize',
                          flexShrink: 0,
                        }}
                      >
                        {item.risk}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Spinner keyframe (injected once) */}
      <style>{`
        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
