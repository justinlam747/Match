import { task, logger } from "@trigger.dev/sdk";
import { Resend } from "resend";

type NotificationType =
  | "pipeline-complete"
  | "new-matches"
  | "content-ready"
  | "email-reply"
  | "scoring-failed";

interface NotifyPayload {
  userId: string;
  type: NotificationType;
  data: Record<string, unknown>;
}

/**
 * Send an in-app / email notification to a user after pipeline events.
 * Respects user notification preferences from the userPreferences table.
 */
export const notifyUserTask = task({
  id: "notify-user",
  retry: { maxAttempts: 2 },
  run: async (payload: NotifyPayload) => {
    const { db } = await import("@/lib/db");
    const { users, userPreferences } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");

    logger.info("Processing notification", {
      userId: payload.userId,
      type: payload.type,
    });

    // Load user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!user) {
      logger.warn("User not found, skipping notification", {
        userId: payload.userId,
      });
      return { sent: false, reason: "user-not-found" };
    }

    // Load notification preferences
    const [prefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, payload.userId))
      .limit(1);

    // Check if user wants this notification type
    const shouldNotify = checkPreference(payload.type, prefs);
    if (!shouldNotify) {
      logger.info("User opted out of this notification type", {
        type: payload.type,
      });
      return { sent: false, reason: "opted-out" };
    }

    // Build the notification content
    const { subject, body } = buildNotification(payload.type, payload.data);

    // Send via Resend (system notifications, not outreach)
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      logger.warn("RESEND_API_KEY not set, skipping email notification");
      return { sent: false, reason: "no-resend-key" };
    }

    const resend = new Resend(resendKey);
    const fromEmail =
      process.env.NOTIFICATION_FROM_EMAIL ||
      process.env.FROM_EMAIL ||
      "notifications@resend.dev";

    const result = await resend.emails.send({
      from: fromEmail,
      to: user.email,
      subject,
      text: body,
    });

    if (result.error) {
      logger.error("Failed to send notification email", {
        error: result.error.message,
      });
      return { sent: false, reason: "send-failed", error: result.error.message };
    }

    logger.info("Notification sent", {
      type: payload.type,
      to: user.email,
    });

    return { sent: true, type: payload.type, to: user.email };
  },
});

/**
 * Notify after a full pipeline run completes.
 * Summarises scores and generated content.
 */
export const notifyPipelineCompleteTask = task({
  id: "notify-pipeline-complete",
  retry: { maxAttempts: 1 },
  run: async (payload: {
    userId: string;
    resumeId: string;
    topMatches: { company: string; score: number }[];
    contentTypes: string[];
    error?: string;
  }) => {
    if (payload.error) {
      // Pipeline failed -- notify about the error
      await notifyUserTask.triggerAndWait({
        userId: payload.userId,
        type: "scoring-failed",
        data: {
          resumeId: payload.resumeId,
          error: payload.error,
        },
      });
      return { notified: true, type: "scoring-failed" };
    }

    // Pipeline succeeded -- send summary
    await notifyUserTask.triggerAndWait({
      userId: payload.userId,
      type: "pipeline-complete",
      data: {
        resumeId: payload.resumeId,
        matchCount: payload.topMatches.length,
        topMatches: payload.topMatches.slice(0, 5),
        contentTypes: payload.contentTypes,
      },
    });

    return { notified: true, type: "pipeline-complete" };
  },
});

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

function checkPreference(
  type: NotificationType,
  prefs: { notifyOnNewMatches: boolean; notifyOnEmailReplies: boolean } | undefined
): boolean {
  // Default to true if no preferences set
  if (!prefs) return true;

  switch (type) {
    case "pipeline-complete":
    case "new-matches":
    case "content-ready":
    case "scoring-failed":
      return prefs.notifyOnNewMatches;
    case "email-reply":
      return prefs.notifyOnEmailReplies;
    default:
      return true;
  }
}

function buildNotification(
  type: NotificationType,
  data: Record<string, unknown>
): { subject: string; body: string } {
  switch (type) {
    case "pipeline-complete": {
      const matchCount = (data.matchCount as number) || 0;
      const topMatches = (data.topMatches as { company: string; score: number }[]) || [];
      const contentTypes = (data.contentTypes as string[]) || [];

      const matchList = topMatches
        .map(
          (m, i) =>
            `  ${i + 1}. ${m.company} (${Math.round(m.score)}/100)`
        )
        .join("\n");

      return {
        subject: `Your matches are ready - ${matchCount} companies scored`,
        body: [
          `Your resume has been scored against YC companies.`,
          "",
          `Top matches:`,
          matchList || "  (none)",
          "",
          contentTypes.length > 0
            ? `Generated content: ${contentTypes.join(", ")}`
            : "",
          "",
          `View your full results in the dashboard.`,
        ]
          .filter((line) => line !== undefined)
          .join("\n"),
      };
    }

    case "new-matches": {
      const count = (data.newCount as number) || 0;
      return {
        subject: `${count} new company matches found`,
        body: `We found ${count} new companies that match your profile. Check your dashboard for details.`,
      };
    }

    case "content-ready": {
      const company = (data.company as string) || "a company";
      const contentType = (data.contentType as string) || "content";
      return {
        subject: `Your ${contentType} for ${company} is ready`,
        body: `Your ${contentType} for ${company} has been generated and is ready for review in your dashboard.`,
      };
    }

    case "email-reply": {
      const company = (data.company as string) || "a company";
      const contact = (data.contact as string) || "someone";
      return {
        subject: `Reply received from ${contact} at ${company}`,
        body: `${contact} at ${company} replied to your outreach email. Check your inbox and dashboard for the full conversation.`,
      };
    }

    case "scoring-failed": {
      const error = (data.error as string) || "Unknown error";
      return {
        subject: "Scoring pipeline encountered an issue",
        body: [
          `Your resume scoring pipeline ran into a problem:`,
          "",
          `  ${error}`,
          "",
          `This is usually temporary. We will retry automatically, or you can re-trigger scoring from your dashboard.`,
        ].join("\n"),
      };
    }

    default:
      return {
        subject: "Notification from YC Match",
        body: "You have a new notification. Check your dashboard for details.",
      };
  }
}
