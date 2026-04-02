import { task, logger } from "@trigger.dev/sdk";
import { scoringQueue } from "./queues";

const BATCH_SIZE = 50;
const NOISE_INDUSTRIES = new Set(["b2b", "b2c", "saas"]);

interface ParsedResume {
  name: string;
  email: string;
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
  education: {
    school: string;
    degree: string;
    field: string;
    year: number;
  };
  industries_worked_in: string[];
  seniority_level: "intern" | "junior" | "mid" | "senior";
  years_of_experience: number;
  standout_signals: string[];
}

interface CandidateRow {
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
  hiring_signals: {
    has_careers_page?: boolean;
    recent_job_posts?: number;
    eng_roles_open?: boolean;
  } | null;
  team_size: number | null;
  similarity: number;
}

interface ScoredResult {
  companyId: string;
  overallScore: number;
  techScore: number;
  industryScore: number;
  hiringScore: number;
  stageScore: number;
  explanation: string;
}

// -----------------------------------------------------------------------
// Heuristic scoring -- mirrors the logic in score-matches/route.ts
// and agents/scoring.ts exactly.
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
): ScoredResult {
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

    // Also check industries_worked_in for broader matches
    const resumeIndustries = parsed.industries_worked_in
      .map((i) => i.toLowerCase())
      .filter((i) => !NOISE_INDUSTRIES.has(i));
    const broadMatch = resumeIndustries.some((ri) =>
      companyIndustries.some((ci) => ri.includes(ci) || ci.includes(ri))
    );

    // Scale: 0 months = 0, 6 months = 15, 12 months = 25, 24+ months = 40
    if (totalMatchedMonths >= 24) industryScore = 40;
    else if (totalMatchedMonths >= 12)
      industryScore = 25 + Math.round(((totalMatchedMonths - 12) / 12) * 15);
    else if (totalMatchedMonths >= 6)
      industryScore = 15 + Math.round(((totalMatchedMonths - 6) / 6) * 10);
    else if (totalMatchedMonths > 0)
      industryScore = Math.round((totalMatchedMonths / 6) * 15);
    else if (broadMatch) industryScore = 8; // weak signal from industries_worked_in
  } else {
    // No company industries listed -- use similarity as proxy
    industryScore = Math.round(company.similarity * 25);
  }

  // -- Semantic similarity (max 25) --
  const similarityScore = Math.round(company.similarity * 25);

  // -- Building signal (max 15) --
  let buildingScore = 0;
  const buildingParts: string[] = [];

  // Count highlights across all experience
  const totalHighlights = parsed.experience.reduce(
    (sum, e) => sum + e.highlights.length,
    0
  );
  if (totalHighlights >= 6) buildingScore += 8;
  else if (totalHighlights >= 3) buildingScore += 5;
  else if (totalHighlights > 0) buildingScore += 3;

  // Standout signals (shipped projects, open source, etc.)
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

export const scoreResumeTask = task({
  id: "score-resume",
  queue: scoringQueue,
  retry: { maxAttempts: 2 },
  run: async (payload: { userId: string; resumeId: string }) => {
    const { userId, resumeId } = payload;

    logger.info("Starting score-resume task", { userId, resumeId });

    // Dynamic imports to keep the trigger bundle lean
    const { db } = await import("@/lib/db");
    const {
      resumes,
      matchScores,
      resumeEmbeddings,
      documents,
    } = await import("@/lib/db/schema");
    const { eq, sql } = await import("drizzle-orm");
    const { generateEmbedding, buildResumeEmbeddingText } = await import(
      "@/lib/ai/embeddings"
    );

    // ── Step 1: Load resume and parsed data ──

    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, resumeId))
      .limit(1);

    if (!resume || !resume.parsedData) {
      logger.error("Resume not found or not parsed", { resumeId });
      throw new Error(`Resume ${resumeId} not found or not parsed`);
    }

    if (resume.userId !== userId) {
      logger.error("Resume does not belong to user", { resumeId, userId });
      throw new Error("Resume does not belong to user");
    }

    const parsed = resume.parsedData as ParsedResume;
    logger.info("Resume loaded", {
      resumeId,
      name: parsed.name,
      seniority: parsed.seniority_level,
      industries: parsed.industries_worked_in,
    });

    // ── Step 2: Generate/store resume embedding ──

    // Build embedding text from resume
    const resumeText = buildResumeEmbeddingText(parsed);

    // Append all user documents as extra context (same as route handler)
    const userDocs = await db
      .select({ rawText: documents.rawText, type: documents.type })
      .from(documents)
      .where(eq(documents.userId, userId));

    const docText = userDocs
      .map((d) => d.rawText.slice(0, 1500))
      .join("\n\n");

    const fullText = docText
      ? `${resumeText}\n\nAdditional context:\n${docText}`
      : resumeText;

    // Clear old embedding and generate new one
    await db
      .delete(resumeEmbeddings)
      .where(eq(resumeEmbeddings.resumeId, resumeId));

    const resumeVector = await generateEmbedding(fullText, userId);

    await db.insert(resumeEmbeddings).values({
      resumeId,
      embedding: resumeVector,
    });

    logger.info("Embedding generated and stored", {
      resumeId,
      dimensions: resumeVector.length,
      extraDocs: userDocs.length,
    });

    // ── Step 3: Vector similarity search -- top 50 companies ──

    const vectorStr = `[${resumeVector.join(",")}]`;

    const candidates = (await db.execute(sql`
      SELECT id, name, slug, one_liner, description, long_description,
             industries, tech_stack, stage, batch, is_hiring,
             hiring_signals, team_size,
             1 - (embedding <=> ${vectorStr}::vector) as similarity
      FROM yc_companies
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${BATCH_SIZE}
    `)) as unknown as CandidateRow[];

    if (candidates.length === 0) {
      logger.error("No embedded companies found");
      throw new Error("No embedded companies found. Run: npm run populate");
    }

    logger.info("Vector search complete", {
      candidateCount: candidates.length,
      topSimilarity: candidates[0]?.similarity,
    });

    // ── Step 4: Score each candidate with heuristic scorer ──

    const results: ScoredResult[] = [];

    for (const company of candidates) {
      const scored = heuristicScores(parsed, company);
      results.push(scored);
    }

    // Sort by overall score descending
    results.sort((a, b) => b.overallScore - a.overallScore);

    // ── Step 5: Store results in matchScores table ──

    // Clear old scores
    await db.delete(matchScores).where(eq(matchScores.resumeId, resumeId));

    // Persist all scores
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

    // Find top match name for return value
    const topCompanyId = results[0]?.companyId;
    const topCandidate = candidates.find((c) => c.id === topCompanyId);
    const topMatch = topCandidate?.name || "Unknown";

    logger.info("Scoring complete", {
      scored: results.length,
      topMatch,
      topScore: results[0]?.overallScore,
    });

    return { scored: results.length, topMatch };
  },
});
