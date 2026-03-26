import Anthropic from "@anthropic-ai/sdk";
import type { ParsedResume } from "@/lib/db/schema";

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are a resume parser. Extract the following into JSON:
{
  "name": string,
  "email": string,
  "skills": {
    "languages": string[],
    "frameworks": string[],
    "tools": string[],
    "databases": string[],
    "cloud": string[],
    "other": string[]
  },
  "experience": [
    {
      "company": string,
      "title": string,
      "duration_months": number,
      "industry": string,
      "highlights": string[],
      "tech_used": string[]
    }
  ],
  "education": {
    "school": string,
    "degree": string,
    "field": string,
    "year": number
  },
  "industries_worked_in": string[],
  "seniority_level": "intern" | "junior" | "mid" | "senior",
  "years_of_experience": number,
  "standout_signals": string[]
}
Only return valid JSON. No markdown. No explanation.`;

export async function parseResume(rawText: string): Promise<ParsedResume> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Parse this resume:\n\n${rawText}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  return JSON.parse(text) as ParsedResume;
}
