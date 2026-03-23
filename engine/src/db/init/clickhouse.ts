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

    await clickhouseClient.command({
      query: `
        CREATE TABLE IF NOT EXISTS signals_analytics (
          signal_id String,
          entity_id String,
          entity_name String,
          entity_type String,
          entity_sector String,
          entity_version UInt32,
          source_id String,
          source_name String,
          polarity String,
          category String,
          tier UInt8,
          domains Array(String),
          intensity Float64,
          confidence Float64,
          is_backfill UInt8,
          corroboration_count UInt16,
          published_at DateTime,
          ingested_at DateTime,
          updated_at DateTime
        ) ENGINE = ReplacingMergeTree(updated_at)
        PARTITION BY toYYYYMM(published_at)
        ORDER BY (entity_id, polarity, published_at)
      `,
    });

    await clickhouseClient.command({
      query: `
        CREATE TABLE IF NOT EXISTS source_health_metrics (
          source_id String,
          timestamp DateTime,
          uptime_pct Float64,
          avg_yield Float64,
          dlq_rate Float64,
          cost_per_signal Float64,
          circuit_state String
        ) ENGINE = MergeTree()
        PARTITION BY toYYYYMM(timestamp)
        ORDER BY (source_id, timestamp)
      `,
    });

    logger.info('ClickHouse tables initialized');
  } catch (err) {
    logger.warn({ err }, 'ClickHouse init failed — analytics will be unavailable');
  }
}
