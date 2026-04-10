// Adapted from career-ops (MIT). See THIRD_PARTY_LICENSES.md.
//
// Job description extractor. Fetches a URL, strips boilerplate, and pulls
// structured fields out of the raw text. We use a two-tier strategy:
//
//   1. Direct fetch + cheerio parse — cheap, works for ~80% of ATS pages
//      since Greenhouse/Lever/Ashby render meaningful HTML server-side.
//   2. LLM structured extraction on the cleaned text — catches the long tail
//      where selectors are site-specific.
//
// Playwright / headless browsers would give us the SPA cases too, but bring
// deployment weight. When we need them we'll wire them in at the router
// level. For now, SPAs fall through to the LLM extractor which can usually
// still pull signal from whatever SSR fallback shipped.

import { createHash } from "node:crypto";
import * as cheerio from "cheerio";
import { chatCompletion } from "@/lib/ai/client";

export interface ExtractedJd {
  url: string;
  urlHash: string;
  title: string | null;
  company: string | null;
  description: string;
  requirements: string[];
  location: string | null;
  remotePolicy: string | null;
  compensationText: string | null;
}

export function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      // A plausible browser UA — many ATSes 403 the default fetch UA.
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

function cleanText(html: string): { text: string; title: string | null } {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, noscript, svg, iframe").remove();

  const title =
    $("meta[property='og:title']").attr("content") ||
    $("title").first().text().trim() ||
    null;

  // Prefer <main> / role="main" when present — cuts most site chrome.
  const main = $("main, [role='main'], article").first();
  const root = main.length > 0 ? main : $("body");

  // Collapse whitespace while preserving paragraph breaks.
  const text = root
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]*\n[ \t]*\n+/g, "\n\n")
    .trim();

  return { text, title };
}

const LLM_SYSTEM = `You extract structured job-description data from raw page text. Output ONLY valid JSON matching:
{
  "title": string | null,
  "company": string | null,
  "description": string,
  "requirements": string[],
  "location": string | null,
  "remotePolicy": "remote" | "hybrid" | "onsite" | null,
  "compensationText": string | null
}

Rules:
- "description" = concise 2-4 sentence summary of the role from the page, not the full text
- "requirements" = 5-15 concrete bullet-style requirements lifted from the page (must-haves + nice-to-haves combined, deduped)
- Use null when a field is genuinely absent. Do not invent.
- "remotePolicy" is lowercase enum only.
- "compensationText" should preserve original currency/range phrasing (e.g. "$180k-$220k + equity").`;

async function llmExtract(
  text: string,
  userId?: string
): Promise<Omit<ExtractedJd, "url" | "urlHash">> {
  const raw = await chatCompletion({
    tier: "fast",
    system: LLM_SYSTEM,
    prompt: `<page_text>\n${text.slice(0, 10000)}\n</page_text>`,
    maxTokens: 1200,
    userId,
  });

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("LLM returned no JSON for JD extraction");
  }
  const parsed = JSON.parse(jsonMatch[0]) as {
    title: string | null;
    company: string | null;
    description: string;
    requirements: string[] | null;
    location: string | null;
    remotePolicy: string | null;
    compensationText: string | null;
  };

  return {
    title: parsed.title ?? null,
    company: parsed.company ?? null,
    description: parsed.description || "",
    requirements: Array.isArray(parsed.requirements) ? parsed.requirements : [],
    location: parsed.location ?? null,
    remotePolicy: parsed.remotePolicy ?? null,
    compensationText: parsed.compensationText ?? null,
  };
}

/**
 * Extract a JD from a URL. Uses the caller-provided cache lookup to short-
 * circuit previously-fetched URLs. The caller owns persistence — this
 * function is pure except for the outbound HTTP call and LLM invocation.
 */
export async function extractJdFromUrl(
  url: string,
  opts?: {
    cacheLookup?: (urlHash: string) => Promise<ExtractedJd | null>;
    userId?: string;
  }
): Promise<ExtractedJd> {
  const urlHash = hashUrl(url);

  if (opts?.cacheLookup) {
    const cached = await opts.cacheLookup(urlHash);
    if (cached) return cached;
  }

  const html = await fetchHtml(url);
  const { text, title } = cleanText(html);

  if (text.length < 120) {
    // Page is either SPA shell or a 200-with-empty-body — with only an HTML
    // shell and no headless browser we can't do much better. Surface what
    // little we have so the batch can still proceed (likely to fail scoring).
    return {
      url,
      urlHash,
      title,
      company: null,
      description: text || "(empty)",
      requirements: [],
      location: null,
      remotePolicy: null,
      compensationText: null,
    };
  }

  const llm = await llmExtract(text, opts?.userId);

  return {
    url,
    urlHash,
    title: llm.title || title,
    company: llm.company,
    description: llm.description || text.slice(0, 800),
    requirements: llm.requirements,
    location: llm.location,
    remotePolicy: llm.remotePolicy,
    compensationText: llm.compensationText,
  };
}
