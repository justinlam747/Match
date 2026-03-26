/**
 * Free model inference for scoring.
 *
 * Supports multiple free providers (in priority order):
 *   1. Hugging Face Inference API (your fine-tuned model, free tier)
 *   2. Groq (Llama 3 70B, free tier — 30 req/min)
 *   3. Cloudflare Workers AI (free tier)
 *
 * Set one of these env vars:
 *   HF_MODEL_ID=your-username/yc-match-scorer   (+ HF_TOKEN optional)
 *   GROQ_API_KEY=gsk_...
 *   CF_ACCOUNT_ID=... + CF_API_TOKEN=...
 *
 * Falls back to Anthropic Claude if no free provider is configured.
 */

import type { ParsedResume } from "@/lib/db/schema";

interface ScoreOutput {
  techScore: number;
  industryScore: number;
  stageScore: number;
  hiringScore: number;
  explanation: string;
}

interface CompanyInput {
  name: string;
  description: string | null;
  industries: string[] | null;
  techStack: string[] | null;
  stage: string | null;
  batch: string | null;
  hiringSignals: {
    has_careers_page?: boolean;
    recent_job_posts?: number;
    eng_roles_open?: boolean;
  } | null;
}

const SYSTEM_PROMPT = `You are an expert technical recruiter scoring resume-company matches. You must output ONLY valid JSON.

Score each dimension 0-25:
- techScore: How well the candidate's technical skills match the company's stack.
- industryScore: How relevant the candidate's industry experience is.
- stageScore: How well the candidate's seniority fits the company stage.
- hiringScore: Based on hiring signals — is the company actively hiring engineers?

Also provide a 2-sentence explanation.

Output format (ONLY this JSON, nothing else):
{"techScore": N, "industryScore": N, "stageScore": N, "hiringScore": N, "explanation": "..."}`;

function buildUserPrompt(resume: ParsedResume, company: CompanyInput): string {
  const skills = [
    ...resume.skills.languages, ...resume.skills.frameworks,
    ...resume.skills.tools, ...resume.skills.databases,
    ...resume.skills.cloud, ...resume.skills.other,
  ].join(", ");

  const experience = resume.experience
    .map((e) => `${e.title} at ${e.company} (${e.industry}, ${e.duration_months}mo)`)
    .join("; ");

  const hiring = company.hiringSignals;
  const isHiring = hiring?.has_careers_page || (hiring?.recent_job_posts ?? 0) > 0 || hiring?.eng_roles_open;

  return `Score this match:

CANDIDATE:
- Summary: ${resume.seniority_level} engineer, ${resume.years_of_experience} years
- Skills: ${skills}
- Experience: ${experience}
- Industries: ${resume.industries_worked_in.join(", ")}
- Seniority: ${resume.seniority_level} (${resume.years_of_experience} years)

COMPANY: ${company.name} (YC ${company.batch || "unknown"}, ${company.stage || "seed"})
- Description: ${company.description || "N/A"}
- Tech stack: ${(company.techStack || []).join(", ")}
- Industries: ${(company.industries || []).join(", ")}
- Actively hiring: ${isHiring ? "Yes" : "No"}`;
}

function parseScoreOutput(text: string): ScoreOutput | null {
  try {
    // Extract JSON from response (handle markdown wrapping)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (
      typeof parsed.techScore === "number" &&
      typeof parsed.industryScore === "number" &&
      typeof parsed.stageScore === "number" &&
      typeof parsed.hiringScore === "number"
    ) {
      return {
        techScore: Math.min(25, Math.max(0, Math.round(parsed.techScore))),
        industryScore: Math.min(25, Math.max(0, Math.round(parsed.industryScore))),
        stageScore: Math.min(25, Math.max(0, Math.round(parsed.stageScore))),
        hiringScore: Math.min(25, Math.max(0, Math.round(parsed.hiringScore))),
        explanation: parsed.explanation || "",
      };
    }
  } catch {}
  return null;
}

/* ── Provider: Hugging Face Inference API ── */

async function callHuggingFace(userPrompt: string): Promise<string> {
  const modelId = process.env.HF_MODEL_ID;
  if (!modelId) throw new Error("HF_MODEL_ID not set");

  const response = await fetch(
    `https://api-inference.huggingface.co/models/${modelId}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.HF_TOKEN ? { Authorization: `Bearer ${process.env.HF_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 256,
        temperature: 0.1,
      }),
    }
  );

  if (!response.ok) throw new Error(`HF API error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/* ── Provider: Groq (free Llama 3) ── */

async function callGroq(userPrompt: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", // Free tier
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 256,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) throw new Error(`Groq API error: ${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

/* ── Provider: Cloudflare Workers AI ── */

async function callCloudflare(userPrompt: string): Promise<string> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) throw new Error("CF_ACCOUNT_ID or CF_API_TOKEN not set");

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 256,
        temperature: 0.1,
      }),
    }
  );

  if (!response.ok) throw new Error(`CF API error: ${response.status}`);
  const data = await response.json();
  return data.result?.response || "";
}

