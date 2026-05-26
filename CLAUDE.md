<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Neutral defaults for new optional LLM fields

When adding fields to an LLM prompt+parser (scoring dimensions, extracted properties, etc.), missing fields in older/fallback provider responses MUST default to a **neutral mid-band value**, NOT `0`. A zero default silently breaks backward compatibility by dragging weighted aggregates down whenever the provider omits the field.

- Positive-signal dimensions on a 0–25 scale → default to `12` (or similar mid-band)
- Positive-signal dimensions on a 0–5 scale → default to `3`
- Penalty / red-flag dimensions (higher = worse) → default to `0` (the only exception)

When in doubt, write a small `clamp(n, fallback)` helper and pass the fallback explicitly at every call site so the intent is visible in code review. See `tasks/lessons.md` PR 2 section for the incident that motivated this rule.

# base-ui `render` prop — content goes INSIDE the render element

base-ui primitives (Tooltip, Popover, etc.) expose a `render` prop that tells the primitive which element to render as the trigger/anchor. Children passed to the primitive component become **siblings** of the rendered element, NOT descendants of it. To put icon/content inside the trigger, inline it into the `render` prop:

```tsx
// WRONG — <Info/> renders as a sibling of the button, not inside it
<TooltipTrigger render={<button className="..." />}>
  <Info className="h-4 w-4" />
</TooltipTrigger>

// RIGHT
<TooltipTrigger
  render={<button className="..."><Info className="h-4 w-4" /></button>}
/>
```

When in doubt, check the `src/components/ui/` shadcn/base-ui wrapper for the component in question to see how it expects to be composed. See `tasks/lessons.md` PR 3 section for the incident.

# Secrets — DO NOT SKIP

**Never read `.env.local`** (or any `.env*` file containing real secrets). Do not open it, cat it, grep it, or print its contents. If you need to know which environment variables exist, consult `.env.example` instead, which lists the variable names without values.

# Git workflow — DO NOT SKIP

## Rules

1. **Track lines changed.** Count lines added/modified across all files during implementation. When you exceed **500 lines changed**, stop and cut a new PR.
2. **Stacking PRs:**
   - Create a feature branch, implement until ~500 lines, commit, push, open PR against master, merge.
   - Then create the next feature branch off master (pull latest), implement next ~500 lines, repeat.
   - Continue until session is over.
3. **When told to push:** commit, push to a feature branch, open a PR against master, merge the PR.
4. **Always merge PRs.** Do not leave PRs open — push, open, merge.

## Flow per session

```
git checkout master && git pull
git checkout -b feat/part-1
# ... implement until ~500 lines ...
# commit, push, gh pr create, gh pr merge
git checkout master && git pull
git checkout -b feat/part-2
# ... implement until ~500 lines ...
# commit, push, gh pr create, gh pr merge
# ... repeat ...
```

This is **not optional**. Do this every session.
