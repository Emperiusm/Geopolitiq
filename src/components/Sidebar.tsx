import { useMemo } from 'preact/hooks';
import {
  countries,
  getCriticalCountries,
  getCountryStats,
  getRiskLevel,
  getRiskColor,
} from '../data/countries';
import type { Country, RiskLevel } from '../data/countries';

interface SidebarProps {
  selectedCountry: Country | null;
  onCountrySelect: (country: Country) => void;
}

const RISK_LEVELS: { level: RiskLevel; label: string }[] = [
  { level: 'CATASTROPHIC', label: 'Catastrophic' },
  { level: 'EXTREME', label: 'Extreme' },
  { level: 'SEVERE', label: 'Severe' },
  { level: 'STORMY', label: 'Stormy' },
  { level: 'CLOUDY', label: 'Cloudy' },
  { level: 'CLEAR', label: 'Clear' },
];

function formatDate(): string {
  const d = new Date();
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function Sidebar({ selectedCountry, onCountrySelect }: SidebarProps) {
  const criticalCountries = useMemo(() => getCriticalCountries(), []);
  const stats = useMemo(() => getCountryStats(), []);

  return (
    <aside class="sidebar">
      <div class="sidebar-header">
        <h1 class="logo">GEOPOLITIQ</h1>
        <p class="subtitle">GLOBAL INTELLIGENCE NETWORK</p>
        <div class="live-bar">
          <span class="live-dot" />
          <span class="live-text">LIVE</span>
          <span class="date-text">{formatDate()}</span>
        </div>
      </div>

      <div class="watchlist">
        <h2 class="section-title">CRITICAL WATCHLIST</h2>
        <div class="watchlist-scroll">
          {criticalCountries.map(country => {
            const level = getRiskLevel(country.cii);
            const color = getRiskColor(level);
            const isSelected = selectedCountry?.code === country.code;
            return (
              <button
                key={country.code}
                class={`watchlist-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onCountrySelect(country)}
              >
                <span class="watchlist-flag">{country.flag}</span>
                <span class="watchlist-name">{country.name}</span>
                <span
                  class="risk-badge"
                  style={{ backgroundColor: color, color: level === 'SEVERE' ? '#000' : '#fff' }}
                >
                  {level}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div class="legend">
        <h3 class="legend-title">RISK LEVELS</h3>
        <div class="legend-grid">
          {RISK_LEVELS.map(({ level, label }) => (
            <div key={level} class="legend-item">
              <span class="legend-dot" style={{ backgroundColor: getRiskColor(level) }} />
              <span class="legend-label">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div class="stats-bar">
        <div class="stat">
          <span class="stat-value stat-critical">{stats.critical}</span>
          <span class="stat-label">Critical</span>
        </div>
        <div class="stat">
          <span class="stat-value stat-high">{stats.highRisk}</span>
          <span class="stat-label">High Risk</span>
        </div>
        <div class="stat">
          <span class="stat-value stat-stable">{stats.stable}</span>
          <span class="stat-label">Stable</span>
        </div>
        <div class="stat">
          <span class="stat-value">{stats.total}</span>
          <span class="stat-label">Total</span>
        </div>
      </div>
    </aside>
  );
}
