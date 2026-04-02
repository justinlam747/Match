import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { getRunStatus } from "@/lib/agents";
import { db } from "@/lib/db";
import { agentRuns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// GET — get status of a specific run or list recent runs
export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  // Specific run
  if (runId) {
    const status = await getRunStatus(runId);
    if (!status || status.status === undefined) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }
    return NextResponse.json(status);
  }

  // List recent runs
  const runs = await db
    .select({
      id: agentRuns.id,
      agentType: agentRuns.agentType,
      status: agentRuns.status,
      error: agentRuns.error,
      createdAt: agentRuns.createdAt,
      completedAt: agentRuns.completedAt,
    })
    .from(agentRuns)
    .where(eq(agentRuns.userId, user.id))
    .orderBy(desc(agentRuns.createdAt))
    .limit(20);

  return NextResponse.json({ runs });
}
