/**
 * SignalBatchWorkflow — child workflow that processes a batch of parsed signals.
 * Classifies (if needed), resolves entities, writes to DB, updates graph, and publishes SSE.
 *
 * IMPORTANT: This file must ONLY use @temporalio/workflow APIs.
 * Activity implementations are accessed exclusively via proxyActivities.
 */
import { proxyActivities } from '@temporalio/workflow';
import type { ParsedSignal, ResolvedSignal, SourceConfig, BatchResult } from '../types';

const { classifyActivity } = proxyActivities<{
  classifyActivity(signals: ParsedSignal[]): Promise<ParsedSignal[]>;
}>({
  taskQueue: 'parse-structured',
  startToCloseTimeout: '5 minutes',
});

const { resolveActivity } = proxyActivities<{
  resolveActivity(signals: ParsedSignal[], source: SourceConfig): Promise<{ signals: ResolvedSignal[] }>;
}>({
  taskQueue: 'resolve',
  startToCloseTimeout: '10 minutes',
});

const { writeSignalActivity } = proxyActivities<{
  writeSignalActivity(signal: ResolvedSignal, source: SourceConfig): Promise<{ written: boolean; deduplicated: boolean; signalId?: string }>;
}>({
  taskQueue: 'write',
  startToCloseTimeout: '2 minutes',
});

const { graphActivity } = proxyActivities<{
  graphActivity(signal: ResolvedSignal, signalId: string, source: SourceConfig): Promise<{ edgesCreated: number; edgesSkipped: number }>;
}>({
  taskQueue: 'write',
  startToCloseTimeout: '2 minutes',
});

const { publishActivity } = proxyActivities<{
  publishActivity(signal: ResolvedSignal, source: SourceConfig): Promise<void>;
}>({
  taskQueue: 'write',
  startToCloseTimeout: '1 minute',
});

const { dlqSignalActivity } = proxyActivities<{
  dlqSignalActivity(signal: ParsedSignal, source: SourceConfig, error: string, stage: string): Promise<void>;
}>({
  taskQueue: 'system',
  startToCloseTimeout: '30 seconds',
});

export interface SignalBatchInput {
  source: SourceConfig;
  signals: ParsedSignal[];
  batchIndex: number;
}

export async function signalBatchWorkflow(input: SignalBatchInput): Promise<BatchResult> {
  const { source, signals, batchIndex: _batchIndex } = input;

  const result: BatchResult = {
    written: 0,
    graphed: 0,
    published: 0,
    failed: 0,
    dlqd: 0,
    errors: [],
  };

  if (signals.length === 0) return result;

  // Step 1: Classify if source.polarity === 'classify'
  let classifiedSignals: ParsedSignal[] = signals;
  if (source.polarity === 'classify') {
    classifiedSignals = await classifyActivity(signals);
  }

  // Step 2: Resolve entities (batch)
  const { signals: resolvedSignals } = await resolveActivity(classifiedSignals, source);

  // Step 3: For each signal: write → graph → publish
  for (let i = 0; i < resolvedSignals.length; i++) {
    const signal = resolvedSignals[i];

    try {
      // Write to DB
      const writeResult = await writeSignalActivity(signal, source);

      if (writeResult.deduplicated) {
        // Already exists — skip graph + publish
        continue;
      }

      if (!writeResult.written || !writeResult.signalId) {
        result.failed++;
        result.errors.push({ signalIndex: i, error: 'Write returned no signalId', stage: 'write' });
        continue;
      }

      result.written++;

      // Update graph
      try {
        const graphResult = await graphActivity(signal, writeResult.signalId, source);
        if (graphResult.edgesCreated > 0 || graphResult.edgesSkipped >= 0) {
          result.graphed++;
        }
      } catch (graphErr) {
        // Graph failure is non-fatal — log but continue
        result.errors.push({
          signalIndex: i,
          error: String(graphErr),
          stage: 'graph',
        });
      }

      // Publish SSE
      try {
        await publishActivity(signal, source);
        result.published++;
      } catch (pubErr) {
        // Publish failure is non-fatal
        result.errors.push({
          signalIndex: i,
          error: String(pubErr),
          stage: 'publish',
        });
      }
    } catch (err) {
      // Fatal signal failure — send to DLQ
      result.failed++;
      const errorMsg = String(err);
      result.errors.push({ signalIndex: i, error: errorMsg, stage: 'write' });

      try {
        await dlqSignalActivity(classifiedSignals[i] ?? signal, source, errorMsg, 'write');
        result.dlqd++;
      } catch {
        // DLQ failure — already counted in failed
      }
    }
  }

  return result;
}
