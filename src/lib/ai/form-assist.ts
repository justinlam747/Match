// Application form answer generator. Covers the common open-ended questions
// application forms ask ("Why this company?", "Why this role?", "Salary
// expectations", "Tell us about a time..."). The goal is not to autofill blindly
// — the user edits every answer before submitting — but to produce a strong,
// honest draft grounded in the candidate's real resume, profile narrative, and
// the specific match context.

import { chatCompletion } from "@/lib/ai/client";
import type { ParsedResume } from "@/lib/db/schema";
import type { RoleArchetype } from "@/lib/ai/archetype-detector";

export type FormQuestionKind =
  | "why-company"
  | "why-role"
  | "salary-expectations"
  | "tell-us-about-a-time";

export interface FormAssistInput {
  kind: FormQuestionKind;
  /** Optional verbatim question text from the form. Improves tailoring. */
  questionText?: string;
  resume: ParsedResume;
  archetype?: RoleArchetype | null;
  company: {
    name: string;
    description: string | null;
    industries: string[];
    techStack: string[];
  };
  matchExplanation?: string | null;
  /** Career profile context, when available. */
  profile?: {
    exitNarrative?: string | null;
    signatureStrengths?: string[];
    compensationTarget?: number | null;
    compensationMinimum?: number | null;
    compensationCurrency?: string | null;
  };
  /** For behavioral "tell us about a time" questions, which dimension. */
  behavioralDimension?:
    | "leadership"
    | "conflict"
    | "failure"
    | "ambiguity"
    | "ownership";
  userId?: string;
}

export interface FormAssistAnswer {
  kind: FormQuestionKind;
  draft: string;
  /** Bulleted notes on what to edit before submitting. */
  editingNotes: string[];
}

function buildSystemPrompt(kind: FormQuestionKind): string {
  const common = `You draft answers to application-form questions for a specific candidate targeting a specific role.

Ground everything in the candidate's REAL resume and profile. Never fabricate experience, metrics, companies, or credentials. If the question asks about something the candidate hasn't done, say so honestly and pivot to an adjacent strength.

Return JSON:
{
  "draft": "the answer text the candidate can paste and edit",
  "editingNotes": [ "short bullet", "another bullet" ]
}

Style:
- First person, plain text, no markdown
- Specific details and numbers only when they exist in the resume
- editingNotes call out anything the candidate should double-check or personalize further
- Only return valid JSON`;

  switch (kind) {
    case "why-company":
      return `${common}

Focus: Connect the company's mission/product/thesis to the candidate's career story. Demonstrate real research — don't parrot the company description back. 3-5 sentences.`;
    case "why-role":
      return `${common}

Focus: Frame the role through the candidate's archetype and career direction. Explain why THIS role (not just "a role at a cool company") fits the trajectory. Reference one specific JD element. 3-5 sentences.`;
    case "salary-expectations":
      return `${common}

Focus: Provide a confident, well-anchored range based on the candidate's target compensation from their profile. Mention total comp when relevant, note flexibility on base vs equity. 2-3 sentences. Never lowball; never ask "what's the budget?".`;
    case "tell-us-about-a-time":
      return `${common}

Focus: STAR+Reflection format as a single paragraph — Situation, Task, Action, Result, Reflection — using a real story from the resume. 4-6 sentences.`;
  }
}

function compactResumeContext(resume: ParsedResume): string {
  const topExp = resume.experience
    .slice(0, 4)
    .map(
      (e) =>
        `- ${e.title} @ ${e.company} (${e.industry}, ${e.duration_months}mo) — ${e.highlights.slice(0, 3).join(" | ")}`
    )
    .join("\n");

  return `Name: ${resume.name}
Seniority: ${resume.seniority_level} (${resume.years_of_experience} years)
Key skills: ${[
    ...resume.skills.languages,
    ...resume.skills.frameworks,
    ...resume.skills.tools,
  ]
    .slice(0, 15)
    .join(", ")}
Top experience:
${topExp}
Standout signals: ${resume.standout_signals.join(" | ") || "none"}`;
}

export async function generateFormAnswer(
  input: FormAssistInput
): Promise<FormAssistAnswer> {
  const system = buildSystemPrompt(input.kind);

  const profileLines: string[] = [];
  if (input.profile?.exitNarrative) {
    profileLines.push(`Exit narrative: ${input.profile.exitNarrative}`);
  }
  if (input.profile?.signatureStrengths?.length) {
    profileLines.push(
      `Signature strengths: ${input.profile.signatureStrengths.join(", ")}`
    );
  }
  if (input.profile?.compensationTarget) {
    const cur = input.profile.compensationCurrency || "USD";
    profileLines.push(
      `Target comp: ${input.profile.compensationTarget.toLocaleString()} ${cur} (minimum ${
        input.profile.compensationMinimum?.toLocaleString() || "—"
      })`
    );
  }

  const userPrompt = `<question>
Kind: ${input.kind}${input.behavioralDimension ? ` (${input.behavioralDimension})` : ""}
${input.questionText ? `Exact prompt: ${input.questionText}` : ""}
</question>

<candidate>
${compactResumeContext(input.resume)}
${profileLines.join("\n")}
${input.archetype ? `Target archetype: ${input.archetype}` : ""}
</candidate>

<company>
${input.company.name}
${input.company.description || ""}
Industries: ${input.company.industries.join(", ")}
Tech: ${input.company.techStack.join(", ")}
</company>

${input.matchExplanation ? `<match_context>\n${input.matchExplanation}\n</match_context>` : ""}`;

  const raw = await chatCompletion({
    tier: "smart",
    system,
    prompt: userPrompt,
    maxTokens: 1024,
    userId: input.userId,
  });

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("form-assist: no JSON in LLM response");
  }
  const parsed = JSON.parse(jsonMatch[0]) as {
    draft: string;
    editingNotes?: string[];
  };

  return {
    kind: input.kind,
    draft: parsed.draft || "",
    editingNotes: Array.isArray(parsed.editingNotes) ? parsed.editingNotes : [],
  };
}
