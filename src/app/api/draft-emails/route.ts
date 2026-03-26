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

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

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

      // Get contacts for this company
      const companyContacts = await db
        .select()
        .from(contacts)
        .where(eq(contacts.companyId, companyId));

      if (companyContacts.length === 0) continue;

      // Draft email for the best contact (prefer verified, then by title priority)
      const bestContact =
        companyContacts.find((c) => c.emailVerified) || companyContacts[0];

      if (!bestContact.email) continue;

      const { subject, body: emailBody } = await draftEmail(
        resume.parsedData,
        {
          name: company.name,
          batch: company.batch,
          description: company.description,
          techStack: company.techStack,
        },
        {
          name: bestContact.name,
          title: bestContact.title,
        },
        {
          overallScore: score?.overallScore || 50,
          explanation: score?.explanation || "Good potential match.",
        }
      );

      // Store the draft
      await db.insert(emails).values({
        userId: resume.userId,
        contactId: bestContact.id,
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
