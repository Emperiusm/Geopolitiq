import { h } from 'preact';
import { signal } from '@preact/signals';

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

  function toggle(id: FilterCategory) {
    const next = new Set(filters);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    activeFilters.value = next;
  }

  return (
    <div style={{
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
        padding: '8px 12px',
      }}>
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
    </div>
  );
}
