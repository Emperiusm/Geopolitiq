export type FeedTier = "fast" | "standard" | "slow";

export interface FeedConfig {
  name: string;
  url: string;
  tier: FeedTier;
  category: string;
  lang?: string;
}

const gn = (q: string) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

export const FEEDS: FeedConfig[] = [
  // ── GEOPOLITICAL / BREAKING ─────────────────────────────────────────────
  {
    name: "BBC World",
    url: "https://feeds.bbci.co.uk/news/world/rss.xml",
    tier: "fast",
    category: "geopolitical",
  },
  {
    name: "Guardian World",
    url: "https://www.theguardian.com/world/rss",
    tier: "fast",
    category: "geopolitical",
  },
  {
    name: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
    tier: "fast",
    category: "geopolitical",
  },
  {
    name: "AP News",
    url: gn("site:apnews.com"),
    tier: "fast",
    category: "geopolitical",
  },
  {
    name: "Reuters World",
    url: gn("site:reuters.com world"),
    tier: "fast",
    category: "geopolitical",
  },
  {
    name: "CNN World",
    url: gn("site:cnn.com world news when:1d"),
    tier: "fast",
    category: "geopolitical",
  },
  {
    name: "France 24",
    url: "https://www.france24.com/en/rss",
    tier: "fast",
    category: "geopolitical",
  },
  {
    name: "DW News",
    url: "https://rss.dw.com/xml/rss-en-all",
    tier: "fast",
    category: "geopolitical",
  },

  // ── US NEWS ──────────────────────────────────────────────────────────────
  {
    name: "NPR News",
    url: "https://feeds.npr.org/1001/rss.xml",
    tier: "fast",
    category: "us-news",
  },
  {
    name: "PBS NewsHour",
    url: "https://www.pbs.org/newshour/feeds/rss/headlines",
    tier: "fast",
    category: "us-news",
  },
  {
    name: "ABC News",
    url: "https://feeds.abcnews.com/abcnews/topstories",
    tier: "fast",
    category: "us-news",
  },
  {
    name: "CBS News",
    url: "https://www.cbsnews.com/latest/rss/main",
    tier: "fast",
    category: "us-news",
  },
  {
    name: "NBC News",
    url: "https://feeds.nbcnews.com/nbcnews/public/news",
    tier: "fast",
    category: "us-news",
  },
  {
    name: "Wall Street Journal",
    url: "https://feeds.content.dowjones.io/public/rss/RSSUSnews",
    tier: "fast",
    category: "us-news",
  },
  {
    name: "Politico",
    url: "https://rss.politico.com/politics-news.xml",
    tier: "fast",
    category: "us-news",
  },
  {
    name: "The Hill",
    url: "https://thehill.com/news/feed",
    tier: "fast",
    category: "us-news",
  },
  {
    name: "Axios",
    url: "https://api.axios.com/feed/",
    tier: "fast",
    category: "us-news",
  },
  {
    name: "Fox News",
    url: "https://moxie.foxnews.com/google-publisher/latest.xml",
    tier: "fast",
    category: "us-news",
  },

  // ── FINANCE / ECONOMICS ──────────────────────────────────────────────────
  {
    name: "CNBC",
    url: "https://www.cnbc.com/id/100003114/device/rss/rss.html",
    tier: "fast",
    category: "finance",
  },
  {
    name: "Yahoo Finance",
    url: "https://finance.yahoo.com/rss/topstories",
    tier: "fast",
    category: "finance",
  },
  {
    name: "Financial Times",
    url: "https://www.ft.com/rss/home",
    tier: "fast",
    category: "finance",
  },
  {
    name: "MarketWatch",
    url: gn("site:marketwatch.com markets when:1d"),
    tier: "fast",
    category: "finance",
  },
  {
    name: "Reuters Business",
    url: gn("site:reuters.com business markets"),
    tier: "fast",
    category: "finance",
  },
  {
    name: "Seeking Alpha",
    url: "https://seekingalpha.com/market_currents.xml",
    tier: "fast",
    category: "finance",
  },

  // ── MIDDLE EAST ──────────────────────────────────────────────────────────
  {
    name: "BBC Middle East",
    url: "https://feeds.bbci.co.uk/news/world/middle_east/rss.xml",
    tier: "standard",
    category: "middle-east",
  },
  {
    name: "Guardian ME",
    url: "https://www.theguardian.com/world/middleeast/rss",
    tier: "standard",
    category: "middle-east",
  },
  {
    name: "Al Arabiya",
    url: gn("site:english.alarabiya.net when:2d"),
    tier: "standard",
    category: "middle-east",
  },
  {
    name: "Times of Israel",
    url: gn("site:timesofisrael.com when:2d"),
    tier: "standard",
    category: "middle-east",
  },
  {
    name: "Haaretz",
    url: gn("site:haaretz.com when:2d"),
    tier: "standard",
    category: "middle-east",
  },
  {
    name: "Arab News",
    url: gn("site:arabnews.com when:2d"),
    tier: "standard",
    category: "middle-east",
  },
  {
    name: "Asharq",
    url: gn("site:asharq.com when:2d"),
    tier: "standard",
    category: "middle-east",
  },

  // ── EUROPE ───────────────────────────────────────────────────────────────
  {
    name: "EuroNews",
    url: "https://www.euronews.com/rss?format=xml",
    tier: "standard",
    category: "europe",
  },
  {
    name: "Le Monde",
    url: "https://www.lemonde.fr/en/rss/une.xml",
    tier: "standard",
    category: "europe",
  },
  {
    name: "Kyiv Independent",
    url: gn("site:kyivindependent.com when:2d"),
    tier: "standard",
    category: "europe",
  },
  {
    name: "Moscow Times",
    url: gn("site:themoscowtimes.com when:2d"),
    tier: "standard",
    category: "europe",
  },
  {
    name: "Meduza",
    url: gn("site:meduza.io when:3d"),
    tier: "standard",
    category: "europe",
  },
  {
    name: "Novaya Gazeta Europe",
    url: gn("site:novayagazeta.eu when:3d"),
    tier: "standard",
    category: "europe",
  },
  {
    name: "Spiegel",
    url: gn("site:spiegel.de when:2d"),
    tier: "standard",
    category: "europe",
    lang: "de",
  },
  {
    name: "Tagesschau",
    url: "https://www.tagesschau.de/xml/rss2/",
    tier: "standard",
    category: "europe",
    lang: "de",
  },
  {
    name: "ANSA",
    url: "https://www.ansa.it/sito/ansait_rss.xml",
    tier: "standard",
    category: "europe",
    lang: "it",
  },
  {
    name: "El País",
    url: gn("site:elpais.com when:2d"),
    tier: "standard",
    category: "europe",
    lang: "es",
  },
  {
    name: "NOS Nieuws",
    url: "https://feeds.nos.nl/nosnieuwsalgemeen",
    tier: "standard",
    category: "europe",
    lang: "nl",
  },
  {
    name: "SVT Nyheter",
    url: "https://www.svt.se/nyheter/rss.xml",
    tier: "standard",
    category: "europe",
    lang: "sv",
  },
  {
    name: "TVN24",
    url: gn("site:tvn24.pl when:2d"),
    tier: "standard",
    category: "europe",
    lang: "pl",
  },
  {
    name: "Hurriyet",
    url: gn("site:hurriyet.com.tr when:2d"),
    tier: "standard",
    category: "europe",
    lang: "tr",
  },

  // ── ASIA ─────────────────────────────────────────────────────────────────
  {
    name: "BBC Asia",
    url: "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
    tier: "standard",
    category: "asia",
  },
  {
    name: "The Diplomat",
    url: "https://thediplomat.com/feed/",
    tier: "standard",
    category: "asia",
  },
  {
    name: "Nikkei Asia",
    url: gn("site:asia.nikkei.com when:3d"),
    tier: "standard",
    category: "asia",
  },
  {
    name: "CNA Singapore",
    url: "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml",
    tier: "standard",
    category: "asia",
  },
  {
    name: "SCMP",
    url: gn("site:scmp.com when:2d"),
    tier: "standard",
    category: "asia",
  },
  {
    name: "The Hindu",
    url: "https://www.thehindu.com/feeder/default.rss",
    tier: "standard",
    category: "asia",
  },
  {
    name: "Indian Express",
    url: gn("site:indianexpress.com when:2d"),
    tier: "standard",
    category: "asia",
  },
  {
    name: "Japan Today",
    url: gn("site:japantoday.com when:3d"),
    tier: "standard",
    category: "asia",
  },
  {
    name: "Bangkok Post",
    url: gn("site:bangkokpost.com when:3d"),
    tier: "standard",
    category: "asia",
  },
  {
    name: "VnExpress",
    url: gn("site:vnexpress.net when:3d"),
    tier: "standard",
    category: "asia",
    lang: "vi",
  },
  {
    name: "Asahi",
    url: gn("site:asahi.com when:3d"),
    tier: "standard",
    category: "asia",
    lang: "ja",
  },

  // ── AFRICA ───────────────────────────────────────────────────────────────
  {
    name: "BBC Africa",
    url: "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
    tier: "standard",
    category: "africa",
  },
  {
    name: "News24",
    url: "https://feeds.news24.com/articles/news24/TopStories/rss",
    tier: "standard",
    category: "africa",
  },
  {
    name: "Africanews",
    url: "https://www.africanews.com/feed/",
    tier: "standard",
    category: "africa",
  },
  {
    name: "Jeune Afrique",
    url: "https://www.jeuneafrique.com/feed/",
    tier: "standard",
    category: "africa",
    lang: "fr",
  },
  {
    name: "Premium Times",
    url: "https://www.premiumtimesng.com/feed",
    tier: "standard",
    category: "africa",
  },
  {
    name: "Vanguard Nigeria",
    url: gn("site:vanguardngr.com when:3d"),
    tier: "standard",
    category: "africa",
  },
  {
    name: "Daily Trust",
    url: gn("site:dailytrust.com when:3d"),
    tier: "standard",
    category: "africa",
  },

  // ── LATIN AMERICA ────────────────────────────────────────────────────────
  {
    name: "BBC Latin America",
    url: "https://feeds.bbci.co.uk/news/world/latin_america/rss.xml",
    tier: "standard",
    category: "latin-america",
  },
  {
    name: "Guardian Americas",
    url: "https://www.theguardian.com/world/americas/rss",
    tier: "standard",
    category: "latin-america",
  },
  {
    name: "InSight Crime",
    url: "https://insightcrime.org/feed/",
    tier: "standard",
    category: "latin-america",
  },
  {
    name: "Infobae",
    url: "https://www.infobae.com/arc/outboundfeeds/rss/",
    tier: "standard",
    category: "latin-america",
    lang: "es",
  },
  {
    name: "Clarín",
    url: "https://www.clarin.com/rss/lo-ultimo/",
    tier: "standard",
    category: "latin-america",
    lang: "es",
  },
  {
    name: "El Tiempo",
    url: gn("site:eltiempo.com when:3d"),
    tier: "standard",
    category: "latin-america",
    lang: "es",
  },
  {
    name: "El Universal MX",
    url: gn("site:eluniversal.com.mx when:3d"),
    tier: "standard",
    category: "latin-america",
    lang: "es",
  },
  {
    name: "Mexico News Daily",
    url: gn("site:mexiconewsdaily.com when:3d"),
    tier: "standard",
    category: "latin-america",
  },
  {
    name: "O Globo",
    url: gn("site:oglobo.globo.com when:3d"),
    tier: "standard",
    category: "latin-america",
    lang: "pt",
  },

  // ── OCEANIA ──────────────────────────────────────────────────────────────
  {
    name: "ABC Australia",
    url: gn("site:abc.net.au when:2d"),
    tier: "standard",
    category: "oceania",
  },
  {
    name: "Island Times",
    url: gn("site:islandtimes.org when:7d"),
    tier: "standard",
    category: "oceania",
  },

  // ── DEFENSE / MILITARY / INTEL ───────────────────────────────────────────
  {
    name: "Defense One",
    url: "https://www.defenseone.com/rss/all/",
    tier: "standard",
    category: "defense",
  },
  {
    name: "The War Zone",
    url: "https://www.twz.com/feed",
    tier: "standard",
    category: "defense",
  },
  {
    name: "Defense News",
    url: "https://www.defensenews.com/arc/outboundfeeds/rss/?outputType=xml",
    tier: "standard",
    category: "defense",
  },
  {
    name: "Military Times",
    url: "https://www.militarytimes.com/arc/outboundfeeds/rss/?outputType=xml",
    tier: "standard",
    category: "defense",
  },
  {
    name: "Task & Purpose",
    url: "https://taskandpurpose.com/feed/",
    tier: "standard",
    category: "defense",
  },
  {
    name: "USNI News",
    url: "https://news.usni.org/feed",
    tier: "standard",
    category: "defense",
  },
  {
    name: "gCaptain",
    url: "https://gcaptain.com/feed/",
    tier: "standard",
    category: "defense",
  },
  {
    name: "Oryx OSINT",
    url: "https://www.oryxspioenkop.com/feeds/posts/default?alt=rss",
    tier: "standard",
    category: "defense",
  },
  {
    name: "Bellingcat",
    url: gn("site:bellingcat.com"),
    tier: "standard",
    category: "defense",
  },
  {
    name: "Aviation Week",
    url: gn("site:aviationweek.com when:3d"),
    tier: "standard",
    category: "defense",
  },
  {
    name: "Flight Global",
    url: gn("site:flightglobal.com when:3d"),
    tier: "standard",
    category: "defense",
  },

  // ── ENERGY / MARITIME / COMMODITIES ─────────────────────────────────────
  {
    name: "OilPrice.com",
    url: "https://oilprice.com/rss/main",
    tier: "standard",
    category: "energy",
  },
  {
    name: "Rigzone",
    url: "https://www.rigzone.com/news/rss/rigzone_latest.aspx",
    tier: "standard",
    category: "energy",
  },
  {
    name: "Oil & Gas News",
    url: gn("(oil price OR OPEC OR LNG OR pipeline) when:2d"),
    tier: "standard",
    category: "energy",
  },
  {
    name: "Mining.com",
    url: "https://www.mining.com/feed/",
    tier: "standard",
    category: "energy",
  },
  {
    name: "Mining Technology",
    url: "https://www.mining-technology.com/feed/",
    tier: "standard",
    category: "energy",
  },
  {
    name: "Kitco News",
    url: gn("site:kitco.com gold OR silver OR metals when:1d"),
    tier: "standard",
    category: "energy",
  },

  // ── CYBER / SECURITY ─────────────────────────────────────────────────────
  {
    name: "Krebs Security",
    url: "https://krebsonsecurity.com/feed/",
    tier: "standard",
    category: "cyber",
  },
  {
    name: "Dark Reading",
    url: "https://www.darkreading.com/rss.xml",
    tier: "standard",
    category: "cyber",
  },
  {
    name: "Schneier on Security",
    url: gn("site:schneier.com"),
    tier: "standard",
    category: "cyber",
  },

  // ── THINK TANKS / ANALYSIS ───────────────────────────────────────────────
  {
    name: "Foreign Policy",
    url: "https://foreignpolicy.com/feed/",
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Foreign Affairs",
    url: "https://www.foreignaffairs.com/rss.xml",
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Atlantic Council",
    url: "https://www.atlanticcouncil.org/feed/",
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "War on the Rocks",
    url: "https://warontherocks.com/feed/",
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "CSIS",
    url: "https://www.csis.org/rss.xml",
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Crisis Group",
    url: "https://www.crisisgroup.org/rss",
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "RAND",
    url: gn("site:rand.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Carnegie Endowment",
    url: gn("site:carnegieendowment.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Brookings",
    url: gn("site:brookings.edu"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Chatham House",
    url: gn("site:chathamhouse.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "CFR",
    url: gn("site:cfr.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Responsible Statecraft",
    url: "https://responsiblestatecraft.org/feed/",
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "FPRI",
    url: gn("site:fpri.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Jamestown Foundation",
    url: gn("site:jamestown.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "ECFR",
    url: gn("site:ecfr.eu"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "German Marshall Fund",
    url: gn("site:gmfus.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Wilson Center",
    url: gn("site:wilsoncenter.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Lowy Institute",
    url: gn("site:lowyinstitute.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Middle East Institute",
    url: gn("site:mei.edu"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Stimson Center",
    url: gn("site:stimson.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "CNAS",
    url: gn("site:cnas.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "RUSI",
    url: gn("site:rusi.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Arms Control Assn",
    url: gn("site:armscontrol.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "Bulletin of Atomic Scientists",
    url: gn("site:thebulletin.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "FAS",
    url: gn("site:fas.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "NTI",
    url: gn("site:nti.org"),
    tier: "slow",
    category: "think-tank",
  },
  {
    name: "ISS Europe",
    url: gn("site:iss.europa.eu"),
    tier: "slow",
    category: "think-tank",
  },

  // ── GOVERNMENT / INSTITUTIONAL ───────────────────────────────────────────
  {
    name: "White House",
    url: gn("site:whitehouse.gov"),
    tier: "slow",
    category: "government",
  },
  {
    name: "State Dept",
    url: gn("site:state.gov"),
    tier: "slow",
    category: "government",
  },
  {
    name: "Pentagon",
    url: gn("site:defense.gov"),
    tier: "slow",
    category: "government",
  },
  {
    name: "UN News",
    url: "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    tier: "slow",
    category: "government",
  },
  {
    name: "IAEA",
    url: "https://www.iaea.org/feeds/topnews",
    tier: "slow",
    category: "government",
  },
  {
    name: "WHO",
    url: "https://www.who.int/rss-feeds/news-english.xml",
    tier: "slow",
    category: "government",
  },
  {
    name: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
    tier: "slow",
    category: "government",
  },
  {
    name: "SEC",
    url: "https://www.sec.gov/news/pressreleases.rss",
    tier: "slow",
    category: "government",
  },
  {
    name: "CISA",
    url: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
    tier: "slow",
    category: "government",
  },
  {
    name: "UK Gov",
    url: gn("site:gov.uk foreign affairs"),
    tier: "slow",
    category: "government",
  },
  {
    name: "FAO",
    url: "https://www.fao.org/feeds/fao-newsroom-rss",
    tier: "slow",
    category: "government",
  },
  {
    name: "World Bank",
    url: gn("site:worldbank.org"),
    tier: "slow",
    category: "government",
  },
  {
    name: "IMF",
    url: gn("site:imf.org"),
    tier: "slow",
    category: "government",
  },
  {
    name: "US Travel Advisories",
    url: gn("site:travel.state.gov"),
    tier: "slow",
    category: "government",
  },

  // ── SCIENCE / HEALTH ─────────────────────────────────────────────────────
  {
    name: "ScienceDaily",
    url: "https://www.sciencedaily.com/rss/all.xml",
    tier: "slow",
    category: "science",
  },
  {
    name: "Nature News",
    url: "https://feeds.nature.com/nature/rss/current",
    tier: "slow",
    category: "science",
  },
  {
    name: "New Scientist",
    url: gn("site:newscientist.com when:3d"),
    tier: "slow",
    category: "science",
  },
  {
    name: "CDC",
    url: gn("site:cdc.gov when:7d"),
    tier: "slow",
    category: "science",
  },
  {
    name: "ECDC",
    url: gn("site:ecdc.europa.eu when:7d"),
    tier: "slow",
    category: "science",
  },
];

export function getFeedsByTier(tier: FeedTier): FeedConfig[] {
  return FEEDS.filter((f) => f.tier === tier);
}

export function getAllFeeds(): FeedConfig[] {
  return FEEDS;
}
