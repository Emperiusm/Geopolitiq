import { describe, it, expect } from 'vitest';
import { GraphUpdater, normalizePredicate } from '../../src/graph/graph-updater';

describe('GraphUpdater', () => {
  it('normalizes predicates to uppercase', () => {
    expect(normalizePredicate('filed-patent')).toBe('FILED_PATENT');
    expect(normalizePredicate('builds-on-ip-of')).toBe('BUILDS_ON_IP_OF');
  });

  it('groups claims by predicate', () => {
    const updater = new GraphUpdater(null as any);
    const claims = [
      { subject: 'a', predicate: 'filed-patent', object: 'x', confidence: 0.9 },
      { subject: 'b', predicate: 'filed-patent', object: 'y', confidence: 0.8 },
      { subject: 'a', predicate: 'partnered-with', object: 'b', confidence: 0.7 },
    ];
    const grouped = updater.groupByPredicate(claims);
    expect(grouped.get('FILED_PATENT')).toHaveLength(2);
    expect(grouped.get('PARTNERED_WITH')).toHaveLength(1);
  });

  it('deduplicates triples within a run', async () => {
    const updater = new GraphUpdater(null as any);
    // First call with neo4j=null just does the dedup filter
    const claims = [
      { subject: 'a', predicate: 'filed-patent', object: 'x', confidence: 0.9 },
      { subject: 'a', predicate: 'filed-patent', object: 'x', confidence: 0.9 }, // duplicate
    ];
    const result = await updater.writeClaims(claims, 'signal:1', 'source:1', '2026-01-01');
    // With null neo4j, should return 0 edges (skips execution) but dedup tracking still works
    expect(result.edgesCreated).toBe(0);
  });

  it('tracks skipped count for duplicate triples', async () => {
    const updater = new GraphUpdater(null as any);
    const claims = [
      { subject: 'a', predicate: 'acquired', object: 'b', confidence: 0.9 },
      { subject: 'a', predicate: 'acquired', object: 'b', confidence: 0.9 }, // duplicate
      { subject: 'b', predicate: 'acquired', object: 'c', confidence: 0.8 },
    ];
    const result = await updater.writeClaims(claims, 'signal:2', 'source:1', '2026-01-01');
    expect(result.edgesSkipped).toBe(1);
    expect(result.edgesCreated).toBe(0); // null neo4j, no actual writes
  });

  it('resets run cache after resetRunCache()', async () => {
    const updater = new GraphUpdater(null as any);
    const claims = [
      { subject: 'x', predicate: 'supplies', object: 'y', confidence: 0.7 },
    ];

    await updater.writeClaims(claims, 'signal:3', 'source:1', '2026-01-01');

    // Same triple again — should be skipped
    const result1 = await updater.writeClaims(claims, 'signal:3b', 'source:1', '2026-01-01');
    expect(result1.edgesSkipped).toBe(1);

    // After reset, triple should be allowed again
    updater.resetRunCache();
    const result2 = await updater.writeClaims(claims, 'signal:3c', 'source:1', '2026-01-01');
    expect(result2.edgesSkipped).toBe(0);
  });

  it('groupByPredicate handles mixed predicates correctly', () => {
    const updater = new GraphUpdater(null as any);
    const claims = [
      { subject: 'e1', predicate: 'competes-with', object: 'e2', confidence: 0.9 },
      { subject: 'e1', predicate: 'competes-with', object: 'e3', confidence: 0.8 },
      { subject: 'e2', predicate: 'invested-in', object: 'e4', confidence: 0.7 },
      { subject: 'e3', predicate: 'lobbied-for', object: 'ai-regulation', confidence: 0.6 },
    ];
    const grouped = updater.groupByPredicate(claims);
    expect(grouped.size).toBe(3);
    expect(grouped.get('COMPETES_WITH')).toHaveLength(2);
    expect(grouped.get('INVESTED_IN')).toHaveLength(1);
    expect(grouped.get('LOBBIED_FOR')).toHaveLength(1);
  });
});
