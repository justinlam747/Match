// Adapted from career-ops (MIT). See THIRD_PARTY_LICENSES.md.

import { scrapeGreenhouse } from "./greenhouse";
import { scrapeAshby } from "./ashby";
import { scrapeLever } from "./lever";

export interface NormalizedJob {
  title: string;
  url: string;
  description: string | null;
  location: string | null;
  postedAt: Date | null;
  rawId: string;
}

export interface ScrapeResult {
  jobs: NormalizedJob[];
  providerLatencyMs: number;
  error?: string;
}

export type AtsType = "greenhouse" | "ashby" | "lever" | "custom";

export type AtsScraper = (opts: {
  careersUrl: string;
  apiEndpoint?: string | null;
}) => Promise<ScrapeResult>;

// Caller owns pacing: when scanning multiple portals in bulk, sleep for
// atsRateLimitDelay(atsType) ms between calls. routeAtsScrape itself does
// not pace — it performs one scrape and returns.
export async function routeAtsScrape(opts: {
  atsType: AtsType;
  careersUrl: string;
  apiEndpoint?: string | null;
}): Promise<ScrapeResult> {
  switch (opts.atsType) {
    case "greenhouse":
      return scrapeGreenhouse({
        careersUrl: opts.careersUrl,
        apiEndpoint: opts.apiEndpoint,
      });
    case "ashby":
      return scrapeAshby({
        careersUrl: opts.careersUrl,
        apiEndpoint: opts.apiEndpoint,
      });
    case "lever":
      return scrapeLever({
        careersUrl: opts.careersUrl,
        apiEndpoint: opts.apiEndpoint,
      });
    case "custom":
      return {
        jobs: [],
        providerLatencyMs: 0,
        error: "custom ATS not supported",
      };
  }
}

export function atsRateLimitDelay(provider: string): number {
  switch (provider) {
    case "greenhouse":
      return 250;
    case "ashby":
      return 500;
    case "lever":
      return 300;
    default:
      return 500;
  }
}

export function dedupeJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const seen = new Set<string>();
  const out: NormalizedJob[] = [];
  for (const job of jobs) {
    if (seen.has(job.url)) continue;
    seen.add(job.url);
    out.push(job);
  }
  return out;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
