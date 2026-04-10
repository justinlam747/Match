// Seed list of company portals adapted from career-ops (MIT).
// See THIRD_PARTY_LICENSES.md. Run via a separate script or admin action to
// insert these into the `portals` table (userId left null for system-owned seeds).

import type { AtsType } from "@/lib/scrapers/ats-router";

export interface PortalSeed {
  name: string;
  careersUrl: string;
  atsType: AtsType;
  notes?: string;
}

export const PORTAL_SEEDS: readonly PortalSeed[] = [
  { name: "Anthropic", careersUrl: "https://boards.greenhouse.io/anthropic", atsType: "greenhouse" },
  { name: "OpenAI", careersUrl: "https://jobs.ashbyhq.com/openai", atsType: "ashby" },
  { name: "Cohere", careersUrl: "https://jobs.lever.co/cohere", atsType: "lever" },
  { name: "Scale AI", careersUrl: "https://boards.greenhouse.io/scaleai", atsType: "greenhouse" },
  { name: "Mistral AI", careersUrl: "https://jobs.lever.co/mistral", atsType: "lever" },
  { name: "Perplexity", careersUrl: "https://jobs.ashbyhq.com/perplexity", atsType: "ashby" },
  { name: "Retool", careersUrl: "https://jobs.ashbyhq.com/retool", atsType: "ashby" },
  { name: "Supabase", careersUrl: "https://jobs.ashbyhq.com/supabase", atsType: "ashby" },
  { name: "LangChain", careersUrl: "https://jobs.ashbyhq.com/langchain", atsType: "ashby" },
  { name: "LlamaIndex", careersUrl: "https://jobs.ashbyhq.com/llamaindex", atsType: "ashby" },
  { name: "Pinecone", careersUrl: "https://boards.greenhouse.io/pinecone", atsType: "greenhouse" },
  { name: "Weights & Biases", careersUrl: "https://boards.greenhouse.io/wandb", atsType: "greenhouse" },
  { name: "Modal", careersUrl: "https://jobs.ashbyhq.com/modal", atsType: "ashby" },
  { name: "Replicate", careersUrl: "https://jobs.lever.co/replicate", atsType: "lever" },
  { name: "Together AI", careersUrl: "https://boards.greenhouse.io/togetherai", atsType: "greenhouse" },
  { name: "Fireworks AI", careersUrl: "https://jobs.ashbyhq.com/fireworks", atsType: "ashby" },
  { name: "Groq", careersUrl: "https://jobs.lever.co/groq", atsType: "lever" },
  { name: "Inflection", careersUrl: "https://boards.greenhouse.io/inflectionai", atsType: "greenhouse" },
];
