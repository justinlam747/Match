# Trigger.dev Integration - Research

**Researched:** 2026-03-31
**Domain:** Background jobs / task scheduling with Trigger.dev in Next.js
**Confidence:** HIGH

## Summary

Trigger.dev is a background job and task scheduling platform for TypeScript. The user asked about v3, but **v3 is deprecated** -- new v3 deploys stop working April 1, 2026 and v3 fully shuts down July 1, 2026. The current version is **v4** (GA since August 2025, latest release v4.4.3 from March 10, 2026). This research covers v4, which is the only viable option.

The migration from v3 to v4 is minimal: the main change is `import { task } from "@trigger.dev/sdk"` instead of `import { task } from "@trigger.dev/sdk/v3"`, `handleError` renamed to `catchError`, and queues must be pre-defined rather than created on-the-fly. The API surface (`task()`, `schedules.task()`, `trigger()`, `triggerAndWait()`, `batchTrigger()`) is essentially the same.

For this Next.js 16 project, the setup involves installing 2 npm packages, creating a `trigger.config.ts` at the project root, placing task files in `src/trigger/`, and setting one environment variable (`TRIGGER_SECRET_KEY`). No API route handler is needed in v4 -- tasks are deployed separately and triggered via the SDK from server-side code.

**Primary recommendation:** Use Trigger.dev v4 (latest). Install `@trigger.dev/sdk` as a dependency and `@trigger.dev/build` + `trigger.dev` as dev dependencies. Place all task files in `src/trigger/`. Use `schedules.task()` with declarative `cron` for recurring tasks.

## Standard Stack

### Core

| Package | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@trigger.dev/sdk` | ^4.4.3 (latest) | SDK for defining tasks and triggering them | The core SDK -- required for all Trigger.dev functionality |
| `trigger.dev` | ^4.4.3 (latest) | CLI for dev server, deploy, and management | Required for local development (`trigger dev`) and deployment (`trigger deploy`) |
| `@trigger.dev/build` | ^4.4.3 (latest) | Build extensions and configuration utilities | Required for build-time config (Vercel env sync, Prisma, etc.) |

### Supporting (Optional)

| Package | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@trigger.dev/react-hooks` | ^4.4.3 | React hooks for real-time run monitoring | When you need to show task progress in the UI |
| `concurrently` | ^9.x | Run Next.js and Trigger.dev dev servers together | Development convenience |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Trigger.dev | Inngest | Inngest is similar but Trigger.dev has better Next.js DX and declarative cron |
| Trigger.dev | BullMQ + Redis | Self-hosted, more infrastructure burden, no managed dashboard |
| Trigger.dev | Vercel Cron + Serverless Functions | Limited to 10s/60s execution, no task chaining, no retry logic |

**Installation:**
```bash
# Production dependency
npm install @trigger.dev/sdk@latest

# Dev dependencies
npm install -D trigger.dev@latest @trigger.dev/build@latest
```

**IMPORTANT:** Keep all three `@trigger.dev/*` / `trigger.dev` packages at the same version number.

## Architecture Patterns

### Recommended Project Structure
```
src/
  trigger/
    init.ts              # Optional: global setup (middleware, locals, shared clients)
    scrape-company.ts    # One file per task (or logical group)
    score-matches.ts
    draft-emails.ts
    scheduled/
      daily-scrape.ts    # Cron/scheduled tasks
      weekly-digest.ts
trigger.config.ts        # Project root -- Trigger.dev configuration
.env.local               # TRIGGER_SECRET_KEY goes here
```

### Pattern 1: Basic Task Definition

**What:** Define a task with `task()` from `@trigger.dev/sdk`
**When to use:** Any background job that is triggered on-demand

```typescript
// src/trigger/score-matches.ts
// Source: https://trigger.dev/docs/tasks/overview

import { task } from "@trigger.dev/sdk";

export const scoreMatchesTask = task({
  id: "score-matches",
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  run: async (payload: { userId: string; companyIds: string[] }) => {
    // Your scoring logic here
    const results = [];
    for (const companyId of payload.companyIds) {
      const score = await computeScore(payload.userId, companyId);
      results.push({ companyId, score });
    }
    return results; // Must be JSON-serializable
  },
});
```

