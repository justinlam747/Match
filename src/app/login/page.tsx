"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfig, isClientTestMode } from "@/lib/supabase/config";

const SUPABASE_SETUP_MESSAGE =
  "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY to .env.local, then restart the dev server.";

function getInitialError(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const err = params.get("error");
  return err ? decodeURIComponent(err) : null;
}

export default function LoginPage() {
  const supabaseConfigured = getSupabaseConfig().isConfigured;
  const testMode = isClientTestMode();
  const setupError = !testMode && !supabaseConfigured
    ? SUPABASE_SETUP_MESSAGE
    : null;
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(!setupError);
  const [error, setError] = useState<string | null>(
    () => getInitialError() ?? setupError
  );
  const router = useRouter();

  useEffect(() => {
    if (testMode) {
      router.push("/dashboard");
      return;
    }

    if (!supabaseConfigured) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: unknown } }) => {
      if (session) {
        router.push("/dashboard");
      } else {
        setCheckingAuth(false);
      }
    }).catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Failed to check auth state");
      setCheckingAuth(false);
    });
  }, [router, supabaseConfigured, testMode]);

  async function handleGoogleLogin() {
    setLoading(true);
    setError(null);
    if (!supabaseConfigured) {
      setError(SUPABASE_SETUP_MESSAGE);
      setLoading(false);
      return;
    }
    const supabase = getSupabaseBrowserClient();

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F26522]">
        <div className="h-6 w-6 rounded-full border-2 border-white border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#F26522]">
      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F26522] via-[#F58A4B] to-[#D4551A]" />
      <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-gradient-to-bl from-black/[0.1] to-transparent" />
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-gradient-to-tr from-black/[0.08] to-transparent" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Nav */}
      <div className="relative z-10 flex items-center justify-between px-8 pt-6">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-white text-sm">
            M
          </div>
          <span className="font-bold text-white tracking-tight">Match</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Back to home
        </Link>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="w-full max-w-[420px]">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-[1.1]">
              Find your
              <br />
              startup match.
            </h1>
            <p className="mt-4 text-white/60 text-lg leading-relaxed">
              Upload your resume, get AI-matched with thousands of startups, and start reaching out.
            </p>
          </div>

          {/* Login card */}
          <div className="bg-white/[0.12] backdrop-blur-md border border-white/[0.15] p-6 space-y-4">
            {error && (
              <div className="text-sm text-white bg-red-500/20 border border-red-400/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full h-12 bg-white hover:bg-white/95 text-[#3c4043] font-medium text-sm flex items-center justify-center gap-3 transition-colors disabled:opacity-60"
            >
              {/* Google logo — full color */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? "Connecting..." : "Continue with Google"}
            </button>

            <p className="text-xs text-center text-white/40">
              We only read your profile info. No spam, ever.
            </p>
          </div>

          {/* Footer */}
          <p className="mt-6 text-xs text-white/30 text-center">
            By signing in you agree to our terms of service.
          </p>

          {/* Stats */}
          <div className="mt-12 flex items-center gap-8 text-white/50">
            <div>
              <div className="text-2xl font-bold text-white/80">3,900+</div>
              <div className="text-xs">startups indexed</div>
            </div>
            <div className="w-px h-8 bg-white/15" />
            <div>
              <div className="text-2xl font-bold text-white/80">AI</div>
              <div className="text-xs">powered matching</div>
            </div>
            <div className="w-px h-8 bg-white/15" />
            <div>
              <div className="text-2xl font-bold text-white/80">Free</div>
              <div className="text-xs">to get started</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
