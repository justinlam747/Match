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
