export interface SSEEvent {
  id: string;
  type: SSEEventType;
  timestamp: string;
  data: Record<string, any>;
}

export type SSEEventType =
  | 'signal-ingested'
  | 'signal-corroborated'
  | 'entity-created'
  | 'source-health-changed'
  | 'pipeline-run-completed';

export const SSE_CHANNELS = {
  global: 'sse:global',
  entity: (id: string) => `sse:entity:${id}`,
  source: (id: string) => `sse:source:${id}`,
  team: (id: string) => `sse:team:${id}`,
} as const;
