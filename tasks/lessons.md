# Lessons — YCMatch x career-ops integration

Durable lessons extracted from PR 1 (`feat/pr1-attribution-archetype-schema`: attribution, archetype detector, 6-dimension scoring schema).

## Drizzle migrations — never hand-write

Never hand-write the SQL + `_journal.json` entry for a Drizzle migration. Always run:

```
npx drizzle-kit generate --name=<name>
```

This produces the SQL, `drizzle/meta/NNNN_snapshot.json`, and the `_journal.json` entry in lockstep. A hand-written migration skips the snapshot, which silently breaks the next `drizzle-kit generate` (it diffs against the last snapshot, not the DB). PR 1's first critic caught this — fix was to delete the hand-written files and regenerate via `drizzle-kit generate --name=career_ops_scoring`.

## AppFooter is orphaned by default

`src/components/app-footer.tsx` exists in the repo but was never imported anywhere until PR 1 mounted it in `src/app/(app)/layout.tsx`. If a future PR adds a link "to the footer", verify the footer is actually rendered on the route in question. Don't assume a component is mounted just because it exists.

## Shared JSON-extraction regex in `src/lib/ai/` — candidate for extraction

At least six files in `src/lib/ai/` reimplement the same JSON-from-LLM-response pattern:

- `score-match.ts`
- `interview-prep.ts`
- `parse-resume.ts`
- `free-inference.ts`
- `benchmark.ts`
- `archetype-detector.ts` (added in PR 1)

They all do roughly:

```ts
const match = text.match(/\{[\s\S]*\}/);
if (!match) throw new Error("no JSON");
try { return JSON.parse(match[0]); } catch { ... }
```

There is no shared `extractJSON` helper. A future PR that touches `src/lib/ai/` should extract this into `src/lib/ai/client.ts` or a sibling util. Not urgent enough to do as a one-off, but worth rolling into the next AI-module PR.

## AI client calling convention

All `chatCompletion` callers in `src/lib/ai/` use the shape:

```ts
chatCompletion({ tier, system, prompt, maxTokens, userId })
```

New AI modules must match exactly. In particular, **always thread `userId`** so BYOK (bring-your-own-key) works. PR 1's first critic caught `archetype-detector.ts` omitting `userId`.

## TypeScript `.includes` on `readonly` tuples

When you have:

```ts
export const ROLE_ARCHETYPES = ["a", "b", "c", ...] as const;
type RoleArchetype = typeof ROLE_ARCHETYPES[number];
```

…then `ROLE_ARCHETYPES.includes(x)` where `x: string` errors because the readonly tuple's `.includes` parameter is narrowed to `RoleArchetype`. That's the opposite of what you want for a runtime type guard. Use:

```ts
if ((ROLE_ARCHETYPES as readonly string[]).includes(x)) {
  return x as RoleArchetype;
}
```

## Pre-existing TS errors on master

`src/lib/ai/benchmark.ts:441` has 2 pre-existing TS errors on master (missing `desc` / `tech` properties). When running `npx tsc --noEmit` on a feature branch to judge "clean compile", filter these out — they're not your PR's fault.

## PR stacking — PRD §1.2.5 belongs in PR 2, not PR 1

PRD section 1.2.5 (the overall score formula combining the 6 dimensions) is intentionally deferred to PR 2. PR 1 only adds the schema + ScoreWeights interface + archetype detector. Don't flag the missing formula as a gap during PR 1 review.

## Export all types consumers might need

`archetype-detector.ts` initially did not export `DetectionResult` — the first critic flagged it because downstream callers couldn't name the return type. Default to exporting every interface/type in an AI module, not just the function.

## MIT header comments on third-party-derived files

Files whose logic is derived from an MIT-licensed source (e.g. career-ops) need an MIT header comment at the top naming the upstream project. PR 1's first critic caught `archetype-detector.ts` missing this.

## Legal pages — read from the source of truth

`src/app/legal/third-party/page.tsx` should `fs.readFileSync` the repo's `THIRD_PARTY_LICENSES.md` rather than duplicating the MIT text inline. The simplify pass caught the duplication in PR 1.

---

# PR 2 lessons (`feat/pr2-grading-scoring-prompt`: grade calculator, 8-dim scoring, weighted overall)

