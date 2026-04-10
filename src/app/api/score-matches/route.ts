import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  resumes,
  ycCompanies,
  matchScores,
  resumeEmbeddings,
  documents,
  userProfiles,
} from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { scoreMatchesBatch } from "@/lib/ai/score-match";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  generateEmbedding,
  buildResumeEmbeddingText,
} from "@/lib/ai/embeddings";
import type { GradeBreakdown, ParsedResume } from "@/lib/db/schema";
import type { Grade } from "@/lib/ai/grade-calculator";
import type { RoleArchetype } from "@/lib/ai/archetype-detector";

/*
 * Scoring weights (out of 100):
 *   Industry experience:  40  — duration-weighted, "B2B"/"SaaS" filtered as noise
 *   Semantic similarity:  25  — captures contextual domain matches embeddings find
 *   Building signal:      15  — shipped projects, highlights, standout signals
 *   Stage fit:            10  — intern/junior → early stage natural fit
 *   Tech overlap:         10  — tiebreaker, everything else is taught
 */

const NOISE_INDUSTRIES = new Set(["b2b", "b2c", "saas"]);

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
  // ── Industry experience (max 40) ──
  // Match resume experience industries against company industries, weighted by duration
  const companyIndustries = (company.industries || [])
    .map((i) => i.toLowerCase())
    .filter((i) => !NOISE_INDUSTRIES.has(i));

  let industryScore = 0;
  const matchedIndustries: string[] = [];

  if (companyIndustries.length > 0) {
    let totalMatchedMonths = 0;

    for (const exp of parsed.experience) {
      const expIndustry = exp.industry.toLowerCase();
      // Check if this experience's industry matches any company industry
      const matches = companyIndustries.some((ci) =>
        expIndustry.includes(ci) || ci.includes(expIndustry)
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
    else if (totalMatchedMonths >= 12) industryScore = 25 + Math.round((totalMatchedMonths - 12) / 12 * 15);
    else if (totalMatchedMonths >= 6) industryScore = 15 + Math.round((totalMatchedMonths - 6) / 6 * 10);
    else if (totalMatchedMonths > 0) industryScore = Math.round(totalMatchedMonths / 6 * 15);
    else if (broadMatch) industryScore = 8; // weak signal from industries_worked_in
  } else {
    // No company industries listed — use similarity as proxy
    industryScore = Math.round(company.similarity * 25);
  }

  // ── Semantic similarity (max 25) ──
  const similarityScore = Math.round(company.similarity * 25);

  // ── Building signal (max 15) ──
  let buildingScore = 0;
  const buildingParts: string[] = [];

  // Count highlights across all experience
  const totalHighlights = parsed.experience.reduce(
    (sum, e) => sum + e.highlights.length, 0
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

  // ── Stage fit (max 10) ──
  const stageMap: Record<string, Record<string, number>> = {
    intern: { Early: 10, Growth: 4 },
    junior: { Early: 10, Growth: 6 },
    mid:    { Early: 7,  Growth: 10 },
    senior: { Early: 5,  Growth: 8 },
  };
  const stageScore = stageMap[parsed.seniority_level]?.[company.stage || "Early"] || 6;

  // ── Tech overlap (max 10) ──
  const resumeTech = new Set(
    [
      ...parsed.skills.languages, ...parsed.skills.frameworks,
      ...parsed.skills.tools, ...parsed.skills.databases,
      ...parsed.skills.cloud, ...parsed.skills.other,
    ].map((t) => t.toLowerCase())
  );
  const companyTech = new Set((company.tech_stack || []).map((t) => t.toLowerCase()));
  const techOverlap = [...resumeTech].filter((t) => companyTech.has(t));
  const techScore = companyTech.size > 0
    ? Math.min(10, Math.round((techOverlap.length / Math.max(companyTech.size, 1)) * 10))
    : 5;

  // ── Overall ──
  const overallScore = Math.min(100, industryScore + similarityScore + buildingScore + stageScore + techScore);

  // ── Explanation ──
  const explanationParts: string[] = [];
  if (matchedIndustries.length > 0) {
    const months = parsed.experience
      .filter((e) => matchedIndustries.some((mi) =>
        e.industry.toLowerCase().includes(mi.toLowerCase())
      ))
      .reduce((sum, e) => sum + e.duration_months, 0);
    const dur = months >= 12 ? `${Math.round(months / 12 * 10) / 10}yr` : `${months}mo`;
    explanationParts.push(`${dur} industry experience in ${matchedIndustries.join(", ")}`);
  }
  if (buildingParts.length > 0) explanationParts.push(`Shipped: ${buildingParts.join(", ")}`);
  if (techOverlap.length > 0) explanationParts.push(`Tech: ${techOverlap.slice(0, 4).join(", ")}`);
  if (explanationParts.length === 0) {
    explanationParts.push(`${Math.round(company.similarity * 100)}% semantic match`);
  }

  return {
    companyId: company.id,
    overallScore,
    techScore,
    industryScore,
    hiringScore: buildingScore, // stored as "building signal" in the hiringScore column
    stageScore,
    explanation: explanationParts.join(". ") + ".",
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const rl = await rateLimit(`score-matches:${user.id}`, 10, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { resumeId, rerank = false } = body as {
      resumeId: string;
      rerank?: boolean;
    };

    if (!resumeId) {
      return NextResponse.json(
        { error: "resumeId is required" },
        { status: 400 }
      );
    }

    // Get the parsed resume
    const [resume] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, user.id)))
      .limit(1);

    if (!resume || !resume.parsedData) {
      return NextResponse.json(
        { error: "Resume not found or not parsed" },
        { status: 404 }
      );
    }

    const parsed = resume.parsedData as ParsedResume;

    // Step 1: Build embedding from resume + all user documents
    const resumeText = buildResumeEmbeddingText(parsed);

    // Append all user documents as extra context
    const userDocs = await db
      .select({ rawText: documents.rawText, type: documents.type })
      .from(documents)
      .where(eq(documents.userId, user.id));

    const docText = userDocs
      .map((d) => d.rawText.slice(0, 1500))
      .join("\n\n");

    const fullText = docText
      ? `${resumeText}\n\nAdditional context:\n${docText}`
      : resumeText;

    const resumeVector = await generateEmbedding(fullText, user.id);

    await db.transaction(async (tx) => {
      await tx.delete(resumeEmbeddings).where(eq(resumeEmbeddings.resumeId, resumeId));
      await tx.insert(resumeEmbeddings).values({
        resumeId,
        embedding: resumeVector,
      });
    });

    // Step 2: Vector similarity search — top 50
    const vectorStr = `[${resumeVector.join(",")}]`;

    const candidates = (await db.execute(sql`
      SELECT
        id, name, slug, batch, description, one_liner, long_description,
        industries, tags, tech_stack, stage, status, team_size,
        website, yc_url, logo_url, location, is_hiring, is_top_company,
        hiring_signals, archetype,
        1 - (embedding <=> ${vectorStr}::vector) as similarity
      FROM yc_companies
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT 50
    `)) as unknown as Array<{
      id: string;
      name: string;
      slug: string;
      batch: string | null;
      description: string | null;
      one_liner: string | null;
      long_description: string | null;
      industries: string[] | null;
      tags: string[] | null;
      tech_stack: string[] | null;
      stage: string | null;
      status: string | null;
      team_size: number | null;
      website: string | null;
      yc_url: string | null;
      logo_url: string | null;
      location: string | null;
      is_hiring: boolean;
      is_top_company: boolean;
      hiring_signals: { has_careers_page?: boolean; recent_job_posts?: number; eng_roles_open?: boolean } | null;
      archetype: RoleArchetype | null;
      similarity: number;
    }>;

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "No embedded companies found. Run: npm run populate" },
        { status: 400 }
      );
    }

    type ScoredRow = {
      companyId: string;
      overallScore: number;
      techScore: number;
      industryScore: number;
      hiringScore: number;
      stageScore: number;
      explanation: string;
      // Populated only on the rerank (LLM) path; nullable in DB.
      compensationScore?: number;
      cultureScore?: number;
      redFlagScore?: number;
      northStarScore?: number;
      archetype?: RoleArchetype | null;
      grade?: Grade;
      gradeBreakdown?: GradeBreakdown;
    };
    let results: ScoredRow[];

    if (rerank) {
      // Step 3 (opt-in): LLM rerank top 30
      const toScore = candidates.slice(0, 30);

      const [profile] = await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1);

      const llmResults = await scoreMatchesBatch(
        parsed,
        toScore.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description || c.one_liner,
          industries: c.industries,
          techStack: c.tech_stack,
          stage: c.stage,
          batch: c.batch,
          archetype: c.archetype ?? null,
          hiringSignals: c.hiring_signals,
        })),
        profile ?? null
      );

      // Blend LLM score with similarity
      const simMap = new Map(candidates.map((c) => [c.id, c.similarity]));
      for (const r of llmResults) {
        const sim = simMap.get(r.companyId) || 0;
        r.overallScore = Math.round(r.overallScore * 0.8 + sim * 100 * 0.2);
      }

      // Backfill yc_companies.archetype for any company that was just detected
      // by scoreMatch — avoids re-running detection on subsequent scans.
      const archetypeCacheMisses = llmResults.filter((r) => {
        const cached = candidates.find((c) => c.id === r.companyId)?.archetype;
        return !cached && r.archetype;
      });
      if (archetypeCacheMisses.length > 0) {
        await Promise.all(
          archetypeCacheMisses.map((r) =>
            db
              .update(ycCompanies)
              .set({ archetype: r.archetype! })
              .where(eq(ycCompanies.id, r.companyId))
          )
        );
      }

      results = llmResults;
    } else {
      // Default: heuristic scoring from similarity + structured overlap (free)
      results = candidates.map((c) => heuristicScores(parsed, c));
    }

    results.sort((a, b) => b.overallScore - a.overallScore);

    // Clear old scores and store new — in a transaction with batch insert
    await db.transaction(async (tx) => {
      await tx.delete(matchScores).where(eq(matchScores.resumeId, resumeId));

      if (results.length > 0) {
        await tx.insert(matchScores).values(
          results.map((result) => ({
            resumeId,
            companyId: result.companyId,
            overallScore: result.overallScore,
            techScore: result.techScore,
            industryScore: result.industryScore,
            hiringScore: result.hiringScore,
            stageScore: result.stageScore,
            explanation: result.explanation,
            compensationScore: result.compensationScore,
            cultureScore: result.cultureScore,
            redFlagScore: result.redFlagScore,
            northStarScore: result.northStarScore,
            archetype: result.archetype ?? null,
            grade: result.grade,
            gradeBreakdown: result.gradeBreakdown,
          }))
        );
      }
    });

    return NextResponse.json({
      message: `Matched ${results.length} companies${rerank ? " (AI reranked)" : ""}`,
      reranked: rerank,
      topMatches: results.slice(0, 20),
    });
  } catch (error) {
    console.error("Scoring error:", error);
    return NextResponse.json(
      { error: "Failed to score matches" },
      { status: 500 }
    );
  }
}
