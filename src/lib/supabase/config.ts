export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  return {
    url,
    key,
    isConfigured: Boolean(url && key),
  };
}

export function requireSupabaseConfig() {
  const config = getSupabaseConfig();

  if (!config.url || !config.key) {
    throw new Error(
      process.env.NODE_ENV !== "production"
        ? "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY."
        : "Authentication is not available right now."
    );
  }

  return { url: config.url, key: config.key };
}

export function isLocalTestMode() {
  return (
    process.env.TEST_MODE === "true" &&
    process.env.NODE_ENV !== "production"
  );
}

export function isClientTestMode() {
  return process.env.NEXT_PUBLIC_TEST_MODE === "true";
}
