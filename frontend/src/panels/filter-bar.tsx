import { h } from 'preact';
import { signal } from '@preact/signals';
import { searchQuery, selectCountry, selectedEntity, rightPanelOpen } from '../state/store';
import { api } from '../api/client';
import { flyTo } from '../map/deck-map';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';

export type FilterCategory = 'conflict' | 'security' | 'economic' | 'cyber' | 'maritime' | 'political';

export const activeFilters = signal<Set<FilterCategory>>(new Set());

const CATEGORIES: { id: FilterCategory; label: string; color: string }[] = [
  { id: 'conflict', label: 'Conflict', color: 'var(--cat-conflict)' },
  { id: 'security', label: 'Security', color: 'var(--cat-security)' },
  { id: 'economic', label: 'Economic', color: 'var(--cat-economic)' },
  { id: 'cyber', label: 'Cyber', color: 'var(--cat-cyber)' },
  { id: 'maritime', label: 'Maritime', color: 'var(--cat-maritime)' },
  { id: 'political', label: 'Political', color: 'var(--cat-political)' },
];

export function FilterBar() {
  const filters = activeFilters.value;
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function toggle(id: FilterCategory) {
    const next = new Set(filters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    activeFilters.value = next;
  }

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.search(query);
        setResults(res ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

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

  function handleSelect(item: any) {
    if (item.type === 'country') {
      selectCountry(item);
    } else {
      selectedEntity.value = { type: item.type, id: item._id };
      rightPanelOpen.value = true;
    }
    const lng = item.lng ?? item.longitude;
    const lat = item.lat ?? item.latitude;
    if (typeof lng === 'number' && typeof lat === 'number') {
      flyTo(lng, lat);
    }
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} style={{
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 'var(--z-presets)',
      width: '100%',
      maxWidth: '560px',
      pointerEvents: 'auto',
    }}>
      <div style={{
        background: 'var(--bg-glass)',
        backdropFilter: 'blur(var(--glass-blur-heavy))',
        WebkitBackdropFilter: 'blur(var(--glass-blur-heavy))',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--glass-shadow)',
        padding: '10px 12px',
      }}>
        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <span style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            color: 'var(--text-tertiary)', fontSize: '12px', pointerEvents: 'none',
          }}>
            {'\uD83D\uDD0D'}
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            onFocus={() => { if (results.length > 0) setOpen(true); }}
            onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); } }}
            style={{
              width: '100%',
              padding: '6px 12px 6px 30px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {loading && (
            <div style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              width: '14px', height: '14px',
              border: '2px solid var(--border-medium)', borderTopColor: 'var(--text-primary)',
              borderRadius: '50%', animation: 'spin 0.6s linear infinite',
            }} />
          )}
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {CATEGORIES.map(cat => {
            const isActive = filters.has(cat.id);
            return (
              <button
                key={cat.id}
                class={`filter-chip ${isActive ? 'filter-chip--active' : ''}`}
                onClick={() => toggle(cat.id)}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search results dropdown */}
      {open && query.length >= 2 && (
        <div
          class="panel-glass"
          style={{
            marginTop: '4px',
            maxHeight: '320px',
            overflowY: 'auto',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-medium)',
            padding: '4px 0',
          }}
        >
          {results.length === 0 && !loading && (
            <div style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
              No results for "{query}"
            </div>
          )}
          {results.map((item: any, i: number) => (
            <button
              key={i}
              onClick={() => handleSelect(item)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                padding: '8px 12px', background: 'transparent', border: 'none',
                color: 'var(--text-primary)', fontSize: 'var(--text-sm)',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '1.1em', flexShrink: 0 }}>{item.flag ?? '\uD83D\uDD0D'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.name ?? item.title ?? item._id}
                </div>
              </div>
              {item.risk && (
                <span style={{
                  fontSize: 'var(--text-xs)', padding: '2px 6px', borderRadius: 'var(--radius-sm)',
                  background: `var(--risk-${item.risk}-bg, var(--bg-hover))`,
                  color: `var(--risk-${item.risk}, var(--text-secondary))`,
                  textTransform: 'capitalize', flexShrink: 0,
                }}>
                  {item.risk}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
