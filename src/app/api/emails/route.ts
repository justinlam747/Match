import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails, contacts, matchScores, ycCompanies } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

export async function GET() {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const emailRows = await db
      .select({
        id: emails.id,
        subject: emails.subject,
        body: emails.body,
        status: emails.status,
        sentAt: emails.sentAt,
        openedAt: emails.openedAt,
        contactName: contacts.name,
        contactTitle: contacts.title,
        contactEmail: contacts.email,
        companyName: ycCompanies.name,
        matchScore: matchScores.overallScore,
      })
      .from(emails)
      .innerJoin(contacts, eq(emails.contactId, contacts.id))
      .innerJoin(ycCompanies, eq(contacts.companyId, ycCompanies.id))
      .leftJoin(matchScores, eq(emails.matchScoreId, matchScores.id))
      .where(eq(emails.userId, user.id))
      .orderBy(desc(emails.createdAt));

    return NextResponse.json({
      emails: emailRows.map((e) => ({
        id: e.id,
        subject: e.subject,
        body: e.body,
        status: e.status,
        contactName: e.contactName,
        contactTitle: e.contactTitle,
        contactEmail: e.contactEmail || "",
        companyName: e.companyName,
        matchScore: e.matchScore || 0,
      })),
    });
  } catch (error) {
    console.error("Failed to load emails:", error);
    return NextResponse.json(
      { error: "Failed to load emails" },
      { status: 500 }
    );
  }
}
