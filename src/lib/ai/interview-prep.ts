/**
 * Interview question generator — uses resume data, company info, and match scores
 * to produce tailored interview questions in proper interview flow order.
 *
 * High alignment (industry/tech scores) → deeper technical questions
 * Low alignment → more behavioral/transferable-skills questions
 */

import { chatCompletion } from "@/lib/ai/client";
import type { ParsedResume } from "@/lib/db/schema";

export type InterviewPhase =
  | "introduction"
  | "technical-deep-dive"
  | "system-design"
  | "behavioral"
  | "culture-fit"
  | "closing";
export type CompanyQuizPhase = "mission" | "product" | "market" | "culture" | "whyyou";

export interface StarAnswer {
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
}

export interface InterviewQuestion {
  phase: InterviewPhase;
  question: string;
  suggestedAnswer: string;
  tip: string;
  /** Present on behavioral / culture-fit questions where a STAR+Reflection
   * story is the expected answer shape. Not every question is a STAR one
   * (e.g. intro & closing), so this is optional. */
  star?: StarAnswer;
  /** Concrete JD requirement this question targets, when known. */
  jdRequirement?: string;
}

export interface CompanyQuizQuestion {
  phase: CompanyQuizPhase;
  question: string;
  suggestedAnswer: string;
  tip: string;
}

export interface InterviewPrepResult {
  companyName: string;
  archetype: string | null;
  questions: InterviewQuestion[];
  interviewStyle: "technical" | "mixed" | "behavioral";
}

export interface CompanyQuizResult {
  companyName: string;
  questions: CompanyQuizQuestion[];
  pagesScraped: number;
}

interface CompanyContext {
  name: string;
  description: string | null;
  industries: string[] | null;
  techStack: string[] | null;
  stage: string | null;
  batch: string | null;
}

interface ScoreContext {
  overallScore: number;
  techScore: number;
  industryScore: number;
  stageScore: number;
  hiringScore: number;
  explanation: string | null;
}

function determineStyle(scores: ScoreContext): "technical" | "mixed" | "behavioral" {
  const techIndustryAvg = (scores.techScore + scores.industryScore) / 2;
  if (techIndustryAvg >= 17) return "technical";
  if (techIndustryAvg >= 10) return "mixed";
  return "behavioral";
}

const SYSTEM_PROMPT = `You are an expert interview coach who prepares candidates for realistic company interviews.
You generate the questions a real interviewer would actually ask for a specific role and archetype, and for behavioral / culture questions you produce a STAR+Reflection answer grounded in the candidate's real experience.

You must output ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "phase": "introduction" | "technical-deep-dive" | "system-design" | "behavioral" | "culture-fit" | "closing",
      "question": "The interview question",
      "suggestedAnswer": "A strong suggested answer using the candidate's actual experience",
      "tip": "A brief coaching tip for delivering this answer",
      "jdRequirement": "The specific JD requirement this question targets, when applicable",
      "star": {
        "situation": "The concrete context from the candidate's real experience",
        "task": "What the candidate specifically owned",
        "action": "The steps the candidate took — specific and measurable",
        "result": "The outcome, with metrics where possible",
        "reflection": "What the candidate learned and how they'd apply it here"
      }
    }
  ]
}

Career-ops 6-phase interview flow (generate questions in this order):
1. **introduction** (2 questions) — motivation, elevator pitch, "why this company". NO star object.
2. **technical-deep-dive** (4 questions) — role-specific technical depth tied to JD requirements. star optional.
3. **system-design** (2-3 questions) — architecture / scaling / trade-offs. star optional.
4. **behavioral** (3 questions) — leadership, ownership, conflict. EVERY behavioral question MUST include a full star object.
5. **culture-fit** (2 questions) — values alignment, working style. star required.
6. **closing** (2 questions) — smart questions to ask the interviewer, next-step handling. NO star object.

Archetype tailoring:
- **solutions-architect / forward-deployed** → heavier system-design, more client-facing behavioral
- **platform-llmops / agentic-automation** → deeper technical-deep-dive on infra & evals
- **technical-pm / transformation-lead** → lighter system-design, more leadership behavioral + culture

Rules:
- Use the candidate's ACTUAL experience, skills, and projects — never generic filler
- Every STAR story must be specific: real company/project names from the resume, real metrics
- NEVER fabricate experience — if something doesn't exist in the resume, choose a different story
- For each technical-deep-dive & behavioral question, map to a specific JD requirement in jdRequirement when one applies
- Include one red-flag / "tell me about a time you failed" style behavioral question with a genuine reflection
- Tips should be actionable and one sentence
- Generate 14-16 questions total across all phases`;

