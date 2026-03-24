/**
 * DegradationRegistry — tracks service health across 7 optional services,
 * exposes circuit breakers, and supports manual overrides.
 */

import { CircuitBreaker } from '../health/circuit-breaker';
import type { CircuitState } from '../health/circuit-breaker';

export type ServiceName =
  | 'clickhouse'
  | 'neo4j'
  | 'typesense'
  | 'nats'
  | 'redis'
  | 'temporal'
  | 'minio';

export type ServiceStatus = 'healthy' | 'degraded' | 'down';

const SERVICES: ServiceName[] = [
  'clickhouse',
  'neo4j',
  'typesense',
  'nats',
  'redis',
  'temporal',
  'minio',
];

function circuitStateToStatus(state: CircuitState): ServiceStatus {
  switch (state) {
    case 'closed':
      return 'healthy';
    case 'half-open':
      return 'degraded';
    case 'open':
    case 'cost-hold':
      return 'down';
  }
}

export class DegradationRegistry {
  private breakers: Map<ServiceName, CircuitBreaker> = new Map();
  private overrides: Map<ServiceName, ServiceStatus> = new Map();

  constructor() {
    for (const service of SERVICES) {
      this.breakers.set(service, new CircuitBreaker());
    }
  }

  /** Return the effective status for a service. Override takes precedence. */
  getStatus(service: ServiceName): ServiceStatus {
    const override = this.overrides.get(service);
    if (override !== undefined) {
      return override;
    }
    const breaker = this.breakers.get(service)!;
    return circuitStateToStatus(breaker.getState());
  }

  /** True when the service status is 'healthy'. */
  isHealthy(service: ServiceName): boolean {
    return this.getStatus(service) === 'healthy';
  }

  /** True when any service is not 'healthy'. */
  isDegraded(): boolean {
    return SERVICES.some((s) => !this.isHealthy(s));
  }

  /** Returns the list of service names that are not 'healthy'. */
  getDegradedServices(): ServiceName[] {
    return SERVICES.filter((s) => !this.isHealthy(s));
  }

  /** Expose the CircuitBreaker for a service so callers can record failures. */
  getBreaker(service: ServiceName): CircuitBreaker {
    return this.breakers.get(service)!;
  }

  /** Set a manual override for a service's status. */
  setOverride(service: ServiceName, status: ServiceStatus): void {
    this.overrides.set(service, status);
  }

  /** Remove a manual override for a service. */
  clearOverride(service: ServiceName): void {
    this.overrides.delete(service);
  }

  /** Snapshot of all service statuses (used by /health/deps). */
  getAllStatuses(): Record<ServiceName, ServiceStatus> {
    const result = {} as Record<ServiceName, ServiceStatus>;
    for (const s of SERVICES) {
      result[s] = this.getStatus(s);
    }
    return result;
  }
}
