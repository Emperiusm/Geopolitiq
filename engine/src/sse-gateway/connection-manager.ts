// connection-manager.ts — Per-team connection caps

// ── Tier limits ───────────────────────────────────────────────────────

const TIER_LIMITS: Record<string, number> = {
  pro: 25,
  enterprise: 200,
};

// ── ConnectionManager ─────────────────────────────────────────────────

/**
 * Tracks per-team active SSE connection counts and enforces tier limits.
 * Free tier is rejected outright (canConnect returns false).
 *
 * When a Redis client is supplied, connection counts are also mirrored there
 * so that multiple gateway pods see the aggregate count rather than only
 * their local slice (C4 fix).  The in-process Map acts as an L1 cache /
 * fallback when Redis is unavailable.
 */
export class ConnectionManager {
  private readonly localCounts = new Map<string, number>();

  constructor(private readonly redis?: any) {}

  /**
   * Returns true if a new connection from this team is allowed.
   * Free tier is always rejected. Pro / Enterprise are capped by TIER_LIMITS.
   */
  async canConnect(teamId: string, tier: string): Promise<boolean> {
    const normalised = tier.toLowerCase();

    const limit = TIER_LIMITS[normalised];
    if (limit === undefined) {
      // Unknown tier (including 'free') → reject
      return false;
    }

    if (this.redis) {
      try {
        const raw = await this.redis.get(`sse:connections:${teamId}`);
        const count = parseInt(raw ?? '0', 10);
        return count < limit;
      } catch {
        // Redis unavailable — fall through to local count
      }
    }

    const current = this.localCounts.get(teamId) ?? 0;
    return current < limit;
  }

  /** Increment the connection count for a team. Call after accepting a connection. */
  async onConnect(teamId: string): Promise<void> {
    this.localCounts.set(teamId, (this.localCounts.get(teamId) ?? 0) + 1);

    if (this.redis) {
      try {
        await this.redis.incr(`sse:connections:${teamId}`);
      } catch {
        // Non-fatal; local count still tracks this pod's connections
      }
    }
  }

  /** Decrement the connection count for a team. Call when a connection closes. */
  async onDisconnect(teamId: string): Promise<void> {
    const current = this.localCounts.get(teamId) ?? 0;
    const next = Math.max(0, current - 1);
    if (next === 0) {
      this.localCounts.delete(teamId);
    } else {
      this.localCounts.set(teamId, next);
    }

    if (this.redis) {
      try {
        await this.redis.decr(`sse:connections:${teamId}`);
      } catch {
        // Non-fatal
      }
    }
  }

  /** Sum of active connections tracked locally across all teams. */
  getTotalCount(): number {
    let total = 0;
    for (const count of this.localCounts.values()) {
      total += count;
    }
    return total;
  }

  /** Active connection count for a specific team (local only). */
  getTeamCount(teamId: string): number {
    return this.localCounts.get(teamId) ?? 0;
  }
}