### Pattern 2: Schema-Validated Task

**What:** Define a task with Zod schema validation using `schemaTask()`
**When to use:** When you want runtime payload validation before the task runs

```typescript
// src/trigger/draft-email.ts
// Source: https://trigger.dev/docs/tasks/schemaTask

import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

export const draftEmailTask = schemaTask({
  id: "draft-email",
  schema: z.object({
    userId: z.string(),
    companyId: z.string(),
    tone: z.enum(["formal", "casual"]).default("formal"),
  }),
  run: async (payload) => {
    // payload is fully typed from the schema
    // payload.tone defaults to "formal" if not provided
    const draft = await generateEmail(payload.userId, payload.companyId, payload.tone);
    return { draft };
  },
});
```

**IMPORTANT:** Use Zod v3 (not v4). There are known compatibility issues with Zod v4 and `@trigger.dev/core` as of v4.3.x. Since this project likely uses whatever zod version -- verify before adding.

### Pattern 3: Scheduled/Cron Task

**What:** Define a recurring task with `schedules.task()` and declarative `cron`
**When to use:** Any task that runs on a schedule (daily scraping, weekly digests, etc.)

```typescript
// src/trigger/scheduled/daily-scrape.ts
// Source: https://trigger.dev/docs/tasks/scheduled

import { schedules } from "@trigger.dev/sdk";

export const dailyScrapeTask = schedules.task({
  id: "daily-scrape",
  cron: "0 6 * * *", // Every day at 6:00 AM UTC
  run: async (payload) => {
    // payload.timestamp   -- UTC Date when scheduled to run
    // payload.lastTimestamp -- previous execution Date or undefined
    // payload.timezone    -- IANA timezone string (default "UTC")
    // payload.scheduleId  -- unique schedule ID
    // payload.externalId  -- optional external ID (for multi-tenant)
    // payload.upcoming    -- next 5 scheduled run dates

    console.log(`Running daily scrape at ${payload.timestamp}`);
    // ... scrape logic
  },
});
```

**With timezone:**
```typescript
export const weeklyDigestTask = schedules.task({
  id: "weekly-digest",
  cron: {
    pattern: "0 9 * * 1",   // Every Monday at 9:00 AM
    timezone: "America/New_York",
    environments: ["PRODUCTION"], // Only run in production
  },
  run: async (payload) => {
    // ...
  },
});
```

### Pattern 4: Task Chaining (trigger, triggerAndWait, batch)

**What:** Tasks calling other tasks
**When to use:** Workflows where one task depends on another's output

```typescript
// src/trigger/orchestrate-scoring.ts
// Source: https://trigger.dev/docs/triggering

import { task, batch } from "@trigger.dev/sdk";
import { scoreMatchesTask } from "./score-matches";
import { draftEmailTask } from "./draft-email";

export const orchestrateScoringTask = task({
  id: "orchestrate-scoring",
  run: async (payload: { userId: string; companyIds: string[] }) => {

    // --- Fire and forget (does NOT wait) ---
    const handle = await scoreMatchesTask.trigger({
      userId: payload.userId,
      companyIds: payload.companyIds,
    });
    // handle.id gives you the run ID

    // --- Trigger and WAIT for result ---
    const result = await scoreMatchesTask.triggerAndWait({
      userId: payload.userId,
      companyIds: payload.companyIds,
    });
    if (result.ok) {
      console.log("Scores:", result.output);
    } else {
      console.error("Failed:", result.error);
    }
    // Or use .unwrap() to throw on error:
    const output = await scoreMatchesTask.triggerAndWait({
      userId: payload.userId,
      companyIds: payload.companyIds,
    }).unwrap();

    // --- Batch trigger (fan-out, don't wait) ---
    const batchHandle = await draftEmailTask.batchTrigger(
      payload.companyIds.map((companyId) => ({
        payload: { userId: payload.userId, companyId },
      }))
    );

    // --- Batch trigger and WAIT for all results ---
    const batchResults = await draftEmailTask.batchTriggerAndWait(
      payload.companyIds.map((companyId) => ({
        payload: { userId: payload.userId, companyId },
      }))
    );
    for (const run of batchResults.runs) {
      if (run.ok) {
        console.log("Draft:", run.output);
      }
    }

    // --- Batch trigger DIFFERENT tasks and wait ---
    const mixedResults = await batch.triggerByTaskAndWait([
      { task: scoreMatchesTask, payload: { userId: "u1", companyIds: ["c1"] } },
      { task: draftEmailTask, payload: { userId: "u1", companyId: "c1" } },
    ]);

    return { completed: true };
  },
});
```

