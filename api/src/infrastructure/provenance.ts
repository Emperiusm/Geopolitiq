import { getDb } from "./mongo";
import { getSourceTier } from "./source-tiers";
import { extractCitations, countVagueAttributions } from "./citation-extractor";
import type { ArticleProvenance, SourceTier, CitationLink } from "../types";

/** Build provenance data for a single article within its event cluster context */
export function buildArticleProvenance(
  article: { title: string; summary: string; source: string; publishedAt: Date },
  clusterArticles: Array<{ title: string; summary: string; source: string; publishedAt: Date; provenance?: ArticleProvenance }>,
): ArticleProvenance {
  const sourceTier = getSourceTier(article.source);
  const text = `${article.title} ${article.summary}`;
  const citations = extractCitations(text);

  // Corroboration: count distinct sources in the cluster
  const allSources = new Set(clusterArticles.map((a) => a.source));
  const totalSources = allSources.size;

  // Independent sources = sources with distinct cited origins
  const citedOrigins = new Set<string>();
  let primarySourceCount = 0;
  for (const a of clusterArticles) {
    const tier = getSourceTier(a.source);
    if (tier === "primary") primarySourceCount++;

    const aCitations = extractCitations(`${a.title} ${a.summary}`);
    // Only count citations from recognized sources for convergence
    const substantive = aCitations.filter(
      (c) => c.citationType !== "vague_attribution" && c.citedSourceTier !== undefined,
    );
    for (const c of substantive) {
      citedOrigins.add(c.citedSource.toLowerCase());
    }
    // If no recognized citations, the article itself is an origin
    if (substantive.length === 0) {
      citedOrigins.add(a.source.toLowerCase());
    }
  }
  const independentSources = Math.max(citedOrigins.size, 1);

  // Citation convergence: do all articles trace to the same single origin?
  const citationConvergence = independentSources === 1 && totalSources > 1;

  // First mover analysis
  const sorted = [...clusterArticles].sort(
    (a, b) => a.publishedAt.getTime() - b.publishedAt.getTime(),
  );
  const firstMoverArticle = sorted[0];
  const firstMoverTier = getSourceTier(firstMoverArticle.source);
  const isFirstMover = article.source === firstMoverArticle.source;

  // Time to mainstream: how long until a primary/established source covered it
  const mainstreamArticle = sorted.find((a) => {
    const t = getSourceTier(a.source);
    return t === "primary" || t === "established";
  });
  const timeToMainstream = mainstreamArticle && mainstreamArticle !== firstMoverArticle
    ? mainstreamArticle.publishedAt.getTime() - firstMoverArticle.publishedAt.getTime()
    : null;

  // Red flags
  const redFlags: string[] = [];
  if (citationConvergence) {
    redFlags.push("All sources trace to a single origin");
  }
  if (firstMoverTier === "unknown" || firstMoverTier === "aggregator") {
    redFlags.push(`Story originated from ${firstMoverTier}-tier source: ${firstMoverArticle.source}`);
  }
  if (countVagueAttributions(citations) >= 2) {
    redFlags.push("Multiple vague attributions ('reports say', 'sources familiar')");
  }
  if (totalSources > 3 && primarySourceCount === 0) {
    redFlags.push("No primary-tier sources despite wide coverage");
  }
  if (timeToMainstream !== null && timeToMainstream < 30 * 60000 && (firstMoverTier === "unknown" || firstMoverTier === "aggregator")) {
    redFlags.push("Rapid mainstream pickup from low-tier origin");
  }

  // Composite trust score (0-1)
  let trustScore = 0.5;

  // Source tier bonus
  const tierScores: Record<SourceTier, number> = {
    primary: 0.3, established: 0.2, specialized: 0.15,
    regional: 0.05, aggregator: -0.1, unknown: -0.15,
  };
  trustScore += tierScores[sourceTier] ?? 0;

  // Corroboration bonus
  if (independentSources >= 3) trustScore += 0.2;
  else if (independentSources >= 2) trustScore += 0.1;

  // Primary source bonus
  if (primarySourceCount >= 2) trustScore += 0.15;
  else if (primarySourceCount >= 1) trustScore += 0.08;

  // Penalties
  if (citationConvergence) trustScore -= 0.2;
  if (redFlags.length >= 3) trustScore -= 0.15;
  if (countVagueAttributions(citations) >= 2) trustScore -= 0.1;

  trustScore = Math.max(0, Math.min(1, trustScore));

  return {
    sourceTier,
    citations,
    corroboration: {
      totalSources,
      independentSources,
      primarySourceCount,
      citationConvergence,
    },
    firstMover: {
      isFirstMover,
      firstMoverSource: firstMoverArticle.source,
      firstMoverTier,
      timeToMainstream: timeToMainstream !== null ? Math.round(timeToMainstream / 60000) : null,
    },
    trustScore: Math.round(trustScore * 100) / 100,
    redFlags,
  };
}

/** Compute provenance for a standalone article (no cluster context) */
export function buildStandaloneProvenance(
  article: { title: string; summary: string; source: string; publishedAt: Date },
): ArticleProvenance {
  return buildArticleProvenance(article, [article]);
}
