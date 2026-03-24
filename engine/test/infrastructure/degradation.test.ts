import { describe, it, expect, beforeEach } from 'vitest';
import { DegradationRegistry } from '../../src/infrastructure/degradation';
import type { ServiceName } from '../../src/infrastructure/degradation';

describe('DegradationRegistry', () => {
  let registry: DegradationRegistry;

  beforeEach(() => {
    registry = new DegradationRegistry();
  });

  // ── Default state ───────────────────────────────────────────────

  it('reports all services as healthy by default', () => {
    const services: ServiceName[] = [
      'clickhouse', 'neo4j', 'typesense', 'nats', 'redis', 'temporal', 'minio',
    ];
    for (const s of services) {
      expect(registry.getStatus(s)).toBe('healthy');
      expect(registry.isHealthy(s)).toBe(true);
    }
  });

  it('isDegraded() returns false when all services are healthy', () => {
    expect(registry.isDegraded()).toBe(false);
  });

  it('getDegradedServices() returns empty array when all healthy', () => {
    expect(registry.getDegradedServices()).toEqual([]);
  });

  // ── Circuit breaker integration ─────────────────────────────────

  it('getBreaker() returns a CircuitBreaker in closed state', () => {
    const breaker = registry.getBreaker('redis');
    expect(breaker.getState()).toBe('closed');
  });

  it('reflects circuit breaker open state as "down"', () => {
    registry.getBreaker('nats').trip();
    expect(registry.getStatus('nats')).toBe('down');
    expect(registry.isHealthy('nats')).toBe(false);
  });

  it('reflects circuit breaker half-open state as "degraded"', () => {
    const breaker = registry.getBreaker('typesense');
    breaker.trip();
    breaker.setState('half-open');
    expect(registry.getStatus('typesense')).toBe('degraded');
  });

  it('isDegraded() returns true when any circuit is open', () => {
    registry.getBreaker('clickhouse').trip();
    expect(registry.isDegraded()).toBe(true);
  });

  it('getDegradedServices() lists tripped services', () => {
    registry.getBreaker('minio').trip();
    registry.getBreaker('temporal').trip();
    const degraded = registry.getDegradedServices();
    expect(degraded).toContain('minio');
    expect(degraded).toContain('temporal');
    expect(degraded).not.toContain('redis');
  });

  // ── Manual overrides ────────────────────────────────────────────

  it('setOverride() takes precedence over circuit breaker', () => {
    // Circuit is closed (healthy) but we manually mark as down
    registry.setOverride('redis', 'down');
    expect(registry.getStatus('redis')).toBe('down');
    expect(registry.isHealthy('redis')).toBe(false);
  });

  it('setOverride() degraded status is reported correctly', () => {
    registry.setOverride('neo4j', 'degraded');
    expect(registry.getStatus('neo4j')).toBe('degraded');
    expect(registry.isDegraded()).toBe(true);
    expect(registry.getDegradedServices()).toContain('neo4j');
  });

  it('clearOverride() restores circuit breaker state', () => {
    registry.setOverride('redis', 'down');
    expect(registry.getStatus('redis')).toBe('down');

    registry.clearOverride('redis');
    // Circuit is still closed, so status should return to healthy
    expect(registry.getStatus('redis')).toBe('healthy');
  });

  it('override healthy masks a tripped circuit breaker', () => {
    registry.getBreaker('clickhouse').trip();
    expect(registry.getStatus('clickhouse')).toBe('down');

    registry.setOverride('clickhouse', 'healthy');
    expect(registry.getStatus('clickhouse')).toBe('healthy');
  });

  it('clearOverride() after masking re-exposes tripped circuit', () => {
    registry.getBreaker('clickhouse').trip();
    registry.setOverride('clickhouse', 'healthy');
    registry.clearOverride('clickhouse');
    expect(registry.getStatus('clickhouse')).toBe('down');
  });

  // ── getAllStatuses ───────────────────────────────────────────────

  it('getAllStatuses() returns a map for all 7 services', () => {
    const statuses = registry.getAllStatuses();
    const keys = Object.keys(statuses);
    expect(keys).toHaveLength(7);
    expect(keys).toContain('clickhouse');
    expect(keys).toContain('neo4j');
    expect(keys).toContain('typesense');
    expect(keys).toContain('nats');
    expect(keys).toContain('redis');
    expect(keys).toContain('temporal');
    expect(keys).toContain('minio');
  });

  it('getAllStatuses() reflects overrides', () => {
    registry.setOverride('redis', 'degraded');
    const statuses = registry.getAllStatuses();
    expect(statuses.redis).toBe('degraded');
    expect(statuses.nats).toBe('healthy');
  });
});
