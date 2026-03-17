// api/src/modules/system/team-settings-routes.ts
// Team settings routes: AI configuration management with encryption.

import { Hono } from "hono";
import { getDb } from "../../infrastructure/mongo";
import {
  encrypt,
  decrypt,
  maskApiKey,
} from "../../infrastructure/user-settings";
import { success, validationError } from "../../helpers/response";
import { requireRole } from "../../middleware/require-role";
import type { LLMProvider } from "../../types";

export const teamSettingsRoutes = new Hono();

// GET /ai — get team AI config (member+)
teamSettingsRoutes.get(
  "/ai",
  requireRole("member"),
  async (c) => {
    const teamId = c.get("teamId") as string;
    const db = getDb();

    const teamSettings = await db
      .collection("teamSettings")
      .findOne({ _id: teamId });

    if (!teamSettings) {
      return success(c, { aiAnalysisEnabled: false });
    }

    // Decrypt the key first, then mask the plaintext
    let maskedKey = null;
    if (teamSettings.apiKey) {
      try {
        const decryptedKey = decrypt(teamSettings.apiKey);
        maskedKey = maskApiKey(decryptedKey);
      } catch {
        // If decryption fails, mask the encrypted value instead
        maskedKey = maskApiKey(teamSettings.apiKey);
      }
    }

    return success(c, {
      provider: teamSettings.provider,
      apiKey: maskedKey,
      aiAnalysisEnabled: teamSettings.aiAnalysisEnabled ?? true,
    });
  },
);

// PUT /ai — set team BYOK key (admin+)
teamSettingsRoutes.put(
  "/ai",
  requireRole("admin"),
  async (c) => {
    const teamId = c.get("teamId") as string;

    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return validationError(c, "Request body must be valid JSON");
    }

    const { provider, apiKey } = body;

    // Validate provider
    if (!provider || !["anthropic", "openai"].includes(provider)) {
      return validationError(
        c,
        "provider must be 'anthropic' or 'openai'",
      );
    }

    // Validate apiKey
    if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
      return validationError(
        c,
        "apiKey is required (minimum 10 characters)",
      );
    }

    const encryptedKey = encrypt(apiKey);
    const now = new Date();

    const db = getDb();
    await db.collection("teamSettings").updateOne(
      { _id: teamId },
      {
        $set: {
          provider: provider as LLMProvider,
          apiKey: encryptedKey,
          aiAnalysisEnabled: true,
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );

    const maskedKey = maskApiKey(apiKey);
    return success(c, {
      provider,
      apiKey: maskedKey,
      aiAnalysisEnabled: true,
    });
  },
);

// DELETE /ai — remove team BYOK key (admin+)
teamSettingsRoutes.delete(
  "/ai",
  requireRole("admin"),
  async (c) => {
    const teamId = c.get("teamId") as string;
    const db = getDb();

    await db.collection("teamSettings").deleteOne({ _id: teamId });

    return success(c, { deleted: true });
  },
);
