// api/src/types/auth.ts — All auth-related type definitions

// --- Enums ---

export type UserRole = "owner" | "admin" | "member" | "viewer";
export type PlatformRole = "admin" | "user";
export type TeamPlan = "free" | "pro";
export type ApiKeyScope = "read" | "read-write";
export type AuthMethod = "jwt" | "apikey" | "dev";

export type AuditAction =
  | "user.login"
  | "user.logout"
  | "user.email_updated"
  | "user.deletion_requested"
  | "user.deletion_cancelled"
  | "user.deleted"
  | "user.recovery_initiated"
  | "user.recovery_completed"
  | "admin.impersonated"
  | "member.invited"
  | "member.joined"
  | "member.removed"
  | "role.changed"
  | "team.updated"
  | "team.ownership_transferred"
  | "apikey.created"
  | "apikey.revoked"
  | "apikey.rotated"
  | "session.revoked"
  | "settings.updated"
  | "provider.linked";

export type EmailTemplate =
  | "new_device_login"
  | "deletion_scheduled"
  | "deletion_cancelled"
  | "account_recovery"
  | "team_invite"
  | "provider_linked";

// --- Data Models ---

export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  customAvatar: boolean;
  role: UserRole;
  platformRole: PlatformRole;
  teamId: string;
  roleVersion: number;
  providers: Array<{
    provider: "github" | "google";
    providerId: string;
    email: string;
    verified: boolean;
    linkedAt: Date;
  }>;
  lastLoginAt: Date;
  lastLoginIp?: string;
  deletionRequestedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  _id: string;
  name: string;
  slug: string;
  plan: TeamPlan;
  ownerId: string;
  watchlist: string[];
  inviteCodes: Array<{
    code: string;
    label?: string;
    role: UserRole;
    createdBy: string;
    expiresAt: Date;
    maxUses: number;
    uses: number;
    usedBy: string[];
  }>;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  _id: string;
  userId: string;
  teamId: string;
  refreshTokenHash: string;
  device: {
    browser: string;
    os: string;
    raw: string;
  };
  ip: string;
  location?: {
    city: string;
    country: string;
  };
  isNewDevice: boolean;
  createdAt: Date;
  lastRefreshedAt: Date;
  expiresAt: Date;
  absoluteExpiresAt: Date;
}

export interface AuthCode {
  _id: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
  isNew?: boolean;
  joined?: { teamId: string; teamName: string };
  inviteError?: "expired" | "exhausted" | "not_found";
}

export interface ApiKey {
  _id: string;
  keyHash: string;
  keyPrefix: string;
  userId: string;
  teamId: string;
  name: string;
  scope: ApiKeyScope;
  disabled: boolean;
  disabledAt?: Date;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt?: Date;
}

export interface UserPreferences {
  _id: string;
  watchlist: string[];
  alertSeverity: "watch" | "alert" | "critical";
  alertEntities?: string[];
  defaultLayers: string[];
  timezone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  _id: string;
  loginAlerts: boolean;
  teamInvites: boolean;
  anomalyDigest: "realtime" | "daily" | "off";
  updatedAt: Date;
}

export interface TeamSettings {
  _id: string;
  llmProvider?: "anthropic" | "openai";
  llmApiKey?: string;
  llmModel?: string;
  aiAnalysisEnabled: boolean;
  updatedBy: string;
  updatedAt: Date;
}

export interface SavedView {
  _id: string;
  teamId: string;
  createdBy: string;
  name: string;
  layers: string[];
  viewport: {
    longitude: number;
    latitude: number;
    zoom: number;
    viewMode: "globe" | "flat";
  };
  filters?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditEvent {
  _id: string;
  teamId: string;
  actorId: string;
  realActorId?: string;
  viaApiKey?: {
    id: string;
    name: string;
    prefix: string;
  };
  action: AuditAction;
  target?: {
    type: "user" | "apikey" | "team" | "session" | "invite";
    id: string;
  };
  metadata?: Record<string, any>;
  ip: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface RecoveryToken {
  _id: string;
  tokenHash: string;
  userId: string;
  createdBy: string;
  expiresAt: Date;
  used: boolean;
  usedAt?: Date;
}

export interface PlatformConfig {
  _id: "config";
  firstUserClaimed: boolean;
  claimedBy?: string;
}

// --- Auth Context (set by middleware, read by routes) ---

export interface AuthContext {
  userId: string;
  role: UserRole;
  teamId: string;
  platformRole: PlatformRole;
  authMethod: AuthMethod;
  roleVersion: number;
  scope?: ApiKeyScope;
  apiKeyMeta?: { id: string; name: string; prefix: string };
  realActorId?: string;
}

// --- OAuth Types ---

export interface OAuthProfile {
  provider: "github" | "google";
  providerId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  avatar?: string;
}

export interface FindOrCreateResult {
  user: User;
  isNew: boolean;
  joined?: { teamId: string; teamName: string };
  inviteError?: "expired" | "exhausted" | "not_found";
  emailUpdated?: { old: string; new: string };
}

// --- API Response Types ---

export interface TokenResponse {
  accessToken: string;
  isNew: boolean;
  joined?: { teamId: string; teamName: string };
  inviteError?: "expired" | "exhausted" | "not_found";
}

export interface AuthError {
  error: {
    code: string;
    message: string;
    action: "refresh" | "login" | "show_deletion_notice" | "none";
    deletionDate?: string;
  };
}
