import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const TEST_DB_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "test@match.dev",
  createdAt: new Date(),
};

export async function getApiUser() {
  if (process.env.TEST_MODE === "true" && process.env.NODE_ENV !== "production") {
    console.warn("[AUTH] Test mode active — bypassing authentication");
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, TEST_DB_USER.id))
      .limit(1);

    if (existing.length > 0) return existing[0];

    try {
      const [newUser] = await db
        .insert(users)
        .values({ id: TEST_DB_USER.id, email: TEST_DB_USER.email })
        .returning();
      return newUser;
    } catch {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, TEST_DB_USER.id))
        .limit(1);
      return user ?? null;
    }
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) return null;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, user.email))
    .limit(1);

  if (existing.length > 0) {
    const dbUser = existing[0];
    const googleAvatar = user.user_metadata?.avatar_url as string | undefined;
    // Keep Google avatar option up-to-date
    if (googleAvatar) {
      const opts = (dbUser.avatarOptions as { google?: string; linkedin?: string; github?: string } | null) || {};
      if (opts.google !== googleAvatar) {
        await db.update(users).set({
          avatarOptions: { ...opts, google: googleAvatar },
          // If current avatar was Google or not set, update it too
          ...((!dbUser.avatarUrl || dbUser.avatarSource === "google") && {
            avatarUrl: googleAvatar,
            avatarSource: "google",
          }),
        }).where(eq(users.id, dbUser.id));
        return { ...dbUser, avatarOptions: { ...opts, google: googleAvatar }, ...(!dbUser.avatarUrl || dbUser.avatarSource === "google" ? { avatarUrl: googleAvatar, avatarSource: "google" } : {}) };
      }
    }
    return dbUser;
  }

  const googleAvatar = user.user_metadata?.avatar_url as string | undefined;
  const [newUser] = await db
    .insert(users)
    .values({
      email: user.email,
      avatarUrl: googleAvatar || null,
      avatarSource: googleAvatar ? "google" : null,
      avatarOptions: googleAvatar ? { google: googleAvatar } : {},
    })
    .returning();

  return newUser;
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