/* ── Main scoring function ── */

export async function scoreWithFreeModel(
  resume: ParsedResume,
  company: CompanyInput
): Promise<ScoreOutput> {
  const userPrompt = buildUserPrompt(resume, company);

  // Try providers in order
  const providers = [
    { name: "HuggingFace", fn: callHuggingFace, check: () => !!process.env.HF_MODEL_ID },
    { name: "Groq", fn: callGroq, check: () => !!process.env.GROQ_API_KEY },
    { name: "Cloudflare", fn: callCloudflare, check: () => !!process.env.CF_ACCOUNT_ID },
  ];

  for (const provider of providers) {
    if (!provider.check()) continue;

    try {
      const raw = await provider.fn(userPrompt);
      const result = parseScoreOutput(raw);
      if (result) return result;
    } catch (err) {
      console.warn(`${provider.name} failed:`, err);
    }
  }

  // Fallback: local heuristic scoring (no API needed)
  return localFallbackScore(resume, company);
}

/* ── Local fallback (zero API calls) ── */

function localFallbackScore(resume: ParsedResume, company: CompanyInput): ScoreOutput {
  // Tech score
  const resumeTech = new Set(
    [...resume.skills.languages, ...resume.skills.frameworks, ...resume.skills.tools,
     ...resume.skills.databases, ...resume.skills.cloud, ...resume.skills.other]
      .map((t) => t.toLowerCase())
  );
  const companyTech = new Set((company.techStack || []).map((t) => t.toLowerCase()));
  const overlap = [...resumeTech].filter((t) => companyTech.has(t));
  const techScore = companyTech.size > 0 ? Math.round((overlap.length / Math.max(companyTech.size, 1)) * 25) : 12;

  // Industry score
  const ri = new Set(resume.industries_worked_in.map((i) => i.toLowerCase()));
  const ci = new Set((company.industries || []).map((i) => i.toLowerCase()));
  const indOverlap = [...ri].filter((i) => ci.has(i));
  const industryScore = Math.round((indOverlap.length / Math.max(ci.size, 1)) * 25);

  // Stage score
  const stageMap: Record<string, Record<string, number>> = {
    intern: { seed: 20, series_a: 15, growth: 10 },
    junior: { seed: 22, series_a: 25, growth: 15 },
    mid: { seed: 18, series_a: 22, growth: 25 },
    senior: { seed: 25, series_a: 20, growth: 18 },
  };
  const stageScore = stageMap[resume.seniority_level]?.[company.stage || "seed"] || 12;

  // Hiring score
  let hiringScore = 5;
  const s = company.hiringSignals;
  if (s?.has_careers_page) hiringScore += 8;
  if ((s?.recent_job_posts ?? 0) > 0) hiringScore += 7;
  if (s?.eng_roles_open) hiringScore += 5;
  hiringScore = Math.min(hiringScore, 25);

  const overall = techScore + industryScore + hiringScore + stageScore;
  return {
    techScore,
    industryScore,
    stageScore,
    hiringScore,
    explanation: `${overall}/100 match. Tech overlap: ${overlap.join(", ") || "minimal"}. ${indOverlap.length > 0 ? `Shared industries: ${indOverlap.join(", ")}.` : "Different industry focus."}`,
  };
}

/* ── Batch scoring ── */

export async function scoreMatchesBatchFree(
  resume: ParsedResume,
  companies: CompanyInput[],
  concurrency = 5
): Promise<(ScoreOutput & { companyId: string; overallScore: number })[]> {
  const results: (ScoreOutput & { companyId: string; overallScore: number })[] = [];

  for (let i = 0; i < companies.length; i += concurrency) {
    const batch = companies.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (company) => {
        const scores = await scoreWithFreeModel(resume, company);
        return {
          ...scores,
          companyId: (company as any).id || "",
          overallScore: scores.techScore + scores.industryScore + scores.stageScore + scores.hiringScore,
        };
      })
    );
    results.push(...batchResults);

    // Rate limit for free tiers
    if (i + concurrency < companies.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return results.sort((a, b) => b.overallScore - a.overallScore);
}
