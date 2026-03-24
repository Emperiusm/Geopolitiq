import { configSchema } from './schema';

export type GambitConfig = ReturnType<typeof loadConfig>;

export function loadConfig() {
  return configSchema.parse({
    engine: { port: process.env.ENGINE_PORT },
    postgres: { url: process.env.POSTGRES_URL, readUrl: process.env.POSTGRES_READ_URL },
    mongo: { uri: process.env.MONGO_URI },
    redis: {
      cacheUrl: process.env.REDIS_CACHE_URL,
      persistentUrl: process.env.REDIS_PERSISTENT_URL,
    },
    clickhouse: { url: process.env.CLICKHOUSE_URL },
    typesense: {
      url: process.env.TYPESENSE_URL,
      apiKey: process.env.TYPESENSE_API_KEY,
    },
    temporal: { address: process.env.TEMPORAL_ADDRESS },
    minio: {
      endpoint: process.env.MINIO_ENDPOINT,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    },
    nats: { url: process.env.NATS_URL },
    auth: { jwtSecret: process.env.JWT_SECRET },
    log: { level: process.env.LOG_LEVEL },
  });
}
