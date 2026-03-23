import { eq } from 'drizzle-orm';
import type { DrizzleClient } from '../db/transaction';
import type { AuthProvider, AuthUser, AuthApiKey, AuthSession, AuthTeam } from '@gambit/common';
import { teams, users, apiKeys, sessions } from '../db/schema/auth';

export class PostgresAuthProvider implements AuthProvider {
  constructor(private db: DrizzleClient) {}

  async findUserById(id: string): Promise<AuthUser | null> {
    const rows = await this.db
      .select({
        id: users.id,
        email: users.email,
        teamId: users.teamId,
        role: users.role,
        platformRole: users.platformRole,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      email: row.email,
      teamId: row.teamId,
      role: row.role as AuthUser['role'],
      platformRole: row.platformRole as AuthUser['platformRole'],
      deletedAt: row.deletedAt,
    };
  }

  async findApiKeyByHash(hash: string): Promise<AuthApiKey | null> {
    const rows = await this.db
      .select({
        id: apiKeys.id,
        keyHash: apiKeys.keyHash,
        teamId: apiKeys.teamId,
        userId: apiKeys.userId,
        name: apiKeys.name,
        scopes: apiKeys.scopes,
        expiresAt: apiKeys.expiresAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, hash))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      keyHash: row.keyHash,
      teamId: row.teamId,
      userId: row.userId,
      name: row.name,
      scopes: row.scopes ?? [],
      expiresAt: row.expiresAt,
    };
  }

  async findSession(id: string): Promise<AuthSession | null> {
    const rows = await this.db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.id, id))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      userId: row.userId,
      expiresAt: row.expiresAt,
    };
  }

  async findTeamById(id: string): Promise<AuthTeam | null> {
    const rows = await this.db
      .select({
        id: teams.id,
        name: teams.name,
        slug: teams.slug,
        tier: teams.tier,
      })
      .from(teams)
      .where(eq(teams.id, id))
      .limit(1);

    if (rows.length === 0) return null;

    const row = rows[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      tier: row.tier as AuthTeam['tier'],
    };
  }
}
