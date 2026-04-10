# PRD: Career-Ops Matching Engine Integration

**Project:** YCMatch x Career-Ops Commercialization
**Date:** 2026-04-06
**Status:** DRAFT - Pending Review
**License:** Career-Ops is MIT licensed. Compliance verified by project owner.

---

## Executive Summary

Integrate career-ops' battle-tested job evaluation framework into YCMatch to transform it from a YC-company-only matching tool into a **full-spectrum career matching platform**. This adds 6-dimensional scoring, role archetype detection, ATS portal scanning, STAR interview prep, and ATS-optimized resume generation.

---

## PHASE 1: Enhanced Scoring Engine
> Upgrade from 4-dimension scoring (tech/industry/stage/hiring) to career-ops' 6-dimension A-F framework

### 1.1 Role Archetype Detection
- [ ] **1.1.1** Create `src/lib/ai/archetype-detector.ts`
- [ ] **1.1.2** Define 6 archetype enum: `platform-llmops`, `agentic-automation`, `technical-pm`, `solutions-architect`, `forward-deployed`, `transformation-lead`
- [ ] **1.1.3** Build archetype detection prompt that classifies a job description into one of the 6 archetypes
- [ ] **1.1.4** Add `archetype` column to `matchScores` table (text, nullable)
- [ ] **1.1.5** Add `archetype` column to `ycCompanies` table (text, nullable) for company-level classification
- [ ] **1.1.6** Wire archetype detection into the scoring pipeline (run before scoring, pass result to scorer)

### 1.2 Expanded Scoring Dimensions
- [ ] **1.2.1** Add `compensationScore` column to `matchScores` (real, 0-25) — market comp competitiveness
- [ ] **1.2.2** Add `cultureScore` column to `matchScores` (real, 0-25) — cultural signal alignment
- [ ] **1.2.3** Add `redFlagScore` column to `matchScores` (real, 0-25) — penalty deductions for concerns
- [ ] **1.2.4** Add `northStarScore` column to `matchScores` (real, 0-25) — strategic career direction fit
- [ ] **1.2.5** Update `overallScore` formula: weighted composite of all dimensions (configurable weights)
- [ ] **1.2.6** Add `scoreWeights` JSON column to `userPreferences` for per-user dimension weighting
- [ ] **1.2.7** Create Drizzle migration for all new columns

### 1.3 A-F Grading System
- [ ] **1.3.1** Create `src/lib/ai/grade-calculator.ts` — converts numeric scores to A-F letter grades
- [ ] **1.3.2** Define grade bands: A (4.5-5.0), B (4.0-4.4), C (3.5-3.9), D (3.0-3.4), E (2.0-2.9), F (<2.0)
- [ ] **1.3.3** Add `grade` column to `matchScores` (varchar, 1 char)
- [ ] **1.3.4** Add `gradeBreakdown` JSON column to `matchScores` — per-block A-F detail
- [ ] **1.3.5** Generate actionable recommendation based on grade: A/B = "Apply now", C = "Selective", D/E/F = "Skip"

### 1.4 Scoring Prompt Overhaul
- [ ] **1.4.1** Update `src/lib/ai/score-match.ts` LLM prompt to request all 6+2 dimensions
- [ ] **1.4.2** Add CV-to-JD requirement mapping (career-ops Block B): map each JD requirement to exact resume lines
- [ ] **1.4.3** Add gap analysis: classify gaps as hard-blocker vs nice-to-have with mitigation strategies
- [ ] **1.4.4** Add seniority alignment detection (Block C): detected level vs candidate's natural level
- [ ] **1.4.5** Update heuristic fallback scorer to support new dimensions
- [ ] **1.4.6** Update `scoreWeights` in heuristic: Industry 30, NorthStar 20, Similarity 15, Compensation 10, Culture 10, Stage 5, Tech 5, RedFlag -5
- [ ] **1.4.7** Preserve backward compatibility — old 4-dimension matches still render correctly

---

## PHASE 2: User Profile & Career Targeting
> Replace generic resume-only matching with career-ops' profile-driven targeting

### 2.1 Career Profile Schema
- [ ] **2.1.1** Create `userProfiles` table in schema: `userId`, `targetRoles[]`, `targetArchetypes[]`, `professionalNarrative`, `compensationTarget`, `compensationMinimum`, `locationPreference`, `remotePreference`, `visaStatus`, `timezone`
- [ ] **2.1.2** Add `exitNarrative` text field — career-ops style transition story
- [ ] **2.1.3** Add `signatureStrengths` text[] — top differentiators
- [ ] **2.1.4** Add `portfolioUrls` text[] — demo/project links
- [ ] **2.1.5** Create Drizzle migration for `userProfiles` table

