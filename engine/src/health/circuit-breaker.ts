/**
 * CircuitBreaker — per-source state machine with failure classification and exponential backoff.
 *
 * States:
 *   closed    — healthy, requests pass through
 *   open      — tripped, requests blocked
 *   half-open — probing after backoff expires, one request let through
 *   cost-hold — cost anomaly detected, requests paused
 */

export type CircuitState = 'closed' | 'open' | 'half-open' | 'cost-hold';
export type FailureClass = 'transient' | 'permanent' | 'partial';

const FAILURE_THRESHOLD = 5;
const INITIAL_BACKOFF_MS = 900_000; // 15 minutes
const MAX_BACKOFF_MS = 86_400_000; // 24 hours

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private consecutiveFailures = 0;
  // Start at half so first doubling yields INITIAL_BACKOFF_MS (15 min)
  private backoffMs: number = INITIAL_BACKOFF_MS / 2;
  private tripTime: number | null = null;

  getState(): CircuitState {
    return this.state;
  }

  getBackoffMs(): number {
    return this.backoffMs;
  }

  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  /**
   * Records a failure. Trips the circuit immediately on permanent failures,
   * increments counter and trips at threshold for transient. Ignores partial.
   */
  recordFailure(failureClass: FailureClass): void {
    if (failureClass === 'partial') {
      return;
    }

    if (failureClass === 'permanent') {
      this.trip();
      return;
    }

    // transient
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= FAILURE_THRESHOLD) {
      this.trip();
    }
  }

  /**
   * Records a success. Resets counter, closes circuit from half-open, resets backoff.
   */
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
      this.backoffMs = INITIAL_BACKOFF_MS / 2;
      this.tripTime = null;
    }
  }

  /**
   * Trips the circuit to open state.
   */
  trip(): void {
    this.setState('open');
  }

  /**
   * Returns true if the circuit is open and the backoff timer has expired,
   * meaning the circuit should transition to half-open for probing.
   */
  shouldProbe(): boolean {
    if (this.state !== 'open') {
      return false;
    }
    if (this.tripTime === null) {
      return false;
    }
    return Date.now() >= this.tripTime + this.backoffMs;
  }

  /**
   * Sets the circuit state. When transitioning to open, doubles the backoff (up to max).
   */
  setState(newState: CircuitState): void {
    if (newState === 'open') {
      // Double the backoff on each trip
      this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
      this.tripTime = Date.now();
    }
    this.state = newState;
  }

  /**
   * Classifies an HTTP status code into a failure class.
   * 429, 502, 503, 504 → transient
   * 401, 403, 404     → permanent
   * everything else   → transient (default)
   */
  classifyHttpError(status: number): FailureClass {
    if (status === 429 || status === 502 || status === 503 || status === 504) {
      return 'transient';
    }
    if (status === 401 || status === 403 || status === 404) {
      return 'permanent';
    }
    return 'transient';
  }
}
