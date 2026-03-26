import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ycCompanies, contacts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { searchPeopleAtCompany, enrichPerson } from "@/lib/contacts/apollo";
import { verifyEmail, domainSearch } from "@/lib/contacts/hunter";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const body = await request.json();
    const { companyIds } = body as { companyIds: string[] };

    if (!companyIds || companyIds.length === 0) {
      return NextResponse.json(
        { error: "companyIds array is required" },
        { status: 400 }
      );
    }

    const results: { companyId: string; contacts: number }[] = [];

    for (const companyId of companyIds) {
      const [company] = await db
        .select()
        .from(ycCompanies)
        .where(eq(ycCompanies.id, companyId))
        .limit(1);

      if (!company) continue;

      let domain: string | null = null;
      try {
        if (company.website) {
          domain = new URL(
            company.website.startsWith("http")
              ? company.website
              : `https://${company.website}`
          ).hostname;
        }
      } catch {
        // invalid URL
      }

      // Search Apollo
      const people = await searchPeopleAtCompany(company.name, domain);
      let contactCount = 0;

      for (const person of people.slice(0, 3)) {
        let email = person.email;
        let linkedinUrl = person.linkedin_url;

        // If no email from search, try enrichment
        if (!email) {
          const enriched = await enrichPerson(person.name, company.name, domain);
          email = enriched.email;
          linkedinUrl = linkedinUrl || enriched.linkedin_url;
        }

        if (!email) continue;

        // Verify with Hunter
        const verification = await verifyEmail(email);

        await db.insert(contacts).values({
          companyId: company.id,
          name: person.name,
          title: person.title,
          email,
          emailVerified: verification.result === "deliverable",
          source: "apollo",
          linkedinUrl,
        });
        contactCount++;
      }

      // Fallback: Hunter domain search if no Apollo results
      if (contactCount === 0 && domain) {
        const hunterResults = await domainSearch(domain);
        const relevantEmails = hunterResults.emails.filter((e) => {
          const title = (e.position || "").toLowerCase();
          return (
            title.includes("cto") ||
            title.includes("founder") ||
            title.includes("engineer") ||
            title.includes("tech")
          );
        });

        for (const hunterPerson of relevantEmails.slice(0, 2)) {
          await db.insert(contacts).values({
            companyId: company.id,
            name: `${hunterPerson.first_name} ${hunterPerson.last_name}`,
            title: hunterPerson.position,
            email: hunterPerson.value,
            emailVerified: true, // Hunter domain search results are pre-verified
            source: "hunter",
          });
          contactCount++;
        }
      }

      results.push({ companyId, contacts: contactCount });

      // Rate limit between companies
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    return NextResponse.json({
      message: "Contact search complete",
      results,
    });
  } catch (error) {
    console.error("Contact finder error:", error);
    return NextResponse.json(
      { error: "Failed to find contacts" },
      { status: 500 }
    );
  }
}