### 2.2 Profile UI
- [ ] **2.2.1** Create `src/app/(app)/profile/career/page.tsx` — career profile setup wizard
- [ ] **2.2.2** Step 1: Target roles picker (multi-select with archetype mapping)
- [ ] **2.2.3** Step 2: Compensation range inputs (target + minimum + currency)
- [ ] **2.2.4** Step 3: Location/remote preference selector
- [ ] **2.2.5** Step 4: Professional narrative textarea with AI-assist button
- [ ] **2.2.6** Step 5: Signature strengths tag input
- [ ] **2.2.7** Add profile completeness indicator to dashboard

### 2.3 Profile-Aware Scoring
- [ ] **2.3.1** Feed `targetArchetypes` into archetype matching — boost scores when company role matches target
- [ ] **2.3.2** Feed `compensationTarget` into compensation scoring — flag roles below minimum
- [ ] **2.3.3** Feed `exitNarrative` into email drafting — personalize outreach with career story
- [ ] **2.3.4** Feed `signatureStrengths` into interview prep — weave into STAR stories

---

## PHASE 3: ATS Portal Scanning
> Expand beyond YC-only companies to scan real job boards

### 3.1 Portal Configuration
- [ ] **3.1.1** Create `portals` table: `id`, `name`, `careersUrl`, `apiEndpoint`, `atsType` (greenhouse/ashby/lever/custom), `scanMethod`, `notes`, `isActive`
- [ ] **3.1.2** Seed with career-ops' 70+ tracked companies (Anthropic, OpenAI, Cohere, Retool, Vercel, etc.)
- [ ] **3.1.3** Create `portalJobs` table: `id`, `portalId`, `title`, `url`, `description`, `location`, `postedAt`, `discoveredAt`, `isActive`
- [ ] **3.1.4** Create Drizzle migration for portal tables

### 3.2 Title Filtering
- [ ] **3.2.1** Create `src/lib/scrapers/title-filter.ts`
- [ ] **3.2.2** Port career-ops' 40+ positive keywords (AI, ML, LLM, Agent, Platform, etc.)
- [ ] **3.2.3** Port career-ops' 20+ negative keywords (Junior, .NET, Blockchain, etc.)
- [ ] **3.2.4** Filter logic: requires >= 1 positive match AND zero negative matches
- [ ] **3.2.5** Make keyword lists configurable per user in `userPreferences`

### 3.3 ATS API Integrations
- [ ] **3.3.1** Create `src/lib/scrapers/greenhouse.ts` — Greenhouse job board API scraper
- [ ] **3.3.2** Create `src/lib/scrapers/ashby.ts` — Ashby job board API scraper
- [ ] **3.3.3** Create `src/lib/scrapers/lever.ts` — Lever job board API scraper
- [ ] **3.3.4** Create `src/lib/scrapers/ats-router.ts` — routes portal to correct scraper by `atsType`
- [ ] **3.3.5** Add rate limiting per ATS provider (respect API limits)
- [ ] **3.3.6** Add deduplication: skip jobs already in `portalJobs` by URL

### 3.4 Scan Scheduling
- [ ] **3.4.1** Create `src/trigger/portal-scanner.ts` — Trigger.dev job for periodic scanning
- [ ] **3.4.2** Default scan frequency: daily
- [ ] **3.4.3** Track scan history: `portalScanHistory` table with `portalId`, `scannedAt`, `jobsFound`, `newJobs`
- [ ] **3.4.4** Add scan controls to admin dashboard (trigger manual scan, view history)
- [ ] **3.4.5** Auto-match new jobs against active resumes when discovered

### 3.5 Portal Management UI
- [ ] **3.5.1** Create `src/app/(app)/portals/page.tsx` — portal list with status indicators
- [ ] **3.5.2** Add/edit/remove portals form
- [ ] **3.5.3** Show last scan time, jobs found, new matches per portal
- [ ] **3.5.4** "Scan Now" button per portal
- [ ] **3.5.5** Bulk import portals from YAML (career-ops format)

---

## PHASE 4: Enhanced Interview Prep
> Upgrade from basic flashcards to career-ops' STAR+Reflection framework

