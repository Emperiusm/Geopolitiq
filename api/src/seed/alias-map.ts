/**
 * Static alias map for entity resolution. Maps alternate names to canonical IDs.
 * Extended by agents over time.
 */
export const ALIAS_MAP: Record<string, string[]> = {
  // Countries — key is canonical ID (country:{slug}), values are aliases
  "country:united-states": ["United States", "United States of America", "USA", "US", "America"],
  "country:iran": ["Iran", "Islamic Republic of Iran", "IR", "Persia"],
  "country:russia": ["Russia", "Russian Federation", "RU"],
  "country:china": ["China", "People's Republic of China", "PRC", "CN"],
  "country:israel": ["Israel", "IL", "State of Israel"],
  "country:ukraine": ["Ukraine", "UA"],
  "country:north-korea": ["North Korea", "DPRK", "KP"],
  "country:south-korea": ["South Korea", "ROK", "KR"],
  "country:united-kingdom": ["United Kingdom", "UK", "GB", "Britain", "Great Britain"],
  "country:saudi-arabia": ["Saudi Arabia", "SA", "KSA", "Kingdom of Saudi Arabia"],
  "country:turkey": ["Turkey", "Turkiye", "TR", "Republic of Turkey"],
  "country:india": ["India", "IN", "Republic of India"],
  "country:pakistan": ["Pakistan", "PK"],
  "country:japan": ["Japan", "JP"],
  "country:germany": ["Germany", "DE", "Federal Republic of Germany"],
  "country:france": ["France", "FR"],
  "country:syria": ["Syria", "SY", "Syrian Arab Republic"],
  "country:iraq": ["Iraq", "IQ"],
  "country:yemen": ["Yemen", "YE"],
  "country:lebanon": ["Lebanon", "LB"],
  "country:egypt": ["Egypt", "EG"],
  "country:taiwan": ["Taiwan", "TW", "Republic of China", "ROC"],

  // Organizations
  "org:hezbollah": ["Hezbollah", "Hizballah", "Hizbollah", "Party of God"],
  "org:hamas": ["Hamas", "Islamic Resistance Movement"],
  "org:isis": ["ISIS", "ISIL", "Islamic State", "Daesh", "IS"],
  "org:houthis": ["Houthis", "Ansar Allah", "Houthi"],
  "org:taliban": ["Taliban", "Islamic Emirate of Afghanistan"],
  "org:nato": ["NATO", "North Atlantic Treaty Organization"],
  "org:opec": ["OPEC", "Organization of Petroleum Exporting Countries"],
  "org:eu": ["EU", "European Union"],
  "org:un": ["UN", "United Nations"],
  "org:iaea": ["IAEA", "International Atomic Energy Agency"],
  "org:wagner": ["Wagner", "Wagner Group", "PMC Wagner"],
};
