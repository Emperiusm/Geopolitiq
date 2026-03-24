import { createMiddleware } from 'hono/factory';
import { UnauthorizedError } from '@gambit/common';
import type { AuthProvider, UserRole, PlatformRole, TeamTier, ApiKeyScope, AuthMethod } from '@gambit/common';

const PUBLIC_PATHS = ['/engine/v1/health'];

export function authenticate(authProvider: AuthProvider) {
  return createMiddleware(async (c, next) => {
    // Skip auth for public paths
    const path = c.req.path;
    if (PUBLIC_PATHS.some((p) => path === p || path.endsWith('/health'))) {
      await next();
      return;
    }

    // Dev bypass for non-production environments
    if (process.env.NODE_ENV !== 'production') {
      const devBypass = c.req.header('x-dev-bypass');
      if (devBypass === 'true' || !c.req.header('authorization') && !c.req.header('x-api-key')) {
        c.set('userId', 'dev-user');
        c.set('teamId', 'dev-team');
        c.set('role', 'owner' as UserRole);
        c.set('platformRole', 'admin' as PlatformRole);
        c.set('authMethod', 'dev' as AuthMethod);
        c.set('scope', 'read-write' as ApiKeyScope);
        c.set('tier', 'enterprise' as TeamTier);
        await next();
        return;
      }
    }

    // Try Bearer token
    const authHeader = c.req.header('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      await authenticateBearer(c, authProvider, token);
      await next();
      return;
    }

    // Try API key
    const apiKeyHeader = c.req.header('x-api-key');
    if (apiKeyHeader) {
      await authenticateApiKey(c, authProvider, apiKeyHeader);
      await next();
      return;
    }

    throw new UnauthorizedError('Missing authentication: provide Bearer token or X-API-Key header');
  });
}

async function authenticateBearer(c: any, authProvider: AuthProvider, token: string): Promise<void> {
  // Token is expected to be a session ID for now (JWT verification can be added later)
  const session = await authProvider.findSession(token);
  if (!session) {
    throw new UnauthorizedError('Invalid or expired session token');
  }

  if (session.expiresAt < new Date()) {
    throw new UnauthorizedError('Session expired');
  }

  const user = await authProvider.findUserById(session.userId);
  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  if (user.deletedAt) {
    throw new UnauthorizedError('User account is deactivated');
  }

  const team = await authProvider.findTeamById(user.teamId);

  c.set('userId', user.id);
  c.set('teamId', user.teamId);
  c.set('role', user.role as UserRole);
  c.set('platformRole', user.platformRole as PlatformRole);
  c.set('authMethod', 'jwt' as AuthMethod);
  c.set('scope', 'read-write' as ApiKeyScope);
  c.set('tier', (team?.tier ?? 'free') as TeamTier);
}

async function authenticateApiKey(c: any, authProvider: AuthProvider, rawKey: string): Promise<void> {
  // Hash the API key to compare with stored hash
  const encoder = new TextEncoder();
  const data = encoder.encode(rawKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const keyHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  const apiKey = await authProvider.findApiKeyByHash(keyHash);
  if (!apiKey) {
    throw new UnauthorizedError('Invalid API key');
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new UnauthorizedError('API key expired');
  }

  const user = await authProvider.findUserById(apiKey.userId);
  if (!user) {
    throw new UnauthorizedError('API key owner not found');
  }

  if (user.deletedAt) {
    throw new UnauthorizedError('API key owner account is deactivated');
  }

  const team = await authProvider.findTeamById(apiKey.teamId);

  // Determine scope from scopes array
  const hasWrite = apiKey.scopes.includes('read-write') || apiKey.scopes.includes('write');
  const scope: ApiKeyScope = hasWrite ? 'read-write' : 'read';

  c.set('userId', user.id);
  c.set('teamId', apiKey.teamId);
  c.set('role', user.role as UserRole);
  c.set('platformRole', user.platformRole as PlatformRole);
  c.set('authMethod', 'apikey' as AuthMethod);
  c.set('scope', scope);
  c.set('tier', (team?.tier ?? 'free') as TeamTier);
  c.set('apiKeyMeta', { id: apiKey.id, name: apiKey.name, prefix: rawKey.slice(0, 8) });
}
