import { schedules, task, tasks, logger } from "@trigger.dev/sdk";
import { scoutQueue } from "./queues";

/**
 * Scout Agent -- runs every 6 hours to find new YC companies and job postings.
 *
 * Steps:
 * 1. Fetch latest companies from YC OSS API
 * 2. Diff against existing DB records to find new ones
 * 3. Enrich new companies with tech stack inference
 * 4. Generate embeddings for new companies
 * 5. For each user with an active resume, trigger scoring for new companies
 */

// Sub-task: process a single new company (enrich + embed)
export const enrichCompanyTask = task({
  id: "enrich-company",
  queue: scoutQueue,
  retry: { maxAttempts: 2 },
  run: async (payload: {
    companyId: string;
    name: string;
    description: string;
  }) => {
    // Dynamic imports to keep trigger bundle lean
    const { db } = await import("@/lib/db");
    const { ycCompanies } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const { inferTechStack } = await import("@/lib/ai/enrich-tech");
    const { generateEmbedding, buildCompanyEmbeddingText } = await import(
      "@/lib/ai/embeddings"
    );

    logger.info(`Enriching company: ${payload.name}`);

    // Infer tech stack
    let techStack: string[] = [];
    try {
      techStack = await inferTechStack(payload.name, payload.description);
      if (techStack.length > 0) {
        await db
          .update(ycCompanies)
          .set({ techStack })
          .where(eq(ycCompanies.id, payload.companyId));
        logger.info(`Tech stack inferred: ${techStack.join(", ")}`);
      }
    } catch (err) {
      logger.warn(`Tech enrichment failed for ${payload.name}`, {
        error: String(err),
      });
    }

    // Generate embedding
    try {
      // Read the company back to get full data for embedding text
      const [company] = await db
        .select()
        .from(ycCompanies)
        .where(eq(ycCompanies.id, payload.companyId))
        .limit(1);

      if (company) {
        const text = buildCompanyEmbeddingText(company);
        const embedding = await generateEmbedding(text);
        await db
          .update(ycCompanies)
          .set({ embedding })
          .where(eq(ycCompanies.id, payload.companyId));
        logger.info(`Embedding generated for ${payload.name}`);
      }
    } catch (err) {
      logger.warn(`Embedding failed for ${payload.name}`, {
        error: String(err),
      });
    }

    return { companyId: payload.companyId, techStack };
  },
});

// YC OSS API shape
interface YCOSSCompany {
  id: number;
  name: string;
  slug: string;
  website: string;
  one_liner: string;
  long_description: string;
  batch: string;
  status: string;
  industries: string[];
  tags: string[];
  stage: string;
  team_size: number;
  isHiring: boolean;
  top_company: boolean;
  all_locations: string;
  small_logo_thumb_url: string;
  url: string;
  subindustry: string;
}

// Main scheduled scout task
export const scoutTask = schedules.task({
  id: "scout-new-leads",
  cron: "0 */6 * * *", // Every 6 hours
  queue: scoutQueue,
  run: async (payload) => {
    const { db } = await import("@/lib/db");
    const { ycCompanies, resumes } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    logger.info(`Scout running at ${payload.timestamp}`);

    // 1. Fetch latest from YC OSS API
    const res = await fetch(
      "https://yc-oss.github.io/api/companies/all.json"
    );
    if (!res.ok) {
      logger.error(`Failed to fetch YC API: ${res.status}`);
      return { error: "YC API unavailable" };
    }

    const companies: YCOSSCompany[] = await res.json();
    const active = companies.filter((c) => c.status === "Active");
    logger.info(`Fetched ${active.length} active companies from YC API`);

    // 2. Diff against DB -- find new ones
    const existingSlugs = await db
      .select({ slug: ycCompanies.slug })
      .from(ycCompanies);
    const slugSet = new Set(existingSlugs.map((e) => e.slug));

    const newCompanies = active.filter((c) => !slugSet.has(c.slug));
    logger.info(`Found ${newCompanies.length} new companies`);

    if (newCompanies.length === 0) {
      return { newCompanies: 0, enriched: 0 };
    }

    // 3. Insert new companies (column names match ycCompanies schema)
    const inserted: { id: string; name: string; description: string }[] = [];
    for (const c of newCompanies) {
      try {
        const [row] = await db
          .insert(ycCompanies)
          .values({
            name: c.name,
            slug: c.slug,
            batch: c.batch || null,
            description: c.one_liner || null,
            oneLiner: c.one_liner || null,
            longDescription: c.long_description || null,
            industries: c.industries || [],
            tags: c.tags || [],
            stage: c.stage || null,
            status: c.status || null,
            teamSize: c.team_size || null,
            website: c.website || null,
            ycUrl: c.url || null,
            logoUrl: c.small_logo_thumb_url || null,
            location: c.all_locations || null,
            isHiring: c.isHiring ?? false,
            isTopCompany: c.top_company ?? false,
            techStack: [],
          })
          .returning({ id: ycCompanies.id });

        inserted.push({
          id: row.id,
          name: c.name,
          description: `${c.one_liner || ""} ${c.long_description || ""}`.slice(
            0,
            500
          ),
        });
      } catch {
        // Duplicate slug -- skip
      }
    }

    logger.info(`Inserted ${inserted.length} new companies`);

    // 4. Enrich each new company (fan-out)
    if (inserted.length > 0) {
      await tasks.batchTrigger(
        enrichCompanyTask.id,
        inserted.map((c) => ({
          payload: {
            companyId: c.id,
            name: c.name,
            description: c.description,
          },
        }))
      );
    }

    // 5. Find users with active resumes for future re-scoring
    const activeResumes = await db
      .select({ userId: resumes.userId, resumeId: resumes.id })
      .from(resumes)
      .where(eq(resumes.isActive, true));

    logger.info(
      `${activeResumes.length} users with active resumes will be re-scored`
    );

    return {
      newCompanies: inserted.length,
      enrichTriggered: inserted.length,
      usersToNotify: activeResumes.length,
    };
  },
});