### 4.1 STAR Story Engine
- [ ] **4.1.1** Update `src/lib/ai/interview-prep.ts` prompt to generate STAR+Reflection format
- [ ] **4.1.2** Each story: Situation, Task, Action, Result, Reflection (what was learned)
- [ ] **4.1.3** Generate 6-10 stories per match, mapped to specific JD requirements
- [ ] **4.1.4** Create `starStories` table: `id`, `userId`, `matchId`, `jdRequirement`, `situation`, `task`, `action`, `result`, `reflection`, `archetype`
- [ ] **4.1.5** Story bank: accumulate stories across matches, reuse across similar roles

### 4.2 Interview Phases
- [ ] **4.2.1** Structure interview prep into 6 phases (from career-ops):
  - Introduction & motivation
  - Technical deep dive
  - System design / architecture
  - Behavioral / leadership
  - Culture fit
  - Closing & questions to ask
- [ ] **4.2.2** Tailor phase mix by archetype (e.g., Solutions Architect gets more system design)
- [ ] **4.2.3** Include red-flag questions with prepared responses
- [ ] **4.2.4** Include case study recommendation per role type

### 4.3 Interview Prep UI Upgrade
- [ ] **4.3.1** Redesign `src/app/(app)/interview/page.tsx` with phase-based navigation
- [ ] **4.3.2** Add STAR story cards with expandable sections
- [ ] **4.3.3** Add "Story Bank" tab — browse/search all accumulated stories
- [ ] **4.3.4** Add practice mode: show question, hide answer, reveal on click
- [ ] **4.3.5** Add archetype badge on each prep session

---

## PHASE 5: ATS-Optimized Resume Generation
> Add career-ops' PDF generation pipeline for tailored resumes

### 5.1 Resume Tailoring Engine
- [ ] **5.1.1** Create `src/lib/ai/tailor-resume.ts`
- [ ] **5.1.2** Extract 15-20 keywords from target JD
- [ ] **5.1.3** Detect JD language (for international roles)
- [ ] **5.1.4** Rewrite professional summary with keyword embedding + career narrative bridge
- [ ] **5.1.5** Select 3-4 most relevant projects from resume
- [ ] **5.1.6** Reorder experience bullets by relevance to JD
- [ ] **5.1.7** Generate 6-8 keyword competency grid
- [ ] **5.1.8** Ethical keyword injection: reformulate genuine experience using JD vocabulary (NEVER fabricate)

### 5.2 PDF Generation
- [ ] **5.2.1** Port career-ops' HTML CV template to `src/templates/cv-template.html`
- [ ] **5.2.2** Adapt template to YCMatch branding (keep ATS compliance)
- [ ] **5.2.3** Create `src/lib/pdf/generator.ts` using Puppeteer for HTML-to-PDF
- [ ] **5.2.4** Support Letter (US/Canada) and A4 (international) page sizes
- [ ] **5.2.5** ATS compliance: single-column, standard headers, no images, selectable text, UTF-8
- [ ] **5.2.6** Store generated PDFs in user's file storage (Supabase Storage or S3)
- [ ] **5.2.7** Create `tailoredResumes` table: `id`, `userId`, `matchId`, `originalResumeId`, `keywords[]`, `keywordCoverage`, `pdfUrl`, `createdAt`

### 5.3 Resume Generation UI
- [ ] **5.3.1** Add "Generate Tailored Resume" button on match cards (for matches with grade B+ or above)
- [ ] **5.3.2** Show keyword coverage percentage after generation
- [ ] **5.3.3** Preview generated PDF inline
- [ ] **5.3.4** Download button for generated PDF
- [ ] **5.3.5** History of generated resumes per match

---

## PHASE 6: Batch Pipeline & Automation
> Port career-ops' batch evaluation architecture

### 6.1 Batch Job Processing
- [ ] **6.1.1** Create `src/trigger/batch-evaluator.ts` — Trigger.dev job for batch scoring
- [ ] **6.1.2** Accept batch of job URLs as input
- [ ] **6.1.3** For each URL: extract JD → detect archetype → run A-F evaluation → generate report
- [ ] **6.1.4** Track batch state: `batchJobs` table with `id`, `userId`, `status`, `totalJobs`, `completedJobs`, `failedJobs`, `createdAt`
- [ ] **6.1.5** Track individual items: `batchJobItems` table with `batchId`, `url`, `status`, `reportId`, `error`, `startedAt`, `completedAt`
- [ ] **6.1.6** Resumable: failed items retryable independently without reprocessing completed ones

