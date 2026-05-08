# YC Match

AI-powered matching with 500+ YC startups. One tool for scoring, outreach, and interview prep.

## What Changed in This Branch

### Race Condition & Data Corruption Fixes

- **Email throttle was global, not per-user** (`lib/email/throttle.ts`) — `getDailySendCount` now filters by `userId`. Previously one user's sends reduced every other user's quota.
- **Rate limiter inflated count on rejected requests** (`lib/rate-limit.ts`) — Sliding window now checks the count *before* adding the member. Rejected requests no longer permanently skew the counter.
- **6 non-transactional delete-then-insert patterns** wrapped in `db.transaction()`:
  - `api/gmail/callback` — Gmail OAuth connection upsert
  - `api/keys` — API key upsert
  - `api/resumes` — Resume activation toggle
  - `api/parse-resume` — Deactivate-all + insert new resume
  - `api/score-matches` — Resume embedding upsert
  - `api/score-matches` — Match score delete + batch insert

### Performance Optimizations

- **Batch insert for match scores** (`api/score-matches`) — Replaced N+1 individual `INSERT` loop with a single `db.insert().values([...])`.
- **Parallelized dashboard queries** (`api/dashboard-status`) — Merged 2 resume queries into 1 and ran independent queries with `Promise.all`.
- **Parallelized admin log queries** (`api/admin/llm-logs`) — Logs + aggregation queries now run concurrently.
- **Memoized matches page** (`(app)/matches/page.tsx`) — Wrapped expensive `.filter().filter().sort()` chain and `selectedIds` in `useMemo`.

### Memory Leak Fixes

- **7 bento card animation loops** (`components/landing-features.tsx`) — All `setInterval`/`setTimeout` chains now properly tracked and cleared on unmount.
- **Grainient WebGL context** (`components/grainient.tsx`) — Setup runs once; prop changes update uniforms via refs instead of tearing down and rebuilding the entire GL context. Added `disposed` flag to prevent async setup from running post-unmount.

### Resource Leak Fixes

- **Timeout leaks** in `lib/scraper.ts` and `lib/ai/score-match.ts` — `clearTimeout` now called in `catch` paths.

### Landing Page Redesign

- **Step 1 (Resume Upload)** — Now shows a realistic drag-and-drop dashboard mockup with an animated cursor dragging a "resume_2025.pdf" file into a drop zone, followed by a crossfade to extracted skills. Smooth 700ms crossfade transitions between phases.
- **Step 2 (Match Scoring)** — Now shows real YC company tiles (Supabase, Retool, Vanta, etc.) in a 2-column grid that score one-by-one, mimicking the actual matches page with logos, badges, hiring dots, and industry tags.
- **Grainient hero** lightened to softer orange tones.
- Both Step 1 and Step 2 loop continuously with smooth fade transitions.
