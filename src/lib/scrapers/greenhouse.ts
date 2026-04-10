// Adapted from career-ops (MIT). See THIRD_PARTY_LICENSES.md.

import type { AtsScraper, NormalizedJob, ScrapeResult } from "./ats-router";

const TIMEOUT_MS = 15_000;

function extractBoardToken(careersUrl: string): string | null {
  try {
    const u = new URL(careersUrl);
    // boards.greenhouse.io/{token}
    // boards-api.greenhouse.io/v1/boards/{token}/jobs
    // job-boards.greenhouse.io/{token}
    const host = u.hostname.toLowerCase();
    const parts = u.pathname.split("/").filter(Boolean);
    if (host === "boards-api.greenhouse.io") {
      const boardsIdx = parts.indexOf("boards");
      if (boardsIdx >= 0 && parts[boardsIdx + 1]) {
        return parts[boardsIdx + 1];
      }
      return null;
    }
    if (
      host === "boards.greenhouse.io" ||
      host === "job-boards.greenhouse.io"
    ) {
      return parts[0] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

interface GhLocation {
  name?: unknown;
}

interface GhJob {
  id?: unknown;
  title?: unknown;
  absolute_url?: unknown;
  content?: unknown;
  location?: unknown;
  updated_at?: unknown;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function normalizeGhJob(raw: unknown): NormalizedJob | null {
  if (!isObject(raw)) return null;
  const g = raw as GhJob;
  const idVal =
    typeof g.id === "number" || typeof g.id === "string" ? String(g.id) : null;
  const title = asString(g.title);
  const url = asString(g.absolute_url);
  if (!idVal || !title || !url) return null;
  const description = asString(g.content);
  let location: string | null = null;
  if (isObject(g.location)) {
    const loc = g.location as GhLocation;
    location = asString(loc.name);
  }
  let postedAt: Date | null = null;
  const updated = asString(g.updated_at);
  if (updated) {
    const d = new Date(updated);
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

export const scrapeGreenhouse: AtsScraper = async ({
  careersUrl,
  apiEndpoint,
}) => {
  const started = Date.now();
  const token = extractBoardToken(careersUrl);
  if (!token) {
    return {
      jobs: [],
      providerLatencyMs: Date.now() - started,
      error: "could not derive greenhouse board token",
    };
  }
  const endpoint =
    apiEndpoint ??
    `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
      token,
    )}/jobs?content=true`;

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
        error: `greenhouse HTTP ${response.status}`,
      };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return {
        jobs: [],
        providerLatencyMs: Date.now() - started,
        error: "greenhouse JSON parse error",
      };
    }
    if (!isObject(data) || !Array.isArray((data as { jobs?: unknown }).jobs)) {
      return {
        jobs: [],
        providerLatencyMs: Date.now() - started,
        error: "greenhouse unexpected payload shape",
      };
    }
    const rawJobs = (data as { jobs: unknown[] }).jobs;
    const jobs: NormalizedJob[] = [];
    for (const raw of rawJobs) {
      const n = normalizeGhJob(raw);
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
      error: `greenhouse fetch failed: ${message}`,
    };
  } finally {
    clearTimeout(timer);
  }
};
