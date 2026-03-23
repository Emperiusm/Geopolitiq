import type { Logger } from '@gambit/common';

export async function initClickhouse(clickhouseClient: any | null, logger: Logger) {
  if (!clickhouseClient) {
    logger.warn('ClickHouse not connected — skipping schema init');
    return;
  }

  try {
    await clickhouseClient.command({
      query: `
        CREATE TABLE IF NOT EXISTS signal_analytics (
          entity_id String,
          source_id String,
          polarity Enum8('declarative' = 0, 'behavioral' = 1),
          category String,
          tier UInt8,
          domains Array(String),
          intensity Float32,
          confidence Float32,
          published_at DateTime64(3),
          ingested_at DateTime64(3),
          content_hash String
        ) ENGINE = MergeTree()
        ORDER BY (entity_id, polarity, published_at)
        PARTITION BY toYYYYMM(published_at)
      `,
    });

    await clickhouseClient.command({
      query: `
        CREATE TABLE IF NOT EXISTS gap_score_history (
          entity_id String,
          domain String,
          alignment Float64,
          reality_score Float64,
          category String,
          behavioral_count UInt32,
          behavioral_weighted Float64,
          declarative_count UInt32,
          declarative_weighted Float64,
          computed_at DateTime64(3)
        ) ENGINE = MergeTree()
        ORDER BY (entity_id, domain, computed_at)
        PARTITION BY toYYYYMM(computed_at)
      `,
    });

    logger.info('ClickHouse tables initialized');
  } catch (err) {
    logger.warn({ err }, 'ClickHouse init failed — analytics will be unavailable');
  }
}
