import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseConfig } from "./config";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;
  const { url, key } = requireSupabaseConfig();

  client = createBrowserClient(url, key);

  return client;
}
