import Typesense from 'typesense';
import type { GambitConfig, Logger } from '@gambit/common';

export const ENTITY_COLLECTION_SCHEMA = {
  name: 'entities',
  fields: [
    { name: 'id', type: 'string' as const },
    { name: 'type', type: 'string' as const, facet: true },
    { name: 'name', type: 'string' as const },
    { name: 'aliases', type: 'string[]' as const },
    { name: 'status', type: 'string' as const, facet: true },
    { name: 'sector', type: 'string' as const, optional: true, facet: true },
    { name: 'jurisdiction', type: 'string' as const, optional: true, facet: true },
    { name: 'domains', type: 'string[]' as const, facet: true },
    { name: 'tags', type: 'string[]' as const, facet: true },
    { name: 'risk', type: 'string' as const, optional: true, facet: true },
    { name: 'ticker', type: 'string' as const, optional: true },
    { name: 'iso2', type: 'string' as const, optional: true },
    { name: 'reality_score', type: 'float' as const, optional: true, sort: true },
    { name: 'signal_count', type: 'int32' as const, optional: true, sort: true },
    { name: 'lat', type: 'float' as const, optional: true },
    { name: 'lng', type: 'float' as const, optional: true },
    { name: 'updated_at', type: 'int64' as const, sort: true },
  ],
  default_sorting_field: 'updated_at',
  token_separators: ['-', '_', ':'],
  symbols_to_index: [':'],
};

export type TypesenseClient = InstanceType<typeof Typesense.Client>;

export async function connectTypesense(config: GambitConfig, logger: Logger): Promise<TypesenseClient | null> {
  if (!config.typesense.url) {
    logger.warn('Typesense URL not configured — search disabled');
    return null;
  }

  try {
    const url = new URL(config.typesense.url);
    const client = new Typesense.Client({
      nodes: [{ host: url.hostname, port: parseInt(url.port || '8108'), protocol: url.protocol.replace(':', '') }],
      apiKey: config.typesense.apiKey,
      connectionTimeoutSeconds: 5,
      retryIntervalSeconds: 0.5,
      numRetries: 3,
    });

    await client.health.retrieve();
    logger.info('Typesense connected');

    // Ensure collection exists
    try {
      await client.collections('entities').retrieve();
    } catch {
      await client.collections().create(ENTITY_COLLECTION_SCHEMA);
      logger.info('Typesense entities collection created');
    }

    return client;
  } catch (err) {
    logger.warn({ err }, 'Typesense not available — search disabled');
    return null;
  }
}

export async function configureSynonyms(client: TypesenseClient, logger: Logger): Promise<void> {
  const synonyms = [
    { id: 'usa', synonyms: ['United States', 'USA', 'US', 'America', 'United States of America'] },
    { id: 'uk', synonyms: ['United Kingdom', 'UK', 'Britain', 'Great Britain'] },
    { id: 'uae', synonyms: ['United Arab Emirates', 'UAE', 'Emirates'] },
    { id: 'prc', synonyms: ['China', 'PRC', 'Peoples Republic of China'] },
    { id: 'nato', synonyms: ['NATO', 'North Atlantic Treaty Organization'] },
    { id: 'eu', synonyms: ['EU', 'European Union'] },
  ];

  for (const syn of synonyms) {
    try {
      await client.collections('entities').synonyms().upsert(syn.id, { synonyms: syn.synonyms });
    } catch {
      // Non-fatal
    }
  }
  logger.info(`Configured ${synonyms.length} synonym sets`);
}
