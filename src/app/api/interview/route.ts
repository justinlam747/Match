import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resumes, ycCompanies, matchScores } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { generateInterviewPrep } from "@/lib/ai/interview-prep";

export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { resumeId, companyId } = await req.json();
    if (!resumeId || !companyId) {
      return NextResponse.json(
        { error: "resumeId and companyId are required" },
        { status: 400 }
      );
    }

    // Fetch resume (must belong to user)
    const [resume] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, user.id)))
      .limit(1);

    if (!resume?.parsedData) {
      return NextResponse.json(
        { error: "Resume not found or not parsed" },
        { status: 404 }
      );
    }

    // Fetch company
    const [company] = await db
      .select()
      .from(ycCompanies)
      .where(eq(ycCompanies.id, companyId))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Fetch match score
    const [score] = await db
      .select()
      .from(matchScores)
      .where(
        and(
          eq(matchScores.resumeId, resumeId),
          eq(matchScores.companyId, companyId)
        )
      )
      .limit(1);

    // Use actual scores or defaults if no score exists yet
    const scoreContext = score
      ? {
          overallScore: score.overallScore,
          techScore: score.techScore,
          industryScore: score.industryScore,
          stageScore: score.stageScore,
          hiringScore: score.hiringScore,
          explanation: score.explanation,
        }
      : {
          overallScore: 50,
          techScore: 12,
          industryScore: 12,
          stageScore: 12,
          hiringScore: 12,
          explanation: null,
        };

    const result = await generateInterviewPrep(
      resume.parsedData,
      {
        name: company.name,
        description: company.description,
        industries: company.industries,
        techStack: company.techStack,
        stage: company.stage,
        batch: company.batch,
      },
      scoreContext,
      user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Interview prep failed:", error);
    return NextResponse.json(
      { error: "Failed to generate interview questions" },
      { status: 500 }
    );
  }
}
