// fanout.test.ts — SSEFanout and ConnectionManager unit tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SSEFanout, type SSEConnection } from '../../src/sse-gateway/fanout';
import { ConnectionManager } from '../../src/sse-gateway/connection-manager';

// ── Helpers ───────────────────────────────────────────────────────────

function makeConn(teamId = 'team-1', entityIds: string[] = []): SSEConnection & { write: ReturnType<typeof vi.fn> } {
  return {
    write: vi.fn(),
    teamId,
    entityIds: new Set(entityIds),
  };
}

function makeEvent(entityId = 'entity:test') {
  return { id: 'evt-1', event: 'signals.ingested', data: JSON.stringify({ entityId }) };
}

// ── SSEFanout ─────────────────────────────────────────────────────────

describe('SSEFanout', () => {
  let fanout: SSEFanout;

  beforeEach(() => {
    fanout = new SSEFanout();
  });

  describe('register / unregister', () => {
    it('registers a connection for an entity', () => {
      const conn = makeConn('team-1', ['entity:nvidia']);
      fanout.register('entity:nvidia', conn);
      expect(fanout.getConnectionCount()).toBe(1);
      expect(fanout.getEntityCount()).toBe(1);
    });

    it('registers multiple connections for the same entity', () => {
      const conn1 = makeConn('team-1', ['entity:nvidia']);
      const conn2 = makeConn('team-2', ['entity:nvidia']);
      fanout.register('entity:nvidia', conn1);
      fanout.register('entity:nvidia', conn2);
      expect(fanout.getConnectionCount()).toBe(2);
      expect(fanout.getEntityCount()).toBe(1);
    });

    it('registers one connection for multiple entities', () => {
      const conn = makeConn('team-1', ['entity:nvidia', 'entity:tsmc']);
      fanout.register('entity:nvidia', conn);
      fanout.register('entity:tsmc', conn);
      // Same connection in 2 entity sets → counted twice
      expect(fanout.getConnectionCount()).toBe(2);
      expect(fanout.getEntityCount()).toBe(2);
    });

    it('unregisters a connection from a specific entity', () => {
      const conn = makeConn('team-1', ['entity:nvidia']);
      fanout.register('entity:nvidia', conn);
      fanout.unregister('entity:nvidia', conn);
      expect(fanout.getConnectionCount()).toBe(0);
      expect(fanout.getEntityCount()).toBe(0);
    });

    it('cleans up empty entity sets on unregister', () => {
      const conn = makeConn('team-1', ['entity:nvidia']);
      fanout.register('entity:nvidia', conn);
      fanout.unregister('entity:nvidia', conn);
      // Internal map should be empty — entity key removed
      expect(fanout.getEntityCount()).toBe(0);
    });

    it('is a no-op when unregistering a connection that was never registered', () => {
      const conn = makeConn();
      expect(() => fanout.unregister('entity:ghost', conn)).not.toThrow();
      expect(fanout.getConnectionCount()).toBe(0);
    });
  });

  describe('unregisterAll', () => {
    it('removes a connection from all its watched entities', () => {
      const conn = makeConn('team-1', ['entity:nvidia', 'entity:tsmc', 'entity:amd']);
      for (const id of conn.entityIds) {
        fanout.register(id, conn);
      }
      expect(fanout.getConnectionCount()).toBe(3);

      fanout.unregisterAll(conn);

      expect(fanout.getConnectionCount()).toBe(0);
      expect(fanout.getEntityCount()).toBe(0);
    });

    it('does not affect other connections watching the same entities', () => {
      const conn1 = makeConn('team-1', ['entity:nvidia']);
      const conn2 = makeConn('team-2', ['entity:nvidia']);
      fanout.register('entity:nvidia', conn1);
      fanout.register('entity:nvidia', conn2);

      fanout.unregisterAll(conn1);

      // conn2 still watching
      expect(fanout.getConnectionCount()).toBe(1);
      expect(fanout.getEntityCount()).toBe(1);
    });

    it('is a no-op when connection has empty entityIds', () => {
      const conn = makeConn('team-1', []);
      expect(() => fanout.unregisterAll(conn)).not.toThrow();
    });
  });

  describe('broadcast', () => {
    it('calls write on all watchers of an entity', () => {
      const conn1 = makeConn('team-1', ['entity:nvidia']);
      const conn2 = makeConn('team-2', ['entity:nvidia']);
      fanout.register('entity:nvidia', conn1);
      fanout.register('entity:nvidia', conn2);

      const event = makeEvent('entity:nvidia');
      fanout.broadcast('entity:nvidia', event);

      expect(conn1.write).toHaveBeenCalledOnce();
      expect(conn1.write).toHaveBeenCalledWith(event);
      expect(conn2.write).toHaveBeenCalledOnce();
    });

    it('does not call write on connections watching different entities', () => {
      const conn1 = makeConn('team-1', ['entity:nvidia']);
      const conn2 = makeConn('team-2', ['entity:tsmc']);
      fanout.register('entity:nvidia', conn1);
      fanout.register('entity:tsmc', conn2);

      fanout.broadcast('entity:nvidia', makeEvent('entity:nvidia'));

      expect(conn1.write).toHaveBeenCalledOnce();
      expect(conn2.write).not.toHaveBeenCalled();
    });

    it('is a no-op when no connections watch the entity', () => {
      expect(() => fanout.broadcast('entity:nobody', makeEvent())).not.toThrow();
    });

    it('continues broadcasting to remaining connections when one write throws', () => {
      const conn1 = makeConn('team-1', ['entity:nvidia']);
      const conn2 = makeConn('team-2', ['entity:nvidia']);
      conn1.write.mockImplementation(() => { throw new Error('write error'); });

      fanout.register('entity:nvidia', conn1);
      fanout.register('entity:nvidia', conn2);

      expect(() => fanout.broadcast('entity:nvidia', makeEvent())).not.toThrow();
      expect(conn2.write).toHaveBeenCalledOnce();
    });
  });

  describe('getConnectionCount', () => {
    it('returns 0 for an empty fanout', () => {
      expect(fanout.getConnectionCount()).toBe(0);
    });

    it('counts the same connection once per entity it watches', () => {
      const conn = makeConn('team-1', ['entity:a', 'entity:b']);
      fanout.register('entity:a', conn);
      fanout.register('entity:b', conn);
      // Counted in both entity sets
      expect(fanout.getConnectionCount()).toBe(2);
    });
  });
});

