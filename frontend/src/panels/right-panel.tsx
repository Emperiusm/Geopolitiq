import { h } from 'preact';
import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import {
  selectedEntity,
  selectedCountry,
  selectCountry,
  userSettings,
  bootstrapData,
  graphConnections,
  selectTradeRoute,
  type Conflict,
} from '../state/store';
import { api } from '../api/client';
import { Sparkline } from '../components/sparkline';
import { Badge } from '../components/badge';
import { ConflictsPanel } from './conflicts-panel';
import { ChokepointsPanel } from './chokepoints-panel';
import { BasesPanel } from './bases-panel';
import { NsaPanel } from './nsa-panel';
import { ElectionsPanel } from './elections-panel';
import { NewsFeed } from './news-feed';

// ── Local state ──────────────────────────────────────────────

type Tab = 'overview' | 'connections' | 'analysis';
const activeTab = signal<Tab>('overview');
const connections = signal<{ nodes: any[]; edges: any[] } | null>(null);
const connectionsLoading = signal(false);

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'OVERVIEW' },
  { key: 'connections', label: 'CONNECTIONS' },
  { key: 'analysis', label: 'ANALYSIS' },
];

// ── Helpers ──────────────────────────────────────────────────

/** Generate a fake 7-day sparkline from entity id (deterministic) */
function fakeSparkline(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  const out: number[] = [];
  let v = 40 + (Math.abs(h) % 30);
  for (let i = 0; i < 7; i++) {
    v += ((h >> (i * 3)) % 11) - 5;
    out.push(Math.max(0, Math.min(100, v)));
  }
  return out;
}

/** Group connections by type */
function groupByType(nodes: any[]): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  for (const n of nodes) {
    const t = n.type || 'other';
    if (!groups[t]) groups[t] = [];
    groups[t].push(n);
  }
  return groups;
}

/** Find entity data from bootstrap cache */
function findEntityData(type: string, id: string): any | null {
  const bd = bootstrapData.value;
  if (!bd) return null;

  switch (type) {
    case 'conflict': return bd.conflicts?.find((c: any) => c._id === id) ?? null;
    case 'chokepoint': return bd.chokepoints?.find((c: any) => c._id === id) ?? null;
    case 'trade-route': return bd.tradeRoutes?.find((r: any) => r._id === id) ?? null;
    case 'base': return bd.bases?.find((b: any) => b._id === id) ?? null;
    case 'nsa': return bd.nsa?.find((n: any) => n._id === id) ?? null;
    case 'election': return bd.elections?.find((e: any) => e._id === id) ?? null;
    default: return null;
  }
}

// ── Sub-components ───────────────────────────────────────────

function OverviewTab() {
  const country = selectedCountry.value;
  const entity = selectedEntity.value;

  // Country overview
  if (country) {
    const sparkData = fakeSparkline(country._id);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Entity header: flag + name + region */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '2rem' }}>{country.flag}</span>
          <div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>{country.name}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{country.region}</div>
          </div>
        </div>

        {/* Stat grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '4px' }}>Risk Level</div>
            <Badge level={country.risk} size="md" />
          </div>
          <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '4px' }}>Leader</div>
            <div class="truncate" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{country.leader || 'Unknown'}</div>
          </div>
          <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '4px' }}>ISO Code</div>
            <div class="mono" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{country.iso2}</div>
          </div>
          <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tags</div>
            <div class="truncate" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
              {country.tags?.length ? country.tags.slice(0, 2).join(', ') : 'None'}
            </div>
          </div>
        </div>

        {/* 7-day sparkline */}
        <div style={{ background: 'var(--bg-hover)', padding: '12px', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginBottom: '8px' }}>7-Day Risk Trend</div>
          <Sparkline data={sparkData} width={280} height={40} color={`var(--risk-${country.risk})`} />
        </div>
      </div>
    );
  }

  // Entity-specific sub-panel
  if (entity) {
    const data = findEntityData(entity.type, entity.id);
    if (data) {
      switch (entity.type) {
        case 'conflict': return <ConflictsPanel conflict={data as Conflict} />;
        case 'chokepoint': return <ChokepointsPanel chokepoint={data} />;
        case 'trade-route': { selectTradeRoute(data); return null; }
        case 'base': return <BasesPanel base={data} />;
        case 'nsa': return <NsaPanel nsa={data} />;
        case 'election': return <ElectionsPanel election={data} />;
      }
    }

    return (
      <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', padding: '24px 0', textAlign: 'center' }}>
        No detail available for {entity.type}:{entity.id}
      </div>
    );
  }

  return null;
}

