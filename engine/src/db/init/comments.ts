import { sql } from 'drizzle-orm';
import type { DrizzleClient } from '../transaction';

export async function createComments(db: DrizzleClient) {
  const comments = [
    `COMMENT ON TABLE entities IS 'Unified entity model — one row per entity. Source of truth for the knowledge graph.'`,
    `COMMENT ON TABLE entity_edges IS 'Explicit relationships between entities. Synced to Neo4j as read index.'`,
    `COMMENT ON TABLE signals IS 'Atomic intelligence signals — one data point per row.'`,
    `COMMENT ON TABLE memory_tokens IS 'TokMem procedural memory — trained token embeddings for extraction.'`,
    `COMMENT ON COLUMN entities.id IS 'Record ID: type:slug (e.g., company:nvidia)'`,
    `COMMENT ON COLUMN signals.polarity IS 'Declarative = what they say. Behavioral = what they do.'`,
  ];

  for (const comment of comments) {
    try {
      await db.execute(sql.raw(comment));
    } catch {
      // Table may not exist yet during first migration
    }
  }
}