### Pattern 5: Triggering from Next.js Backend Code

**What:** Triggering tasks from API routes, Server Actions, or route handlers
**When to use:** When a user action should kick off a background job

```typescript
// src/app/api/start-scoring/route.ts
// Source: https://trigger.dev/docs/guides/frameworks/nextjs

import { tasks } from "@trigger.dev/sdk";
import type { scoreMatchesTask } from "@/trigger/score-matches";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId, companyIds } = await request.json();

  // Use tasks.trigger() with type-only import to avoid bundling task code
  const handle = await tasks.trigger<typeof scoreMatchesTask>(
    "score-matches",
    { userId, companyIds }
  );

  return NextResponse.json({ runId: handle.id });
}
```

**CRITICAL:** Use `import type` when importing task types in Next.js routes. This prevents the task code from being bundled into your Next.js app. The `tasks.trigger()` function takes the task ID as a string and the payload.

### Pattern 6: Dynamic/Multi-Tenant Schedules

**What:** Create per-user or per-entity cron schedules at runtime
**When to use:** Each user needs their own schedule (e.g., custom notification times)

```typescript
// In your API route or server action:
import { schedules } from "@trigger.dev/sdk";

// Create a schedule for a specific user
const schedule = await schedules.create({
  task: "daily-scrape",
  cron: "0 8 * * *",
  timezone: "America/New_York",
  externalId: userId,
  deduplicationKey: `${userId}-daily-scrape`,
});

// Later: manage the schedule
await schedules.deactivate(schedule.id);
await schedules.activate(schedule.id);
await schedules.update(schedule.id, { cron: "0 9 * * *" });
await schedules.del(schedule.id);
```

### Anti-Patterns to Avoid

- **Importing task modules in Next.js routes:** Always use `import type` and `tasks.trigger()` with the string ID. Importing the actual task module bundles all its dependencies into your Next.js app.
- **Creating queues on-the-fly (v3 pattern):** In v4, queues must be pre-defined in code. Don't pass `{ queue: { name: "x", concurrencyLimit: 5 } }` in trigger options.
- **Using `@trigger.dev/sdk/v3` import path:** This is deprecated. Use `@trigger.dev/sdk` directly.
- **Returning non-serializable data from tasks:** Task outputs must be JSON-serializable (strings, numbers, booleans, arrays, objects, null). No Date objects, class instances, etc.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Retry logic for background jobs | Custom retry with exponential backoff | Trigger.dev built-in `retry` config | Edge cases: jitter, max attempts, timeout caps, dead-letter handling |
| Cron scheduling | node-cron or setTimeout loops | `schedules.task()` with declarative `cron` | Timezone DST handling, missed run recovery, dashboard visibility |
| Task orchestration / fan-out | Promise.all with fetch calls | `batchTriggerAndWait()` | Automatic retry per-item, partial failure handling, observability |
| Job queue with concurrency limits | Custom Redis queue | Trigger.dev `queue()` with `concurrencyLimit` | Race conditions, distributed locking, scaling |
| Background job monitoring | Custom logging + DB tracking | Trigger.dev Dashboard | Built-in run history, error tracking, real-time logs |

