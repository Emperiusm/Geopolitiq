import { describe, it, expect } from "bun:test";
import type {
  User, Team, Session, AuthCode, ApiKey, UserPreferences,
  NotificationPreferences, TeamSettings, SavedView, AuditEvent,
  RecoveryToken, PlatformConfig, UserRole, PlatformRole,
  TeamPlan, ApiKeyScope, AuditAction, AuthMethod, AuthContext,
  OAuthProfile, FindOrCreateResult, TokenResponse, AuthError,
  EmailTemplate,
} from "../../src/types/auth";

describe("Auth types", () => {
  it("UserRole values are correct", () => {
    const roles: UserRole[] = ["owner", "admin", "member", "viewer"];
    expect(roles).toHaveLength(4);
  });

  it("PlatformRole values are correct", () => {
    const roles: PlatformRole[] = ["admin", "user"];
    expect(roles).toHaveLength(2);
  });

  it("AuthContext shape is valid", () => {
    const ctx: AuthContext = {
      userId: "abc",
      role: "member",
      teamId: "team-1",
      platformRole: "user",
      authMethod: "jwt",
      roleVersion: 1,
    };
    expect(ctx.userId).toBe("abc");
    expect(ctx.authMethod).toBe("jwt");
  });

  it("AuthContext with API key metadata", () => {
    const ctx: AuthContext = {
      userId: "abc",
      role: "member",
      teamId: "team-1",
      platformRole: "user",
      authMethod: "apikey",
      roleVersion: 1,
      scope: "read",
      apiKeyMeta: { id: "k1", name: "test", prefix: "gbt_abcd" },
    };
    expect(ctx.scope).toBe("read");
    expect(ctx.apiKeyMeta?.prefix).toBe("gbt_abcd");
  });

  it("TokenResponse shape is valid", () => {
    const res: TokenResponse = {
      accessToken: "jwt...",
      isNew: false,
    };
    expect(res.accessToken).toBeTruthy();
  });
});
