import { createHash } from 'crypto';
import { sql } from 'drizzle-orm';
import type { DrizzleClient } from '../db/transaction';

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
 * Tamper-evident audit log with a SHA-256 hash chain.
 *
 * When a `db` client is provided (production), `record()` inserts each entry
 * into the `audit_log` table immediately after adding it to the in-memory
 * chain. When no `db` is provided (testing / bootstrap), entries accumulate
 * in memory only — call `flush(db)` later to persist them in bulk.
 *
 * Schema expected (create via Drizzle migration or manual DDL):
 *
 *   CREATE TABLE IF NOT EXISTS audit_log (
 *     id            BIGSERIAL PRIMARY KEY,
 *     timestamp     TIMESTAMPTZ NOT NULL,
 *     team_id       TEXT        NOT NULL,
 *     actor_id      TEXT        NOT NULL,
 *     actor_type    TEXT        NOT NULL,
 *     action        TEXT        NOT NULL,
 *     resource      TEXT        NOT NULL,
 *     details       JSONB       NOT NULL DEFAULT '{}',
 *     ip            TEXT,
 *     request_id    TEXT,
 *     previous_hash TEXT        NOT NULL,
 *     hash          TEXT        NOT NULL UNIQUE
 *   );
 */
export class AuditLog {
  private entries: AuditEntry[] = [];

  /**
   * @param db Optional Drizzle client. When provided, each entry is
   *           persisted to the `audit_log` table on every `record()` call.
   */
  constructor(private readonly db?: DrizzleClient) {}

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
   * Create an audit entry and immediately persist it to the database when a
   * `db` client was provided to the constructor.
   */
  async record(input: CreateAuditEntryInput): Promise<AuditEntry> {
    const entry = this.createEntry(input);

    if (this.db) {
      await this.db.execute(sql`
        INSERT INTO audit_log
          (timestamp, team_id, actor_id, actor_type, action, resource, details, ip, request_id, previous_hash, hash)
        VALUES
          (${entry.timestamp}::timestamptz,
           ${entry.teamId},
           ${entry.actorId},
           ${entry.actorType},
           ${entry.action},
           ${entry.resource},
           ${JSON.stringify(entry.details)}::jsonb,
           ${entry.ip},
           ${entry.requestId},
           ${entry.previousHash},
           ${entry.hash})
      `);
    }

    return entry;
  }

  /**
   * Flush all in-memory entries to the database in a single transaction.
   * Useful when the AuditLog was constructed without a `db` client (e.g.
   * during bootstrap) and you want to persist entries later.
   *
   * Already-persisted entries are not re-inserted; callers are responsible
   * for clearing the in-memory list if desired.
   */
  async flush(db: DrizzleClient): Promise<void> {
    for (const entry of this.entries) {
      await db.execute(sql`
        INSERT INTO audit_log
          (timestamp, team_id, actor_id, actor_type, action, resource, details, ip, request_id, previous_hash, hash)
        VALUES
          (${entry.timestamp}::timestamptz,
           ${entry.teamId},
           ${entry.actorId},
           ${entry.actorType},
           ${entry.action},
           ${entry.resource},
           ${JSON.stringify(entry.details)}::jsonb,
           ${entry.ip},
           ${entry.requestId},
           ${entry.previousHash},
           ${entry.hash})
        ON CONFLICT (hash) DO NOTHING
      `);
    }
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
