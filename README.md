# YC Match

YC Match is an AI-powered job search tool built for the 500+ companies in the Y Combinator portfolio. It turns the messy, repetitive process of finding and applying to startup roles into a single guided workflow: upload a resume once, get a ranked list of companies that actually fit, and move from discovery to outreach to offer without leaving the app.

## What it does

**Smart matching.** Every YC company is scored against your resume on a 6-dimensional fit model — skills, experience level, domain, stage, role type, and trajectory — using a fine-tuned scoring stack (local Qwen → hosted HF model → Groq/Claude/OpenAI fallback) backed by `pgvector` similarity search.

**Tailored outreach.** For each match, the app drafts a personalized cold email to the hiring manager and pre-fills application form responses in your voice, drawing on the specifics of your background and the company's current focus.

**Application pipeline.** A kanban board tracks every application from *applied* through *screen*, *onsite*, *offer*, and *rejected*, with a state machine that prevents invalid transitions and keeps timeline data clean.

**Batch JD evaluation.** Paste a list of job descriptions and get back a ranked fit report for each one, with an evaluation breakdown explaining the score.

**Interview prep.** Each match surfaces company-specific context — recent news, founder background, technical stack — so you walk into conversations prepared.

## Stack

Next.js 16 · React 19 · Supabase (auth) · Drizzle + Postgres with `pgvector` · OpenAI / Anthropic / Groq · Tailwind v4 · Trigger.dev for background jobs · Resend + Gmail API for outreach.
