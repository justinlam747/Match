import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { documents, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { scrapeUrl, scrapeGitHub, validateExternalUrl } from "@/lib/scraper";
import type { GitHubProfileData } from "@/lib/db/schema";

// GET — list user's documents
export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const docs = await db
    .select({
      id: documents.id,
      type: documents.type,
      title: documents.title,
      sourceUrl: documents.sourceUrl,
      rawText: documents.rawText,
      metadata: documents.metadata,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(eq(documents.userId, user.id))
    .orderBy(desc(documents.createdAt));

  return NextResponse.json({ documents: docs });
}

// POST — add a document (file upload or URL)
export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const contentType = request.headers.get("content-type") || "";

    // URL-based document
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { url, type: docType } = body as { url: string; type?: string };

      if (!url) {
        return NextResponse.json({ error: "url is required" }, { status: 400 });
      }

      // Validate URL is not targeting internal/private networks (SSRF protection)
      try {
        validateExternalUrl(url);
      } catch {
        return NextResponse.json(
          { error: "Invalid or disallowed URL" },
          { status: 400 }
        );
      }

      // Detect type from URL
      let type = docType || "website";
      let result: { title: string; text: string } | null = null;
      let profileAvatarUrl: string | undefined;
      let metadata: GitHubProfileData | null = null;

      if (url.includes("github.com/")) {
        type = "github";
        const username = url.replace(/\/$/, "").split("/").pop() || "";
        // Check if it's a profile URL (not a repo)
        const pathParts = new URL(url).pathname.split("/").filter(Boolean);
        if (pathParts.length === 1) {
          const ghResult = await scrapeGitHub(username);
          result = ghResult;
          profileAvatarUrl = ghResult?.avatarUrl;
          metadata = ghResult?.data ?? null;
        } else {
          // It's a repo or other page — scrape as regular URL
          result = await scrapeUrl(url);
        }
      } else {
        type = docType || "portfolio";
        result = await scrapeUrl(url);
      }

      if (!result || !result.text) {
        return NextResponse.json(
          { error: "Could not extract content from URL" },
          { status: 400 }
        );
      }

      const [doc] = await db
        .insert(documents)
        .values({
          userId: user.id,
          type: type as "resume" | "portfolio" | "github" | "linkedin" | "website" | "other",
          title: result.title,
          sourceUrl: url,
          rawText: result.text,
          metadata,
        })
        .returning({
          id: documents.id,
          type: documents.type,
          title: documents.title,
          sourceUrl: documents.sourceUrl,
          metadata: documents.metadata,
          createdAt: documents.createdAt,
        });

      // Save profile avatar if found and user doesn't have one from this source yet
      if (profileAvatarUrl) {
        const [currentUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
        if (currentUser) {
          const opts = (currentUser.avatarOptions as { google?: string; linkedin?: string; github?: string } | null) || {};
          const source = type as "github" | "linkedin";
          const updatedOpts = { ...opts, [source]: profileAvatarUrl };
          await db.update(users).set({
            avatarOptions: updatedOpts,
            // Only set as current avatar if user has no avatar yet
            ...(!currentUser.avatarUrl && {
              avatarUrl: profileAvatarUrl,
              avatarSource: source,
            }),
          }).where(eq(users.id, user.id));
        }
      }

      return NextResponse.json({ document: doc });
    }

    // File upload
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 413 }
      );
    }

    let rawText: string;

    if (file.type === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer());
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require("pdf-parse/lib/pdf-parse.js");
      const data = await pdfParse(buffer);
      rawText = data.text;
    } else if (file.type.startsWith("text/") || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
      rawText = await file.text();
    } else {
      return NextResponse.json(
        { error: "Supported: PDF, TXT, MD files" },
        { status: 400 }
      );
    }

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from file" },
        { status: 400 }
      );
    }

    const [doc] = await db
      .insert(documents)
      .values({
        userId: user.id,
        type: "resume",
        title: file.name,
        rawText,
      })
      .returning({
        id: documents.id,
        type: documents.type,
        title: documents.title,
        sourceUrl: documents.sourceUrl,
        createdAt: documents.createdAt,
      });

    return NextResponse.json({ document: doc });
  } catch (error) {
    console.error("Document error:", error);
    return NextResponse.json(
      { error: "Failed to add document" },
      { status: 500 }
    );
  }
}

// DELETE — remove a document
export async function DELETE(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const docId = searchParams.get("id");

  if (!docId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  await db.delete(documents).where(and(eq(documents.id, docId), eq(documents.userId, user.id)));
  return NextResponse.json({ deleted: true });
}
