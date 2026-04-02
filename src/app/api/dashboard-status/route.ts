import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resumes, matchScores, ycCompanies } from "@/lib/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

export async function GET() {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    // Check for active resume (fall back to latest)
    let [latestResume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, user.id))
      .orderBy(desc(resumes.createdAt))
      .limit(1);

    // Prefer the active one
    const [activeResume] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.isActive, true), eq(resumes.userId, user.id)))
      .limit(1);
    if (activeResume) latestResume = activeResume;

    // Check company count
    const [companyCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ycCompanies);

    // Check match count for this user's resume
    let matchCount = 0;
    if (latestResume) {
      const [mc] = await db
        .select({ count: sql<number>`count(*)` })
        .from(matchScores)
        .where(eq(matchScores.resumeId, latestResume.id));
      matchCount = mc?.count || 0;
    }

    return NextResponse.json({
      hasResume: !!latestResume,
      resumeId: latestResume?.id || null,
      resumeName: latestResume?.parsedData?.name || null,
      companyCount: companyCount?.count || 0,
      matchCount,
    });
  } catch (error) {
    console.error("Dashboard status error:", error);
    return NextResponse.json(
      { error: "Failed to load status" },
      { status: 500 }
    );
  }
}
