export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';
export type PlatformRole = 'admin' | 'user';
export type TeamTier = 'free' | 'pro' | 'enterprise';
export type ApiKeyScope = 'read' | 'read-write';
export type AuthMethod = 'jwt' | 'apikey' | 'dev';

export interface AppVariables {
  userId: string;
  teamId: string;
  role: UserRole;
  platformRole: PlatformRole;
  authMethod: AuthMethod;
  scope: ApiKeyScope;
  tier: TeamTier;
  roleVersion: number;
  apiKeyMeta: { id: string; name: string; prefix: string };
  requestId: string;
}

export interface AuthProvider {
  findUserById(id: string): Promise<AuthUser | null>;
  findApiKeyByHash(hash: string): Promise<AuthApiKey | null>;
  findSession(id: string): Promise<AuthSession | null>;
  findTeamById(id: string): Promise<AuthTeam | null>;
}

export interface AuthUser {
  id: string;
  email: string;
  teamId: string;
  role: UserRole;
  platformRole: PlatformRole;
  roleVersion?: number;
  deletedAt?: Date | null;
}

export interface AuthApiKey {
  id: string;
  keyHash: string;
  teamId: string;
  userId: string;
  name: string;
  scopes: string[];
  disabled?: boolean;
  expiresAt?: Date | null;
}

export interface AuthSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface AuthTeam {
  id: string;
  name: string;
  slug: string;
  tier: TeamTier;
}
