import { NextResponse } from "next/server";
import crypto from "crypto";
import { getRedis } from "@/lib/cache/redis";
import { getGmailAuthUrl } from "@/lib/email/gmail";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Gmail OAuth requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN." },
      { status: 503 }
    );
  }

  const stateToken = crypto.randomUUID();
  await redis.set("gmail-oauth:" + stateToken, user.id, { ex: 600 });

  const authUrl = getGmailAuthUrl(stateToken);
  return NextResponse.redirect(authUrl);
}
