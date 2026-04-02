import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { tick, getRunStatus } from "@/lib/agents";

// POST — advance a run by one step
export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { runId } = body as { runId: string };

  if (!runId) {
    return NextResponse.json({ error: "runId is required" }, { status: 400 });
  }

  const result = await tick(runId);
  const status = await getRunStatus(runId);

  return NextResponse.json({ ...result, run: status });
}
