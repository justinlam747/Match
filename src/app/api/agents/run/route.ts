import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { createRun, runToCompletion } from "@/lib/agents";
import { rateLimit } from "@/lib/rate-limit";

// POST — trigger an agent run
export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const rl = await rateLimit(`agent-run:${user.id}`, 5, 60);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { agentType, input } = body as { agentType: string; input?: Record<string, unknown> };

  if (!agentType) {
    return NextResponse.json({ error: "agentType is required" }, { status: 400 });
  }

  try {
    const runId = await createRun(agentType, user.id, input || {});

    // Run to completion (non-blocking for the response if needed,
    // but for serverless we run synchronously)
    runToCompletion(runId).catch((err) => {
      console.error(`Agent run ${runId} failed:`, err);
    });

    // Return immediately with runId — client can poll for status
    return NextResponse.json({ runId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to start agent" },
      { status: 400 }
    );
  }
}
