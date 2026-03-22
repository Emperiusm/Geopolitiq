import type { GambitConfig, Logger } from '@gambit/common';

// Temporal client type — imported dynamically to avoid requiring @temporalio/client at startup
export type TemporalClient = any;

export async function connectTemporal(config: GambitConfig, logger: Logger): Promise<TemporalClient | null> {
  if (!config.temporal.address) {
    logger.warn('Temporal address not configured — workflows disabled');
    return null;
  }

  try {
    const { Connection, Client } = await import('@temporalio/client');
    const connection = await Connection.connect({ address: config.temporal.address });
    const client = new Client({ connection });
    logger.info('Temporal connected');
    return client;
  } catch (err) {
    logger.warn({ err }, 'Temporal not available — workflows disabled');
    return null;
  }
}