function ConnectionsTab() {
  const entity = selectedEntity.value;

  useEffect(() => {
    if (!entity) return;
    connectionsLoading.value = true;
    connections.value = null;

    api.graphConnections(`${entity.type}:${entity.id}`, 1)
      .then((data: any) => {
        connections.value = { nodes: data.nodes || [], edges: data.edges || [] };
        graphConnections.value = { seed: entity, nodes: data.nodes || [], edges: data.edges || [] };
      })
      .catch(() => {
        connections.value = { nodes: [], edges: [] };
      })
      .finally(() => {
        connectionsLoading.value = false;
      });
  }, [entity?.type, entity?.id]);

  if (connectionsLoading.value) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '8px 0' }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: '28px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', animation: 'shimmer 1.5s infinite linear' }} />
        ))}
      </div>
    );
  }

  if (!connections.value || connections.value.nodes.length === 0) {
    return (
      <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', padding: '24px 0', textAlign: 'center' }}>
        No connections found.
      </div>
    );
  }

  const grouped = groupByType(connections.value.nodes);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Object.entries(grouped).map(([type, nodes]) => (
        <div key={type}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            {type}s ({nodes.length})
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {nodes.map((n: any, i: number) => (
              <button
                key={i}
                onClick={() => {
                  selectedEntity.value = { type: n.type || type, id: n._id || n.id };
                  activeTab.value = 'overview';
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--accent-blue-dim)',
                  color: 'var(--accent-blue)',
                  fontSize: 'var(--text-2xs)',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'background var(--duration-fast) var(--ease-default)',
                }}
              >
                {n.name || n.label || n._id || n.id}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnalysisTab() {
  const country = selectedCountry.value;
  const aiEnabled = userSettings.value.aiEnabled;

  if (!aiEnabled) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 16px' }}>
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: '12px' }}>
          AI synthesis is disabled.
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
          Enable AI in Settings to see analysis.
        </div>
      </div>
    );
  }

  // Show country analysis if available
  if (country?.analysis) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: 'var(--bg-elevated)', borderLeft: '3px solid var(--accent-cyan)', padding: '12px', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            AI Synthesis
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>BLUF (Bottom Line Up Front)</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {country.analysis.what}
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Root Cause</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {country.analysis.why}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: '4px' }}>Next Steps</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              {country.analysis.next}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '32px 16px' }}>
      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
        No AI analysis available for this entity.
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────

export function RightPanel() {
  if (!selectedEntity.value && !selectedCountry.value) {
    return <NewsFeed />;
  }

  const headerLabel = selectedCountry.value
    ? `${selectedCountry.value.flag} ${selectedCountry.value.name}`
    : selectedEntity.value
      ? `${selectedEntity.value.type}: ${selectedEntity.value.id}`
      : 'Entity Detail';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
          {headerLabel}
        </div>
        <button
          onClick={() => { selectCountry(null); selectedEntity.value = null; activeTab.value = 'overview'; }}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 'var(--text-md)' }}
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-medium)', paddingBottom: '8px', marginBottom: '16px' }}>
        {TABS.map(tab => {
          const isActive = activeTab.value === tab.key;
          return (
            <div
              key={tab.key}
              onClick={() => { activeTab.value = tab.key; }}
              style={{
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                fontSize: 'var(--text-sm)',
                cursor: 'pointer',
                borderBottom: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                paddingBottom: '2px',
                fontWeight: isActive ? 600 : 400,
                transition: 'color var(--duration-fast) var(--ease-default)',
                userSelect: 'none',
              }}
            >
              {tab.label}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }} class="hide-scrollbar">
        {activeTab.value === 'overview' && <OverviewTab />}
        {activeTab.value === 'connections' && <ConnectionsTab />}
        {activeTab.value === 'analysis' && <AnalysisTab />}
      </div>
    </div>
  );
}
