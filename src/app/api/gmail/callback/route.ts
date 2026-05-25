import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/cache/redis";
import { exchangeCodeForTokens } from "@/lib/email/gmail";
import { db } from "@/lib/db";
import { emailConnections } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt } from "@/lib/crypto";
import { getAppUrl } from "@/lib/app-url";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const appUrl = getAppUrl(request.url);

  if (error || !code || !state) {
    return NextResponse.redirect(
      new URL("/emails?gmail=error", appUrl)
    );
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.redirect(
      new URL("/emails?gmail=error", appUrl)
    );
  }

  // Validate the OAuth state token against Redis
  const userId = await redis.get<string>("gmail-oauth:" + state);
  if (!userId) {
    return NextResponse.redirect(
      new URL("/emails?gmail=error", appUrl)
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
      new URL("/emails?gmail=connected", appUrl)
    );
  } catch (err) {
    console.error("Gmail OAuth error:", err);
    return NextResponse.redirect(
      new URL("/emails?gmail=error", appUrl)
    );
  }
}
