import type { ResolvedSignal, SourceConfig } from '../types';

export interface GraphActivityResult {
  edgesCreated: number;
  edgesSkipped: number;
}

/**
 * Graph activity — writes signal claims to Neo4j via GraphUpdater.
 */
export async function graphActivity(
  signal: ResolvedSignal,
  signalId: string,
  source: SourceConfig,
): Promise<GraphActivityResult> {
  if (!signal.claims || signal.claims.length === 0) {
    return { edgesCreated: 0, edgesSkipped: 0 };
  }

  const { GraphUpdater } = await import('../../graph/graph-updater');

  let neo4j: any = null;

  try {
    const neo4jDriver = await import('neo4j-driver');
    const neo4jUrl = process.env.NEO4J_URL ?? 'bolt://localhost:7687';
    const neo4jUser = process.env.NEO4J_USER ?? 'neo4j';
    const neo4jPassword = process.env.NEO4J_PASSWORD ?? 'neo4j';
    neo4j = neo4jDriver.default.driver(neo4jUrl, neo4jDriver.default.auth.basic(neo4jUser, neo4jPassword));
  } catch {
    // Neo4j unavailable — GraphUpdater handles null gracefully
  }

  const updater = new GraphUpdater(neo4j);
  const result = await updater.writeClaims(
    signal.claims,
    signalId,
    source.id,
    signal.publishedAt,
  );

  if (neo4j) {
    await neo4j.close().catch(() => {});
  }

  return result;
}
