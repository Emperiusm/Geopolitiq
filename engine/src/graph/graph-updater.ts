import { createLogger } from '@gambit/common';
import { getPredicateConfig } from './predicate-registry';
import type { Claim } from '../pipeline/types';

const logger = createLogger('graph-updater');

export interface WriteClaimsResult {
  edgesCreated: number;
  edgesSkipped: number;
}

export function normalizePredicate(pred: string): string {
  return pred.toUpperCase().replace(/-/g, '_');
}

export class GraphUpdater {
  private writtenTriples = new Set<string>();

  constructor(private neo4j: any | null) {}

  /**
   * Groups claims by their normalized predicate string.
   */
  groupByPredicate(claims: Claim[]): Map<string, Claim[]> {
    const grouped = new Map<string, Claim[]>();

    for (const claim of claims) {
      const key = normalizePredicate(claim.predicate);
      const existing = grouped.get(key);
      if (existing) {
        existing.push(claim);
      } else {
        grouped.set(key, [claim]);
      }
    }

    return grouped;
  }

  /**
   * Writes batched MERGE Cypher statements to Neo4j for each predicate group.
   * Returns counts of edges created and skipped (dedup).
   */
  async writeClaims(
    claims: Claim[],
    signalId: string,
    sourceId: string,
    publishedAt: string,
  ): Promise<WriteClaimsResult> {
    let edgesCreated = 0;
    let edgesSkipped = 0;

    // Deduplicate within this pipeline run
    const deduped: Claim[] = [];
    for (const claim of claims) {
      const tripleKey = `${claim.subject}|${normalizePredicate(claim.predicate)}|${claim.object}`;
      if (this.writtenTriples.has(tripleKey)) {
        edgesSkipped++;
        continue;
      }
      this.writtenTriples.add(tripleKey);
      deduped.push(claim);
    }

    if (deduped.length === 0 || this.neo4j === null) {
      return { edgesCreated, edgesSkipped };
    }

    const grouped = this.groupByPredicate(deduped);

    const session = this.neo4j.session();
    try {
      for (const [predicate, group] of grouped) {
        const config = getPredicateConfig(predicate.toLowerCase().replace(/_/g, '-'));
        const isConceptObject = config.objectType === 'concept';

        const rows = group.map((c) => ({
          subjectId: c.subject,
          objectName: c.object,
          confidence: c.confidence,
          signalId,
          sourceId,
          publishedAt,
        }));

        if (isConceptObject) {
          // Object is a Concept node — merge by name, track mention_count
          const cypher = `
            UNWIND $rows AS row
            MATCH (s:Entity { id: row.subjectId })
            MERGE (o:Concept { name: row.objectName })
              ON CREATE SET o.name = row.objectName, o.mention_count = 0
              ON MATCH SET o.mention_count = o.mention_count + 1
            MERGE (s)-[r:${predicate}]->(o)
              ON CREATE SET
                r.confidence = row.confidence,
                r.signal_id  = row.signalId,
                r.source_id  = row.sourceId,
                r.first_seen = row.publishedAt,
                r.last_seen  = row.publishedAt
              ON MATCH SET
                r.confidence = CASE WHEN row.confidence > r.confidence THEN row.confidence ELSE r.confidence END,
                r.last_seen  = row.publishedAt
            RETURN count(r) AS created
          `.trim();

          const result = await session.run(cypher, { rows });
          edgesCreated += (result.records[0]?.get('created')?.toNumber() ?? 0);
        } else {
          // Object is an Entity node
          const cypher = `
            UNWIND $rows AS row
            MATCH (s:Entity { id: row.subjectId })
            MATCH (o:Entity { id: row.objectName })
            MERGE (s)-[r:${predicate}]->(o)
              ON CREATE SET
                r.confidence = row.confidence,
                r.signal_id  = row.signalId,
                r.source_id  = row.sourceId,
                r.first_seen = row.publishedAt,
                r.last_seen  = row.publishedAt
              ON MATCH SET
                r.confidence = CASE WHEN row.confidence > r.confidence THEN row.confidence ELSE r.confidence END,
                r.last_seen  = row.publishedAt
            RETURN count(r) AS created
          `.trim();

          const result = await session.run(cypher, { rows });
          edgesCreated += (result.records[0]?.get('created')?.toNumber() ?? 0);
        }
      }
    } catch (err) {
      logger.error({ err, signalId }, 'Neo4j writeClaims error');
      throw err;
    } finally {
      await session.close();
    }

    return { edgesCreated, edgesSkipped };
  }

  /**
   * Clears the within-run triple dedup cache.
   */
  resetRunCache(): void {
    this.writtenTriples.clear();
  }
}
