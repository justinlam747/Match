import { NextResponse } from "next/server";
import { getGmailConnection } from "@/lib/email/gmail";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const connection = await getGmailConnection(user.id);

  if (!connection) {
    return NextResponse.json({ connected: false });
  }

  return NextResponse.json({
    connected: true,
    emailAddress: connection.emailAddress,
    connectedAt: connection.connectedAt.toISOString(),
  });
}
