import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails, contacts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email/sender";
import { canSendToday } from "@/lib/email/throttle";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const rl = await rateLimit(`send-email:${user.id}`, 30, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { emailIds, domainAgeDays = 30 } = body as {
      emailIds: string[];
      domainAgeDays?: number;
    };

    if (!emailIds || emailIds.length === 0) {
      return NextResponse.json(
        { error: "emailIds array is required" },
        { status: 400 }
      );
    }

    // Check throttling
    const { allowed, sent, limit } = await canSendToday(domainAgeDays);
    if (!allowed) {
      return NextResponse.json(
        {
          error: `Daily send limit reached (${sent}/${limit}). Try again tomorrow.`,
        },
        { status: 429 }
      );
    }

    const remaining = limit - sent;
    const toSend = emailIds.slice(0, remaining);

    const results: { emailId: string; success: boolean; error?: string }[] = [];

    for (const emailId of toSend) {
      const [email] = await db
        .select()
        .from(emails)
        .where(and(eq(emails.id, emailId), eq(emails.userId, user.id)))
        .limit(1);

      if (!email || email.status === "sent") {
        results.push({
          emailId,
          success: false,
          error: "Email not found or already sent",
        });
        continue;
      }

      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, email.contactId))
        .limit(1);

      if (!contact?.email) {
        results.push({
          emailId,
          success: false,
          error: "Contact email not found",
        });
        continue;
      }

      try {
        await sendEmail({
          emailId: email.id,
          to: contact.email,
          subject: email.subject,
          body: email.body,
          userId: user.id,
        });
        results.push({ emailId, success: true });
      } catch (err) {
        results.push({
          emailId,
          success: false,
          error: err instanceof Error ? err.message : "Send failed",
        });
      }

      // Delay between sends (3 minutes)
      if (toSend.indexOf(emailId) < toSend.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 180000));
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} emails`,
      results,
      throttled: emailIds.length > toSend.length
        ? emailIds.length - toSend.length
        : 0,
    });
  } catch (error) {
    console.error("Send error:", error);
    return NextResponse.json(
      { error: "Failed to send emails" },
      { status: 500 }
    );
  }
}
