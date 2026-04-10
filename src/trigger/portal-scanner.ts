import { schedules, task, tasks, logger } from "@trigger.dev/sdk";
import { portalScanQueue } from "./queues";

interface ScanPortalPayload {
  portalId: string;
}

interface ScanPortalResult {
  portalId: string;
  jobsFound: number;
  newJobs: number;
  skipped?: boolean;
  error?: string;
}

export const scanPortalTask = task({
  id: "scan-portal",
  queue: portalScanQueue,
  retry: { maxAttempts: 2 },
  run: async (payload: ScanPortalPayload): Promise<ScanPortalResult> => {
    const { db } = await import("@/lib/db");
    const { portals, portalJobs, portalScanHistory } = await import(
      "@/lib/db/schema"
    );
    const { eq } = await import("drizzle-orm");
    const { routeAtsScrape, dedupeJobs, atsRateLimitDelay, sleep } =
      await import("@/lib/scrapers/ats-router");
    const { filterTitle } = await import("@/lib/scrapers/title-filter");

    const [portal] = await db
      .select()
      .from(portals)
      .where(eq(portals.id, payload.portalId))
      .limit(1);

    if (!portal) {
      logger.warn(`Portal ${payload.portalId} not found`);
      return {
        portalId: payload.portalId,
        jobsFound: 0,
        newJobs: 0,
        error: "portal not found",
      };
    }

    if (!portal.isActive) {
      logger.info(`Portal ${portal.name} is inactive, skipping`);
      return {
        portalId: portal.id,
        jobsFound: 0,
        newJobs: 0,
        skipped: true,
      };
    }

    await sleep(atsRateLimitDelay(portal.atsType));

    const scrape = await routeAtsScrape({
      atsType: portal.atsType,
      careersUrl: portal.careersUrl,
      apiEndpoint: portal.apiEndpoint,
    });

    if (scrape.error) {
      logger.error(`Scrape failed for ${portal.name}: ${scrape.error}`);
      await db.insert(portalScanHistory).values({
        portalId: portal.id,
        jobsFound: 0,
        newJobs: 0,
        error: scrape.error,
      });
      return {
        portalId: portal.id,
        jobsFound: 0,
        newJobs: 0,
        error: scrape.error,
      };
    }

    const deduped = dedupeJobs(scrape.jobs);
    const matched = deduped.filter((job) => filterTitle(job.title).matched);

    logger.info(
      `Portal ${portal.name}: scraped ${scrape.jobs.length}, deduped ${deduped.length}, matched ${matched.length}`
    );

    let newJobs = 0;
    for (const job of matched) {
      const result = await db
        .insert(portalJobs)
        .values({
          portalId: portal.id,
          title: job.title,
          url: job.url,
          description: job.description,
          location: job.location,
          postedAt: job.postedAt,
        })
        .onConflictDoNothing({ target: portalJobs.url })
        .returning({ id: portalJobs.id });
      if (result.length > 0) {
        newJobs += 1;
      }
    }

    await db.insert(portalScanHistory).values({
      portalId: portal.id,
      jobsFound: matched.length,
      newJobs,
    });

    logger.info(
      `Portal ${portal.name} scan complete: ${newJobs} new of ${matched.length} matched jobs`
    );
    // Future: fan out to scoring against active resumes when portal_jobs flows into the match pipeline

    return {
      portalId: portal.id,
      jobsFound: matched.length,
      newJobs,
    };
  },
});

export const scanAllPortalsSchedule = schedules.task({
  id: "scan-all-portals",
  cron: "0 6 * * *",
  queue: portalScanQueue,
  run: async (payload) => {
    const { db } = await import("@/lib/db");
    const { portals } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    logger.info(`Portal scan schedule running at ${payload.timestamp}`);

    const activePortals = await db
      .select({ id: portals.id })
      .from(portals)
      .where(eq(portals.isActive, true));

    if (activePortals.length === 0) {
      logger.info("No active portals to scan");
      return { portalsTriggered: 0 };
    }

    await tasks.batchTrigger(
      scanPortalTask.id,
      activePortals.map((p) => ({
        payload: { portalId: p.id },
      }))
    );

    logger.info(`Portal scan fan-out complete`, {
      portalsTriggered: activePortals.length,
    });

    return { portalsTriggered: activePortals.length };
  },
});
