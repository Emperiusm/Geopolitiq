/**
 * SourceIngestionWorkflow — parent workflow that orchestrates the full ingestion pipeline
 * for a single source: fetch → parse → dedup → fan-out to child SignalBatchWorkflows.
 *
 * IMPORTANT: This file must ONLY use @temporalio/workflow APIs.
 * Activity implementations are accessed exclusively via proxyActivities.
 * Child workflows are started via executeChild.
 */
import { proxyActivities, executeChild } from '@temporalio/workflow';
import type { FetchResult, ParsedSignal, SourceConfig, PipelineRunCounters, BatchResult } from '../types';

const BATCH_SIZE = 25;

// ── Activity proxies ────────────────────────────────────────────────────────

const { fetchActivity } = proxyActivities<{
  fetchActivity(source: SourceConfig, input?: any): Promise<FetchResult>;
}>({
  taskQueue: 'fetch',
  startToCloseTimeout: '5 minutes',
});

const { parseActivity } = proxyActivities<{
  parseActivity(
    items: FetchResult['items'],
    source: SourceConfig,
  ): Promise<{ signals: ParsedSignal[]; tokensIn: number; tokensOut: number }>;
}>({
  taskQueue: 'parse-structured',
  startToCloseTimeout: '10 minutes',
});

const { dedupActivity } = proxyActivities<{
  dedupActivity(signals: ParsedSignal[]): Promise<ParsedSignal[]>;
}>({
  taskQueue: 'parse-structured',
  startToCloseTimeout: '2 minutes',
});

const { getSourceConfig, createPipelineRun, completePipelineRun, updateFetchState } = proxyActivities<{
  getSourceConfig(sourceId: string): Promise<SourceConfig>;
  createPipelineRun(sourceId: string): Promise<string>;
  completePipelineRun(runId: string, counters: PipelineRunCounters, error?: string): Promise<void>;
  updateFetchState(sourceId: string, fetchState: Record<string, any>): Promise<void>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '30 seconds',
});

// ── Workflow ────────────────────────────────────────────────────────────────

export async function sourceIngestionWorkflow(
  sourceId: string,
  input?: any,
): Promise<PipelineRunCounters> {
  const counters: PipelineRunCounters = {
    fetched: 0,
    parsed: 0,
    deduplicated: 0,
    classified: 0,
    resolved: 0,
    written: 0,
    graphed: 0,
    published: 0,
    failed: 0,
    dlqd: 0,
    costTokensIn: 0,
    costTokensOut: 0,
  };

  // 1. Load source config
  const source = await getSourceConfig(sourceId);

  // 2. Create pipeline run record
  const runId = await createPipelineRun(sourceId);

  let pipelineError: string | undefined;

  try {
    // 3. Fetch
    const fetchResult = await fetchActivity(source, input);
    counters.fetched = fetchResult.metadata.itemCount;

    // 4. Parse
    const parseResult = await parseActivity(fetchResult.items, source);
    counters.parsed = parseResult.signals.length;
    counters.costTokensIn += parseResult.tokensIn;
    counters.costTokensOut += parseResult.tokensOut;

    // 5. Dedup
    const uniqueSignals = await dedupActivity(parseResult.signals);
    counters.deduplicated = uniqueSignals.length;

    // 6. Fan-out to child workflows in batches of BATCH_SIZE
    const batches = chunk(uniqueSignals, BATCH_SIZE);
    const batchPromises = batches.map((batch, batchIndex) =>
      executeChild('signalBatchWorkflow', {
        args: [{ source, signals: batch, batchIndex }],
        taskQueue: 'write',
      }),
    );

    // 7. Aggregate results
    const batchResults: BatchResult[] = await Promise.all(batchPromises);

    for (const br of batchResults) {
      counters.written += br.written;
      counters.graphed += br.graphed;
      counters.published += br.published;
      counters.failed += br.failed;
      counters.dlqd += br.dlqd;
    }

    // Classified = resolved = number of unique signals that went through batches
    counters.classified = uniqueSignals.length;
    counters.resolved = uniqueSignals.length;

    // 8. Update fetch state
    await updateFetchState(sourceId, fetchResult.fetchState);
  } catch (err) {
    pipelineError = String(err);
    counters.failed++;
  }

  // Complete pipeline run
  await completePipelineRun(runId, counters, pipelineError);

  return counters;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
