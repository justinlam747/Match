/**
 * Lightweight URL scraper — extracts meaningful text from web pages.
 * Used for portfolio sites, GitHub profiles, etc.
 */
import type { GitHubProfileData } from "@/lib/db/schema";

/**
 * Validates that a URL is external (not targeting internal/private networks).
 * Prevents SSRF attacks against cloud metadata endpoints, localhost, etc.
 */
export function validateExternalUrl(url: string): void {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only HTTP(S) URLs allowed");
  }
  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("172.16.") || hostname.startsWith("172.17.") || hostname.startsWith("172.18.") ||
    hostname.startsWith("172.19.") || hostname.startsWith("172.20.") || hostname.startsWith("172.21.") ||
    hostname.startsWith("172.22.") || hostname.startsWith("172.23.") || hostname.startsWith("172.24.") ||
    hostname.startsWith("172.25.") || hostname.startsWith("172.26.") || hostname.startsWith("172.27.") ||
    hostname.startsWith("172.28.") || hostname.startsWith("172.29.") || hostname.startsWith("172.30.") ||
    hostname.startsWith("172.31.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("169.254.") ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Internal/private URLs not allowed");
  }
}

export async function scrapeUrl(url: string): Promise<{
  title: string;
  text: string;
} | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    validateExternalUrl(url);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MatchBot/1.0)",
        Accept: "text/html",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const html = await res.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch?.[1]?.trim() || new URL(url).hostname;

    // Strip tags, scripts, styles
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 5000);

    return text ? { title, text } : null;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

const DAY_MS = 86_400_000;

interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
  pushed_at: string;
  html_url: string;
}

// Infer a working-pace signal from recent commit cadence. Display-only insight.
function inferPace(
  activeDays30: number,
  lastActive: string | null
): { label: string; detail: string } {
  if (activeDays30 >= 15)
    return { label: "High velocity", detail: "Ships on most days — thrives in a fast-moving, 996-style environment." };
  if (activeDays30 >= 6)
    return { label: "Active builder", detail: "Commits several days a week — comfortable at a fast startup pace." };
  if (activeDays30 >= 2)
    return { label: "Steady", detail: "Ships regularly — fits a balanced, steady-moving team." };
  if (lastActive && Date.now() - new Date(lastActive).getTime() < 90 * DAY_MS)
    return { label: "Occasional", detail: "Sporadic recent activity — better suited to a slower-paced team." };
  return { label: "Quiet lately", detail: "Little recent public activity to gauge pace from." };
}

/**
 * Scrape a GitHub profile — bio, repos, stars, languages, READMEs, and recent
 * activity (commit cadence → a working-pace signal). Returns text for matching
 * plus structured data for display.
 */
export async function scrapeGitHub(username: string): Promise<{
  title: string;
  text: string;
  avatarUrl?: string;
  data: GitHubProfileData;
} | null> {
  try {
    const headers = { Accept: "application/vnd.github.v3+json" };

    const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
    if (!userRes.ok) return null;
    const user = await userRes.json();

    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=pushed&per_page=100`,
      { headers }
    );
    const repos: GitHubRepo[] = reposRes.ok ? await reposRes.json() : [];

    const ownRepos = repos.filter((r) => !r.fork);
    const byStars = [...ownRepos].sort((a, b) => b.stargazers_count - a.stargazers_count);
    const totalStars = ownRepos.reduce((s, r) => s + (r.stargazers_count || 0), 0);
    const languages = [...new Set(ownRepos.map((r) => r.language).filter(Boolean) as string[])];
    const topRepos = byStars.slice(0, 6).map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      url: r.html_url,
    }));

    const now = Date.now();
    const reposPushed90 = ownRepos.filter(
      (r) => r.pushed_at && now - new Date(r.pushed_at).getTime() < 90 * DAY_MS
    ).length;
    const lastActive = ownRepos.reduce<string | null>(
      (latest, r) => (r.pushed_at && (!latest || r.pushed_at > latest) ? r.pushed_at : latest),
      null
    );

    // Recent public activity → commit cadence
    let pushEvents30 = 0;
    const activeDaySet = new Set<string>();
    try {
      const evRes = await fetch(`https://api.github.com/users/${username}/events/public?per_page=100`, { headers });
      if (evRes.ok) {
        const events: { type: string; created_at: string }[] = await evRes.json();
        for (const e of events) {
          if (e.type === "PushEvent" && now - new Date(e.created_at).getTime() < 30 * DAY_MS) {
            pushEvents30++;
            activeDaySet.add(e.created_at.slice(0, 10));
          }
        }
      }
    } catch {
      // events are best-effort
    }
    const activeDays30 = activeDaySet.size;
    const pace = inferPace(activeDays30, lastActive);

    // READMEs for the top-starred repos (best-effort, capped to limit requests)
    const readmeParts: string[] = [];
    let readmeCount = 0;
    for (const repo of byStars.slice(0, 5)) {
      try {
        const readmeRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/readme`, { headers });
        if (!readmeRes.ok) continue;
        const readmeData = await readmeRes.json();
        if (readmeData.content) {
          const decoded = Buffer.from(readmeData.content, "base64").toString("utf-8");
          readmeParts.push(`\n--- README: ${repo.name} ---\n${decoded.slice(0, 1500)}`);
          readmeCount++;
        }
      } catch {
        // skip failed READMEs
      }
    }

    const repoLines = topRepos.map(
      (r) => `${r.name}${r.description ? `: ${r.description}` : ""}${r.language ? ` [${r.language}]` : ""}${r.stars > 0 ? ` (${r.stars} stars)` : ""}`
    );
    const parts = [
      `GitHub: ${user.login}`,
      user.name ? `Name: ${user.name}` : null,
      user.bio ? `Bio: ${user.bio}` : null,
      user.company ? `Company: ${user.company}` : null,
      languages.length ? `Languages: ${languages.join(", ")}` : null,
      `Public repos: ${user.public_repos}`,
      totalStars ? `Total stars: ${totalStars}` : null,
      `Recent activity: ${activeDays30} active days and ${pushEvents30} pushes in the last 30 days (pace: ${pace.label}).`,
      repoLines.length ? `Top repositories:\n${repoLines.join("\n")}` : null,
      readmeParts.length ? readmeParts.join("\n") : null,
    ];

    const data: GitHubProfileData = {
      login: user.login,
      name: user.name ?? null,
      bio: user.bio ?? null,
      followers: user.followers ?? 0,
      publicRepos: user.public_repos ?? 0,
      totalStars,
      languages,
      topRepos,
      readmeCount,
      activity: { activeDays30, pushEvents30, reposPushed90, lastActive },
      pace,
    };

    return {
      title: `GitHub: ${user.login} (${readmeCount} READMEs)`,
      text: parts.filter(Boolean).join("\n"),
      avatarUrl: user.avatar_url || undefined,
      data,
    };
  } catch {
    return null;
  }
}
