import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchScores, ycCompanies, resumes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

export async function GET() {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    // Get the most recent resume for this user
    const [latestResume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, user.id))
      .orderBy(desc(resumes.createdAt))
      .limit(1);

    if (!latestResume) {
      return NextResponse.json({ matches: [], resumeId: null });
    }

    const scores = await db
      .select({
        matchId: matchScores.id,
        companyId: matchScores.companyId,
        overallScore: matchScores.overallScore,
        techScore: matchScores.techScore,
        industryScore: matchScores.industryScore,
        hiringScore: matchScores.hiringScore,
        stageScore: matchScores.stageScore,
        explanation: matchScores.explanation,
        companyName: ycCompanies.name,
        batch: ycCompanies.batch,
        description: ycCompanies.description,
        longDescription: ycCompanies.longDescription,
        industries: ycCompanies.industries,
        techStack: ycCompanies.techStack,
        logoUrl: ycCompanies.logoUrl,
        website: ycCompanies.website,
        location: ycCompanies.location,
        stage: ycCompanies.stage,
        isHiring: ycCompanies.isHiring,
        teamSize: ycCompanies.teamSize,
      })
      .from(matchScores)
      .innerJoin(ycCompanies, eq(matchScores.companyId, ycCompanies.id))
      .where(eq(matchScores.resumeId, latestResume.id))
      .orderBy(desc(matchScores.overallScore));

    return NextResponse.json({
      resumeId: latestResume.id,
      matches: scores.map((s) => ({
        matchId: s.matchId,
        companyId: s.companyId,
        companyName: s.companyName,
        batch: s.batch,
        description: s.description,
        longDescription: s.longDescription,
        industries: s.industries || [],
        techStack: s.techStack || [],
        logoUrl: s.logoUrl,
        website: s.website,
        location: s.location,
        stage: s.stage,
        isHiring: s.isHiring,
        teamSize: s.teamSize,
        overallScore: s.overallScore,
        techScore: s.techScore,
        industryScore: s.industryScore,
        hiringScore: s.hiringScore,
        stageScore: s.stageScore,
        explanation: s.explanation || "",
      })),
    });
  } catch (error) {
    console.error("Failed to load matches:", error);
    return NextResponse.json(
      { error: "Failed to load matches" },
      { status: 500 }
    );
  }
}
