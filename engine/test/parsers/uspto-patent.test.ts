import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { UsptoPatentParser } from '../../src/parsers/uspto-patent';
import type { FetchResult } from '../../src/pipeline/types';

const FIXTURE_PATH = join(__dirname, '../fixtures/uspto-patent.xml');

let fixtureXml: string;

beforeAll(() => {
  fixtureXml = readFileSync(FIXTURE_PATH, 'utf-8');
});

function makeFetchResult(raw: string, url?: string): FetchResult {
  return {
    items: [{ raw, url, publishedAt: '2026-03-22T00:00:00Z' }],
    fetchState: {},
    metadata: { itemCount: 1, httpStatus: 200 },
  };
}

describe('UsptoPatentParser', () => {
  it('produces at least one ParsedSignal from fixture', () => {
    const parser = new UsptoPatentParser();
    const signals = parser.parse(makeFetchResult(fixtureXml));
    expect(signals.length).toBeGreaterThan(0);
  });

  it('extracts headline from invention-title', () => {
    const parser = new UsptoPatentParser();
    const [signal] = parser.parse(makeFetchResult(fixtureXml));
    expect(signal.headline).toContain('Transformer');
  });

  it('extracts assignee entity name', () => {
    const parser = new UsptoPatentParser();
    const [signal] = parser.parse(makeFetchResult(fixtureXml));
    expect(signal.entityNames).toContain('Anthropic PBC');
  });

  it('has category patent-filing', () => {
    const parser = new UsptoPatentParser();
    const [signal] = parser.parse(makeFetchResult(fixtureXml));
    expect(signal.category).toBe('patent-filing');
  });

  it('tags include patent number', () => {
    const parser = new UsptoPatentParser();
    const [signal] = parser.parse(makeFetchResult(fixtureXml));
    expect(signal.tags?.some((t) => t.includes('11922548'))).toBe(true);
  });

  it('tags include CPC codes', () => {
    const parser = new UsptoPatentParser();
    const [signal] = parser.parse(makeFetchResult(fixtureXml));
    expect(signal.tags?.some((t) => t.startsWith('G06'))).toBe(true);
  });

  it('produces cites-patent claims', () => {
    const parser = new UsptoPatentParser();
    const [signal] = parser.parse(makeFetchResult(fixtureXml));
    const citesClaims = signal.claims.filter((c) => c.predicate === 'cites-patent');
    expect(citesClaims.length).toBeGreaterThan(0);
  });

  it('produces builds-on-ip-of claims for cross-assignee citations', () => {
    const parser = new UsptoPatentParser();
    const [signal] = parser.parse(makeFetchResult(fixtureXml));
    const buildsClaims = signal.claims.filter((c) => c.predicate === 'builds-on-ip-of');
    // Fixture has citations from OpenAI Inc and Google LLC, different from Anthropic PBC
    expect(buildsClaims.length).toBeGreaterThan(0);
  });

  it('adds cited assignee to entityNames when cross-assignee', () => {
    const parser = new UsptoPatentParser();
    const [signal] = parser.parse(makeFetchResult(fixtureXml));
    // The fixture has citations attributed to OpenAI Inc and Google LLC
    expect(
      signal.entityNames.some((n) => n.includes('Google') || n.includes('OpenAI')),
    ).toBe(true);
  });

  it('skips items without invention-title', () => {
    const parser = new UsptoPatentParser();
    const signals = parser.parse(makeFetchResult('<us-patent-grant></us-patent-grant>'));
    expect(signals).toHaveLength(0);
  });

  it('validates signal with all required fields', () => {
    const parser = new UsptoPatentParser();
    const [signal] = parser.parse(makeFetchResult(fixtureXml));
    const result = parser.validate!(signal);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('sourceId is uspto-patent', () => {
    const parser = new UsptoPatentParser();
    expect(parser.sourceId).toBe('uspto-patent');
  });

  it('raw payload contains patent number', () => {
    const parser = new UsptoPatentParser();
    const [signal] = parser.parse(makeFetchResult(fixtureXml));
    expect(signal.rawPayload?.patentNumber).toBeDefined();
  });

  it('parses inline XML without file fixture', () => {
    const xml = `
      <us-patent-grant>
        <us-bibliographic-data-grant>
          <publication-reference>
            <document-id>
              <country>US</country>
              <doc-number>99999999</doc-number>
              <kind>B1</kind>
              <date>20260101</date>
            </document-id>
          </publication-reference>
          <application-reference>
            <document-id>
              <country>US</country>
              <doc-number>17999999</doc-number>
              <date>20230101</date>
            </document-id>
          </application-reference>
          <invention-title id="t1">Quantum Computing Breakthrough</invention-title>
          <us-parties>
            <us-applicants>
              <us-applicant sequence="00">
                <addressbook>
                  <orgname>QuantumCorp Inc</orgname>
                </addressbook>
              </us-applicant>
            </us-applicants>
          </us-parties>
        </us-bibliographic-data-grant>
      </us-patent-grant>
    `;
    const parser = new UsptoPatentParser();
    const signals = parser.parse(makeFetchResult(xml));
    expect(signals).toHaveLength(1);
    expect(signals[0].headline).toBe('Quantum Computing Breakthrough');
    expect(signals[0].entityNames).toContain('QuantumCorp Inc');
  });
});