function buildPrompt(
  resume: ParsedResume,
  company: CompanyContext,
  scores: ScoreContext,
  style: "technical" | "mixed" | "behavioral",
  archetype: string | null,
  jdRequirements: string[]
): string {
  const skills = [
    ...resume.skills.languages,
    ...resume.skills.frameworks,
    ...resume.skills.tools,
    ...resume.skills.databases,
    ...resume.skills.cloud,
    ...resume.skills.other,
  ].join(", ");

  const experience = resume.experience
    .map(
      (e) =>
        `${e.title} at ${e.company} (${e.industry}, ${e.duration_months}mo) — highlights: ${e.highlights.join("; ")} — tech: ${e.tech_used.join(", ")}`
    )
    .join("\n  ");

  const education = resume.education
    ? `${resume.education.degree} in ${resume.education.field} from ${resume.education.school} (${resume.education.year})`
    : "Not specified";

  return `<candidate>
Name: ${resume.name}
Skills: ${skills}
Experience:
  ${experience}
Education: ${education}
Industries: ${resume.industries_worked_in.join(", ")}
Seniority: ${resume.seniority_level} (${resume.years_of_experience} years)
Standout signals: ${resume.standout_signals.join(", ")}
</candidate>

<company>
Name: ${company.name} (YC ${company.batch || "unknown"}, stage: ${company.stage || "seed"})
Description: ${company.description || "N/A"}
Tech stack: ${(company.techStack || []).join(", ")}
Industries: ${(company.industries || []).join(", ")}
</company>

<match_context>
Overall match: ${scores.overallScore}/100
Tech alignment: ${scores.techScore}/25
Industry alignment: ${scores.industryScore}/25
Role archetype: ${archetype || "generalist"}
Key JD requirements to target:
${jdRequirements.length > 0 ? jdRequirements.map((r) => `  - ${r}`).join("\n") : "  (infer from company domain)"}
Match explanation: ${scores.explanation || "N/A"}
Interview style to emphasize: ${style.toUpperCase()}
${style === "technical" ? "The candidate's background strongly aligns with this company — go deep on technical questions specific to the company's stack and domain." : ""}
${style === "behavioral" ? "The candidate's background differs from this company's domain — emphasize transferable skills, learning agility, and motivation for the industry switch." : ""}
${style === "mixed" ? "The candidate has partial alignment — balance technical depth with behavioral questions about adaptability." : ""}
</match_context>

Generate the interview questions following the phase order. Make every suggested answer specific to THIS candidate's actual experience.`;
}

export async function generateInterviewPrep(
  resume: ParsedResume,
  company: CompanyContext,
  scores: ScoreContext,
  opts?: {
    archetype?: string | null;
    jdRequirements?: string[];
    userId?: string;
  }
): Promise<InterviewPrepResult> {
  const style = determineStyle(scores);
  const archetype = opts?.archetype ?? null;
  const jdRequirements = opts?.jdRequirements ?? [];
  const prompt = buildPrompt(resume, company, scores, style, archetype, jdRequirements);

  const raw = await chatCompletion({
    tier: "smart",
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 4096,
    userId: opts?.userId,
  });

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse interview questions from AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const questions: InterviewQuestion[] = parsed.questions;

  const phaseOrder = [
    "introduction",
    "technical-deep-dive",
    "system-design",
    "behavioral",
    "culture-fit",
    "closing",
  ] as const;
  questions.sort(
    (a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase)
  );

  return {
    companyName: company.name,
    archetype,
    questions,
    interviewStyle: style,
  };
}

