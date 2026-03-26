import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matchScores, ycCompanies, resumes } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

export async function GET() {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const [latestResume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, user.id))
      .orderBy(desc(resumes.createdAt))
      .limit(1);

    if (!latestResume) {
      return NextResponse.json({ error: "No resume found" }, { status: 404 });
    }

    const scores = await db
      .select({
        companyName: ycCompanies.name,
        batch: ycCompanies.batch,
        description: ycCompanies.description,
        industries: ycCompanies.industries,
        techStack: ycCompanies.techStack,
        website: ycCompanies.website,
        ycUrl: ycCompanies.ycUrl,
        overallScore: matchScores.overallScore,
        techScore: matchScores.techScore,
        industryScore: matchScores.industryScore,
        hiringScore: matchScores.hiringScore,
        stageScore: matchScores.stageScore,
        explanation: matchScores.explanation,
      })
      .from(matchScores)
      .innerJoin(ycCompanies, eq(matchScores.companyId, ycCompanies.id))
      .where(eq(matchScores.resumeId, latestResume.id))
      .orderBy(desc(matchScores.overallScore));

    // Build CSV
    const headers = [
      "Company",
      "Batch",
      "Overall Score",
      "Tech Score",
      "Industry Score",
      "Hiring Score",
      "Stage Score",
      "Industries",
      "Tech Stack",
      "Website",
      "YC URL",
      "Description",
      "Explanation",
    ];

    const rows = scores.map((s) => [
      s.companyName,
      s.batch || "",
      s.overallScore.toString(),
      s.techScore.toString(),
      s.industryScore.toString(),
      s.hiringScore.toString(),
      s.stageScore.toString(),
      (s.industries || []).join("; "),
      (s.techStack || []).join("; "),
      s.website || "",
      s.ycUrl || "",
      (s.description || "").replace(/"/g, '""'),
      (s.explanation || "").replace(/"/g, '""'),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="yc-matches-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
