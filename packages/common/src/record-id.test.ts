import { describe, it, expect } from 'bun:test';
import { recordId, parseRecordId, edgeId } from './record-id';

describe('recordId', () => {
  it('creates type:slug format', () => {
    expect(recordId('company', 'nvidia')).toBe('company:nvidia');
    expect(recordId('country', 'united-states')).toBe('country:united-states');
  });
  it('handles hyphens in type', () => {
    expect(recordId('trade-route', 'china-europe')).toBe('trade-route:china-europe');
  });
});

describe('parseRecordId', () => {
  it('parses type and slug', () => {
    expect(parseRecordId('company:nvidia')).toEqual({ type: 'company', slug: 'nvidia' });
  });
  it('handles colons in slug', () => {
    expect(parseRecordId('base:camp:david')).toEqual({ type: 'base', slug: 'camp:david' });
  });
  it('throws on invalid ID', () => {
    expect(() => parseRecordId('nocolon')).toThrow('Invalid record ID');
  });
});

describe('edgeId', () => {
  it('creates deterministic edge IDs', () => {
    expect(edgeId('conflict:x', 'involves', 'country:y')).toBe('edge--conflict:x--involves--country:y');
  });
  it('is deterministic', () => {
    const a = edgeId('base:ramstein', 'hosted-by', 'country:germany');
    const b = edgeId('base:ramstein', 'hosted-by', 'country:germany');
    expect(a).toBe(b);
  });
});
