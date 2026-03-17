import { useCallback, useEffect } from 'preact/hooks';

interface EventData {
  id: number;
  badge: string;
  category: string;
  headline: string;
  stat: string;
  update: string;
  time: string;
}

interface EventModalProps {
  event: EventData;
  onClose: () => void;
}

const TIMELINE = [
  { time: '06:42 UTC', text: 'Initial reports emerge from field correspondents. Multiple sources confirm activity.' },
  { time: '07:15 UTC', text: 'Government spokesperson issues preliminary statement. International media picks up story.' },
  { time: '08:30 UTC', text: 'Satellite imagery corroborates ground reports. OSINT community identifies key details.' },
  { time: '09:00 UTC', text: 'UN Secretary-General calls for restraint. Security Council briefing requested.' },
  { time: '10:22 UTC', text: 'Allied nations coordinate response. Intelligence sharing protocols activated.' },
];

function getBadgeClass(badge: string): string {
  const map: Record<string, string> = {
    BREAKING: 'badge-breaking',
    ALERT: 'badge-alert',
    CONFLICT: 'badge-conflict',
    WORLD: 'badge-world',
    SECURITY: 'badge-security',
    DIPLOMACY: 'badge-diplomacy',
  };
  return map[badge] || 'badge-default';
}

export function EventModal({ event, onClose }: EventModalProps) {
  const handleBackdrop = useCallback(
    (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div class="modal-overlay" onClick={handleBackdrop}>
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-badges">
            <span class={`badge ${getBadgeClass(event.badge)}`}>{event.badge}</span>
            <span class={`badge ${getBadgeClass(event.category)}`}>{event.category}</span>
            <span class="modal-time">{event.time}</span>
          </div>
          <button class="modal-close" onClick={onClose}>&times;</button>
        </div>

        <h2 class="modal-title">{event.headline}</h2>

        {event.stat && (
          <div class="modal-stat-pill">{event.stat}</div>
        )}

        <section class="modal-section">
          <h3 class="modal-section-title">INTELLIGENCE SUMMARY</h3>

          <div class="modal-intel-block">
            <h4>What Happened</h4>
            <p>{event.update}</p>
          </div>

          <div class="modal-intel-block">
            <h4>Why It Matters</h4>
            <p>
              This event has significant implications for regional stability and global supply chains.
              Multiple allied nations are monitoring the situation closely. Escalation risk remains
              elevated as diplomatic channels narrow and military postures harden.
            </p>
          </div>

          <div class="modal-intel-block">
            <h4>Outlook</h4>
            <p>
              Expect continued volatility over the next 48-72 hours. Key indicators to watch include
              troop movements, diplomatic statements from P5 members, and energy market reactions.
              Probability of further escalation: 65%.
            </p>
          </div>
        </section>

        <section class="modal-section">
          <h3 class="modal-section-title">LIVE TIMELINE</h3>
          <div class="modal-timeline">
            {TIMELINE.map((entry, i) => (
              <div key={i} class="timeline-entry">
                <span class="timeline-dot" />
                <div class="timeline-content">
                  <span class="timeline-time">{entry.time}</span>
                  <p class="timeline-text">{entry.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
