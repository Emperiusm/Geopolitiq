import { writeTx } from "../infrastructure/neo4j";

/**
 * Creates all Neo4j indexes and constraints. Idempotent — safe to run on every startup.
 * Neo4j Community Edition: no composite range indexes, per-label spatial indexes.
 */
export async function ensureNeo4jSchema(): Promise<void> {
  console.log("[neo4j] ensuring schema...");

  const statements = [
    // Entity lookups (via secondary :Entity label on all entity nodes)
    `CREATE INDEX entity_id IF NOT EXISTS FOR (n:Entity) ON (n.id)`,
    `CREATE INDEX entity_type IF NOT EXISTS FOR (n:Entity) ON (n.type)`,

    // Claim queries
    `CREATE INDEX claim_fingerprint IF NOT EXISTS FOR (n:Claim) ON (n.fingerprint)`,
    `CREATE INDEX claim_topic IF NOT EXISTS FOR (n:Claim) ON (n.topic)`,
    `CREATE INDEX claim_status IF NOT EXISTS FOR (n:Claim) ON (n.status)`,
    `CREATE INDEX claim_confidence IF NOT EXISTS FOR (n:Claim) ON (n.confidence)`,

    // Alias resolution
    `CREATE INDEX alias_lookup IF NOT EXISTS FOR (n:Alias) ON (n.alias)`,

    // Event sourcing
    `CREATE INDEX event_timestamp IF NOT EXISTS FOR (n:GraphEvent) ON (n.timestamp)`,

    // Spatial (per-label for types that carry location)
    `CREATE POINT INDEX country_location IF NOT EXISTS FOR (n:Country) ON (n.location)`,
    `CREATE POINT INDEX base_location IF NOT EXISTS FOR (n:MilitaryBase) ON (n.location)`,
    `CREATE POINT INDEX conflict_location IF NOT EXISTS FOR (n:Conflict) ON (n.location)`,
    `CREATE POINT INDEX chokepoint_location IF NOT EXISTS FOR (n:Chokepoint) ON (n.location)`,
    `CREATE POINT INDEX election_location IF NOT EXISTS FOR (n:Election) ON (n.location)`,
    `CREATE POINT INDEX port_location IF NOT EXISTS FOR (n:Port) ON (n.location)`,

    // Fulltext search
    `CREATE FULLTEXT INDEX entity_search IF NOT EXISTS FOR (n:Entity) ON EACH [n.label]`,
    `CREATE FULLTEXT INDEX claim_search IF NOT EXISTS FOR (n:Claim) ON EACH [n.content]`,

    // Vector similarity (populated by Ollama mxbai-embed-large)
    `CREATE VECTOR INDEX claim_embedding IF NOT EXISTS FOR (n:Claim) ON (n.embedding) OPTIONS {indexConfig: {\`vector.dimensions\`: 1024, \`vector.similarity_function\`: 'cosine'}}`,
  ];

  for (const stmt of statements) {
    try {
      await writeTx(async (tx) => { await tx.run(stmt); });
    } catch (err: any) {
      if (!err.message?.includes("already exists")) {
        console.warn(`[neo4j] schema warning: ${err.message}`);
      }
    }
  }

  console.log("[neo4j] schema ready");
}
