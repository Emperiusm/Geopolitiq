import { getDb } from "./mongo";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import type { LLMProvider } from "../types";

const COLLECTION = "userSettings";

function getEncryptionKey(): Buffer {
  const hex = process.env.SETTINGS_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted (all base64)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const [ivB64, tagB64, dataB64] = ciphertext.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 7) + "..." + "****" + key.slice(-4);
}

export async function getUserSettings(userId: string) {
  const db = getDb();
  return db.collection(COLLECTION).findOne({ _id: userId });
}

export async function setUserLLMKey(
  userId: string,
  provider: LLMProvider,
  apiKey: string,
  model?: string,
): Promise<void> {
  const db = getDb();
  const now = new Date();
  await db.collection(COLLECTION).updateOne(
    { _id: userId },
    {
      $set: {
        llmProvider: provider,
        llmApiKey: encrypt(apiKey),
        llmModel: model,
        aiAnalysisEnabled: true,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );
}

export async function removeUserLLMKey(userId: string): Promise<void> {
  const db = getDb();
  await db.collection(COLLECTION).deleteOne({ _id: userId });
}

export async function getDecryptedLLMKey(userId: string): Promise<{
  provider: LLMProvider;
  apiKey: string;
  model: string;
} | null> {
  const settings = await getUserSettings(userId);
  if (!settings || !settings.aiAnalysisEnabled) return null;
  try {
    return {
      provider: settings.llmProvider,
      apiKey: decrypt(settings.llmApiKey),
      model: settings.llmModel || (settings.llmProvider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o"),
    };
  } catch {
    return null;
  }
}
