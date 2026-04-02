import { registerAgent } from "../registry";
import type { AgentContext, StepResult } from "../types";
import { db } from "@/lib/db";
import { resumes, matchScores, resumeEmbeddings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateEmbedding, buildResumeEmbeddingText } from "@/lib/ai/embeddings";
import type { ParsedResume } from "@/lib/db/schema";

const BATCH_SIZE = 50;
const NOISE_INDUSTRIES = new Set(["b2b", "b2c", "saas"]);

registerAgent({
  type: "scoring",
  label: "Match Scoring",
  description: "Score a resume against YC companies using vector similarity + heuristics",
  buildSteps(input) {
    return [
      {
        name: "load-resume",
        label: "Loading resume data",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          const resumeId = ctx.input.resumeId as string;
          const [resume] = await db
            .select()
            .from(resumes)
            .where(eq(resumes.id, resumeId))
            .limit(1);

          if (!resume || !resume.parsedData) {
            return { abort: true, output: { error: "Resume not found or not parsed" } };
          }

          return { output: { resumeId: resume.id, parsedData: resume.parsedData } };
        },
      },
      {
        name: "generate-embedding",
        label: "Generating resume embedding",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          const { parsedData } = ctx.stepOutputs["load-resume"] as { parsedData: ParsedResume };
          const embeddingText = buildResumeEmbeddingText(parsedData);
          const embedding = await generateEmbedding(embeddingText, ctx.userId);

          // Store the embedding
          const resumeId = ctx.input.resumeId as string;
          await db.delete(resumeEmbeddings).where(eq(resumeEmbeddings.resumeId, resumeId));
          await db.insert(resumeEmbeddings).values({
            resumeId,
            embedding,
          });

          return { output: { embeddingGenerated: true } };
        },
      },
      {
        name: "vector-search",
        label: "Finding similar companies",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          const resumeId = ctx.input.resumeId as string;

          // Get the resume embedding we just stored
          const [re] = await db
            .select({ embedding: resumeEmbeddings.embedding })
            .from(resumeEmbeddings)
            .where(eq(resumeEmbeddings.resumeId, resumeId))
            .limit(1);

          if (!re || !re.embedding) {
            return { abort: true, output: { error: "No embedding found" } };
          }

          const vecStr = `[${re.embedding.join(",")}]`;

          // Vector similarity search -- top candidates
          const candidates = (await db.execute(sql`
            SELECT id, name, slug, one_liner, description, long_description,
                   industries, tech_stack, stage, batch, is_hiring,
                   hiring_signals, team_size,
                   1 - (embedding <=> ${vecStr}::vector) as similarity
            FROM yc_companies
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> ${vecStr}::vector
            LIMIT ${BATCH_SIZE}
          `)) as unknown as Array<{
            id: string;
            name: string;
            slug: string;
            one_liner: string | null;
            description: string | null;
            long_description: string | null;
            industries: string[] | null;
            tech_stack: string[] | null;
            stage: string | null;
            batch: string | null;
            is_hiring: boolean;
            hiring_signals: { has_careers_page?: boolean; recent_job_posts?: number; eng_roles_open?: boolean } | null;
            team_size: number | null;
            similarity: number;
          }>;

          return {
            output: {
              candidateCount: candidates.length,
              candidates,
            },
          };
        },
      },
      {
        name: "score-candidates",
        label: "Scoring matches",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          const { parsedData } = ctx.stepOutputs["load-resume"] as { parsedData: ParsedResume };
          const { candidates } = ctx.stepOutputs["vector-search"] as {
            candidates: Array<{
              id: string;
              name: string;
              one_liner: string | null;
              description: string | null;
              industries: string[] | null;
              tech_stack: string[] | null;
              stage: string | null;
              is_hiring: boolean;
              hiring_signals: { has_careers_page?: boolean; recent_job_posts?: number; eng_roles_open?: boolean } | null;
              similarity: number;
            }>;
          };
          const resumeId = ctx.input.resumeId as string;

          // Clear old scores
          await db.delete(matchScores).where(eq(matchScores.resumeId, resumeId));

          const results: Array<{
            companyId: string;
            overallScore: number;
            techScore: number;
            industryScore: number;
            hiringScore: number;
            stageScore: number;
            explanation: string;
          }> = [];

          for (const company of candidates) {
            const scored = heuristicScores(parsedData, company);
            results.push(scored);
          }

          // Sort by overall score descending
          results.sort((a, b) => b.overallScore - a.overallScore);

          // Persist scores
          for (const result of results) {
            await db.insert(matchScores).values({
              resumeId,
              companyId: result.companyId,
              overallScore: result.overallScore,
              techScore: result.techScore,
              industryScore: result.industryScore,
              hiringScore: result.hiringScore,
              stageScore: result.stageScore,
              explanation: result.explanation,
            });
          }

          return { output: { scored: results.length, total: candidates.length } };
        },
      },
    ];
  },
});

// -----------------------------------------------------------------------
// Heuristic scoring — mirrors the logic in score-matches/route.ts
//
// Scoring weights (out of 100):
//   Industry experience:  40 -- duration-weighted, noise industries filtered
//   Semantic similarity:  25 -- captures contextual domain matches
//   Building signal:      15 -- shipped projects, highlights, standout signals
//   Stage fit:            10 -- seniority / company stage alignment
//   Tech overlap:         10 -- tiebreaker
// -----------------------------------------------------------------------

