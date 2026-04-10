import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matchScores, resumes, ycCompanies, userProfiles } from "@/lib/db/schema";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { generateFormAnswer, type FormQuestionKind } from "@/lib/ai/form-assist";
import type { RoleArchetype } from "@/lib/ai/archetype-detector";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KINDS: FormQuestionKind[] = [
  "why-company",
  "why-role",
  "salary-expectations",
  "tell-us-about-a-time",
];

function isKind(v: unknown): v is FormQuestionKind {
  return typeof v === "string" && (KINDS as string[]).includes(v);
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const body = (await request.json().catch(() => null)) as {
      matchId?: string;
      kind?: string;
      questionText?: string;
      behavioralDimension?: string;
    } | null;

    if (!body?.matchId || !UUID_RE.test(body.matchId)) {
      return NextResponse.json({ error: "matchId is required" }, { status: 400 });
    }
    if (!isKind(body.kind)) {
      return NextResponse.json(
        { error: `kind must be one of ${KINDS.join(", ")}` },
        { status: 400 }
      );
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
      .where(and(eq(matchScores.id, body.matchId), eq(resumes.userId, user.id)))
      .limit(1);

    if (!row) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if (!row.resume.parsedData) {
      return NextResponse.json({ error: "Resume not parsed" }, { status: 400 });
    }

    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);

    const answer = await generateFormAnswer({
      kind: body.kind,
      questionText: body.questionText,
      resume: row.resume.parsedData,
      archetype: (row.score.archetype as RoleArchetype | null) ?? null,
      company: {
        name: row.company.name,
        description: row.company.description,
        industries: row.company.industries ?? [],
        techStack: row.company.techStack ?? [],
      },
      matchExplanation: row.score.explanation,
      profile: profile
        ? {
            exitNarrative: profile.exitNarrative,
            signatureStrengths: profile.signatureStrengths ?? [],
            compensationTarget: profile.compensationTarget,
            compensationMinimum: profile.compensationMinimum,
            compensationCurrency: profile.compensationCurrency,
          }
        : undefined,
      behavioralDimension:
        body.behavioralDimension as
          | "leadership"
          | "conflict"
          | "failure"
          | "ambiguity"
          | "ownership"
          | undefined,
      userId: user.id,
    });

    return NextResponse.json(answer);
  } catch (error) {
    console.error("POST /api/form-assist error:", error);
    return NextResponse.json(
      { error: "Failed to generate form answer" },
      { status: 500 }
    );
  }
}
