/**
 * GAMBIT — SSE Client
 *
 * EventSource with reconnect logic for all 9 event types.
 */
import {
  bootstrapData,
  latestEvents,
  newsAnalyses,
  anomalyAlerts,
  pluginManifests,
  timelinePosition,
} from '@/state/store';
import type { NewsItem, NewsAnalysis, Anomaly } from '@/state/store';

const SSE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '') + '/events/stream';

let eventSource: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function connectSSE(): void {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource(SSE_URL);

  eventSource.onopen = () => {
    console.log('[SSE] Connected');
    reconnectDelay = 1000; // Reset backoff on success
  };

  eventSource.onerror = () => {
    console.warn('[SSE] Connection lost, reconnecting...');
    eventSource?.close();
    eventSource = null;
    scheduleReconnect();
  };

  // 1. news — prepend to latestEvents
  eventSource.addEventListener('news', (e) => {
    const item: NewsItem = JSON.parse(e.data);
    latestEvents.value = [item, ...latestEvents.value].slice(0, 200);
  });

  // 2. news-enriched — update existing item with entity links
  eventSource.addEventListener('news-enriched', (e) => {
    const enriched = JSON.parse(e.data);
    latestEvents.value = latestEvents.value.map(item =>
      item.title === enriched.title ? { ...item, ...enriched } : item
    );
  });

  // 3. news-analysis — add to newsAnalyses by clusterId
  eventSource.addEventListener('news-analysis', (e) => {
    const analysis: NewsAnalysis = JSON.parse(e.data);
    const map = new Map(newsAnalyses.value);
    map.set(analysis.clusterId, analysis);
    newsAnalyses.value = map;
  });

  // 4. risk-change — update country in bootstrapData
  eventSource.addEventListener('risk-change', (e) => {
    const { countryId, newRisk } = JSON.parse(e.data);
    const data = bootstrapData.value;
    if (data) {
      bootstrapData.value = {
        ...data,
        countries: data.countries.map(c =>
          c._id === countryId ? { ...c, risk: newRisk } : c
        ),
      };
    }
  });

  // 5. conflict-update — update conflict in bootstrapData
  eventSource.addEventListener('conflict-update', (e) => {
    const { conflictId, status, dayCount } = JSON.parse(e.data);
    const data = bootstrapData.value;
    if (data) {
      bootstrapData.value = {
        ...data,
        conflicts: data.conflicts.map(c =>
          c._id === conflictId ? { ...c, status, dayCount } : c
        ),
      };
    }
  });

  // 6. anomaly — push to anomalyAlerts, trigger banner
  eventSource.addEventListener('anomaly', (e) => {
    const anomaly: Anomaly = JSON.parse(e.data);
    anomalyAlerts.value = [anomaly, ...anomalyAlerts.value];
  });

  // 7. snapshot — update timeline "live" endpoint
  eventSource.addEventListener('snapshot', (e) => {
    const { timestamp } = JSON.parse(e.data);
    // Only update if we're in live mode (not scrubbing)
    if (!timelinePosition.value) {
      // Signal that a new snapshot is available
      console.log('[SSE] New snapshot:', timestamp);
    }
  });

  // 8. plugin-poll — refresh plugin layer data
  eventSource.addEventListener('plugin-poll', (e) => {
    const { pluginId, inserted, total } = JSON.parse(e.data);
    console.log(`[SSE] Plugin poll: ${pluginId} +${inserted} (${total} total)`);
  });

  // 9. plugin-data — refresh plugin layer data
  eventSource.addEventListener('plugin-data', (e) => {
    const { pluginId, newDocs, totalDocs } = JSON.parse(e.data);
    console.log(`[SSE] Plugin data: ${pluginId} +${newDocs} (${totalDocs} total)`);
  });
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    console.log(`[SSE] Reconnecting (delay: ${reconnectDelay}ms)...`);
    connectSSE();
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
  }, reconnectDelay);
}

export function disconnectSSE(): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}
