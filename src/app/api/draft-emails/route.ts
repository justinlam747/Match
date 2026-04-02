import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  resumes,
  ycCompanies,
  contacts,
  matchScores,
  emails,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { draftEmail } from "@/lib/ai/draft-email";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const rl = await rateLimit(`draft-emails:${user.id}`, 20, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { resumeId, companyIds } = body as {
      resumeId: string;
      companyIds: string[];
    };

    if (!resumeId || !companyIds?.length) {
      return NextResponse.json(
        { error: "resumeId and companyIds are required" },
        { status: 400 }
      );
    }

    const [resume] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, user.id)))
      .limit(1);

    if (!resume?.parsedData) {
      return NextResponse.json(
        { error: "Resume not found or not parsed" },
        { status: 404 }
      );
    }

    const drafted: string[] = [];

    for (const companyId of companyIds) {
      // Get company
      const [company] = await db
        .select()
        .from(ycCompanies)
        .where(eq(ycCompanies.id, companyId))
        .limit(1);
      if (!company) continue;

      // Get match score
      const [score] = await db
        .select()
        .from(matchScores)
        .where(
          and(
            eq(matchScores.resumeId, resumeId),
            eq(matchScores.companyId, companyId)
          )
        )
        .limit(1);

      // Get best contact if available, otherwise use company info
      const companyContacts = await db
        .select()
        .from(contacts)
        .where(eq(contacts.companyId, companyId));

      const bestContact =
        companyContacts.find((c) => c.emailVerified) ||
        companyContacts.find((c) => c.email) ||
        null;

      const contactName = bestContact?.name || `${company.name} team`;
      const contactTitle = bestContact?.title || "Founder";

      const { subject, body: emailBody } = await draftEmail(
        resume.parsedData,
        {
          name: company.name,
          batch: company.batch,
          description: company.description,
          techStack: company.techStack,
        },
        {
          name: contactName,
          title: contactTitle,
        },
        {
          overallScore: score?.overallScore || 50,
          explanation: score?.explanation || "Good potential match.",
        }
      );

      // If no contact exists, create a placeholder for the company
      let contactId: string;
      if (bestContact) {
        contactId = bestContact.id;
      } else {
        const [placeholder] = await db
          .insert(contacts)
          .values({
            companyId,
            name: contactName,
            title: "Founder",
            email: company.website
              ? `hello@${new URL(company.website).hostname.replace("www.", "")}`
              : null,
          })
          .returning({ id: contacts.id });
        contactId = placeholder.id;
      }

      await db.insert(emails).values({
        userId: resume.userId,
        contactId,
        matchScoreId: score?.id || null,
        subject,
        body: emailBody,
        status: "draft",
        sequencePosition: 1,
      });

      drafted.push(companyId);
    }

    return NextResponse.json({
      message: `Drafted ${drafted.length} emails`,
      draftedCompanyIds: drafted,
    });
  } catch (error) {
    console.error("Email drafting error:", error);
    return NextResponse.json(
      { error: "Failed to draft emails" },
      { status: 500 }
    );
  }
}
