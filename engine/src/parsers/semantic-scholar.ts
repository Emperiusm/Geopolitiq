import type { FetchResult, ParsedSignal, Claim } from '../pipeline/types';
import type { Parser } from './registry';

interface Author {
  name: string;
  affiliations?: string[];
}

interface SemanticScholarPaper {
  paperId?: string;
  externalIds?: { DOI?: string; ArXiv?: string; CorpusId?: number };
  title?: string;
  abstract?: string;
  year?: number;
  publicationDate?: string;
  venue?: string;
  publicationVenue?: { name?: string };
  authors?: Array<{ name?: string; affiliations?: string[] }>;
  citationCount?: number;
  referenceCount?: number;
  fieldsOfStudy?: string[];
  url?: string;
}

function extractAffiliationEntities(authors: Author[]): string[] {
  const affiliations = new Set<string>();
  for (const author of authors) {
    for (const affiliation of author.affiliations ?? []) {
      if (affiliation.trim()) affiliations.add(affiliation.trim());
    }
  }
  return Array.from(affiliations);
}

function extractAuthorNames(authors: Author[]): string[] {
  return authors.map((a) => a.name).filter(Boolean) as string[];
}

export class SemanticScholarParser implements Parser {
  sourceId = 'semantic-scholar';

  parse(raw: FetchResult): ParsedSignal[] {
    const signals: ParsedSignal[] = [];

    for (const item of raw.items) {
      let data: SemanticScholarPaper | { data?: SemanticScholarPaper[] };
      try {
        data = JSON.parse(item.raw);
      } catch {
        continue;
      }

      // Support both single paper and batch response
      const papers: SemanticScholarPaper[] = Array.isArray((data as any).data)
        ? ((data as any).data as SemanticScholarPaper[])
        : [data as SemanticScholarPaper];

      for (const paper of papers) {
        if (!paper.title) continue;

        const authors: Author[] = (paper.authors ?? []).map((a) => ({
          name: a.name ?? '',
          affiliations: a.affiliations ?? [],
        }));

        const authorNames = extractAuthorNames(authors);
        const affiliations = extractAffiliationEntities(authors);
        const venue =
          paper.publicationVenue?.name ?? paper.venue ?? undefined;

        const publishedAt = paper.publicationDate
          ? new Date(paper.publicationDate).toISOString()
          : paper.year
          ? new Date(`${paper.year}-01-01`).toISOString()
          : item.publishedAt ?? new Date().toISOString();

        const entityNames = [...affiliations, ...authorNames.slice(0, 5)];

        const claims: Claim[] = [];

        // Affiliation claims
        for (const author of authorNames.slice(0, 10)) {
          for (const affiliation of affiliations) {
            claims.push({
              subject: author,
              predicate: 'affiliated-with',
              object: affiliation,
              confidence: 0.8,
            });
          }
        }

        // Venue citation claim
        if (venue && affiliations.length > 0) {
          claims.push({
            subject: affiliations[0],
            predicate: 'published-in',
            object: venue,
            confidence: 0.9,
            meta: { paperId: paper.paperId },
          });
        }

        const tags = [
          ...(paper.fieldsOfStudy ?? []),
          paper.externalIds?.DOI ? `doi:${paper.externalIds.DOI}` : undefined,
          paper.externalIds?.ArXiv ? `arxiv:${paper.externalIds.ArXiv}` : undefined,
        ].filter((t): t is string => !!t);

        signals.push({
          headline: paper.title,
          body: paper.abstract?.slice(0, 500),
          url: paper.url ?? item.url,
          publishedAt,
          category: 'research-paper',
          entityNames,
          domains: ['research', ...(paper.fieldsOfStudy ?? []).slice(0, 3)],
          intensity: Math.min(1, (paper.citationCount ?? 0) / 1000),
          confidence: 0.85,
          claims,
          tags,
          rawPayload: {
            paperId: paper.paperId,
            citationCount: paper.citationCount,
            venue,
            doi: paper.externalIds?.DOI,
            arxiv: paper.externalIds?.ArXiv,
          },
          meta: {
            paperId: paper.paperId,
            citationCount: paper.citationCount,
            referenceCount: paper.referenceCount,
            venue,
            authorCount: authors.length,
          },
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
