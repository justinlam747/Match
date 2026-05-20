// Deep-research a match: scrape the company website, run a web search,
// summarize into structured signals, persist for reuse.
//
// Two-layer matching context:
//   Layer 1 (cheap, default) — embedding + keyword/industry/tech overlap, done in
//     /api/score-matches at scan time.
//   Layer 2 (this route, on-demand) — pulled when a user opens a specific match
//     and clicks "Deep research". Adds fresh website + web-search context that
//     wasn't in the seed scrape.
//
// Cache strategy:
//   L1  Upstash Redis, 24h hot path
//   L2  Postgres company_research, 7d soft TTL
//   L3  fresh fetch (this is the slow path: scrape + Tavily + LLM ≈ 15-25s)

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  companyResearch,
  matchScores,
  resumes,
  ycCompanies,
  type ResearchSignals,
  type ResearchSource,
} from "@/lib/db/schema";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { rateLimit } from "@/lib/rate-limit";
import { getCached, setCache } from "@/lib/cache/redis";
import { scrapeCompanySite } from "@/lib/research/company-scraper";
import { tavilySearch } from "@/lib/research/tavily";
import { summarizeResearch } from "@/lib/research/summarize";

const RESEARCH_TTL_DAYS = 7;
const REDIS_TTL_SECONDS = 60 * 60 * 24;
const MAX_RAW_TEXT_BYTES = 50_000;

interface ResearchPayload {
  summary: string;
  signals: ResearchSignals;
  sources: ResearchSource[];
}

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await ctx.params;

  const user = await getApiUser();
  if (!user) return unauthorized();

  const rl = await rateLimit(`deep-research:${user.id}`, 5, 60);
  if (!rl.success) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Try again later." },
      { status: 429 }
    );
  }

  const [row] = await db
    .select({
      company: ycCompanies,
    })
    .from(matchScores)
    .innerJoin(ycCompanies, eq(matchScores.companyId, ycCompanies.id))
    .innerJoin(resumes, eq(matchScores.resumeId, resumes.id))
    .where(and(eq(matchScores.id, matchId), eq(resumes.userId, user.id)))
    .limit(1);

  if (!row) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 });
  }

  const company = row.company;
  const cacheKey = `company-research:${company.id}`;

  const hot = await getCached<ResearchPayload>(cacheKey);
  if (hot) {
    return NextResponse.json({ ...hot, cached: "redis" });
  }

  const [existing] = await db
    .select()
    .from(companyResearch)
    .where(eq(companyResearch.companyId, company.id))
    .limit(1);

  if (existing && existing.expiresAt > new Date()) {
    const payload: ResearchPayload = {
      summary: existing.summary,
      signals: existing.signals,
      sources: existing.sources,
    };
    await setCache(cacheKey, payload, REDIS_TTL_SECONDS);
    return NextResponse.json({ ...payload, cached: "postgres" });
  }

  const [scrapedPages, tavily] = await Promise.all([
    company.website ? scrapeCompanySite(company.website) : Promise.resolve([]),
    tavilySearch(
      `${company.name} startup what they build engineering hiring`,
      {
        maxResults: 5,
        includeRawContent: true,
        searchDepth: "basic",
        excludeDomains: ["ycombinator.com"],
      }
    ),
  ]);

  if (scrapedPages.length === 0 && (!tavily || tavily.results.length === 0)) {
    return NextResponse.json(
      { error: "No content could be retrieved for this company." },
      { status: 502 }
    );
  }

  const summarized = await summarizeResearch({
    companyName: company.name,
    scrapedPages,
    tavily,
    userId: user.id,
  });

  const signals: ResearchSignals = {
    techSignals: summarized.techSignals,
    recentNews: summarized.recentNews,
    teamSignals: summarized.teamSignals,
    cultureSignals: summarized.cultureSignals,
    productFocus: summarized.productFocus,
    fundingStage: summarized.fundingStage,
  };

  const sources: ResearchSource[] = [
    ...scrapedPages.map((p) => ({
      url: p.url,
      title: p.title,
      kind: "website" as const,
    })),
    ...(tavily?.results ?? []).map((r) => ({
      url: r.url,
      title: r.title,
      kind: "websearch" as const,
    })),
  ];

  const rawText = [
    ...scrapedPages.map((p) => p.text),
    ...(tavily?.results.map((r) => r.raw_content ?? r.content) ?? []),
  ]
    .join("\n\n")
    .slice(0, MAX_RAW_TEXT_BYTES);

  const expiresAt = new Date(Date.now() + RESEARCH_TTL_DAYS * 86_400_000);

  await db
    .insert(companyResearch)
    .values({
      companyId: company.id,
      summary: summarized.summary,
      signals,
      sources,
      rawText,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: companyResearch.companyId,
      set: {
        summary: summarized.summary,
        signals,
        sources,
        rawText,
        expiresAt,
      },
    });

  const payload: ResearchPayload = {
    summary: summarized.summary,
    signals,
    sources,
  };
  await setCache(cacheKey, payload, REDIS_TTL_SECONDS);

  return NextResponse.json({ ...payload, cached: "fresh" });
}
