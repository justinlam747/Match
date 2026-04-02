import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emailConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

export async function POST() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  await db
    .delete(emailConnections)
    .where(
      and(
        eq(emailConnections.userId, user.id),
        eq(emailConnections.provider, "gmail")
      )
    );

  return NextResponse.json({ disconnected: true });
}
