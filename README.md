# YC Match

YC Match is an AI-powered job-matching tool for the 500+ companies in the Y Combinator portfolio. Upload your resume once and get a ranked, graded shortlist of the YC companies that actually fit your background — with a transparent, per-company breakdown of *why*.

## What it does

**Smart matching.** Every YC company is scored against your resume on an 8-dimension fit model — tech alignment, industry, stage, hiring signals, compensation, culture, career trajectory (north star), and red flags. Each dimension rolls up into a weighted 0–100 overall score and an A–F grade, backed by `pgvector` similarity search over the company corpus.

**A hybrid scoring stack.** Scoring runs through a provider fallback chain — a local fine-tuned model → a hosted Hugging Face model → Groq → Claude → OpenAI — and falls back to a fast, zero-cost rule-based heuristic when no model is available. It always returns a result, with or without API keys configured.

**Transparent reports.** Every match has a detail page with all eight dimensions, the grade and recommendation, a role-archetype read, and a plain-English explanation of the fit. The full ranked list filters by grade, archetype, batch, tech, and score, and exports to CSV.

**Bring your own key.** Add your own OpenAI or Anthropic key — encrypted at rest (AES-256-GCM) and used at scoring time in preference to server keys.

## Stack

Next.js 16 · React 19 · Supabase (auth) · Drizzle + Postgres with `pgvector` · OpenAI / Anthropic / Groq · Tailwind v4.