## Backward-compat for new optional LLM fields — default to NEUTRAL, not zero

When adding score dimensions to an LLM prompt+parser, missing fields from older/fallback provider responses must default to a **neutral mid-band value** (e.g. `12` on a 0–25 scale), NOT `0`. A zero default silently breaks backward compatibility — it drags weighted overall scores down by tens of points whenever the provider omits a field. Penalty dimensions (e.g. `redFlagScore`, where higher = worse) are the exception and should default to `0`.

PR 2's first critic caught `parseScoreJSON` defaulting all 8 new dimensions to 0, dropping weighted overall by ~40 points on backward-compat inputs. Fix was a `clamp25(n, fallback = 12)` helper for positive dimensions and `clamp25(n, 0)` for penalty dimensions. This rule is general enough that it's also been promoted to `AGENTS.md`.

## Cached LLM-enrichment columns must be read, written, and USED

When adding a DB column populated by an LLM call (e.g. `yc_companies.archetype`), the consumer must:

1. **Prefer the cached value** — check the column before firing the detection LLM call.
2. **Write back on miss** — when the column is null and you compute a value, persist it so the next scan hits the cache. In the route, batch the writebacks with `Promise.all` over the misses.
3. **Actually thread the value into the downstream prompt** — otherwise you pay the LLM cost on every scan without ever improving scoring quality.

PR 2 initially did (1) only — the simplify gate caught that the cached archetype was never passed to `scoreMatch`'s prompt, and there was no writeback path. The cache would never fill, and even when it did, the LLM wouldn't see it.

## Multiple divergent `CompanyData` / `CompanyInput` shapes

This codebase has several scoring entry points, each with its own slightly-different company DTO:

- `src/lib/ai/score-match.ts` (`CompanyData`)
- `src/lib/ai/free-inference.ts`
- `src/trigger/scorer.ts`
- `src/lib/agents/agents/scoring.ts`

When adding a field (like `archetype`) to one, grep all of them to avoid divergence. This is pre-existing tech debt — consolidating into a shared DTO is a future PR's job, not a drive-by.

## Drizzle insert with optional jsonb — `undefined` is fine

`db.insert(matchScores).values({ gradeBreakdown: undefined })` works on a nullable jsonb column. No need for `?? null` guards. But: if you add a new column to the table, the `ScoredRow` type that feeds the insert spread must be widened too, AND the insert call's `.values({...row, newCol: row.newCol})` spread must explicitly include it. PR 2's second critic caught the insert site never persisting `grade`/`gradeBreakdown` because the type was too narrow and the spread didn't pick them up.

## Raw-SQL SELECTs in `src/app/api/score-matches/route.ts`

This route uses `db.execute(sql\`SELECT ... FROM yc_companies\`)` with a hand-typed result interface rather than drizzle's query builder. Adding a new column requires updating BOTH the SELECT clause AND the TypeScript row-type assertion. Easy to forget — the type will still compile if you add the column to the interface but not the SQL, because `db.execute` returns `unknown`-ish rows. Always update both.

## Provider fallback chain in `score-match.ts` — heuristic must emit ALL fields

Fallback order is: local fine-tuned model → Groq → Claude → OpenAI → **local heuristic**. The local heuristic is the bottom of the chain and will run when every provider fails, so it must emit **every** field the parser expects, including ones added in later PRs. When adding a new scoring dimension, update both the LLM prompt templates AND `localHeuristic`. Otherwise a total-provider-failure scan silently produces malformed rows.

## Strong-type shared enums across module boundaries

`archetype` started as `string | null` in `CompanyData`, `MatchResult`, and the route's row type. The simplify pass promoted it to `RoleArchetype | null` everywhere. Whenever a value comes from a known `as const` tuple (like `ROLE_ARCHETYPES`), type it as the union across every interface it crosses — the extra imports are worth catching typos at compile time.

## Don't duplicate instructions between SYSTEM_PROMPT and user prompt

`buildPrompt` in `score-match.ts` initially repeated "Score all 8 dimensions" even though `SYSTEM_PROMPT` already said it. That's pure token waste on every scoring call. When editing AI prompts, diff against the system prompt and strip any redundant instructions from the user-prompt builder.
