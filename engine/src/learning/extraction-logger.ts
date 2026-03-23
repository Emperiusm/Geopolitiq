/**
 * ExtractionLogger — logs each agent extraction to the extraction_samples table
 * and increments learningExtractionCount on the source.
 */

export interface ExtractionLogEntry {
  sourceId: string;
  tokenId: string;
  inputText: string;
  expectedOutput: Record<string, any>;
  actualOutput?: Record<string, any>;
  correct?: boolean;
  feedback?: string;
}

export class ExtractionLogger {
  constructor(private readonly db: any) {}

  /**
   * Logs a single extraction sample and increments the source's learning counter.
   * Returns the sample ID.
   */
  async log(entry: ExtractionLogEntry): Promise<string> {
    const { extractionSamples, sources } = await import('../db');
    const { recordId } = await import('@gambit/common');
    const { eq, sql } = await import('drizzle-orm');

    const id = recordId('sample', crypto.randomUUID());

    await this.db.insert(extractionSamples).values({
      id,
      tokenId: entry.tokenId,
      inputText: entry.inputText,
      expectedOutput: entry.expectedOutput,
      actualOutput: entry.actualOutput ?? null,
      correct: entry.correct ?? null,
      feedback: entry.feedback ?? null,
    });

    // Increment learningExtractionCount on the source
    await this.db
      .update(sources)
      .set({
        learningExtractionCount: sql`${sources.learningExtractionCount} + 1`,
      })
      .where(eq(sources.id, entry.sourceId));

    return id;
  }
}
