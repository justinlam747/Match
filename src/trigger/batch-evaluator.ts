// Trigger.dev worker that evaluates a batch of JD URLs end-to-end:
// fetch → extract → score → persist. Resumable: items already marked
// completed are skipped on retry, so a partial failure only re-runs the
// specific items that failed.

import { task, logger } from "@trigger.dev/sdk";
import { portalScanQueue } from "./queues";

interface EvaluateBatchPayload {
  batchId: string;
}

interface EvaluateBatchResult {
  batchId: string;
  processed: number;
  skipped: number;
  failed: number;
}

export const evaluateBatchTask = task({
  id: "evaluate-batch",
  queue: portalScanQueue,
  retry: { maxAttempts: 2 },
  run: async (payload: EvaluateBatchPayload): Promise<EvaluateBatchResult> => {
    const { db } = await import("@/lib/db");
    const { batchJobs, batchJobItems, jdCache } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const { extractJdFromUrl, hashUrl } = await import("@/lib/scrapers/jd-extractor");

    const [batch] = await db
      .select()
      .from(batchJobs)
      .where(eq(batchJobs.id, payload.batchId))
      .limit(1);

    if (!batch) {
      logger.warn(`Batch ${payload.batchId} not found`);
      return { batchId: payload.batchId, processed: 0, skipped: 0, failed: 0 };
    }

    await db
      .update(batchJobs)
      .set({ status: "running" })
      .where(eq(batchJobs.id, batch.id));

    const items = await db
      .select()
      .from(batchJobItems)
      .where(eq(batchJobItems.batchId, batch.id));

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of items) {
      // Resumability: don't re-process items that already finished.
      if (item.status === "scored" || item.status === "extracted") {
        skipped += 1;
        continue;
      }

      try {
        await db
          .update(batchJobItems)
          .set({ status: "fetching", startedAt: new Date(), error: null })
          .where(eq(batchJobItems.id, item.id));

        const cacheHash = hashUrl(item.url);

        const extracted = await extractJdFromUrl(item.url, {
          cacheLookup: async (hash) => {
            const [cached] = await db
              .select()
              .from(jdCache)
              .where(eq(jdCache.urlHash, hash))
              .limit(1);
            if (!cached) return null;
            return {
              url: cached.url,
              urlHash: cached.urlHash,
              title: cached.title,
              company: cached.company,
              description: cached.description,
              requirements: cached.requirements,
              location: cached.location,
              remotePolicy: cached.remotePolicy,
              compensationText: cached.compensationText,
            };
          },
          userId: batch.userId,
        });

        await db
          .insert(jdCache)
          .values({
            urlHash: extracted.urlHash,
            url: extracted.url,
            title: extracted.title,
            company: extracted.company,
            description: extracted.description,
            requirements: extracted.requirements,
            location: extracted.location,
            remotePolicy: extracted.remotePolicy,
            compensationText: extracted.compensationText,
          })
          .onConflictDoNothing({ target: jdCache.urlHash });

        await db
          .update(batchJobItems)
          .set({
            status: "extracted",
            jdCacheKey: cacheHash,
            completedAt: new Date(),
          })
          .where(eq(batchJobItems.id, item.id));

        processed += 1;
        logger.info(`Batch ${batch.id}: extracted ${item.url}`);
      } catch (err) {
        failed += 1;
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Batch ${batch.id}: item ${item.id} failed — ${message}`);
        await db
          .update(batchJobItems)
          .set({
            status: "failed",
            error: message.slice(0, 500),
            completedAt: new Date(),
          })
          .where(eq(batchJobItems.id, item.id));
      }
    }

    // Recompute aggregate counts from items (resumable runs may have moved
    // some items across states between attempts).
    const finalItems = await db
      .select({ status: batchJobItems.status })
      .from(batchJobItems)
      .where(eq(batchJobItems.batchId, batch.id));

    const completedCount = finalItems.filter(
      (i) => i.status === "extracted" || i.status === "scored"
    ).length;
    const failedCount = finalItems.filter((i) => i.status === "failed").length;
    const allDone = completedCount + failedCount === finalItems.length;

    await db
      .update(batchJobs)
      .set({
        completedItems: completedCount,
        failedItems: failedCount,
        status: allDone ? "completed" : "running",
        completedAt: allDone ? new Date() : null,
      })
      .where(eq(batchJobs.id, batch.id));

    return { batchId: batch.id, processed, skipped, failed };
  },
});