/**
 * Collapse a generated prep session's behavioral & culture-fit STAR answers
 * into persistable story-bank rows. Used when a user explicitly saves a
 * prep session so they can reuse stories across similar roles.
 */
export function extractStarStories(
  prep: InterviewPrepResult
): Array<StarAnswer & { jdRequirement: string; archetype: string | null }> {
  return prep.questions
    .filter((q) => q.star && (q.phase === "behavioral" || q.phase === "culture-fit"))
    .map((q) => ({
      ...(q.star as StarAnswer),
      jdRequirement: q.jdRequirement || q.question,
      archetype: prep.archetype,
    }));
}

/* ── Company Quiz ── */

const COMPANY_QUIZ_SYSTEM = `You are an interview coach preparing a candidate to demonstrate deep knowledge of a specific company.
Using the scraped website content and company data, generate flashcard questions that test and teach the candidate about the company.

You must output ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "phase": "mission" | "product" | "market" | "culture" | "whyyou",
      "question": "The question an interviewer might ask",
      "suggestedAnswer": "A strong answer demonstrating company knowledge",
      "tip": "Brief coaching tip"
    }
  ]
}

Phases (generate in this order):
1. **mission** (3 questions) — Company mission, vision, founding story, "what does this company do?"
2. **product** (4 questions) — Product features, how it works, technical approach, key differentiators
3. **market** (3 questions) — Target customers, competitors, industry trends, market position
4. **culture** (3 questions) — Company values, team culture, work style, what makes it unique to work here
5. **whyyou** (3-4 questions) — "Why do you want to work here?", connecting the candidate's background to the company

Rules:
- Every answer must reference SPECIFIC details from the scraped website content — product names, features, metrics, quotes
- For "whyyou" questions, connect the candidate's actual experience to the company's mission and product
- If the website content is thin, use the YC company data to fill gaps but note when you're inferring
- Make suggested answers conversational — how a candidate would actually speak in an interview
- Tips should be one actionable sentence
- Generate 16-17 questions total`;

export async function generateCompanyQuiz(
  resume: ParsedResume,
  company: CompanyContext,
  scrapedContent: string,
  pagesScraped: number,
  userId?: string
): Promise<CompanyQuizResult> {
  const skills = [
    ...resume.skills.languages, ...resume.skills.frameworks,
    ...resume.skills.tools, ...resume.skills.databases,
    ...resume.skills.cloud, ...resume.skills.other,
  ].join(", ");

  const experience = resume.experience
    .map((e) => `${e.title} at ${e.company} (${e.industry})`)
    .join("; ");

  const prompt = `<company>
Name: ${company.name} (YC ${company.batch || "unknown"}, stage: ${company.stage || "seed"})
Description: ${company.description || "N/A"}
Industries: ${(company.industries || []).join(", ")}
Tech stack: ${(company.techStack || []).join(", ")}
</company>

<scraped_website>
${scrapedContent.slice(0, 12000)}
</scraped_website>

<candidate>
Skills: ${skills}
Experience: ${experience}
Industries: ${resume.industries_worked_in.join(", ")}
Seniority: ${resume.seniority_level} (${resume.years_of_experience} years)
</candidate>

Generate company knowledge quiz questions. Use specific details from the website content.`;

  const raw = await chatCompletion({
    tier: "smart",
    system: COMPANY_QUIZ_SYSTEM,
    prompt,
    maxTokens: 4096,
    userId,
  });

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse company quiz from AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const questions: CompanyQuizQuestion[] = parsed.questions;

  const quizPhaseOrder: CompanyQuizPhase[] = ["mission", "product", "market", "culture", "whyyou"];
  questions.sort(
    (a, b) => quizPhaseOrder.indexOf(a.phase) - quizPhaseOrder.indexOf(b.phase)
  );

  return {
    companyName: company.name,
    questions,
    pagesScraped,
  };
}
