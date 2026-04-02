import { registerAgent } from "../registry";
import type { AgentContext, StepResult } from "../types";
import { db } from "@/lib/db";
import { resumes, matchScores, ycCompanies, contacts, emails } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { draftEmail } from "@/lib/ai/draft-email";
import type { ParsedResume } from "@/lib/db/schema";

registerAgent({
  type: "email-drafter",
  label: "Email Drafting",
  description: "Draft personalized cold emails for top matches",
  buildSteps(_input) {
    return [
      {
        name: "load-data",
        label: "Loading matches and contacts",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          const resumeId = ctx.input.resumeId as string;
          const limit = (ctx.input.limit as number) || 10;

          const [resume] = await db
            .select()
            .from(resumes)
            .where(eq(resumes.id, resumeId))
            .limit(1);

          if (!resume?.parsedData) {
            return { abort: true, output: { error: "Resume not found or not parsed" } };
          }

          // Get top matches that have contacts with emails
          const matches = await db
            .select({
              matchScoreId: matchScores.id,
              companyId: matchScores.companyId,
              overallScore: matchScores.overallScore,
              explanation: matchScores.explanation,
              companyName: ycCompanies.name,
              batch: ycCompanies.batch,
              description: ycCompanies.description,
              techStack: ycCompanies.techStack,
              contactId: contacts.id,
              contactName: contacts.name,
              contactTitle: contacts.title,
              contactEmail: contacts.email,
            })
            .from(matchScores)
            .innerJoin(ycCompanies, eq(matchScores.companyId, ycCompanies.id))
            .innerJoin(
              contacts,
              eq(contacts.companyId, matchScores.companyId)
            )
            .where(eq(matchScores.resumeId, resumeId))
            .orderBy(desc(matchScores.overallScore))
            .limit(limit);

          return {
            output: {
              resume: { id: resume.id, parsedData: resume.parsedData, userId: resume.userId },
              matches,
              count: matches.length,
            },
          };
        },
      },
      {
        name: "draft-emails",
        label: "Drafting personalized emails",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          const { resume, matches } = ctx.stepOutputs["load-data"] as {
            resume: { id: string; parsedData: ParsedResume; userId: string };
            matches: {
              matchScoreId: string;
              companyId: string;
              companyName: string;
              batch: string | null;
              description: string | null;
              techStack: string[] | null;
              overallScore: number;
              explanation: string | null;
              contactId: string;
              contactName: string;
              contactTitle: string | null;
              contactEmail: string | null;
            }[];
          };

          let drafted = 0;
          let skipped = 0;

          for (const match of matches) {
            // Skip if email already drafted for this contact
            const existing = await db
              .select({ id: emails.id })
              .from(emails)
              .where(
                and(
                  eq(emails.contactId, match.contactId),
                  eq(emails.userId, ctx.userId)
                )
              )
              .limit(1);

            if (existing.length > 0) {
              skipped++;
              continue;
            }

            if (!match.contactEmail) {
              skipped++;
              continue;
            }

            try {
              const result = await draftEmail(
                resume.parsedData,
                {
                  name: match.companyName,
                  batch: match.batch,
                  description: match.description,
                  techStack: match.techStack,
                },
                {
                  name: match.contactName,
                  title: match.contactTitle,
                },
                {
                  overallScore: match.overallScore,
                  explanation: match.explanation || "Good potential match.",
                }
              );

              await db.insert(emails).values({
                userId: ctx.userId,
                contactId: match.contactId,
                matchScoreId: match.matchScoreId,
                subject: result.subject,
                body: result.body,
                status: "draft",
                sequencePosition: 1,
              });

              drafted++;
            } catch {
              // Continue to next on error
            }
          }

          return { output: { drafted, skipped, total: matches.length } };
        },
      },
    ];
  },
});
