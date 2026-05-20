// Lightweight company-site crawler used by the deep-research route.
// Fetches the homepage plus a fixed set of conventional paths, extracts
// readable text with cheerio, and returns the pages that yielded enough
// signal. Mirrors the `jd-extractor.ts` approach — no headless browser,
// so fully-JS-rendered marketing sites may return little. That's an
// accepted tradeoff (see AGENTS.md / jd-extractor comments).

import * as cheerio from "cheerio";

const COMMON_PATHS = [
  "/",
  "/about",
  "/about-us",
  "/careers",
  "/jobs",
  "/team",
  "/blog",
  "/company",
];
const FETCH_TIMEOUT_MS = 8000;
const MAX_PAGES = 5;
const MAX_TEXT_PER_PAGE = 4000;
const MIN_TEXT_PER_PAGE = 120;

export interface ScrapedPage {
  url: string;
  title: string | null;
  text: string;
}

async function fetchWithTimeout(
  url: string,
  ms: number
): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    return res.ok ? res : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractText(html: string): { title: string | null; text: string } {
  const $ = cheerio.load(html);
  $("script, style, nav, header, footer, noscript, svg, iframe, form").remove();

  const title =
    $("meta[property='og:title']").attr("content") ||
    $("title").first().text().trim() ||
    null;

  const main = $("main, [role='main'], article").first();
  const root = main.length > 0 ? main : $("body");

  const text = root
    .text()
    .replace(/ /g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]*\n[ \t]*\n+/g, "\n\n")
    .trim();

  return { title, text: text.slice(0, MAX_TEXT_PER_PAGE) };
}

export async function scrapeCompanySite(
  websiteUrl: string
): Promise<ScrapedPage[]> {
  let base: URL;
  try {
    base = new URL(websiteUrl);
  } catch {
    return [];
  }

  const candidates = new Set<string>();
  candidates.add(base.toString());
  for (const path of COMMON_PATHS) {
    try {
      candidates.add(new URL(path, base).toString());
    } catch {
      // skip malformed candidate
    }
  }

  // Fetch all candidates in parallel; cap successful pages at MAX_PAGES.
  const results = await Promise.all(
    Array.from(candidates).map(async (url) => {
      const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS);
      if (!res) return null;
      const html = await res.text();
      const { title, text } = extractText(html);
      if (text.length < MIN_TEXT_PER_PAGE) return null;
      return { url, title, text } satisfies ScrapedPage;
    })
  );

  const pages: ScrapedPage[] = [];
  for (const result of results) {
    if (result && pages.length < MAX_PAGES) {
      pages.push(result);
    }
  }

  return pages;
}
