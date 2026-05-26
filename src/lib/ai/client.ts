/**
 * Unified AI client — OpenAI only.
 *
 * Key resolution order:
 *   1. User's own OpenAI key (stored encrypted in DB) — if userId is provided
 *   2. Server-level OPENAI_API_KEY
 */

import OpenAI from "openai";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { logLlmCall } from "./log";

export type ModelTier = "fast" | "smart";

const MODELS = {
  fast: "gpt-4o-mini",
  smart: "gpt-4o",
} as const;

async function getUserKey(userId: string): Promise<string | null> {
  try {
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, "openai")))
      .limit(1);

    if (!row) return null;
    return decrypt(row.encryptedKey, row.iv, row.authTag);
  } catch {
    return null;
  }
}

async function resolveKey(userId?: string): Promise<string> {
  // 1. User's BYOK OpenAI key
  if (userId) {
    const key = await getUserKey(userId);
    if (key) return key;
  }

  // 2. Server env var
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;

  throw new Error(
    "No OpenAI API key found. Add your key in Settings or set OPENAI_API_KEY."
  );
}

export async function chatCompletion(opts: {
  tier: ModelTier;
  system: string;
  prompt: string;
  maxTokens?: number;
  userId?: string;
}): Promise<string> {
  const apiKey = await resolveKey(opts.userId);
  const model = MODELS[opts.tier];
  const maxTokens = opts.maxTokens ?? 2048;
  const start = performance.now();

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.prompt },
      ],
    });
    const text = response.choices[0]?.message?.content ?? "";
    logLlmCall({
      userId: opts.userId,
      provider: "openai",
      model,
      endpoint: "chat",
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      latencyMs: Math.round(performance.now() - start),
      status: "success",
      metadata: { tier: opts.tier },
    });
    return text;
  } catch (err) {
    logLlmCall({
      userId: opts.userId,
      provider: "openai",
      model,
      endpoint: "chat",
      latencyMs: Math.round(performance.now() - start),
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error",
      metadata: { tier: opts.tier },
    });
    throw err;
  }
}
