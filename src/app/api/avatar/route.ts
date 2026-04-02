import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

// GET — return avatar options and current selection
export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  return NextResponse.json({
    current: {
      url: user.avatarUrl,
      source: user.avatarSource,
    },
    options: (user.avatarOptions as Record<string, string> | null) || {},
  });
}

// PATCH — select an avatar from available options
export async function PATCH(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { source } = body as { source: string };

  if (!source || !["google", "linkedin", "github"].includes(source)) {
    return NextResponse.json(
      { error: "source must be google, linkedin, or github" },
      { status: 400 }
    );
  }

  const opts = (user.avatarOptions as Record<string, string> | null) || {};
  const avatarUrl = opts[source];

  if (!avatarUrl) {
    return NextResponse.json(
      { error: `No ${source} avatar available` },
      { status: 404 }
    );
  }

  await db
    .update(users)
    .set({ avatarUrl, avatarSource: source })
    .where(eq(users.id, user.id));

  return NextResponse.json({ avatarUrl, avatarSource: source });
}
