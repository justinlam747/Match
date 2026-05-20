import { chatCompletion } from "@/lib/ai/client";
import type { ResearchSignals } from "@/lib/db/schema";
import type { ScrapedPage } from "./company-scraper";
import type { TavilyResponse } from "./tavily";

const SUMMARIZER_SYSTEM = `You research startups for a job-matching system. Read the provided website content and web-search results, then produce a tight JSON summary of what the company actually does and what working there would look like.

Output ONLY valid JSON matching:
{
  "summary": string,
  "techSignals": string[],
  "recentNews": string[],
  "teamSignals": string[],
  "cultureSignals": string[],
  "productFocus": string | null,
  "fundingStage": string | null
}

Rules:
- "summary": 3-5 sentence narrative — what they build, who for, where they are.
- "techSignals": 0-10 specific tech items the company actually mentions (e.g. "React Native", "Postgres + pgvector"). No generics like "modern stack".
- "recentNews": 0-5 launches, funding rounds, partnerships — include year/date when stated.
- "teamSignals": 0-5 hiring posture, team size, notable engineers.
- "cultureSignals": 0-5 remote policy, work style, values cited.
- "productFocus": one phrase, e.g. "vertical SaaS for dental clinics".
- "fundingStage": "pre-seed" | "seed" | "series-a" | etc. — only if stated explicitly.
- Only assert things the source material supports. Use null / empty arrays when absent.`;

export interface SummarizerOutput extends ResearchSignals {
  summary: string;
}

interface SummarizeArgs {
  companyName: string;
  scrapedPages: ScrapedPage[];
  tavily: TavilyResponse | null;
  userId?: string;
}

export async function summarizeResearch({
  companyName,
  scrapedPages,
  tavily,
  userId,
}: SummarizeArgs): Promise<SummarizerOutput> {
  const websiteText = scrapedPages
    .map((p) => `## ${p.title ?? p.url}\n${p.text}`)
    .join("\n\n---\n\n");

  const tavilyText =
    tavily?.results
      .map((r) => `## ${r.title}\n${r.url}\n${r.raw_content ?? r.content}`)
      .join("\n\n---\n\n") ?? "";

  const tavilyAnswer = tavily?.answer ? `Quick answer: ${tavily.answer}\n\n` : "";

  const prompt = `Company: ${companyName}

${tavilyAnswer}--- Their website ---
${websiteText || "(no website content)"}

--- Web search results ---
${tavilyText || "(no web search)"}`;

  const raw = await chatCompletion({
    tier: "fast",
    system: SUMMARIZER_SYSTEM,
    prompt: prompt.slice(0, 20000),
    maxTokens: 1200,
    userId,
  });

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Summarizer LLM returned no JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]) as Partial<SummarizerOutput>;

  return {
    summary: parsed.summary || "",
    techSignals: Array.isArray(parsed.techSignals) ? parsed.techSignals : [],
    recentNews: Array.isArray(parsed.recentNews) ? parsed.recentNews : [],
    teamSignals: Array.isArray(parsed.teamSignals) ? parsed.teamSignals : [],
    cultureSignals: Array.isArray(parsed.cultureSignals)
      ? parsed.cultureSignals
      : [],
    productFocus: parsed.productFocus ?? null,
    fundingStage: parsed.fundingStage ?? null,
  };
}
