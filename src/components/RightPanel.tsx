import { useState, useCallback } from 'preact/hooks';
import { EventModal } from './EventModal';
import { StockModal } from './StockModal';
import type { Country } from '../data/countries';

type TabId = 'events' | 'brief' | 'elections' | 'forecast' | 'horizon' | 'stocks' | 'travel';

interface RightPanelProps {
  selectedCountry: Country | null;
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'events', label: 'Events' },
  { id: 'brief', label: 'Brief' },
  { id: 'elections', label: 'Elections' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'horizon', label: 'Horizon' },
  { id: 'stocks', label: 'Stocks' },
  { id: 'travel', label: 'Travel' },
];

const TOP_STORIES = [
  { id: 1, badge: 'BREAKING', category: 'CONFLICT', headline: 'Major Escalation in Eastern Mediterranean', stat: '3 carrier groups deployed', update: 'NATO emergency session called for 0800 UTC. Article 5 consultations underway.', time: '12m ago' },
  { id: 2, badge: 'BREAKING', category: 'SECURITY', headline: 'Cyber Attack Disrupts European Power Grid', stat: '4 nations affected', update: 'Rolling blackouts reported across Baltic states. APT group attribution pending.', time: '28m ago' },
  { id: 3, badge: 'ALERT', category: 'WORLD', headline: 'UN Security Council Emergency Session on Sudan', stat: '2.1M displaced', update: 'Resolution draft circulating among P5 members. China signals possible abstention.', time: '1h ago' },
  { id: 4, badge: 'ALERT', category: 'DIPLOMACY', headline: 'Iran Nuclear Talks Collapse in Vienna', stat: 'JCPOA dead', update: 'EU mediator withdraws. IAEA reports 84% enrichment detected at Fordow.', time: '2h ago' },
];

const LATEST_UPDATES = [
  { id: 5, category: 'CONFLICT', sources: 'Reuters, AFP', time: '3h ago', headline: 'Drone Strikes Hit Fuel Depot in Kharkiv Oblast', summary: 'Ukrainian air defenses intercepted 12 of 18 drones. Critical infrastructure damage confirmed.' },
  { id: 6, category: 'WORLD', sources: 'AP, BBC', time: '4h ago', headline: 'Earthquake M6.2 Strikes Southern Turkey', summary: 'USGS reports shallow depth. No tsunami warning issued. Rescue teams mobilizing.' },
  { id: 7, category: 'SECURITY', sources: 'Bellingcat, OSINT', time: '5h ago', headline: 'Satellite Imagery Reveals New Missile Silos in Western China', summary: 'Commercial satellite analysis identifies 40+ new ICBM silos under construction.' },
];

const ELECTIONS_RECENT = [
  { country: 'France', flag: '\u{1F1EB}\u{1F1F7}', date: 'Mar 2026', type: 'Presidential', winner: 'Marine Le Pen (RN)' },
  { country: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}', date: 'Feb 2026', type: 'Municipal', winner: 'Coalition shift right' },
];

