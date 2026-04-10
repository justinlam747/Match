import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  applications,
  matchScores,
  ycCompanies,
  type ApplicationStatus,
} from "@/lib/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { APPLICATION_STATUSES } from "@/lib/applications/status";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isStatus(v: unknown): v is ApplicationStatus {
  return typeof v === "string" && (APPLICATION_STATUSES as readonly string[]).includes(v);
}

export async function GET() {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const rows = await db
      .select({
        application: applications,
        companyName: ycCompanies.name,
        companyLogo: ycCompanies.logoUrl,
        overallScore: matchScores.overallScore,
        grade: matchScores.grade,
      })
      .from(applications)
      .leftJoin(matchScores, eq(applications.matchId, matchScores.id))
      .leftJoin(ycCompanies, eq(matchScores.companyId, ycCompanies.id))
      .where(eq(applications.userId, user.id))
      .orderBy(desc(applications.lastActivityAt));

    return NextResponse.json({ applications: rows });
  } catch (error) {
    console.error("GET /api/applications error:", error);
    return NextResponse.json(
      { error: "Failed to load applications" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const body = (await request.json().catch(() => null)) as {
      matchId?: string;
      portalJobId?: string;
      status?: string;
      notes?: string;
      nextStep?: string;
    } | null;

    if (!body?.matchId && !body?.portalJobId) {
      return NextResponse.json(
        { error: "matchId or portalJobId is required" },
        { status: 400 }
      );
    }
    if (body?.matchId && !UUID_RE.test(body.matchId)) {
      return NextResponse.json({ error: "Invalid matchId" }, { status: 400 });
    }

    if (body?.matchId) {
      // Prevent duplicate application rows for the same match.
      const [existing] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(
          and(
            eq(applications.userId, user.id),
            eq(applications.matchId, body.matchId)
          )
        )
        .limit(1);
      if (existing) {
        return NextResponse.json(
          { error: "Application already exists for this match", id: existing.id },
          { status: 409 }
        );
      }
    }

    const status: ApplicationStatus = isStatus(body.status) ? body.status : "discovered";

    const [created] = await db
      .insert(applications)
      .values({
        userId: user.id,
        matchId: body.matchId || null,
        portalJobId: body.portalJobId || null,
        status,
        notes: body.notes || null,
        nextStep: body.nextStep || null,
        lastActivityAt: new Date(),
      })
      .returning();

    return NextResponse.json({ application: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/applications error:", error);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }
}
