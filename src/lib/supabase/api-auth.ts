import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function getApiUser() {
  const headersList = await headers();
  const authorization = headersList.get("authorization");
  const cookie = headersList.get("cookie");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          ...(authorization ? { authorization } : {}),
          ...(cookie ? { cookie } : {}),
        },
      },
      auth: {
        flowType: "pkce",
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  // Ensure user exists in our DB (upsert by email)
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, user.email))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [newUser] = await db
    .insert(users)
    .values({ email: user.email })
    .returning();

  return newUser;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
