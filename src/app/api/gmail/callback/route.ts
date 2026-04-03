import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";
import { exchangeCodeForTokens } from "@/lib/email/gmail";
import { db } from "@/lib/db";
import { emailConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt } from "@/lib/crypto";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL("/emails?gmail=error", process.env.NEXT_PUBLIC_APP_URL!)
    );
  }

  // Validate the OAuth state token against Redis
  const userId = await redis.get<string>("gmail-oauth:" + state);
  if (!userId) {
    return NextResponse.redirect(
      new URL("/emails?gmail=error", process.env.NEXT_PUBLIC_APP_URL!)
    );
  }

  // Delete the token so it cannot be reused
  await redis.del("gmail-oauth:" + state);

  try {
    const tokens = await exchangeCodeForTokens(code);

    const accessEnc = encrypt(tokens.accessToken);
    const refreshEnc = encrypt(tokens.refreshToken);

    // Upsert in a transaction to prevent losing the connection if the insert fails
    await db.transaction(async (tx) => {
      await tx
        .delete(emailConnections)
        .where(
          and(
            eq(emailConnections.userId, userId),
            eq(emailConnections.provider, "gmail")
          )
        );

      await tx.insert(emailConnections).values({
        userId,
        provider: "gmail",
        emailAddress: tokens.emailAddress,
        accessTokenEnc: accessEnc.encrypted,
        accessTokenIv: accessEnc.iv,
        accessTokenTag: accessEnc.authTag,
        refreshTokenEnc: refreshEnc.encrypted,
        refreshTokenIv: refreshEnc.iv,
        refreshTokenTag: refreshEnc.authTag,
        tokenExpiresAt: tokens.expiresAt,
      });
    });

    return NextResponse.redirect(
      new URL("/emails?gmail=connected", process.env.NEXT_PUBLIC_APP_URL!)
    );
  } catch (err) {
    console.error("Gmail OAuth error:", err);
    return NextResponse.redirect(
      new URL("/emails?gmail=error", process.env.NEXT_PUBLIC_APP_URL!)
    );
  }
}
