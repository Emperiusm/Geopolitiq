import { type Logger, recordId } from '@gambit/common';
import type { DrizzleClient } from '../db/transaction';
import { entities } from '../db/schema/entities';
import { ENTITY_MAPPINGS } from '../seed/transformers';
import { eq, sql } from 'drizzle-orm';

/* ───────── Report types ───────── */

export interface CollectionReport {
  collection: string;
  entityType: string;
  mongoCount: number;
  pgCount: number;
  missing: number;
  extra: number;
  missingIds: string[];
  extraIds: string[];
}

export interface VerificationReport {
  collections: CollectionReport[];
  totalMongo: number;
  totalPostgres: number;
  missingInPostgres: string[];
  extraInPostgres: string[];
  durationMs: number;
}

/* ───────── Main verification function ───────── */

export async function verifySyncConsistency(
  mongoDb: any,
  pgDb: DrizzleClient,
  logger: Logger,
): Promise<VerificationReport> {
  const start = Date.now();
  const collections: CollectionReport[] = [];
  let totalMongo = 0;
  let totalPostgres = 0;
  const allMissingInPostgres: string[] = [];
  const allExtraInPostgres: string[] = [];

  for (const mapping of ENTITY_MAPPINGS) {
    logger.info({ collection: mapping.collection, entityType: mapping.entityType }, 'Verifying collection');

    // 1. Get all MongoDB document IDs for this collection
    const mongoDocs = await mongoDb
      .collection(mapping.collection)
      .find({}, { projection: { _id: 1 } })
      .toArray();

    const mongoIds = new Set<string>(
      mongoDocs.map((doc: any) => recordId(mapping.entityType, String(doc._id))),
    );
    const mongoCount = mongoIds.size;
    totalMongo += mongoCount;

    // 2. Get all PostgreSQL entity IDs of this type
    const pgRows = await pgDb
      .select({ id: entities.id })
      .from(entities)
      .where(eq(entities.type, mapping.entityType as any));

    const pgIds = new Set<string>(pgRows.map((r) => r.id));
    const pgCount = pgIds.size;
    totalPostgres += pgCount;

    // 3. Find missing (in Mongo but not PG) and extra (in PG but not Mongo)
    const missingIds: string[] = [];
    for (const id of mongoIds) {
      if (!pgIds.has(id)) {
        missingIds.push(id);
      }
    }

    const extraIds: string[] = [];
    for (const id of pgIds) {
      if (!mongoIds.has(id)) {
        extraIds.push(id);
      }
    }

    allMissingInPostgres.push(...missingIds);
    allExtraInPostgres.push(...extraIds);

    const report: CollectionReport = {
      collection: mapping.collection,
      entityType: mapping.entityType,
      mongoCount,
      pgCount,
      missing: missingIds.length,
      extra: extraIds.length,
      missingIds,
      extraIds,
    };
    collections.push(report);

    if (missingIds.length > 0 || extraIds.length > 0) {
      logger.warn(
        {
          collection: mapping.collection,
          mongoCount,
          pgCount,
          missing: missingIds.length,
          extra: extraIds.length,
        },
        'Sync mismatch detected',
      );
    } else {
      logger.info(
        { collection: mapping.collection, count: mongoCount },
        'Collection in sync',
      );
    }
  }

  const durationMs = Date.now() - start;

  const finalReport: VerificationReport = {
    collections,
    totalMongo,
    totalPostgres,
    missingInPostgres: allMissingInPostgres,
    extraInPostgres: allExtraInPostgres,
    durationMs,
  };

  if (allMissingInPostgres.length === 0 && allExtraInPostgres.length === 0) {
    logger.info(
      { totalMongo, totalPostgres, durationMs },
      'Sync verification passed — all collections consistent',
    );
  } else {
    logger.warn(
      {
        totalMongo,
        totalPostgres,
        missing: allMissingInPostgres.length,
        extra: allExtraInPostgres.length,
        durationMs,
      },
      'Sync verification found mismatches',
    );
  }

  return finalReport;
}
