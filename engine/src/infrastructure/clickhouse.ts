import { createClient } from '@clickhouse/client';
import type { GambitConfig, Logger } from '@gambit/common';

export type ClickhouseClient = ReturnType<typeof createClient>;

export async function connectClickhouse(config: GambitConfig, logger: Logger): Promise<ClickhouseClient | null> {
  if (!config.clickhouse.url) {
    logger.warn('ClickHouse URL not configured — analytics disabled');
    return null;
  }

  try {
    const client = createClient({
      url: config.clickhouse.url,
      username: 'gambit',
      password: 'gambit-dev',
      request_timeout: 30_000,
      keep_alive: { enabled: true, idle_socket_ttl: 30_000 },
      max_open_connections: 10,
    });

    await client.ping();
    logger.info('ClickHouse connected');
    return client;
  } catch (err) {
    logger.warn({ err }, 'ClickHouse not available — analytics disabled');
    return null;
  }
}
