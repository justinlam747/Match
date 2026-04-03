import { NextRequest, NextResponse } from "next/server";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { db } from "@/lib/db";
import { llmLogs } from "@/lib/db/schema";
import { desc, sql, gte } from "drizzle-orm";

async function requireAdmin() {
  const user = await getApiUser();
  if (!user) return null;
  const tags = (user.tags as string[] | null) ?? [];
  if (!tags.includes("admin")) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized();

  const url = req.nextUrl;
  const limit = Math.min(Number(url.searchParams.get("limit") || "100"), 500);
  const afterId = url.searchParams.get("after"); // cursor for polling
  const hours = Number(url.searchParams.get("hours") || "24");

  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  // Fetch logs — if afterId is provided, only return newer rows (for polling)
  const conditions = [gte(llmLogs.createdAt, since)];
  if (afterId) {
    conditions.push(sql`${llmLogs.createdAt} > (SELECT created_at FROM llm_logs WHERE id = ${afterId})`);
  }

  // Run logs and aggregation queries in parallel
  const [logs, [agg]] = await Promise.all([
    db
      .select()
      .from(llmLogs)
      .where(sql`${llmLogs.createdAt} >= ${since}${afterId ? sql` AND ${llmLogs.createdAt} > (SELECT created_at FROM llm_logs WHERE id = ${afterId})` : sql``}`)
      .orderBy(desc(llmLogs.createdAt))
      .limit(limit),
    db
      .select({
        totalRequests: sql<number>`count(*)::int`,
        totalCost: sql<number>`coalesce(sum(${llmLogs.costCents}), 0)`,
        avgLatency: sql<number>`coalesce(avg(${llmLogs.latencyMs}), 0)::int`,
        totalInputTokens: sql<number>`coalesce(sum(${llmLogs.inputTokens}), 0)::int`,
        totalOutputTokens: sql<number>`coalesce(sum(${llmLogs.outputTokens}), 0)::int`,
        errorCount: sql<number>`count(*) filter (where ${llmLogs.status} = 'error')::int`,
      })
      .from(llmLogs)
      .where(gte(llmLogs.createdAt, since)),
  ]);

  return NextResponse.json({
    logs,
    kpi: {
      totalRequests: agg.totalRequests,
      totalCostCents: Math.round(agg.totalCost * 100) / 100,
      avgLatencyMs: agg.avgLatency,
      totalInputTokens: agg.totalInputTokens,
      totalOutputTokens: agg.totalOutputTokens,
      errorCount: agg.errorCount,
      errorRate: agg.totalRequests > 0
        ? Math.round((agg.errorCount / agg.totalRequests) * 10000) / 100
        : 0,
    },
    window: { hours, since: since.toISOString() },
  });
}
