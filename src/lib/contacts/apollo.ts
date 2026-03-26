const APOLLO_BASE_URL = "https://api.apollo.io/v1";

interface ApolloPersonResult {
  name: string;
  title: string;
  email: string | null;
  linkedin_url: string | null;
  organization_name: string;
}

interface ApolloSearchResponse {
  people: ApolloPersonResult[];
}

export async function searchPeopleAtCompany(
  companyName: string,
  companyDomain: string | null,
  titles: string[] = [
    "CTO",
    "Co-Founder",
    "Founder",
    "VP Engineering",
    "Head of Engineering",
    "Engineering Manager",
  ]
): Promise<ApolloPersonResult[]> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) {
    console.warn("APOLLO_API_KEY not set, skipping Apollo search");
    return [];
  }

  try {
    const response = await fetch(`${APOLLO_BASE_URL}/mixed_people/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        q_organization_name: companyName,
        person_titles: titles,
        page: 1,
        per_page: 5,
      }),
    });

    if (!response.ok) {
      console.error(`Apollo API error: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as ApolloSearchResponse;
    return data.people || [];
  } catch (error) {
    console.error("Apollo search failed:", error);
    return [];
  }
}

export async function enrichPerson(
  name: string,
  companyName: string,
  domain: string | null
): Promise<{ email: string | null; linkedin_url: string | null }> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return { email: null, linkedin_url: null };

  try {
    const response = await fetch(`${APOLLO_BASE_URL}/people/match`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        name,
        organization_name: companyName,
        domain: domain || undefined,
      }),
    });

    if (!response.ok) return { email: null, linkedin_url: null };

    const data = await response.json();
    return {
      email: data.person?.email || null,
      linkedin_url: data.person?.linkedin_url || null,
    };
  } catch {
    return { email: null, linkedin_url: null };
  }
}
