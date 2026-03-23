/**
 * SampleRetention — enforces a maximum of 2,000 extraction samples per source.
 *
 * When over the limit, deletes the oldest correct samples that are beyond 30 days old.
 * This preserves recent and incorrect samples (which are more valuable for learning).
 */

const MAX_SAMPLES_PER_SOURCE = 2_000;
const RETENTION_DAYS = 30;

export class SampleRetention {
  constructor(private readonly db: any) {}

  /**
   * Enforces the sample limit for a given tokenId.
   * Deletes oldest correct samples beyond 30 days when count exceeds 2000.
   * Returns the number of samples deleted.
   */
  async enforce(tokenId: string): Promise<number> {
    const { extractionSamples } = await import('../db');
    const { eq, and, lt, asc } = await import('drizzle-orm');

    // Count total samples for this token
    const countResult = await this.db
      .select({ count: (extractionSamples as any).id })
      .from(extractionSamples)
      .where(eq(extractionSamples.tokenId, tokenId));

    const totalCount = countResult.length;
    if (totalCount <= MAX_SAMPLES_PER_SOURCE) {
      return 0;
    }

    // How many to delete
    const deleteTarget = totalCount - MAX_SAMPLES_PER_SOURCE;

    // Find oldest correct samples beyond 30 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);

    const candidates = await this.db
      .select({ id: extractionSamples.id })
      .from(extractionSamples)
      .where(
        and(
          eq(extractionSamples.tokenId, tokenId),
          eq(extractionSamples.correct, true),
          lt(extractionSamples.createdAt, cutoffDate),
        ),
      )
      .orderBy(asc(extractionSamples.createdAt))
      .limit(deleteTarget);

    if (candidates.length === 0) {
      return 0;
    }

    const idsToDelete = candidates.map((r: { id: string }) => r.id);

    // Delete in batches of 100 to avoid huge WHERE IN clauses
    let deleted = 0;
    for (let i = 0; i < idsToDelete.length; i += 100) {
      const batch = idsToDelete.slice(i, i + 100);
      const { inArray } = await import('drizzle-orm');
      await this.db
        .delete(extractionSamples)
        .where(inArray(extractionSamples.id, batch));
      deleted += batch.length;
    }

    return deleted;
  }
}