const ELECTIONS_UPCOMING = [
  { country: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', date: 'Sep 2026', type: 'Federal', desc: 'CDU leads polls at 31%' },
  { country: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', date: 'Jul 2026', type: 'Upper House', desc: 'LDP majority uncertain' },
  { country: 'Colombia', flag: '\u{1F1E8}\u{1F1F4}', date: 'Oct 2026', type: 'Regional', desc: 'Security top concern' },
];

const FORECASTS = [
  { region: 'Middle East', severity: 'CATASTROPHIC', analysis: 'Multi-front conflict escalation likely within 90 days. Iran proxy network activation signals imminent.', trends: ['\u2191 Total War', '\u2193 Diplomacy', '\u2191 Oil Disruption'] },
  { region: 'Eastern Europe', severity: 'EXTREME', analysis: 'Frozen conflict status unlikely to hold through Q2. NATO eastern flank reinforcement accelerating.', trends: ['\u2191 Escalation', '\u2191 Arms Race', '\u2193 Ceasefire'] },
  { region: 'Indo-Pacific', severity: 'SEVERE', analysis: 'Taiwan Strait tensions elevated. PLA exercises frequency doubled YoY. Diplomatic channels narrowing.', trends: ['\u2191 Military Posturing', '\u2193 Trade', '\u2191 Alliances'] },
  { region: 'Sub-Saharan Africa', severity: 'EXTREME', analysis: 'Coup contagion spreading. Wagner/Africa Corps expansion into 3 additional countries projected.', trends: ['\u2191 Instability', '\u2193 Democracy', '\u2191 Displacement'] },
];

const HORIZON_EVENTS = [
  { month: 'March 2026', items: [
    { cat: 'Summit', title: 'G20 Foreign Ministers Meeting - Cape Town', date: 'Mar 21-22' },
    { cat: 'Military', title: 'NATO Steadfast Defender Exercise Concludes', date: 'Mar 25' },
  ]},
  { month: 'April 2026', items: [
    { cat: 'Election', title: 'South Korea Presidential Election', date: 'Apr 9' },
    { cat: 'Economic', title: 'IMF/World Bank Spring Meetings', date: 'Apr 14-20' },
    { cat: 'Treaty', title: 'NPT Review Conference', date: 'Apr 28' },
  ]},
  { month: 'May 2026', items: [
    { cat: 'Sanctions', title: 'EU Russia Sanctions Package Review', date: 'May 5' },
    { cat: 'Summit', title: 'ASEAN Leaders Summit - Jakarta', date: 'May 12-14' },
  ]},
];

const STOCK_MARKETS = [
  { country: 'United States', flag: '\u{1F1FA}\u{1F1F8}', open: true, indices: [
    { name: 'S&P 500', value: '5,892.41', change: '+0.73%', positive: true },
    { name: 'NASDAQ', value: '18,847.28', change: '+1.12%', positive: true },
    { name: 'DOW', value: '43,218.50', change: '+0.34%', positive: true },
  ]},
  { country: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}', open: false, indices: [
    { name: 'FTSE 100', value: '8,341.20', change: '-0.28%', positive: false },
  ]},
  { country: 'Japan', flag: '\u{1F1EF}\u{1F1F5}', open: false, indices: [
    { name: 'Nikkei 225', value: '39,812.44', change: '+0.91%', positive: true },
  ]},
  { country: 'China', flag: '\u{1F1E8}\u{1F1F3}', open: false, indices: [
    { name: 'Shanghai', value: '3,284.16', change: '-0.45%', positive: false },
    { name: 'Hang Seng', value: '21,442.80', change: '+0.62%', positive: true },
  ]},
  { country: 'Germany', flag: '\u{1F1E9}\u{1F1EA}', open: false, indices: [
    { name: 'DAX', value: '18,921.33', change: '+0.15%', positive: true },
  ]},
];

const DANGER_ZONES = [
  { location: 'Eastern Ukraine', desc: 'Active combat zone. Artillery and drone strikes daily.', level: 5 },
  { location: 'Gaza Strip', desc: 'Military operations ongoing. No safe corridors.', level: 5 },
  { location: 'Khartoum, Sudan', desc: 'Urban warfare between SAF and RSF.', level: 5 },
  { location: 'Mogadishu, Somalia', desc: 'Al-Shabaab active. IED and VBIED risk.', level: 4 },
  { location: 'Port-au-Prince, Haiti', desc: 'Gang control of 80% of capital.', level: 4 },
  { location: 'Kabul, Afghanistan', desc: 'ISIS-K attacks. No consular services.', level: 4 },
  { location: 'Tripoli, Libya', desc: 'Militia clashes. Kidnapping risk.', level: 3 },
  { location: 'Caracas, Venezuela', desc: 'Political unrest. Arbitrary detention risk.', level: 3 },
];

const CAT_COLORS: Record<string, string> = {
  Summit: '#3b82f6', Election: '#a855f7', Treaty: '#22c55e',
  Military: '#ef4444', Economic: '#eab308', Sanctions: '#f97316',
};

function getBadgeClass(badge: string): string {
  const map: Record<string, string> = {
    BREAKING: 'badge-breaking', ALERT: 'badge-alert',
    CONFLICT: 'badge-conflict', WORLD: 'badge-world',
    SECURITY: 'badge-security', DIPLOMACY: 'badge-diplomacy',
  };
  return map[badge] || 'badge-default';
}

function getSeverityColor(s: string): string {
  if (s === 'CATASTROPHIC') return '#ef4444';
  if (s === 'EXTREME') return '#f97316';
  return '#eab308';
}

function getLevelColor(l: number): string {
  if (l >= 5) return '#ef4444';
  if (l >= 4) return '#f97316';
  if (l >= 3) return '#eab308';
  return '#3b82f6';
}

