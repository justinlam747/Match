import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resumes, ycCompanies, matchScores } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { scoreMatchesBatch } from "@/lib/ai/score-match";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { logAuditEvent } from "@/lib/audit/log";

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const { resumeId } = body;

    if (!resumeId) {
      return NextResponse.json(
        { error: "resumeId is required" },
        { status: 400 }
      );
    }

    // Get the parsed resume (verify it belongs to this user)
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

    // Get all companies
    const companies = await db.select().from(ycCompanies);

    if (companies.length === 0) {
      return NextResponse.json(
        { error: "No YC companies in database. Run scraper first." },
        { status: 400 }
      );
    }

    // Score all matches
    const results = await scoreMatchesBatch(
      resume.parsedData,
      companies.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        industries: c.industries,
        techStack: c.techStack,
        stage: c.stage,
        batch: c.batch,
        hiringSignals: c.hiringSignals,
      }))
    );

    // Store scores
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

    await logAuditEvent({
      userId: user.id,
      action: "matches.scored",
      entityType: "matchScore",
      metadata: { resumeId, companiesScored: results.length },
    });

    return NextResponse.json({
      message: `Scored ${results.length} companies`,
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
