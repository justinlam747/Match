import { NextRequest, NextResponse } from "next/server";
import { scrapeMultipleBatches } from "@/lib/scrapers/yc-companies";
import { db } from "@/lib/db";
import { ycCompanies } from "@/lib/db/schema";
import { eq, isNull, or, sql } from "drizzle-orm";
import { inferTechStack } from "@/lib/ai/enrich-tech";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { logAuditEvent } from "@/lib/audit/log";

export const maxDuration = 300; // 5 min for Vercel

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const batches = body.batches || ["W25", "S24", "W24"];
    const enrichTech = body.enrichTech !== false; // default true

    const results = await scrapeMultipleBatches(batches);

    // Enrich tech stacks for companies that don't have them
    let enriched = 0;
    if (enrichTech) {
      const unenriched = await db
        .select()
        .from(ycCompanies)
        .where(
          or(
            isNull(ycCompanies.techStack),
            sql`array_length(${ycCompanies.techStack}, 1) IS NULL`
          )
        )
        .limit(50); // batch of 50 at a time

      // Process 5 at a time
      for (let i = 0; i < unenriched.length; i += 5) {
        const batch = unenriched.slice(i, i + 5);
        await Promise.all(
          batch.map(async (company) => {
            if (!company.description) return;
            const techStack = await inferTechStack(
              company.name,
              company.description
            );
            if (techStack.length > 0) {
              await db
                .update(ycCompanies)
                .set({ techStack })
                .where(eq(ycCompanies.id, company.id));
              enriched++;
            }
          })
        );
      }
    }

    await logAuditEvent({
      userId: user.id,
      action: "companies.scraped",
      entityType: "ycCompany",
      metadata: { batches, companiesScraped: results, enriched },
    });

    return NextResponse.json({
      message: "Scraping complete",
      results,
      enriched,
    });
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: "Failed to scrape YC companies" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const searchParams = request.nextUrl.searchParams;
  const batchParam = searchParams.get("batches");
  const batches = batchParam ? batchParam.split(",") : ["W25", "S24", "W24"];

  try {
    const results = await scrapeMultipleBatches(batches);
    return NextResponse.json({ message: "Scraping complete", results });
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: "Failed to scrape YC companies" },
      { status: 500 }
    );
  }
}
