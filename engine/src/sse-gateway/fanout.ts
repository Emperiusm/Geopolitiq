// fanout.ts — SSEFanout: entity → connections broadcast map

// ── SSEConnection ─────────────────────────────────────────────────────

export interface SSEConnection {
  write(data: { id: string; event: string; data: string }): void;
  teamId: string;
  entityIds: Set<string>;
}

// ── SSEFanout ─────────────────────────────────────────────────────────

/**
 * Maps entityId → Set<SSEConnection> for zero-copy fan-out.
 * One instance per gateway pod; NATS delivers one message per pod (H26 multiplexing).
 */
export class SSEFanout {
  private readonly map = new Map<string, Set<SSEConnection>>();

  /** Add a connection to the watch set for an entity. */
  register(entityId: string, conn: SSEConnection): void {
    let watchers = this.map.get(entityId);
    if (!watchers) {
      watchers = new Set();
      this.map.set(entityId, watchers);
    }
    watchers.add(conn);
  }

  /** Remove a connection from a single entity's watch set; cleans up empty sets. */
  unregister(entityId: string, conn: SSEConnection): void {
    const watchers = this.map.get(entityId);
    if (!watchers) return;
    watchers.delete(conn);
    if (watchers.size === 0) {
      this.map.delete(entityId);
    }
  }

  /** Remove a connection from ALL entities it was watching. */
  unregisterAll(conn: SSEConnection): void {
    for (const entityId of conn.entityIds) {
      this.unregister(entityId, conn);
    }
  }

  /**
   * Broadcast an SSE event to all connections watching an entity.
   * Write errors per-connection are swallowed so one bad client cannot
   * interrupt the rest of the fan-out.
   */
  broadcast(entityId: string, event: { id: string; event: string; data: string }): void {
    const watchers = this.map.get(entityId);
    if (!watchers || watchers.size === 0) return;

    for (const conn of watchers) {
      try {
        conn.write(event);
      } catch {
        // Ignore write errors for individual connections
      }
    }
  }

  /** Total connection count across all entity watch sets (a connection watching N entities is counted N times). */
  getConnectionCount(): number {
    let total = 0;
    for (const watchers of this.map.values()) {
      total += watchers.size;
    }
    return total;
  }

  /** Number of unique entities currently being watched. */
  getEntityCount(): number {
    return this.map.size;
  }
}
