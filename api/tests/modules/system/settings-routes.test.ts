import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import { connectMongo, disconnectMongo, getDb } from "../../../src/infrastructure/mongo";
import {
  setUserLLMKey,
  getUserSettings,
  getDecryptedLLMKey,
  removeUserLLMKey,
  maskApiKey,
} from "../../../src/infrastructure/user-settings";
import { settingsRoutes } from "../../../src/modules/system/settings-routes";

// Test the infrastructure directly
describe("User settings", () => {
  beforeAll(async () => {
    await connectMongo("mongodb://localhost:27017/gambit-test");
    await getDb().collection("userSettings").deleteMany({});
  });

  afterAll(async () => {
    await getDb().collection("userSettings").deleteMany({});
    await disconnectMongo();
  });

  it("stores and retrieves encrypted key", async () => {
    await setUserLLMKey("test-user", "anthropic", "sk-ant-api03-test-key-12345");
    const settings = await getUserSettings("test-user");
    expect(settings).toBeDefined();
    expect(settings!.llmProvider).toBe("anthropic");
    // Stored key should be encrypted (not plaintext)
    expect(settings!.llmApiKey).not.toBe("sk-ant-api03-test-key-12345");
    expect(settings!.llmApiKey).toContain(":");
  });

  it("decrypts key correctly", async () => {
    const result = await getDecryptedLLMKey("test-user");
    expect(result).toBeDefined();
    expect(result!.apiKey).toBe("sk-ant-api03-test-key-12345");
    expect(result!.provider).toBe("anthropic");
  });

  it("masks API keys", () => {
    expect(maskApiKey("sk-ant-api03-abcdef12345xyz")).toContain("...");
    expect(maskApiKey("sk-ant-api03-abcdef12345xyz")).toContain("****");
    expect(maskApiKey("short")).toBe("****");
  });

  it("removes user settings", async () => {
    await removeUserLLMKey("test-user");
    const settings = await getUserSettings("test-user");
    expect(settings).toBeNull();
  });

  it("returns null for nonexistent user", async () => {
    const result = await getDecryptedLLMKey("nonexistent");
    expect(result).toBeNull();
  });
});
