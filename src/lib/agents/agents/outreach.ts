import { registerAgent } from "../registry";
import type { AgentContext, StepResult } from "../types";
import { db } from "@/lib/db";
import { emails, contacts } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

registerAgent({
  type: "outreach",
  label: "Email Outreach",
  description: "Send drafted emails with warm-up throttling",
  buildSteps(input) {
    return [
      {
        name: "load-drafts",
        label: "Loading draft emails",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          const emailIds = ctx.input.emailIds as string[] | undefined;
          const limit = (ctx.input.limit as number) || 10;

          let drafts;
          if (emailIds?.length) {
            drafts = await db
              .select()
              .from(emails)
              .where(
                and(
                  eq(emails.userId, ctx.userId),
                  eq(emails.status, "draft"),
                  inArray(emails.id, emailIds)
                )
              )
              .limit(limit);
          } else {
            drafts = await db
              .select()
              .from(emails)
              .where(
                and(
                  eq(emails.userId, ctx.userId),
                  eq(emails.status, "draft")
                )
              )
              .limit(limit);
          }

          if (!drafts.length) {
            return { abort: true, output: { error: "No draft emails to send" } };
          }

          // Resolve contact emails for each draft
          const contactIds = [...new Set(drafts.map((d) => d.contactId))];
          const contactRows = await db
            .select({ id: contacts.id, email: contacts.email })
            .from(contacts)
            .where(inArray(contacts.id, contactIds));

          const contactEmailMap = new Map(
            contactRows.map((c) => [c.id, c.email])
          );

          const draftsWithEmail = drafts
            .map((d) => ({
              id: d.id,
              contactId: d.contactId,
              toEmail: contactEmailMap.get(d.contactId) ?? null,
              subject: d.subject,
              body: d.body,
            }))
            .filter((d) => d.toEmail);

          if (!draftsWithEmail.length) {
            return { abort: true, output: { error: "No draft emails with valid contact addresses" } };
          }

          return {
            output: {
              drafts: draftsWithEmail,
              count: draftsWithEmail.length,
            },
          };
        },
      },
      {
        name: "send-emails",
        label: "Sending emails",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          const { drafts } = ctx.stepOutputs["load-drafts"] as {
            drafts: { id: string; toEmail: string; contactId: string; subject: string; body: string }[];
          };

          const { sendEmail } = await import("@/lib/email/sender");

          let sent = 0;
          let failed = 0;
          const errors: string[] = [];

          for (const draft of drafts) {
            try {
              // sendEmail handles Gmail vs Resend routing and marks status as "sent"
              await sendEmail({
                emailId: draft.id,
                to: draft.toEmail,
                subject: draft.subject,
                body: draft.body,
                userId: ctx.userId,
              });

              sent++;
            } catch (err) {
              failed++;
              errors.push(
                `${draft.toEmail}: ${err instanceof Error ? err.message : "Unknown error"}`
              );
            }
          }

          return {
            output: { sent, failed, errors: errors.length ? errors : undefined },
          };
        },
      },
    ];
  },
});
