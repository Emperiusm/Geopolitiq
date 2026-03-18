import { Hono } from "hono";
import {
  getUserSettings,
  setUserLLMKey,
  removeUserLLMKey,
  getDecryptedLLMKey,
  maskApiKey,
} from "../../infrastructure/user-settings";
import { success, apiError, validationError } from "../../helpers/response";
import { requireRole } from "../../middleware/require-role";
import type { LLMProvider } from "../../types";
import type { AppVariables } from "../../types/auth";

export const settingsRoutes = new Hono<{ Variables: AppVariables }>();

settingsRoutes.put("/ai", requireRole("member"), async (c) => {
  const userId = c.get("userId") as string;
  const body = await c.req.json();
  const { provider, apiKey, model } = body;

  if (!provider || !["anthropic", "openai"].includes(provider)) {
    return validationError(c, "provider must be 'anthropic' or 'openai'");
  }
  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
    return validationError(c, "apiKey is required (minimum 10 characters)");
  }

  const valid = await validateLLMKey(provider as LLMProvider, apiKey);
  if (!valid.ok) {
    return apiError(c, "INVALID_KEY", valid.error || "API key validation failed", 400);
  }

  await setUserLLMKey(userId, provider as LLMProvider, apiKey, model);
  return success(c, { provider, model: model || null, aiAnalysisEnabled: true });
});

settingsRoutes.get("/ai", async (c) => {
  const userId = c.get("userId") as string;
  const settings = await getUserSettings(userId);
  if (!settings) {
    return success(c, { aiAnalysisEnabled: false });
  }

  // Bug fix: decrypt first, then mask the plaintext (not the ciphertext)
  const decrypted = await getDecryptedLLMKey(userId);
  const maskedKey = decrypted ? maskApiKey(decrypted.apiKey) : null;

  return success(c, {
    provider: settings.llmProvider,
    model: settings.llmModel || null,
    apiKey: maskedKey,
    aiAnalysisEnabled: settings.aiAnalysisEnabled,
  });
});

settingsRoutes.delete("/ai", requireRole("member"), async (c) => {
  const userId = c.get("userId") as string;
  await removeUserLLMKey(userId);
  return success(c, { aiAnalysisEnabled: false });
});

async function validateLLMKey(
  provider: LLMProvider,
  apiKey: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (provider === "anthropic") {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1,
          messages: [{ role: "user", content: "test" }],
        }),
      });
      if (res.status === 401) return { ok: false, error: "Invalid Anthropic API key" };
      return { ok: true };
    } else {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (res.status === 401) return { ok: false, error: "Invalid OpenAI API key" };
      return { ok: true };
    }
  } catch {
    return { ok: true };
  }
}
