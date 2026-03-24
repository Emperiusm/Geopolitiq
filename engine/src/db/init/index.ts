import type { DrizzleClient } from '../transaction';
import type { Logger } from '@gambit/common';
import { createExtensions } from './extensions';
import { createTriggers } from './triggers';
import { createRlsPolicies } from './rls';
import { createComments } from './comments';
import { createMaterializedViews } from './materialized-views';
import { initPartitions } from './partitions';

export async function runDatabaseInit(db: DrizzleClient, logger: Logger): Promise<void> {
  await createExtensions(db);
  logger.info('PostgreSQL extensions created');

  await initPartitions(db, logger);
  logger.info('Partition setup complete');

  await createTriggers(db);
  logger.info('updated_at triggers created');

  await createRlsPolicies(db);
  logger.info('RLS policies applied');

  await createComments(db);
  logger.info('Table comments applied');

  await createMaterializedViews(db);
  logger.info('Materialized views created');
}
