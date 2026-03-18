import { h } from 'preact';
import { timelinePosition, isHistorical, bootstrapData, latestEvents } from '../state/store';
import { api } from '../api/client';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';

/** Generate fallback hourly snapshots for last 24h */
function generateFallbackSnapshots(): string[] {
  const now = new Date();
  return Array.from({ length: 25 }, (_, i) => {
    const d = new Date(now.getTime() - (24 - i) * 3600000);
    return d.toISOString();
  });
}

/** Format date for label display */
function formatDateLabel(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[date.getUTCDay()]} ${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

/** Format time for historical banner */
function formatHistoricalDate(date: Date): string {
  const dateStr = formatDateLabel(date);
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${dateStr}, ${hh}:${mm} UTC`;
}

/** Compute progress fraction (0..1) for a timestamp within a range */
function progressFraction(current: Date, rangeStart: Date, rangeEnd: Date): number {
  const total = rangeEnd.getTime() - rangeStart.getTime();
  if (total <= 0) return 1;
  const elapsed = current.getTime() - rangeStart.getTime();
  return Math.max(0, Math.min(1, elapsed / total));
}

export function TimelineScrubber() {
  const [snapshots, setSnapshots] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Fetch snapshots on mount
  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getTime() - 24 * 3600000);

    api.timelineRange(from.toISOString(), now.toISOString(), 50)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          // Expect array of objects with a timestamp field, or array of ISO strings
          const timestamps = data.map((d: any) =>
            typeof d === 'string' ? d : d.timestamp || d.t || d.iso
          ).filter(Boolean);
          if (timestamps.length > 0) {
            setSnapshots(timestamps);
            return;
          }
        }
        setSnapshots(generateFallbackSnapshots());
      })
      .catch(() => {
        setSnapshots(generateFallbackSnapshots());
      });
  }, []);

  // Derived range
  const rangeStart = snapshots.length > 0 ? new Date(snapshots[0]) : new Date();
  const rangeEnd = snapshots.length > 0 ? new Date(snapshots[snapshots.length - 1]) : new Date();

  // Current progress percentage
  const currentPos = timelinePosition.value;
  const progress = currentPos
    ? progressFraction(currentPos, rangeStart, rangeEnd)
    : 1; // live = end of track

  // Generate date labels along the track
  const dateLabels: { label: string; fraction: number }[] = [];
  if (snapshots.length > 0) {
    const startMs = rangeStart.getTime();
    const endMs = rangeEnd.getTime();
    const totalMs = endMs - startMs;

    if (totalMs > 0) {
      // Find unique dates in range
      const seen = new Set<string>();
      const startDay = new Date(rangeStart);
      startDay.setUTCHours(0, 0, 0, 0);

      for (let t = startDay.getTime(); t <= endMs + 86400000; t += 86400000) {
        const d = new Date(t);
        const label = formatDateLabel(d);
        if (seen.has(label)) continue;
        seen.add(label);

        const frac = (t - startMs) / totalMs;
        if (frac >= -0.05 && frac <= 1.05) {
          dateLabels.push({ label, fraction: Math.max(0, Math.min(1, frac)) });
        }
      }
    }
  }

  // Generate time tick marks (every 3h)
  const timeTicks: { label: string; fraction: number }[] = [];
  if (snapshots.length > 0) {
    const startMs = rangeStart.getTime();
    const totalMs = rangeEnd.getTime() - startMs;
    if (totalMs > 0) {
      const firstTick = new Date(rangeStart);
      firstTick.setUTCMinutes(0, 0, 0);
      const nextHour3 = Math.ceil(firstTick.getUTCHours() / 3) * 3;
      firstTick.setUTCHours(nextHour3);

      for (let t = firstTick.getTime(); t <= rangeEnd.getTime(); t += 3 * 3600000) {
        const frac = (t - startMs) / totalMs;
        if (frac >= 0 && frac <= 1) {
          const d = new Date(t);
          const hh = String(d.getUTCHours()).padStart(2, '0');
          timeTicks.push({ label: `${hh}:00`, fraction: frac });
        }
      }
    }
  }

  // Event markers from latestEvents signal
  const eventMarkers: { color: string; fraction: number; title: string }[] = [];
  if (snapshots.length > 0) {
    const startMs = rangeStart.getTime();
    const totalMs = rangeEnd.getTime() - startMs;
    if (totalMs > 0) {
      const events = latestEvents.value;
      events.forEach((ev: any) => {
        const evTime = ev.timestamp ? new Date(ev.timestamp).getTime()
          : ev.createdAt ? new Date(ev.createdAt).getTime()
          : null;
        if (evTime === null) return;

        const frac = (evTime - startMs) / totalMs;
        if (frac < 0 || frac > 1) return;

        // Color by tags
        const tags = (ev.tags || []).join(' ').toLowerCase();
        let color = '#3b82f6'; // default blue
        if (tags.includes('breaking') || tags.includes('conflict')) color = '#ff4058';
        else if (tags.includes('alert') || tags.includes('security')) color = '#ff9020';
        else if (tags.includes('economic') || tags.includes('trade')) color = '#14b8a6';

        eventMarkers.push({ color, fraction: frac, title: ev.title });
      });
    }
  }

  // Handle click/drag on the track
  const handleTrackInteraction = useCallback(async (clientX: number) => {
    if (!trackRef.current || snapshots.length === 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = x / rect.width;

    // Find nearest snapshot
    const startMs = rangeStart.getTime();
    const totalMs = rangeEnd.getTime() - startMs;
    const targetMs = startMs + percent * totalMs;

    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < snapshots.length; i++) {
      const dist = Math.abs(new Date(snapshots[i]).getTime() - targetMs);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const ts = snapshots[nearestIdx];

    if (nearestIdx < snapshots.length - 1) {
      timelinePosition.value = new Date(ts);
      try {
        const data = await api.bootstrap(true, ts);
        bootstrapData.value = data;
      } catch { /* keep current data on failure */ }
    } else {
      // Snap to live
      timelinePosition.value = null;
      try {
        const data = await api.bootstrap(true);
        bootstrapData.value = data;
      } catch { /* keep current data */ }
    }
  }, [snapshots, rangeStart, rangeEnd]);

  // Mouse event handlers for drag
  const onMouseDown = useCallback((e: MouseEvent) => {
    setDragging(true);
    handleTrackInteraction(e.clientX);
  }, [handleTrackInteraction]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: MouseEvent) => {
      e.preventDefault();
      handleTrackInteraction(e.clientX);
    };
    const onUp = () => setDragging(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, handleTrackInteraction]);

  // Return to live
  const returnToLive = async () => {
    timelinePosition.value = null;
    try {
      bootstrapData.value = await api.bootstrap(true);
    } catch { /* ignore */ }
  };

  const progressPct = `${(progress * 100).toFixed(2)}%`;

  return (
    <div style={{
      padding: '6px 24px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      justifyContent: 'center',
      position: 'relative',
      userSelect: 'none',
    }}>

      {/* Historical banner */}
      {isHistorical.value && timelinePosition.value && (
        <div style={{
          position: 'absolute',
          top: -36,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--warning, #f59e0b)',
          color: '#000',
          padding: '6px 20px',
          borderRadius: 'var(--radius-xl)',
          fontSize: 'var(--text-xs)',
          fontWeight: 700,
          letterSpacing: '1px',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          zIndex: 10,
        }}>
          <span>HISTORICAL — {formatHistoricalDate(timelinePosition.value)}</span>
          <button
            onClick={returnToLive}
            style={{
              background: '#000',
              color: '#fff',
              border: 'none',
              padding: '4px 12px',
              borderRadius: 'var(--radius-lg)',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            RETURN TO LIVE
          </button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

        {/* Play button placeholder */}
        <button
          style={{
            background: 'none',
            border: '1px solid var(--border-medium)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            flexShrink: 0,
          }}
          title="Play (coming soon)"
        >
          {'\u25B6'}
        </button>

        {/* Track container */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative' }}>

          {/* Date labels row */}
          <div style={{ position: 'relative', height: '14px', marginBottom: '2px' }}>
            {dateLabels.map((dl, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  left: `${(dl.fraction * 100).toFixed(2)}%`,
                  transform: 'translateX(-50%)',
                  fontSize: '9px',
                  color: 'var(--text-secondary, #888)',
                  whiteSpace: 'nowrap',
                  letterSpacing: '0.5px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}
              >
                {dl.label}
              </span>
            ))}
          </div>

          {/* Main track */}
          <div
            ref={trackRef}
            onMouseDown={onMouseDown as any}
            style={{
              position: 'relative',
              height: '6px',
              background: 'var(--bg-active, #1a1a2e)',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            {/* Progress fill */}
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: progressPct,
              background: 'linear-gradient(90deg, var(--accent-blue, #3b82f6), var(--accent-cyan, #06b6d4))',
              borderRadius: '3px',
              transition: dragging ? 'none' : 'width 0.15s ease-out',
            }} />

            {/* Event markers */}
            {eventMarkers.map((em, i) => (
              <div
                key={i}
                title={em.title}
                style={{
                  position: 'absolute',
                  left: `${(em.fraction * 100).toFixed(2)}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  background: em.color,
                  zIndex: 2,
                  pointerEvents: 'none',
                }}
              />
            ))}

            {/* Thumb */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: progressPct,
              transform: 'translate(-50%, -50%)',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'var(--bg-surface)',
              border: '2px solid var(--accent-blue)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
              zIndex: 3,
              cursor: 'pointer',
              transition: dragging ? 'none' : 'left 0.15s ease-out',
            }} />
          </div>

          {/* Time tick marks row */}
          <div style={{ position: 'relative', height: '14px', marginTop: '1px' }}>
            {timeTicks.map((tt, i) => (
              <div key={i} style={{ position: 'absolute', left: `${(tt.fraction * 100).toFixed(2)}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '1px', height: '4px', background: 'var(--border-subtle, #333)' }} />
                <span style={{ fontSize: '8px', color: 'var(--text-tertiary, #666)', whiteSpace: 'nowrap' }}>
                  {tt.label}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
