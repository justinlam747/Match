import { NextResponse } from "next/server";
import crypto from "crypto";
import { Redis } from "@upstash/redis";
import { getGmailAuthUrl } from "@/lib/email/gmail";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const stateToken = crypto.randomUUID();
  await redis.set("gmail-oauth:" + stateToken, user.id, { ex: 600 });

  const authUrl = getGmailAuthUrl(stateToken);
  return NextResponse.redirect(authUrl);
}
