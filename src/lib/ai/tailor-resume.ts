// Adapted from career-ops (MIT). See THIRD_PARTY_LICENSES.md.

import { chatCompletion } from "@/lib/ai/client";
import type { ParsedResume } from "@/lib/db/schema";

export interface TailoredExperience {
  company: string;
  title: string;
  bullets: string[];
  techUsed: string[];
}

export interface TailoredResume {
  /** Original resume this was derived from. */
  sourceResumeId: string | null;
  /** Detected language of the JD (ISO 639-1), for international roles. */
  jdLanguage: string;
  /** 15-20 keywords extracted from the JD. */
  keywords: string[];
  /** Rewritten professional summary that weaves keywords into the real narrative. */
  summary: string;
  /** Keyword → "covered" | "gap" map used to compute coverage %. */
  keywordCoverage: Record<string, "covered" | "gap">;
  /** 0-100 integer: how many extracted keywords the tailored resume surfaces. */
  coveragePercent: number;
  /** Experience bullets reordered by JD relevance, keyword-enriched where truthful. */
  experience: TailoredExperience[];
  /** Top 3-4 projects/experiences most relevant to the JD. */
  featuredProjects: Array<{ title: string; description: string; tech: string[] }>;
  /** 6-8 keyword-grouped competency lines for the competency grid. */
  competencyGrid: Array<{ label: string; items: string[] }>;
}

const SYSTEM_PROMPT = `You are an ATS resume strategist adapting a candidate's genuine experience to a specific job description.

Your goal: surface the candidate's REAL, verifiable experience using the VOCABULARY of the job description so both ATS parsers and human reviewers immediately see alignment.

HARD RULES — no exceptions:
- NEVER fabricate experience, tech, metrics, companies, titles, or dates the candidate did not actually have.
- NEVER invent certifications, degrees, or outcomes.
- You MAY reformulate how real work is described using JD vocabulary (e.g. rewriting "built a queue" as "designed distributed task queue" if that maps to the same thing).
- If the candidate lacks a keyword genuinely, mark it as "gap" in keywordCoverage — do NOT lie to cover it.

OUTPUT — valid JSON only, matching this exact schema:
{
  "jdLanguage": "en" | "es" | "fr" | ... (ISO 639-1 of the JD text),
  "keywords": [ 15-20 strings — skills, tools, methodologies extracted from the JD ],
  "summary": "3-4 sentences, first person implicit, keyword-rich, tied to the candidate's real background",
  "keywordCoverage": { "keyword1": "covered" | "gap", ... } (one entry per keyword),
  "experience": [
    {
      "company": string,
      "title": string,
      "bullets": [ 3-5 rewritten bullets — real accomplishments using JD vocabulary, reordered by relevance ],
      "techUsed": [ subset of candidate's real tech for this role, prioritized by JD relevance ]
    }
  ],
  "featuredProjects": [
    { "title": string, "description": string, "tech": [ string ] }
  ] (3-4 projects max, pulled from the candidate's actual experience/standout_signals),
  "competencyGrid": [
    { "label": "Category label like 'Languages' or 'LLM Infra'", "items": [ string ] }
  ] (6-8 entries)
}

Style guidance:
- Bullets use strong verbs (designed, shipped, scaled, led) and include concrete metrics when the candidate's real highlights contain them.
- Summary must bridge candidate's career narrative to the target role — avoid generic "results-driven" filler.
- Competency grid groups related tools (e.g. "LLM / Eval tooling: LangChain, Langfuse, PromptFoo").
- Preserve chronological order within experience[] (most recent first), but the BULLETS within each role are reordered for relevance.`;

function buildPrompt(resume: ParsedResume, jdText: string): string {
  const skills = [
    ...resume.skills.languages,
    ...resume.skills.frameworks,
    ...resume.skills.tools,
    ...resume.skills.databases,
    ...resume.skills.cloud,
    ...resume.skills.other,
  ];

  const experience = resume.experience
    .map(
      (e) =>
        `- ${e.title} @ ${e.company} (${e.industry}, ${e.duration_months}mo)\n    highlights: ${e.highlights.join(" | ")}\n    tech: ${e.tech_used.join(", ")}`
    )
    .join("\n");

  const education = resume.education
    ? `${resume.education.degree} in ${resume.education.field}, ${resume.education.school} (${resume.education.year})`
    : "Not specified";

  return `<candidate>
Name: ${resume.name}
Seniority: ${resume.seniority_level} (${resume.years_of_experience} years)
Industries worked in: ${resume.industries_worked_in.join(", ")}
Standout signals: ${resume.standout_signals.join(" | ")}
All skills: ${skills.join(", ")}
Experience:
${experience}
Education: ${education}
</candidate>

<job_description>
${jdText.slice(0, 8000)}
</job_description>

Extract 15-20 JD keywords, then tailor the resume. Remember: reformulate, never fabricate.`;
}

function computeCoverage(keywordCoverage: Record<string, "covered" | "gap">): number {
  const entries = Object.values(keywordCoverage);
  if (entries.length === 0) return 0;
  const covered = entries.filter((v) => v === "covered").length;
  return Math.round((covered / entries.length) * 100);
}

/**
 * Generate a tailored-resume artifact from a candidate's parsed resume and a
 * target JD. The returned object is a structured representation — render it
 * with `renderTailoredResumePdf` to produce an ATS-compliant PDF.
 *
 * NOTE: This function does NOT fabricate experience. The LLM is instructed to
 * mark genuinely missing keywords as "gap" rather than hallucinate coverage.
 * Callers should surface the coveragePercent so candidates understand what's
 * honestly claimed vs genuinely missing.
 */
export async function tailorResume(
  resume: ParsedResume,
  jdText: string,
  opts?: { sourceResumeId?: string | null; userId?: string }
): Promise<TailoredResume> {
  const prompt = buildPrompt(resume, jdText);

  const raw = await chatCompletion({
    tier: "smart",
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 4096,
    userId: opts?.userId,
  });

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse tailored resume from AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]) as Omit<
    TailoredResume,
    "coveragePercent" | "sourceResumeId"
  >;

  // Defensive: make sure every keyword has a coverage entry (LLMs sometimes
  // omit a few). Missing entries default to "gap" so we don't silently inflate
  // coverage %.
  const coverage: Record<string, "covered" | "gap"> = {
    ...parsed.keywordCoverage,
  };
  for (const k of parsed.keywords) {
    if (!(k in coverage)) coverage[k] = "gap";
  }

  return {
    sourceResumeId: opts?.sourceResumeId ?? null,
    jdLanguage: parsed.jdLanguage || "en",
    keywords: parsed.keywords,
    summary: parsed.summary,
    keywordCoverage: coverage,
    coveragePercent: computeCoverage(coverage),
    experience: parsed.experience,
    featuredProjects: parsed.featuredProjects || [],
    competencyGrid: parsed.competencyGrid || [],
  };
}
