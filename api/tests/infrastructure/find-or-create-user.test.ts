import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import { connectMongo, disconnectMongo, getDb } from "../../src/infrastructure/mongo";
import { findOrCreateUser } from "../../src/infrastructure/auth";
import { randomUUID } from "crypto";
import type { OAuthProfile } from "../../src/types/auth";

beforeAll(async () => {
  await connectMongo("mongodb://localhost:27017/gambit-test");
});

beforeEach(async () => {
  const db = getDb();
  await db.collection("users").deleteMany({});
  await db.collection("teams").deleteMany({});
  await db.collection("notificationPreferences").deleteMany({});
  await db.collection("platformConfig").deleteMany({});
  await db.collection("apiKeys").deleteMany({});
});

afterAll(async () => {
  const db = getDb();
  await db.collection("users").deleteMany({});
  await db.collection("teams").deleteMany({});
  await db.collection("notificationPreferences").deleteMany({});
  await db.collection("platformConfig").deleteMany({});
  await db.collection("apiKeys").deleteMany({});
  await disconnectMongo();
});

const profile: OAuthProfile = {
  provider: "github",
  providerId: "gh-123",
  email: "test@example.com",
  emailVerified: true,
  name: "Test User",
  avatar: "https://example.com/avatar.png",
};

describe("findOrCreateUser", () => {
  describe("organic new user (first user to claim platformConfig = platform admin)", () => {
    it("creates user, team, and sets platformRole to admin when platformConfig has firstUserClaimed=false", async () => {
      // Pre-seed platformConfig so first signup claims the admin slot
      const db = getDb();
      await db.collection("platformConfig").insertOne({
        _id: "config",
        firstUserClaimed: false,
      });

      const result = await findOrCreateUser(profile);
      expect(result.isNew).toBe(true);
      expect(result.user.email).toBe("test@example.com");
      expect(result.user.platformRole).toBe("admin");
      expect(result.user.role).toBe("owner");
      expect(result.user.roleVersion).toBe(0);

      const team = await db.collection("teams").findOne({ _id: result.user.teamId });
      expect(team).not.toBeNull();
      expect(team!.ownerId).toBe(result.user._id);

      const notifPrefs = await db.collection("notificationPreferences").findOne({ _id: result.user._id });
      expect(notifPrefs).not.toBeNull();
      expect(notifPrefs!.loginAlerts).toBe(true);
    });

    it("creates personal team with user's name", async () => {
      const db = getDb();
      await db.collection("platformConfig").insertOne({
        _id: "config",
        firstUserClaimed: false,
      });

      const result = await findOrCreateUser(profile);
      const team = await db.collection("teams").findOne({ _id: result.user.teamId });
      expect(team!.name).toBe("Test User's Team");
      expect(team!.plan).toBe("free");
      expect(team!.inviteCodes).toEqual([]);
      expect(team!.watchlist).toEqual([]);
    });
  });

  describe("organic new user (regular user when platformConfig already claimed)", () => {
    it("creates user with platformRole user when firstUserClaimed is true", async () => {
      const db = getDb();
      await db.collection("platformConfig").insertOne({
        _id: "config",
        firstUserClaimed: true,
        claimedBy: "someone-else",
      });

      const result = await findOrCreateUser(profile);
      expect(result.isNew).toBe(true);
      expect(result.user.platformRole).toBe("user");
      expect(result.user.role).toBe("owner");
    });

    it("creates user with platformRole user when no platformConfig exists yet (first request wins next)", async () => {
      // On a totally clean DB, first call has no platformConfig doc to match,
      // so it gets "user", then the upsert creates the doc with firstUserClaimed=false
      const result = await findOrCreateUser(profile);
      expect(result.isNew).toBe(true);
      // platformRole is "user" because findOneAndUpdate found no matching doc
      expect(result.user.platformRole).toBe("user");

      // The upsert should have created the config doc
      const db = getDb();
      const config = await db.collection("platformConfig").findOne({ _id: "config" });
      expect(config).not.toBeNull();
      expect(config!.firstUserClaimed).toBe(false);
    });
  });

  describe("returning user", () => {
    it("finds existing user by provider + providerId", async () => {
      const first = await findOrCreateUser(profile);
      const second = await findOrCreateUser(profile);
      expect(second.isNew).toBe(false);
      expect(second.user._id).toBe(first.user._id);
    });

    it("updates avatar when customAvatar is false", async () => {
      await findOrCreateUser(profile);
      const result = await findOrCreateUser({
        ...profile,
        avatar: "https://example.com/new-avatar.png",
      });
      expect(result.user.avatar).toBe("https://example.com/new-avatar.png");
    });

    it("does not update avatar when customAvatar is true", async () => {
      const db = getDb();
      const first = await findOrCreateUser(profile);
      await db.collection("users").updateOne(
        { _id: first.user._id },
        { $set: { customAvatar: true } },
      );

      const result = await findOrCreateUser({
        ...profile,
        avatar: "https://example.com/new-avatar.png",
      });
      expect(result.user.avatar).toBe(profile.avatar);
    });

    it("returns isNew=false", async () => {
      await findOrCreateUser(profile);
      const result = await findOrCreateUser(profile);
      expect(result.isNew).toBe(false);
    });
  });

  describe("account linking by email", () => {
    it("links new provider to existing user with same verified email", async () => {
      await findOrCreateUser(profile);
      const googleProfile: OAuthProfile = {
        provider: "google",
        providerId: "g-789",
        email: "test@example.com",
        emailVerified: true,
        name: "Test via Google",
        avatar: "https://google.com/photo.jpg",
      };
      const result = await findOrCreateUser(googleProfile);
      expect(result.isNew).toBe(false);
      expect(result.user.providers).toHaveLength(2);
      expect(result.user.providers.some((p: any) => p.provider === "google")).toBe(true);
    });

    it("preserves original user _id when linking provider", async () => {
      const first = await findOrCreateUser(profile);
      const googleProfile: OAuthProfile = {
        provider: "google",
        providerId: "g-999",
        email: "test@example.com",
        emailVerified: true,
        name: "Test via Google",
        avatar: "https://google.com/photo.jpg",
      };
      const result = await findOrCreateUser(googleProfile);
      expect(result.user._id).toBe(first.user._id);
    });

    it("does not create a second user when linking by email", async () => {
      await findOrCreateUser(profile);
      const googleProfile: OAuthProfile = {
        provider: "google",
        providerId: "g-link-test",
        email: "test@example.com",
        emailVerified: true,
        name: "Test via Google",
        avatar: undefined,
      };
      await findOrCreateUser(googleProfile);

      const db = getDb();
      const count = await db.collection("users").countDocuments({ email: "test@example.com" });
      expect(count).toBe(1);
    });
  });

  describe("unverified email rejection", () => {
    it("rejects login when email is not verified and no existing provider match", async () => {
      await expect(
        findOrCreateUser({ ...profile, emailVerified: false }),
      ).rejects.toThrow();
    });

    it("allows returning user with unverified email if provider already linked", async () => {
      // First, create with verified email
      const first = await findOrCreateUser(profile);
      // Second login with same provider/providerId but emailVerified=false should still work
      const result = await findOrCreateUser({ ...profile, emailVerified: false });
      expect(result.isNew).toBe(false);
      expect(result.user._id).toBe(first.user._id);
    });
  });

  describe("invite flow", () => {
    // NOTE: The $expr in findOneAndUpdate compares the entire invite entry object
    // (BSON type: Object) to maxUses (BSON type: Number). In BSON ordering, Object > Number,
    // so the $lt comparison is always false and findOneAndUpdate never matches.
    // The invite flow therefore always falls back to the error-detection path.
    // For a valid code (exists, not expired), the error path returns "exhausted"
    // because the expiry check passes but the $expr still fails.

    it("creates user in invite team with invite role", async () => {
      const db = getDb();
      const teamId = randomUUID();
      const inviteCode = "INV-TEST-123";

      await db.collection("teams").insertOne({
        _id: teamId,
        name: "Invite Team",
        slug: "invite-team",
        plan: "free",
        ownerId: "admin-id",
        watchlist: [],
        inviteCodes: [
          {
            code: inviteCode,
            role: "member" as const,
            createdBy: "admin-id",
            expiresAt: new Date(Date.now() + 86400000),
            maxUses: 10,
            uses: 0,
            usedBy: [],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.collection("platformConfig").insertOne({
        _id: "config",
        firstUserClaimed: true,
        claimedBy: "admin-id",
      });

      const result = await findOrCreateUser(
        { ...profile, providerId: "gh-invite-test" },
        inviteCode,
      );
      expect(result.isNew).toBe(true);
      expect(result.user.teamId).toBe(teamId);
      expect(result.user.role).toBe("member");
      expect(result.joined).toBeTruthy();
      expect(result.joined!.teamId).toBe(teamId);
      expect(result.joined!.teamName).toBe("Invite Team");
      expect(result.inviteError).toBeUndefined();
    });

    it("increments invite code uses on successful join", async () => {
      const db = getDb();
      const teamId = randomUUID();
      const inviteCode = "INV-USE-COUNT";

      await db.collection("teams").insertOne({
        _id: teamId,
        name: "Count Team",
        slug: "count-team",
        plan: "free",
        ownerId: "admin-id",
        watchlist: [],
        inviteCodes: [
          {
            code: inviteCode,
            role: "viewer" as const,
            createdBy: "admin-id",
            expiresAt: new Date(Date.now() + 86400000),
            maxUses: 5,
            uses: 0,
            usedBy: [],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.collection("platformConfig").insertOne({
        _id: "config",
        firstUserClaimed: true,
        claimedBy: "admin-id",
      });

      await findOrCreateUser(
        { ...profile, providerId: "gh-count-test" },
        inviteCode,
      );

      const team = await db.collection("teams").findOne({ _id: teamId });
      const invite = team!.inviteCodes.find((ic: any) => ic.code === inviteCode);
      expect(invite.uses).toBe(1);
    });

    it("returns inviteError=not_found when code does not exist", async () => {
      const result = await findOrCreateUser(
        { ...profile, providerId: "gh-bad-invite" },
        "NON-EXISTENT-CODE",
      );
      expect(result.isNew).toBe(true);
      expect(result.inviteError).toBe("not_found");
      // Falls back to organic user creation
      expect(result.user.role).toBe("owner");
    });

    it("returns inviteError=expired when code is past expiresAt", async () => {
      const db = getDb();
      const teamId = randomUUID();
      const inviteCode = "INV-EXPIRED";

      await db.collection("teams").insertOne({
        _id: teamId,
        name: "Expired Team",
        slug: "expired-team",
        plan: "free",
        ownerId: "admin-id",
        watchlist: [],
        inviteCodes: [
          {
            code: inviteCode,
            role: "member" as const,
            createdBy: "admin-id",
            expiresAt: new Date(Date.now() - 1000), // already expired
            maxUses: 10,
            uses: 0,
            usedBy: [],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await findOrCreateUser(
        { ...profile, providerId: "gh-expired-invite" },
        inviteCode,
      );
      expect(result.isNew).toBe(true);
      expect(result.inviteError).toBe("expired");
      // Falls back to organic user creation
      expect(result.user.role).toBe("owner");
    });

    it("joins invite team directly without creating personal team", async () => {
      const db = getDb();
      const teamId = randomUUID();
      const inviteCode = "INV-DIRECT-JOIN";

      await db.collection("teams").insertOne({
        _id: teamId,
        name: "Shared Team",
        slug: "shared-team",
        plan: "free",
        ownerId: "admin-id",
        watchlist: [],
        inviteCodes: [
          {
            code: inviteCode,
            role: "member" as const,
            createdBy: "admin-id",
            expiresAt: new Date(Date.now() + 86400000),
            maxUses: 10,
            uses: 0,
            usedBy: [],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.collection("platformConfig").insertOne({
        _id: "config",
        firstUserClaimed: true,
        claimedBy: "admin-id",
      });

      const result = await findOrCreateUser(
        { ...profile, providerId: "gh-no-personal" },
        inviteCode,
      );

      // User joins the invite team directly — no personal team created
      const teamCount = await db.collection("teams").countDocuments();
      expect(teamCount).toBe(1); // only the invite team
      expect(result.user.role).toBe("member");
      expect(result.user.teamId).toBe(teamId);
    });
  });

  describe("deletion cancellation on login", () => {
    it("cancels pending deletion when user logs in", async () => {
      const db = getDb();
      const first = await findOrCreateUser(profile);

      await db.collection("users").updateOne(
        { _id: first.user._id },
        {
          $set: {
            deletionRequestedAt: new Date(),
            deletedAt: new Date(Date.now() + 86400000),
          },
        },
      );

      const result = await findOrCreateUser(profile);
      expect(result.isNew).toBe(false);

      // Check that deletion fields were cleared (set to null)
      const updatedUser = await db.collection("users").findOne({ _id: first.user._id });
      expect(updatedUser?.deletionRequestedAt).toBeFalsy();
      expect(updatedUser?.deletedAt).toBeFalsy();
    });

    it("re-enables API keys when deletion is cancelled", async () => {
      const db = getDb();
      const first = await findOrCreateUser(profile);

      // Set user as pending deletion
      await db.collection("users").updateOne(
        { _id: first.user._id },
        {
          $set: {
            deletionRequestedAt: new Date(),
            deletedAt: new Date(Date.now() + 86400000),
          },
        },
      );

      // Insert a disabled API key for this user
      const apiKeyId = randomUUID();
      const uniqueKeyHash = randomUUID().replace(/-/g, "");
      await db.collection("apiKeys").insertOne({
        _id: apiKeyId,
        userId: first.user._id,
        teamId: first.user.teamId,
        name: "Test Key",
        keyHash: uniqueKeyHash,
        keyPrefix: "gam_",
        scope: "read",
        disabled: true,
        disabledAt: new Date(),
        lastUsedAt: null,
        createdAt: new Date(),
      });

      await findOrCreateUser(profile);

      const key = await db.collection("apiKeys").findOne({ _id: apiKeyId });
      expect(key!.disabled).toBe(false);
      expect(key!.disabledAt).toBeNull();
    });
  });

  describe("notification preferences", () => {
    it("creates notification preferences for every new user", async () => {
      const result = await findOrCreateUser(profile);
      const db = getDb();
      const notifPrefs = await db.collection("notificationPreferences").findOne({ _id: result.user._id });
      expect(notifPrefs).not.toBeNull();
      expect(notifPrefs!.loginAlerts).toBe(true);
      expect(notifPrefs!.teamInvites).toBe(true);
      expect(notifPrefs!.anomalyDigest).toBe("daily");
    });

    it("creates notification preferences for invite-flow users", async () => {
      const db = getDb();
      const teamId = randomUUID();
      const inviteCode = "INV-NOTIF-TEST";

      await db.collection("teams").insertOne({
        _id: teamId,
        name: "Notif Team",
        slug: "notif-team",
        plan: "free",
        ownerId: "admin-id",
        watchlist: [],
        inviteCodes: [
          {
            code: inviteCode,
            role: "member" as const,
            createdBy: "admin-id",
            expiresAt: new Date(Date.now() + 86400000),
            maxUses: 5,
            uses: 0,
            usedBy: [],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.collection("platformConfig").insertOne({
        _id: "config",
        firstUserClaimed: true,
        claimedBy: "admin-id",
      });

      const result = await findOrCreateUser(
        { ...profile, providerId: "gh-notif-invite" },
        inviteCode,
      );

      const notifPrefs = await db.collection("notificationPreferences").findOne({ _id: result.user._id });
      expect(notifPrefs).not.toBeNull();
      expect(notifPrefs!.loginAlerts).toBe(true);
    });
  });
});
