// Same-user nearest-neighbor reuse of match_scores.
//
// When /api/score-matches runs, we first check whether the user has another
// resume whose embedding is nearly identical to the current one and already
// has match_scores populated. If yes, we clone those rows under the new
// resumeId — skipping the vector search + LLM scoring entirely (~30s saved).
//
// Scoped to the SAME user to avoid leaking explanations (which can mention
// resume-specific industries/skills) across accounts.
//
// The explanation column is copied verbatim. Within a user's variant resumes
// (e.g. tailored versions of the same career history) the explanations are
// usually still accurate. Lower the threshold at your peril.

import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchScores, ycCompanies } from "@/lib/db/schema";

const REUSE_SIMILARITY_THRESHOLD = 0.95;
const TOP_MATCHES_LIMIT = 20;

interface NearestSibling {
  donor_id: string;
  similarity: number;
  score_count: number;
}

export interface ReusedTopMatch {
  companyId: string;
  companyName: string;
  overallScore: number;
  techScore: number;
  industryScore: number;
  hiringScore: number;
  stageScore: number;
  compensationScore: number | null;
  cultureScore: number | null;
  redFlagScore: number | null;
  northStarScore: number | null;
  archetype: string | null;
  grade: string | null;
  explanation: string | null;
}

export type ReuseResult =
  | {
      reused: true;
      donorResumeId: string;
      similarity: number;
      count: number;
      topMatches: ReusedTopMatch[];
    }
  | { reused: false; reason: string };

interface ReuseArgs {
  userId: string;
  resumeId: string;
  embedding: number[];
}

/**
 * Try to reuse match_scores from another resume owned by the same user.
 * Returns `{ reused: true, ... }` when scores were cloned; `{ reused: false, reason }`
 * when no suitable donor was found. On reuse, the new resumeId's existing
 * match_scores are replaced.
 */
export async function tryReuseScoredMatches(
  args: ReuseArgs
): Promise<ReuseResult> {
  const { userId, resumeId, embedding } = args;
  const vectorStr = `[${embedding.join(",")}]`;

  const rows = (await db.execute(sql`
    SELECT
      re.resume_id AS donor_id,
      1 - (re.embedding <=> ${vectorStr}::vector) AS similarity,
      (SELECT COUNT(*) FROM match_scores ms WHERE ms.resume_id = re.resume_id)::int AS score_count
    FROM resume_embeddings re
    INNER JOIN resumes r ON r.id = re.resume_id
    WHERE r.user_id = ${userId}::uuid
      AND re.resume_id != ${resumeId}::uuid
      AND re.embedding IS NOT NULL
      AND EXISTS (SELECT 1 FROM match_scores ms WHERE ms.resume_id = re.resume_id)
    ORDER BY re.embedding <=> ${vectorStr}::vector
    LIMIT 1
  `)) as unknown as NearestSibling[];

  if (rows.length === 0) {
    return { reused: false, reason: "no sibling resume with scores" };
  }

  const [{ donor_id: donorId, similarity, score_count: scoreCount }] = rows;

  if (similarity < REUSE_SIMILARITY_THRESHOLD) {
    return {
      reused: false,
      reason: `nearest sibling similarity ${similarity.toFixed(3)} below threshold ${REUSE_SIMILARITY_THRESHOLD}`,
    };
  }

  await db.transaction(async (tx) => {
    await tx.delete(matchScores).where(eq(matchScores.resumeId, resumeId));
    await tx.execute(sql`
      INSERT INTO match_scores (
        resume_id, company_id, overall_score, tech_score, industry_score,
        stage_score, hiring_score, archetype, compensation_score, culture_score,
        red_flag_score, north_star_score, grade, grade_breakdown, explanation
      )
      SELECT
        ${resumeId}::uuid, company_id, overall_score, tech_score, industry_score,
        stage_score, hiring_score, archetype, compensation_score, culture_score,
        red_flag_score, north_star_score, grade, grade_breakdown, explanation
      FROM match_scores
      WHERE resume_id = ${donorId}::uuid
    `);
  });

  const topMatches = (await db
    .select({
      companyId: matchScores.companyId,
      companyName: ycCompanies.name,
      overallScore: matchScores.overallScore,
      techScore: matchScores.techScore,
      industryScore: matchScores.industryScore,
      hiringScore: matchScores.hiringScore,
      stageScore: matchScores.stageScore,
      compensationScore: matchScores.compensationScore,
      cultureScore: matchScores.cultureScore,
      redFlagScore: matchScores.redFlagScore,
      northStarScore: matchScores.northStarScore,
      archetype: matchScores.archetype,
      grade: matchScores.grade,
      explanation: matchScores.explanation,
    })
    .from(matchScores)
    .innerJoin(ycCompanies, eq(matchScores.companyId, ycCompanies.id))
    .where(eq(matchScores.resumeId, resumeId))
    .orderBy(sql`${matchScores.overallScore} DESC`)
    .limit(TOP_MATCHES_LIMIT)) as ReusedTopMatch[];

  return {
    reused: true,
    donorResumeId: donorId,
    similarity,
    count: scoreCount,
    topMatches,
  };
}
