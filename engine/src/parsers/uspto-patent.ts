import type { FetchResult, ParsedSignal, Claim } from '../pipeline/types';
import type { Parser } from './registry';

/** Extracts text content of the first matching XML tag */
function extractTag(xml: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : undefined;
}

/** Extracts all matches of a repeating tag */
function extractAllTags(xml: string, tag: string): string[] {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const results: string[] = [];
  for (const m of xml.matchAll(re)) {
    const text = m[1].trim();
    if (text) results.push(text);
  }
  return results;
}

/** Extracts CPC codes of the form G06N3/04 */
function extractCpcCodes(xml: string): string[] {
  const codes: string[] = [];
  const cpcBlocks = extractAllTags(xml, 'classification-cpc');
  for (const block of cpcBlocks) {
    const section = extractTag(block, 'section');
    const cls = extractTag(block, 'class');
    const subclass = extractTag(block, 'subclass');
    const mainGroup = extractTag(block, 'main-group');
    const subGroup = extractTag(block, 'subgroup');
    if (section && cls && subclass && mainGroup && subGroup) {
      codes.push(`${section}${cls}${subclass}${mainGroup}/${subGroup}`);
    }
  }
  return codes;
}

/** Extracts cited patent numbers and assignee names from us-references-cited */
function extractCitations(xml: string): Array<{ docNumber: string; assignee?: string }> {
  const citationsBlock = extractTag(xml, 'us-references-cited');
  if (!citationsBlock) return [];

  const citations: Array<{ docNumber: string; assignee?: string }> = [];
  const citBlocks = extractAllTags(citationsBlock, 'us-citation');
  for (const block of citBlocks) {
    const docId = extractTag(block, 'document-id');
    if (!docId) continue;
    const docNumber = extractTag(docId, 'doc-number');
    if (!docNumber) continue;
    const assignee = extractTag(docId, 'name');
    citations.push({ docNumber, assignee });
  }
  return citations;
}

/** Extracts assignee organization name */
function extractAssignee(xml: string): string | undefined {
  // Try us-parties first
  const usParties = extractTag(xml, 'us-parties');
  if (usParties) {
    const applicantsBlock = extractTag(usParties, 'us-applicants');
    if (applicantsBlock) {
      const orgname = extractTag(applicantsBlock, 'orgname');
      if (orgname) return orgname;
    }
  }
  // Fall back to assignees block
  const assigneesBlock = extractTag(xml, 'assignees');
  if (assigneesBlock) {
    const orgname = extractTag(assigneesBlock, 'orgname');
    if (orgname) return orgname;
  }
  return undefined;
}

/** Extracts patent number from publication-reference */
function extractPatentNumber(xml: string): string | undefined {
  const pubRef = extractTag(xml, 'publication-reference');
  if (!pubRef) return undefined;
  const country = extractTag(pubRef, 'country') ?? 'US';
  const docNumber = extractTag(pubRef, 'doc-number');
  if (!docNumber) return undefined;
  return `${country}${docNumber}`;
}

/** Extracts filing date from application-reference */
function extractFilingDate(xml: string): string | undefined {
  const appRef = extractTag(xml, 'application-reference');
  if (!appRef) return undefined;
  const date = extractTag(appRef, 'date');
  if (!date || date.length !== 8) return undefined;
  // YYYYMMDD → ISO
  return `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00Z`;
}

export class UsptoPatentParser implements Parser {
  sourceId = 'uspto-patent';

  parse(raw: FetchResult): ParsedSignal[] {
    const signals: ParsedSignal[] = [];

    for (const item of raw.items) {
      const xml = item.raw;

      const title = extractTag(xml, 'invention-title');
      if (!title) continue;

      const assignee = extractAssignee(xml);
      const abstract = extractTag(xml, 'abstract');
      const patentNumber = extractPatentNumber(xml);
      const filingDate = extractFilingDate(xml) ?? item.publishedAt ?? new Date().toISOString();
      const cpcCodes = extractCpcCodes(xml);
      const citations = extractCitations(xml);

      const entityNames: string[] = [];
      if (assignee) entityNames.push(assignee);

      // Build citation claims
      const claims: Claim[] = [];

      for (const citation of citations) {
        // Patent cites another patent
        claims.push({
          subject: patentNumber ?? title,
          predicate: 'cites-patent',
          object: citation.docNumber,
          confidence: 0.95,
          meta: { citedPatent: citation.docNumber },
        });

        // Cross-assignee citation — "builds-on-ip-of"
        if (citation.assignee && citation.assignee !== assignee) {
          claims.push({
            subject: assignee ?? title,
            predicate: 'builds-on-ip-of',
            object: citation.assignee,
            confidence: 0.75,
            meta: { citedPatent: citation.docNumber },
          });
          // Track cited assignees as secondary entities
          if (!entityNames.includes(citation.assignee)) {
            entityNames.push(citation.assignee);
          }
        }
      }

      const tags: string[] = [];
      if (patentNumber) tags.push(patentNumber);
      tags.push(...cpcCodes);

      const signal: ParsedSignal = {
        headline: title,
        body: abstract ?? undefined,
        url: item.url,
        publishedAt: filingDate,
        category: 'patent-filing',
        entityNames,
        domains: ['intellectual-property'],
        intensity: 0.6,
        confidence: 0.9,
        claims,
        tags,
        rawPayload: { patentNumber, cpcCodes, citationCount: citations.length },
        meta: { patentNumber, assignee, cpcCodes },
      };

      signals.push(signal);
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
