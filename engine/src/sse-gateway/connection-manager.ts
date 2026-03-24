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
 */
export class ConnectionManager {
  private readonly counts = new Map<string, number>();

  /**
   * Returns true if a new connection from this team is allowed.
   * Free tier is always rejected. Pro / Enterprise are capped by TIER_LIMITS.
   */
  canConnect(teamId: string, tier: string): boolean {
    const normalised = tier.toLowerCase();

    const limit = TIER_LIMITS[normalised];
    if (limit === undefined) {
      // Unknown tier (including 'free') → reject
      return false;
    }

    const current = this.counts.get(teamId) ?? 0;
    return current < limit;
  }

  /** Increment the connection count for a team. Call after accepting a connection. */
  onConnect(teamId: string): void {
    const current = this.counts.get(teamId) ?? 0;
    this.counts.set(teamId, current + 1);
  }

  /** Decrement the connection count for a team. Call when a connection closes. */
  onDisconnect(teamId: string): void {
    const current = this.counts.get(teamId) ?? 0;
    const next = Math.max(0, current - 1);
    if (next === 0) {
      this.counts.delete(teamId);
    } else {
      this.counts.set(teamId, next);
    }
  }

  /** Sum of active connections across all teams. */
  getTotalCount(): number {
    let total = 0;
    for (const count of this.counts.values()) {
      total += count;
    }
    return total;
  }

  /** Active connection count for a specific team. */
  getTeamCount(teamId: string): number {
    return this.counts.get(teamId) ?? 0;
  }
}
