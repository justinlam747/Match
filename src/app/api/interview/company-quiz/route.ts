import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resumes, ycCompanies } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { generateCompanyQuiz } from "@/lib/ai/interview-prep";
import { scrapeCompanyWebsite } from "@/lib/scraper-firecrawl";

export async function POST(req: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const { resumeId, companyId } = await req.json();
    if (!resumeId || !companyId) {
      return NextResponse.json(
        { error: "resumeId and companyId are required" },
        { status: 400 }
      );
    }

    const [resume] = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.id, resumeId), eq(resumes.userId, user.id)))
      .limit(1);

    if (!resume?.parsedData) {
      return NextResponse.json(
        { error: "Resume not found or not parsed" },
        { status: 404 }
      );
    }

    const [company] = await db
      .select()
      .from(ycCompanies)
      .where(eq(ycCompanies.id, companyId))
      .limit(1);

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Scrape company website
    let scrapedContent = "";
    let pagesScraped = 0;

    if (company.website) {
      try {
        const scraped = await scrapeCompanyWebsite(company.website);
        scrapedContent = scraped.combinedText;
        pagesScraped = scraped.pages.length;
      } catch (err) {
        console.warn("Website scrape failed, using DB data only:", err);
      }
    }

    // If scraping got nothing, build content from DB fields
    if (!scrapedContent) {
      scrapedContent = [
        company.longDescription || company.description || "",
        company.oneLiner ? `One-liner: ${company.oneLiner}` : "",
        company.industries?.length ? `Industries: ${company.industries.join(", ")}` : "",
        company.techStack?.length ? `Tech stack: ${company.techStack.join(", ")}` : "",
        company.location ? `Location: ${company.location}` : "",
        company.teamSize ? `Team size: ${company.teamSize}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }

    const result = await generateCompanyQuiz(
      resume.parsedData,
      {
        name: company.name,
        description: company.description,
        industries: company.industries,
        techStack: company.techStack,
        stage: company.stage,
        batch: company.batch,
      },
      scrapedContent,
      pagesScraped,
      user.id
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Company quiz failed:", error);
    return NextResponse.json(
      { error: "Failed to generate company quiz" },
      { status: 500 }
    );
  }
}
