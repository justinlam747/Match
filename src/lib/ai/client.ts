/**
 * Unified AI client — supports BYOK (user keys) and server keys.
 *
 * Key resolution order:
 *   1. User's own key (stored encrypted in DB) — if userId is provided
 *   2. Server-level env var (ANTHROPIC_API_KEY / OPENAI_API_KEY)
 *
 * Provider priority: anthropic → openai (override with AI_PROVIDER env var)
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { logLlmCall } from "./log";

export type Provider = "anthropic" | "openai";
export type ModelTier = "fast" | "smart";

const MODELS = {
  anthropic: {
    fast: "claude-haiku-4-5-20251001",
    smart: "claude-sonnet-4-6-20250514",
  },
  openai: {
    fast: "gpt-4o-mini",
    smart: "gpt-4o",
  },
} as const;

interface ResolvedKey {
  provider: Provider;
  apiKey: string;
}

async function getUserKey(userId: string, provider: Provider): Promise<string | null> {
  try {
    const [row] = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)))
      .limit(1);

    if (!row) return null;
    return decrypt(row.encryptedKey, row.iv, row.authTag);
  } catch {
    return null;
  }
}

async function resolveKey(userId?: string): Promise<ResolvedKey> {
  const forced = process.env.AI_PROVIDER as Provider | undefined;
  const preferredOrder: Provider[] =
    forced === "openai" ? ["openai", "anthropic"] : ["anthropic", "openai"];

  // 1. Check user's BYOK keys
  if (userId) {
    for (const provider of preferredOrder) {
      const key = await getUserKey(userId, provider);
      if (key) return { provider, apiKey: key };
    }
  }

  // 2. Fall back to server env vars
  for (const provider of preferredOrder) {
    const envKey =
      provider === "anthropic"
        ? process.env.ANTHROPIC_API_KEY
        : process.env.OPENAI_API_KEY;
    if (envKey) return { provider, apiKey: envKey };
  }

  throw new Error("No AI API key found. Add your key in Settings or set ANTHROPIC_API_KEY / OPENAI_API_KEY.");
}

export async function chatCompletion(opts: {
  tier: ModelTier;
  system: string;
  prompt: string;
  maxTokens?: number;
  userId?: string;
}): Promise<string> {
  const { provider, apiKey } = await resolveKey(opts.userId);
  const model = MODELS[provider][opts.tier];
  const maxTokens = opts.maxTokens ?? 2048;
  const start = performance.now();

  try {
    if (provider === "anthropic") {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        system: opts.system,
        messages: [{ role: "user", content: opts.prompt }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      logLlmCall({
        userId: opts.userId,
        provider,
        model,
        endpoint: "chat",
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
        latencyMs: Math.round(performance.now() - start),
        status: "success",
        metadata: { tier: opts.tier },
      });
      return text;
    }

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
      provider,
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
      provider,
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
