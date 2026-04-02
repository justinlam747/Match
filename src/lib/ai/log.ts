/**
 * LLM call logger — fire-and-forget insert into llm_logs.
 * Designed to never block or throw in the calling path.
 */

import { db } from "@/lib/db";
import { llmLogs } from "@/lib/db/schema";

// Cost per 1M tokens (in cents) — updated 2025-03
const COST_TABLE: Record<string, { input: number; output: number }> = {
  "claude-haiku-4-5-20251001": { input: 80, output: 400 },
  "claude-sonnet-4-6-20250514": { input: 300, output: 1500 },
  "gpt-4o-mini": { input: 15, output: 60 },
  "gpt-4o": { input: 250, output: 1000 },
  "text-embedding-3-small": { input: 2, output: 0 },
  "llama-3.3-70b-versatile": { input: 0, output: 0 }, // free tier
};

function estimateCostCents(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rates = COST_TABLE[model];
  if (!rates) return 0;
  return (
    (inputTokens / 1_000_000) * rates.input +
    (outputTokens / 1_000_000) * rates.output
  );
}

export interface LlmLogEntry {
  userId?: string;
  provider: string;
  model: string;
  endpoint: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  status: "success" | "error";
  error?: string;
  metadata?: Record<string, unknown>;
}

export function logLlmCall(entry: LlmLogEntry): void {
  const inputTokens = entry.inputTokens ?? 0;
  const outputTokens = entry.outputTokens ?? 0;
  const costCents = estimateCostCents(entry.model, inputTokens, outputTokens);

  // Fire-and-forget — never await, never throw
  db.insert(llmLogs)
    .values({
      userId: entry.userId ?? null,
      provider: entry.provider,
      model: entry.model,
      endpoint: entry.endpoint,
      inputTokens,
      outputTokens,
      costCents,
      latencyMs: entry.latencyMs,
      status: entry.status,
      error: entry.error ?? null,
      metadata: entry.metadata ?? null,
    })
    .then(() => {})
    .catch(() => {});
}
