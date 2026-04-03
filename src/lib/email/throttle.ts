import { db } from "@/lib/db";
import { emails } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";

// Email warm-up schedule
// Week 1: 10/day, Week 2: 20/day, Week 3: 30/day, Week 4+: 50/day
const WARMUP_SCHEDULE = [
  { maxDays: 7, limit: 10 },
  { maxDays: 14, limit: 20 },
  { maxDays: 21, limit: 30 },
  { maxDays: Infinity, limit: 50 },
];

export async function getDailySendCount(userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(emails)
    .where(
      and(eq(emails.userId, userId), eq(emails.status, "sent"), gte(emails.sentAt, today))
    );

  return result[0]?.count || 0;
}

export function getDailyLimit(domainAgeDays: number): number {
  for (const tier of WARMUP_SCHEDULE) {
    if (domainAgeDays <= tier.maxDays) return tier.limit;
  }
  return 50;
}

export async function canSendToday(userId: string, domainAgeDays: number): Promise<{
  allowed: boolean;
  sent: number;
  limit: number;
}> {
  const sent = await getDailySendCount(userId);
  const limit = getDailyLimit(domainAgeDays);
  return { allowed: sent < limit, sent, limit };
}

export function isGoodSendTime(): boolean {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 6=Sat
  const hour = now.getHours();

  // No weekends
  if (day === 0 || day === 6) return false;

  // Best hours: 8-10 AM (local time as proxy)
  return hour >= 8 && hour <= 10;
}

export function getNextGoodSendTime(): Date {
  const now = new Date();
  const next = new Date(now);

  // If it's a weekend, advance to Monday
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }

  // Set to 8 AM
  next.setHours(8, 0, 0, 0);

  // If we're past 10 AM today, advance to next business day
  if (next <= now) {
    next.setDate(next.getDate() + 1);
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
    next.setHours(8, 0, 0, 0);
  }

  return next;
}
