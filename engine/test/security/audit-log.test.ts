import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLog } from '../../src/security/audit-log';
import type { CreateAuditEntryInput } from '../../src/security/audit-log';

const BASE_INPUT: CreateAuditEntryInput = {
  teamId: 'team:abc',
  actorId: 'user:xyz',
  actorType: 'user',
  action: 'api_key.created',
  resource: 'api_key:k1',
  details: { name: 'My Key' },
  ip: '1.2.3.4',
  requestId: 'req-001',
};

describe('AuditLog', () => {
  let log: AuditLog;

  beforeEach(() => {
    log = new AuditLog();
  });

  it('creates an entry with the expected fields', () => {
    const entry = log.createEntry(BASE_INPUT);

    expect(entry.teamId).toBe('team:abc');
    expect(entry.actorId).toBe('user:xyz');
    expect(entry.actorType).toBe('user');
    expect(entry.action).toBe('api_key.created');
    expect(entry.resource).toBe('api_key:k1');
    expect(entry.ip).toBe('1.2.3.4');
    expect(entry.requestId).toBe('req-001');
    expect(typeof entry.timestamp).toBe('string');
    expect(typeof entry.hash).toBe('string');
    expect(entry.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('first entry has empty previousHash', () => {
    const entry = log.createEntry(BASE_INPUT);
    expect(entry.previousHash).toBe('');
  });

  it('hash chain: event2.previousHash === event1.hash', () => {
    const event1 = log.createEntry(BASE_INPUT);
    const event2 = log.createEntry({ ...BASE_INPUT, action: 'api_key.revoked', resource: 'api_key:k2' });

    expect(event2.previousHash).toBe(event1.hash);
  });

  it('hashes are unique per entry', () => {
    const event1 = log.createEntry(BASE_INPUT);
    const event2 = log.createEntry({ ...BASE_INPUT, action: 'api_key.revoked' });
    const event3 = log.createEntry({ ...BASE_INPUT, action: 'auth.login' });

    expect(event1.hash).not.toBe(event2.hash);
    expect(event2.hash).not.toBe(event3.hash);
    expect(event1.hash).not.toBe(event3.hash);
  });

  it('verify() returns true for an untampered chain', () => {
    log.createEntry(BASE_INPUT);
    log.createEntry({ ...BASE_INPUT, action: 'auth.login' });
    log.createEntry({ ...BASE_INPUT, action: 'webhook.created' });

    expect(log.verify()).toBe(true);
  });

  it('verify() returns false when an entry is tampered', () => {
    log.createEntry(BASE_INPUT);
    log.createEntry({ ...BASE_INPUT, action: 'auth.login' });

    // Tamper with the first entry
    const entries = log.getEntries() as any[];
    entries[0].teamId = 'team:tampered';

    expect(log.verify()).toBe(false);
  });

  it('getEntries() returns all recorded entries in order', () => {
    log.createEntry(BASE_INPUT);
    log.createEntry({ ...BASE_INPUT, action: 'auth.login' });
    log.createEntry({ ...BASE_INPUT, action: 'webhook.created' });

    expect(log.getEntries()).toHaveLength(3);
    expect(log.getEntries()[0].action).toBe('api_key.created');
    expect(log.getEntries()[2].action).toBe('webhook.created');
  });

  it('defaults ip and requestId to null when omitted', () => {
    const entry = log.createEntry({
      teamId: 'team:abc',
      actorId: 'user:xyz',
      actorType: 'system',
      action: 'auth.failed',
      resource: 'auth',
    });

    expect(entry.ip).toBeNull();
    expect(entry.requestId).toBeNull();
  });
});
