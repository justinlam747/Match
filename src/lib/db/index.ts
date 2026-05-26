import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Reuse a single postgres client across hot reloads. Next.js dev (Turbopack)
// re-evaluates this module on every change; without caching it on globalThis,
// each reload spins up a fresh connection pool that never closes, and they
// accumulate until the Supabase pooler hits its client limit (EMAXCONNSESSION).
const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pgClient ??
  postgres(connectionString, {
    // Keep well under the Supabase pooler's per-endpoint client limit (15).
    max: 5,
    idle_timeout: 20, // seconds — release idle connections back to the pool
    max_lifetime: 60 * 30, // seconds — recycle connections every 30 min
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle(client, { schema });
