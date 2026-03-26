import { db } from "@/lib/db";
import { ycCompanies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface YCCompanyRaw {
  id: number;
  name: string;
  slug: string;
  former_names: string[];
  small_logo_thumb_url: string;
  website: string;
  all_locations: string;
  long_description: string;
  one_liner: string;
  team_size: number;
  industry: string;
  subindustry: string;
  launched_at: number;
  tags: string[];
  top_company: boolean;
  isHiring: boolean;
  nonprofit: boolean;
  batch: string;
  status: string;
  industries: string[];
  regions: string[];
  stage: string;
  app_video_public: boolean;
  demo_day_video_public: boolean;
  app_answers: null;
  question_answers: boolean;
  url: string;
  api: string;
}

interface YCAPIResponse {
  companies: YCCompanyRaw[];
  nextPage: number | null;
  page: number;
  totalPages: number;
}

function inferStage(teamSize: number | null, batch: string | null): string {
  if (!batch) return "seed";
  const batchYear = parseInt(batch.slice(1), 10);
  const currentYear = new Date().getFullYear() % 100; // 2-digit year
  const yearsOld = currentYear - batchYear;

  if (yearsOld <= 1) return "seed";
  if (yearsOld <= 3) return "series_a";
  return "growth";
}

export async function scrapeYCBatch(batch: string): Promise<number> {
  let page = 0;
  let totalInserted = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.ycombinator.com/v0.1/companies?batch=${encodeURIComponent(batch)}&page=${page}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`YC API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as YCAPIResponse;

    for (const company of data.companies) {
      const existing = await db
        .select()
        .from(ycCompanies)
        .where(eq(ycCompanies.slug, company.slug))
        .limit(1);

      const values = {
        name: company.name,
        slug: company.slug,
        batch: company.batch,
        description: [company.one_liner, company.long_description]
          .filter(Boolean)
          .join(" — "),
        industries: company.industries || [],
        techStack: [] as string[], // enriched later
        stage: inferStage(company.team_size, company.batch),
        teamSize: company.team_size || null,
        website: company.website || null,
        ycUrl: `https://www.ycombinator.com/companies/${company.slug}`,
        hiringSignals: {
          has_careers_page: company.isHiring || false,
          recent_job_posts: company.isHiring ? 1 : 0,
          eng_roles_open: company.isHiring || false,
        },
        lastScraped: new Date(),
      };

      if (existing.length > 0) {
        await db
          .update(ycCompanies)
          .set(values)
          .where(eq(ycCompanies.slug, company.slug));
      } else {
        await db.insert(ycCompanies).values(values);
        totalInserted++;
      }

      // Rate limiting: 200ms between inserts
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    hasMore = data.nextPage !== null;
    page++;
  }

  return totalInserted;
}

export async function scrapeMultipleBatches(
  batches: string[]
): Promise<Record<string, number>> {
  const results: Record<string, number> = {};
  for (const batch of batches) {
    results[batch] = await scrapeYCBatch(batch);
  }
  return results;
}

export async function enrichTechStack(
  companyId: string,
  techStack: string[]
): Promise<void> {
  await db
    .update(ycCompanies)
    .set({ techStack })
    .where(eq(ycCompanies.id, companyId));
}
