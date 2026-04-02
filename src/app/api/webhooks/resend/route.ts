import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Resend webhook for tracking email events (opens, bounces, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headers = {
      "svix-id": request.headers.get("svix-id") || "",
      "svix-timestamp": request.headers.get("svix-timestamp") || "",
      "svix-signature": request.headers.get("svix-signature") || "",
    };

    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      console.error("RESEND_WEBHOOK_SECRET not configured");
      return NextResponse.json(
        { error: "Server config error" },
        { status: 500 }
      );
    }

    const wh = new Webhook(secret);
    const payload = wh.verify(body, headers) as {
      type: string;
      data: Record<string, unknown>;
    };
    const { type, data } = payload;

    // The X-Entity-Ref-ID header contains our email ID
    const dataHeaders = data?.headers as Record<string, string> | undefined;
    const emailId = dataHeaders?.["X-Entity-Ref-ID"];
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
