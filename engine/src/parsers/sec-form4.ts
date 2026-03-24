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

/** Parses YYYY-MM-DD date strings, returns ms since epoch or NaN */
function parseDateMs(dateStr: string | undefined): number {
  if (!dateStr) return NaN;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? NaN : d.getTime();
}

/** Converts YYYY-MM-DD to ISO 8601 */
function toIso(dateStr: string | undefined): string {
  if (!dateStr) return new Date().toISOString();
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export class SecForm4Parser implements Parser {
  sourceId = 'sec-form4';

  parse(raw: FetchResult): ParsedSignal[] {
    const signals: ParsedSignal[] = [];

    for (const item of raw.items) {
      const xml = item.raw;

      const issuerBlock = extractTag(xml, 'issuer');
      const ownerBlock = extractTag(xml, 'reportingOwner');
      if (!issuerBlock || !ownerBlock) continue;

      const issuerName = extractTag(issuerBlock, 'issuerName');
      const issuerCik = extractTag(issuerBlock, 'issuerCik');
      const ticker = extractTag(issuerBlock, 'issuerTradingSymbol');
      const ownerName = extractTag(ownerBlock, 'rptOwnerName');
      const periodOfReport = extractTag(xml, 'periodOfReport');
      const filingDate = extractTag(xml, 'signatureDate');

      if (!issuerName) continue;

      const transactionBlocks = extractAllTags(xml, 'nonDerivativeTransaction');

      for (const txBlock of transactionBlocks) {
        const txDateStr = extractTag(extractTag(txBlock, 'transactionDate') ?? '', 'value');
        const txCode = extractTag(extractTag(txBlock, 'transactionCoding') ?? '', 'transactionCode');
        const sharesStr = extractTag(extractTag(txBlock, 'transactionShares') ?? '', 'value');
        const priceStr = extractTag(extractTag(txBlock, 'transactionPricePerShare') ?? '', 'value');
        const acquiredDisposedCode = extractTag(
          extractTag(txBlock, 'transactionAcquiredDisposedCode') ?? '',
          'value',
        );

        const txDate = txDateStr ?? periodOfReport ?? '';
        const signingDate = filingDate;

        // Compute filing delay
        const txMs = parseDateMs(txDate);
        const sigMs = parseDateMs(signingDate ?? '');
        let filingDelayDays: number | undefined;
        if (!isNaN(txMs) && !isNaN(sigMs)) {
          filingDelayDays = Math.round((sigMs - txMs) / (1000 * 60 * 60 * 24));
        }

        const isAcquisition = acquiredDisposedCode === 'A';
        const isDisposition = acquiredDisposedCode === 'D';
        const transactionType = isAcquisition ? 'acquisition' : isDisposition ? 'disposition' : txCode ?? 'unknown';

        const shares = sharesStr ? parseFloat(sharesStr) : undefined;
        const price = priceStr ? parseFloat(priceStr) : undefined;
        const totalValue = shares && price ? shares * price : undefined;

        const claims: Claim[] = [];

        if (ownerName) {
          claims.push({
            subject: ownerName,
            predicate: isAcquisition ? 'acquired-shares-in' : 'disposed-shares-in',
            object: issuerName,
            confidence: 0.95,
            meta: { shares, price, transactionCode: txCode, ticker },
          });
        }

        // Late filing generates an additional claim
        if (filingDelayDays !== undefined && filingDelayDays > 2) {
          claims.push({
            subject: ownerName ?? 'Unknown',
            predicate: 'filed-late-form4-for',
            object: issuerName,
            confidence: 0.99,
            meta: { filingDelayDays, transactionDate: txDate, filingDate: signingDate },
          });
        }

        const signal: ParsedSignal = {
          headline: `${ownerName ?? 'Insider'} ${transactionType === 'disposition' ? 'sold' : 'acquired'} ${issuerName} shares (Form 4)`,
          body: shares && price
            ? `${transactionType}: ${shares.toLocaleString()} shares at $${price.toFixed(2)}/share`
            : undefined,
          url: item.url,
          publishedAt: toIso(signingDate ?? txDate),
          category: 'sec-form4',
          entityNames: [issuerName, ...(ownerName ? [ownerName] : [])],
          domains: ['equity-markets', 'insider-trading'],
          intensity: totalValue ? Math.min(1, totalValue / 10_000_000) : 0.5,
          confidence: 0.9,
          claims,
          tags: [ticker ?? issuerCik ?? 'sec-form4', 'insider-trading'],
          financialWeight: totalValue
            ? { amount: totalValue, currency: 'USD', magnitude: totalValue > 1_000_000 ? 'M' : 'K' }
            : undefined,
          rawPayload: { issuerCik, ticker, transactionCode: txCode, shares, pricePerShare: price },
          meta: {
            issuerCik,
            ticker,
            filingDelayDays,
            transactionDate: txDate,
            filingDate: signingDate,
          },
        };

        signals.push(signal);
      }

      // If no transactions parsed, still emit a filing signal
      if (transactionBlocks.length === 0) {
        signals.push({
          headline: `${ownerName ?? 'Insider'} filed Form 4 for ${issuerName}`,
          url: item.url,
          publishedAt: toIso(filingDate ?? periodOfReport),
          category: 'sec-form4',
          entityNames: [issuerName, ...(ownerName ? [ownerName] : [])],
          domains: ['equity-markets'],
          intensity: 0.3,
          confidence: 0.7,
          claims: [],
          tags: [ticker ?? 'sec-form4'],
          meta: { issuerCik, ticker },
        });
      }
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
