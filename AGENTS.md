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