// ── ConnectionManager ─────────────────────────────────────────────────

describe('ConnectionManager', () => {
  let cm: ConnectionManager;

  beforeEach(() => {
    cm = new ConnectionManager();
  });

  describe('canConnect', () => {
    it('rejects free tier', () => {
      expect(cm.canConnect('team-1', 'free')).toBe(false);
    });

    it('rejects unknown tiers', () => {
      expect(cm.canConnect('team-1', 'starter')).toBe(false);
      expect(cm.canConnect('team-1', '')).toBe(false);
    });

    it('allows pro tier when under the limit (25)', () => {
      expect(cm.canConnect('team-1', 'pro')).toBe(true);
    });

    it('allows enterprise tier when under the limit (200)', () => {
      expect(cm.canConnect('team-1', 'enterprise')).toBe(true);
    });

    it('is case-insensitive for tier names', () => {
      expect(cm.canConnect('team-1', 'Pro')).toBe(true);
      expect(cm.canConnect('team-1', 'ENTERPRISE')).toBe(true);
      expect(cm.canConnect('team-1', 'FREE')).toBe(false);
    });

    it('blocks pro team at the limit (25)', () => {
      for (let i = 0; i < 25; i++) cm.onConnect('team-pro');
      expect(cm.canConnect('team-pro', 'pro')).toBe(false);
    });

    it('allows enterprise team up to 200 and blocks at 200', () => {
      for (let i = 0; i < 199; i++) cm.onConnect('team-ent');
      expect(cm.canConnect('team-ent', 'enterprise')).toBe(true);
      cm.onConnect('team-ent');
      expect(cm.canConnect('team-ent', 'enterprise')).toBe(false);
    });
  });

  describe('onConnect / onDisconnect', () => {
    it('increments count on connect', () => {
      cm.onConnect('team-1');
      expect(cm.getTeamCount('team-1')).toBe(1);
      cm.onConnect('team-1');
      expect(cm.getTeamCount('team-1')).toBe(2);
    });

    it('decrements count on disconnect', () => {
      cm.onConnect('team-1');
      cm.onConnect('team-1');
      cm.onDisconnect('team-1');
      expect(cm.getTeamCount('team-1')).toBe(1);
    });

    it('removes team entry when count reaches 0', () => {
      cm.onConnect('team-1');
      cm.onDisconnect('team-1');
      expect(cm.getTeamCount('team-1')).toBe(0);
    });

    it('does not go below 0 on spurious disconnect', () => {
      cm.onDisconnect('team-ghost');
      expect(cm.getTeamCount('team-ghost')).toBe(0);
    });
  });

  describe('getTotalCount', () => {
    it('returns 0 with no connections', () => {
      expect(cm.getTotalCount()).toBe(0);
    });

    it('sums counts across all teams', () => {
      cm.onConnect('team-1');
      cm.onConnect('team-1');
      cm.onConnect('team-2');
      expect(cm.getTotalCount()).toBe(3);
    });

    it('decreases correctly after disconnects', () => {
      cm.onConnect('team-1');
      cm.onConnect('team-2');
      cm.onDisconnect('team-1');
      expect(cm.getTotalCount()).toBe(1);
    });
  });
});
