import { Client as MinioClient } from 'minio';
import type { GambitConfig, Logger } from '@gambit/common';

export type { MinioClient };

const REQUIRED_BUCKETS = ['documents', 'exports', 'foia-responses', 'raw-payloads', 'token-embeddings'];

export async function connectMinio(config: GambitConfig, logger: Logger): Promise<MinioClient | null> {
  if (!config.minio.endpoint) {
    logger.warn('MinIO endpoint not configured — document storage disabled');
    return null;
  }

  try {
    const client = new MinioClient({
      endPoint: config.minio.endpoint.split(':')[0],
      port: parseInt(config.minio.endpoint.split(':')[1] || '9000'),
      useSSL: false,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    });

    await client.listBuckets();
    logger.info('MinIO connected');
    return client;
  } catch (err) {
    logger.warn({ err }, 'MinIO not available — document storage disabled');
    return null;
  }
}

export async function ensureBuckets(client: MinioClient, logger: Logger): Promise<void> {
  for (const bucket of REQUIRED_BUCKETS) {
    const exists = await client.bucketExists(bucket);
    if (!exists) {
      await client.makeBucket(bucket);
      logger.info({ bucket }, 'Created MinIO bucket');
    }
  }
}
