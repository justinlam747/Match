import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { logAuditEvent } from "@/lib/audit/log";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const body = await request.json();
    const { subject, body: emailBody } = body;

    await db
      .update(emails)
      .set({
        subject,
        body: emailBody,
        status: "edited",
      })
      .where(and(eq(emails.id, id), eq(emails.userId, user.id)));

    await logAuditEvent({
      userId: user.id,
      action: "email.edited",
      entityType: "email",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update email:", error);
    return NextResponse.json(
      { error: "Failed to update email" },
      { status: 500 }
    );
  }
}
