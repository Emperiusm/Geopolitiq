import type { FetchResult, ParsedSignal, Claim } from '../pipeline/types';
import type { Parser } from './registry';

function extractTag(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : undefined;
}

function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const results: string[] = [];
  for (const m of xml.matchAll(re)) {
    results.push(m[1].trim());
  }
  return results;
}

/** Converts YYYYMMDD or YYYY-MM-DD date to ISO 8601 */
function toIso(dateStr: string | undefined): string {
  if (!dateStr) return new Date().toISOString();
  const cleaned = dateStr.replace(/-/g, '');
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}T00:00:00Z`;
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export class TrademarkParser implements Parser {
  sourceId = 'uspto-trademarks';

  parse(raw: FetchResult): ParsedSignal[] {
    const signals: ParsedSignal[] = [];

    for (const item of raw.items) {
      const xml = item.raw;

      // Support USPTO TSDR XML format
      const markText =
        extractTag(xml, 'mark-verbal-element-text') ??
        extractTag(xml, 'MarkVerbalElementText') ??
        extractTag(xml, 'wordMark');

      const applicantBlock =
        extractTag(xml, 'applicant') ??
        extractTag(xml, 'Applicant') ??
        extractTag(xml, 'owner');

      const applicantName =
        (applicantBlock ? extractTag(applicantBlock, 'applicant-name') ?? extractTag(applicantBlock, 'name') ?? extractTag(applicantBlock, 'orgname') : undefined) ??
        extractTag(xml, 'applicantName') ??
        extractTag(xml, 'owner-name');

      if (!markText && !applicantName) continue;

      const filingDate =
        extractTag(xml, 'filing-date') ??
        extractTag(xml, 'applicationDate') ??
        extractTag(xml, 'FilingDate');

      const serialNumber =
        extractTag(xml, 'serial-number') ??
        extractTag(xml, 'applicationNumber') ??
        extractTag(xml, 'serialNumber');

      // International classification codes for goods/services
      const classBlocks = extractAllTags(xml, 'international-class') ?? [];
      const classifications: string[] = classBlocks.map((b) => b.trim()).filter(Boolean);

      // Also extract classification descriptions
      const goodsBlocks = extractAllTags(xml, 'goods-services-class-description');
      const goodsDescriptions = goodsBlocks.map((b) => b.replace(/<[^>]+>/g, '').trim()).filter(Boolean);

      const entityNames: string[] = [];
      if (applicantName) entityNames.push(applicantName);

      const claims: Claim[] = [];

      if (applicantName && markText) {
        claims.push({
          subject: applicantName,
          predicate: 'filed-trademark-application-for',
          object: markText,
          confidence: 0.9,
          meta: { serialNumber, classifications, filingDate },
        });
      }

      const tags = ['trademark', 'uspto'];
      if (serialNumber) tags.push(serialNumber);
      tags.push(...classifications.map((c) => `class:${c}`));

      signals.push({
        headline: applicantName
          ? `${applicantName} filed trademark for "${markText ?? 'unnamed mark'}"`
          : `Trademark application for "${markText}"`,
        body: goodsDescriptions.slice(0, 2).join('; ') || undefined,
        url: item.url,
        publishedAt: toIso(filingDate) ?? item.publishedAt ?? new Date().toISOString(),
        category: 'trademark-filing',
        entityNames,
        domains: ['intellectual-property', 'trademarks'],
        intensity: 0.4,
        confidence: 0.85,
        claims,
        tags,
        rawPayload: { serialNumber, markText, classifications, applicantName },
        meta: {
          serialNumber,
          markText,
          classifications,
          filingDate,
          goodsServicesCount: goodsDescriptions.length,
        },
      });
    }

    return signals;
  }

  validate(signal: ParsedSignal): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!signal.headline) errors.push('Missing required field: headline');
    if (!signal.publishedAt) errors.push('Missing required field: publishedAt');
    return { valid: errors.length === 0, errors };
  }
}
