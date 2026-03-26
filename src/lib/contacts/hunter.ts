const HUNTER_BASE_URL = "https://api.hunter.io/v2";

interface HunterVerifyResult {
  result: "deliverable" | "undeliverable" | "risky" | "unknown";
  score: number;
}

interface HunterDomainSearchResult {
  emails: {
    value: string;
    type: string;
    first_name: string;
    last_name: string;
    position: string;
  }[];
}

export async function verifyEmail(
  email: string
): Promise<HunterVerifyResult> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    return { result: "unknown", score: 0 };
  }

  try {
    const response = await fetch(
      `${HUNTER_BASE_URL}/email-verifier?email=${encodeURIComponent(email)}&api_key=${apiKey}`
    );

    if (!response.ok) {
      return { result: "unknown", score: 0 };
    }

    const data = await response.json();
    return {
      result: data.data?.result || "unknown",
      score: data.data?.score || 0,
    };
  } catch {
    return { result: "unknown", score: 0 };
  }
}

export async function domainSearch(
  domain: string
): Promise<HunterDomainSearchResult> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    return { emails: [] };
  }

  try {
    const response = await fetch(
      `${HUNTER_BASE_URL}/domain-search?domain=${encodeURIComponent(domain)}&type=personal&api_key=${apiKey}`
    );

    if (!response.ok) {
      return { emails: [] };
    }

    const data = await response.json();
    return { emails: data.data?.emails || [] };
  } catch {
    return { emails: [] };
  }
}
