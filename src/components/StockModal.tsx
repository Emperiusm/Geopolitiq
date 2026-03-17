import { useState, useCallback, useEffect } from 'preact/hooks';

interface MarketIndex {
  name: string;
  value: string;
  change: string;
  positive: boolean;
}

interface MarketData {
  country: string;
  flag: string;
  open: boolean;
  indices: MarketIndex[];
}

interface StockModalProps {
  market: MarketData;
  onClose: () => void;
}

const TIME_RANGES = ['1D', '1W', '1M', '3M', '1Y'];

function MiniChart({ positive }: { positive: boolean }) {
  const color = positive ? '#22c55e' : '#ef4444';
  // Simple SVG line chart placeholder
  const points = positive
    ? 'M10,70 L40,60 L70,65 L100,45 L130,50 L160,35 L190,20 L220,25 L250,15'
    : 'M10,20 L40,25 L70,30 L100,45 L130,40 L160,55 L190,60 L220,65 L250,70';

  return (
    <svg class="mini-chart" viewBox="0 0 260 80" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color={color} stop-opacity="0.3" />
          <stop offset="100%" stop-color={color} stop-opacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${points} L250,80 L10,80 Z`}
        fill={`url(#grad-${positive})`}
      />
      <path
        d={points}
        fill="none"
        stroke={color}
        stroke-width="2"
      />
    </svg>
  );
}

export function StockModal({ market, onClose }: StockModalProps) {
  const [timeRange, setTimeRange] = useState('1D');
  const [ticker, setTicker] = useState('');

  const handleBackdrop = useCallback(
    (e: MouseEvent) => {
      if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const primaryIndex = market.indices[0];
  const isPositive = primaryIndex?.positive ?? true;

  return (
    <div class="modal-overlay" onClick={handleBackdrop}>
      <div class="modal-card stock-modal">
        <div class="modal-header">
          <div class="stock-modal-title">
            <span class="stock-flag">{market.flag}</span>
            <h2>{market.country} Markets</h2>
            <span class={`market-status ${market.open ? 'market-open' : 'market-closed'}`}>
              {market.open ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <button class="modal-close" onClick={onClose}>&times;</button>
        </div>

        <div class="chart-container">
          <MiniChart positive={isPositive} />
        </div>

        <div class="time-range-bar">
          {TIME_RANGES.map(t => (
            <button
              key={t}
              class={`time-btn ${timeRange === t ? 'time-active' : ''}`}
              onClick={() => setTimeRange(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <section class="modal-section">
          <h3 class="modal-section-title">MARKET OVERVIEW</h3>
          <table class="market-table">
            <thead>
              <tr>
                <th>Index</th>
                <th>Value</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {market.indices.map(idx => (
                <tr key={idx.name}>
                  <td>{idx.name}</td>
                  <td class="table-value">{idx.value}</td>
                  <td class={idx.positive ? 'positive' : 'negative'}>{idx.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <div class="ticker-search">
          <input
            type="text"
            class="ticker-input"
            placeholder="Search ticker (e.g. AAPL)..."
            value={ticker}
            onInput={(e) => setTicker((e.target as HTMLInputElement).value)}
          />
          <button class="ticker-go">GO</button>
        </div>

        <section class="modal-section">
          <h3 class="modal-section-title">WHY IT MATTERS</h3>
          <p class="modal-text">
            {market.country} markets reflect broader geopolitical sentiment. Current movements
            indicate {isPositive ? 'cautious optimism despite' : 'growing concern over'} ongoing
            global tensions. Institutional investors are {isPositive ? 'maintaining positions' : 'rotating to safe havens'}.
          </p>
        </section>

        <section class="modal-section">
          <h3 class="modal-section-title">OUTLOOK</h3>
          <p class="modal-text">
            Key catalysts ahead: central bank decisions, trade negotiation outcomes, and
            geopolitical developments in Eastern Europe and the Middle East. Volatility expected
            to remain above historical averages through Q2 2026.
          </p>
        </section>
      </div>
    </div>
  );
}