**Key insight:** Trigger.dev handles the entire background job lifecycle (scheduling, queuing, retrying, monitoring, logging). Building any of these individually is straightforward; building them all correctly together is very hard.

## Common Pitfalls

### Pitfall 1: Importing Task Modules in Next.js App Code
**What goes wrong:** Your Next.js bundle becomes huge and may include server-only dependencies
**Why it happens:** Developers import task files directly instead of using `import type`
**How to avoid:** Always use `import type { myTask } from "@/trigger/my-task"` in Next.js routes, then call `tasks.trigger<typeof myTask>("task-id", payload)`
**Warning signs:** Slow Next.js builds, "module not found" errors for Node-only packages

### Pitfall 2: TRIGGER_SECRET_KEY Missing at Build Time
**What goes wrong:** Next.js build fails because it tries to evaluate SDK calls during static generation
**Why it happens:** Next.js pre-renders routes at build time, and the SDK expects the env var
**How to avoid:** Mark routes that trigger tasks as `export const dynamic = "force-dynamic"` or ensure the env var is available at build time
**Warning signs:** Build failures in CI with "TRIGGER_SECRET_KEY not found"

### Pitfall 3: Version Mismatch Between Packages
**What goes wrong:** Cryptic runtime errors, type mismatches
**Why it happens:** `@trigger.dev/sdk`, `@trigger.dev/build`, and `trigger.dev` CLI at different versions
**How to avoid:** Always use `npx trigger.dev@latest update` to sync all packages to the same version
**Warning signs:** TypeScript errors after upgrading one package

### Pitfall 4: Zod v4 Incompatibility
**What goes wrong:** Runtime error from `zod-validation-error` accessing Zod v3 internals
**Why it happens:** `@trigger.dev/core` depends on `zod-validation-error@^1.5.0` which only works with Zod v3
**How to avoid:** Use Zod v3.x, not v4.x, if using `schemaTask()`
**Warning signs:** Runtime errors mentioning `ZodError` internal properties

### Pitfall 5: Forgetting .trigger in .gitignore
**What goes wrong:** Build artifacts committed to git
**Why it happens:** Trigger.dev creates a `.trigger` directory during `trigger dev` / `trigger deploy`
**How to avoid:** Add `.trigger` to `.gitignore`
**Warning signs:** Large diffs with compiled JS files in `.trigger/`

### Pitfall 6: Using v3 Import Paths
**What goes wrong:** Code works but uses deprecated paths that will break
**Why it happens:** Most existing tutorials/blog posts still show `@trigger.dev/sdk/v3`
**How to avoid:** Always use `import { task } from "@trigger.dev/sdk"` (no `/v3` suffix)
**Warning signs:** Deprecation warnings in console

## Code Examples

### Complete trigger.config.ts

```typescript
// trigger.config.ts (project root)
// Source: https://trigger.dev/docs/config/config-file

import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  // Required: your project reference from the Trigger.dev dashboard
  project: "<your-project-ref>",

  // Directories containing task files
  dirs: ["./src/trigger"],

  // Default retry policy for all tasks (overridable per-task)
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },

  // Maximum task duration in seconds (default: unlimited)
  maxDuration: 300,

  // Node.js runtime version
  runtime: "node",  // Options: "node" (21.7.3), "node-22" (22.16.0), "bun" (1.3.3)

  // Log level for Trigger.dev dashboard
  logLevel: "info",
});
```

**With Vercel deployment (if applicable):**
```typescript
import { defineConfig } from "@trigger.dev/sdk";
import { syncVercelEnvVars } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "<your-project-ref>",
  dirs: ["./src/trigger"],
  build: {
    extensions: [syncVercelEnvVars()],
  },
});
```

**With Supabase (relevant for this project):**
```typescript
import { defineConfig } from "@trigger.dev/sdk";
import { syncSupabaseEnvVars } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "<your-project-ref>",
  dirs: ["./src/trigger"],
  build: {
    extensions: [syncSupabaseEnvVars()],
  },
});
```

### Complete Queue Definition (v4 pattern)

