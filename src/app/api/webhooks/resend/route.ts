import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Resend webhook for tracking email events (opens, bounces, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // The X-Entity-Ref-ID header contains our email ID
    const emailId = data?.headers?.["X-Entity-Ref-ID"];
    if (!emailId) {
      return NextResponse.json({ received: true });
    }

    switch (type) {
      case "email.opened":
        await db
          .update(emails)
          .set({ status: "opened", openedAt: new Date() })
          .where(eq(emails.id, emailId));
        break;

      case "email.bounced":
        await db
          .update(emails)
          .set({ status: "bounced" })
          .where(eq(emails.id, emailId));
        break;

      case "email.complained":
        // Spam complaint - mark as bounced
        await db
          .update(emails)
          .set({ status: "bounced" })
          .where(eq(emails.id, emailId));
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ received: true }); // Always 200 for webhooks
  }
}
