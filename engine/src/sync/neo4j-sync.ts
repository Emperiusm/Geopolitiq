import { type Logger } from '@gambit/common';
import type { DrizzleClient } from '../db/transaction';
import { entities, entityEdges } from '../db/schema/entities';

/**
 * Full sync: reads all entities and edges from PostgreSQL and writes them
 * to Neo4j as nodes and relationships.  Designed to be called once at startup
 * or on demand — incremental sync is handled by the change-stream module
 * which can call this for individual entities later.
 */
export async function fullNeo4jSync(
  pgDb: DrizzleClient,
  neo4jDriver: any | null,
  logger: Logger,
): Promise<{ nodes: number; edges: number }> {
  if (!neo4jDriver) {
    logger.warn('Neo4j not connected — skipping graph sync');
    return { nodes: 0, edges: 0 };
  }

  const session = neo4jDriver.session();
  let nodeCount = 0;
  let edgeCount = 0;

  try {
    // ── 1. Read all entities from PostgreSQL ──────────────────────────
    logger.info('Reading entities from PostgreSQL for Neo4j sync');
    const allEntities = await pgDb
      .select({
        id: entities.id,
        type: entities.type,
        name: entities.name,
        status: entities.status,
        iso2: entities.iso2,
        risk: entities.risk,
        lat: entities.lat,
        lng: entities.lng,
      })
      .from(entities);

    logger.info({ count: allEntities.length }, 'Entities loaded for Neo4j sync');

    // ── 2. Create/merge Neo4j nodes ───────────────────────────────────
    // Process in batches to avoid transaction size limits
    const BATCH_SIZE = 500;
    for (let i = 0; i < allEntities.length; i += BATCH_SIZE) {
      const batch = allEntities.slice(i, i + BATCH_SIZE);

      await session.executeWrite(async (tx: any) => {
        for (const entity of batch) {
          // Use the entity type as the Neo4j label (capitalize first letter)
          const label = entity.type.charAt(0).toUpperCase() + entity.type.slice(1);
          await tx.run(
            `MERGE (n:Entity {id: $id})
             SET n:${sanitizeLabel(label)},
                 n.name = $name,
                 n.type = $type,
                 n.status = $status,
                 n.iso2 = $iso2,
                 n.risk = $risk,
                 n.lat = $lat,
                 n.lng = $lng,
                 n.updatedAt = datetime()`,
            {
              id: entity.id,
              name: entity.name,
              type: entity.type,
              status: entity.status,
              iso2: entity.iso2 ?? null,
              risk: entity.risk ?? null,
              lat: entity.lat ? parseFloat(entity.lat) : null,
              lng: entity.lng ? parseFloat(entity.lng) : null,
            },
          );
        }
      });

      nodeCount += batch.length;
    }

    logger.info({ nodeCount }, 'Neo4j nodes synced');

    // ── 3. Read all edges from PostgreSQL ─────────────────────────────
    const allEdges = await pgDb
      .select({
        id: entityEdges.id,
        fromId: entityEdges.fromId,
        toId: entityEdges.toId,
        relation: entityEdges.relation,
        weight: entityEdges.weight,
        source: entityEdges.source,
      })
      .from(entityEdges);

    logger.info({ count: allEdges.length }, 'Edges loaded for Neo4j sync');

    // ── 4. Create/merge Neo4j relationships ───────────────────────────
    for (let i = 0; i < allEdges.length; i += BATCH_SIZE) {
      const batch = allEdges.slice(i, i + BATCH_SIZE);

      await session.executeWrite(async (tx: any) => {
        for (const edge of batch) {
          const relType = sanitizeRelationType(edge.relation);
          await tx.run(
            `MATCH (a:Entity {id: $fromId})
             MATCH (b:Entity {id: $toId})
             MERGE (a)-[r:${relType}]->(b)
             SET r.id = $id,
                 r.weight = $weight,
                 r.source = $source,
                 r.updatedAt = datetime()`,
            {
              id: edge.id,
              fromId: edge.fromId,
              toId: edge.toId,
              weight: edge.weight ? parseFloat(edge.weight) : 1.0,
              source: edge.source ?? 'seed',
            },
          );
        }
      });

      edgeCount += batch.length;
    }

    logger.info({ nodeCount, edgeCount }, 'Neo4j full sync complete');
  } finally {
    await session.close();
  }

  return { nodes: nodeCount, edges: edgeCount };
}

/**
 * Sanitize a string for use as a Neo4j node label.
 * Labels must start with a letter and contain only alphanumeric chars / underscores.
 */
function sanitizeLabel(label: string): string {
  return label.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^([^a-zA-Z])/, 'L$1');
}

/**
 * Sanitize a relation string for use as a Neo4j relationship type.
 * Relationship types in Cypher are typically UPPER_SNAKE_CASE.
 */
function sanitizeRelationType(relation: string): string {
  return relation
    .toUpperCase()
    .replace(/-/g, '_')
    .replace(/[^A-Z0-9_]/g, '');
}
