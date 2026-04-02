import { registerAgent } from "../registry";
import type { AgentContext, StepResult } from "../types";
import { db } from "@/lib/db";
import { resumes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

registerAgent({
  type: "pipeline",
  label: "Full Pipeline",
  description:
    "Run the complete match pipeline: score -> discover contacts -> draft emails",
  buildSteps(input) {
    return [
      {
        name: "validate",
        label: "Validating inputs",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          const resumeId = ctx.input.resumeId as string;
          if (!resumeId) {
            return {
              abort: true,
              output: { error: "resumeId is required" },
            };
          }

          const [resume] = await db
            .select({ id: resumes.id, parsedData: resumes.parsedData })
            .from(resumes)
            .where(eq(resumes.id, resumeId))
            .limit(1);

          if (!resume?.parsedData) {
            return {
              abort: true,
              output: { error: "Resume not found or not yet parsed" },
            };
          }

          return {
            output: {
              resumeId: resume.id,
              resumeName: (resume.parsedData as unknown as Record<string, unknown>).name,
            },
          };
        },
      },
      {
        name: "score",
        label: "Scoring matches",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          return {
            output: { spawned: "scoring" },
            spawn: [
              {
                agentType: "scoring",
                input: { resumeId: ctx.input.resumeId as string },
              },
            ],
          };
        },
      },
      {
        name: "discover-contacts",
        label: "Finding contacts",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          return {
            output: { spawned: "contacts" },
            spawn: [
              {
                agentType: "contacts",
                input: {
                  resumeId: ctx.input.resumeId as string,
                  limit: (ctx.input.contactLimit as number) || 20,
                },
              },
            ],
          };
        },
      },
      {
        name: "draft-emails",
        label: "Drafting emails",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          return {
            output: { spawned: "email-drafter" },
            spawn: [
              {
                agentType: "email-drafter",
                input: {
                  resumeId: ctx.input.resumeId as string,
                  limit: (ctx.input.emailLimit as number) || 10,
                },
              },
            ],
          };
        },
      },
    ];
  },
});
