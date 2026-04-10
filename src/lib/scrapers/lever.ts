// Adapted from career-ops (MIT). See THIRD_PARTY_LICENSES.md.

import type { AtsScraper, NormalizedJob, ScrapeResult } from "./ats-router";

const TIMEOUT_MS = 15_000;

function extractCompanySlug(careersUrl: string): string | null {
  try {
    const u = new URL(careersUrl);
    const host = u.hostname.toLowerCase();
    const parts = u.pathname.split("/").filter(Boolean);
    // jobs.lever.co/{company}
    // api.lever.co/v0/postings/{company}
    if (host === "jobs.lever.co") {
      return parts[0] ?? null;
    }
    if (host === "api.lever.co") {
      const idx = parts.indexOf("postings");
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

interface LeverCategories {
  location?: unknown;
  team?: unknown;
  commitment?: unknown;
}

interface LeverPosting {
  id?: unknown;
  text?: unknown;
  hostedUrl?: unknown;
  applyUrl?: unknown;
  descriptionPlain?: unknown;
  description?: unknown;
  categories?: unknown;
  createdAt?: unknown;
}

function normalizeLeverJob(raw: unknown): NormalizedJob | null {
  if (!isObject(raw)) return null;
  const l = raw as LeverPosting;
  const idVal = asString(l.id);
  const title = asString(l.text);
  const url = asString(l.hostedUrl) ?? asString(l.applyUrl);
  if (!idVal || !title || !url) return null;
  const description = asString(l.descriptionPlain) ?? asString(l.description);
  let location: string | null = null;
  if (isObject(l.categories)) {
    const cats = l.categories as LeverCategories;
    location = asString(cats.location);
  }
  let postedAt: Date | null = null;
  if (typeof l.createdAt === "number") {
    const d = new Date(l.createdAt);
    if (!isNaN(d.getTime())) postedAt = d;
  } else if (typeof l.createdAt === "string") {
    const d = new Date(l.createdAt);
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

export const scrapeLever: AtsScraper = async ({ careersUrl, apiEndpoint }) => {
  const started = Date.now();
  const slug = extractCompanySlug(careersUrl);
  if (!slug) {
    return {
      jobs: [],
      providerLatencyMs: Date.now() - started,
      error: "could not derive lever company slug",
    };
  }
  const endpoint =
    apiEndpoint ??
    `https://api.lever.co/v0/postings/${encodeURIComponent(slug)}?mode=json`;

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
        error: `lever HTTP ${response.status}`,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        jobs: [],
        providerLatencyMs: Date.now() - started,
        error: "lever JSON parse error",
      };
    }
    if (!Array.isArray(data)) {
      return {
        jobs: [],
        providerLatencyMs: Date.now() - started,
        error: "lever unexpected payload shape",
      };
    }
    const jobs: NormalizedJob[] = [];
    for (const raw of data) {
      const n = normalizeLeverJob(raw);
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
      error: `lever fetch failed: ${message}`,
    };
  } finally {
    clearTimeout(timer);
  }
};
