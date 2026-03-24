import { eq, sql } from 'drizzle-orm';
import type { DrizzleClient } from './transaction';
import { entities, resolutionAliases } from './schema/entities';

/**
 * Prepared-statement-style helpers for hot-path entity lookups.
 * Drizzle doesn't support true prepared statements via `.prepare()` with
 * postgres-js driver, so these are thin wrappers that keep the query
 * construction cost near zero and guarantee consistent column selection.
 */

export function entityById(db: DrizzleClient, id: string) {
  return db
    .select()
    .from(entities)
    .where(eq(entities.id, id))
    .limit(1);
}

export function entityByTicker(db: DrizzleClient, ticker: string) {
  return db
    .select()
    .from(entities)
    .where(eq(entities.ticker, ticker))
    .limit(1);
}

export function entityByIso2(db: DrizzleClient, iso2: string) {
  return db
    .select()
    .from(entities)
    .where(eq(entities.iso2, iso2.toUpperCase()))
    .limit(1);
}

export function aliasesByNormalized(db: DrizzleClient, alias: string) {
  return db
    .select()
    .from(resolutionAliases)
    .where(eq(resolutionAliases.alias, alias.toLowerCase().trim()))
    .orderBy(sql`${resolutionAliases.confidence} DESC`)
    .limit(5);
}
