import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { batchJobs, batchJobItems } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { tasks } from "@trigger.dev/sdk/v3";

type TriggerByIdFn = (
  id: "evaluate-batch",
  payload: { batchId: string }
) => Promise<{ id: string }>;

function parseUrls(input: unknown): string[] {
  if (typeof input !== "string") return [];
  return input
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => {
      try {
        new URL(s);
        return true;
      } catch {
        return false;
      }
    });
}

export async function GET() {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const jobs = await db
      .select()
      .from(batchJobs)
      .where(eq(batchJobs.userId, user.id))
      .orderBy(desc(batchJobs.createdAt))
      .limit(20);

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("GET /api/batch error:", error);
    return NextResponse.json({ error: "Failed to list batches" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const body = (await request.json().catch(() => null)) as
      | { urls?: unknown }
      | null;

    const urls = parseUrls(body?.urls);
    if (urls.length === 0) {
      return NextResponse.json(
        { error: "At least one valid URL is required" },
        { status: 400 }
      );
    }
    if (urls.length > 100) {
      return NextResponse.json(
        { error: "Max 100 URLs per batch" },
        { status: 400 }
      );
    }

    // Dedupe within the batch submission itself.
    const uniqueUrls = Array.from(new Set(urls));

    const [batch] = await db
      .insert(batchJobs)
      .values({
        userId: user.id,
        status: "pending",
        totalItems: uniqueUrls.length,
      })
      .returning();

    await db.insert(batchJobItems).values(
      uniqueUrls.map((url) => ({
        batchId: batch.id,
        url,
        status: "pending" as const,
      }))
    );

    try {
      const triggerById = tasks.trigger as unknown as TriggerByIdFn;
      await triggerById("evaluate-batch", { batchId: batch.id });
    } catch (err) {
      console.error("evaluate-batch trigger error:", err);
      // The batch row is still useful — user can retry via POST /api/batch/[id]/retry
      return NextResponse.json(
        { batch, warning: "Batch created but dispatch failed — retry later" },
        { status: 202 }
      );
    }

    return NextResponse.json({ batch }, { status: 201 });
  } catch (error) {
    console.error("POST /api/batch error:", error);
    return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
  }
}
