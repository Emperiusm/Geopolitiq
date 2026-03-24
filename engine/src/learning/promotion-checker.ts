/**
 * PromotionChecker — determines if a source is eligible to be promoted
 * from agent parser mode to a structured/rule-based parser.
 *
 * Eligibility criteria:
 *   - parserMode === 'agent'
 *   - learningExtractionCount >= 500
 *   - accuracy (correct/total from last 500 samples) >= 0.95
 *   - 7-day rolling DLQ rate <= 0.02
 */

export interface PromotionEligibility {
  eligible: boolean;
  accuracy: number;
  dlqRate: number;
  sampleCount: number;
  reason?: string;
}

const MIN_EXTRACTION_COUNT = 500;
const MIN_ACCURACY = 0.95;
const MAX_DLQ_RATE = 0.02;

export class PromotionChecker {
  constructor(private readonly db: any) {}

  /**
   * Checks if a specific source is eligible for promotion.
   */
  async check(sourceId: string): Promise<PromotionEligibility> {
    const { sources, extractionSamples, signalDlq, memoryTokens } = await import('../db');
    const { eq, and, gte, isNotNull, count, sql } = await import('drizzle-orm');

    // Load source
    const sourceRows = await this.db
      .select({
        parserMode: sources.parserMode,
        learningExtractionCount: sources.learningExtractionCount,
      })
      .from(sources)
      .where(eq(sources.id, sourceId));

    if (!sourceRows || sourceRows.length === 0) {
      return { eligible: false, accuracy: 0, dlqRate: 0, sampleCount: 0, reason: 'source not found' };
    }

    const source = sourceRows[0];

    if (source.parserMode !== 'agent') {
      return {
        eligible: false,
        accuracy: 0,
        dlqRate: 0,
        sampleCount: 0,
        reason: `parserMode is '${source.parserMode}', not 'agent'`,
      };
    }

    const extractionCount = source.learningExtractionCount ?? 0;
    if (extractionCount < MIN_EXTRACTION_COUNT) {
      return {
        eligible: false,
        accuracy: 0,
        dlqRate: 0,
        sampleCount: extractionCount,
        reason: `learningExtractionCount ${extractionCount} < ${MIN_EXTRACTION_COUNT}`,
      };
    }

    // Get last 500 samples via token (find tokens for this source first)
    const tokenRows = await this.db
      .select({ id: memoryTokens.id })
      .from(memoryTokens)
      .where(eq(memoryTokens.sourceId, sourceId));

    const tokenIds = tokenRows.map((r: { id: string }) => r.id);

    if (tokenIds.length === 0) {
      return {
        eligible: false,
        accuracy: 0,
        dlqRate: 0,
        sampleCount: 0,
        reason: 'no memory tokens found for source',
      };
    }

    // Get last 500 samples across all tokens for this source
    const { inArray, desc } = await import('drizzle-orm');
    const samples = await this.db
      .select({
        correct: extractionSamples.correct,
      })
      .from(extractionSamples)
      .where(
        and(
          inArray(extractionSamples.tokenId, tokenIds),
          isNotNull(extractionSamples.correct),
        ),
      )
      .orderBy(desc(extractionSamples.createdAt))
      .limit(500);

    const sampleCount = samples.length;
    if (sampleCount === 0) {
      return {
        eligible: false,
        accuracy: 0,
        dlqRate: 0,
        sampleCount: 0,
        reason: 'no evaluated samples found',
      };
    }

    const correctCount = samples.filter((s: { correct: boolean | null }) => s.correct === true).length;
    const accuracy = correctCount / sampleCount;

    // Compute 7-day rolling DLQ rate
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { lt } = await import('drizzle-orm');
    const { gte: gteOp } = await import('drizzle-orm');

    // Count DLQ entries in last 7 days for this source
    const dlqRows = await this.db
      .select({ id: signalDlq.id })
      .from(signalDlq)
      .where(
        and(
          eq(signalDlq.sourceId, sourceId),
          gteOp(signalDlq.createdAt, sevenDaysAgo),
        ),
      );

    const dlqCount = dlqRows.length;

    // Total signals processed in last 7 days (use pipeline_runs)
    const { pipelineRuns } = await import('../db');
    const runsRows = await this.db
      .select({
        fetched: pipelineRuns.fetched,
        dlqd: pipelineRuns.dlqd,
      })
      .from(pipelineRuns)
      .where(
        and(
          eq(pipelineRuns.sourceId, sourceId),
          gteOp(pipelineRuns.startedAt, sevenDaysAgo),
        ),
      );

    const totalProcessed = runsRows.reduce((sum: number, r: { fetched: number | null }) => sum + (r.fetched ?? 0), 0);
    const dlqRate = totalProcessed > 0 ? dlqCount / totalProcessed : 0;

    const eligible = accuracy >= MIN_ACCURACY && dlqRate <= MAX_DLQ_RATE;

    const reasons: string[] = [];
    if (accuracy < MIN_ACCURACY) {
      reasons.push(`accuracy ${(accuracy * 100).toFixed(1)}% < ${MIN_ACCURACY * 100}%`);
    }
    if (dlqRate > MAX_DLQ_RATE) {
      reasons.push(`DLQ rate ${(dlqRate * 100).toFixed(2)}% > ${MAX_DLQ_RATE * 100}%`);
    }

    return {
      eligible,
      accuracy,
      dlqRate,
      sampleCount,
      reason: reasons.length > 0 ? reasons.join('; ') : undefined,
    };
  }

  /**
   * Checks all sources in agent mode with 500+ samples and returns eligible ones.
   */
  async checkAllSources(): Promise<Array<{ sourceId: string; result: PromotionEligibility }>> {
    const { sources } = await import('../db');
    const { eq, gte } = await import('drizzle-orm');

    const agentSources = await this.db
      .select({ id: sources.id })
      .from(sources)
      .where(
        eq(sources.parserMode, 'agent'),
      );

    const results: Array<{ sourceId: string; result: PromotionEligibility }> = [];

    for (const source of agentSources) {
      const result = await this.check(source.id);
      results.push({ sourceId: source.id, result });
    }

    return results;
  }
}
