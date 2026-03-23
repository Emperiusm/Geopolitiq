/**
 * CostAnomalyDetector — detects anomalous cost spikes using z-score analysis.
 *
 * Maintains a rolling window of cost_per_signal observations and computes z-score
 * against the rolling mean and standard deviation. A z-score above the threshold
 * indicates a cost anomaly that may warrant a cost-hold circuit state.
 */

export interface CostObservation {
  sourceId: string;
  costPerSignal: number;
  observedAt: Date;
}

export interface AnomalyResult {
  isAnomaly: boolean;
  zScore: number;
  mean: number;
  stddev: number;
  sampleCount: number;
}

const DEFAULT_WINDOW_SIZE = 50;
const DEFAULT_ZSCORE_THRESHOLD = 3.0;

export class CostAnomalyDetector {
  private windowSize: number;
  private zScoreThreshold: number;
  /** Map of sourceId -> rolling window of cost_per_signal values */
  private windows = new Map<string, number[]>();

  constructor(windowSize = DEFAULT_WINDOW_SIZE, zScoreThreshold = DEFAULT_ZSCORE_THRESHOLD) {
    this.windowSize = windowSize;
    this.zScoreThreshold = zScoreThreshold;
  }

  /**
   * Records a new cost observation and checks if it constitutes an anomaly.
   * Returns an AnomalyResult with statistical details.
   */
  observe(sourceId: string, costPerSignal: number): AnomalyResult {
    let window = this.windows.get(sourceId);
    if (!window) {
      window = [];
      this.windows.set(sourceId, window);
    }

    // Compute z-score against existing window before adding new observation
    const result = this.computeZScore(window, costPerSignal);

    // Add to rolling window, evict oldest if over limit
    window.push(costPerSignal);
    if (window.length > this.windowSize) {
      window.shift();
    }

    return result;
  }

  /**
   * Clears the rolling window for a source (e.g. after a config change).
   */
  reset(sourceId: string): void {
    this.windows.delete(sourceId);
  }

  /**
   * Returns the current window of observations for a source (for debugging).
   */
  getWindow(sourceId: string): number[] {
    return [...(this.windows.get(sourceId) ?? [])];
  }

  private computeZScore(window: number[], newValue: number): AnomalyResult {
    if (window.length < 2) {
      // Not enough data to compute meaningful z-score
      return {
        isAnomaly: false,
        zScore: 0,
        mean: window.length === 1 ? window[0] : 0,
        stddev: 0,
        sampleCount: window.length,
      };
    }

    const mean = window.reduce((sum, v) => sum + v, 0) / window.length;

    const variance = window.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / window.length;
    const stddev = Math.sqrt(variance);

    if (stddev === 0) {
      // All values identical — any different value is potentially anomalous
      const isAnomaly = newValue !== mean;
      return {
        isAnomaly,
        zScore: isAnomaly ? Infinity : 0,
        mean,
        stddev: 0,
        sampleCount: window.length,
      };
    }

    const zScore = Math.abs((newValue - mean) / stddev);
    return {
      isAnomaly: zScore >= this.zScoreThreshold,
      zScore,
      mean,
      stddev,
      sampleCount: window.length,
    };
  }
}
