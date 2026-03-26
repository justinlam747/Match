import Anthropic from "@anthropic-ai/sdk";
import type { ParsedResume } from "@/lib/db/schema";

const anthropic = new Anthropic();

interface ContactInfo {
  name: string;
  title: string | null;
}

interface CompanyInfo {
  name: string;
  batch: string | null;
  description: string | null;
  techStack: string[] | null;
}

interface MatchInfo {
  overallScore: number;
  explanation: string;
}

function findMostRelevantExperience(
  resume: ParsedResume,
  company: CompanyInfo
): string {
  if (resume.experience.length === 0) return "No prior experience listed.";

  const companyText = `${company.description || ""} ${(company.techStack || []).join(" ")}`.toLowerCase();

  let bestScore = -1;
  let bestExp = resume.experience[0];

  for (const exp of resume.experience) {
    let score = 0;
    for (const tech of exp.tech_used) {
      if (companyText.includes(tech.toLowerCase())) score += 2;
    }
    if (companyText.includes(exp.industry.toLowerCase())) score += 3;
    if (score > bestScore) {
      bestScore = score;
      bestExp = exp;
    }
  }

  return `${bestExp.title} at ${bestExp.company} — ${bestExp.highlights.slice(0, 2).join("; ")}`;
}

export async function draftEmail(
  resume: ParsedResume,
  company: CompanyInfo,
  contact: ContactInfo,
  matchScore: MatchInfo
): Promise<{ subject: string; body: string }> {
  const relevantExp = findMostRelevantExperience(resume, company);

  const prompt = `You are writing a cold outreach email from a job seeker to a hiring
decision-maker at a YC startup. The email must be:

1. SHORT — under 150 words. Busy founders skim.
2. SPECIFIC — reference something concrete about the company (product, mission, recent news)
3. CONNECTED — tie a specific thing from the resume to a specific company need
4. HUMBLE BUT CONFIDENT — not begging, not arrogant
5. CLEAR ASK — one specific ask (15-min call, or "open to chatting about [role]")

DO NOT:
- Use "I hope this email finds you well"
- Use "I'm reaching out because"
- Use "passionate about"
- Be generic. Every sentence must be specific to THIS person and THIS company.

RESUME CONTEXT:
Name: ${resume.name}
Key skills: ${[...resume.skills.languages, ...resume.skills.frameworks].slice(0, 8).join(", ")}
Most relevant experience: ${relevantExp}
Education: ${resume.education.school} — ${resume.education.field}
Standout signals: ${resume.standout_signals.join(", ") || "None"}

COMPANY CONTEXT:
Company: ${company.name} (YC ${company.batch || "unknown"})
What they do: ${company.description || "N/A"}
Their tech: ${(company.techStack || []).join(", ") || "Unknown"}
Why this is a match: ${matchScore.explanation}

RECIPIENT:
Name: ${contact.name}
Title: ${contact.title || "Team Member"}

Return JSON: { "subject": "...", "body": "..." }
Subject line should be 5-8 words, no clickbait, mention something specific.
Body should use the recipient's first name.
No markdown in the body — plain text only.
Only return valid JSON. Nothing else.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return JSON.parse(text) as { subject: string; body: string };
}