```typescript
// src/trigger/queues.ts
import { queue } from "@trigger.dev/sdk";

export const scrapingQueue = queue({
  name: "scraping-queue",
  concurrencyLimit: 5, // Max 5 concurrent scraping tasks
});

export const emailQueue = queue({
  name: "email-queue",
  concurrencyLimit: 2, // Max 2 concurrent email sends
});
```

```typescript
// src/trigger/scrape-company.ts
import { task } from "@trigger.dev/sdk";
import { scrapingQueue } from "./queues";

export const scrapeCompanyTask = task({
  id: "scrape-company",
  queue: scrapingQueue,
  retry: { maxAttempts: 3 },
  run: async (payload: { companyUrl: string }) => {
    // ... scraping logic
  },
});
```

### Triggering from Next.js Server Actions

```typescript
// src/app/actions.ts
"use server";

import { tasks } from "@trigger.dev/sdk";
import type { scrapeCompanyTask } from "@/trigger/scrape-company";

export async function startScraping(companyUrl: string) {
  const handle = await tasks.trigger<typeof scrapeCompanyTask>(
    "scrape-company",
    { companyUrl }
  );
  return { runId: handle.id };
}
```

### Development Scripts (package.json)

```json
{
  "scripts": {
    "dev": "npx concurrently --kill-others \"next dev\" \"npx trigger.dev@latest dev\"",
    "dev:next": "next dev",
    "dev:trigger": "npx trigger.dev@latest dev",
    "trigger:deploy": "npx trigger.dev@latest deploy"
  }
}
```

### Trigger Options Reference

```typescript
// All available trigger options
await myTask.trigger(
  { /* payload */ },
  {
    delay: "1h",                    // Delay execution (string or Date)
    ttl: "24h",                     // Auto-expire if not started
    idempotencyKey: "unique-key",   // Prevent duplicate runs
    tags: ["user:123", "scoring"],  // Categorization tags
    metadata: { source: "api" },    // Custom metadata
    maxAttempts: 5,                 // Override retry count
    maxDuration: 600,               // Max execution seconds
    priority: 1,                    // Higher = runs first (default: 0)
  }
);
```

## Environment Variables

| Variable | Required | Where | Purpose |
|----------|----------|-------|---------|
| `TRIGGER_SECRET_KEY` | Yes | `.env.local` | Authenticates SDK calls. Format: `tr_dev_xxxxx` (dev) or `tr_prod_xxxxx` (production) |
| `TRIGGER_API_URL` | Only if self-hosted | `.env.local` | Override API endpoint (default: `https://api.trigger.dev`) |
| `TRIGGER_PREVIEW_BRANCH` | Only for preview | CI/CD | Branch name for preview deployments |

Get your keys from: Trigger.dev Dashboard -> Project -> API Keys page.

## State of the Art

| Old Approach (v3) | Current Approach (v4) | When Changed | Impact |
|--------------------|-----------------------|--------------|--------|
| `import from "@trigger.dev/sdk/v3"` | `import from "@trigger.dev/sdk"` | v4 GA (Aug 2025) | Must update all imports |
| `handleError` hook | `catchError` hook | v4 GA | Rename in all tasks |
| Dynamic queue creation in trigger options | Pre-defined `queue()` objects | v4 GA | Must define queues before use |
| `init` hook for shared resources | Middleware + Locals API | v4 GA | Different pattern for shared state |
| Cold starts (several seconds) | Warm starts (100-300ms) | v4 GA | Major performance improvement |
| `triggerAndWait` returns raw output | Returns `Result` object with `.ok`, `.output`, `.error` | v4 GA | Must check `result.ok` or use `.unwrap()` |
| `batchTrigger` returns runs directly | Returns handle, must call `batch.retrieve()` | v4 GA | Extra step to get run details |

