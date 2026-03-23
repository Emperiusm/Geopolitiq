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

interface Holding {
  cusip: string;
  nameOfIssuer: string;
  value: number;
  shares: number;
}

export class Sec13FParser implements Parser {
  sourceId = 'sec-13f';

  parse(raw: FetchResult): ParsedSignal[] {
    const signals: ParsedSignal[] = [];

    for (const item of raw.items) {
      const xml = item.raw;

      // Try both common 13F XML namespaces/wrappers
      const filerName =
        extractTag(xml, 'COM_TRNSPRNT_RQST') ??
        extractTag(xml, 'filerInfo') ??
        extractTag(xml, 'name');
      const filerCik = extractTag(xml, 'cik') ?? extractTag(xml, 'CIK');
      const periodOfReport = extractTag(xml, 'periodOfReport') ?? extractTag(xml, 'PERIOD_OF_REPORT');

      // Parse holdings from informationTable entries
      const infoTableBlock = extractTag(xml, 'informationTable');
      const holdingBlocks = infoTableBlock
        ? extractAllTags(infoTableBlock, 'infoTable')
        : [];

      const holdings: Holding[] = [];
      for (const block of holdingBlocks) {
        const nameOfIssuer = extractTag(block, 'nameOfIssuer');
        const cusip = extractTag(block, 'cusip');
        const valueStr = extractTag(block, 'value');
        const sharesStr = extractTag(block, 'sshPrnamt') ?? extractTag(block, 'shrsOrPrnAmt');

        if (!nameOfIssuer || !cusip) continue;

        holdings.push({
          cusip,
          nameOfIssuer,
          value: valueStr ? parseFloat(valueStr) * 1000 : 0, // 13F values are in thousands
          shares: sharesStr ? parseFloat(sharesStr) : 0,
        });
      }

      const filerDisplay = filerName ?? filerCik ?? 'Unknown Filer';
      const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);

      const claims: Claim[] = holdings.map((h) => ({
        subject: filerDisplay,
        predicate: 'holds-equity-in',
        object: h.nameOfIssuer,
        confidence: 0.95,
        meta: { cusip: h.cusip, value: h.value, shares: h.shares },
      }));

      const topHoldings = holdings
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map((h) => h.nameOfIssuer);

      const entityNames = [filerDisplay, ...topHoldings.filter((n) => n !== filerDisplay)];

      signals.push({
        headline: `${filerDisplay} 13F: ${holdings.length} holdings, $${(totalValue / 1_000_000).toFixed(1)}M AUM`,
        url: item.url,
        publishedAt: item.publishedAt ?? periodOfReport
          ? new Date(periodOfReport ?? Date.now()).toISOString()
          : new Date().toISOString(),
        category: 'sec-13f',
        entityNames,
        domains: ['equity-markets', 'institutional-investing'],
        intensity: Math.min(1, totalValue / 1_000_000_000),
        confidence: 0.85,
        claims,
        tags: ['13f', 'institutional-holdings'],
        financialWeight: { amount: totalValue, currency: 'USD', magnitude: 'B' },
        rawPayload: { filerCik, holdingCount: holdings.length, totalValueUsd: totalValue },
        meta: { filerCik, periodOfReport, holdingCount: holdings.length },
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
