import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getAppUrl } from "@/lib/app-url";
import { requireSupabaseConfig } from "@/lib/supabase/config";

export async function POST() {
  const cookieStore = await cookies();
  const { url, key } = requireSupabaseConfig();

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/", getAppUrl()));
}
