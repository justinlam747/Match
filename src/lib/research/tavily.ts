const TAVILY_BASE_URL = "https://api.tavily.com";

export interface TavilyResult {
  url: string;
  title: string;
  content: string;
  raw_content: string | null;
  score: number;
}

export interface TavilyResponse {
  query: string;
  answer: string | null;
  results: TavilyResult[];
}

interface TavilyOptions {
  maxResults?: number;
  includeRawContent?: boolean;
  searchDepth?: "basic" | "advanced";
  excludeDomains?: string[];
}

export async function tavilySearch(
  query: string,
  opts: TavilyOptions = {}
): Promise<TavilyResponse | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn("TAVILY_API_KEY not set, deep-research web search disabled");
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(`${TAVILY_BASE_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: opts.searchDepth ?? "basic",
        include_raw_content: opts.includeRawContent ?? true,
        include_answer: true,
        max_results: opts.maxResults ?? 5,
        exclude_domains: opts.excludeDomains,
      }),
    });

    if (!res.ok) {
      console.error(`Tavily error: ${res.status} ${res.statusText}`);
      return null;
    }

    return (await res.json()) as TavilyResponse;
  } catch (e) {
    console.error("Tavily search failed:", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