### 6.2 JD Extraction
- [ ] **6.2.1** Create `src/lib/scrapers/jd-extractor.ts`
- [ ] **6.2.2** Extraction priority chain: direct fetch → Playwright (SPA support) → web search fallback
- [ ] **6.2.3** Parse structured JD fields: title, company, requirements, nice-to-haves, compensation, location, remote policy
- [ ] **6.2.4** Handle special cases: LinkedIn (may need auth), PDFs (direct parse), local files
- [ ] **6.2.5** Cache extracted JDs to avoid re-fetching

### 6.3 Evaluation Reports
- [ ] **6.3.1** Create `evaluationReports` table: `id`, `userId`, `matchId`, `batchItemId`, `archetype`, `grade`, `blocks` (JSON — A through F block data), `createdAt`
- [ ] **6.3.2** Block A: Role summary (archetype, domain, function, seniority, remote, team size)
- [ ] **6.3.3** Block B: CV match mapping (JD requirement → resume evidence → gap classification)
- [ ] **6.3.4** Block C: Level & strategy (detected vs natural level, sell-up plan, downlevel fallback)
- [ ] **6.3.5** Block D: Compensation analysis (market data, range, source citations)
- [ ] **6.3.6** Block E: Personalization plan (top 5 resume + LinkedIn changes)
- [ ] **6.3.7** Block F: Interview prep (STAR stories + case study + red flags)
- [ ] **6.3.8** Create report detail view UI: `src/app/(app)/reports/[id]/page.tsx`

### 6.4 Batch UI
- [ ] **6.4.1** Create `src/app/(app)/batch/page.tsx` — batch job submission
- [ ] **6.4.2** URL input: textarea for pasting multiple URLs (one per line)
- [ ] **6.4.3** Progress view: real-time status per item (pending/processing/completed/failed)
- [ ] **6.4.4** Batch summary: total score distribution, archetype breakdown, top matches
- [ ] **6.4.5** "Retry Failed" button for individual items

---

## PHASE 7: Matches UI Overhaul
> Update the matches page to display new scoring dimensions and features

### 7.1 Match Card Redesign
- [ ] **7.1.1** Add letter grade badge (A-F) with color coding (A=green, B=blue, C=yellow, D=orange, F=red)
- [ ] **7.1.2** Add archetype tag on each card
- [ ] **7.1.3** Show 6-dimension radar chart (or bar chart) instead of 4
- [ ] **7.1.4** Add compensation range indicator (if available)
- [ ] **7.1.5** Add red flag warning icon when redFlagScore > threshold
- [ ] **7.1.6** Add "North Star" alignment indicator

### 7.2 Filtering & Sorting
- [ ] **7.2.1** Add grade filter (A, B, C, D, E, F checkboxes)
- [ ] **7.2.2** Add archetype filter (multi-select dropdown)
- [ ] **7.2.3** Add compensation range filter (min/max slider)
- [ ] **7.2.4** Add "Hide red flags" toggle
- [ ] **7.2.5** Add source filter: YC companies vs portal jobs
- [ ] **7.2.6** Sort by: overall score, grade, individual dimensions, date added

### 7.3 Match Detail View
- [ ] **7.3.1** Create `src/app/(app)/matches/[id]/page.tsx` — detailed match view
- [ ] **7.3.2** Show full A-F evaluation report (all 6 blocks)
- [ ] **7.3.3** Show gap analysis with mitigation strategies
- [ ] **7.3.4** Show compensation market data with sources
- [ ] **7.3.5** Quick actions: generate resume, prep interview, draft email, view report
- [ ] **7.3.6** Show match history (score changes over time if re-scored)

---

## PHASE 8: Email Outreach Enhancement
> Integrate career-ops' personalization into existing email system

### 8.1 Archetype-Aware Emails
- [ ] **8.1.1** Update `src/lib/ai/draft-email.ts` to accept archetype + career narrative
- [ ] **8.1.2** Use "I'm choosing you" tone (career-ops style) instead of generic cold email
- [ ] **8.1.3** Embed proof points from resume: "I built X" with specific metrics
- [ ] **8.1.4** Reference specific JD requirements in email body
- [ ] **8.1.5** Add follow-up email templates (day 3, day 7, day 14)

### 8.2 Application Form Assist
- [ ] **8.2.1** Create `src/lib/ai/form-assist.ts` — generates answers for common application questions
- [ ] **8.2.2** "Why this company?" — uses match report + company research
- [ ] **8.2.3** "Why this role?" — uses archetype framing + career narrative
- [ ] **8.2.4** "Salary expectations?" — uses compensation analysis
- [ ] **8.2.5** "Tell us about a time..." — pulls from STAR story bank
- [ ] **8.2.6** Add form assist UI: `src/app/(app)/apply/[matchId]/page.tsx`

