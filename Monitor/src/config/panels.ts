import type { MapLayers, DataSourceId } from '@/types';
import { SITE_VARIANT } from './variant';

// Re-export variant panel configs for consumers that need specific variants
export { FULL_PANELS, FULL_MAP_LAYERS, FULL_MOBILE_MAP_LAYERS } from './panels-full';
export { TECH_PANELS, TECH_MAP_LAYERS, TECH_MOBILE_MAP_LAYERS } from './panels-tech';
export { FINANCE_PANELS, FINANCE_MAP_LAYERS, FINANCE_MOBILE_MAP_LAYERS } from './panels-finance';
export { HAPPY_PANELS, HAPPY_MAP_LAYERS, HAPPY_MOBILE_MAP_LAYERS } from './panels-happy';
export { COMMODITY_PANELS, COMMODITY_MAP_LAYERS, COMMODITY_MOBILE_MAP_LAYERS } from './panels-commodity';

// Import for variant selection
import { FULL_PANELS, FULL_MAP_LAYERS, FULL_MOBILE_MAP_LAYERS } from './panels-full';
import { TECH_PANELS, TECH_MAP_LAYERS, TECH_MOBILE_MAP_LAYERS } from './panels-tech';
import { FINANCE_PANELS, FINANCE_MAP_LAYERS, FINANCE_MOBILE_MAP_LAYERS } from './panels-finance';
import { HAPPY_PANELS, HAPPY_MAP_LAYERS, HAPPY_MOBILE_MAP_LAYERS } from './panels-happy';
import { COMMODITY_PANELS, COMMODITY_MAP_LAYERS, COMMODITY_MOBILE_MAP_LAYERS } from './panels-commodity';

// ============================================
// VARIANT-AWARE EXPORTS
// ============================================
export const DEFAULT_PANELS = SITE_VARIANT === 'happy'
  ? HAPPY_PANELS
  : SITE_VARIANT === 'tech'
    ? TECH_PANELS
    : SITE_VARIANT === 'finance'
      ? FINANCE_PANELS
      : SITE_VARIANT === 'commodity'
        ? COMMODITY_PANELS
        : FULL_PANELS;

export const DEFAULT_MAP_LAYERS = SITE_VARIANT === 'happy'
  ? HAPPY_MAP_LAYERS
  : SITE_VARIANT === 'tech'
    ? TECH_MAP_LAYERS
    : SITE_VARIANT === 'finance'
      ? FINANCE_MAP_LAYERS
      : SITE_VARIANT === 'commodity'
        ? COMMODITY_MAP_LAYERS
        : FULL_MAP_LAYERS;

export const MOBILE_DEFAULT_MAP_LAYERS = SITE_VARIANT === 'happy'
  ? HAPPY_MOBILE_MAP_LAYERS
  : SITE_VARIANT === 'tech'
    ? TECH_MOBILE_MAP_LAYERS
    : SITE_VARIANT === 'finance'
      ? FINANCE_MOBILE_MAP_LAYERS
      : SITE_VARIANT === 'commodity'
        ? COMMODITY_MOBILE_MAP_LAYERS
        : FULL_MOBILE_MAP_LAYERS;

/** Maps map-layer toggle keys to their data-freshness source IDs (single source of truth). */
export const LAYER_TO_SOURCE: Partial<Record<keyof MapLayers, DataSourceId[]>> = {
  military: ['opensky', 'wingbits'],
  ais: ['ais'],
  natural: ['usgs'],
  weather: ['weather'],
  outages: ['outages'],
  cyberThreats: ['cyber_threats'],
  protests: ['acled', 'gdelt_doc'],
  ucdpEvents: ['ucdp_events'],
  displacement: ['unhcr'],
  climate: ['climate'],
};

