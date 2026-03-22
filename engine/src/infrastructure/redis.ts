import type { Logger } from '@gambit/common';

// Use ioredis for compatibility with existing patterns
export async function connectRedis(url: string, logger: Logger, name: string): Promise<any | null> {
  try {
    const { default: Redis } = await import('ioredis');
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (times: number) => Math.min(times * 200, 5000),
    });

    await client.connect();
    logger.info({ name }, `Redis (${name}) connected`);
    return client;
  } catch (err) {
    logger.warn({ err, name }, `Redis (${name}) not available`);
    return null;
  }
}
