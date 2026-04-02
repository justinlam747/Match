import { registerAgent } from "../registry";
import type { AgentContext, StepResult } from "../types";
import { db } from "@/lib/db";
import { contacts, matchScores, ycCompanies } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

registerAgent({
  type: "contacts",
  label: "Contact Discovery",
  description: "Find decision-makers at top-matched companies",
  buildSteps(_input) {
    return [
      {
        name: "load-matches",
        label: "Loading top matches",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          const resumeId = ctx.input.resumeId as string;
          const limit = (ctx.input.limit as number) || 20;

          const matches = await db
            .select({
              companyId: matchScores.companyId,
              overallScore: matchScores.overallScore,
              companyName: ycCompanies.name,
              companyWebsite: ycCompanies.website,
            })
            .from(matchScores)
            .innerJoin(ycCompanies, eq(matchScores.companyId, ycCompanies.id))
            .where(eq(matchScores.resumeId, resumeId))
            .orderBy(desc(matchScores.overallScore))
            .limit(limit);

          if (!matches.length) {
            return { abort: true, output: { error: "No matches found. Run scoring first." } };
          }

          return { output: { matches, count: matches.length } };
        },
      },
      {
        name: "discover-contacts",
        label: "Discovering contacts",
        execute: async (ctx: AgentContext): Promise<StepResult> => {
          const { matches } = ctx.stepOutputs["load-matches"] as {
            matches: { companyId: string; companyName: string; companyWebsite: string | null }[];
          };

          let found = 0;
          let skipped = 0;

          for (const match of matches) {
            // Check if contacts already exist for this company
            const existing = await db
              .select({ id: contacts.id })
              .from(contacts)
              .where(eq(contacts.companyId, match.companyId))
              .limit(1);

            if (existing.length > 0) {
              skipped++;
              continue;
            }

            // Derive domain from company website
            const domain = match.companyWebsite
              ? (() => {
                  try {
                    return new URL(match.companyWebsite).hostname;
                  } catch {
                    return null;
                  }
                })()
              : null;

            try {
              let contactData: {
                name: string;
                title: string;
                email: string | null;
                emailVerified: boolean;
                source: string;
                linkedinUrl: string | null;
              } | null = null;

              // Try Apollo first, then Hunter
              try {
                const { searchPeopleAtCompany } = await import("@/lib/contacts/apollo");
                const people = await searchPeopleAtCompany(match.companyName, domain);
                if (people.length > 0) {
                  const best = people[0];
                  contactData = {
                    name: best.name,
                    title: best.title,
                    email: best.email,
                    emailVerified: false,
                    source: "apollo",
                    linkedinUrl: best.linkedin_url,
                  };

                  // Verify email with Hunter if available
                  if (contactData.email) {
                    try {
                      const { verifyEmail } = await import("@/lib/contacts/hunter");
                      const verification = await verifyEmail(contactData.email);
                      contactData.emailVerified = verification.result === "deliverable";
                    } catch {
                      // Hunter verification is best-effort
                    }
                  }
                }
              } catch {
                // Apollo not configured, try Hunter domain search
                try {
                  if (domain) {
                    const { domainSearch } = await import("@/lib/contacts/hunter");
                    const results = await domainSearch(domain);
                    if (results.emails.length > 0) {
                      const best = results.emails[0];
                      contactData = {
                        name: `${best.first_name} ${best.last_name}`,
                        title: best.position || "Team Member",
                        email: best.value,
                        emailVerified: false,
                        source: "hunter",
                        linkedinUrl: null,
                      };
                    }
                  }
                } catch {
                  // Neither provider available
                }
              }

              if (contactData) {
                await db.insert(contacts).values({
                  companyId: match.companyId,
                  name: contactData.name,
                  title: contactData.title,
                  email: contactData.email || null,
                  emailVerified: contactData.emailVerified,
                  source: contactData.source,
                  linkedinUrl: contactData.linkedinUrl,
                });
                found++;
              }
            } catch {
              // Continue to next company on error
            }
          }

          return { output: { found, skipped, total: matches.length } };
        },
      },
    ];
  },
});
