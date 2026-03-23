import { describe, it, expect } from 'vitest';
import { computeContentHash, normalizeTitle } from '../../src/dedup/content-hash';

describe('content-hash', () => {
  it('produces deterministic hash', () => {
    const a = computeContentHash('Test Title', 'https://example.com', '2026-01-01');
    const b = computeContentHash('Test Title', 'https://example.com', '2026-01-01');
    expect(a).toBe(b);
  });

  it('normalizes title before hashing', () => {
    const a = computeContentHash('  Test  Title!  ', 'https://example.com', '2026-01-01');
    const b = computeContentHash('test title', 'https://example.com', '2026-01-01');
    expect(a).toBe(b);
  });

  it('returns 64-char hex string', () => {
    const h = computeContentHash('Nvidia Revenue', 'https://reuters.com/nvidia', '2026-03-01T12:00:00Z');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it('differs when url changes', () => {
    const a = computeContentHash('Same Title', 'https://a.com', '2026-01-01');
    const b = computeContentHash('Same Title', 'https://b.com', '2026-01-01');
    expect(a).not.toBe(b);
  });

  it('uses only the date part of publishedDate', () => {
    const a = computeContentHash('Title', 'https://x.com', '2026-01-01T00:00:00Z');
    const b = computeContentHash('Title', 'https://x.com', '2026-01-01T23:59:59Z');
    expect(a).toBe(b);
  });
});

describe('normalizeTitle', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeTitle('Hello, World!')).toBe('hello world');
  });

  it('collapses whitespace', () => {
    expect(normalizeTitle('  foo   bar  ')).toBe('foo bar');
  });
});
