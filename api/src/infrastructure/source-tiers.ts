import type { SourceTier } from "../types";

/**
 * Static trust tiers for known news domains.
 * Not about bias — about editorial verification standards.
 */
const DOMAIN_TIERS: Record<string, SourceTier> = {
  // Primary — wire services, government agencies, original reporting with verification
  "apnews.com": "primary",
  "reuters.com": "primary",
  "state.gov": "primary",
  "defense.gov": "primary",
  "whitehouse.gov": "primary",
  "un.org": "primary",
  "who.int": "primary",
  "iaea.org": "primary",
  "federalreserve.gov": "primary",
  "sec.gov": "primary",
  "cisa.gov": "primary",
  "gov.uk": "primary",
  "fao.org": "primary",
  "worldbank.org": "primary",
  "imf.org": "primary",
  "travel.state.gov": "primary",

  // Established — major outlets with editorial review
  "bbc.co.uk": "established",
  "bbc.com": "established",
  "theguardian.com": "established",
  "aljazeera.com": "established",
  "cnn.com": "established",
  "france24.com": "established",
  "dw.com": "established",
  "npr.org": "established",
  "pbs.org": "established",
  "abcnews.go.com": "established",
  "cbsnews.com": "established",
  "nbcnews.com": "established",
  "wsj.com": "established",
  "nytimes.com": "established",
  "washingtonpost.com": "established",
  "ft.com": "established",
  "economist.com": "established",
  "politico.com": "established",
  "thehill.com": "established",
  "axios.com": "established",
  "foxnews.com": "established",
  "cnbc.com": "established",
  "euronews.com": "established",
  "lemonde.fr": "established",
  "spiegel.de": "established",
  "tagesschau.de": "established",
  "elpais.com": "established",
  "timesofisrael.com": "established",
  "haaretz.com": "established",
  "scmp.com": "established",
  "thehindu.com": "established",
  "channelnewsasia.com": "established",
  "abc.net.au": "established",
  "news24.com": "established",
  "infobae.com": "established",

  // Specialized — domain-specific with reputation
  "foreignpolicy.com": "specialized",
  "foreignaffairs.com": "specialized",
  "defenseone.com": "specialized",
  "defensenews.com": "specialized",
  "twz.com": "specialized",
  "usni.org": "specialized",
  "bellingcat.com": "specialized",
  "thediplomat.com": "specialized",
  "crisisgroup.org": "specialized",
  "atlanticcouncil.org": "specialized",
  "warontherocks.com": "specialized",
  "csis.org": "specialized",
  "brookings.edu": "specialized",
  "cfr.org": "specialized",
  "rand.org": "specialized",
  "carnegieendowment.org": "specialized",
  "chathamhouse.org": "specialized",
  "responsiblestatecraft.org": "specialized",
  "insightcrime.org": "specialized",
  "krebsonsecurity.com": "specialized",
  "oilprice.com": "specialized",
  "gcaptain.com": "specialized",
  "oryxspioenkop.com": "specialized",
  "nature.com": "specialized",
  "sciencedaily.com": "specialized",

  // Regional — local outlets, less verification infrastructure
  "kyivindependent.com": "regional",
  "themoscowtimes.com": "regional",
  "meduza.io": "regional",
  "novayagazeta.eu": "regional",
  "alarabiya.net": "regional",
  "arabnews.com": "regional",
  "africanews.com": "regional",
  "premiumtimesng.com": "regional",
  "jeuneafrique.com": "regional",
  "bangkokpost.com": "regional",
  "japantoday.com": "regional",
  "mexiconewsdaily.com": "regional",

  // Aggregator — content farms, rewrite mills, wire repackagers
  "news.google.com": "aggregator",
  "finance.yahoo.com": "aggregator",
  "seekingalpha.com": "aggregator",
  "marketwatch.com": "aggregator",
};

/** Map common source names to their domain for tier resolution */
const NAME_TO_DOMAIN: Record<string, string> = {
  "reuters": "reuters.com",
  "ap": "apnews.com",
  "associated press": "apnews.com",
  "afp": "france24.com",
  "bbc": "bbc.co.uk",
  "cnn": "cnn.com",
  "al jazeera": "aljazeera.com",
  "the guardian": "theguardian.com",
  "guardian": "theguardian.com",
  "the new york times": "nytimes.com",
  "nyt": "nytimes.com",
  "the washington post": "washingtonpost.com",
  "wall street journal": "wsj.com",
  "wsj": "wsj.com",
  "financial times": "ft.com",
  "bloomberg": "ft.com",
  "cnbc": "cnbc.com",
  "fox news": "foxnews.com",
  "npr": "npr.org",
  "pbs": "pbs.org",
  "abc news": "abcnews.go.com",
  "cbs news": "cbsnews.com",
  "nbc news": "nbcnews.com",
  "france 24": "france24.com",
  "defense one": "defenseone.com",
  "defense news": "defensenews.com",
  "the war zone": "twz.com",
  "bellingcat": "bellingcat.com",
  "the diplomat": "thediplomat.com",
  "foreign policy": "foreignpolicy.com",
  "foreign affairs": "foreignaffairs.com",
  "pentagon": "defense.gov",
  "state department": "state.gov",
  "white house": "whitehouse.gov",
  "united nations": "un.org",
  "un": "un.org",
  "nato": "un.org",
  "who": "who.int",
  "iaea": "iaea.org",
};

/** Look up the source tier for a feed name or domain */
export function getSourceTier(feedNameOrDomain: string): SourceTier {
  const lower = feedNameOrDomain.toLowerCase();

  // Check name-to-domain mapping first
  const mappedDomain = NAME_TO_DOMAIN[lower];
  if (mappedDomain && DOMAIN_TIERS[mappedDomain]) {
    return DOMAIN_TIERS[mappedDomain];
  }

  // Direct domain lookup
  for (const [domain, tier] of Object.entries(DOMAIN_TIERS)) {
    if (lower.includes(domain)) return tier;
  }

  return "unknown";
}

/** Look up source tier from a URL */
export function getSourceTierFromUrl(url: string): SourceTier {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return DOMAIN_TIERS[hostname] ?? "unknown";
  } catch {
    return "unknown";
  }
}

/** Get all domains for a given tier */
export function getDomainsByTier(tier: SourceTier): string[] {
  return Object.entries(DOMAIN_TIERS)
    .filter(([, t]) => t === tier)
    .map(([domain]) => domain);
}
