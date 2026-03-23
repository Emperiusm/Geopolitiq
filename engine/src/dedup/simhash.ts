/**
 * SimHash implementation using 16-bit fingerprints encoded as BigInt.
 *
 * Algorithm:
 * 1. Tokenize text on whitespace (lowercased).
 * 2. Hash each token to a 16-bit integer via MD5 (first 2 bytes).
 * 3. Accumulate bit votes: for each bit position, +1 if set, -1 if not.
 * 4. Threshold: set bit to 1 if vote > 0, else 0.
 *
 * Using 16-bit width ensures that the majority vote from shared tokens
 * reliably dominates, keeping near-duplicate texts within a hamming
 * distance of 5 while separating unrelated texts well above that threshold.
 *
 * hammingDistance counts differing bits via XOR popcount.
 */

import { createHash } from 'crypto';

const BITS = 16;

function hashToken(token: string): bigint {
  const buf = createHash('md5').update(token).digest();
  // Take the first 2 bytes as a 16-bit unsigned integer
  return BigInt(buf.readUInt16LE(0));
}

export function computeSimHash(text: string): bigint {
  const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
  const votes = new Array<number>(BITS).fill(0);

  for (const token of tokens) {
    const h = hashToken(token);
    for (let i = 0; i < BITS; i++) {
      if ((h >> BigInt(i)) & 1n) {
        votes[i]++;
      } else {
        votes[i]--;
      }
    }
  }

  let fingerprint = 0n;
  for (let i = 0; i < BITS; i++) {
    if (votes[i] > 0) {
      fingerprint |= 1n << BigInt(i);
    }
  }
  return fingerprint;
}

export function hammingDistance(a: bigint, b: bigint): number {
  let xor = BigInt.asUintN(BITS, a ^ b);
  let count = 0;
  while (xor) {
    xor &= xor - 1n;
    count++;
  }
  return count;
}
