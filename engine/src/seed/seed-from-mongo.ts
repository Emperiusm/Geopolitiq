import { MongoClient } from 'mongodb';
import { EDGE_MAPPINGS, edgeId, recordId, createLogger } from '@gambit/common';
import { loadConfig } from '@gambit/common';
import { connectPostgres, closePgPool } from '../infrastructure/postgres';
import { entities, entityEdges, resolutionAliases } from '../db/schema/entities';
import { teams, users, apiKeys, sessions } from '../db/schema/auth';
import { ENTITY_MAPPINGS, AUTH_MAPPINGS } from './transformers';
import { buildResolverContext, TARGET_RESOLVERS } from './resolvers';
import { inferNsaConflictEdges, inferConflictChokepointEdges } from './infer-edges';
import { validateEntity } from './validator';
import { sql } from 'drizzle-orm';

const logger = createLogger('seed');

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function main() {
  const config = loadConfig();
  const db = await connectPostgres(config, logger);

  const mongoClient = new MongoClient(config.mongo.uri);
  await mongoClient.connect();
  const mongoDb = mongoClient.db();
  logger.info('MongoDB connected for seed');

  const report = {
    entities: { inserted: 0, invalid: 0 },
    edges: { inserted: 0, unresolvable: 0 },
    aliases: { inserted: 0 },
    auth: { teams: 0, users: 0, apiKeys: 0, sessions: 0 },
  };
  const start = Date.now();

  // ── Phase 1: Seed auth tables ──────────────────────────────────────
  logger.info('Phase 1: Seeding auth tables');

  const teamDocs = await mongoDb.collection('teams').find({}).toArray();
  if (teamDocs.length > 0) {
    for (const batch of chunk(teamDocs, 500)) {
      const rows = batch.map(AUTH_MAPPINGS.teams);
      await db.insert(teams).values(rows).onConflictDoNothing();
    }
    report.auth.teams = teamDocs.length;
    logger.info({ count: teamDocs.length }, 'Teams seeded');
  }

  const userDocs = await mongoDb.collection('users').find({}).toArray();
  if (userDocs.length > 0) {
    for (const batch of chunk(userDocs, 500)) {
      const rows = batch.map(AUTH_MAPPINGS.users);
      await db.insert(users).values(rows).onConflictDoNothing();
    }
    report.auth.users = userDocs.length;
    logger.info({ count: userDocs.length }, 'Users seeded');
  }

  const apiKeyDocs = await mongoDb.collection('apiKeys').find({}).toArray();
  if (apiKeyDocs.length > 0) {
    for (const batch of chunk(apiKeyDocs, 500)) {
      const rows = batch.map(AUTH_MAPPINGS.apiKeys);
      await db.insert(apiKeys).values(rows).onConflictDoNothing();
    }
    report.auth.apiKeys = apiKeyDocs.length;
    logger.info({ count: apiKeyDocs.length }, 'API keys seeded');
  }

  const sessionDocs = await mongoDb.collection('sessions').find({}).toArray();
  if (sessionDocs.length > 0) {
    for (const batch of chunk(sessionDocs, 500)) {
      const rows = batch.map(AUTH_MAPPINGS.sessions);
      await db.insert(sessions).values(rows).onConflictDoNothing();
    }
    report.auth.sessions = sessionDocs.length;
    logger.info({ count: sessionDocs.length }, 'Sessions seeded');
  }

  // ── Phase 2: Seed entities ─────────────────────────────────────────
  logger.info('Phase 2: Seeding entities');

  const allEntities: {
    id: string;
    type: string;
    name: string;
    aliases: string[];
    lat?: string;
    lng?: string;
    risk?: string;
    ticker?: string;
    iso2?: string;
    tags: string[];
    meta: Record<string, any>;
  }[] = [];

  for (const mapping of ENTITY_MAPPINGS) {
    const docs = await mongoDb.collection(mapping.collection).find({}).toArray();
    logger.info({ collection: mapping.collection, count: docs.length }, 'Reading collection');
    for (const doc of docs) {
      const transformed = mapping.transform(doc);
      const validation = validateEntity({ ...transformed, type: mapping.entityType });
      if (!validation.valid) {
        report.entities.invalid++;
        logger.warn({ id: transformed.id, errors: validation.errors }, 'Skipping invalid entity');
        continue;
      }
      allEntities.push({ ...transformed, type: mapping.entityType });
    }
  }

  // Batch upsert entities in chunks of 500
  for (const batch of chunk(allEntities, 500)) {
    const rows = batch.map((e) => ({
      id: e.id,
      type: e.type as any,
      name: e.name,
      aliases: e.aliases,
      lat: e.lat ?? null,
      lng: e.lng ?? null,
      risk: e.risk ?? null,
      ticker: e.ticker ?? null,
      iso2: e.iso2 ?? null,
      tags: e.tags,
      meta: e.meta,
    }));
    await db
      .insert(entities)
      .values(rows)
      .onConflictDoUpdate({
        target: entities.id,
        set: {
          name: sql`excluded.name`,
          aliases: sql`excluded.aliases`,
          lat: sql`excluded.lat`,
          lng: sql`excluded.lng`,
          risk: sql`excluded.risk`,
          ticker: sql`excluded.ticker`,
          iso2: sql`excluded.iso2`,
          tags: sql`excluded.tags`,
          meta: sql`excluded.meta`,
          updatedAt: sql`now()`,
        },
      });
    report.entities.inserted += batch.length;
  }

  logger.info(
    { inserted: report.entities.inserted, invalid: report.entities.invalid },
    'Entities seeded',
  );

  // ── Phase 3: Build resolver context ────────────────────────────────
  logger.info('Phase 3: Building resolver context');

  const resolverCtx = buildResolverContext(
    allEntities.map((e) => ({ id: e.id, type: e.type, iso2: e.iso2, name: e.name })),
  );
  logger.info(
    {
      countriesByIso2: resolverCtx.countriesByIso2.size,
      countriesByName: resolverCtx.countriesByName.size,
    },
    'Resolver context built',
  );

  // ── Phase 4: Extract edges from EDGE_MAPPINGS ──────────────────────
  logger.info('Phase 4: Extracting edges');

  const allEdgeInserts: {
    id: string;
    fromId: string;
    toId: string;
    relation: string;
    weight: string;
    source: string;
  }[] = [];

  for (const mapping of EDGE_MAPPINGS) {
    const docs = await mongoDb.collection(mapping.sourceCollection).find({}).toArray();
    for (const doc of docs) {
      const sourceEntityId = recordId(mapping.sourceType, String(doc._id));
      for (const edgeDef of mapping.edges) {
        const rawValues: string[] =
          edgeDef.fieldType === 'array'
            ? (doc[edgeDef.field] ?? [])
            : doc[edgeDef.field]
              ? [doc[edgeDef.field]]
              : [];

        for (const rawValue of rawValues) {
          const resolver = edgeDef.targetResolver
            ? TARGET_RESOLVERS[edgeDef.targetResolver]
            : null;
          const targetId = resolver
            ? resolver(rawValue, resolverCtx)
            : recordId(edgeDef.targetType, rawValue);

          if (!targetId) {
            report.edges.unresolvable++;
            logger.debug(
              { source: sourceEntityId, field: edgeDef.field, value: rawValue },
              'Unresolvable edge target',
            );
            continue;
          }

          allEdgeInserts.push({
            id: edgeId(sourceEntityId, edgeDef.relation, targetId),
            fromId: sourceEntityId,
            toId: targetId,
            relation: edgeDef.relation,
            weight: (edgeDef.weight ?? 1.0).toString(),
            source: 'seed',
          });

          if (edgeDef.bidirectional && edgeDef.reverseRelation) {
            allEdgeInserts.push({
              id: edgeId(targetId, edgeDef.reverseRelation, sourceEntityId),
              fromId: targetId,
              toId: sourceEntityId,
              relation: edgeDef.reverseRelation,
              weight: (edgeDef.weight ?? 1.0).toString(),
              source: 'seed',
            });
          }
        }
      }
    }
  }

  // ── Phase 5: Inferred edges ────────────────────────────────────────
  logger.info('Phase 5: Inferring edges');

  const nsaDocs = await mongoDb.collection('nonStateActors').find({}).toArray();
  const conflictDocs = await mongoDb.collection('conflicts').find({}).toArray();
  const chokepointDocs = await mongoDb.collection('chokepoints').find({}).toArray();

  const inferredNsa = inferNsaConflictEdges(nsaDocs, conflictDocs);
  const inferredConflict = inferConflictChokepointEdges(conflictDocs, chokepointDocs);

  for (const edge of [...inferredNsa, ...inferredConflict]) {
    allEdgeInserts.push({
      ...edge,
      id: edgeId(edge.fromId, edge.relation, edge.toId),
    });
  }

  logger.info(
    { total: allEdgeInserts.length, inferred: inferredNsa.length + inferredConflict.length },
    'Edge extraction complete',
  );

  // Batch insert edges with onConflictDoNothing (unique constraint handles dedup)
  for (const batch of chunk(allEdgeInserts, 500)) {
    const rows = batch.map((e) => ({
      id: e.id,
      fromId: e.fromId,
      toId: e.toId,
      relation: e.relation,
      weight: e.weight,
      source: e.source,
    }));
    await db.insert(entityEdges).values(rows).onConflictDoNothing();
    report.edges.inserted += batch.length;
  }

  logger.info(
    { inserted: report.edges.inserted, unresolvable: report.edges.unresolvable },
    'Edges seeded',
  );

  // ── Phase 6: Resolution aliases ────────────────────────────────────
  logger.info('Phase 6: Creating resolution aliases');

  const allAliasInserts: {
    id: string;
    entityId: string;
    alias: string;
    source: string;
    confidence: string;
  }[] = [];

  for (const entity of allEntities) {
    // De-duplicate aliases per entity
    const seen = new Set<string>();
    const addAlias = (alias: string, source: string, confidence: string) => {
      const normalized = alias.toLowerCase().trim();
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      allAliasInserts.push({
        id: `alias--${entity.id}--${normalized}`,
        entityId: entity.id,
        alias: normalized,
        source,
        confidence,
      });
    };

    // Primary name is high confidence
    addAlias(entity.name, 'seed:name', '1.0');

    // Additional aliases are medium confidence
    for (const alias of entity.aliases) {
      addAlias(alias, 'seed:alias', '0.8');
    }
  }

  // Batch insert aliases with onConflictDoNothing
  for (const batch of chunk(allAliasInserts, 500)) {
    await db.insert(resolutionAliases).values(batch).onConflictDoNothing();
    report.aliases.inserted += batch.length;
  }

  logger.info({ inserted: report.aliases.inserted }, 'Aliases seeded');

  // ── Report ─────────────────────────────────────────────────────────
  logger.info(
    {
      ...report,
      duration: `${((Date.now() - start) / 1000).toFixed(1)}s`,
    },
    'Seed complete',
  );

  await mongoClient.close();
  await closePgPool();
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, 'Seed failed');
  process.exit(1);
});
