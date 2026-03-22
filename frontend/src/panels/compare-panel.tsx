import { h } from 'preact';
import { compareCountries, removeFromCompare, selectCountry, selectedEntity, rightPanelOpen } from '../state/store';
import { useEffect, useState } from 'preact/hooks';
import { api } from '../api/client';

// ── Types ───────────────────────────────────────────────────

interface SharedNode {
  id: string;
  type: string;
  label: string;
  sharedBy: string[]; // country IDs that share this node
}

// ── Risk color helper ───────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  catastrophic: '#dc2626',
  extreme:      '#ea580c',
  severe:       '#d97706',
  stormy:       '#ca8a04',
  cloudy:       '#6b7280',
  clear:        '#16a34a',
};

function riskColor(risk: string): string {
  return RISK_COLORS[risk] ?? 'var(--text-secondary)';
}

// ── Intersection logic ──────────────────────────────────────

function computeSharedConnections(
  results: { countryId: string; nodes: any[] }[],
): SharedNode[] {
  // Map: nodeId -> { node, countryIds[] }
  const nodeMap = new Map<string, { node: any; countryIds: Set<string> }>();

  for (const { countryId, nodes } of results) {
    if (!nodes) continue;
    for (const n of nodes) {
      const key = n._id ?? n.id ?? `${n.type}:${n.label}`;
      if (!nodeMap.has(key)) {
        nodeMap.set(key, { node: n, countryIds: new Set() });
      }
      nodeMap.get(key)!.countryIds.add(countryId);
    }
  }

  // Keep only nodes that appear in 2+ country networks
  const shared: SharedNode[] = [];
  for (const [id, { node, countryIds }] of nodeMap) {
    if (countryIds.size >= 2) {
      shared.push({
        id,
        type: node.type ?? 'entity',
        label: node.label ?? node.name ?? id,
        sharedBy: Array.from(countryIds),
      });
    }
  }

  return shared.sort((a, b) => b.sharedBy.length - a.sharedBy.length);
}

// ── Component ───────────────────────────────────────────────

export function ComparePanel() {
  const countries = compareCountries.value;
  const [sharedConnections, setSharedConnections] = useState<SharedNode[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch graph connections and compute intersections
  useEffect(() => {
    if (countries.length < 2) {
      setSharedConnections([]);
      return;
    }

    let cancelled = false;

    async function fetchShared() {
      setLoading(true);
      try {
        const promises = countries.map(async (c) => {
          const result = await api.graphConnections(`country:${c._id}`, 1);
          return { countryId: c._id, nodes: result?.nodes ?? [] };
        });
        const results = await Promise.all(promises);

        if (!cancelled) {
          const shared = computeSharedConnections(results);
          setSharedConnections(shared);
        }
      } catch (e) {
        console.error('Failed to load compare network', e);
        if (!cancelled) setSharedConnections([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchShared();
    return () => { cancelled = true; };
  }, [countries]);

  // Close panel when no countries selected
  if (countries.length === 0) return null;

  return (
    <div
      class="panel-glass panel-border-top"
      style={{
        position: 'fixed',
        bottom: 0,
        left: '280px',
        right: 0,
        maxHeight: '340px',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        zIndex: 900,
        borderTop: '1px solid var(--border-medium)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>
          Comparing {countries.length} {countries.length === 1 ? 'country' : 'countries'}
        </span>
        {sharedConnections.length > 0 && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {sharedConnections.length} shared connection{sharedConnections.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Cards row */}
      <div style={{ display: 'flex', gap: '12px', flex: 1, minHeight: 0, overflow: 'auto' }}>
        {countries.map((c) => (
          <div
            key={c._id}
            style={{
              flex: 1,
              minWidth: '180px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              position: 'relative',
            }}
          >
            {/* Remove button */}
            <button
              onClick={() => removeFromCompare(c._id)}
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                fontSize: '14px',
                lineHeight: 1,
                padding: '2px',
              }}
              title="Remove from comparison"
            >
              \u2715
            </button>

            {/* Flag + Name */}
            <div
              style={{ cursor: 'pointer' }}
              onClick={() => selectCountry(c)}
            >
              <div style={{ fontSize: '1.6em', marginBottom: '4px' }}>{c.flag}</div>
              <div style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
                {c.name}
              </div>
            </div>

            {/* Risk badge */}
            <div
              style={{
                display: 'inline-flex',
                alignSelf: 'flex-start',
                padding: '2px 8px',
                borderRadius: 'var(--radius-sm)',
                background: `${riskColor(c.risk)}22`,
                color: riskColor(c.risk),
                fontSize: 'var(--text-xs)',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {c.risk}
            </div>

            {/* Details */}
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
              {c.region && <div>{c.region}</div>}
              {c.leader && <div>Leader: {c.leader}</div>}
            </div>

            {/* Analysis summary */}
            {c.analysis?.what && (
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text-tertiary)',
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {c.analysis.what}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Stat comparison grid (risk side-by-side) */}
      {countries.length >= 2 && (
        <div
          style={{
            marginTop: '12px',
            padding: '10px 12px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '6px',
            }}
          >
            Risk Comparison
          </div>
          <div style={{ display: 'flex', gap: '16px' }}>
            {countries.map((c) => (
              <div key={c._id} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: riskColor(c.risk),
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
                  {c.flag} {c.name}
                </span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: riskColor(c.risk),
                    textTransform: 'capitalize',
                  }}
                >
                  {c.risk}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared connections */}
      {countries.length >= 2 && (
        <div style={{ marginTop: '10px', flexShrink: 0 }}>
          {loading ? (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center', padding: '8px' }}>
              Loading shared connections...
            </div>
          ) : sharedConnections.length > 0 ? (
            <div>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '6px',
                }}
              >
                Shared Connections ({sharedConnections.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {sharedConnections.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => {
                      selectCountry(null);
                      selectedEntity.value = { type: node.type, id: node.id };
                      rightPanelOpen.value = true;
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-secondary)',
                      fontSize: 'var(--text-xs)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                    title={`Shared by ${node.sharedBy.length} countries`}
                  >
                    <span style={{ opacity: 0.7 }}>
                      {node.sharedBy.length}x
                    </span>
                    {node.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textAlign: 'center', padding: '4px' }}>
              No shared connections found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