// ============================================
// PANEL CATEGORY MAP (variant-aware)
// ============================================
// Maps category keys to panel keys. Only categories with at least one
// matching panel in the active variant's DEFAULT_PANELS are shown.
// The `variants` field restricts a category to specific site variants;
// omit it to show the category for all variants.
export const PANEL_CATEGORY_MAP: Record<string, { labelKey: string; panelKeys: string[]; variants?: string[] }> = {
  // All variants — essential panels
  core: {
    labelKey: 'header.panelCatCore',
    panelKeys: ['map', 'live-news', 'live-webcams', 'windy-webcams', 'insights', 'strategic-posture'],
  },

  // Full (geopolitical) variant
  intelligence: {
    labelKey: 'header.panelCatIntelligence',
    panelKeys: ['cii', 'strategic-risk', 'intel', 'gdelt-intel', 'cascade', 'telegram-intel', 'forecast'],
    variants: ['full'],
  },
  correlation: {
    labelKey: 'header.panelCatCorrelation',
    panelKeys: ['military-correlation', 'escalation-correlation', 'economic-correlation', 'disaster-correlation'],
    variants: ['full'],
  },
  regionalNews: {
    labelKey: 'header.panelCatRegionalNews',
    panelKeys: ['politics', 'us', 'europe', 'middleeast', 'africa', 'latam', 'asia'],
    variants: ['full'],
  },
  marketsFinance: {
    labelKey: 'header.panelCatMarketsFinance',
    panelKeys: ['commodities', 'markets', 'economic', 'trade-policy', 'supply-chain', 'finance', 'polymarket', 'macro-signals', 'gulf-economies', 'etf-flows', 'stablecoins', 'crypto', 'heatmap'],
    variants: ['full'],
  },
  topical: {
    labelKey: 'header.panelCatTopical',
    panelKeys: ['energy', 'gov', 'thinktanks', 'tech', 'ai', 'layoffs'],
    variants: ['full'],
  },
  dataTracking: {
    labelKey: 'header.panelCatDataTracking',
    panelKeys: ['monitors', 'satellite-fires', 'ucdp-events', 'displacement', 'climate', 'population-exposure', 'security-advisories', 'oref-sirens', 'world-clock', 'tech-readiness'],
    variants: ['full'],
  },

  // Tech variant
  techAi: {
    labelKey: 'header.panelCatTechAi',
    panelKeys: ['ai', 'tech', 'hardware', 'cloud', 'dev', 'github', 'producthunt', 'events', 'service-status', 'tech-readiness'],
    variants: ['tech'],
  },
  startupsVc: {
    labelKey: 'header.panelCatStartupsVc',
    panelKeys: ['startups', 'vcblogs', 'regionalStartups', 'unicorns', 'accelerators', 'funding', 'ipo'],
    variants: ['tech'],
  },
  securityPolicy: {
    labelKey: 'header.panelCatSecurityPolicy',
    panelKeys: ['security', 'policy', 'regulation'],
    variants: ['tech'],
  },
  techMarkets: {
    labelKey: 'header.panelCatMarkets',
    panelKeys: ['markets', 'finance', 'crypto', 'economic', 'polymarket', 'macro-signals', 'etf-flows', 'stablecoins', 'layoffs', 'monitors', 'world-clock'],
    variants: ['tech'],
  },

  // Finance variant
  finMarkets: {
    labelKey: 'header.panelCatMarkets',
    panelKeys: ['markets', 'stock-analysis', 'stock-backtest', 'daily-market-brief', 'markets-news', 'heatmap', 'macro-signals', 'analysis', 'polymarket'],
    variants: ['finance'],
  },
  fixedIncomeFx: {
    labelKey: 'header.panelCatFixedIncomeFx',
    panelKeys: ['forex', 'bonds'],
    variants: ['finance'],
  },
  finCommodities: {
    labelKey: 'header.panelCatCommodities',
    panelKeys: ['commodities', 'commodities-news'],
    variants: ['finance'],
  },
  cryptoDigital: {
    labelKey: 'header.panelCatCryptoDigital',
    panelKeys: ['crypto', 'crypto-news', 'etf-flows', 'stablecoins', 'fintech'],
    variants: ['finance'],
  },
  centralBanksEcon: {
    labelKey: 'header.panelCatCentralBanks',
    panelKeys: ['centralbanks', 'economic', 'trade-policy', 'supply-chain', 'economic-news'],
    variants: ['finance'],
  },
  dealsInstitutional: {
    labelKey: 'header.panelCatDeals',
    panelKeys: ['ipo', 'derivatives', 'institutional', 'regulation'],
    variants: ['finance'],
  },
  gulfMena: {
    labelKey: 'header.panelCatGulfMena',
    panelKeys: ['gulf-economies', 'gcc-investments', 'gccNews', 'monitors', 'world-clock'],
    variants: ['finance'],
  },

  // Commodity variant
  commodityPrices: {
    labelKey: 'header.panelCatCommodityPrices',
    panelKeys: ['commodities', 'gold-silver', 'energy', 'base-metals', 'critical-minerals', 'markets', 'heatmap', 'macro-signals'],
    variants: ['commodity'],
  },
  miningIndustry: {
    labelKey: 'header.panelCatMining',
    panelKeys: ['commodity-news', 'mining-news', 'mining-companies', 'supply-chain', 'commodity-regulation'],
    variants: ['commodity'],
  },
  commodityEcon: {
    labelKey: 'header.panelCatCommodityEcon',
    panelKeys: ['trade-policy', 'economic', 'gulf-economies', 'gcc-investments', 'finance', 'polymarket', 'airline-intel', 'world-clock', 'monitors'],
    variants: ['commodity'],
  },

  // Happy variant
  happyNews: {
    labelKey: 'header.panelCatHappyNews',
    panelKeys: ['positive-feed', 'progress', 'counters', 'spotlight', 'breakthroughs', 'digest'],
    variants: ['happy'],
  },
  happyPlanet: {
    labelKey: 'header.panelCatHappyPlanet',
    panelKeys: ['species', 'renewable', 'giving'],
    variants: ['happy'],
  },
};

// Monitor palette — fixed category colors persisted to localStorage (not theme-dependent)
export const MONITOR_COLORS = [
  '#44ff88',
  '#ff8844',
  '#4488ff',
  '#ff44ff',
  '#ffff44',
  '#ff4444',
  '#44ffff',
  '#88ff44',
  '#ff88ff',
  '#88ffff',
];

export const STORAGE_KEYS = {
  panels: 'worldmonitor-panels',
  monitors: 'worldmonitor-monitors',
  mapLayers: 'worldmonitor-layers',
  disabledFeeds: 'worldmonitor-disabled-feeds',
} as const;
