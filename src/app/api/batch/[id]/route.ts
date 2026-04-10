import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { batchJobs, batchJobItems } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid batch id" }, { status: 400 });
    }

    const [batch] = await db
      .select()
      .from(batchJobs)
      .where(and(eq(batchJobs.id, id), eq(batchJobs.userId, user.id)))
      .limit(1);

    if (!batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }

    const items = await db
      .select()
      .from(batchJobItems)
      .where(eq(batchJobItems.batchId, id))
      .orderBy(asc(batchJobItems.url));

    return NextResponse.json({ batch, items });
  } catch (error) {
    console.error("GET /api/batch/[id] error:", error);
    return NextResponse.json({ error: "Failed to load batch" }, { status: 500 });
  }
}
