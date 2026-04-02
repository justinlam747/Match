"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "./client";

interface AuthState {
  user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, string>;
    app_metadata?: Record<string, string>;
    created_at?: string;
  } | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    supabase.auth.getSession().then(({ data }: { data: { session: { user: AuthState["user"] } | null } }) => {
      setState({
        user: data.session?.user ?? null,
        loading: false,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: { user: AuthState["user"] } | null) => {
      setState({
        user: session?.user ?? null,
        loading: false,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
