/**
 * UpstreamGroupManager — tracks group-level health by aggregating circuit states of member sources.
 *
 * A group is considered degraded if any member is open or cost-hold,
 * and healthy only when all members are closed or half-open.
 */

import type { CircuitState } from './circuit-breaker';

export type GroupHealth = 'healthy' | 'degraded' | 'down';

export interface GroupStatus {
  group: string;
  health: GroupHealth;
  memberCount: number;
  openCount: number;
  costHoldCount: number;
  members: Array<{ sourceId: string; state: CircuitState }>;
}

export class UpstreamGroupManager {
  /** Map of groupId -> Map of sourceId -> CircuitState */
  private groups = new Map<string, Map<string, CircuitState>>();

  /**
   * Registers or updates a source's circuit state in its group.
   */
  updateSource(group: string, sourceId: string, state: CircuitState): void {
    if (!this.groups.has(group)) {
      this.groups.set(group, new Map());
    }
    this.groups.get(group)!.set(sourceId, state);
  }

  /**
   * Removes a source from a group (e.g. when a source is deleted).
   */
  removeSource(group: string, sourceId: string): void {
    const members = this.groups.get(group);
    if (members) {
      members.delete(sourceId);
      if (members.size === 0) {
        this.groups.delete(group);
      }
    }
  }

  /**
   * Returns the aggregated status for a group.
   * - down: all members are open
   * - degraded: at least one member is open or cost-hold
   * - healthy: all members are closed or half-open
   */
  getGroupStatus(group: string): GroupStatus | null {
    const members = this.groups.get(group);
    if (!members || members.size === 0) {
      return null;
    }

    const memberList = Array.from(members.entries()).map(([sourceId, state]) => ({ sourceId, state }));
    const openCount = memberList.filter(m => m.state === 'open').length;
    const costHoldCount = memberList.filter(m => m.state === 'cost-hold').length;

    let health: GroupHealth;
    if (openCount === memberList.length) {
      health = 'down';
    } else if (openCount > 0 || costHoldCount > 0) {
      health = 'degraded';
    } else {
      health = 'healthy';
    }

    return {
      group,
      health,
      memberCount: memberList.length,
      openCount,
      costHoldCount,
      members: memberList,
    };
  }

  /**
   * Returns statuses for all tracked groups.
   */
  getAllGroupStatuses(): GroupStatus[] {
    const statuses: GroupStatus[] = [];
    for (const group of this.groups.keys()) {
      const status = this.getGroupStatus(group);
      if (status) {
        statuses.push(status);
      }
    }
    return statuses;
  }

  /**
   * Returns true if a group is healthy enough to allow new requests.
   * Returns true (allow) when the group is unknown — fail-open for new groups.
   */
  isGroupHealthy(group: string): boolean {
    const status = this.getGroupStatus(group);
    if (!status) {
      return true; // fail-open: unknown group is allowed
    }
    return status.health === 'healthy';
  }
}
