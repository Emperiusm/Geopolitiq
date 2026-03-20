/**
 * GAMBIT — SSE Client
 *
 * EventSource with reconnect logic for all 16 event types.
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
import { fetchBootstrap } from '@/api/bootstrap';

const SSE_URL = (import.meta.env.VITE_API_URL || '/api/v1') + '/events/stream';

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

  // 10. graph:batch — bulk graph data (nodes/edges)
  eventSource.addEventListener('graph:batch', (e) => {
    const data = JSON.parse(e.data);
    console.log('[sse] graph:batch', data);
  });

  // 11. graph:belief-updated — a belief/claim on an entity changed
  eventSource.addEventListener('graph:belief-updated', (e) => {
    const data = JSON.parse(e.data);
    console.log('[sse] belief updated:', data.entityLabel, data.topic, data.newContent);
  });

  // 12. graph:claim-disputed — a claim was flagged as disputed
  eventSource.addEventListener('graph:claim-disputed', (e) => {
    const data = JSON.parse(e.data);
    console.log('[sse] claim disputed:', data.entityLabel, data.topic);
  });

  // 13. agent:status — heartbeat from intelligence agents
  eventSource.addEventListener('agent:status', (e) => {
    const data = JSON.parse(e.data);
    console.log('[sse] agent status:', data.agents?.length, 'agents');
  });

  // 14. agent:extraction — agent finished extracting claims from articles
  eventSource.addEventListener('agent:extraction', (e) => {
    const data = JSON.parse(e.data);
    console.log('[sse] extraction:', data.claimsCreated, 'claims from', data.articleCount, 'articles');
  });

  // 15. state:stale — backend signals that cached state is outdated
  eventSource.addEventListener('state:stale', () => {
    console.warn('[sse] state stale — re-bootstrapping');
    fetchBootstrap(true).then(data => {
      bootstrapData.value = data;
    }).catch(err => {
      console.error('[sse] re-bootstrap failed', err);
    });
  });

  // 16. news:cluster — a cluster of related articles was detected
  eventSource.addEventListener('news:cluster', (e) => {
    const data = JSON.parse(e.data);
    console.log('[sse] news cluster:', data.clusterSize, 'articles');
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
