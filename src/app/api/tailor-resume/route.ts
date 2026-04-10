import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchScores, resumes, ycCompanies, tailoredResumes } from "@/lib/db/schema";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { tailorResume } from "@/lib/ai/tailor-resume";
import { renderTailoredResumePdf } from "@/lib/pdf/generator";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function safeFilename(name: string): string {
  return name.replace(/[^a-z0-9\-_ ]/gi, "").trim().replace(/\s+/g, "_") || "resume";
}

/**
 * Build a pseudo-JD from the available company data. When we integrate real
 * portal job descriptions (PR 10), this will be replaced by the actual JD text
 * from portalJobs. For now, the company profile is enough signal for tailoring.
 */
function buildPseudoJd(company: {
  name: string;
  description: string | null;
  industries: string[];
  techStack: string[];
  stage: string | null;
}): string {
  return `Role at ${company.name}${company.stage ? ` (${company.stage} stage)` : ""}

Company: ${company.description || "N/A"}

Industries: ${company.industries.join(", ")}
Tech stack: ${company.techStack.join(", ")}

We are looking for engineers fluent in the tech stack above with experience in these industries.`;
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const body = (await request.json().catch(() => null)) as { matchId?: string } | null;
    const matchId = body?.matchId?.trim();
    if (!matchId || !UUID_RE.test(matchId)) {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }

    const [row] = await db
      .select({
        score: matchScores,
        company: ycCompanies,
        resume: resumes,
      })
      .from(matchScores)
      .innerJoin(ycCompanies, eq(matchScores.companyId, ycCompanies.id))
      .innerJoin(resumes, eq(matchScores.resumeId, resumes.id))
      .where(and(eq(matchScores.id, matchId), eq(resumes.userId, user.id)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Honesty gate: don't generate tailored resumes for poor matches — it
    // pressures the LLM to stretch language in ways that blur into fabrication.
    if (row.score.grade !== "A" && row.score.grade !== "B") {
      return NextResponse.json(
        { error: "Tailored resumes only available for grade A or B matches" },
        { status: 409 }
      );
    }

    if (!row.resume.parsedData) {
      return NextResponse.json(
        { error: "Resume is not parsed yet" },
        { status: 400 }
      );
    }

    const jdText = buildPseudoJd({
      name: row.company.name,
      description: row.company.description,
      industries: row.company.industries ?? [],
      techStack: row.company.techStack ?? [],
      stage: row.company.stage,
    });

    const tailored = await tailorResume(row.resume.parsedData, jdText, {
      sourceResumeId: row.resume.id,
      userId: user.id,
    });

    const pdfBuffer = await renderTailoredResumePdf(tailored, {
      candidateName: row.resume.parsedData.name,
      candidateEmail: row.resume.parsedData.email,
      pageSize: "LETTER",
    });

    await db.insert(tailoredResumes).values({
      userId: user.id,
      matchId: row.score.id,
      sourceResumeId: row.resume.id,
      jdLanguage: tailored.jdLanguage,
      keywords: tailored.keywords,
      coveragePercent: tailored.coveragePercent,
      tailoredData: tailored,
      pageSize: "LETTER",
    });

    const filename = `${safeFilename(row.resume.parsedData.name)}_${safeFilename(row.company.name)}.pdf`;

    return NextResponse.json({
      pdfBase64: pdfBuffer.toString("base64"),
      coveragePercent: tailored.coveragePercent,
      filename,
    });
  } catch (error) {
    console.error("POST /api/tailor-resume error:", error);
    return NextResponse.json(
      { error: "Failed to generate tailored resume" },
      { status: 500 }
    );
  }
}
