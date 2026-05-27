import OpenAI from "openai";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";

async function getOpenAIKey(userId?: string): Promise<string> {
  if (userId) {
    try {
      const [row] = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, "openai")))
        .limit(1);
      if (row) return decrypt(row.encryptedKey, row.iv, row.authTag);
    } catch {}
  }

  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;

  // Prefixed "No OpenAI API key" so describeAiError() maps it to user-safe copy.
  throw new Error("No OpenAI API key configured for embeddings.");
}

export async function generateEmbedding(
  text: string,
  userId?: string
): Promise<number[]> {
  const apiKey = await getOpenAIKey(userId);
  const openai = new OpenAI({ apiKey });

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text.slice(0, 8000),
  });

  return response.data[0].embedding;
}

export async function generateEmbeddings(
  texts: string[],
  userId?: string
): Promise<number[][]> {
  const apiKey = await getOpenAIKey(userId);
  const openai = new OpenAI({ apiKey });

  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100).map((t) => t.slice(0, 8000));
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: batch,
    });
    results.push(...response.data.map((d) => d.embedding));
  }

  return results;
}

// ── Company embedding text ──

const NOISE_INDUSTRIES = new Set(["b2b", "b2c", "saas"]);

export function buildCompanyEmbeddingText(company: {
  name: string;
  oneLiner?: string | null;
  longDescription?: string | null;
  industries?: string[] | null;
  tags?: string[] | null;
  techStack?: string[] | null;
}): string {
  const cleanIndustries = (company.industries || [])
    .filter((i) => !NOISE_INDUSTRIES.has(i.toLowerCase()));

  const parts = [
    // Industries first and repeated — this is the primary signal
    cleanIndustries.length
      ? `Industry: ${cleanIndustries.join(", ")}. Domain: ${cleanIndustries.join(", ")}.`
      : null,
    company.name,
    company.oneLiner,
    company.longDescription,
    company.tags?.length ? `Focus areas: ${company.tags.join(", ")}` : null,
    // Tech last, minimal weight
    company.techStack?.length ? `Tech: ${company.techStack.join(", ")}` : null,
  ].filter(Boolean);

  return parts.join("\n");
}

// ── Resume embedding text ──
// Structured to weight industry experience by duration, building signal prominent

export function buildResumeEmbeddingText(resume: {
  skills: {
    languages: string[];
    frameworks: string[];
    tools: string[];
    databases: string[];
    cloud: string[];
    other: string[];
  };
  experience: {
    company: string;
    title: string;
    duration_months: number;
    industry: string;
    highlights: string[];
    tech_used: string[];
  }[];
  industries_worked_in: string[];
  seniority_level: string;
  standout_signals?: string[];
}): string {
  const cleanIndustries = resume.industries_worked_in
    .filter((i) => !NOISE_INDUSTRIES.has(i.toLowerCase()));

  // Sort experience by duration — longest first, most signal
  const sortedExp = [...resume.experience].sort(
    (a, b) => b.duration_months - a.duration_months
  );

  // Build experience entries weighted by duration
  const expLines = sortedExp.map((e) => {
    const years = Math.round(e.duration_months / 12 * 10) / 10;
    const durationLabel = e.duration_months >= 12
      ? `${years} years`
      : `${e.duration_months} months`;

    // Repeat industry for longer tenures to boost weight
    const industryEmphasis = e.duration_months >= 24
      ? `${e.industry} industry. Deep ${e.industry} experience.`
      : `${e.industry} industry.`;

    const highlights = e.highlights.length > 0
      ? ` Built: ${e.highlights.slice(0, 3).join("; ")}`
      : "";

    return `${e.title} at ${e.company} (${durationLabel}, ${industryEmphasis})${highlights}`;
  });

  // Building signals — shipped projects, open source, etc.
  const buildingSignal = resume.standout_signals?.length
    ? `Shipped: ${resume.standout_signals.join(". ")}`
    : null;

  const skills = [
    ...resume.skills.languages,
    ...resume.skills.frameworks,
  ].slice(0, 6).join(", ");

  return [
    // Industries repeated — primary matching signal
    cleanIndustries.length
      ? `Industries: ${cleanIndustries.join(", ")}. Domain expertise: ${cleanIndustries.join(", ")}.`
      : null,
    // Experience by duration — the meat
    `Experience:\n${expLines.join("\n")}`,
    // Building signal
    buildingSignal,
    // Seniority
    `Level: ${resume.seniority_level}`,
    // Skills last — learnable, low weight
    skills ? `Skills: ${skills}` : null,
  ].filter(Boolean).join("\n\n");
}
