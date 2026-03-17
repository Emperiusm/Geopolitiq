import { Hono } from "hono";
import {
  getUserSettings,
  setUserLLMKey,
  removeUserLLMKey,
  maskApiKey,
} from "../../infrastructure/user-settings";
import { success, apiError, validationError } from "../../helpers/response";
import type { LLMProvider } from "../../types";

export const settingsRoutes = new Hono();

// For now, use a simple userId from header (X-User-Id). In production this would come from auth.
function getUserId(c: any): string {
  return c.req.header("x-user-id") || "default";
}

settingsRoutes.put("/ai", async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();
  const { provider, apiKey, model } = body;

  if (!provider || !["anthropic", "openai"].includes(provider)) {
    return validationError(c, "provider must be 'anthropic' or 'openai'");
  }
  if (!apiKey || typeof apiKey !== "string" || apiKey.length < 10) {
    return validationError(c, "apiKey is required (minimum 10 characters)");
  }

  // Validate key with a minimal API call
  const valid = await validateLLMKey(provider as LLMProvider, apiKey);
  if (!valid.ok) {
    return apiError(c, "INVALID_KEY", valid.error || "API key validation failed", 400);
  }

  await setUserLLMKey(userId, provider as LLMProvider, apiKey, model);
  return success(c, { provider, model: model || null, aiAnalysisEnabled: true });
});

settingsRoutes.get("/ai", async (c) => {
  const userId = getUserId(c);
  const settings = await getUserSettings(userId);
  if (!settings) {
    return success(c, { aiAnalysisEnabled: false });
  }
  return success(c, {
    provider: settings.llmProvider,
    model: settings.llmModel || null,
    apiKey: maskApiKey(settings.llmApiKey), // show encrypted string masked, not decrypted
    aiAnalysisEnabled: settings.aiAnalysisEnabled,
  });
});

settingsRoutes.delete("/ai", async (c) => {
  const userId = getUserId(c);
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
      // 200 or 400 (bad request but key valid) = key works. 401 = invalid key.
      if (res.status === 401) return { ok: false, error: "Invalid Anthropic API key" };
      return { ok: true };
    } else {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` },
      });
      if (res.status === 401) return { ok: false, error: "Invalid OpenAI API key" };
      return { ok: true };
    }
  } catch (err: any) {
    // Network error — accept the key anyway (might be offline)
    return { ok: true };
  }
}
