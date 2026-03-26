import { NextResponse } from "next/server";
import { getDailySendCount, getDailyLimit, isGoodSendTime, getNextGoodSendTime } from "@/lib/email/throttle";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

export async function GET() {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const sent = await getDailySendCount();
    const limit = getDailyLimit(30); // assume 30 days default
    const goodTime = isGoodSendTime();
    const nextGoodTime = getNextGoodSendTime();

    return NextResponse.json({
      sentToday: sent,
      dailyLimit: limit,
      remaining: Math.max(0, limit - sent),
      isGoodSendTime: goodTime,
      nextGoodSendTime: nextGoodTime.toISOString(),
    });
  } catch (error) {
    console.error("Email status error:", error);
    return NextResponse.json(
      { error: "Failed to get email status" },
      { status: 500 }
    );
  }
}
