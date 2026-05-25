### 2026-04-28 - db-migrate
- **Trigger**: Render deployment readiness found fresh-database migrations create `vector(1536)` columns without enabling pgvector.
- **File(s)**: `drizzle/migrations/0000_misty_lilandra.sql`
- **Issues Found**: No `drizzle/CLAUDE.md`, `drizzle/schema.ts`, or `drizzle/relations.ts` exists in this repo; the source schema is `src/lib/db/schema.ts`.
- **Action Taken**: Repairing the initial Drizzle SQL migration to enable the `vector` extension before vector columns are created.
- **Verdict**: CAUGHT_BUG
