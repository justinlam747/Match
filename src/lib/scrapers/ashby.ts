// Adapted from career-ops (MIT). See THIRD_PARTY_LICENSES.md.

import type { AtsScraper, NormalizedJob, ScrapeResult } from "./ats-router";

const TIMEOUT_MS = 15_000;

function extractBoardName(careersUrl: string): string | null {
  try {
    const u = new URL(careersUrl);
    const host = u.hostname.toLowerCase();
    const parts = u.pathname.split("/").filter(Boolean);
    // jobs.ashbyhq.com/{boardName}
    // api.ashbyhq.com/posting-api/job-board/{boardName}
    if (host === "jobs.ashbyhq.com") {
      return parts[0] ?? null;
    }
    if (host === "api.ashbyhq.com") {
      const idx = parts.indexOf("job-board");
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

interface AshbyJob {
  id?: unknown;
  title?: unknown;
  jobUrl?: unknown;
  descriptionHtml?: unknown;
  location?: unknown;
  publishedAt?: unknown;
}

function normalizeAshbyJob(raw: unknown): NormalizedJob | null {
  if (!isObject(raw)) return null;
  const a = raw as AshbyJob;
  const idVal =
    typeof a.id === "string" || typeof a.id === "number" ? String(a.id) : null;
  const title = asString(a.title);
  const url = asString(a.jobUrl);
  if (!idVal || !title || !url) return null;
  const description = asString(a.descriptionHtml);
  // Ashby location can be a string or an object ({locationName,isRemote,...}).
  let location: string | null = asString(a.location);
  if (!location && isObject(a.location)) {
    const loc = a.location as Record<string, unknown>;
    location = asString(loc.locationName) ?? asString(loc.name) ?? null;
  }
  let postedAt: Date | null = null;
  const published = asString(a.publishedAt);
  if (published) {
    const d = new Date(published);
    if (!isNaN(d.getTime())) postedAt = d;
  }
  return {
    title,
    url,
    description,
    location,
    postedAt,
    rawId: idVal,
  };
}

export const scrapeAshby: AtsScraper = async ({ careersUrl, apiEndpoint }) => {
  const started = Date.now();
  const board = extractBoardName(careersUrl);
  if (!board) {
    return {
      jobs: [],
      providerLatencyMs: Date.now() - started,
      error: "could not derive ashby board name",
    };
  }
  const endpoint =
    apiEndpoint ??
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(
      board,
    )}?includeCompensation=true`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      return {
        jobs: [],
        providerLatencyMs: Date.now() - started,
        error: `ashby HTTP ${response.status}`,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        jobs: [],
        providerLatencyMs: Date.now() - started,
        error: "ashby JSON parse error",
      };
    }
    if (!isObject(data) || !Array.isArray((data as { jobs?: unknown }).jobs)) {
      return {
        jobs: [],
        providerLatencyMs: Date.now() - started,
        error: "ashby unexpected payload shape",
      };
    }
    const rawJobs = (data as { jobs: unknown[] }).jobs;
    const jobs: NormalizedJob[] = [];
    for (const raw of rawJobs) {
      const n = normalizeAshbyJob(raw);
      if (n) jobs.push(n);
    }
    const result: ScrapeResult = {
      jobs,
      providerLatencyMs: Date.now() - started,
    };
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return {
      jobs: [],
      providerLatencyMs: Date.now() - started,
      error: `ashby fetch failed: ${message}`,
    };
  } finally {
    clearTimeout(timer);
  }
};
