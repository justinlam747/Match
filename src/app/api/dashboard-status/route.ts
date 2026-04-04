import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resumes, matchScores, ycCompanies } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

export async function GET() {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    // Run independent queries in parallel
    const [resumeResults, [companyCount]] = await Promise.all([
      // Single query: prefer active resume, fall back to latest
      db
        .select()
        .from(resumes)
        .where(eq(resumes.userId, user.id))
        .orderBy(desc(resumes.isActive), desc(resumes.createdAt))
        .limit(1),
      db
        .select({ count: sql<number>`count(*)` })
        .from(ycCompanies),
    ]);

    const latestResume = resumeResults[0] ?? null;

    // Match count depends on resume existing
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
