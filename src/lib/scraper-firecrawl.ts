/**
 * Firecrawl-powered website scraper — extracts structured content from
 * company websites including landing page, features, about, careers.
 *
 * Falls back to the lightweight built-in scraper if Firecrawl is unavailable.
 */

import { scrapeUrl, validateExternalUrl } from "@/lib/scraper";

interface FirecrawlPage {
  url: string;
  markdown: string;
  title?: string;
}

export interface ScrapedCompanySite {
  pages: { url: string; title: string; content: string }[];
  combinedText: string;
}

const FIRECRAWL_API = "https://api.firecrawl.dev/v1";

/**
 * Scrape a company website using Firecrawl's /scrape endpoint.
 * Attempts multiple key pages: landing, about, features, careers.
 */
export async function scrapeCompanyWebsite(
  websiteUrl: string
): Promise<ScrapedCompanySite> {
  validateExternalUrl(websiteUrl);

  const apiKey = process.env.FIRECRAWL_API_KEY;
  const base = websiteUrl.replace(/\/+$/, "");

  // Key pages to try
  const urls = [
    base,
    `${base}/about`,
    `${base}/features`,
    `${base}/careers`,
    `${base}/product`,
  ];

  if (apiKey) {
    return scrapeWithFirecrawl(urls, apiKey);
  }
  return scrapeWithFallback(urls);
}

async function scrapeWithFirecrawl(
  urls: string[],
  apiKey: string
): Promise<ScrapedCompanySite> {
  const pages: ScrapedCompanySite["pages"] = [];

  // Scrape pages concurrently (Firecrawl handles rate limiting)
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const res = await fetch(`${FIRECRAWL_API}/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          url,
          formats: ["markdown"],
          onlyMainContent: true,
          timeout: 15000,
        }),
      });

      if (!res.ok) return null;
      const data = await res.json();
      if (!data.success || !data.data?.markdown) return null;

      return {
        url,
        title: (data.data.metadata?.title as string) || new URL(url).pathname,
        content: (data.data.markdown as string).slice(0, 8000),
      };
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      pages.push(r.value);
    }
  }

  // If Firecrawl got nothing, fall back
  if (pages.length === 0) {
    return scrapeWithFallback(urls);
  }

  return {
    pages,
    combinedText: pages.map((p) => `## ${p.title}\n${p.content}`).join("\n\n---\n\n"),
  };
}

async function scrapeWithFallback(
  urls: string[]
): Promise<ScrapedCompanySite> {
  const pages: ScrapedCompanySite["pages"] = [];

  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const result = await scrapeUrl(url);
      if (!result) return null;
      return { url, title: result.title, content: result.text };
    })
  );

  for (const r of results) {
    if (r.status === "fulfilled" && r.value) {
      pages.push(r.value);
    }
  }

  return {
    pages,
    combinedText: pages.map((p) => `## ${p.title}\n${p.content}`).join("\n\n---\n\n"),
  };
}