export function RightPanel({ selectedCountry }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('events');
  const [fontSize, setFontSize] = useState(13);
  const [selectedEvent, setSelectedEvent] = useState<typeof TOP_STORIES[0] | null>(null);
  const [selectedMarket, setSelectedMarket] = useState<typeof STOCK_MARKETS[0] | null>(null);

  const renderEvents = () => (
    <div class="tab-content">
      <h3 class="section-title">TOP STORIES</h3>
      {TOP_STORIES.map(story => (
        <div key={story.id} class="event-card" onClick={() => setSelectedEvent(story)}>
          <div class="event-badges">
            <span class={`badge ${getBadgeClass(story.badge)}`}>{story.badge}</span>
            <span class={`badge ${getBadgeClass(story.category)}`}>{story.category}</span>
            <span class="event-time">{story.time}</span>
          </div>
          <h4 class="event-headline">{story.headline}</h4>
          <span class="event-stat">{story.stat}</span>
          <p class="event-update">{story.update}</p>
        </div>
      ))}
      <h3 class="section-title" style={{ marginTop: 16 }}>LATEST UPDATES</h3>
      {LATEST_UPDATES.map(item => (
        <div key={item.id} class="update-card" onClick={() => setSelectedEvent({ ...item, badge: 'ALERT', stat: '', update: item.summary })}>
          <div class="update-meta">
            <span class={`badge ${getBadgeClass(item.category)}`}>{item.category}</span>
            <span class="update-sources">{item.sources}</span>
            <span class="update-time">{item.time}</span>
          </div>
          <h4 class="update-headline">{item.headline}</h4>
          <p class="update-summary">{item.summary}</p>
        </div>
      ))}
      <button class="load-more-btn">LOAD MORE</button>
    </div>
  );

  const renderBrief = () => {
    const regions = [
      { name: 'Middle East', count: 4, summary: 'Multi-axis escalation continues. Iranian proxy network activated across Lebanon, Yemen, Iraq, and Syria. Israeli operations expanding. US carrier groups repositioning.' },
      { name: 'Asia-Pacific', count: 3, summary: 'PLA exercises near Taiwan intensify. North Korea missile tests resume after 60-day pause. Philippines-China maritime incidents at Second Thomas Shoal.' },
      { name: 'Americas', count: 2, summary: 'Venezuela border tensions with Guyana. Haiti transitional government collapse imminent. US southern border crisis deepening.' },
      { name: 'Europe', count: 3, summary: 'Ukraine front lines fluid. NATO eastern flank buildup accelerating. Energy security concerns as Russian gas transit via Ukraine expires.' },
      { name: 'Africa', count: 3, summary: 'Sudan humanitarian catastrophe worsening. Sahel coup belt expanding. Horn of Africa drought entering critical phase.' },
    ];
    return (
      <div class="tab-content">
        <div class="brief-header">
          <h3 class="section-title">DAILY INTELLIGENCE BRIEFING</h3>
          <span class="live-badge">LIVE</span>
        </div>
        {regions.map(r => (
          <div key={r.name} class="brief-region">
            <div class="brief-region-header">
              <h4>{r.name}</h4>
              <span class="brief-count">{r.count} critical</span>
            </div>
            <p class="brief-summary">{r.summary}</p>
          </div>
        ))}
        <div class="brief-region">
          <h4 class="section-title">GLOBAL RAMIFICATIONS</h4>
          <p class="brief-summary">Simultaneous multi-theater instability creates cascading risk. Supply chain disruptions via Red Sea, energy price volatility, and refugee flows straining European consensus. Nuclear proliferation concerns elevated.</p>
        </div>
      </div>
    );
  };

  const renderElections = () => (
    <div class="tab-content">
      <h3 class="section-title">RECENT RESULTS</h3>
      {ELECTIONS_RECENT.map(e => (
        <div key={e.country} class="election-card">
          <span class="election-flag">{e.flag}</span>
          <div class="election-info">
            <h4>{e.country}</h4>
            <span class="election-meta">{e.date} - {e.type}</span>
            <span class="election-winner">{e.winner}</span>
          </div>
        </div>
      ))}
      <h3 class="section-title" style={{ marginTop: 16 }}>UPCOMING ELECTIONS</h3>
      {ELECTIONS_UPCOMING.map(e => (
        <div key={e.country} class="election-card">
          <span class="election-flag">{e.flag}</span>
          <div class="election-info">
            <h4>{e.country}</h4>
            <span class="election-meta">{e.date} - {e.type}</span>
            <span class="election-desc">{e.desc}</span>
          </div>
        </div>
      ))}
    </div>
  );

  const renderForecast = () => (
    <div class="tab-content">
      <h3 class="section-title">REGIONAL FORECASTS</h3>
      {FORECASTS.map(f => (
        <div key={f.region} class="forecast-card">
          <div class="forecast-header">
            <h4>{f.region}</h4>
            <span class="severity-badge" style={{ backgroundColor: getSeverityColor(f.severity) }}>{f.severity}</span>
          </div>
          <p class="forecast-analysis">{f.analysis}</p>
          <div class="forecast-trends">
            {f.trends.map(t => (
              <span key={t} class={`trend-tag ${t.startsWith('\u2191') ? 'trend-up' : 'trend-down'}`}>{t}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderHorizon = () => (
    <div class="tab-content">
      <div class="horizon-header">
        <h3 class="section-title">LOOKING AHEAD</h3>
        <span class="horizon-count">7 events</span>
      </div>
      <div class="horizon-filters">
        {Object.entries(CAT_COLORS).map(([cat, color]) => (
          <span key={cat} class="horizon-filter" style={{ borderColor: color, color }}>{cat}</span>
        ))}
      </div>
      {HORIZON_EVENTS.map(group => (
        <div key={group.month} class="horizon-month">
          <h4 class="horizon-month-title">{group.month}</h4>
          {group.items.map(item => (
            <div key={item.title} class="horizon-item">
              <span class="horizon-cat-dot" style={{ backgroundColor: CAT_COLORS[item.cat] }} />
              <div class="horizon-item-info">
                <span class="horizon-item-date">{item.date}</span>
                <span class="horizon-item-title">{item.title}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderStocks = () => (
    <div class="tab-content">
      <div class="stocks-header">
        <h3 class="section-title">GLOBAL MARKETS</h3>
        <span class="stocks-time">Updated 5m ago</span>
      </div>
      {STOCK_MARKETS.map(market => (
        <div key={market.country} class="market-section" onClick={() => setSelectedMarket(market)}>
          <div class="market-header">
            <span>{market.flag} {market.country}</span>
            <span class={`market-status ${market.open ? 'market-open' : 'market-closed'}`}>
              {market.open ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          {market.indices.map(idx => (
            <div key={idx.name} class="index-row">
              <span class="index-name">{idx.name}</span>
              <span class="index-value">{idx.value}</span>
              <span class={`index-change ${idx.positive ? 'positive' : 'negative'}`}>{idx.change}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  const renderTravel = () => (
    <div class="tab-content">
      <h3 class="section-title">TRAVEL ADVISORY</h3>
      <div class="travel-search">
        <input type="text" class="travel-input" placeholder="Search location..." />
      </div>
      <h4 class="danger-title">DANGER ZONES</h4>
      {DANGER_ZONES.map(zone => (
        <div key={zone.location} class="danger-card">
          <div class="danger-header">
            <span class="danger-location">{zone.location}</span>
            <span class="danger-level" style={{ backgroundColor: getLevelColor(zone.level) }}>
              LVL {zone.level}
            </span>
          </div>
          <p class="danger-desc">{zone.desc}</p>
        </div>
      ))}
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'events': return renderEvents();
      case 'brief': return renderBrief();
      case 'elections': return renderElections();
      case 'forecast': return renderForecast();
      case 'horizon': return renderHorizon();
      case 'stocks': return renderStocks();
      case 'travel': return renderTravel();
    }
  };

  return (
    <aside class="right-panel" style={{ fontSize: `${fontSize}px` }}>
      <div class="panel-controls">
        <button class="font-btn" onClick={() => setFontSize(f => Math.max(10, f - 1))}>A-</button>
        <button class="font-btn" onClick={() => setFontSize(f => Math.min(18, f + 1))}>A+</button>
      </div>
      <nav class="tab-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            class={`tab-btn ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div class="panel-scroll">
        {renderTab()}
      </div>
      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
      {selectedMarket && (
        <StockModal market={selectedMarket} onClose={() => setSelectedMarket(null)} />
      )}
    </aside>
  );
}
