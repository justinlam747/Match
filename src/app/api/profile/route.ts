import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, resumes, documents, matchScores, emails } from "@/lib/db/schema";
import { eq, count, and } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const [activeResume] = await db
    .select()
    .from(resumes)
    .where(and(eq(resumes.userId, user.id), eq(resumes.isActive, true)))
    .limit(1);

  const docs = await db
    .select({
      id: documents.id,
      type: documents.type,
      title: documents.title,
      sourceUrl: documents.sourceUrl,
      rawText: documents.rawText,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.userId, user.id));

  const [matchCount] = activeResume
    ? await db
        .select({ count: count() })
        .from(matchScores)
        .where(eq(matchScores.resumeId, activeResume.id))
    : [{ count: 0 }];

  const [emailCount] = await db
    .select({ count: count() })
    .from(emails)
    .where(eq(emails.userId, user.id));

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      avatarUrl: user.avatarUrl,
      avatarSource: user.avatarSource,
      avatarOptions: user.avatarOptions || {},
      createdAt: user.createdAt,
    },
    resume: activeResume
      ? {
          id: activeResume.id,
          name: activeResume.name,
          parsedData: activeResume.parsedData,
          createdAt: activeResume.createdAt,
        }
      : null,
    documents: docs,
    stats: {
      matches: matchCount.count,
      emails: emailCount.count,
      documents: docs.length,
    },
  });
}
