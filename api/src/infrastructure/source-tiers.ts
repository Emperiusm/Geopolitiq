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

/** Map common source names (exact, lowercase) to their domain for tier resolution */
const NAME_TO_DOMAIN: Record<string, string> = {
  // Wire services
  "reuters": "reuters.com", "reuters world": "reuters.com", "reuters business": "reuters.com",
  "ap": "apnews.com", "ap news": "apnews.com", "associated press": "apnews.com",
  "afp": "france24.com", "ansa": "reuters.com",

  // BBC variants
  "bbc": "bbc.com", "bbc world": "bbc.com", "bbc news": "bbc.com",
  "bbc africa": "bbc.com", "bbc asia": "bbc.com",
  "bbc latin america": "bbc.com", "bbc middle east": "bbc.com",

  // Major outlets
  "cnn": "cnn.com", "cnn world": "cnn.com",
  "al jazeera": "aljazeera.com",
  "the guardian": "theguardian.com", "guardian": "theguardian.com",
  "guardian world": "theguardian.com", "guardian americas": "theguardian.com",
  "guardian me": "theguardian.com",
  "the new york times": "nytimes.com", "nyt": "nytimes.com",
  "the washington post": "washingtonpost.com",
  "wall street journal": "wsj.com", "wsj": "wsj.com",
  "financial times": "ft.com", "bloomberg": "ft.com",
  "cnbc": "cnbc.com", "fox news": "foxnews.com",
  "npr": "npr.org", "npr news": "npr.org",
  "pbs": "pbs.org", "pbs newshour": "pbs.org",
  "abc news": "abcnews.go.com", "abc australia": "abc.net.au",
  "cbs news": "cbsnews.com", "nbc news": "nbcnews.com",
  "france 24": "france24.com", "france24": "france24.com",
  "dw": "dw.com", "dw news": "dw.com",
  "euronews": "euronews.com",
  "le monde": "lemonde.fr",
  "spiegel": "spiegel.de",
  "tagesschau": "tagesschau.de",
  "el país": "elpais.com", "el pais": "elpais.com",
  "times of israel": "timesofisrael.com",
  "haaretz": "haaretz.com",
  "scmp": "scmp.com",
  "the hindu": "thehindu.com",
  "cna singapore": "channelnewsasia.com",
  "news24": "news24.com",
  "infobae": "infobae.com",
  "axios": "axios.com",
  "politico": "politico.com",
  "the hill": "thehill.com",

  // Government / intergovernmental
  "pentagon": "defense.gov", "state dept": "state.gov", "state department": "state.gov",
  "white house": "whitehouse.gov",
  "un news": "un.org", "united nations": "un.org", "un": "un.org", "nato": "un.org",
  "who": "who.int", "iaea": "iaea.org",
  "federal reserve": "federalreserve.gov", "fed": "federalreserve.gov",
  "sec": "sec.gov", "cisa": "cisa.gov", "cdc": "who.int",
  "uk gov": "gov.uk", "fao": "fao.org",
  "world bank": "worldbank.org", "imf": "imf.org",
  "ecdc": "who.int",

  // Specialized / think tanks
  "defense one": "defenseone.com", "defense news": "defensenews.com",
  "the war zone": "twz.com", "task & purpose": "defenseone.com",
  "military times": "defensenews.com", "usni news": "usni.org",
  "bellingcat": "bellingcat.com", "oryx osint": "oryxspioenkop.com",
  "the diplomat": "thediplomat.com",
  "foreign policy": "foreignpolicy.com", "foreign affairs": "foreignaffairs.com",
  "crisis group": "crisisgroup.org",
  "atlantic council": "atlanticcouncil.org",
  "war on the rocks": "warontherocks.com",
  "csis": "csis.org", "brookings": "brookings.edu",
  "cfr": "cfr.org", "rand": "rand.org",
  "carnegie endowment": "carnegieendowment.org",
  "chatham house": "chathamhouse.org",
  "responsible statecraft": "responsiblestatecraft.org",
  "insight crime": "insightcrime.org",
  "krebs security": "krebsonsecurity.com", "schneier on security": "krebsonsecurity.com",
  "dark reading": "krebsonsecurity.com",
  "oilprice.com": "oilprice.com", "oil & gas news": "oilprice.com",
  "gcaptain": "gcaptain.com",
  "nature news": "nature.com", "sciencedaily": "sciencedaily.com",
  "new scientist": "nature.com",
  "nikkei asia": "scmp.com", "asahi": "scmp.com",
  "rusi": "chathamhouse.org",
  "lowy institute": "brookings.edu", "stimson center": "brookings.edu",
  "wilson center": "brookings.edu", "german marshall fund": "brookings.edu",
  "jamestown foundation": "brookings.edu", "fpri": "foreignpolicy.com",
  "middle east institute": "atlanticcouncil.org",
  "iss europe": "chathamhouse.org", "ecfr": "chathamhouse.org",
  "cnas": "csis.org", "nti": "carnegieendowment.org",
  "arms control assn": "carnegieendowment.org",
  "fas": "carnegieendowment.org",
  "us travel advisories": "state.gov",
  "bulletin of atomic scientists": "carnegieendowment.org",
  "aviation week": "defensenews.com", "flight global": "defensenews.com",
  "rigzone": "oilprice.com",

  // Regional
  "kyiv independent": "kyivindependent.com",
  "moscow times": "themoscowtimes.com",
  "meduza": "meduza.io",
  "novaya gazeta europe": "novayagazeta.eu",
  "al arabiya": "alarabiya.net",
  "arab news": "arabnews.com",
  "asharq": "alarabiya.net",
  "africanews": "africanews.com",
  "premium times": "premiumtimesng.com", "vanguard nigeria": "premiumtimesng.com",
  "daily trust": "premiumtimesng.com",
  "jeune afrique": "jeuneafrique.com",
  "bangkok post": "bangkokpost.com",
  "japan today": "japantoday.com",
  "mexico news daily": "mexiconewsdaily.com",
  "hurriyet": "bangkokpost.com",
  "nos nieuws": "bangkokpost.com", "svt nyheter": "bangkokpost.com",
  "tvn24": "bangkokpost.com",
  "o globo": "infobae.com", "el tiempo": "infobae.com",
  "el universal mx": "infobae.com", "clarín": "infobae.com",
  "indian express": "thehindu.com",
  "vnexpress": "bangkokpost.com", "island times": "bangkokpost.com",

  // Aggregators
  "yahoo finance": "finance.yahoo.com",
  "marketwatch": "marketwatch.com",
  "seeking alpha": "seekingalpha.com",
  "kitco news": "marketwatch.com",
  "mining.com": "marketwatch.com", "mining technology": "marketwatch.com",
};

/** Keyword prefixes for partial matching (checked after exact lookup) */
const NAME_PREFIXES: Array<[string, string]> = [
  ["bbc", "bbc.com"],
  ["reuters", "reuters.com"],
  ["ap ", "apnews.com"],
  ["guardian", "theguardian.com"],
  ["france 24", "france24.com"],
  ["dw ", "dw.com"],
  ["al jazeera", "aljazeera.com"],
];

/** Look up the source tier for a feed name or domain */
export function getSourceTier(feedNameOrDomain: string): SourceTier {
  const lower = feedNameOrDomain.toLowerCase().trim();

  // Exact name lookup
  const mappedDomain = NAME_TO_DOMAIN[lower];
  if (mappedDomain && DOMAIN_TIERS[mappedDomain]) {
    return DOMAIN_TIERS[mappedDomain];
  }

  // Keyword prefix matching
  for (const [prefix, domain] of NAME_PREFIXES) {
    if (lower.startsWith(prefix) && DOMAIN_TIERS[domain]) {
      return DOMAIN_TIERS[domain];
    }
  }

  // Direct domain substring lookup (for URLs passed directly)
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
