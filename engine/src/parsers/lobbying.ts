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

export class LobbyingParser implements Parser {
  sourceId = 'lobbying-lda';

  parse(raw: FetchResult): ParsedSignal[] {
    const signals: ParsedSignal[] = [];

    for (const item of raw.items) {
      const xml = item.raw;

      const registrantName = extractTag(xml, 'registrantName') ?? extractTag(xml, 'RegistrantName');
      const clientName = extractTag(xml, 'clientName') ?? extractTag(xml, 'ClientName');
      if (!registrantName && !clientName) continue;

      const filingDate =
        extractTag(xml, 'receivedByHouse') ??
        extractTag(xml, 'signedDate') ??
        item.publishedAt ??
        new Date().toISOString();

      const amountStr = extractTag(xml, 'incomeAmount') ?? extractTag(xml, 'expenseAmount');
      const amount = amountStr ? parseFloat(amountStr.replace(/[$,]/g, '')) : undefined;

      // Extract issue areas
      const issueBlocks = extractAllTags(xml, 'lobbyingIssues') ?? [];
      const issues: string[] = [];
      for (const block of issueBlocks) {
        const issueCode = extractTag(block, 'issueAreaCode');
        const issueDesc = extractTag(block, 'specificIssue') ?? extractTag(block, 'specificIssueText');
        if (issueCode) issues.push(issueCode);
        if (issueDesc && !issues.includes(issueDesc)) issues.push(issueDesc.slice(0, 80));
      }

      // Extract bills
      const billBlocks = extractAllTags(xml, 'bill');
      const bills: string[] = [];
      for (const block of billBlocks) {
        const billId = extractTag(block, 'billNumber') ?? extractTag(block, 'billType');
        if (billId) bills.push(billId.trim());
      }

      const entityNames: string[] = [];
      if (registrantName) entityNames.push(registrantName);
      if (clientName && clientName !== registrantName) entityNames.push(clientName);

      const claims: Claim[] = [];

      if (registrantName && clientName) {
        claims.push({
          subject: registrantName,
          predicate: 'lobbies-on-behalf-of',
          object: clientName,
          confidence: 0.95,
          meta: { amount, issues: issues.slice(0, 5) },
        });
      }

      // Bill concept claims
      for (const bill of bills) {
        claims.push({
          subject: clientName ?? registrantName ?? 'Unknown',
          predicate: 'lobbied-on-legislation',
          object: bill,
          confidence: 0.85,
          meta: { lobbyist: registrantName },
        });
      }

      const tags = ['lobbying', 'lda', ...bills.slice(0, 5)];

      signals.push({
        headline: `${registrantName ?? 'Lobbyist'} lobbied for ${clientName ?? 'client'} on ${issues.slice(0, 2).join(', ') || 'federal legislation'}`,
        url: item.url,
        publishedAt: new Date(filingDate).toISOString(),
        category: 'lobbying-disclosure',
        entityNames,
        domains: ['government-affairs', 'lobbying'],
        intensity: amount ? Math.min(1, amount / 5_000_000) : 0.4,
        confidence: 0.85,
        claims,
        tags,
        financialWeight: amount
          ? { amount, currency: 'USD', magnitude: amount >= 1_000_000 ? 'M' : 'K' }
          : undefined,
        rawPayload: { issues: issues.slice(0, 10), bills, amount },
        meta: { registrantName, clientName, issues: issues.slice(0, 10), bills },
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
