import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { starStories } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

interface IncomingStory {
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
  jdRequirement: string;
  archetype?: string | null;
  matchId?: string | null;
  tags?: string[];
}

function isValidStory(v: unknown): v is IncomingStory {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  for (const k of ["situation", "task", "action", "result", "reflection", "jdRequirement"]) {
    if (typeof o[k] !== "string" || !(o[k] as string).trim()) return false;
  }
  return true;
}

export async function GET() {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const rows = await db
      .select()
      .from(starStories)
      .where(eq(starStories.userId, user.id))
      .orderBy(desc(starStories.createdAt))
      .limit(200);

    return NextResponse.json({ stories: rows });
  } catch (error) {
    console.error("GET /api/interview/star-stories error:", error);
    return NextResponse.json({ error: "Failed to load stories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const body = (await request.json().catch(() => null)) as
      | { stories?: unknown }
      | null;
    const stories = Array.isArray(body?.stories) ? body!.stories : [];

    const valid: IncomingStory[] = stories.filter(isValidStory);
    if (valid.length === 0) {
      return NextResponse.json(
        { error: "At least one valid story is required" },
        { status: 400 }
      );
    }

    const inserted = await db
      .insert(starStories)
      .values(
        valid.map((s) => ({
          userId: user.id,
          matchId: s.matchId ?? null,
          archetype: s.archetype ?? null,
          jdRequirement: s.jdRequirement.trim(),
          situation: s.situation.trim(),
          task: s.task.trim(),
          action: s.action.trim(),
          result: s.result.trim(),
          reflection: s.reflection.trim(),
          tags: Array.isArray(s.tags) ? s.tags.filter((t) => typeof t === "string") : [],
        }))
      )
      .returning();

    return NextResponse.json({ stories: inserted }, { status: 201 });
  } catch (error) {
    console.error("POST /api/interview/star-stories error:", error);
    return NextResponse.json({ error: "Failed to save stories" }, { status: 500 });
  }
}
