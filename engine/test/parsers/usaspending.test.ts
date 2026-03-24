import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { UsaSpendingParser } from '../../src/parsers/usaspending';
import type { FetchResult } from '../../src/pipeline/types';

const FIXTURE_PATH = join(__dirname, '../fixtures/usaspending-award.json');

let fixtureJson: string;

beforeAll(() => {
  fixtureJson = readFileSync(FIXTURE_PATH, 'utf-8');
});

function makeFetchResult(raw: string, url?: string): FetchResult {
  return {
    items: [{ raw, url, publishedAt: '2023-05-15T00:00:00Z' }],
    fetchState: {},
    metadata: { itemCount: 1, httpStatus: 200 },
  };
}

describe('UsaSpendingParser', () => {
  it('produces at least one ParsedSignal from fixture', () => {
    const parser = new UsaSpendingParser();
    const signals = parser.parse(makeFetchResult(fixtureJson));
    expect(signals.length).toBeGreaterThan(0);
  });

  it('has category government-contract', () => {
    const parser = new UsaSpendingParser();
    const [signal] = parser.parse(makeFetchResult(fixtureJson));
    expect(signal.category).toBe('government-contract');
  });

  it('extracts recipient name from fixture', () => {
    const parser = new UsaSpendingParser();
    const [signal] = parser.parse(makeFetchResult(fixtureJson));
    expect(signal.entityNames).toContain('Palantir Technologies Inc');
  });

  it('headline contains recipient and dollar amount', () => {
    const parser = new UsaSpendingParser();
    const [signal] = parser.parse(makeFetchResult(fixtureJson));
    expect(signal.headline).toContain('Palantir');
    expect(signal.headline).toMatch(/\$[\d.]+M/);
  });

  it('includes awarding agency in entityNames', () => {
    const parser = new UsaSpendingParser();
    const [signal] = parser.parse(makeFetchResult(fixtureJson));
    expect(
      signal.entityNames.some((n) => n.includes('Air Force') || n.includes('Defense')),
    ).toBe(true);
  });

  it('produces received-government-contract-from claim', () => {
    const parser = new UsaSpendingParser();
    const [signal] = parser.parse(makeFetchResult(fixtureJson));
    const claims = signal.claims.filter((c) => c.predicate === 'received-government-contract-from');
    expect(claims).toHaveLength(1);
    expect(claims[0].subject).toBe('Palantir Technologies Inc');
  });

  it('sets financialWeight with USD amount', () => {
    const parser = new UsaSpendingParser();
    const [signal] = parser.parse(makeFetchResult(fixtureJson));
    expect(signal.financialWeight?.currency).toBe('USD');
    expect(signal.financialWeight?.amount).toBeGreaterThan(0);
  });

  it('tags include government-contract', () => {
    const parser = new UsaSpendingParser();
    const [signal] = parser.parse(makeFetchResult(fixtureJson));
    expect(signal.tags).toContain('government-contract');
  });

  it('tags include NAICS code', () => {
    const parser = new UsaSpendingParser();
    const [signal] = parser.parse(makeFetchResult(fixtureJson));
    expect(signal.tags?.some((t) => t.startsWith('naics:'))).toBe(true);
  });

  it('meta includes naicsCode', () => {
    const parser = new UsaSpendingParser();
    const [signal] = parser.parse(makeFetchResult(fixtureJson));
    expect(signal.meta?.naicsCode).toBe('541511');
  });

  it('publishedAt is a valid ISO date', () => {
    const parser = new UsaSpendingParser();
    const [signal] = parser.parse(makeFetchResult(fixtureJson));
    expect(() => new Date(signal.publishedAt)).not.toThrow();
    expect(isNaN(new Date(signal.publishedAt).getTime())).toBe(false);
  });

  it('skips items with invalid JSON', () => {
    const parser = new UsaSpendingParser();
    const signals = parser.parse(makeFetchResult('not-json'));
    expect(signals).toHaveLength(0);
  });

  it('validates signal with all required fields', () => {
    const parser = new UsaSpendingParser();
    const [signal] = parser.parse(makeFetchResult(fixtureJson));
    const result = parser.validate!(signal);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('sourceId is usaspending', () => {
    const parser = new UsaSpendingParser();
    expect(parser.sourceId).toBe('usaspending');
  });

  it('parses single award object (not wrapped in results array)', () => {
    const singleAward = {
      id: 'TEST_001',
      description: 'CLOUD SERVICES',
      total_obligation: 5000000,
      date_signed: '2026-01-15',
      recipient: { recipient_name: 'AWS Inc', recipient_uei: 'AWSTEST' },
      awarding_agency: {
        toptier_agency: { name: 'Department of Commerce', abbreviation: 'DOC' },
      },
      naics_code: '518210',
    };
    const parser = new UsaSpendingParser();
    const signals = parser.parse(makeFetchResult(JSON.stringify(singleAward)));
    expect(signals).toHaveLength(1);
    expect(signals[0].entityNames).toContain('AWS Inc');
    expect(signals[0].category).toBe('government-contract');
  });

  it('intensity is capped at 1.0', () => {
    const hugeDeal = {
      results: [{
        id: 'BIG_001',
        description: 'MASSIVE CONTRACT',
        total_obligation: 999_999_999_999,
        date_signed: '2026-01-01',
        recipient: { recipient_name: 'Big Corp' },
        awarding_agency: {
          toptier_agency: { name: 'DoD', abbreviation: 'DOD' },
        },
      }],
    };
    const parser = new UsaSpendingParser();
    const [signal] = parser.parse(makeFetchResult(JSON.stringify(hugeDeal)));
    expect(signal.intensity).toBeLessThanOrEqual(1.0);
  });
});
