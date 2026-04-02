import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resumes } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

// GET — list all resumes for user
export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const list = await db
    .select({
      id: resumes.id,
      name: resumes.name,
      isActive: resumes.isActive,
      createdAt: resumes.createdAt,
    })
    .from(resumes)
    .where(eq(resumes.userId, user.id))
    .orderBy(desc(resumes.createdAt));

  return NextResponse.json({ resumes: list });
}

// PATCH — rename or set active
export async function PATCH(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { id, name, setActive } = body as {
    id: string;
    name?: string;
    setActive?: boolean;
  };

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Verify ownership
  const [resume] = await db
    .select({ id: resumes.id })
    .from(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id)))
    .limit(1);

  if (!resume) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (setActive) {
    // Deactivate all, activate this one
    await db
      .update(resumes)
      .set({ isActive: false })
      .where(eq(resumes.userId, user.id));

    await db
      .update(resumes)
      .set({ isActive: true })
      .where(eq(resumes.id, id));
  }

  if (name !== undefined) {
    await db
      .update(resumes)
      .set({ name })
      .where(eq(resumes.id, id));
  }

  return NextResponse.json({ updated: true });
}

// DELETE — remove a resume
export async function DELETE(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await db
    .delete(resumes)
    .where(and(eq(resumes.id, id), eq(resumes.userId, user.id)));

  return NextResponse.json({ deleted: true });
}
