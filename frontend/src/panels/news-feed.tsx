import { h } from 'preact';
import { latestEvents, newsAnalyses } from '../state/store';
import type { NewsItem } from '../state/store';
import { AISynthesisCard } from './ai-synthesis-card';

/** Determine border color from tags array */
function borderColorFromTags(tags: string[]): string {
  const joined = tags.join(' ').toLowerCase();
  if (joined.includes('breaking') || joined.includes('conflict') || joined.includes('war') || joined.includes('attack'))
    return '#ff4058';
  if (joined.includes('alert') || joined.includes('security') || joined.includes('threat') || joined.includes('military'))
    return '#ff9020';
  if (joined.includes('economic') || joined.includes('trade') || joined.includes('finance') || joined.includes('world'))
    return '#14b8a6';
  // Default: political / diplomacy / blue
  return '#3b82f6';
}

/** Compute relative timestamp string */
function relativeTime(ev: NewsItem): string {
  const raw = (ev as any).timestamp || (ev as any).createdAt || (ev as any).publishedAt;
  if (!raw) return 'Just now';

  const then = new Date(raw).getTime();
  if (isNaN(then)) return 'Just now';

  const diff = Date.now() - then;
  if (diff < 0) return 'Just now';

  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Trust score color */
function trustColor(score: number): string {
  if (score >= 0.8) return '#22c55e'; // green
  if (score >= 0.5) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

/** Trust score background */
function trustBg(score: number): string {
  if (score >= 0.8) return 'rgba(34,197,94,0.15)';
  if (score >= 0.5) return 'rgba(245,158,11,0.15)';
  return 'rgba(239,68,68,0.15)';
}

export function NewsFeed() {
  const events = latestEvents.value;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header with tabs */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 16px', borderBottom: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          {['EVENTS', 'BRIEF', 'STOCKS'].map((tab, i) => (
            <button
              key={tab}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 'var(--text-sm)', fontWeight: i === 0 ? 700 : 600,
                color: i === 0 ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                borderBottom: i === 0 ? '2px solid var(--accent-blue)' : '2px solid transparent',
                padding: '12px 0',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
          padding: '4px 12px', borderRadius: 'var(--radius-md)',
          color: 'var(--text-secondary)', fontSize: 'var(--text-xs)',
          cursor: 'pointer', boxShadow: 'var(--glass-shadow)',
        }}>
          Filter
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
        class="hide-scrollbar"
      >
        {/* AI Analysis card at top */}
        {Array.from(newsAnalyses.value.values()).slice(0, 1).map((analysis) => (
          <AISynthesisCard key={analysis.clusterId} analysis={analysis} />
        ))}

        {events.map((ev, i) => {
          const borderColor = borderColorFromTags(ev.tags);
          const prov = ev.provenance;
          const ts = relativeTime(ev);

          return (
            <div
              key={i}
              class="card"
              style={{
                padding: '16px',
                borderLeft: `4px solid ${borderColor}`,
              }}
            >
              {/* Tags row */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <span style={{ color: borderColor }}>{ev.tags[0] || 'NEWS'}</span>
                {ev.tags[1] && (
                  <>
                    <span style={{ color: 'var(--text-tertiary)' }}>|</span>
                    <span style={{ color: 'var(--accent-blue)', background: 'var(--accent-blue-dim)', padding: '1px 4px', borderRadius: '3px' }}>
                      {ev.tags[1]}
                    </span>
                  </>
                )}
                <span style={{ color: 'var(--text-tertiary)' }}>|</span>
                <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, textTransform: 'none' }}>{ts}</span>
              </div>

              {/* Title */}
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '4px' }}>
                {ev.title}
              </div>

              {/* Summary */}
              <div class="line-clamp-2" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
                {ev.summary}
              </div>

              {/* Trust Badges */}
              <div style={{ fontSize: 'var(--text-xs)' }}>
                <div style={{ color: 'var(--text-tertiary)', fontWeight: 500, marginBottom: '6px' }}>Provenance Trust Badges</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {ev.sourceCount > 0 && (
                      <span style={{
                        background: 'var(--success-dim)', color: 'var(--success)',
                        padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--success)',
                        display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600,
                      }}>
                        {'\u2713'} Verified by {ev.sourceCount} sources
                      </span>
                    )}
                    {prov?.sourceTier && (
                      <span style={{
                        background: 'var(--info-dim)', color: 'var(--info)',
                        padding: '3px 8px', borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--info)',
                        display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600,
                      }}>
                        {prov.sourceTier}
                      </span>
                    )}
                  </div>
                  {ev.sourceCount > 0 && (
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '11px' }}>
                      {ev.sourceCount} Sources
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
