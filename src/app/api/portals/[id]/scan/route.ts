import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { portals } from "@/lib/db/schema";
import { and, eq, isNull, or } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { tasks } from "@trigger.dev/sdk/v3";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The canonical `scan-portal` task definition lives in src/trigger/ (owned by
// the scanner worker). We reference it by id only so we don't pull worker code
// into the web runtime. This narrow type mirrors just the shape we need from
// the trigger SDK's untyped dispatch path.
type ScanPortalPayload = { portalId: string };
type RunHandle = { id: string };
type TriggerByIdFn = (
  id: "scan-portal",
  payload: ScanPortalPayload
) => Promise<RunHandle>;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid portal id" }, { status: 400 });
    }

    // Allow scanning if the portal is owned by the user OR is a system portal (userId IS NULL).
    const [portal] = await db
      .select({ id: portals.id, isActive: portals.isActive })
      .from(portals)
      .where(
        and(
          eq(portals.id, id),
          or(eq(portals.userId, user.id), isNull(portals.userId))
        )
      )
      .limit(1);

    if (!portal) {
      return NextResponse.json({ error: "Portal not found" }, { status: 404 });
    }

    if (!portal.isActive) {
      return NextResponse.json(
        { error: "Portal is inactive" },
        { status: 409 }
      );
    }

    try {
      const triggerById = tasks.trigger as unknown as TriggerByIdFn;
      const handle = await triggerById("scan-portal", { portalId: portal.id });
      return NextResponse.json({ triggered: true, runId: handle.id });
    } catch (err) {
      console.error("scan-portal trigger error:", err);
      return NextResponse.json(
        { error: "Failed to dispatch scan job" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("POST /api/portals/[id]/scan error:", error);
    return NextResponse.json({ error: "Failed to trigger scan" }, { status: 500 });
  }
}
