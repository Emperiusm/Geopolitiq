import { describe, it, expect } from 'vitest';
import { computeSimHash, hammingDistance } from '../../src/dedup/simhash';

describe('simhash', () => {
  it('similar texts have small hamming distance', () => {
    const a = computeSimHash('Nvidia reports record Q4 revenue beating expectations');
    const b = computeSimHash('Nvidia reports record Q4 revenue surpassing estimates');
    expect(hammingDistance(a, b)).toBeLessThanOrEqual(5);
  });

  it('different texts have large hamming distance', () => {
    const a = computeSimHash('Nvidia reports record Q4 revenue');
    const b = computeSimHash('Apple launches new iPhone model in September');
    expect(hammingDistance(a, b)).toBeGreaterThan(5);
  });

  it('identical texts have hamming distance of 0', () => {
    const text = 'Federal Reserve raises interest rates by 25 basis points';
    expect(hammingDistance(computeSimHash(text), computeSimHash(text))).toBe(0);
  });

  it('produces a BigInt fingerprint', () => {
    const h = computeSimHash('some text');
    expect(typeof h).toBe('bigint');
  });

  it('handles empty string', () => {
    const h = computeSimHash('');
    expect(typeof h).toBe('bigint');
  });
});
