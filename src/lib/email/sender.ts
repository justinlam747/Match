import { Resend } from "resend";
import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getGmailConnection, sendViaGmail } from "@/lib/email/gmail";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  emailId: string;
  to: string;
  subject: string;
  body: string;
  userId: string;
}

export async function sendEmail({ emailId, to, subject, body, userId }: SendEmailParams) {
  // Check if user has Gmail connected — use it if so
  const gmailConnection = await getGmailConnection(userId);

  if (gmailConnection) {
    await sendViaGmail({
      userId,
      to,
      subject,
      body,
      fromEmail: gmailConnection.emailAddress,
    });
  } else {
    // Fall back to Resend
    const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";

    const result = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      text: body,
      headers: {
        "X-Entity-Ref-ID": emailId,
      },
    });

    if (result.error) {
      throw new Error(`Resend error: ${result.error.message}`);
    }
  }

  await db
    .update(emails)
    .set({ status: "sent", sentAt: new Date() })
    .where(eq(emails.id, emailId));
}

export async function sendBatch(
  emailList: SendEmailParams[],
  delayMs = 180000 // 3 minutes between sends
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const email of emailList) {
    try {
      await sendEmail(email);
      sent++;

      // Delay between sends (skip after last one)
      if (emailList.indexOf(email) < emailList.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Failed to send email ${email.emailId}:`, error);
      await db
        .update(emails)
        .set({ status: "bounced" })
        .where(eq(emails.id, email.emailId));
      failed++;
    }
  }

  return { sent, failed };
}
