import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "@/lib/ai/parse-resume";
import { db } from "@/lib/db";
import { resumes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { rateLimit } from "@/lib/rate-limit";

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse/lib/pdf-parse.js");
  const data = await pdfParse(buffer);
  return data.text;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const rl = await rateLimit(`parse-resume:${user.id}`, 5, 60);
    if (!rl.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 413 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractTextFromPDF(buffer);

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from PDF" },
        { status: 400 }
      );
    }

    const parsedData = await parseResume(rawText, user.id);

    // Auto-generate name from parsed data
    const autoName = [
      parsedData.name || "Resume",
      parsedData.seniority_level ? `(${parsedData.seniority_level})` : "",
    ]
      .filter(Boolean)
      .join(" ");

    // Deactivate other resumes and insert new one in a transaction
    const [resume] = await db.transaction(async (tx) => {
      await tx
        .update(resumes)
        .set({ isActive: false })
        .where(eq(resumes.userId, user.id));

      return tx
        .insert(resumes)
        .values({
          userId: user.id,
          name: autoName,
          rawText,
          parsedData,
          isActive: true,
        })
        .returning();
    });

    return NextResponse.json({
      id: resume.id,
      name: resume.name,
      parsedData,
    });
  } catch (error) {
    console.error("Resume parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse resume" },
      { status: 500 }
    );
  }
}
