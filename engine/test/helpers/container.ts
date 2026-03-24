import { createLogger } from '@gambit/common';
import { createCacheStack } from '../../src/infrastructure/cache-layers';
import { createServiceContainer } from '../../src/services/container';
import { PostgresAuthProvider } from '../../src/auth/postgres-auth-provider';
import { EntityService } from '../../src/services/entity.service';
import { SearchService } from '../../src/services/search.service';
import type { DrizzleClient } from '../../src/db/transaction';

export function createTestContainer(db: DrizzleClient) {
  const logger = createLogger('test');
  logger.level = 'silent'; // quiet during tests

  const cache = createCacheStack(null, logger); // no Redis in unit tests
  const authProvider = new PostgresAuthProvider(db);

  const searchService = new SearchService(null, logger);
  const entityService = new EntityService(db, cache, searchService, logger);

  const container = createServiceContainer({
    db,
    typesense: null,
    clickhouse: null,
    minio: null,
    temporal: null,
    redisCache: null,
    redisPersistent: null,
    config: {
      engine: { port: 3001 },
      postgres: { url: '' },
      mongo: { uri: '' },
      redis: { cacheUrl: '', persistentUrl: '' },
      clickhouse: {},
      typesense: { apiKey: 'test' },
      temporal: {},
      minio: { accessKey: 'test', secretKey: 'test' },
      auth: { jwtSecret: 'test-secret' },
      log: { level: 'silent' },
    } as any,
    logger,
    authProvider,
    cache,
  });

  // Wire services into the container (mirrors index.ts boot sequence)
  container.entityService = entityService;
  container.searchService = searchService;

  return container;
}
