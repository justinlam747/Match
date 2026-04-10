import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { applications, type ApplicationStatus } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import {
  APPLICATION_STATUSES,
  canTransition,
} from "@/lib/applications/status";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isStatus(v: unknown): v is ApplicationStatus {
  return typeof v === "string" && (APPLICATION_STATUSES as readonly string[]).includes(v);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as {
      status?: string;
      notes?: string;
      nextStep?: string;
      nextStepDate?: string | null;
    } | null;

    const [existing] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const patch: Partial<typeof applications.$inferInsert> = {
      lastActivityAt: new Date(),
    };

    if (body?.status !== undefined) {
      if (!isStatus(body.status)) {
        return NextResponse.json(
          { error: "Invalid status" },
          { status: 400 }
        );
      }
      const result = canTransition(existing.status, body.status);
      if (!result.ok) {
        return NextResponse.json({ error: result.reason }, { status: 409 });
      }
      patch.status = body.status;
      // Auto-stamp appliedAt the first time we enter "applied".
      if (body.status === "applied" && !existing.appliedAt) {
        patch.appliedAt = new Date();
      }
    }

    if (body?.notes !== undefined) patch.notes = body.notes;
    if (body?.nextStep !== undefined) patch.nextStep = body.nextStep;
    if (body?.nextStepDate !== undefined) {
      patch.nextStepDate = body.nextStepDate ? new Date(body.nextStepDate) : null;
    }

    const [updated] = await db
      .update(applications)
      .set(patch)
      .where(eq(applications.id, id))
      .returning();

    return NextResponse.json({ application: updated });
  } catch (error) {
    console.error("PATCH /api/applications/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update application" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    await db
      .delete(applications)
      .where(and(eq(applications.id, id), eq(applications.userId, user.id)));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/applications/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete application" },
      { status: 500 }
    );
  }
}