function heuristicScores(
  parsed: ParsedResume,
  company: {
    id: string;
    name: string;
    industries: string[] | null;
    tech_stack: string[] | null;
    stage: string | null;
    is_hiring: boolean;
    similarity: number;
    one_liner: string | null;
    description: string | null;
  }
) {
  // -- Industry experience (max 40) --
  const companyIndustries = (company.industries || [])
    .map((i) => i.toLowerCase())
    .filter((i) => !NOISE_INDUSTRIES.has(i));

  let industryScore = 0;
  const matchedIndustries: string[] = [];

  if (companyIndustries.length > 0) {
    let totalMatchedMonths = 0;

    for (const exp of parsed.experience) {
      const expIndustry = exp.industry.toLowerCase();
      const matches = companyIndustries.some(
        (ci) => expIndustry.includes(ci) || ci.includes(expIndustry)
      );
      if (matches) {
        totalMatchedMonths += exp.duration_months;
        if (!matchedIndustries.includes(exp.industry)) {
          matchedIndustries.push(exp.industry);
        }
      }
    }

    const resumeIndustries = parsed.industries_worked_in
      .map((i) => i.toLowerCase())
      .filter((i) => !NOISE_INDUSTRIES.has(i));
    const broadMatch = resumeIndustries.some((ri) =>
      companyIndustries.some((ci) => ri.includes(ci) || ci.includes(ri))
    );

    if (totalMatchedMonths >= 24) industryScore = 40;
    else if (totalMatchedMonths >= 12)
      industryScore = 25 + Math.round(((totalMatchedMonths - 12) / 12) * 15);
    else if (totalMatchedMonths >= 6)
      industryScore = 15 + Math.round(((totalMatchedMonths - 6) / 6) * 10);
    else if (totalMatchedMonths > 0)
      industryScore = Math.round((totalMatchedMonths / 6) * 15);
    else if (broadMatch) industryScore = 8;
  } else {
    industryScore = Math.round(company.similarity * 25);
  }

  // -- Semantic similarity (max 25) --
  const similarityScore = Math.round(company.similarity * 25);

  // -- Building signal (max 15) --
  let buildingScore = 0;
  const buildingParts: string[] = [];

  const totalHighlights = parsed.experience.reduce(
    (sum, e) => sum + e.highlights.length,
    0
  );
  if (totalHighlights >= 6) buildingScore += 8;
  else if (totalHighlights >= 3) buildingScore += 5;
  else if (totalHighlights > 0) buildingScore += 3;

  if (parsed.standout_signals.length >= 3) {
    buildingScore += 7;
    buildingParts.push(parsed.standout_signals.slice(0, 2).join(", "));
  } else if (parsed.standout_signals.length > 0) {
    buildingScore += 4;
    buildingParts.push(parsed.standout_signals[0]);
  }

  buildingScore = Math.min(buildingScore, 15);

  // -- Stage fit (max 10) --
  const stageMap: Record<string, Record<string, number>> = {
    intern: { Early: 10, Growth: 4 },
    junior: { Early: 10, Growth: 6 },
    mid: { Early: 7, Growth: 10 },
    senior: { Early: 5, Growth: 8 },
  };
  const stageScore =
    stageMap[parsed.seniority_level]?.[company.stage || "Early"] || 6;

  // -- Tech overlap (max 10) --
  const resumeTech = new Set(
    [
      ...parsed.skills.languages,
      ...parsed.skills.frameworks,
      ...parsed.skills.tools,
      ...parsed.skills.databases,
      ...parsed.skills.cloud,
      ...parsed.skills.other,
    ].map((t) => t.toLowerCase())
  );
  const companyTech = new Set(
    (company.tech_stack || []).map((t) => t.toLowerCase())
  );
  const techOverlap = [...resumeTech].filter((t) => companyTech.has(t));
  const techScore =
    companyTech.size > 0
      ? Math.min(
          10,
          Math.round(
            (techOverlap.length / Math.max(companyTech.size, 1)) * 10
          )
        )
      : 5;

  // -- Overall --
  const overallScore = Math.min(
    100,
    industryScore + similarityScore + buildingScore + stageScore + techScore
  );

  // -- Explanation --
  const explanationParts: string[] = [];
  if (matchedIndustries.length > 0) {
    const months = parsed.experience
      .filter((e) =>
        matchedIndustries.some((mi) =>
          e.industry.toLowerCase().includes(mi.toLowerCase())
        )
      )
      .reduce((sum, e) => sum + e.duration_months, 0);
    const dur =
      months >= 12
        ? `${Math.round((months / 12) * 10) / 10}yr`
        : `${months}mo`;
    explanationParts.push(
      `${dur} industry experience in ${matchedIndustries.join(", ")}`
    );
  }
  if (buildingParts.length > 0)
    explanationParts.push(`Shipped: ${buildingParts.join(", ")}`);
  if (techOverlap.length > 0)
    explanationParts.push(`Tech: ${techOverlap.slice(0, 4).join(", ")}`);
  if (explanationParts.length === 0) {
    explanationParts.push(
      `${Math.round(company.similarity * 100)}% semantic match`
    );
  }

  return {
    companyId: company.id,
    overallScore,
    techScore,
    industryScore,
    hiringScore: buildingScore,
    stageScore,
    explanation: explanationParts.join(". ") + ".",
  };
}
