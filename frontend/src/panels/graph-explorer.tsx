import { h } from 'preact';
import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { Graph } from '@cosmograph/cosmos';
import { graphConnections, selectedEntity, selectCountry, bootstrapData } from '../state/store';
import { api } from '../api/client';

// ── Node color palette by entity type ────────────────────────
const NODE_COLORS: Record<string, string> = {
  country:    '#00b4ff',
  conflict:   '#ff4058',
  chokepoint: '#ffb020',
  nsa:        '#a855f7',
  trade:      '#00d68f',
};

const NODE_RADIUS: Record<string, number> = {
  country: 14, conflict: 12, chokepoint: 11, nsa: 11, trade: 10,
};

const CYAN_PATH = '#00e5cc';
const LINK_DIM  = '#2a2a50';

interface GraphNode {
  id:    string;
  type:  string;
  label: string;
  color: string;
  size:  number;
}

interface GraphLink {
  source:   string;
  target:   string;
  relation: string;
  weight:   number;
}

// ── Color helpers ─────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

const LINK_DIM_RGB  = hexToRgb(LINK_DIM);
const CYAN_PATH_RGB = hexToRgb(CYAN_PATH);

export function GraphExplorer() {
  const panelRef  = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const graphRef  = useRef<Graph | null>(null);
  const nodesRef  = useRef<GraphNode[]>([]);
  const linksRef  = useRef<GraphLink[]>([]);

  // Panel drag/resize
  const [panelPos,  setPanelPos]  = useState({ x: 120, y: 80 });
  const [panelSize, setPanelSize] = useState({ w: 820, h: 620 });
  const dragging = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizing = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  // Depth / path mode
  const [depth,     setDepth]     = useState(1);
  const [pathMode,  setPathMode]  = useState(false);
  const [pathFrom,  setPathFrom]  = useState('');
  const [pathTo,    setPathTo]    = useState('');
  const [pathEdges, setPathEdges] = useState<Set<string>>(new Set());
  const [loading,   setLoading]   = useState(false);

  // ── Build and push Float32Arrays to Graph ─────────────────
  const pushData = useCallback((
    nodes: GraphNode[],
    links: GraphLink[],
    highlighted: Set<string>,
  ) => {
    const g = graphRef.current;
    if (!g) return;

    nodesRef.current = nodes;
    linksRef.current = links;

    // Node id → index
    const indexMap = new Map<string, number>();
    nodes.forEach((n, i) => indexMap.set(n.id, i));

    // Point colors  [r, g, b, a,  r, g, b, a, ...]  rgb=0-255  a=0-1
    const pointColors = new Float32Array(nodes.length * 4);
    nodes.forEach((n, i) => {
      const [r, gv, b] = hexToRgb(n.color);
      pointColors[i * 4]     = r;
      pointColors[i * 4 + 1] = gv;
      pointColors[i * 4 + 2] = b;
      pointColors[i * 4 + 3] = 1;
    });

    // Point sizes
    const pointSizes = new Float32Array(nodes.length);
    nodes.forEach((n, i) => { pointSizes[i] = n.size; });

    // Links  [src0, tgt0, src1, tgt1, ...]  (indices)
    const validLinks = links.filter(
      l => indexMap.has(l.source) && indexMap.has(l.target),
    );
    const linkArr = new Float32Array(validLinks.length * 2);
    validLinks.forEach((l, i) => {
      linkArr[i * 2]     = indexMap.get(l.source)!;
      linkArr[i * 2 + 1] = indexMap.get(l.target)!;
    });

    // Link colors
    const linkColors = new Float32Array(validLinks.length * 4);
    validLinks.forEach((l, i) => {
      const fwd = `${l.source}→${l.target}`;
      const bwd = `${l.target}→${l.source}`;
      const isHighlighted = highlighted.has(fwd) || highlighted.has(bwd);
      const [r, gv, b] = isHighlighted ? CYAN_PATH_RGB : LINK_DIM_RGB;
      const a = isHighlighted ? 1 : 0.4;
      linkColors[i * 4]     = r;
      linkColors[i * 4 + 1] = gv;
      linkColors[i * 4 + 2] = b;
      linkColors[i * 4 + 3] = a;
    });

    // Link widths
    const linkWidths = new Float32Array(validLinks.length);
    validLinks.forEach((l, i) => { linkWidths[i] = 0.5 + (l.weight ?? 0.5) * 3; });

    // Random initial positions (simulation takes over)
    const positions = new Float32Array(nodes.length * 2);
    nodes.forEach((_, i) => {
      positions[i * 2]     = (Math.random() - 0.5) * 2000;
      positions[i * 2 + 1] = (Math.random() - 0.5) * 2000;
    });

    g.setPointPositions(positions);
    g.setPointColors(pointColors);
    g.setPointSizes(pointSizes);
    g.setLinks(linkArr);
    g.setLinkColors(linkColors);
    g.setLinkWidths(linkWidths);
    g.render();
    g.fitView(400);
  }, []);

  // ── Initialize Graph once ─────────────────────────────────
  useEffect(() => {
    if (!canvasRef.current) return;

    graphRef.current = new Graph(canvasRef.current as HTMLDivElement, {
      backgroundColor:        '#08080e',
      simulationRepulsion:    2.0,
      simulationLinkDistance: 120,
      simulationDecay:        3000,
      simulationFriction:     0.85,
      simulationGravity:      0.15,
      attribution:            '',
      renderHoveredPointRing: true,
      hoveredPointCursor:     'pointer',
      fitViewOnInit:          false,
      onClick: (index: number | undefined) => {
        if (index === undefined) return;
        const node = nodesRef.current[index];
        if (!node) return;
        if (node.type === 'country' && bootstrapData.value) {
          const country = bootstrapData.value.countries.find(
            (c: any) => c._id === node.id || c.iso2 === node.id || c.name === node.label,
          );
          if (country) { selectCountry(country); return; }
        }
        selectedEntity.value = { type: node.type, id: node.id };
      },
    });

    return () => { graphRef.current?.destroy(); graphRef.current = null; };
  }, []);

  // ── Fetch graph data when depth changes ───────────────────
  useEffect(() => {
    const entity = selectedEntity.value;
    if (!entity) return;
    setLoading(true);
    api.graphConnections(`${entity.type}:${entity.id}`, depth)
      .then((data: any) => { graphConnections.value = data; })
      .catch((err: any) => console.error('[GraphExplorer] fetch error:', err))
      .finally(() => setLoading(false));
  }, [depth]);

  // ── Push data when graph signal changes ───────────────────
  useEffect(() => {
    const gc = graphConnections.value;
    if (!gc?.nodes?.length) return;

    const nodes: GraphNode[] = gc.nodes.map((n: any) => ({
      id:    n.id,
      type:  n.type,
      label: n.label || n.id,
      color: NODE_COLORS[n.type] ?? '#8a8ea8',
      size:  NODE_RADIUS[n.type] ?? 10,
    }));

    const links: GraphLink[] = gc.edges.map((e: any) => ({
      source:   typeof e.source === 'object' ? e.source.id : e.source,
      target:   typeof e.target === 'object' ? e.target.id : e.target,
      relation: e.relation ?? '',
      weight:   e.weight   ?? 0.5,
    }));

    pushData(nodes, links, pathEdges);
  }, [graphConnections.value]);

  // ── Re-color links when path highlight changes ────────────
  useEffect(() => {
    const gc = graphConnections.value;
    if (!gc?.nodes?.length) return;
    pushData(nodesRef.current, linksRef.current, pathEdges);
  }, [pathEdges]);

  // ── Path query ────────────────────────────────────────────
  const fetchPath = useCallback(async () => {
    if (!pathFrom || !pathTo) return;
    try {
      setLoading(true);
      const result = await api.graphPath(pathFrom, pathTo);
      if (result?.edges) {
        const highlighted = new Set<string>();
        for (const e of result.edges) {
          const src = typeof e.source === 'object' ? e.source.id : e.source;
          const tgt = typeof e.target === 'object' ? e.target.id : e.target;
          highlighted.add(`${src}→${tgt}`);
          highlighted.add(`${tgt}→${src}`);
        }
        setPathEdges(highlighted);

        if (graphConnections.value) {
          const existingNodeIds  = new Set(graphConnections.value.nodes.map((n: any) => n.id));
          const existingEdgeKeys = new Set(
            graphConnections.value.edges.map((e: any) =>
              `${e.source?.id ?? e.source}→${e.target?.id ?? e.target}`),
          );
          graphConnections.value = {
            ...graphConnections.value,
            nodes: [...graphConnections.value.nodes,
              ...(result.nodes || []).filter((n: any) => !existingNodeIds.has(n.id))],
            edges: [...graphConnections.value.edges,
              ...(result.edges || []).filter((e: any) =>
                !existingEdgeKeys.has(`${e.source?.id ?? e.source}→${e.target?.id ?? e.target}`))],
          };
        }
      }
    } catch (err) {
      console.error('[GraphExplorer] path error:', err);
    } finally {
      setLoading(false);
    }
  }, [pathFrom, pathTo]);

  // ── Panel dragging ────────────────────────────────────────
  const onHeaderMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    dragging.current = { startX: e.clientX, startY: e.clientY, origX: panelPos.x, origY: panelPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      setPanelPos({
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
  }, [panelPos]);

  // ── Panel resizing ────────────────────────────────────────
  const onResizeMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizing.current = { startX: e.clientX, startY: e.clientY, origW: panelSize.w, origH: panelSize.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      setPanelSize({
        w: Math.max(500, resizing.current.origW + ev.clientX - resizing.current.startX),
        h: Math.max(400, resizing.current.origH + ev.clientY - resizing.current.startY),
      });
    };
    const onUp = () => {
      resizing.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelSize]);

  // ── Guard ─────────────────────────────────────────────────
  if (!graphConnections.value) return null;

  const { seed } = graphConnections.value;
  const nodeCount = graphConnections.value.nodes?.length ?? 0;
  const edgeCount = graphConnections.value.edges?.length ?? 0;

  return (
    <div
      ref={panelRef}
      class="graph-explorer panel-glass"
      style={{
        position: 'fixed',
        left: `${panelPos.x}px`,
        top:  `${panelPos.y}px`,
        width:  `${panelSize.w}px`,
        height: `${panelSize.h}px`,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid var(--border-subtle)',
        overflow: 'hidden',
      }}
    >
      {/* ── Header (draggable) ───────────────────────────────── */}
      <div
        onMouseDown={onHeaderMouseDown}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)',
          cursor: 'grab', userSelect: 'none', flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: 'var(--text-md)', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>
            Network Graph
          </h3>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            {seed ? `${seed.type}:${seed.id}` : ''} | {nodeCount}N {edgeCount}E
          </span>
          {loading && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent-cyan)' }}>loading…</span>}
        </div>
        <button
          onClick={() => { graphConnections.value = null; }}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
          title="Close graph explorer"
        >×</button>
      </div>

      {/* ── Controls bar ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '8px 16px', borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        {/* Depth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Depth</span>
          <button onClick={() => setDepth(d => Math.max(1, d - 1))} disabled={depth <= 1} style={controlBtnStyle(depth <= 1)}>−</button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', minWidth: '16px', textAlign: 'center' }}>{depth}</span>
          <button onClick={() => setDepth(d => Math.min(3, d + 1))} disabled={depth >= 3} style={controlBtnStyle(depth >= 3)}>+</button>
        </div>

        <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />

        {/* Path mode */}
        <button
          onClick={() => { setPathMode(!pathMode); if (pathMode) setPathEdges(new Set()); }}
          style={{ ...controlBtnStyle(false), background: pathMode ? 'rgba(0,229,204,0.15)' : undefined, color: pathMode ? CYAN_PATH : 'var(--text-secondary)', padding: '3px 10px' }}
        >Path</button>

        {pathMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="text" placeholder="from (type:id)" value={pathFrom}
              onInput={(e) => setPathFrom((e.target as HTMLInputElement).value)} style={inputStyle} />
            <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>→</span>
            <input type="text" placeholder="to (type:id)" value={pathTo}
              onInput={(e) => setPathTo((e.target as HTMLInputElement).value)} style={inputStyle} />
            <button onClick={fetchPath} style={controlBtnStyle(false)}>Go</button>
          </div>
        )}

        <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cosmos canvas ────────────────────────────────────── */}
      <div ref={canvasRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }} />

      {/* ── Resize handle ────────────────────────────────────── */}
      <div
        onMouseDown={onResizeMouseDown}
        style={{ position: 'absolute', right: 0, bottom: 0, width: '16px', height: '16px', cursor: 'nwse-resize', opacity: 0.4 }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M14 16L16 14M10 16L16 10M6 16L16 6" stroke="var(--text-tertiary)" stroke-width="1.5" />
        </svg>
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────
function controlBtnStyle(disabled: boolean): Record<string, string> {
  return {
    background:  disabled ? 'transparent' : 'var(--bg-hover)',
    border:      '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    color:       disabled ? 'var(--text-tertiary)' : 'var(--text-secondary)',
    cursor:      disabled ? 'default' : 'pointer',
    fontSize:    'var(--text-sm)',
    padding:     '2px 8px',
    lineHeight:  '1.4',
    fontFamily:  'var(--font-sans)',
  };
}

const inputStyle: Record<string, string> = {
  background:   'var(--bg-input)',
  border:       '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-sm)',
  color:        'var(--text-primary)',
  fontSize:     'var(--text-xs)',
  padding:      '3px 8px',
  width:        '120px',
  fontFamily:   'var(--font-mono)',
  outline:      'none',
};