**Deprecated/outdated:**
- `@trigger.dev/sdk/v3` import path: use `@trigger.dev/sdk` instead
- `@trigger.dev/nextjs` package: this was for v2 webhook-style integration, NOT needed in v3/v4
- `handleError` lifecycle hook: renamed to `catchError`
- `toolTask` function: replaced by `ai.tool()`
- `init` lifecycle hook: replaced by middleware + locals pattern
- `dependenciesToBundle` config: removed in new build system (all deps bundled by default)

## No API Route Handler Needed

**IMPORTANT:** Unlike Trigger.dev v2 (which required a `/api/trigger` route handler), v3 and v4 do NOT require any API route in your Next.js app. Tasks are deployed separately to Trigger.dev infrastructure via `trigger deploy`. You trigger them from your backend code using the SDK (`tasks.trigger()`, `myTask.trigger()`, etc.) which communicates with the Trigger.dev API directly.

The only "integration point" is:
1. `trigger.config.ts` at your project root
2. Task files in `src/trigger/`
3. `TRIGGER_SECRET_KEY` in your environment
4. SDK calls in your API routes / Server Actions

## Open Questions

1. **Supabase env sync extension availability**
   - What we know: v4.4.3 release notes mention `syncSupabaseEnvVars` extension
   - What's unclear: Exact import path and configuration details for this extension
   - Recommendation: Check `@trigger.dev/build` exports after installation, or use manual env vars

2. **Zod v4 compatibility timeline**
   - What we know: There's an open GitHub issue (#2805) about Zod v4 incompatibility
   - What's unclear: When this will be fixed
   - Recommendation: Stick with Zod v3 if using `schemaTask()`

3. **Next.js 16 specific considerations**
   - What we know: Trigger.dev docs reference Next.js App Router support generically
   - What's unclear: Whether Next.js 16 (which this project uses) has any specific quirks
   - Recommendation: The integration is minimal (just SDK calls), so Next.js version should not matter much

## Sources

### Primary (HIGH confidence)
- [Next.js setup guide](https://trigger.dev/docs/guides/frameworks/nextjs) - Full Next.js integration docs
- [trigger.config.ts reference](https://trigger.dev/docs/config/config-file) - Complete config file documentation
- [Scheduled tasks docs](https://trigger.dev/docs/tasks/scheduled) - Cron/scheduled task API
- [Triggering docs](https://trigger.dev/docs/triggering) - All trigger/triggerAndWait/batch methods
- [Tasks overview](https://trigger.dev/docs/tasks/overview) - Task definition and lifecycle hooks
- [schemaTask docs](https://trigger.dev/docs/tasks/schemaTask) - Schema-validated tasks
- [Manual setup guide](https://trigger.dev/docs/manual-setup) - Package installation and setup steps
- [API keys docs](https://trigger.dev/docs/apikeys) - Environment variable reference
- [v3 to v4 migration guide](https://trigger.dev/docs/migrating-from-v3) - All breaking changes

### Secondary (MEDIUM confidence)
- [v4 GA announcement](https://trigger.dev/changelog/trigger-v4-ga) - Feature overview and release date
- [v4.4.3 release notes](https://trigger.dev/changelog/v4-4-3) - Latest release details
- [GitHub releases](https://github.com/triggerdotdev/trigger.dev/releases) - Version history

### Tertiary (LOW confidence)
- [Zod v4 compatibility issue](https://github.com/triggerdotdev/trigger.dev/issues/2805) - Open issue, status unclear
- [@trigger.dev/sdk npm page](https://www.npmjs.com/package/@trigger.dev/sdk) - Version numbers (could not fetch, 403)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified via official docs, npm, and GitHub releases
- Architecture patterns: HIGH - all patterns sourced from official documentation
- Task API (task, schemaTask, schedules.task): HIGH - verified from multiple official doc pages
- Triggering API (trigger, triggerAndWait, batch): HIGH - complete docs fetched
- Pitfalls: HIGH - sourced from official troubleshooting, migration guide, and known issues
- Environment variables: HIGH - confirmed from API keys docs and setup guides
- Version numbers: MEDIUM - npm returned 403, cross-referenced GitHub releases and search results

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- v4 is GA, API unlikely to change significantly)