---

## PHASE 9: Application Tracking Pipeline
> Port career-ops' pipeline management into the database

### 9.1 Application Status Tracking
- [ ] **9.1.1** Create `applications` table: `id`, `userId`, `matchId`, `portalJobId`, `status`, `appliedAt`, `lastActivityAt`, `notes`, `nextStep`, `nextStepDate`
- [ ] **9.1.2** Define status enum: `discovered`, `evaluating`, `ready`, `applied`, `phone-screen`, `technical`, `onsite`, `offer`, `accepted`, `rejected`, `withdrawn`
- [ ] **9.1.3** Create status transition rules (can't skip from discovered to onsite)
- [ ] **9.1.4** Create Drizzle migration

### 9.2 Pipeline UI
- [ ] **9.2.1** Create `src/app/(app)/pipeline/page.tsx` — kanban board view
- [ ] **9.2.2** Drag-and-drop cards between status columns
- [ ] **9.2.3** Card shows: company, role, grade, days in stage, next step
- [ ] **9.2.4** Quick actions per card: update status, add note, schedule follow-up
- [ ] **9.2.5** Pipeline analytics: conversion rates, avg time per stage, active applications count
- [ ] **9.2.6** List view alternative with sortable columns

---

## PHASE 10: Data Attribution & Compliance
> Ensure MIT license compliance and proper attribution

### 10.1 Attribution
- [ ] **10.1.1** Add career-ops attribution in `package.json` under `credits` field
- [ ] **10.1.2** Add MIT license notice in relevant source files that port career-ops logic
- [ ] **10.1.3** Include career-ops license text in `THIRD_PARTY_LICENSES.md`
- [ ] **10.1.4** Add attribution in app footer or about page: "Matching engine inspired by career-ops (MIT)"

### 10.2 Configuration Portability
- [ ] **10.2.1** Support importing career-ops `config/profile.yml` to populate user profile
- [ ] **10.2.2** Support importing career-ops `portals.yml` to populate portal list
- [ ] **10.2.3** Support importing career-ops `reports/*.md` as historical evaluation data
- [ ] **10.2.4** Export YCMatch data in career-ops compatible format (for users who want both)

---

## Implementation Priority & Sizing

| Phase | Est. Lines | Priority | Dependencies |
|-------|-----------|----------|--------------|
| P1: Scoring Engine | ~800 | **CRITICAL** | None |
| P2: User Profile | ~600 | **HIGH** | P1 |
| P3: Portal Scanning | ~900 | **HIGH** | None |
| P4: Interview Prep | ~500 | **MEDIUM** | P1 |
| P5: Resume Generation | ~700 | **MEDIUM** | P1, P2 |
| P6: Batch Pipeline | ~800 | **MEDIUM** | P1, P3 |
| P7: Matches UI | ~600 | **HIGH** | P1 |
| P8: Email Enhancement | ~400 | **LOW** | P1, P2 |
| P9: Application Tracking | ~700 | **MEDIUM** | P3 |
| P10: Attribution | ~100 | **CRITICAL** | None |

**Total estimated: ~6,100 lines across 10 phases**

---

## Stacking Plan (per CLAUDE.md rules — 500 lines per PR)

```
PR 1:  P10 Attribution + P1.1 Archetype Detection + P1.2 DB Migration
PR 2:  P1.3 A-F Grading + P1.4 Scoring Prompt Overhaul
PR 3:  P2.1 Career Profile Schema + P2.2 Profile UI
PR 4:  P2.3 Profile-Aware Scoring + P7.1 Match Card Redesign
PR 5:  P3.1 Portal Config + P3.2 Title Filtering + P3.3 ATS APIs
PR 6:  P3.4 Scan Scheduling + P3.5 Portal UI
PR 7:  P4.1 STAR Engine + P4.2 Interview Phases + P4.3 UI Upgrade
PR 8:  P5.1 Resume Tailoring + P5.2 PDF Generation
PR 9:  P5.3 Resume UI + P7.2 Filtering + P7.3 Match Detail
PR 10: P6.1 Batch Processing + P6.2 JD Extraction
PR 11: P6.3 Evaluation Reports + P6.4 Batch UI
PR 12: P8.1 Email Enhancement + P8.2 Form Assist
PR 13: P9.1 Application Tracking + P9.2 Pipeline UI
```

~13 PRs, each under 500 lines.
