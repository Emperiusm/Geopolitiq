export interface ArticleForClustering {
  _id: string;
  title: string;
  summary: string;
  relatedCountries: string[];
  relatedChokepoints: string[];
  relatedNSA: string[];
  publishedAt: Date;
  source?: string;
}

export interface ArticleCluster {
  articles: ArticleForClustering[];
  sharedEntities: string[];
}

const CLUSTER_WINDOW_HOURS = Number(process.env.AGENT_NEWS_CLUSTER_WINDOW_HOURS ?? 6);

export function clusterArticles(
  articles: ArticleForClustering[]
): { clusters: ArticleCluster[]; solos: ArticleForClustering[] } {
  const windowMs = CLUSTER_WINDOW_HOURS * 60 * 60 * 1000;
  const used = new Set<string>();
  const clusters: ArticleCluster[] = [];

  for (let i = 0; i < articles.length; i++) {
    if (used.has(articles[i]._id)) continue;
    const a = articles[i];
    const aEntities = new Set([
      ...(a.relatedCountries ?? []),
      ...(a.relatedChokepoints ?? []),
      ...(a.relatedNSA ?? []),
    ]);

    const cluster: ArticleForClustering[] = [a];
    const shared = new Set<string>();

    for (let j = i + 1; j < articles.length; j++) {
      if (used.has(articles[j]._id)) continue;
      const b = articles[j];

      const timeDiff = Math.abs(a.publishedAt.getTime() - b.publishedAt.getTime());
      if (timeDiff > windowMs) continue;

      const bEntities = [
        ...(b.relatedCountries ?? []),
        ...(b.relatedChokepoints ?? []),
        ...(b.relatedNSA ?? []),
      ];
      const overlap = bEntities.filter((e) => aEntities.has(e));
      if (overlap.length >= 2) {
        cluster.push(b);
        overlap.forEach((e) => shared.add(e));
        used.add(b._id);
      }
    }

    if (cluster.length > 1) {
      used.add(a._id);
      clusters.push({ articles: cluster, sharedEntities: [...shared] });
    }
  }

  const solos = articles.filter((a) => !used.has(a._id));
  return { clusters, solos };
}
