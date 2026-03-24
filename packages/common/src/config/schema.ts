import { z } from 'zod';

export const configSchema = z.object({
  engine: z.object({
    port: z.coerce.number().default(3001),
  }),
  postgres: z.object({
    url: z.string().default('postgresql://gambit:gambit@localhost:6432/gambit'),
    readUrl: z.string().optional(),
  }),
  mongo: z.object({
    uri: z.string().default('mongodb://localhost:27017/gambit'),
  }),
  redis: z.object({
    cacheUrl: z.string().default('redis://localhost:6380'),
    persistentUrl: z.string().default('redis://localhost:6381'),
  }),
  clickhouse: z.object({
    url: z.string().optional(),
  }),
  typesense: z.object({
    url: z.string().optional(),
    apiKey: z.string().default('gambit-dev'),
  }),
  temporal: z.object({
    address: z.string().optional(),
  }),
  minio: z.object({
    endpoint: z.string().optional(),
    accessKey: z.string().default('gambit'),
    secretKey: z.string().default('gambit-dev'),
  }),
  nats: z.object({
    url: z.string().optional(),
  }),
  auth: z.object({
    jwtSecret: z.string().default('gambit-dev-secret-change-in-production'),
  }),
  log: z.object({
    level: z.string().default('info'),
  }),
});
