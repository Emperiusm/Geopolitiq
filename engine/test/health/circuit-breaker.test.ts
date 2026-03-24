import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker } from '../../src/health/circuit-breaker';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker();
  });

  it('starts in closed state', () => {
    expect(cb.getState()).toBe('closed');
  });

  it('opens after 5 consecutive transient failures', () => {
    for (let i = 0; i < 4; i++) {
      cb.recordFailure('transient');
      expect(cb.getState()).toBe('closed');
    }
    cb.recordFailure('transient');
    expect(cb.getState()).toBe('open');
  });

  it('opens immediately on permanent failure', () => {
    cb.recordFailure('permanent');
    expect(cb.getState()).toBe('open');
  });

  it('ignores partial failures', () => {
    cb.recordFailure('partial');
    cb.recordFailure('partial');
    cb.recordFailure('partial');
    expect(cb.getState()).toBe('closed');
    expect(cb.getConsecutiveFailures()).toBe(0);
  });

  it('resets to closed on success from half-open', () => {
    // Trip the circuit
    cb.recordFailure('permanent');
    expect(cb.getState()).toBe('open');

    // Manually move to half-open (simulating probe)
    cb.setState('half-open');
    expect(cb.getState()).toBe('half-open');

    // Success from half-open → closed
    cb.recordSuccess();
    expect(cb.getState()).toBe('closed');
  });

  it('resets consecutive failure count on success', () => {
    cb.recordFailure('transient');
    cb.recordFailure('transient');
    expect(cb.getConsecutiveFailures()).toBe(2);

    cb.recordSuccess();
    expect(cb.getConsecutiveFailures()).toBe(0);
  });

  it('classifies HTTP errors correctly', () => {
    // Transient
    expect(cb.classifyHttpError(429)).toBe('transient');
    expect(cb.classifyHttpError(502)).toBe('transient');
    expect(cb.classifyHttpError(503)).toBe('transient');
    expect(cb.classifyHttpError(504)).toBe('transient');

    // Permanent
    expect(cb.classifyHttpError(401)).toBe('permanent');
    expect(cb.classifyHttpError(403)).toBe('permanent');
    expect(cb.classifyHttpError(404)).toBe('permanent');

    // Default to transient for unlisted codes
    expect(cb.classifyHttpError(500)).toBe('transient');
    expect(cb.classifyHttpError(418)).toBe('transient');
  });

  it('doubles backoff on re-trip', () => {
    // First trip: backoff should be 15 minutes
    cb.trip();
    expect(cb.getBackoffMs()).toBe(900_000);

    // Second trip: backoff should be 30 minutes
    cb.trip();
    expect(cb.getBackoffMs()).toBe(1_800_000);

    // Third trip: backoff should be 60 minutes
    cb.trip();
    expect(cb.getBackoffMs()).toBe(3_600_000);
  });

  it('caps backoff at 24 hours', () => {
    // Trip many times to hit the cap
    for (let i = 0; i < 20; i++) {
      cb.trip();
    }
    expect(cb.getBackoffMs()).toBeLessThanOrEqual(86_400_000);
    expect(cb.getBackoffMs()).toBe(86_400_000);
  });

  it('shouldProbe returns false when closed', () => {
    expect(cb.shouldProbe()).toBe(false);
  });

  it('shouldProbe returns false immediately after trip', () => {
    cb.trip();
    expect(cb.shouldProbe()).toBe(false);
  });

  it('shouldProbe returns true after backoff expires', () => {
    // Use fake timers to control time
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);

    cb.trip();
    expect(cb.shouldProbe()).toBe(false);

    // Advance time past the backoff
    vi.spyOn(Date, 'now').mockReturnValue(now + 900_001);
    expect(cb.shouldProbe()).toBe(true);
  });

  it('resets backoff to 15 minutes after half-open success', () => {
    cb.trip(); // 15 min
    cb.trip(); // 30 min
    expect(cb.getBackoffMs()).toBe(1_800_000);

    cb.setState('half-open');
    cb.recordSuccess();
    expect(cb.getState()).toBe('closed');

    // After reset, next trip should yield 15 min again
    cb.trip();
    expect(cb.getBackoffMs()).toBe(900_000);
  });
});
