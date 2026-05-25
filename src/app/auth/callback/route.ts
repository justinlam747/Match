import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireSupabaseConfig } from "@/lib/supabase/config";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
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

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      return NextResponse.redirect(`${origin}${next}`);
    }

    const errMsg = error?.message || "No session returned";
    console.error("Auth callback error:", errMsg);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errMsg)}`
    );
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(searchParams.get("error_description") || "auth_failed")}`
  );
}
