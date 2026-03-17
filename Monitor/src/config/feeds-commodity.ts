import type { Feed } from '@/types';
import { rssProxyUrl } from '@/utils';

const rss = rssProxyUrl;

export const COMMODITY_FEEDS: Record<string, Feed[]> = {
  'commodity-news': [
    { name: 'Kitco News', url: rss('https://www.kitco.com/rss/KitcoNews.xml') },
    { name: 'Mining.com', url: rss('https://www.mining.com/feed/') },
    { name: 'Bloomberg Commodities', url: rss('https://news.google.com/rss/search?q=site:bloomberg.com+commodities+OR+metals+OR+mining+when:1d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Reuters Commodities', url: rss('https://news.google.com/rss/search?q=site:reuters.com+commodities+OR+metals+OR+mining+when:1d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'S&P Global Commodity', url: rss('https://news.google.com/rss/search?q=site:spglobal.com+commodities+metals+when:3d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Commodity Trade Mantra', url: rss('https://www.commoditytrademantra.com/feed/') },
    { name: 'CNBC Commodities', url: rss('https://news.google.com/rss/search?q=site:cnbc.com+(commodities+OR+metals+OR+gold+OR+copper)+when:1d&hl=en-US&gl=US&ceid=US:en') },
  ],
  'gold-silver': [
    { name: 'Kitco Gold', url: rss('https://www.kitco.com/rss/KitcoGold.xml') },
    { name: 'Gold Price News', url: rss('https://news.google.com/rss/search?q=(gold+price+OR+"gold+market"+OR+bullion+OR+LBMA)+when:1d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Silver Price News', url: rss('https://news.google.com/rss/search?q=(silver+price+OR+"silver+market"+OR+"silver+futures")+when:2d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Precious Metals', url: rss('https://news.google.com/rss/search?q=("precious+metals"+OR+platinum+OR+palladium+OR+"gold+ETF"+OR+GLD+OR+SLV)+when:2d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'World Gold Council', url: rss('https://news.google.com/rss/search?q="World+Gold+Council"+OR+"central+bank+gold"+OR+"gold+reserves"+when:7d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'GoldSeek', url: rss('https://news.goldseek.com/GoldSeek/rss.xml') },
    { name: 'SilverSeek', url: rss('https://news.silverseek.com/SilverSeek/rss.xml') },
  ],
  energy: [
    { name: 'OilPrice.com', url: rss('https://oilprice.com/rss/main') },
    { name: 'Rigzone', url: rss('https://www.rigzone.com/news/rss/rigzone_latest.aspx') },
    { name: 'EIA Reports', url: rss('https://www.eia.gov/rss/press_room.xml') },
    { name: 'OPEC News', url: rss('https://news.google.com/rss/search?q=(OPEC+OR+"oil+price"+OR+"crude+oil"+OR+WTI+OR+Brent+OR+"oil+production")+when:1d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Natural Gas News', url: rss('https://news.google.com/rss/search?q=("natural+gas"+OR+LNG+OR+"gas+price"+OR+"Henry+Hub")+when:1d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Energy Intel', url: rss('https://news.google.com/rss/search?q=(energy+commodities+OR+"energy+market"+OR+"energy+prices")+when:2d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Reuters Energy', url: rss('https://news.google.com/rss/search?q=site:reuters.com+(oil+OR+gas+OR+energy)+when:1d&hl=en-US&gl=US&ceid=US:en') },
  ],
  'mining-news': [
    { name: 'Mining Journal', url: rss('https://www.mining-journal.com/feed/') },
    { name: 'Northern Miner', url: rss('https://www.northernminer.com/feed/') },
    { name: 'Mining Weekly', url: rss('https://www.miningweekly.com/rss/') },
    { name: 'Mining Technology', url: rss('https://www.mining-technology.com/feed/') },
    { name: 'Australian Mining', url: rss('https://www.australianmining.com.au/feed/') },
    { name: 'Mine Web (SNL)', url: rss('https://news.google.com/rss/search?q=("mining+company"+OR+"mine+production"+OR+"mining+operations")+when:2d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Resource World', url: rss('https://news.google.com/rss/search?q=("mining+project"+OR+"mineral+exploration"+OR+"mine+development")+when:3d&hl=en-US&gl=US&ceid=US:en') },
  ],
  'critical-minerals': [
    { name: 'Benchmark Mineral', url: rss('https://news.google.com/rss/search?q=("critical+minerals"+OR+"battery+metals"+OR+lithium+OR+cobalt+OR+"rare+earths")+when:2d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Lithium Market', url: rss('https://news.google.com/rss/search?q=(lithium+price+OR+"lithium+market"+OR+"lithium+supply"+OR+spodumene+OR+LCE)+when:2d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Cobalt Market', url: rss('https://news.google.com/rss/search?q=(cobalt+price+OR+"cobalt+market"+OR+"DRC+cobalt"+OR+"battery+cobalt")+when:3d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Rare Earths News', url: rss('https://news.google.com/rss/search?q=("rare+earth"+OR+"rare+earths"+OR+"REE"+OR+neodymium+OR+praseodymium)+when:3d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'EV Battery Supply', url: rss('https://news.google.com/rss/search?q=("EV+battery"+OR+"battery+supply+chain"+OR+"battery+materials")+when:3d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'IEA Critical Minerals', url: rss('https://news.google.com/rss/search?q=site:iea.org+(minerals+OR+critical+OR+battery)+when:14d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Uranium Market', url: rss('https://news.google.com/rss/search?q=(uranium+price+OR+"uranium+market"+OR+U3O8+OR+nuclear+fuel)+when:3d&hl=en-US&gl=US&ceid=US:en') },
  ],
  'base-metals': [
    { name: 'LME Metals', url: rss('https://news.google.com/rss/search?q=(LME+OR+"London+Metal+Exchange")+copper+OR+aluminum+OR+zinc+OR+nickel+when:2d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Copper Market', url: rss('https://news.google.com/rss/search?q=(copper+price+OR+"copper+market"+OR+"copper+supply"+OR+COMEX+copper)+when:2d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Nickel News', url: rss('https://news.google.com/rss/search?q=(nickel+price+OR+"nickel+market"+OR+"nickel+supply"+OR+Indonesia+nickel)+when:3d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Aluminum & Zinc', url: rss('https://news.google.com/rss/search?q=(aluminum+price+OR+aluminium+OR+zinc+price+OR+"base+metals")+when:3d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Iron Ore Market', url: rss('https://news.google.com/rss/search?q=("iron+ore"+price+OR+"iron+ore+market"+OR+"steel+raw+materials")+when:2d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Metals Bulletin', url: rss('https://news.google.com/rss/search?q=("metals+market"+OR+"base+metals"+OR+SHFE+OR+"Shanghai+Futures")+when:2d&hl=en-US&gl=US&ceid=US:en') },
  ],
  'mining-companies': [
    { name: 'BHP News', url: rss('https://news.google.com/rss/search?q=BHP+(mining+OR+production+OR+results+OR+copper+OR+"iron+ore")+when:7d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Rio Tinto News', url: rss('https://news.google.com/rss/search?q="Rio+Tinto"+(mining+OR+production+OR+results+OR+Pilbara)+when:7d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Glencore & Vale', url: rss('https://news.google.com/rss/search?q=(Glencore+OR+Vale)+(mining+OR+production+OR+cobalt+OR+"iron+ore")+when:7d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Gold Majors', url: rss('https://news.google.com/rss/search?q=(Newmont+OR+Barrick+OR+AngloGold+OR+Agnico)+(gold+mine+OR+production+OR+results)+when:7d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Freeport & Copper Miners', url: rss('https://news.google.com/rss/search?q=(Freeport+McMoRan+OR+Southern+Copper+OR+Teck+OR+Antofagasta)+when:7d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Critical Mineral Companies', url: rss('https://news.google.com/rss/search?q=(Albemarle+OR+SQM+OR+"MP+Materials"+OR+Lynas+OR+Cameco)+when:7d&hl=en-US&gl=US&ceid=US:en') },
  ],
  'supply-chain': [
    { name: 'Shipping & Freight', url: rss('https://news.google.com/rss/search?q=("bulk+carrier"+OR+"dry+bulk"+OR+"commodity+shipping"+OR+"Port+Hedland"+OR+"Strait+of+Hormuz")+when:3d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Trade Routes', url: rss('https://news.google.com/rss/search?q=("trade+route"+OR+"supply+chain"+OR+"commodity+export"+OR+"mineral+export")+when:3d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'China Commodity Imports', url: rss('https://news.google.com/rss/search?q=(China+imports+copper+OR+iron+ore+OR+lithium+OR+cobalt+OR+"rare+earth")+when:3d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Port & Logistics', url: rss('https://news.google.com/rss/search?q=("iron+ore+port"+OR+"copper+port"+OR+"commodity+port"+OR+"mineral+logistics")+when:7d&hl=en-US&gl=US&ceid=US:en') },
  ],
  'commodity-regulation': [
    { name: 'Mining Regulation', url: rss('https://news.google.com/rss/search?q=("mining+regulation"+OR+"mining+policy"+OR+"mining+permit"+OR+"mining+ban")+when:7d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'ESG in Mining', url: rss('https://news.google.com/rss/search?q=("mining+ESG"+OR+"responsible+mining"+OR+"mine+closure"+OR+"tailings")+when:7d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Trade & Tariffs', url: rss('https://news.google.com/rss/search?q=("mineral+tariff"+OR+"metals+tariff"+OR+"critical+mineral+policy"+OR+"mining+export+ban")+when:7d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Indonesia Nickel Policy', url: rss('https://news.google.com/rss/search?q=(Indonesia+nickel+OR+"nickel+export"+OR+"nickel+ban"+OR+"nickel+processing")+when:7d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'China Mineral Policy', url: rss('https://news.google.com/rss/search?q=(China+"rare+earth"+OR+"mineral+export"+OR+"critical+mineral")+policy+OR+restriction+when:7d&hl=en-US&gl=US&ceid=US:en') },
  ],
  markets: [
    { name: 'Yahoo Finance Commodities', url: rss('https://finance.yahoo.com/rss/topstories') },
    { name: 'CNBC Markets', url: rss('https://www.cnbc.com/id/100003114/device/rss/rss.html') },
    { name: 'Seeking Alpha Metals', url: rss('https://news.google.com/rss/search?q=site:seekingalpha.com+(gold+OR+silver+OR+copper+OR+mining)+when:2d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Commodity Futures', url: rss('https://news.google.com/rss/search?q=(COMEX+OR+NYMEX+OR+"commodity+futures"+OR+CME+commodities)+when:2d&hl=en-US&gl=US&ceid=US:en') },
  ],
  finance: [
    { name: 'CNBC', url: rss('https://www.cnbc.com/id/100003114/device/rss/rss.html') },
    { name: 'MarketWatch', url: rss('https://news.google.com/rss/search?q=site:marketwatch.com+markets+when:1d&hl=en-US&gl=US&ceid=US:en') },
    { name: 'Yahoo Finance', url: rss('https://finance.yahoo.com/news/rssindex') },
    { name: 'Financial Times', url: rss('https://www.ft.com/rss/home') },
    { name: 'Reuters Business', url: rss('https://news.google.com/rss/search?q=site:reuters.com+business+markets&hl=en-US&gl=US&ceid=US:en') },
  ],
};
