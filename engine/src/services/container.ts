import type { DrizzleClient } from '../db/transaction';
import type { TypesenseClient } from '../infrastructure/typesense';
import type { ClickhouseClient } from '../infrastructure/clickhouse';
import type { Logger, GambitConfig, AuthProvider } from '@gambit/common';
import type { createCacheStack } from '../infrastructure/cache-layers';

export interface ServiceContainer {
  db: DrizzleClient;
  typesense: TypesenseClient | null;
  clickhouse: ClickhouseClient | null;
  minio: any | null;
  temporal: any | null;
  redisCache: any | null;
  redisPersistent: any | null;
  config: GambitConfig;
  logger: Logger;
  authProvider: AuthProvider;
  cache: ReturnType<typeof createCacheStack>;
  entityService: any;
  searchService: any;
  sync?: any;
}

export function createServiceContainer(deps: {
  db: DrizzleClient;
  typesense: TypesenseClient | null;
  clickhouse: ClickhouseClient | null;
  minio: any | null;
  temporal: any | null;
  redisCache: any | null;
  redisPersistent: any | null;
  config: GambitConfig;
  logger: Logger;
  authProvider: AuthProvider;
  cache: ReturnType<typeof createCacheStack>;
}): ServiceContainer {
  const container: ServiceContainer = {
    ...deps,
    entityService: null,
    searchService: null,
  };

  return container;
}
