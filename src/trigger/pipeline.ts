import { task, schedules, logger } from "@trigger.dev/sdk";
import { scoreResumeTask } from "./scorer";
import { batchWriteContentTask } from "./content-writer";
import { notifyPipelineCompleteTask } from "./notifier";
import type { ContentType } from "./content-writer";

/**
 * Full Pipeline -- triggered when a user uploads a resume or on-demand.
 * Chains: score -> write content for top matches
 */
export const fullPipelineTask = task({
  id: "full-pipeline",
  retry: { maxAttempts: 1 },
  run: async (payload: {
    userId: string;
    resumeId: string;
    contentTypes?: ContentType[];
    topN?: number;
  }) => {
    const { db } = await import("@/lib/db");
    const { matchScores, ycCompanies } = await import("@/lib/db/schema");
    const { eq, desc } = await import("drizzle-orm");

    const types = payload.contentTypes || ["email", "resume-tips", "interview-prep"];
    const topN = payload.topN || 10;

    // Step 1: Score
    logger.info("Step 1: Scoring resume against companies");
    const scoreResult = await scoreResumeTask.triggerAndWait({
      userId: payload.userId,
      resumeId: payload.resumeId,
    });

    if (!scoreResult.ok) {
      logger.error("Scoring failed", { error: scoreResult.error });

      // Notify user about the failure
      await notifyPipelineCompleteTask.trigger({
        userId: payload.userId,
        resumeId: payload.resumeId,
        topMatches: [],
        contentTypes: types,
        error: "Scoring step failed",
      });

      return { error: "Scoring failed", details: scoreResult.error };
    }

    logger.info("Scoring complete", { output: scoreResult.output });

    // Step 2: Get top matches
    const topMatches = await db
      .select({
        companyId: matchScores.companyId,
        overallScore: matchScores.overallScore,
        companyName: ycCompanies.name,
      })
      .from(matchScores)
      .innerJoin(ycCompanies, eq(matchScores.companyId, ycCompanies.id))
      .where(eq(matchScores.resumeId, payload.resumeId))
      .orderBy(desc(matchScores.overallScore))
      .limit(topN);

    logger.info(`Top ${topMatches.length} matches loaded`);

    // Step 3: Generate content for each top match
    if (topMatches.length > 0) {
      logger.info(
        `Step 3: Generating content (${types.join(", ")}) for ${topMatches.length} companies`
      );

      const batchResult = await batchWriteContentTask.triggerAndWait({
        userId: payload.userId,
        resumeId: payload.resumeId,
        companyIds: topMatches.map((m) => m.companyId),
        types,
      });

      if (batchResult.ok) {
        logger.info("Content generation complete", {
          output: batchResult.output,
        });
      } else {
        logger.warn("Content generation had issues", {
          error: batchResult.error,
        });
      }
    }

    const result = {
      scored: scoreResult.output,
      topMatches: topMatches.map((m) => ({
        company: m.companyName,
        score: m.overallScore,
      })),
      contentTypes: types,
    };

    // Step 4: Notify the user (fire-and-forget -- do not block pipeline return)
    logger.info("Step 4: Sending notification");
    await notifyPipelineCompleteTask.trigger({
      userId: payload.userId,
      resumeId: payload.resumeId,
      topMatches: result.topMatches,
      contentTypes: types,
    });

    return result;
  },
});

/**
 * Per-user scheduled pipeline -- runs daily to check for new opportunities.
 * Each user with an active resume gets scored against any new companies.
 */
export const dailyUserPipelineTask = schedules.task({
  id: "daily-user-pipeline",
  cron: "30 8 * * *", // 8:30 AM UTC daily
  run: async (payload) => {
    const { db } = await import("@/lib/db");
    const { resumes } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    logger.info(`Daily pipeline running at ${payload.timestamp}`);

    // Find all users with active resumes
    const activeResumes = await db
      .select({ userId: resumes.userId, resumeId: resumes.id })
      .from(resumes)
      .where(eq(resumes.isActive, true));

    logger.info(`${activeResumes.length} active resumes found`);

    // Trigger scoring for each user (fire-and-forget, do not block schedule)
    const handles = [];
    for (const r of activeResumes) {
      const handle = await fullPipelineTask.trigger({
        userId: r.userId,
        resumeId: r.resumeId,
        contentTypes: ["email", "interview-prep"],
        topN: 5,
      });
      handles.push({ userId: r.userId, runId: handle.id });
    }

    return {
      usersProcessed: handles.length,
      runs: handles,
    };
  },
});
