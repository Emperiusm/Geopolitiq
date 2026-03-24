import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AuditAction =
  | 'api_key.created'
  | 'api_key.revoked'
  | 'webhook.created'
  | 'webhook.deleted'
  | 'watchlist.created'
  | 'watchlist.deleted'
  | 'auth.login'
  | 'auth.failed'
  | 'auth.logout'
  | 'user.invited'
  | 'user.removed'
  | 'team.updated'
  | 'foia_request.created'
  | 'foia_request.updated';

export type ActorType = 'user' | 'api_key' | 'system';

export interface AuditEntry {
  timestamp: string;        // ISO-8601
  teamId: string;
  actorId: string;
  actorType: ActorType;
  action: AuditAction;
  resource: string;         // e.g. "api_key:abc123"
  details: Record<string, unknown>;
  ip: string | null;
  requestId: string | null;
  previousHash: string;     // '' for first entry
  hash: string;             // SHA-256 of canonical JSON with hash=''
}

export interface CreateAuditEntryInput {
  teamId: string;
  actorId: string;
  actorType: ActorType;
  action: AuditAction;
  resource: string;
  details?: Record<string, unknown>;
  ip?: string | null;
  requestId?: string | null;
}

// ---------------------------------------------------------------------------
// Hash helpers
// ---------------------------------------------------------------------------

function computeHash(entry: Omit<AuditEntry, 'hash'>): string {
  const canonical = JSON.stringify({ ...entry, hash: '' });
  return createHash('sha256').update(canonical).digest('hex');
}

// ---------------------------------------------------------------------------
// AuditLog
// ---------------------------------------------------------------------------

/**
 * In-process tamper-evident audit log with a SHA-256 hash chain.
 *
 * For production use, flush entries to a persistent store (e.g. a dedicated
 * audit_log table) before the process exits.
 */
export class AuditLog {
  private entries: AuditEntry[] = [];

  get lastHash(): string {
    if (this.entries.length === 0) return '';
    return this.entries[this.entries.length - 1].hash;
  }

  createEntry(input: CreateAuditEntryInput): AuditEntry {
    const previousHash = this.lastHash;

    const partial: Omit<AuditEntry, 'hash'> = {
      timestamp: new Date().toISOString(),
      teamId: input.teamId,
      actorId: input.actorId,
      actorType: input.actorType,
      action: input.action,
      resource: input.resource,
      details: input.details ?? {},
      ip: input.ip ?? null,
      requestId: input.requestId ?? null,
      previousHash,
    };

    const hash = computeHash(partial);
    const entry: AuditEntry = { ...partial, hash };

    this.entries.push(entry);
    return entry;
  }

  /**
   * Return all stored entries (read-only view).
   */
  getEntries(): ReadonlyArray<AuditEntry> {
    return this.entries;
  }

  /**
   * Verify the integrity of the hash chain.
   * Returns true if every entry's hash matches its content and chain links are intact.
   */
  verify(): boolean {
    let previousHash = '';
    for (const entry of this.entries) {
      const { hash, ...rest } = entry;
      const expected = computeHash({ ...rest, previousHash });
      if (hash !== expected) return false;
      if (rest.previousHash !== previousHash) return false;
      previousHash = hash;
    }
    return true;
  }
}
