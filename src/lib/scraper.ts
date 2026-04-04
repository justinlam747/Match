/**
 * Lightweight URL scraper — extracts meaningful text from web pages.
 * Used for portfolio sites, GitHub profiles, etc.
 */

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

/**
 * Scrape a GitHub profile — extracts bio, repos, languages.
 */
export async function scrapeGitHub(username: string): Promise<{
  title: string;
  text: string;
  avatarUrl?: string;
} | null> {
  try {
    // Fetch user profile
    const userRes = await fetch(`https://api.github.com/users/${username}`, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });
    if (!userRes.ok) return null;
    const user = await userRes.json();

    // Fetch repos (sorted by stars)
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=stars&per_page=20`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    const repos = reposRes.ok ? await reposRes.json() : [];

    const ownRepos = repos
      .filter((r: { fork: boolean }) => !r.fork)
      .slice(0, 10);

    const repoLines = ownRepos.map(
      (r: { name: string; description: string | null; language: string | null; stargazers_count: number }) =>
        `${r.name}${r.description ? `: ${r.description}` : ""}${r.language ? ` [${r.language}]` : ""}${r.stargazers_count > 0 ? ` (${r.stargazers_count} stars)` : ""}`
    );

    const languages = [
      ...new Set(
        repos
          .map((r: { language: string | null }) => r.language)
          .filter(Boolean)
      ),
    ];

    // Fetch READMEs for top repos (up to 5 to avoid rate limits)
    const readmeRepos = ownRepos.slice(0, 5);
    const readmeParts: string[] = [];
    let readmeCount = 0;

    for (const repo of readmeRepos) {
      try {
        const readmeRes = await fetch(
          `https://api.github.com/repos/${username}/${(repo as { name: string }).name}/readme`,
          { headers: { Accept: "application/vnd.github.v3+json" } }
        );
        if (!readmeRes.ok) continue;
        const readmeData = await readmeRes.json();
        if (readmeData.content) {
          const decoded = Buffer.from(readmeData.content, "base64").toString("utf-8");
          // Take first 1500 chars of each README
          readmeParts.push(
            `\n--- README: ${(repo as { name: string }).name} ---\n${decoded.slice(0, 1500)}`
          );
          readmeCount++;
        }
      } catch {
        // Skip failed READMEs
      }
    }

    const parts = [
      `GitHub: ${user.login}`,
      user.name ? `Name: ${user.name}` : null,
      user.bio ? `Bio: ${user.bio}` : null,
      user.company ? `Company: ${user.company}` : null,
      languages.length ? `Languages: ${languages.join(", ")}` : null,
      `Public repos: ${user.public_repos}`,
      repoLines.length ? `Top repositories:\n${repoLines.join("\n")}` : null,
      readmeParts.length ? readmeParts.join("\n") : null,
    ];

    return {
      title: `GitHub: ${user.login} (${readmeCount} READMEs)`,
      text: parts.filter(Boolean).join("\n"),
      avatarUrl: user.avatar_url || undefined,
    };
  } catch {
    return null;
  }
}
