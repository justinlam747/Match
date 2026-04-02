/**
 * Interview question generator — uses resume data, company info, and match scores
 * to produce tailored interview questions in proper interview flow order.
 *
 * High alignment (industry/tech scores) → deeper technical questions
 * Low alignment → more behavioral/transferable-skills questions
 */

import { chatCompletion } from "@/lib/ai/client";
import type { ParsedResume } from "@/lib/db/schema";

export type InterviewPhase = "introduction" | "background" | "technical" | "projects" | "behavioral" | "closing";
export type CompanyQuizPhase = "mission" | "product" | "market" | "culture" | "whyyou";

export interface InterviewQuestion {
  phase: InterviewPhase;
  question: string;
  suggestedAnswer: string;
  tip: string;
}

export interface CompanyQuizQuestion {
  phase: CompanyQuizPhase;
  question: string;
  suggestedAnswer: string;
  tip: string;
}

export interface InterviewPrepResult {
  companyName: string;
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

const SYSTEM_PROMPT = `You are an expert interview coach who prepares candidates for startup interviews.
You generate realistic interview questions that a company would actually ask, tailored to the candidate's background and the company's needs.

You must output ONLY valid JSON matching this schema:
{
  "questions": [
    {
      "phase": "introduction" | "background" | "technical" | "projects" | "behavioral" | "closing",
      "question": "The interview question",
      "suggestedAnswer": "A strong suggested answer using the candidate's actual experience",
      "tip": "A brief coaching tip for delivering this answer"
    }
  ]
}

Interview flow phases (generate questions in this order):
1. **introduction** (2 questions) — "Tell me about yourself" style openers, elevator pitch practice
2. **background** (3 questions) — Experience deep-dives, career trajectory, why this company
3. **technical** (4-5 questions) — Technical skills, system design, problem-solving relevant to the role
4. **projects** (3 questions) — Past project walkthroughs, impact, challenges overcome
5. **behavioral** (3 questions) — Teamwork, leadership, conflict resolution, startup culture fit
6. **closing** (2 questions) — Questions the candidate should ask, salary/next-steps handling

Rules:
- Use the candidate's ACTUAL experience, skills, and projects in suggested answers — never generic filler
- If the candidate's background ALIGNS with the company (same industry/tech), go deeper technically
- If the candidate's background DOES NOT align, focus on transferable skills and learning agility
- For startup interviews, include culture-fit and ownership-mentality questions
- Suggested answers should be specific, use the STAR method where appropriate, and reference real details from the resume
- Tips should be actionable and concise (one sentence)
- Generate 17-20 questions total across all phases`;

function buildPrompt(
  resume: ParsedResume,
  company: CompanyContext,
  scores: ScoreContext,
  style: "technical" | "mixed" | "behavioral"
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
  userId?: string
): Promise<InterviewPrepResult> {
  const style = determineStyle(scores);
  const prompt = buildPrompt(resume, company, scores, style);

  const raw = await chatCompletion({
    tier: "smart",
    system: SYSTEM_PROMPT,
    prompt,
    maxTokens: 4096,
    userId,
  });

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse interview questions from AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  const questions: InterviewQuestion[] = parsed.questions;

  // Ensure proper phase ordering
  const phaseOrder = ["introduction", "background", "technical", "projects", "behavioral", "closing"] as const;
  questions.sort(
    (a, b) => phaseOrder.indexOf(a.phase) - phaseOrder.indexOf(b.phase)
  );

  return {
    companyName: company.name,
    questions,
    interviewStyle: style,
  };
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
